'use client';

import React, { useState, useEffect } from 'react';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date?: string;
  module_id?: string;
  created_at: string;
}

interface ProjectBoardProps {
  moduleId: string;
  accentColor: string;
}

export default function ProjectBoard({ moduleId, accentColor }: ProjectBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.tasks || []).filter((t: Task) => t.module_id === moduleId);
        setTasks(filtered);
      }
    } catch (e) {
      console.error('Failed to load board tasks:', e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [moduleId]);

  const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          dueDate: newTaskDueDate || undefined,
          moduleId,
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Divide tasks into visual quadrants
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  
  // Future Planning tasks: tasks with due dates farther than 3 days or tagged future
  const futureTasks = todoTasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = Date.parse(t.due_date) - Date.now();
    return diff > 3 * 24 * 60 * 60 * 1000; // > 3 days
  });

  const activeTodoTasks = todoTasks.filter((t) => !futureTasks.includes(t));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
      
      {/* Inline Quick Task Creator */}
      <form onSubmit={handleCreateTask} className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Log a new task / plan..."
          style={{ flexGrow: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '0.45rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}
        />
        <input
          type="date"
          value={newTaskDueDate}
          onChange={(e) => setNewTaskDueDate(e.target.value)}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '0.45rem 1rem', background: accentColor }}
          disabled={isSubmitting || !newTaskTitle.trim()}
        >
          Add Item
        </button>
      </form>

      {/* Four-Quadrant Kanban Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        
        {/* Quadrant 1: What Needs to Be Done (Todo) */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: `2px solid ${accentColor}44`, paddingBottom: '0.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>What Needs to Be Done</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeTodoTasks.length} items</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '180px' }}>
            {activeTodoTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.45rem 0.65rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem' }}>{t.title}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleUpdateStatus(t.id, 'in-progress')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '3px' }}>⚡ Start</button>
                  <button onClick={() => handleUpdateStatus(t.id, 'done')} style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '2px 5px', borderRadius: '3px' }}>✓ Done</button>
                </div>
              </div>
            ))}
            {activeTodoTasks.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>All caught up!</span>}
          </div>
        </div>

        {/* Quadrant 2: What's Going On (Active) */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '2px solid var(--accent-purple)44', paddingBottom: '0.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>What's Going On</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inProgressTasks.length} active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '180px' }}>
            {inProgressTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.45rem 0.65rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem' }}>{t.title}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleUpdateStatus(t.id, 'todo')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '3px' }}>↺ Pause</button>
                  <button onClick={() => handleUpdateStatus(t.id, 'done')} style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '2px 5px', borderRadius: '3px' }}>✓ Done</button>
                </div>
              </div>
            ))}
            {inProgressTasks.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No active focus items.</span>}
          </div>
        </div>

        {/* Quadrant 3: What's Done (History) */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '2px solid var(--status-success)44', paddingBottom: '0.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>What's Done</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doneTasks.length} completed</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '180px' }}>
            {doneTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.45rem 0.65rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)', opacity: 0.7 }}>
                <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{t.title}</span>
                <button onClick={() => handleUpdateStatus(t.id, 'todo')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '3px' }}>Re-open</button>
              </div>
            ))}
            {doneTasks.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No completed tasks logged yet.</span>}
          </div>
        </div>

        {/* Quadrant 4: Future Planning */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '2px solid var(--accent-amber)44', paddingBottom: '0.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Future Planning / Milestones</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{futureTasks.length} scheduled</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '180px' }}>
            {futureTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.45rem 0.65rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem' }}>{t.title}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Due: {t.due_date}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleUpdateStatus(t.id, 'todo')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '3px' }}>Bring to Todo</button>
                </div>
              </div>
            ))}
            {futureTasks.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No future milestones logged.</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
