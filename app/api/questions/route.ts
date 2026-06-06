import { NextRequest, NextResponse } from 'next/server';
import { generateDiscoveryQuestions, type CtaGoal } from '@/lib/ai';

const CTA_GOALS: CtaGoal[] = ['waitlist', 'preorder', 'call'];

export async function POST(req: NextRequest) {
  try {
    const { name, description, ctaGoal } = (await req.json()) as {
      name?: string;
      description?: string;
      ctaGoal?: string;
    };

    if (!name?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'name and description are required.' }, { status: 400 });
    }

    const goal: CtaGoal = CTA_GOALS.includes(ctaGoal as CtaGoal)
      ? (ctaGoal as CtaGoal)
      : 'waitlist';

    const questions = await generateDiscoveryQuestions(name.trim(), description.trim(), goal);
    return NextResponse.json({ questions });
  } catch (err: unknown) {
    console.error('[POST /api/questions]', err);
    return NextResponse.json({ error: 'Failed to generate questions.' }, { status: 500 });
  }
}
