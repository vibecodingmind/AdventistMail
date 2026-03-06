'use client';

import { useState } from 'react';
import { ComposeWindow } from './ComposeWindow';

export function ComposeButton({ mailbox }: { mailbox?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
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
