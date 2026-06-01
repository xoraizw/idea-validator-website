import { NextRequest, NextResponse } from 'next/server';
import { getPageBySlug, trackSection } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { slug, section } = (await req.json()) as { slug?: string; section?: string };

    if (!slug || !section) {
      return NextResponse.json({ error: 'slug and section required.' }, { status: 400 });
    }

    const page = await getPageBySlug(slug);
    if (!page) {
      return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    }

    await trackSection(page.id, section);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[POST /api/analytics/track]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
