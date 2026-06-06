import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Strategist (copy/positioning) benefits from a stronger model; builder can be cheaper.
const STRATEGY_MODEL = process.env.STRATEGY_MODEL ?? 'gpt-4.1';
const BUILDER_MODEL = process.env.GENERATION_MODEL ?? 'gpt-4.1-mini';

// ── Product brief: the structured input collected from the user ──────────────

export type CtaGoal = 'waitlist' | 'preorder' | 'call';

export type ProductBrief = {
  name: string;
  description: string; // one-line "what it does"
  audience: string; // who it's for (ICP)
  ctaGoal: CtaGoal; // what we're measuring
  problem?: string; // pain + current alternative
  outcome?: string; // primary transformation/benefit
  features?: string; // key features (free text / newline-separated)
  differentiator?: string; // why us / why now
  price?: string; // optional price point for willingness-to-pay tests
  tone?: string; // brand vibe
  accent?: string; // color preference
  extraContext?: string; // Q&A answers from the dynamic discovery step
};

// ── Layout seeding: keep generated pages from all looking identical ──────────

type Archetype = { name: string; note: string };
type Palette = { name: string; from: string; to: string; accent: string };

const ARCHETYPES: Archetype[] = [
  { name: 'centered-hero', note: 'Centered hero with large headline, single column, generous whitespace.' },
  { name: 'split-hero', note: 'Two-column hero: copy left, a stylized product mockup/illustration right.' },
  { name: 'editorial', note: 'Editorial/magazine feel: serif display headline, asymmetric layout, restrained accents.' },
  { name: 'bold-saas', note: 'Bold modern SaaS: strong gradient band, big rounded cards, punchy contrast.' },
];

