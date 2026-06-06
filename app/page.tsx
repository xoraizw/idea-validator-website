'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'input' | 'loading-questions' | 'questions' | 'generating' | 'done';
type CtaGoal = 'waitlist' | 'preorder' | 'call';
type Question = { label: string; placeholder: string };

const CTA_OPTIONS: { value: CtaGoal; label: string; hint: string }[] = [
  { value: 'waitlist', label: 'Waitlist', hint: 'Measure interest' },
  { value: 'preorder', label: 'Pre-order', hint: 'Willingness to pay' },
  { value: 'call', label: 'Book a call', hint: 'High-intent leads' },
];

const EXAMPLES = [
  { name: 'InvoiceAI', description: 'A time-tracking tool for freelancers that auto-generates invoices and sends payment reminders.', audience: 'Freelance designers and developers' },
  { name: 'DocuBot', description: 'An AI writing assistant that turns code comments into clear documentation.', audience: 'Software developers at startups' },
  { name: 'TeamInbox', description: 'A shared inbox that routes support emails to the right teammate using AI.', audience: 'Small SaaS founders managing support' },
];

const INPUT = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors';
const LABEL = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('waitlist');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);
  const [error, setError] = useState('');

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStep('loading-questions');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, ctaGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate questions');
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setStep('questions');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('input');
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStep('generating');
    try {
      const extraContext = questions
        .map((q, i) => (answers[i]?.trim() ? `Q: ${q.label}\nA: ${answers[i].trim()}` : null))
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, audience, ctaGoal, extraContext: extraContext || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setResult(data);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('questions');
    }
  }

  function reset() {
    setStep('input');
    setName(''); setDescription(''); setAudience(''); setCtaGoal('waitlist');
    setQuestions([]); setAnswers([]); setResult(null); setError('');
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/60 px-6 py-4 flex items-center justify-between">
        <button onClick={reset} className="font-semibold tracking-tight">
          <span className="text-indigo-400">Launch</span>Kit
        </button>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
          Dashboard
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {step === 'input' && (
          <InputStep
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            audience={audience} setAudience={setAudience}
            ctaGoal={ctaGoal} setCtaGoal={setCtaGoal}
            onSubmit={handleContinue}
            error={error}
            onExample={(ex) => { setName(ex.name); setDescription(ex.description); setAudience(ex.audience); }}
          />
        )}

        {step === 'loading-questions' && <LoadingScreen label="Generating questions for your idea…" />}

        {step === 'questions' && (
          <QuestionsStep
            name={name}
            questions={questions}
            answers={answers}
            setAnswers={setAnswers}
            onBack={() => setStep('input')}
            onSubmit={handleGenerate}
            error={error}
          />
        )}

        {step === 'generating' && <LoadingScreen label="Building your landing page…" sublabel="This takes about 30 seconds." />}

        {step === 'done' && result && <DoneStep result={result} onReset={reset} />}
      </div>
    </main>
  );
}

// ── Step 1: Idea input ────────────────────────────────────────────────────────

function InputStep({
  name, setName, description, setDescription, audience, setAudience,
  ctaGoal, setCtaGoal, onSubmit, error, onExample,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  audience: string; setAudience: (v: string) => void;
  ctaGoal: CtaGoal; setCtaGoal: (v: CtaGoal) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  onExample: (ex: typeof EXAMPLES[0]) => void;
}) {
  return (
    <div>
      <StepIndicator current={1} total={2} />
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-3">
          Describe your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            idea
          </span>
        </h1>
        <p className="text-gray-400">We'll ask a few targeted questions to make your page sharper.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Product name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TaskFlow" required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Who is it for?</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. freelance designers" required className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>What does it do?</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="One line: what it does and the core problem it solves."
            required rows={3} className={`${INPUT} resize-none`}
          />
        </div>

        <div>
          <label className={LABEL}>What do you want to measure?</label>
          <div className="grid grid-cols-3 gap-2">
            {CTA_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setCtaGoal(opt.value)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${ctaGoal === opt.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBox message={error} />}

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
          Continue
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </form>

      <div className="mt-12">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Try an example</p>
        <div className="space-y-2">
          {EXAMPLES.map((ex) => (
            <button key={ex.name} type="button" onClick={() => onExample(ex)}
              className="w-full text-left bg-gray-900/50 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200 text-sm px-4 py-3 rounded-lg transition-all">
              <span className="text-white font-medium">{ex.name}</span> — {ex.description}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Discovery questions ───────────────────────────────────────────────

function QuestionsStep({
  name, questions, answers, setAnswers, onBack, onSubmit, error,
}: {
  name: string;
  questions: Question[];
  answers: string[];
  setAnswers: (a: string[]) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
}) {
  function setAnswer(i: number, val: string) {
    const next = [...answers];
    next[i] = val;
    setAnswers(next);
  }

  const answered = answers.filter((a) => a.trim()).length;

  return (
    <div>
      <StepIndicator current={2} total={2} />
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
          A few questions about{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            {name}
          </span>
        </h1>
        <p className="text-gray-400 text-sm">
          The more you share, the more targeted your page.{' '}
          <span className="text-gray-600">Skip anything you're unsure about.</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {questions.map((q, i) => (
          <div key={i}>
            <label className={LABEL}>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mr-2">
                {i + 1}
              </span>
              {q.label}
            </label>
            <textarea
              value={answers[i] ?? ''}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
              className={`${INPUT} resize-none`}
            />
          </div>
        ))}

        {answered === 0 && (
          <p className="text-xs text-amber-600/80 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Answering at least one question will significantly improve your landing page.
          </p>
        )}

        {error && <ErrorBox message={error} />}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onBack}
            className="px-5 py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg transition-colors text-sm">
            ← Back
          </button>
          <button type="submit"
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors">
            Generate landing page
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${i + 1 <= current ? 'bg-indigo-500' : 'bg-gray-700'}`} />
          {i < total - 1 && <div className={`h-px w-8 transition-colors ${current > i + 1 ? 'bg-indigo-500' : 'bg-gray-700'}`} />}
        </div>
      ))}
      <span className="text-xs text-gray-500 ml-1">Step {current} of {total}</span>
    </div>
  );
}

function LoadingScreen({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <svg className="animate-spin w-8 h-8 text-indigo-500 mb-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-white font-medium">{label}</p>
      {sublabel && <p className="text-gray-500 text-sm mt-1">{sublabel}</p>}
    </div>
  );
}

function DoneStep({ result, onReset }: { result: { slug: string; url: string }; onReset: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 mb-6">
        <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2">Your landing page is live!</h2>
      <p className="text-gray-400 text-sm mb-6">Share it to start collecting signups.</p>

      <a href={result.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors mb-4">
        Open /{result.slug}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      <div className="flex items-center justify-center gap-4 text-sm mt-2">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          View in dashboard →
        </Link>
        <button onClick={onReset} className="text-gray-600 hover:text-gray-400 transition-colors">
          Create another
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-950/50 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}
