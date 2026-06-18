'use client';

import React, { useState, useEffect } from 'react';

interface NoteEditorProps {
  relativePath: string;
  onClose: () => void;
  onSaveSuccess: () => void;
  onDeleteSuccess: () => void;
}

export default function NoteEditor({ relativePath, onClose, onSaveSuccess, onDeleteSuccess }: NoteEditorProps) {
  const [rawContent, setRawContent] = useState('');
  const [content, setContent] = useState('');
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({});
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaVal, setNewMetaVal] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const fileName = relativePath.split('/').slice(-1)[0];

  // Helper: parse simple YAML frontmatter and content from raw markdown
  const parseMarkdown = (rawText: string) => {
    const fm: Record<string, string> = {};
    let markdownBody = rawText;

    if (rawText.startsWith('---')) {
      const parts = rawText.split('---');
      if (parts.length >= 3) {
        const yaml = parts[1];
        markdownBody = parts.slice(2).join('---').trim();

        yaml.split('\n').forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const key = line.substring(0, colonIdx).trim();
            const value = line.substring(colonIdx + 1).trim();
            if (key) {
              fm[key] = value.replace(/^['"]|['"]$/g, ''); // strip outer quotes
            }
          }
        });
      }
    }
    return { fm, markdownBody };
  };

  // Helper: stringify frontmatter and content back to raw markdown
  const stringifyMarkdown = (body: string, fm: Record<string, string>) => {
    if (Object.keys(fm).length === 0) return body;
    let yaml = '---\n';
    for (const [key, val] of Object.entries(fm)) {
      yaml += `${key}: ${val}\n`;
    }
    yaml += '---\n';
    return yaml + body;
  };

  const loadNote = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vault?path=${encodeURIComponent(relativePath)}`);
      if (res.ok) {
        const text = await res.text();
        setRawContent(text);
        const { fm, markdownBody } = parseMarkdown(text);
        setFrontmatter(fm);
        setContent(markdownBody);
      } else {
        alert('Failed to load note contents.');
      }
    } catch (e) {
      console.error(e);
      alert('Error fetching note.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
  }, [relativePath]);

  const handleSave = async () => {
    setIsSaving(true);
    const fullMarkdown = stringifyMarkdown(content, frontmatter);
    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relativePath,
          content: fullMarkdown,
        }),
      });

      if (res.ok) {
        setRawContent(fullMarkdown);
        onSaveSuccess();
        alert('Note saved successfully.');
      } else {
        alert('Failed to save note changes.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${fileName}"?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath }),
      });

      if (res.ok) {
        onDeleteSuccess();
        onClose();
      } else {
        alert('Failed to delete note.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting note.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMeta = () => {
    if (!newMetaKey.trim()) return;
    setFrontmatter((prev) => ({
      ...prev,
      [newMetaKey.trim()]: newMetaVal.trim(),
    }));
    setNewMetaKey('');
    setNewMetaVal('');
  };

  const handleRemoveMeta = (key: string) => {
    setFrontmatter((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      {/* Editor Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8, 10, 16, 0.45)',
        backdropFilter: 'var(--glass-blur)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📄</span>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fileName}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{relativePath}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '2px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                background: activeTab === 'edit' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'edit' ? 'var(--accent-color)' : 'var(--text-secondary)'
              }}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                background: activeTab === 'preview' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'preview' ? 'var(--accent-color)' : 'var(--text-secondary)'
              }}
            >
              Preview
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="btn-primary"
            style={{
              background: 'var(--status-success)',
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 500
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--status-danger)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '0.5rem' }}>
          <span className="loading-spinner">⏳</span> Loading note contents...
        </div>
      ) : (
        /* Workspace Content Area */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flexGrow: 1, overflow: 'hidden' }}>
          
          {/* Left panel: Text Area / Preview */}
          <div style={{ height: '100%', overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-primary)' }}>
            {activeTab === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write markdown here..."
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: '1.5rem',
                  resize: 'none'
                }}
              />
            ) : (
              <div style={{ color: 'var(--text-primary)', lineHeight: '1.6rem', fontSize: '0.95rem' }} className="markdown-body">
                {content ? (
                  content.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) return <h1 key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>{line.replace('# ', '')}</h1>;
                    if (line.startsWith('## ')) return <h2 key={idx} style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{line.replace('## ', '')}</h2>;
                    if (line.startsWith('- ')) return <li key={idx} style={{ marginLeft: '1.5rem' }}>{line.replace('- ', '')}</li>;
                    if (line.trim() === '') return <br key={idx} />;
                    return <p key={idx} style={{ marginBottom: '0.75rem' }}>{line}</p>;
                  })
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No content yet.</span>
                )}
              </div>
            )}
          </div>

          {/* Right panel: Metadata/Frontmatter Manager */}
          <div style={{
            height: '100%',
            overflowY: 'auto',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'rgba(8, 10, 16, 0.25)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Note Metadata (Frontmatter)
            </h3>

            {/* Existing Keys */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(frontmatter).map(([key, val]) => (
                <div key={key} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '0.35rem',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--accent-color)' }}>
                    {key}
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const updatedValue = e.target.value;
                      setFrontmatter(prev => ({ ...prev, [key]: updatedValue }));
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem'
                    }}
                  />
                  <button
                    onClick={() => handleRemoveMeta(key)}
                    style={{
                      color: 'var(--status-danger)',
                      fontSize: '0.85rem',
                      padding: '0 4px',
                      cursor: 'pointer'
                    }}
                    title="Remove metadata field"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {Object.keys(frontmatter).length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No metadata keys defined.
                </span>
              )}
            </div>

            {/* Add New Key */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
              marginTop: '0.5rem'
            }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Add Custom Field</h4>
              <input
                type="text"
                placeholder="Key (e.g. status)"
                value={newMetaKey}
                onChange={(e) => setNewMetaKey(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '0.4rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem'
                }}
              />
              <input
                type="text"
                placeholder="Value (e.g. idea)"
                value={newMetaVal}
                onChange={(e) => setNewMetaVal(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '0.4rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem'
                }}
              />
              <button
                onClick={handleAddMeta}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                + Add Field
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
