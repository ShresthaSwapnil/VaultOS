'use client';

import React, { useState, useEffect } from 'react';
import DayDetail from './DayDetail';

export interface CalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'task' | 'journal';
  title: string;
  status?: 'todo' | 'in-progress' | 'done';
  moduleId?: string;
  content?: string;
}

export default function CalendarView() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const fetchCalendarItems = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid = [];
  // Empty slots for padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysGrid.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(new Date(year, month, i));
  }

  const getItemsForDate = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    return items.filter((item) => item.date === formattedDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedDayItems = selectedDateStr 
    ? items.filter((item) => item.date === selectedDateStr)
    : [];

  return (
    <div className="calendar-view-container animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflowY: 'auto' }}>
      <div className="calendar-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <h2>Calendar & Planning</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Daily logs, Obsidian journals, and tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>◀</button>
          <span style={{ fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>▶</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexGrow: 1, minHeight: '450px' }}>
        {/* Calendar Grid */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(75px, 1fr)', gap: '4px', flexGrow: 1 }}>
            {daysGrid.map((day, idx) => {
              if (!day) return <div key={idx} style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-sm)' }}></div>;

              const dateStr = day.toISOString().split('T')[0];
              const dateItems = getItemsForDate(day);
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDateStr(dateStr)}
                  style={{
                    background: isSelected ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    border: isSelected 
                      ? '1px solid var(--accent-color)' 
                      : isToday 
                        ? '1px dashed var(--accent-color)' 
                        : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  className="calendar-day-cell"
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                    {day.getDate()}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    {dateItems.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        style={{
                          fontSize: '0.65rem',
                          background: item.type === 'journal' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: item.type === 'journal' ? 'var(--accent-purple)' : 'var(--accent-color)',
                          padding: '1px 3px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                        title={item.title}
                      >
                        <span>{item.type === 'journal' ? '📓' : '✓'}</span>
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem', overflowY: 'auto' }}>
          {selectedDateStr ? (
            <DayDetail
              dateStr={selectedDateStr}
              items={selectedDayItems}
              onTaskToggle={fetchCalendarItems}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</span>
              <p>Select a calendar day to see associated tasks, Obsidian logs, and daily execution briefs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
