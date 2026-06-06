import { NextRequest, NextResponse } from 'next/server';
import { createPage, getPageBySlug } from '@/lib/db';
import { generateLandingPage, type ProductBrief, type CtaGoal } from '@/lib/ai';

const RESERVED = new Set(['dashboard', 'api', 'favicon.ico', '_next']);
const CTA_GOALS: CtaGoal[] = ['waitlist', 'preorder', 'call'];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Short, URL-safe random suffix so two products with the same name never collide.
function randomSuffix(len = 5): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function uniqueSlug(base: string): Promise<string> {
  // base is guaranteed non-empty and non-reserved by the caller.
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${randomSuffix()}`;
    if (!RESERVED.has(candidate) && !(await getPageBySlug(candidate))) return candidate;
  }
  throw new Error('Could not allocate a unique slug. Please try again.');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ProductBrief>;
    const name = body.name?.trim();
    const description = body.description?.trim();
    const audience = body.audience?.trim();
    const ctaGoal = body.ctaGoal;

    if (!name || !description || !audience) {
      return NextResponse.json(
        { error: 'Product name, description, and target audience are required.' },
        { status: 400 },
      );
    }

    if (!ctaGoal || !CTA_GOALS.includes(ctaGoal)) {
      return NextResponse.json(
        { error: `ctaGoal must be one of: ${CTA_GOALS.join(', ')}.` },
        { status: 400 },
      );
    }

    const base = toSlug(name);
    if (!base || RESERVED.has(base)) {
      return NextResponse.json({ error: 'Product name produces an invalid URL slug.' }, { status: 400 });
    }

    const slug = await uniqueSlug(base);

    const brief: ProductBrief = {
      name,
      description,
      audience,
      ctaGoal,
      problem: body.problem?.trim() || undefined,
      outcome: body.outcome?.trim() || undefined,
      features: body.features?.trim() || undefined,
      differentiator: body.differentiator?.trim() || undefined,
      price: body.price?.trim() || undefined,
      tone: body.tone?.trim() || undefined,
      accent: body.accent?.trim() || undefined,
      extraContext: body.extraContext?.trim() || undefined,
    };

    const html = await generateLandingPage(slug, brief);
    // Persist the full brief (as JSON) in the existing `prompt` column.
    await createPage(slug, name, JSON.stringify(brief), html);

    return NextResponse.json({ slug, url: `/${slug}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[POST /api/pages]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
