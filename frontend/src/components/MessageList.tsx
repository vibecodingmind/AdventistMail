'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import clsx from 'clsx';

interface Message {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  flags: string[];
}

interface MessageListProps {
  messages: Message[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  folder: string;
  mailbox?: string;
}

export function MessageList({ messages, selectedUid, onSelect, folder, mailbox }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">No messages</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {messages.map((msg) => (
            <button
              key={msg.uid}
              onClick={() => onSelect(msg.uid)}
              className={clsx(
                'w-full text-left p-3 hover:bg-gray-50 transition-colors',
                selectedUid === msg.uid && 'bg-blue-50'
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-400 text-xs shrink-0 w-8">{msg.uid}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">{msg.from}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(msg.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-0.5">{msg.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
