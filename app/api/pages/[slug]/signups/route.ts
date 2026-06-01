import { NextRequest, NextResponse } from 'next/server';
import { getPageBySlug, getSignupsByPage } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const page = await getPageBySlug(params.slug);
  if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

  const signups = await getSignupsByPage(page.id);
  return NextResponse.json({ slug: params.slug, count: signups.length, signups });
}