const PALETTES: Palette[] = [
  { name: 'indigo', from: '#6366f1', to: '#a855f7', accent: '#6366f1' },
  { name: 'emerald', from: '#059669', to: '#0d9488', accent: '#10b981' },
  { name: 'sunset', from: '#f97316', to: '#db2777', accent: '#f97316' },
  { name: 'ocean', from: '#0284c7', to: '#2563eb', accent: '#0ea5e9' },
  { name: 'slate', from: '#0f172a', to: '#334155', accent: '#64748b' },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function seedFor(slug: string): { archetype: Archetype; palette: Palette } {
  const h = hash(slug);
  return {
    archetype: ARCHETYPES[h % ARCHETYPES.length],
    palette: PALETTES[Math.floor(h / ARCHETYPES.length) % PALETTES.length],
  };
}

// ── Stage A: strategist — turn the brief into a deliberate copy plan ─────────

export type Strategy = {
  headline: string;
  subheadline: string;
  valueProp: string;
  benefits: { title: string; description: string }[];
  howItWorks: { step: string; description: string }[];
  faq: { question: string; answer: string }[];
  ctaText: string;
  ctaSubtext: string;
  honestProof: string;
  palette: Palette;
};

const CTA_GUIDANCE: Record<CtaGoal, string> = {
  waitlist: 'Goal is to measure INTEREST. CTA collects an email to join the waitlist. Frame around being early.',
  preorder:
    'Goal is to measure WILLINGNESS TO PAY. Show the price prominently and frame the email capture as reserving early-access at that price (a "fake door" intent test). Be transparent that it is early access, not a charge yet.',
  call: 'Goal is to measure HIGH-INTENT leads. CTA collects an email to request a call/demo with the founder.',
};

const STRATEGIST_SYSTEM = `You are a senior conversion copywriter and startup positioning strategist.
You produce the MESSAGING PLAN for an idea-validation landing page — not HTML.

This page exists to test real demand for an unbuilt product. Honesty is mandatory:
- NEVER invent testimonials, customer names, logos, user counts, ratings, or press mentions.
- Credibility must come from honest framing: building in public, "be among the first", a founder's note, a concrete problem/solution narrative, or a transparent early-access offer.

Copywriting principles:
- ONE benefit-led headline aimed at ONE specific audience. Lead with the outcome, not the mechanism.
- Specificity beats adjectives. Contrast against the reader's current alternative/status quo.
- Benefits describe the transformation; tie each to the audience's real pain.
- A single, repeated primary CTA. Reduce friction.
- "faq" should preempt the 2–3 biggest objections a skeptical visitor would have.

Respond with ONLY a JSON object matching this shape (no markdown, no commentary):
{
  "headline": string,
  "subheadline": string,
  "valueProp": string,
  "benefits": [{ "title": string, "description": string }],   // 3–4 items
  "howItWorks": [{ "step": string, "description": string }],   // exactly 3 items
  "faq": [{ "question": string, "answer": string }],           // 2–3 items
  "ctaText": string,        // button label
  "ctaSubtext": string,     // short reassurance under the form
  "honestProof": string     // one honest credibility line — NO fabricated proof
}`;

function briefToText(brief: ProductBrief): string {
  const lines = [
    `Product name: ${brief.name}`,
    `What it does: ${brief.description}`,
    `Target audience (ICP): ${brief.audience}`,
    `Primary CTA goal: ${brief.ctaGoal} — ${CTA_GUIDANCE[brief.ctaGoal]}`,
  ];
  if (brief.problem) lines.push(`Problem & current alternative: ${brief.problem}`);
  if (brief.outcome) lines.push(`Primary outcome/transformation: ${brief.outcome}`);
  if (brief.features) lines.push(`Key features: ${brief.features}`);
  if (brief.differentiator) lines.push(`Differentiator / why now: ${brief.differentiator}`);
  if (brief.price) lines.push(`Price point: ${brief.price}`);
  if (brief.tone) lines.push(`Tone / brand vibe: ${brief.tone}`);
  if (brief.extraContext) lines.push(`\nFounder's additional context (from discovery Q&A):\n${brief.extraContext}`);
  return lines.join('\n');
}

// ── Question generator ────────────────────────────────────────────────────────

export type DiscoveryQuestion = { label: string; placeholder: string };

const QUESTION_SYSTEM = `You generate sharp, product-specific discovery questions to help craft a better SaaS landing page.

Given a product name, description, and CTA goal, produce exactly 3 questions that uncover the most valuable positioning information for THIS specific product. Each question should unlock a different dimension:
1. The specific pain/frustration and current workaround (what do people do instead today?)
2. The primary transformation or outcome users get (the before → after)
3. A differentiator, key feature set, or pricing angle — whichever is most relevant to the CTA goal

Rules:
- Make questions specific to this product, never generic ("What's your value prop?" is banned)
- Keep each question short and conversational
- The placeholder must be a concrete example answer, not a description of what to write

Return ONLY valid JSON — no markdown, no commentary:
{"questions":[{"label":"...","placeholder":"..."},{"label":"...","placeholder":"..."},{"label":"...","placeholder":"..."}]}`;

export async function generateDiscoveryQuestions(
  name: string,
  description: string,
  ctaGoal: CtaGoal,
): Promise<DiscoveryQuestion[]> {
  const response = await client.chat.completions.create({
    model: STRATEGY_MODEL,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUESTION_SYSTEM },
      {
        role: 'user',
        content: `Product: ${name}\nDescription: ${description}\nCTA goal: ${ctaGoal}`,
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '{"questions":[]}';
  const parsed = JSON.parse(raw) as { questions?: DiscoveryQuestion[] };
  return Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4) : [];
}

async function generateStrategy(brief: ProductBrief, palette: Palette): Promise<Strategy> {
  const response = await client.chat.completions.create({
    model: STRATEGY_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: STRATEGIST_SYSTEM },
      { role: 'user', content: `${briefToText(brief)}\n\nProduce the JSON messaging plan now.` },
    ],
  });

  const raw = response.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw) as Omit<Strategy, 'palette'>;
  return { ...parsed, palette };
}

// ── Stage B: builder — render the strategy into a self-contained HTML page ───

