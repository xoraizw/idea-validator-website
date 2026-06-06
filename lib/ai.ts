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
  layout: string;
  geometry: string;
};
type Palette = { name: string; from: string; to: string; accent: string };

const ARCHETYPES: Archetype[] = [
  {
    name: 'centered',
    layout: 'Hero: fully centered content. Features: 3-column card grid. Steps: horizontal row with gradient dashes between numbers. CTA: centered.',
    geometry: 'Two large gradient orbs (blur:130px, no backdrop-filter). Orb-1: top-left, 580px, grad-from color, opacity 0.18, float-A anim 16s. Orb-2: bottom-right, 480px, grad-to color, opacity 0.14, float-B anim 20s.',
  },
  {
    name: 'split',
    layout: 'Hero: left column (55%) has text+form, right column (45%) has 2-3 stacked frosted UI-card mockups at slight rotation angles. Features: alternating left-text/right-icon rows. Steps: vertical timeline with dashed connector.',
    geometry: 'One large orb top-right (grad-from, 500px, blur 120px, opacity 0.2, float-A 18s). Subtle animated dot grid: background-image radial-gradient(circle, accent-color 1px, transparent 1px), background-size 36px 36px, very low opacity 0.07, slowly drifts via @keyframes background-position 20s linear infinite.',
  },
  {
    name: 'bold',
    layout: 'Hero: left-aligned, massive headline (clamp 3.5rem 8vw). Features: bento grid (one large card spanning 2 cols + 2 smaller). Steps: large numbered cards in a row. CTA: full-width gradient band section.',
    geometry: 'Animated grid lines: background-image linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) and linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), background-size 60px 60px, @keyframes drift that shifts background-position 60px 60px over 8s linear infinite. Plus one accent glow blob center-right.',
  },
  {
    name: 'minimal',
    layout: 'Hero: centered, generous padding, restrained. Features: clean horizontal rows with thin left accent border. Steps: large numerals left, description right. FAQ: borderless. Overall: maximum breathing room.',
    geometry: 'One very subtle diagonal light beam: position:absolute, width:120%, height:2px, background linear-gradient(90deg, transparent, accent-color at 50%, transparent), opacity 0.15, top 40%, rotate(-15deg), @keyframes shimmer translateX(-100% to 100%) 6s ease-in-out infinite. Plus faint radial glow at hero center.',
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

const BUILDER_SYSTEM = `You are a world-class front-end developer. You build modern, visually distinct SaaS landing pages that are beautiful AND performant. No layout bugs, no overlapping elements, smooth scrolling.

══ OUTPUT RULES ══
- Return ONLY the complete HTML document. No markdown, no commentary before or after.
- <head> must have: <meta charset="UTF-8">, viewport meta, Tailwind CDN script, and ONE <style> block.
- First rule in <style>: *,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;overflow-x:hidden;background:#060818;color:#fff;font-family:system-ui,-apple-system,sans-serif}
- Every section wrapper is width:100%, no horizontal margin. Inner content: max-width:1200px;margin:0 auto;padding:0 clamp(1rem,4vw,2rem)

══ SECTIONS (in this order) ══
nav, hero, features, stats, how-it-works, proof, faq, cta, footer
Each section (except nav) must have BOTH id AND data-section set to the same value.

══ NAVBAR ══
- position:fixed; top:0; left:0; right:0; height:64px; z-index:50
- background:rgba(6,8,24,0.85); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.07)
- Layout: flex, align-items:center, justify-content:space-between, padding:0 clamp(1rem,4vw,2rem)
- LEFT: brand name — gradient text using var(--grad-from)→var(--grad-to), font-weight:700, font-size:1.15rem, letter-spacing:-0.02em, text-decoration:none
- CENTER (hide on mobile with media query): 3 anchor links to #features #how-it-works #faq, color:rgba(255,255,255,0.6), font-size:0.875rem, gap:2rem
- RIGHT: small button — border:1px solid var(--accent), color:var(--accent), padding:0.4rem 1rem, border-radius:0.5rem, font-size:0.85rem, background:transparent

══ HERO ══
- padding-top:64px (CRITICAL — offsets the fixed navbar, prevents content hidden behind it)
- min-height:100vh; position:relative; overflow:hidden; display:flex; align-items:center
- Background geometry: implement exactly what the archetype specifies. Geometry divs are position:absolute, pointer-events:none, z-index:0. Use will-change:transform on animated elements.
- Hero content wrapper: position:relative; z-index:1; width:100%
- BRAND IN HERO: Display the brand name as a styled pill badge above the headline.
  Style: display:inline-flex; align-items:center; gap:0.5rem; padding:0.35rem 1rem; border-radius:999px; border:1px solid rgba(accent,0.3); background:rgba(accent,0.08); font-size:0.8rem; font-weight:600; color:var(--accent); margin-bottom:1.5rem
- HEADLINE: font-size:clamp(2.6rem,5.5vw,5rem); font-weight:800; letter-spacing:-0.03em; line-height:1.08; margin-bottom:1.25rem
  Wrap the key phrase in gradient text: <span style="background:linear-gradient(135deg,var(--grad-from),var(--grad-to));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
- SUBHEADLINE: font-size:1.1rem; color:rgba(255,255,255,0.6); max-width:560px; line-height:1.65; margin-bottom:2rem
- EMAIL FORM: see Email Forms section below

══ ANIMATIONS (CSS-only — NO scroll event listeners, NO JS parallax) ══
Use only CSS @keyframes. Two animation types maximum:

1. Float animation for orbs/blobs:
@keyframes float-a{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}
@keyframes float-b{0%,100%{transform:translate(0,0)}50%{transform:translate(-35px,45px)}}
Add will-change:transform to all animated geometry elements.

2. Slow drift for grid/line geometries:
@keyframes drift{from{background-position:0 0}to{background-position:60px 60px}}

3. Glow pulse for CTA button:
@keyframes glow{0%,100%{box-shadow:0 0 16px rgba(var(--accent-rgb),0.4),0 0 32px rgba(var(--accent-rgb),0.2)}50%{box-shadow:0 0 28px rgba(var(--accent-rgb),0.7),0 0 56px rgba(var(--accent-rgb),0.35)}}
Note: set --accent-rgb as comma-separated RGB values in :root (e.g. 129,140,248 for #818cf8).

══ SCROLL REVEAL (IntersectionObserver only — no scroll events) ══
<style>
.reveal{opacity:0;transform:translateY(36px);transition:opacity 0.65s cubic-bezier(.22,1,.36,1),transform 0.65s cubic-bezier(.22,1,.36,1)}
.reveal.in{opacity:1;transform:none}
.d1{transition-delay:.07s}.d2{transition-delay:.14s}.d3{transition-delay:.21s}.d4{transition-delay:.28s}
</style>
Apply class="reveal" to feature cards (+ d1/d2/d3/d4 for stagger), steps, stats wrapper, proof, each FAQ item, CTA section.

══ FEATURE CARDS ══
- NO backdrop-filter (causes slow scroll). Use instead: background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:1.25rem
- Hover: transform:translateY(-4px); border-color:rgba(255,255,255,0.16); box-shadow:0 8px 32px rgba(0,0,0,0.4). Use transition:all 0.25s ease.
- SVG icon in a small accent-colored icon box (no emoji): background:rgba(var(--accent-rgb),0.12); border-radius:0.75rem; padding:0.6rem; display:inline-flex
- Layout per archetype instructions.

══ STATS BAR ══
3 stats side by side. Each: large gradient number (data-target="N" data-suffix="+"), small label.
Background: rgba(255,255,255,0.03); border-top:1px solid rgba(255,255,255,0.07); border-bottom:1px solid rgba(255,255,255,0.07)
Counter JS (runs once on entry, no scroll listener):
<script>
(function(){
  var fired=false;
  new IntersectionObserver(function(e){
    if(fired||!e[0].isIntersecting)return;fired=true;
    document.querySelectorAll('[data-target]').forEach(function(el){
      var end=+el.dataset.target,suf=el.dataset.suffix||'',dur=1600,t0=performance.now();
      (function frame(t){var p=Math.min((t-t0)/dur,1),v=1-Math.pow(1-p,3);el.textContent=Math.round(v*end).toLocaleString()+suf;if(p<1)requestAnimationFrame(frame);})(t0);
    });
  },{threshold:0.4}).observe(document.getElementById('stats'));
})();
</script>

══ HOW IT WORKS ══
3 steps. Large gradient step numeral (font-size:3rem, gradient text). Step title bold. Short description.
On desktop: horizontal flex with a dashed gradient line between numerals.
On mobile: vertical stack.

══ FAQ ACCORDION ══
<style>
.faq-body{max-height:0;overflow:hidden;transition:max-height .38s ease}
.faq-item.open .faq-body{max-height:280px}
.faq-chevron{transition:transform .3s ease;display:inline-block}
.faq-item.open .faq-chevron{transform:rotate(180deg)}
.faq-trigger{cursor:pointer;width:100%;text-align:left;background:none;border:none;color:inherit;display:flex;justify-content:space-between;align-items:center;padding:1.1rem 0;font-size:1rem;font-weight:600}
</style>
<script>
document.querySelectorAll('.faq-trigger').forEach(function(b){
  b.addEventListener('click',function(){
    var item=this.closest('.faq-item'),open=item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i){i.classList.remove('open')});
    if(!open)item.classList.add('open');
  });
});
</script>

══ CTA BUTTON ══
class="btn-primary" on all submit buttons.
<style>
.btn-primary{background:linear-gradient(135deg,var(--grad-from),var(--grad-to));color:#fff;font-weight:600;font-size:1rem;padding:0.8rem 1.8rem;border:none;border-radius:0.65rem;cursor:pointer;animation:glow 2.5s ease-in-out infinite;transition:transform .2s ease,filter .2s ease;white-space:nowrap}
.btn-primary:hover{transform:translateY(-2px);filter:brightness(1.08)}
</style>

══ EMAIL FORMS ══
Both hero and cta forms POST to /api/signups: body JSON { "slug": "{{SLUG}}", "email": "..." }
Check data.success (true/false). Show inline message. Use ctaText as button label, ctaSubtext as small text under.
Input: background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:0.6rem;padding:0.75rem 1.1rem;color:#fff;font-size:1rem;outline:none
Input focus: border-color:var(--accent)
On mobile: form stacks vertically (flex-direction:column).

══ COLORS & CSS VARIABLES ══
Set in :root: --accent, --grad-from, --grad-to, --accent-rgb (R,G,B of accent).
Page bg: #060818. Section backgrounds alternate: #060818 → #080d1c.
Headings: #fff. Body: rgba(255,255,255,0.62). Captions: rgba(255,255,255,0.38).
Eyebrow labels (above section titles): font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:0.75rem

══ SECTION BACKGROUNDS ══
echo the hero geometry in the cta section at 40% scale and opacity. Keep it subtle.

══ PROOF SECTION ══
Honest only. "Building in public", "early access", founder story, a concrete mission statement. NO fake testimonials, logos, ratings, or user counts.

══ FOOTER ══
Dark minimal. Brand name gradient text left. Links right. Copyright center or below. padding:2rem 0.

══ ANALYTICS + REVEAL OBSERVER (one script block, near </body>) ══
<script>
(function(){
  var T={};
  var ao=new IntersectionObserver(function(es){es.forEach(function(e){var id=e.target.dataset.section;if(e.isIntersecting&&id&&!T[id]){T[id]=1;fetch('/api/analytics/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'{{SLUG}}',section:id})});}});},{threshold:0.3});
  document.querySelectorAll('[data-section]').forEach(function(el){ao.observe(el);});
  var ro=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});},{threshold:0.08,rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ro.observe(el);});
})();
</script>

══ PERFORMANCE RULES (non-negotiable) ══
- NO backdrop-filter on feature cards or any element that repeats more than once (it kills scroll FPS)
- NO JS scroll event listeners (use IntersectionObserver instead)
- NO position:fixed backgrounds or textures (causes constant repaint)
- Add will-change:transform ONLY to elements that are actively CSS-animated
- Keep total CSS animations to ≤ 4 simultaneous elements

Replace ALL {{SLUG}} with the actual slug value.`;

function buildUserMessage(brief: ProductBrief, slug: string, strategy: Strategy, archetype: Archetype): string {
  return `Slug (replace every {{SLUG}}): ${slug}
Brand name: ${brief.name}
CTA goal: ${brief.ctaGoal}${brief.price ? `\nPrice point: ${brief.price}` : ''}

━━ ARCHETYPE: ${archetype.name} ━━
Layout: ${archetype.layout}
Background geometry: ${archetype.geometry}

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
