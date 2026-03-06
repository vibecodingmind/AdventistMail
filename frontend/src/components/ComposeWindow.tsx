'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { api, apiFormData } from '@/lib/api';
import toast from 'react-hot-toast';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  can_send_as: boolean;
}

interface ComposeWindowProps {
  onClose: () => void;
  defaultMailbox?: string;
}

const TEXT_COLORS = [
  { label: 'Black',   value: '#000000' },
  { label: 'Gray',    value: '#6b7280' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Yellow',  value: '#eab308' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Purple',  value: '#a855f7' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'White',   value: '#ffffff' },
];

function ToolBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

export function ComposeWindow({ onClose, defaultMailbox }: ComposeWindowProps) {
  const [from, setFrom] = useState(defaultMailbox || '');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [activeColor, setActiveColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const sendableMailboxes = mailboxes.filter((m) => m.type === 'personal' || m.can_send_as);

  useEffect(() => {
    if (sendableMailboxes.length > 0 && !from) {
      setFrom(defaultMailbox || sendableMailboxes[0].email);
    }
  }, [sendableMailboxes, from, defaultMailbox]);

  // Focus editor on mount
  useEffect(() => {
    setTimeout(() => editorRef.current?.focus(), 100);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => setFiles((f) => [...f, ...accepted]),
    maxSize: 25 * 1024 * 1024,
    noClick: false,
  });

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function applyColor(color: string) {
    setActiveColor(color);
    setShowColorPicker(false);
    exec('foreColor', color);
  }

  async function handleSend() {
    const html = editorRef.current?.innerHTML ?? '';
    if (!to.trim()) { toast.error('Please enter a recipient'); return; }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('from', from);
      formData.append('to', JSON.stringify(to.split(',').map((e) => e.trim()).filter(Boolean)));
      if (cc.trim()) formData.append('cc', JSON.stringify(cc.split(',').map((e) => e.trim()).filter(Boolean)));
      if (bcc.trim()) formData.append('bcc', JSON.stringify(bcc.split(',').map((e) => e.trim()).filter(Boolean)));
      formData.append('subject', subject);
      formData.append('html', html);
      files.forEach((f) => formData.append('attachments', f));

      await apiFormData('/mail/send', formData);
      toast.success('Email sent');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div
        className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-200 ${
          minimized ? 'w-72 h-12 overflow-hidden' : 'w-[620px] max-h-[85vh]'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-2xl shrink-0">
          <h2 className="text-sm font-semibold text-white">New Message</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinimized(!minimized)}
              className="text-white/60 hover:text-white transition-colors"
              title={minimized ? 'Expand' : 'Minimize'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
              </svg>
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors" title="Close">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* ── Fields ── */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

              {/* From */}
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs font-semibold text-slate-400 w-10 shrink-0">From</span>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex-1 text-sm text-slate-700 bg-transparent focus:outline-none py-1"
                >
                  {sendableMailboxes.map((m) => (
                    <option key={m.id} value={m.email}>{m.email}</option>
                  ))}
                  {sendableMailboxes.length === 0 && (
                    <option value="">(no mailbox)</option>
                  )}
                </select>
              </div>

              {/* To */}
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs font-semibold text-slate-400 w-10 shrink-0">To</span>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@church.org"
                  className="flex-1 text-sm text-slate-700 placeholder-slate-300 bg-transparent focus:outline-none py-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {!showCc && (
                    <button type="button" onClick={() => setShowCc(true)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button type="button" onClick={() => setShowBcc(true)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {/* CC */}
              {showCc && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs font-semibold text-slate-400 w-10 shrink-0">Cc</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@church.org, ..."
                    autoFocus
                    className="flex-1 text-sm text-slate-700 placeholder-slate-300 bg-transparent focus:outline-none py-1"
                  />
                  <button type="button" onClick={() => { setShowCc(false); setCc(''); }}
                    className="text-slate-300 hover:text-slate-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* BCC */}
              {showBcc && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs font-semibold text-slate-400 w-10 shrink-0">Bcc</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@church.org, ..."
                    autoFocus
                    className="flex-1 text-sm text-slate-700 placeholder-slate-300 bg-transparent focus:outline-none py-1"
                  />
                  <button type="button" onClick={() => { setShowBcc(false); setBcc(''); }}
                    className="text-slate-300 hover:text-slate-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs font-semibold text-slate-400 w-10 shrink-0">Subj</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 text-sm text-slate-700 placeholder-slate-300 bg-transparent focus:outline-none py-1"
                />
              </div>

              {/* ── Formatting toolbar ── */}
              <div className="flex items-center gap-0.5 px-3 py-2 bg-slate-50 flex-wrap">
                {/* Bold */}
                <ToolBtn onClick={() => exec('bold')} title="Bold">
                  <span className="font-bold text-sm">B</span>
                </ToolBtn>
                {/* Italic */}
                <ToolBtn onClick={() => exec('italic')} title="Italic">
                  <span className="italic text-sm">I</span>
                </ToolBtn>
                {/* Underline */}
                <ToolBtn onClick={() => exec('underline')} title="Underline">
                  <span className="underline text-sm">U</span>
                </ToolBtn>
                {/* Strikethrough */}
                <ToolBtn onClick={() => exec('strikeThrough')} title="Strikethrough">
                  <span className="line-through text-sm">S</span>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Align left */}
                <ToolBtn onClick={() => exec('justifyLeft')} title="Align left">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                  </svg>
                </ToolBtn>
                {/* Align center */}
                <ToolBtn onClick={() => exec('justifyCenter')} title="Align center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                  </svg>
                </ToolBtn>
                {/* Align right */}
                <ToolBtn onClick={() => exec('justifyRight')} title="Align right">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                  </svg>
                </ToolBtn>
                {/* Justify */}
                <ToolBtn onClick={() => exec('justifyFull')} title="Justify">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Bullet list */}
                <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet list">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    <circle cx="1.5" cy="6" r="1.5" fill="currentColor" />
                    <circle cx="1.5" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </ToolBtn>
                {/* Ordered list */}
                <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered list">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h11M9 12h11M9 19h11M4 5v4M4 5h1.5M4 9h1.5" />
                  </svg>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Font size smaller */}
                <ToolBtn onClick={() => exec('fontSize', '2')} title="Smaller text">
                  <span className="text-[10px] font-semibold">A</span>
                </ToolBtn>
                {/* Font size larger */}
                <ToolBtn onClick={() => exec('fontSize', '5')} title="Larger text">
                  <span className="text-base font-semibold">A</span>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Text color picker */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); }}
                    title="Text color"
                    className="w-7 h-7 flex flex-col items-center justify-center rounded hover:bg-slate-100 transition-colors gap-0.5"
                  >
                    <span className="text-xs font-bold text-slate-700 leading-none">A</span>
                    <span className="w-4 h-1 rounded-full" style={{ backgroundColor: activeColor }} />
                  </button>

                  {showColorPicker && (
                    <div className="absolute top-9 left-0 z-10 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-52">
                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Text Color</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); applyColor(c.value); }}
                            title={c.label}
                            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                              backgroundColor: c.value,
                              borderColor: activeColor === c.value ? '#10b981' : 'transparent',
                              boxShadow: c.value === '#ffffff' ? 'inset 0 0 0 1px #e2e8f0' : undefined,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlight color */}
                <ToolBtn onClick={() => exec('hiliteColor', '#fef08a')} title="Highlight">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 21h10v-2H7v2zm3.87-5.46L15 11l-2-2-5.87 5.54A2 2 0 006 16v2h3a2 2 0 001.87-2.46zM19.41 4.59a2 2 0 00-2.82 0L13 8.18l2.83 2.83 3.58-3.6a2 2 0 000-2.82z" />
                  </svg>
                </ToolBtn>

                {/* Remove formatting */}
                <ToolBtn onClick={() => exec('removeFormat')} title="Clear formatting">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </ToolBtn>
              </div>

              {/* ── Rich text editor ── */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Write your message here..."
                onBlur={() => setShowColorPicker(false)}
                className="min-h-[180px] px-4 py-3 text-sm text-slate-800 focus:outline-none leading-relaxed"
                style={{ wordBreak: 'break-word' }}
              />

              {/* ── Attachments ── */}
              <div
                {...getRootProps()}
                className="mx-4 my-3 border-2 border-dashed border-slate-200 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-xs">Attach files — drag & drop or click</span>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {f.name}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                          className="text-slate-400 hover:text-red-400 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {showCc || cc ? <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Cc</span> : null}
                {showBcc || bcc ? <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Bcc</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  {sending ? 'Sending…' : 'Send'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Backdrop click to close color picker */}
      {showColorPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
      )}
    </div>
  );
}
