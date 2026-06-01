import Link from 'next/link';
import { getDashboardStats, type PageWithStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { totalPages, totalSignups, pages } = await getDashboardStats();
  const avgSignups = totalPages > 0 ? (totalSignups / totalPages).toFixed(1) : '—';

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-indigo-400">Launch</span>Kit
        </Link>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Create page
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard label="Total pages" value={totalPages} />
          <StatCard label="Total signups" value={totalSignups} />
          <StatCard label="Avg signups / page" value={avgSignups} />
        </div>

        {/* Pages */}
        {pages.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-3">No landing pages yet.</p>
            <Link href="/" className="text-indigo-400 hover:underline text-sm">
              Create your first one →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">
              {totalPages} page{totalPages !== 1 ? 's' : ''}
            </p>
            {pages.map((page) => (
              <PageRow key={page.id} page={page} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function PageRow({ page }: { page: PageWithStats }) {
  const date = new Date(page.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-white truncate">{page.name}</h2>
            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm shrink-0 flex items-center gap-0.5"
            >
              /{page.slug}
              <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-gray-500 mb-3">{date}</p>

          {/* Section views */}
          {page.sections.length > 0 ? (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Section views</p>
              <div className="flex flex-wrap gap-1.5">
                {page.sections.slice(0, 6).map((s) => (
                  <span
                    key={s.section}
                    className="inline-flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded"
                  >
                    <span className="text-gray-400">{s.section}</span>
                    <span className="text-white font-medium">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No section views yet</p>
          )}
        </div>

        {/* Right: signups */}
        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold tabular-nums leading-none">{page.signups}</p>
          <p className="text-xs text-gray-500 mt-1">signup{page.signups !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Conversion bar */}
      <ConversionBar
        signups={page.signups}
        heroViews={page.sections.find((s) => s.section === 'hero')?.count ?? 0}
      />
    </div>
  );
}

function ConversionBar({ signups, heroViews }: { signups: number; heroViews: number }) {
  if (heroViews === 0 || signups === 0) return null;
  const pct = Math.min(100, Math.round((signups / heroViews) * 100));
  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>Hero → signup conversion</span>
        <span className="text-gray-300 font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
