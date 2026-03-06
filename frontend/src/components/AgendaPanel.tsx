'use client';

import { useState } from 'react';

interface Task {
  id: number;
  label: string;
  type: 'task' | 'event';
  time?: string;
  done?: boolean;
}

const noDateTasks: Task[] = [
  { id: 1, label: "George's projects", type: 'task' },
  { id: 2, label: 'HW list proposal', type: 'task' },
  { id: 3, label: 'Dinner reservation', type: 'task' },
];

const todayTasks: Task[] = [
  { id: 4, label: 'Make dinner reservation', type: 'task', done: true },
  { id: 5, label: 'Lunch with Joe', type: 'event', time: '8:00am - 8:30am' },
  { id: 6, label: 'Briefing', type: 'event', time: '9:00am - 9:30am' },
  { id: 7, label: 'Squash', type: 'event', time: '10:00am - 11:30am' },
];

const tomorrowTasks: Task[] = [
  { id: 8, label: 'Mom', type: 'task' },
  { id: 9, label: 'Contract overview', type: 'task', done: true },
  { id: 10, label: 'Set up home office', type: 'task', done: true },
  { id: 11, label: 'Shopping', type: 'task', done: true },
  { id: 12, label: 'Meeting', type: 'event', time: '8:00am - 9:00am' },
  { id: 13, label: 'New review', type: 'event', time: '1:00pm - 2:00pm' },
  { id: 14, label: 'Family dinner', type: 'event', time: '6:00pm - 7:00pm' },
];

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-2 py-1 group">
      {task.type === 'task' ? (
        <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${task.done ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {task.done
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            : <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.75} />
          }
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
      <div className="min-w-0">
        <p className={`text-xs leading-tight ${task.done ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
          {task.label}
        </p>
        {task.time && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{task.time}</p>
        )}
      </div>
      <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
  );
}

function Section({ label, tasks }: { label: string; tasks: Task[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left py-1 px-1"
      >
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      </button>
      {open && (
        <div className="pl-1 space-y-0.5">
          {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

export function AgendaPanel() {
  return (
    <div className="w-64 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hidden xl:flex font-sans">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Agenda</h2>
        <input
          type="text"
          placeholder="Add New Task..."
          className="mt-2 w-full text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-slate-200 dark:border-slate-700 pb-1 focus:outline-none focus:border-blue-400 placeholder-slate-400 dark:placeholder-slate-600"
        />
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Section label="No Date" tasks={noDateTasks} />
        <Section label="Today" tasks={todayTasks} />
        <Section label="Tomorrow" tasks={tomorrowTasks} />
      </div>
    </div>
  );
}
