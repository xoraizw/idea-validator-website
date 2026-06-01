import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Strategist (copy/positioning) benefits from a stronger model; builder can be cheaper.
const STRATEGY_MODEL = process.env.STRATEGY_MODEL ?? process.env.GENERATION_MODEL ?? 'gpt-5.4-mini';
const BUILDER_MODEL = process.env.GENERATION_MODEL ?? 'gpt-5.4';

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
  return lines.join('\n');
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

const BUILDER_SYSTEM = `You are an expert front-end developer. You turn a messaging plan into a single, polished, self-contained HTML landing page.

HARD REQUIREMENTS — follow exactly:
1. Return ONLY a valid HTML document. No markdown fences, no explanation, no preamble.
2. Include <script src="https://cdn.tailwindcss.com"></script> in <head>.
3. Include <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.
4. Structure the page with these sections in order. Each MUST have both an id AND a data-section attribute with the same value:
   - id="hero"         — headline, sub-headline, primary CTA (email signup form)
   - id="features"     — the benefits as 3–4 cards with an icon (SVG or emoji)
   - id="how-it-works" — the 3 numbered steps
   - id="proof"        — the honestProof line, framed honestly (NO fabricated testimonials, logos, counts, or ratings)
   - id="faq"          — the provided FAQ items
   - id="cta"          — final call-to-action with another email form
   - id="footer"       — minimal links and copyright

5. Email signup form requirements (BOTH forms in hero and cta must follow this):
   The form must POST as JSON to /api/signups with body { "slug": "{{SLUG}}", "email": "..." }.
   The API returns { "success": true, "message": "..." } on success, { "success": false, "error": "..." } on failure.
   ALWAYS check data.success (not response.ok or data.message) to determine success or failure.
   Show inline success/error messages. Use the provided ctaText as the submit button label and ctaSubtext beneath it.

6. Analytics tracking — add this script once, near </body>:
<script>
(function() {
  var tracked = {};
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var id = entry.target.dataset.section;
      if (entry.isIntersecting && id && !tracked[id]) {
        tracked[id] = true;
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: '{{SLUG}}', section: id })
        });
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-section]').forEach(function(el) { obs.observe(el); });
})();
</script>

7. Design — follow the provided layout archetype and color palette exactly:
   - Use the palette's gradient (from → to) and accent color for primary buttons and highlights.
   - Clean typography, generous whitespace, mobile-responsive Tailwind classes, subtle hover effects.
   - Honor the archetype's layout note for the overall composition.

Replace every {{SLUG}} placeholder with the actual slug value provided.`;

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
