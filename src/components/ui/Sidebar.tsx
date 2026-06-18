'use client';

import React, { useState, useEffect } from 'react';

export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  status: string;
}

interface SidebarProps {
  currentView: 'chat' | 'calendar' | 'automation' | 'editor' | string; // module ID is string
  onViewChange: (view: 'chat' | 'calendar' | 'automation' | 'editor' | string) => void;
  modules: ModuleConfig[];
  onAddModule: () => void;
  openClawStatus: 'online' | 'offline' | 'connecting';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeFile?: string | null;
  onFileSelect?: (filePath: string | null) => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  modules,
  onAddModule,
  openClawStatus,
  isCollapsed,
  onToggleCollapse,
  activeFile = null,
  onFileSelect,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Projects: false,
    Areas: false,
    Resources: false,
    Archives: false,
  });

  const [paraFiles, setParaFiles] = useState<Record<string, string[]>>({
    Projects: [],
    Areas: [],
    Resources: [],
    Archives: [],
  });

  const [addingToFolder, setAddingToFolder] = useState<string | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [movingFile, setMovingFile] = useState<string | null>(null);

  const folderNames = ['Projects', 'Areas', 'Resources', 'Archives'];
  const dirMap: Record<string, string> = {
    Projects: '01-Projects',
    Areas: '02-Areas',
    Resources: '03-Resources',
    Archives: '04-Archives',
  };

  // Curated theme colors for PARA
  const folderColors: Record<string, { accent: string; glow: string }> = {
    Projects: { accent: '#34d399', glow: 'rgba(52, 211, 153, 0.15)' }, // Emerald
    Areas: { accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.15)' },    // Sky Blue
    Resources: { accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.15)' }, // Amber
    Archives: { accent: '#94a3b8', glow: 'rgba(148, 163, 184, 0.15)' }, // Slate
  };

  // Determine if sidebar should render full expanded content
  const isCurrentlyCollapsed = isCollapsed && !isHovered;

  const loadFolderFiles = async (folder: string) => {
    const dir = dirMap[folder];
    try {
      const res = await fetch(`/api/vault?listDir=true&directory=${dir}`);
      if (res.ok) {
        const data = await res.json();
        const mdFiles = (data.files || []).filter(
          (f: string) => f.endsWith('.md') && !f.endsWith('_project-board.md')
        );
        setParaFiles((prev) => ({
          ...prev,
          [folder]: mdFiles,
        }));
      }
    } catch (e) {
      console.error('Failed to load files for', folder, e);
    }
  };

  const toggleFolder = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpandedState = !expandedFolders[folder];
    setExpandedFolders((prev) => ({
      ...prev,
      [folder]: newExpandedState,
    }));
    if (newExpandedState) {
      loadFolderFiles(folder);
    }
  };

  const handleAddIdea = async (folder: string) => {
    if (!newIdeaTitle.trim()) return;

    const title = newIdeaTitle.trim();
    const cleanTitle = title.endsWith('.md') ? title : `${title}.md`;
    const relativePath = `${dirMap[folder]}/${cleanTitle}`;

    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relativePath,
          content: `# ${title}\n\nWrite your thoughts, logs, or ideas here.`,
          frontmatter: {
            title,
            created_at: new Date().toISOString(),
            category: folder,
          },
        }),
      });

      if (res.ok) {
        setNewIdeaTitle('');
        setAddingToFolder(null);
        await loadFolderFiles(folder);
        
        if (onFileSelect) {
          onFileSelect(relativePath);
          onViewChange('editor');
        }
      } else {
        alert('Failed to add new idea.');
      }
    } catch (e) {
      console.error(e);
      alert('Error adding new idea.');
    }
  };

  const handleMoveIdea = async (file: string, sourceFolder: string, targetFolder: string) => {
    const fileName = file.split('/').slice(-1)[0];
    const newRelativePath = `${dirMap[targetFolder]}/${fileName}`;

    try {
      const res = await fetch('/api/vault', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldRelativePath: file,
          newRelativePath,
        }),
      });

      if (res.ok) {
        setMovingFile(null);
        await loadFolderFiles(sourceFolder);
        await loadFolderFiles(targetFolder);
        
        if (activeFile === file && onFileSelect) {
          onFileSelect(newRelativePath);
        }
      } else {
        alert('Failed to move idea.');
      }
    } catch (e) {
      console.error(e);
      alert('Error moving idea.');
    }
  };

  const handleRemoveIdea = async (file: string, folder: string) => {
    const fileName = file.split('/').slice(-1)[0];
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const res = await fetch('/api/vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath: file }),
      });

      if (res.ok) {
        await loadFolderFiles(folder);
        if (activeFile === file && onFileSelect) {
          onFileSelect(null);
          onViewChange('chat');
        }
      } else {
        alert('Failed to delete idea.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting idea.');
    }
  };

  useEffect(() => {
    if (!isCurrentlyCollapsed) {
      folderNames.forEach((folder) => {
        if (expandedFolders[folder]) {
          loadFolderFiles(folder);
        }
      });
    }
  }, [isCurrentlyCollapsed]);

  // Sidebar dynamic container inline styles
  const sidebarStyles: React.CSSProperties = {
    position: (isCollapsed && isHovered) ? 'absolute' : 'relative',
    zIndex: (isCollapsed && isHovered) ? 1000 : 10,
    width: isCurrentlyCollapsed ? '68px' : '260px',
    height: '100%',
    top: 0,
    left: 0,
    boxShadow: (isCollapsed && isHovered) ? '10px 0 40px rgba(0, 0, 0, 0.75)' : 'none',
    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease',
    background: 'linear-gradient(180deg, rgba(7, 9, 14, 0.98) 0%, rgba(5, 7, 11, 0.99) 100%)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <aside 
      className={`sidebar-panel ${isCurrentlyCollapsed ? 'collapsed' : ''}`} 
      style={sidebarStyles}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => {
        if (isCollapsed) {
          setIsHovered(false);
          setAddingToFolder(null);
          setMovingFile(null);
        }
      }}
    >
      {/* Header section */}
      <div className="sidebar-header" style={{ padding: isCurrentlyCollapsed ? '1.25rem 0.5rem' : '1.25rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ fontSize: '1.4rem' }}>🪐</span>
            {isCurrentlyCollapsed && (
              <span 
                className={`status-badge-dot ${openClawStatus}`} 
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: openClawStatus === 'online' ? 'var(--status-success)' : openClawStatus === 'connecting' ? 'var(--status-warning)' : 'var(--status-danger)',
                }}
              ></span>
            )}
          </div>
          {!isCurrentlyCollapsed && <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff 0%, var(--accent-color) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VaultOS</span>}
        </div>

        {!isCurrentlyCollapsed && (
          <div className="status-indicator-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span className={`status-dot ${openClawStatus}`} style={{ width: '5px', height: '5px' }}></span>
            <span className="status-label" style={{ fontSize: '0.55rem' }}>
              {openClawStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation and Content List */}
      <nav className="sidebar-nav" style={{ flexGrow: 1, overflowY: 'auto', padding: isCurrentlyCollapsed ? '0.75rem 0.35rem' : '1rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Workspace section */}
        <div className="nav-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {!isCurrentlyCollapsed && <span className="section-title" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.35rem', display: 'block', paddingLeft: '0.4rem' }}>Workspace</span>}
          <button
            onClick={() => onViewChange('chat')}
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
            title={isCurrentlyCollapsed ? 'Command Chat' : undefined}
            style={{ padding: isCurrentlyCollapsed ? '0.6rem 0' : '0.55rem 0.65rem', justifyContent: isCurrentlyCollapsed ? 'center' : 'flex-start', borderRadius: '8px' }}
          >
            <span className="nav-icon" style={{ fontSize: '1.05rem', display: 'flex', justifyContent: 'center', width: isCurrentlyCollapsed ? '100%' : 'auto' }}>💬</span>
            {!isCurrentlyCollapsed && <span className="nav-label" style={{ fontSize: '0.8rem' }}>Command Chat</span>}
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
            title={isCurrentlyCollapsed ? 'Calendar & Tasks' : undefined}
            style={{ padding: isCurrentlyCollapsed ? '0.6rem 0' : '0.55rem 0.65rem', justifyContent: isCurrentlyCollapsed ? 'center' : 'flex-start', borderRadius: '8px' }}
          >
            <span className="nav-icon" style={{ fontSize: '1.05rem', display: 'flex', justifyContent: 'center', width: isCurrentlyCollapsed ? '100%' : 'auto' }}>📅</span>
            {!isCurrentlyCollapsed && <span className="nav-label" style={{ fontSize: '0.8rem' }}>Calendar & Tasks</span>}
          </button>
          <button
            onClick={() => onViewChange('automation')}
            className={`nav-item ${currentView === 'automation' ? 'active' : ''}`}
            title={isCurrentlyCollapsed ? 'n8n Automation' : undefined}
            style={{ padding: isCurrentlyCollapsed ? '0.6rem 0' : '0.55rem 0.65rem', justifyContent: isCurrentlyCollapsed ? 'center' : 'flex-start', borderRadius: '8px' }}
          >
            <span className="nav-icon" style={{ fontSize: '1.05rem', display: 'flex', justifyContent: 'center', width: isCurrentlyCollapsed ? '100%' : 'auto' }}>⚡</span>
            {!isCurrentlyCollapsed && <span className="nav-label" style={{ fontSize: '0.8rem' }}>n8n Automation</span>}
          </button>
        </div>

        {/* PARA Vault Folders Explorer */}
        <div className="nav-section" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
          {isCurrentlyCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', paddingTop: '0.25rem' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', cursor: 'pointer' }} title="PARA Folders" onClick={() => setIsHovered(true)}>📁</span>
            </div>
          ) : (
            <div>
              <span className="section-title" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.45rem', display: 'block', paddingLeft: '0.4rem' }}>PARA Vault</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {folderNames.map((folder) => {
                  const colorsInfo = folderColors[folder];
                  return (
                    <div key={folder} style={{ display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Folder Item Row */}
                      <div 
                        onClick={(e) => toggleFolder(folder, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.45rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: expandedFolders[folder] ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderLeft: `2px solid ${colorsInfo.accent}`,
                          marginBottom: '2px',
                          transition: 'background 0.2s ease',
                        }}
                        className="quick-action-btn"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.8rem' }}>{expandedFolders[folder] ? '📂' : '📁'}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: expandedFolders[folder] ? 600 : 500, color: 'var(--text-primary)' }}>
                            {folder}
                          </span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingToFolder(addingToFolder === folder ? null : folder);
                            setNewIdeaTitle('');
                          }}
                          style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title={`Add to ${folder}`}
                        >
                          +
                        </button>
                      </div>

                      {/* Add Inline Input */}
                      {addingToFolder === folder && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          margin: '2px 0 4px 6px'
                        }}>
                          <input
                            type="text"
                            placeholder="Title..."
                            value={newIdeaTitle}
                            onChange={(e) => setNewIdeaTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddIdea(folder);
                            }}
                            autoFocus
                            style={{
                              flexGrow: 1,
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--text-primary)',
                              fontSize: '0.7rem',
                            }}
                          />
                          <button onClick={() => handleAddIdea(folder)} style={{ color: 'var(--status-success)', fontSize: '0.7rem', fontWeight: 600 }}>✓</button>
                          <button onClick={() => setAddingToFolder(null)} style={{ color: 'var(--status-danger)', fontSize: '0.7rem' }}>✕</button>
                        </div>
                      )}

                      {/* Expanded Sub-files list */}
                      {expandedFolders[folder] && (
                        <div style={{
                          paddingLeft: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px',
                          borderLeft: '1px solid rgba(255,255,255,0.03)',
                          margin: '1px 0 4px 8px'
                        }}>
                          {paraFiles[folder].map((file) => {
                            const baseName = file.split('/').slice(-1)[0].replace('.md', '');
                            const isActive = activeFile === file;

                            return (
                              <div
                                key={file}
                                onClick={() => {
                                  if (onFileSelect) {
                                    onFileSelect(file);
                                    onViewChange('editor');
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.25rem 0.35rem',
                                  borderRadius: '4px',
                                  background: isActive ? `${colorsInfo.accent}15` : 'transparent',
                                  color: isActive ? colorsInfo.accent : 'var(--text-secondary)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  position: 'relative',
                                }}
                              >
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={baseName}>
                                  📄 {baseName}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setMovingFile(movingFile === file ? null : file)}
                                    style={{ color: 'var(--text-muted)', fontSize: '0.7rem', opacity: 0.6 }}
                                    title="Move category"
                                  >
                                    ✥
                                  </button>
                                  <button
                                    onClick={() => handleRemoveIdea(file, folder)}
                                    style={{ color: 'rgba(239, 68, 68, 0.5)', fontSize: '0.7rem' }}
                                    title="Remove note"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Move Target Dropdown overlay */}
                                {movingFile === file && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: '4px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    boxShadow: 'var(--shadow-glass)',
                                    zIndex: 500,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '110px',
                                    padding: '2px 0'
                                  }}>
                                    {folderNames.filter((f) => f !== folder).map((target) => (
                                      <button
                                        key={target}
                                        onClick={() => handleMoveIdea(file, folder, target)}
                                        style={{
                                          padding: '3px 6px',
                                          fontSize: '0.65rem',
                                          color: 'var(--text-primary)',
                                          textAlign: 'left',
                                          width: '100%',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Move to {target}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {paraFiles[folder].length === 0 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 4px' }}>
                              Empty
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Modules section */}
        <div className="nav-section" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
          {isCurrentlyCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>🔌</span>
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => onViewChange(mod.id)}
                  title={mod.name}
                  style={{
                    fontSize: '1.1rem',
                    background: 'transparent',
                    cursor: 'pointer',
                    opacity: currentView === mod.id ? 1 : 0.6,
                    color: mod.color
                  }}
                >
                  {mod.icon}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className="section-title-row" style={{ padding: '0 0.4rem', marginBottom: '0.35rem' }}>
                <span className="section-title" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Modules</span>
                <button onClick={onAddModule} className="add-module-btn" style={{ width: '16px', height: '16px', fontSize: '0.75rem' }}>
                  +
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => onViewChange(mod.id)}
                    className={`nav-item ${currentView === mod.id ? 'active' : ''}`}
                    style={{
                      '--accent-color': mod.color,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem'
                    } as React.CSSProperties}
                  >
                    <span className="nav-icon" style={{ fontSize: '0.95rem' }}>{mod.icon}</span>
                    <span className="nav-label">{mod.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer Profile */}
      <div className="sidebar-footer" style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(5, 7, 11, 0.4)' }}>
        {!isCurrentlyCollapsed ? (
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem', background: 'var(--accent-glow)', color: 'var(--accent-color)', border: '1px solid var(--border-glow)' }}>L</div>
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="user-name" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Luccy</span>
              <span className="user-role" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>OS Operator</span>
            </div>
          </div>
        ) : (
          <div className="user-profile collapsed-profile" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem', background: 'var(--accent-glow)', color: 'var(--accent-color)' }}>L</div>
          </div>
        )}
      </div>

      {/* Collapse Action Toggle Chevron */}
      <button
        className="sidebar-collapse-toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        style={{
          opacity: isHovered ? 1 : 0,
          right: '-7px',
          width: '14px',
          height: '34px',
        }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={`collapse-chevron ${isCollapsed ? 'flipped' : ''}`}>
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </aside>
  );
}
