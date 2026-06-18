'use client';

import React, { useState, useEffect } from 'react';
import { ModuleConfig } from '../ui/Sidebar';
import ProjectBoard from './ProjectBoard';

interface ModuleRendererProps {
  moduleId: string;
  moduleConfig: ModuleConfig;
}

export default function ModuleRenderer({ moduleId, moduleConfig }: ModuleRendererProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [logText, setLogText] = useState('');
  const [logSubfolder, setLogSubfolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subfolders = (moduleConfig as any).subfolders || ['setup-logs', 'tasks', 'planning'];

  const fetchRecentFiles = async () => {
    try {
      const res = await fetch(`/api/vault?listDir=true&directory=01-Projects/${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.error('Failed to load module files:', e);
    }
  };

  useEffect(() => {
    fetchRecentFiles();
    // Default log subfolder to first subfolder
    if (subfolders.length > 0) {
      setLogSubfolder(subfolders[0]);
    }
  }, [moduleId]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logText.trim() || !logSubfolder) return;

    setIsSubmitting(true);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const noteTitle = `Log_${timestamp.split('T')[0]}_${Math.random().toString(36).substring(2, 6)}`;
    const relativePath = `01-Projects/${moduleId}/${logSubfolder}/${noteTitle}.md`;

    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relativePath,
          content: logText.trim(),
          frontmatter: {
            title: `Log Entry — ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString().split('T')[0],
            module: moduleId,
            category: 'Projects',
            type: 'activity-log',
          },
        }),
      });

      if (res.ok) {
        setLogText('');
        fetchRecentFiles();
        alert('Log written to Obsidian vault successfully!');
      } else {
        alert('Failed to save log.');
      }
    } catch (e) {
      console.error(e);
      alert('Error writing vault file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto' }}>
      
      {/* Module Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>{moduleConfig.icon}</span>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{moduleConfig.name} Module</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{moduleConfig.description}</p>
          </div>
        </div>
        <span className="source-badge" style={{ background: `${moduleConfig.color}22`, color: moduleConfig.color, border: `1px solid ${moduleConfig.color}44`, padding: '4px 8px' }}>
          Active Module
        </span>
      </div>

      {/* Main Grid: Project Board & Logging Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Side: Four-Quadrant Kanban Project Board */}
        <div>
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>Project Board</h3>
          <ProjectBoard moduleId={moduleId} accentColor={moduleConfig.color} />
        </div>

        {/* Right Side: Quick Logs & Files list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quick Log Form */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Log Activity
            </h4>
            <form onSubmit={handleCreateLog} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                value={logSubfolder}
                onChange={(e) => setLogSubfolder(e.target.value)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '0.4rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                {subfolders.map((folder: string) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Log activity details..."
                rows={3}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem', resize: 'none' }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ background: moduleConfig.color, padding: '0.45rem' }}
                disabled={isSubmitting || !logText.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Write Log'}
              </button>
            </form>
          </div>

          {/* Module Notes File Feed */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Recent Vault Notes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
              {files.map((file, idx) => (
                <a
                  key={idx}
                  href={`/api/vault?path=${encodeURIComponent(file)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.4rem 0.55rem',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                  className="quick-action-btn"
                >
                  📄 {file.split('/').slice(-1)[0]}
                </a>
              ))}
              {files.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No files routed here yet.
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
