'use client';

import { useState } from 'react';
import { ComposeWindow } from './ComposeWindow';

export function ComposeButton({ mailbox }: { mailbox?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm w-full justify-center"
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