const BUILDER_SYSTEM = `You are a world-class front-end developer and visual designer who builds stunning, modern SaaS landing pages that win design awards. Your pages feel alive — they have depth, motion, and personality.

══ STRUCTURE ══
1. Return ONLY a valid HTML document. No markdown fences, no explanation, no preamble.
2. <head> must include:
   - <script src="https://cdn.tailwindcss.com"></script>
   - <meta name="viewport" content="width=device-width, initial-scale=1">
   - A <style> block with all custom CSS (animations, glassmorphism, reveals, glow, accordion)
3. Sections in order — each MUST have both id AND data-section with the same value:
   - id="hero"          — animated background, headline, sub-headline, email form
   - id="features"      — glassmorphism benefit cards with SVG icons
   - id="stats"         — bold stat numbers bar (3 relevant placeholder stats)
   - id="how-it-works"  — 3 numbered steps with connecting line
   - id="proof"         — honest credibility section (NO fabricated testimonials/logos/ratings)
   - id="faq"           — interactive accordion FAQ
   - id="cta"           — final CTA with glowing email form
   - id="footer"        — minimal dark footer

══ ANIMATIONS & MOTION (MANDATORY — pages without these will be rejected) ══

A) ANIMATED GRADIENT ORBS IN HERO:
   The hero must have position:relative; overflow:hidden; min-height:100vh.
   Place 3 large orbs as absolute divs BEHIND content (z-index:0, content at z-index:1):
   <style>
   @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-40px) scale(1.15)}}
   @keyframes orb2{0%,100%{transform:translate(0,0) scale(1.1)}50%{transform:translate(-50px,60px) scale(0.9)}}
   @keyframes orb3{0%,100%{transform:translate(0,0)}33%{transform:translate(30px,50px)}66%{transform:translate(-40px,-20px)}}
   .orb{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}
   .orb-1{width:600px;height:600px;top:-100px;left:-150px;opacity:0.2;animation:orb1 14s ease-in-out infinite}
   .orb-2{width:500px;height:500px;bottom:-100px;right:-100px;opacity:0.15;animation:orb2 18s ease-in-out infinite}
   .orb-3{width:350px;height:350px;top:40%;left:50%;opacity:0.1;animation:orb3 22s ease-in-out infinite}
   </style>
   Color the orbs using the provided palette gradient colors (from, to, accent).

B) SCROLL REVEAL:
   <style>
   .reveal{opacity:0;transform:translateY(48px);transition:opacity 0.7s cubic-bezier(.4,0,.2,1),transform 0.7s cubic-bezier(.4,0,.2,1)}
   .reveal.visible{opacity:1;transform:translateY(0)}
   .reveal-delay-1{transition-delay:0.1s}.reveal-delay-2{transition-delay:0.2s}.reveal-delay-3{transition-delay:0.3s}.reveal-delay-4{transition-delay:0.4s}
   </style>
   Apply class="reveal" to every feature card, step, stat, proof block, FAQ item, and CTA section.
   Stagger sibling cards with reveal-delay-1/2/3/4.

C) GLOWING CTA BUTTON:
   <style>
   @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px var(--accent,#6366f1)60,0 0 40px var(--accent,#6366f1)25}50%{box-shadow:0 0 35px var(--accent,#6366f1)90,0 0 70px var(--accent,#6366f1)40}}
   .btn-primary{animation:pulse-glow 2.5s ease-in-out infinite;transition:transform 0.2s,opacity 0.2s}
   .btn-primary:hover{transform:translateY(-2px);opacity:0.92}
   </style>
   Set --accent CSS variable on :root to the palette accent hex. Apply .btn-primary to all CTA submit buttons.

D) GRADIENT HEADLINE TEXT:
   Hero headline must wrap the key phrase in:
   <span style="background:linear-gradient(135deg, FROM_COLOR, TO_COLOR);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
   Font: font-size:clamp(2.8rem,6vw,5.5rem); font-weight:800; letter-spacing:-0.03em; line-height:1.05

E) DOT-GRID BACKGROUND TEXTURE (full page):
   Add as first child of <body>:
   <div aria-hidden="true" style="position:fixed;inset:0;z-index:0;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 60%,transparent 100%)"></div>
   All page content must be position:relative;z-index:1 (or higher).

F) GLASSMORPHISM FEATURE CARDS:
   <style>
   .glass-card{background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:1.5rem;transition:transform 0.3s ease,border-color 0.3s ease,box-shadow 0.3s ease;box-shadow:0 4px 24px rgba(0,0,0,0.4)}
   .glass-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,0.16);box-shadow:0 12px 40px rgba(0,0,0,0.5)}
   </style>
   Apply .glass-card to every feature card.

G) INTERACTIVE FAQ ACCORDION:
   Each FAQ item is a <div> with a clickable header that toggles the answer. Use JS:
   <script>
   document.querySelectorAll('.faq-trigger').forEach(function(btn){
     btn.addEventListener('click',function(){
       var item=this.closest('.faq-item');
       var isOpen=item.classList.contains('open');
       document.querySelectorAll('.faq-item').forEach(function(el){el.classList.remove('open')});
       if(!isOpen) item.classList.add('open');
     });
   });
   </script>
   <style>
   .faq-answer{max-height:0;overflow:hidden;transition:max-height 0.4s ease,padding 0.3s ease}
   .faq-item.open .faq-answer{max-height:300px}
   .faq-chevron{transition:transform 0.3s ease}
   .faq-item.open .faq-chevron{transform:rotate(180deg)}
   </style>

H) STATS BAR (between features and how-it-works):
   3 bold stats relevant to the product (use realistic but clearly placeholder numbers).
   Large gradient number (clamp(2.5rem,5vw,4rem), font-weight:800, gradient text) + small label.
   Subtle dividers between stats. Dark glass background. Reveal animation.

I) NUMBERED STEPS CONNECTOR:
   The how-it-works steps should have a visual connector (dashed or gradient line) between step numbers on desktop.

══ PALETTE & LAYOUT ══
- Follow the provided archetype layout note for overall composition.
- Use the exact palette hex colors (from, to, accent) throughout — not generic Tailwind colors.
- Page background: #050810 or #030712 (near-black). NEVER use gray-900 as the page base.
- Section backgrounds: alternate between #050810, #080d1a, and subtle gradient bands.
- All text on dark: white for headings, rgba(255,255,255,0.65) for body, rgba(255,255,255,0.4) for captions.
- Feature icons: custom inline SVG (not emoji) colored with the accent, inside a glass-card icon container.

══ EMAIL FORMS ══
Both forms (hero + cta) must POST JSON to /api/signups: { "slug": "{{SLUG}}", "email": "..." }
API returns { "success": true/false, "message"/"error": "..." } — check data.success.
Style the input: dark background, subtle border, focus ring in accent color. Full-width on mobile.
Show success/error inline below the input. Use ctaText for the button label, ctaSubtext as helper text.

══ ANALYTICS (add once, near </body>) ══
<script>
(function(){
  var t={};
  var o=new IntersectionObserver(function(e){e.forEach(function(n){var id=n.target.dataset.section;if(n.isIntersecting&&id&&!t[id]){t[id]=true;fetch('/api/analytics/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'{{SLUG}}',section:id})});}});},{threshold:0.3});
  document.querySelectorAll('[data-section]').forEach(function(el){o.observe(el);});
  var r=new IntersectionObserver(function(e){e.forEach(function(n){if(n.isIntersecting)n.target.classList.add('visible');});},{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(function(el){r.observe(el);});
})();
</script>

══ BANNED (automatic failure) ══
- Flat hero background with no orbs or animation
- Feature cards without glassmorphism
- CTA button without glow animation
- No scroll-reveal on sections below the hero
- Static FAQ (no accordion)
- Generic Tailwind gray color scheme
- Emoji as feature icons

Replace every {{SLUG}} placeholder with the actual slug provided.`;

