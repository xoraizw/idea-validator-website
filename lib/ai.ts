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

type Archetype = {
  name: string;
  layout: string;    // overall page composition
  geometry: string;  // background visual motif (hero + echoed in other sections)
  heroVariant: string; // hero-specific layout instruction
};
type Palette = { name: string; from: string; to: string; accent: string };

const ARCHETYPES: Archetype[] = [
  {
    name: 'centered-orbs',
    layout: 'Centered single-column hero. Features in a 3-column glassmorphism card grid. Steps horizontal with a gradient connector line. Stats bar spans full width.',
    geometry: 'Three large blurred gradient orbs that float slowly at different speeds and directions (CSS @keyframes, 14-22s). Echo smaller orbs (opacity 0.06) in the features and CTA sections.',
    heroVariant: 'Centered brand badge (pill chip with accent border) above headline. Massive centered headline. Sub-headline. Inline email+button row. Faint brand name as an oversized watermark behind the headline (opacity 0.04).',
  },
  {
    name: 'split-particles',
    layout: 'Two-column hero: copy on the left (55%), right side (45%) has animated floating UI-card mockups stacked at slight angles. Features in alternating left-right image+text rows. Steps as a vertical timeline.',
    geometry: 'Particle field: 50 small dots (2-3px) placed randomly, each drifting slowly with individual animation-duration (8-20s range). Faint connecting lines between nearby dots via SVG. Echo a minimal version in the footer.',
    heroVariant: 'Left-aligned brand name as styled text logo at top left inside the hero. Large left-aligned headline (gradient on last word). Description. CTA below. Right column: 2-3 stacked frosted-glass card mockups showing the product concept, rotating in slightly.',
  },
  {
    name: 'bold-grid',
    layout: 'Full-width bold layout. Hero headline spans 100% width in two lines, enormous font. Features in a bento grid (one large 2-col-span card + smaller cards). Steps as large numbered cards side by side. CTA is a full-width gradient band.',
    geometry: 'Animated mesh grid: thin lines forming a grid (CSS background-image: linear-gradient), slowly shifting via @keyframes background-position. Diagonal slash of gradient color crossing the hero from top-right to bottom-left.',
    heroVariant: 'Top-left brand name logo. Huge left-offset headline (clamp 4rem to 8vw). Gradient text on the entire headline. Badge chip on the right of the headline. Sub-headline below. CTA button left-aligned. Animated grid behind.',
  },
  {
    name: 'editorial-rings',
    layout: 'Editorial/magazine feel. Asymmetric hero: headline left, large accent number or icon right. Features as masonry-style cards of varying heights. Steps as a vertical numbered timeline with connecting dashed line.',
    geometry: 'Concentric expanding rings: 4 rings radiating from a point (off-center, top-right), animated with scale and opacity pulses at different speeds. Use accent color, low opacity. Echo in CTA section.',
    heroVariant: 'Brand name in a serif-feel large font top-left. Oversized display headline left-aligned (font-size: clamp(3.5rem,7vw,6rem), tight letter-spacing). Right side: large accent numeral or abstract SVG shape. One-line sub. Email form below.',
  },
  {
    name: 'startup-glow',
    layout: 'Startup Y-combinator feel. Hero has a glowing spotlight from above. Features in a horizontal 4-card row with icon-heavy cards. Steps compact 3-col. Social proof count below the hero CTA.',
    geometry: 'A radial spotlight/glow cone from directly above the hero headline (conic-gradient or radial-gradient, accent color, very subtle). Animated flicker pulse (opacity 0.8-1.0, 3s ease-in-out infinite). Floating accent-colored geometric shapes (triangles, squares, 8px-20px) drifting across hero.',
    heroVariant: 'Centered. Small glowing brand logo mark above brand name. Brand name in gradient. Animated badge ("Now in early access ✦"). Headline. Sub. Email + button. Below form: "X founders already joined" counter in small text.',
  },
  {
    name: 'minimal-beam',
    layout: 'Ultra-minimal premium feel. Maximum whitespace. Features as clean horizontal rows with a thin left-border accent. Steps minimal with large numerals. FAQ as clean borderless accordion.',
    geometry: 'Single sweeping light beam: a wide diagonal gradient stripe (accent, opacity 0.08) crossing the hero from top-left to bottom-right, slowly drifting (CSS @keyframes translateX 8s ease-in-out infinite alternate). Plus a very subtle grain/noise texture (SVG feTurbulence filter).',
    heroVariant: 'Brand name centered at very top (small caps, letter-spacing 0.2em). Huge centered minimal headline (no gradient — crisp white). Thin colored sub-headline. Ghost-style email input (transparent bg, thin accent border). Very minimal.',
  },
];

