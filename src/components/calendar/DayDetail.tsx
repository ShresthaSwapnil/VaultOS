'use client';

import React from 'react';
import { marked } from 'marked';
import { CalendarItem } from './CalendarView';

interface DayDetailProps {
  dateStr: string;
  items: CalendarItem[];
  onTaskToggle: () => void;
}

export default function DayDetail({ dateStr, items, onTaskToggle }: DayDetailProps) {
  const journalItem = items.find((item) => item.type === 'journal');
  const taskItems = items.filter((item) => item.type === 'task');

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: nextStatus }),
      });
      if (res.ok) {
        onTaskToggle();
      }
    } catch (e) {
      console.error('Failed to toggle task status:', e);
    }
  };

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderMarkdown = (text: string) => {
    try {
      return { __html: marked.parse(text) };
    } catch (e) {
      return { __html: text };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '2px' }}>{formattedDate}</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily logs summary</span>
      </div>

      {/* Task Checklist Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Checklist
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {taskItems.map((task) => {
            const isDone = task.status === 'done';
            return (
              <label
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  cursor: 'pointer',
                  background: 'var(--bg-secondary)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => handleToggleTask(task.id, task.status || 'todo')}
                  style={{ cursor: 'pointer' }}
                />
                <span>{task.title}</span>
              </label>
            );
          })}
          {taskItems.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', italic: 'true' } as React.CSSProperties}>
              No tasks scheduled for today.
            </span>
          )}
        </div>
      </div>

      {/* Everyday Journal Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
          Everyday Journal Note
        </h4>
        {journalItem && journalItem.content ? (
          <div 
            className="markdown-content" 
            dangerouslySetInnerHTML={renderMarkdown(journalItem.content)}
            style={{ fontSize: '0.85rem', overflowY: 'auto', maxHeight: '300px', padding: '0.5rem 0' }}
          />
        ) : (
          <div style={{ padding: '2rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px dashed var(--border-subtle)' }}>
            <span style={{ fontSize: '1.5rem' }}>📓</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              No Everyday Journal md file generated for this date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
