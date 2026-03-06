'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageView } from '@/components/MessageView';
import { ComposeButton } from '@/components/ComposeButton';

interface Message {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  flags: string[];
}

export default function DraftsPage() {
  const searchParams = useSearchParams();
  const mailbox = searchParams.get('mailbox') || undefined;
  const [selectedUid, setSelectedUid] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ['messages', 'drafts', mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder: 'drafts' });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex-1 flex min-w-0">
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-2 border-b border-gray-200">
          <ComposeButton mailbox={mailbox} />
        </div>
        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelect={(uid) => setSelectedUid(uid)}
          folder="drafts"
          mailbox={mailbox}
        />
      </div>
      <div className="flex-1 overflow-auto">
        {selectedUid ? (
          <MessageView uid={selectedUid} folder="drafts" mailbox={mailbox} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a message
          </div>
        )}
      </div>
    </div>
  );
}
