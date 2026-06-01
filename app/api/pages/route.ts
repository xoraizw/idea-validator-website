import { NextRequest, NextResponse } from 'next/server';
import { createPage, getPageBySlug } from '@/lib/db';
import { generateLandingPage } from '@/lib/ai';

const RESERVED = new Set(['dashboard', 'api', 'favicon.ico', '_next']);

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, prompt } = body as { name?: string; prompt?: string };

    if (!name?.trim() || !prompt?.trim()) {
      return NextResponse.json({ error: 'Name and prompt are required.' }, { status: 400 });
    }

    const slug = toSlug(name);

    if (!slug) {
      return NextResponse.json({ error: 'Product name produces an invalid URL slug.' }, { status: 400 });
    }

    if (RESERVED.has(slug)) {
      return NextResponse.json({ error: `"${slug}" is a reserved path. Choose a different name.` }, { status: 400 });
    }

    if (await getPageBySlug(slug)) {
      return NextResponse.json(
        { error: `A page with the slug "/${slug}" already exists.` },
        { status: 409 },
      );
    }

    const html = await generateLandingPage(slug, name.trim(), prompt.trim());
    await createPage(slug, name.trim(), prompt.trim(), html);

    return NextResponse.json({ slug, url: `/${slug}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[POST /api/pages]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
