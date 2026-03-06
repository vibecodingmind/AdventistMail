'use client';

import { useState } from 'react';
import { ComposeWindow } from './ComposeWindow';

export function ComposeButton({ mailbox }: { mailbox?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Compose
      </button>
      {open && (
        <ComposeWindow
          onClose={() => setOpen(false)}
          defaultMailbox={mailbox}
        />
      )}
    </>
  );
}
