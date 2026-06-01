'use client';

import { useState } from 'react';
import type { Signup } from '@/lib/db';

export function EmailList({ emails, slug }: { emails: Signup[]; slug: string }) {
  const [open, setOpen] = useState(false);

  if (emails.length === 0) return null;

  function copyAll() {
    navigator.clipboard.writeText(emails.map((e) => e.email).join('\n'));
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide' : 'Show'} {emails.length} email{emails.length !== 1 ? 's' : ''}
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Waitlist signups for /{slug}</p>
            <button
              onClick={copyAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy all
            </button>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
            {emails.map((e, i) => (
              <div
                key={e.email}
                className={`flex items-center justify-between px-3 py-2 text-sm ${
                  i !== emails.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <span className="text-gray-200 font-mono text-xs">{e.email}</span>
                <span className="text-gray-600 text-xs ml-4 shrink-0">
                  {new Date(e.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