const PALETTES: Palette[] = [
  { name: 'indigo-violet',  from: '#6366f1', to: '#a855f7', accent: '#818cf8' },
  { name: 'emerald-teal',   from: '#10b981', to: '#0d9488', accent: '#34d399' },
  { name: 'orange-rose',    from: '#f97316', to: '#f43f5e', accent: '#fb923c' },
  { name: 'ocean-cobalt',   from: '#0ea5e9', to: '#4f46e5', accent: '#38bdf8' },
  { name: 'amber-orange',   from: '#f59e0b', to: '#ea580c', accent: '#fbbf24' },
  { name: 'violet-cyan',    from: '#7c3aed', to: '#06b6d4', accent: '#a78bfa' },
  { name: 'rose-pink',      from: '#f43f5e', to: '#ec4899', accent: '#fb7185' },
  { name: 'lime-emerald',   from: '#84cc16', to: '#059669', accent: '#a3e635' },
  { name: 'sky-blue',       from: '#0284c7', to: '#2563eb', accent: '#0ea5e9' },
  { name: 'slate-indigo',   from: '#475569', to: '#4338ca', accent: '#94a3b8' },
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

const BUILDER_SYSTEM = `You are a world-class front-end developer and visual designer. You build stunning, visually distinct SaaS landing pages — each one looks and feels unique. Pages must feel alive with motion, depth, and personality tailored to the product.

══ MANDATORY OUTPUT RULES ══
1. Return ONLY a valid HTML document. No markdown, no explanation, nothing outside the HTML.
2. <head> must contain:
   - <meta charset="UTF-8">
   - <meta name="viewport" content="width=device-width, initial-scale=1">
   - <script src="https://cdn.tailwindcss.com"></script>
   - A <style> block whose FIRST LINE is: *,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;overflow-x:hidden;background:#050810}
3. Every top-level <section> or <div> that wraps a page section must be width:100% with NO horizontal margin on the wrapper itself. Inner content uses a centered container: max-width:1200px;margin:0 auto;padding:0 clamp(1rem,4vw,2rem)
4. Sections in order, each with BOTH id AND data-section set to the same value:
   - id="nav"          — sticky glass navbar (no data-section needed)
   - id="hero"         — full-viewport animated hero
   - id="features"     — benefit cards
   - id="stats"        — stat numbers bar
   - id="how-it-works" — numbered steps
   - id="proof"        — honest credibility (NO fake testimonials/logos/ratings/counts)
   - id="faq"          — accordion FAQ
   - id="cta"          — final email capture
   - id="footer"       — minimal footer

══ BRAND IDENTITY (mandatory) ══
NAVBAR (sticky, appears on every page):
  - Position: fixed top, full width, z-index:100
  - Style: background rgba(5,8,16,0.7); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.06)
  - Left: Brand name as a styled logo — use gradient text (--grad-from → --grad-to) with font-weight:700, font-size:1.2rem, letter-spacing:-0.02em
  - Right: small ghost CTA button (border: 1px solid accent, text: accent color)
  - Center or right: 3 smooth-scroll anchor links (Features, How it Works, FAQ) — hidden on mobile

BRAND IN HERO:
  - The brand name must appear PROMINENTLY in the hero — not just the headline.
  - Options (pick the one that fits the archetype): large gradient logotype above the headline, an animated letter-mark badge, or the brand name as a huge semi-transparent watermark (opacity:0.04, font-size:18vw, position:absolute, pointer-events:none, z-index:0) behind the headline content.

══ GEOMETRY & BACKGROUND MOTION ══
The user message specifies the exact geometry motif for this page. Implement it faithfully.
Key rules:
  - The geometry motif appears in the HERO (full intensity), and is ECHOED at reduced scale/opacity in the FEATURES section and CTA section.
  - All animated elements use CSS @keyframes or lightweight JS — no canvas unless specifically instructed.
  - Animated elements must have pointer-events:none and must never block text or interactive elements.
  - Use the provided CSS variables (--accent, --grad-from, --grad-to) for all geometry colors.

PARALLAX on hero geometry: add this JS (passive scroll listener, very light):
<script>
window.addEventListener('scroll',function(){
  var s=window.scrollY;
  document.querySelectorAll('.parallax-slow').forEach(function(el){el.style.transform='translateY('+(s*0.12)+'px)'});
  document.querySelectorAll('.parallax-fast').forEach(function(el){el.style.transform='translateY('+(s*0.25)+'px)'});
},{passive:true});
</script>
Apply class="parallax-slow" to primary background geometry elements, class="parallax-fast" to secondary ones.

══ SCROLL REVEAL ══
All sections below the hero reveal on scroll:
<style>
.reveal{opacity:0;transform:translateY(44px);transition:opacity 0.75s cubic-bezier(.22,1,.36,1),transform 0.75s cubic-bezier(.22,1,.36,1)}
.reveal.visible{opacity:1;transform:none}
.delay-1{transition-delay:.08s}.delay-2{transition-delay:.16s}.delay-3{transition-delay:.24s}.delay-4{transition-delay:.32s}
</style>
Apply reveal to: every feature card (stagger with delay-1/2/3/4), every step, the stats section, the proof block, every FAQ item, and the CTA section wrapper.

══ INTERACTIVE ELEMENTS ══

GLOWING CTA BUTTON:
<style>
@keyframes glow-pulse{0%,100%{box-shadow:0 0 18px color-mix(in srgb,var(--accent) 50%,transparent),0 0 36px color-mix(in srgb,var(--accent) 25%,transparent)}50%{box-shadow:0 0 30px color-mix(in srgb,var(--accent) 75%,transparent),0 0 60px color-mix(in srgb,var(--accent) 35%,transparent)}}
.btn-primary{background:linear-gradient(135deg,var(--grad-from),var(--grad-to));color:#fff;font-weight:600;border:none;cursor:pointer;animation:glow-pulse 2.5s ease-in-out infinite;transition:transform .2s,filter .2s}
.btn-primary:hover{transform:translateY(-2px);filter:brightness(1.1)}
</style>

GLASSMORPHISM CARDS:
<style>
.glass-card{background:rgba(255,255,255,0.035);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.07);border-radius:1.25rem;box-shadow:0 4px 24px rgba(0,0,0,0.35);transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease}
.glass-card:hover{transform:translateY(-5px);border-color:rgba(255,255,255,0.14);box-shadow:0 12px 40px rgba(0,0,0,0.5)}
</style>

STATS COUNTER ANIMATION (count up when scrolled into view):
Use data-target="NUMBER" data-suffix="+" on the number element.
<script>
(function(){
  var done=false;
  new IntersectionObserver(function(e){
    if(done||!e[0].isIntersecting)return; done=true;
    document.querySelectorAll('[data-target]').forEach(function(el){
      var end=+el.dataset.target,suf=el.dataset.suffix||'',dur=1800,s=performance.now();
      (function t(n){var p=Math.min((n-s)/dur,1),e2=1-Math.pow(1-p,3);el.textContent=Math.round(e2*end).toLocaleString()+suf;if(p<1)requestAnimationFrame(t);})(s);
    });
  },{threshold:0.5}).observe(document.getElementById('stats')||document.body);
})();
</script>

FAQ ACCORDION:
<style>
.faq-body{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)}
.faq-item.open .faq-body{max-height:320px}
.faq-chevron{transition:transform .35s ease}
.faq-item.open .faq-chevron{transform:rotate(180deg)}
</style>
<script>
document.querySelectorAll('.faq-trigger').forEach(function(btn){
  btn.addEventListener('click',function(){
    var item=this.closest('.faq-item'),isOpen=item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i){i.classList.remove('open')});
    if(!isOpen)item.classList.add('open');
  });
});
</script>

══ TYPOGRAPHY ══
- Hero headline: font-size:clamp(2.8rem,6vw,5.5rem); font-weight:800; letter-spacing:-0.035em; line-height:1.05
- Gradient on the KEY PHRASE of the headline: background:linear-gradient(135deg,var(--grad-from),var(--grad-to));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text
- Body: rgba(255,255,255,0.62); font-size:1.05rem; line-height:1.7
- Section labels (eyebrow text above section titles): font-size:0.75rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--accent); font-weight:600

══ PAGE TEXTURE ══
Add as the FIRST child of <body> (fixed, non-interactive, subtle):
<div aria-hidden="true" style="position:fixed;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(rgba(255,255,255,0.055) 1px,transparent 1px);background-size:30px 30px;-webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 0%,#000 40%,transparent 100%);mask-image:radial-gradient(ellipse 80% 80% at 50% 0%,#000 40%,transparent 100%)"></div>
All other page content: position:relative; z-index:1

══ SECTION DESIGN GUIDELINES ══
- STATS BAR: 3 stats with large gradient counter numbers (data-target + data-suffix), small label, glass-card background, full width, dividers between stats.
- HOW IT WORKS: numbered steps with large gradient step numerals. On desktop: horizontal with a gradient dashed connector line between numbers.
- PROOF: honest — "built in public", "early access", founder's context. NO fake social proof.
- FEATURES: SVG icons (never emoji) in an accent-colored glass icon box. Use the archetype's feature layout (grid / alternating rows / bento / etc.)
- FOOTER: dark, minimal. Brand name left, links right. Copyright. No clutter.

══ COLOR RULES ══
- Use CSS variables set in :root for ALL colors (--accent, --grad-from, --grad-to).
- Page base: #050810. Section alternation: #050810 → #070c18 → gradient band.
- Text: #fff headings, rgba(255,255,255,0.62) body, rgba(255,255,255,0.38) captions.
- NEVER use generic Tailwind gray-900 as the page background.

══ EMAIL FORMS (both hero and cta) ══
POST JSON to /api/signups: { "slug": "{{SLUG}}", "email": "..." }
Response: { "success": true/false, "message"/"error": "..." } — ALWAYS check data.success.
Input style: background rgba(255,255,255,0.06), border 1px solid rgba(255,255,255,0.1), focus border var(--accent), border-radius 0.6rem, padding 0.8rem 1.2rem, color white.
Button: .btn-primary class. Show inline success/error message below the form.
Use ctaText as button label, ctaSubtext as small helper text under the form.

══ ANALYTICS + REVEAL OBSERVER (add once, near </body>) ══
<script>
(function(){
  var tracked={};
  var analytics=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var id=e.target.dataset.section;
      if(e.isIntersecting&&id&&!tracked[id]){tracked[id]=true;fetch('/api/analytics/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'{{SLUG}}',section:id})});}
    });
  },{threshold:0.3});
  document.querySelectorAll('[data-section]').forEach(function(el){analytics.observe(el);});
  var reveal=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){reveal.observe(el);});
})();
</script>

══ BANNED — these make pages look amateur ══
- Missing sticky glass navbar with brand name
- Brand name not visible in the hero
- Flat static hero background (no geometry/animation)
- Geometry only in hero and nowhere else on the page
- No parallax on background elements
- Feature cards without glassmorphism
- CTA buttons without glow animation
- No scroll-reveal
- Static FAQ
- Emoji as feature icons
- Generic gray color scheme ignoring the palette
- Ignoring the archetype layout (every page looking the same)

Replace ALL {{SLUG}} occurrences with the actual slug value from the user message.`;

function buildUserMessage(brief: ProductBrief, slug: string, strategy: Strategy, archetype: Archetype): string {
  return `Slug (replace every {{SLUG}}): ${slug}
Brand name: ${brief.name}
CTA goal: ${brief.ctaGoal}${brief.price ? `\nPrice point: ${brief.price}` : ''}

━━ ARCHETYPE: ${archetype.name} ━━
Layout: ${archetype.layout}
Background geometry motif: ${archetype.geometry}
Hero variant: ${archetype.heroVariant}

━━ COLOR PALETTE: ${strategy.palette.name} ━━
Gradient: ${strategy.palette.from} → ${strategy.palette.to}
Accent: ${strategy.palette.accent}
CSS variable: :root { --accent: ${strategy.palette.accent}; --grad-from: ${strategy.palette.from}; --grad-to: ${strategy.palette.to}; }

━━ MESSAGING PLAN (use this copy exactly — do not fabricate proof) ━━
${JSON.stringify(strategy, null, 2)}

Generate the complete HTML landing page now. The archetype layout and geometry MUST be clearly visible — pages that ignore these instructions look generic.`;
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
