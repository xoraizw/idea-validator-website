import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.GENERATION_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an expert web developer and conversion-rate optimizer. Generate complete, self-contained HTML landing pages for SaaS products.

HARD REQUIREMENTS — follow exactly:
1. Return ONLY a valid HTML document. No markdown fences, no explanation, no preamble.
2. Include <script src="https://cdn.tailwindcss.com"></script> in <head>.
3. Include <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.
4. Structure the page with these sections in order, each having both an id AND a data-section attribute with the same value:
   - id="hero"         — headline, sub-headline, primary CTA (email signup form)
   - id="features"     — 3–4 key features with icons (use SVG or emoji)
   - id="how-it-works" — 3 numbered steps
   - id="social-proof" — testimonials or "trusted by" logos (use placeholder names)
   - id="cta"          — final call-to-action with another email form
   - id="footer"       — links and copyright

5. Email signup form requirements (BOTH forms in hero and cta must follow this):
   Replace SECTIONID with the actual section id (hero or cta).
   The form must POST as JSON to /api/signups with body { "slug": "{{SLUG}}", "email": "..." }.
   Show inline success/error messages. The submit button should say "Join the waitlist".

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

7. Design guidelines:
   - Bold gradient hero with a color scheme fitting the product
   - Clean sans-serif typography, generous whitespace
   - Mobile-responsive layout using Tailwind responsive classes
   - Subtle hover effects on buttons and cards

Replace {{SLUG}} everywhere with the actual slug value provided.`;

export async function generateLandingPage(slug: string, name: string, prompt: string): Promise<string> {
  const userMessage = `Product name: ${name}
Slug: ${slug}
Description: ${prompt}

Generate the landing page now. Replace every {{SLUG}} placeholder with: ${slug}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  let html = (response.choices[0].message.content ?? '').trim();
  // Strip accidental markdown fences
  if (html.startsWith('```')) html = html.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();

  return html;
}
