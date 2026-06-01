'use client';

import { useState } from 'react';
import Link from 'next/link';

type CtaGoal = 'waitlist' | 'preorder' | 'call';

const CTA_OPTIONS: { value: CtaGoal; label: string; hint: string }[] = [
  { value: 'waitlist', label: 'Waitlist', hint: 'Measure interest' },
  { value: 'preorder', label: 'Pre-order', hint: 'Measure willingness to pay' },
  { value: 'call', label: 'Book a call', hint: 'Measure high intent' },
];

const EXAMPLES = [
  'A time-tracking tool for freelancers that auto-generates invoices and sends payment reminders.',
  'An AI writing assistant for developers that turns code comments into documentation.',
  'A shared inbox for small teams that routes support emails using AI triage.',
];

const INPUT =
  'w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors';
const LABEL = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function Home() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('waitlist');

  // Optional fields
  const [showDetails, setShowDetails] = useState(false);
  const [problem, setProblem] = useState('');
  const [outcome, setOutcome] = useState('');
  const [features, setFeatures] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [price, setPrice] = useState('');
  const [tone, setTone] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          audience,
          ctaGoal,
          problem,
          outcome,
          features,
          differentiator,
          price,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">
          <span className="text-indigo-400">Launch</span>Kit
        </span>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          Dashboard
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-powered · Live in seconds
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Turn your idea into a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              landing page
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Describe your SaaS idea. Get a full landing page with a waitlist form, analytics, and a
            live URL — instantly.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Product name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TaskFlow"
              required
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>What does it do?</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line: what it does and the problem it solves."
              required
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>

          <div>
            <label className={LABEL}>Who is it for?</label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. freelance designers, not just 'businesses'"
              required
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>What do you want to measure?</label>
            <div className="grid grid-cols-3 gap-2">
              {CTA_OPTIONS.map((opt) => {
                const active = ctaGoal === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCtaGoal(opt.value)}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-gray-500">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional details */}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors pt-1"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Add details for a sharper page (optional)
          </button>

          {showDetails && (
            <div className="space-y-4 border-l-2 border-gray-800 pl-4">
              <div>
                <label className={LABEL}>Problem & current alternative</label>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="What painful thing do they do today? (spreadsheets, hiring someone, nothing…)"
                  rows={2}
                  className={`${INPUT} resize-none`}
                />
              </div>
              <div>
                <label className={LABEL}>Primary outcome</label>
                <input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="The transformation, e.g. 'get paid on time, every time'"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Key features</label>
                <textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="3 features, one per line"
                  rows={3}
                  className={`${INPUT} resize-none`}
                />
              </div>
              <div>
                <label className={LABEL}>Differentiator / why now</label>
                <input
                  value={differentiator}
                  onChange={(e) => setDifferentiator(e.target.value)}
                  placeholder="Unlike X, we…"
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Price point</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. $19/mo"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Tone / vibe</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="playful, technical, minimal…"
                    className={INPUT}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating your landing page…
              </>
            ) : (
              'Generate landing page'
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-5 bg-red-950/50 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="mt-5 bg-green-950/50 border border-green-800 rounded-lg px-5 py-4">
            <p className="text-green-400 font-medium text-sm mb-2">Your landing page is live!</p>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2 break-all"
            >
              {typeof window !== 'undefined' ? window.location.origin : ''}{result.url}
            </a>
            <p className="text-gray-500 text-xs mt-3">
              Track signups and views in the{' '}
              <Link href="/dashboard" className="text-gray-400 hover:text-white underline">
                dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {/* Examples */}
        <div className="mt-14">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Example ideas</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setDescription(ex)}
                className="w-full text-left bg-gray-900/50 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200 text-sm px-4 py-3 rounded-lg transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
