'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UseKeyboardShortcutsOptions {
  folder: string;
  messages: { uid: number }[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  folder,
  messages,
  selectedUid,
  onSelect,
  onArchive,
  onDelete,
  searchRef,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case 'j':
          if (e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          if (messages.length === 0) return;
          const idx = selectedUid ? messages.findIndex((m) => m.uid === selectedUid) : -1;
          const nextIdx = idx < messages.length - 1 ? idx + 1 : 0;
          onSelect(messages[nextIdx].uid);
          break;
        case 'k':
          if (e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          if (messages.length === 0) return;
          const idxK = selectedUid ? messages.findIndex((m) => m.uid === selectedUid) : messages.length;
          const prevIdx = idxK > 0 ? idxK - 1 : messages.length - 1;
          onSelect(messages[prevIdx].uid);
          break;
        case 'e':
          e.preventDefault();
          if (folder === 'inbox' && onArchive) onArchive();
          break;
        case '#':
          e.preventDefault();
          if (onDelete) onDelete();
          break;
        case 'Backspace':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (onDelete) onDelete();
          }
          break;
        case '/':
          e.preventDefault();
          if (searchRef?.current) {
            searchRef.current.focus();
          } else {
            router.push('/mail/search');
          }
          break;
        case '?':
          e.preventDefault();
          toast('j/k: prev/next • e: archive • #: delete • /: search', { duration: 4000 });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, folder, messages, selectedUid, onSelect, onArchive, onDelete, searchRef, router]);
}