function buildUserMessage(brief: ProductBrief, slug: string, strategy: Strategy, archetype: Archetype): string {
  return `Slug (use everywhere {{SLUG}} appears): ${slug}
Product name: ${brief.name}
CTA goal: ${brief.ctaGoal}${brief.price ? `\nPrice point: ${brief.price}` : ''}

Layout archetype: ${archetype.name} — ${archetype.note}
Color palette: ${strategy.palette.name} (gradient ${strategy.palette.from} → ${strategy.palette.to}, accent ${strategy.palette.accent})

MESSAGING PLAN (use this copy; do not invent additional proof):
${JSON.stringify(strategy, null, 2)}

Generate the complete HTML landing page now.`;
}

async function buildHtml(brief: ProductBrief, slug: string, strategy: Strategy, archetype: Archetype): Promise<string> {
  const response = await client.chat.completions.create({
    model: BUILDER_MODEL,
    messages: [
      { role: 'system', content: BUILDER_SYSTEM },
      { role: 'user', content: buildUserMessage(brief, slug, strategy, archetype) },
    ],
  });

  let html = (response.choices[0].message.content ?? '').trim();
  // Strip accidental markdown fences
  if (html.startsWith('```')) html = html.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
  return html;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export async function generateLandingPage(slug: string, brief: ProductBrief): Promise<string> {
  const { archetype, palette } = seedFor(slug);
  const strategy = await generateStrategy(brief, palette);
  return buildHtml(brief, slug, strategy, archetype);
}
