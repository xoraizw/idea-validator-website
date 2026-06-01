import { NextRequest, NextResponse } from 'next/server';
import { getPageBySlug, addSignup } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { slug, email } = (await req.json()) as { slug?: string; email?: string };

    if (!slug || !email) {
      return NextResponse.json({ success: false, error: 'slug and email are required.' }, { status: 400 });
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const page = await getPageBySlug(slug);
    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found.' }, { status: 404 });
    }

    const result = await addSignup(page.id, email);

    if (result === 'duplicate') {
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
      });
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll be in touch soon.",
    });
  } catch (err: unknown) {
    console.error('[POST /api/signups]', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
