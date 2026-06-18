'use client';

import React, { useState, useEffect } from 'react';

export interface FileRouteLog {
  id: string;
  filename: string;
  category: string;
  routed_path: string;
  created_at: string;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

interface SystemDashboardProps {
  n8nStatus: 'online' | 'offline';
  openClawStatus: 'online' | 'offline' | 'connecting';
  sidecarStatus: 'online' | 'offline';
  vaultPath: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SystemDashboard({
  n8nStatus,
  openClawStatus,
  sidecarStatus,
  vaultPath,
  isCollapsed,
  onToggleCollapse,
}: SystemDashboardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [routes, setRoutes] = useState<FileRouteLog[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/vault?dashboard=true');
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerN8NWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      });
      if (res.ok) {
        alert('Automation workflow triggered successfully!');
      } else {
        alert('Failed to trigger workflow. Ensure n8n is running.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isCurrentlyCollapsed = isCollapsed && !isHovered;

  const containerStyle: React.CSSProperties = {
    position: (isCollapsed && isHovered) ? 'absolute' : 'relative',
    zIndex: (isCollapsed && isHovered) ? 1000 : 10,
    width: isCurrentlyCollapsed ? '48px' : '340px',
    height: '100%',
    top: 0,
    right: 0,
    boxShadow: (isCollapsed && isHovered) ? '-10px 0 40px rgba(0, 0, 0, 0.75)' : 'none',
    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease',
    background: 'linear-gradient(180deg, rgba(7, 9, 14, 0.98) 0%, rgba(5, 7, 11, 0.99) 100%)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <aside
      className={`dashboard-panel ${isCurrentlyCollapsed ? 'collapsed' : ''}`}
      style={containerStyle}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => {
        if (isCollapsed) {
          setIsHovered(false);
        }
      }}
    >
      {/* Collapse Action Toggle Chevron */}
      <button
        className="dashboard-collapse-toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        style={{
          opacity: isHovered ? 1 : 0,
          left: '-7px',
          width: '14px',
          height: '34px',
          zIndex: 60,
        }}
        title={isCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={`collapse-chevron ${isCollapsed ? 'flipped' : ''}`}>
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isCurrentlyCollapsed ? (
        /* Collapsed View: Vertical health badges */
        <div className="collapsed-dashboard-icons" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', paddingTop: '1.5rem', width: '100%' }}>
          <div 
            className={`collapsed-status-card ${openClawStatus}`} 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              background: openClawStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : openClawStatus === 'connecting' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: openClawStatus === 'online' ? 'var(--status-success)' : openClawStatus === 'connecting' ? 'var(--status-warning)' : 'var(--status-danger)',
              border: `1px solid ${openClawStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : openClawStatus === 'connecting' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
            title={`OpenClaw: ${openClawStatus}`}
          >
            OC
          </div>
          <div 
            className={`collapsed-status-card ${n8nStatus}`} 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              background: n8nStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: n8nStatus === 'online' ? 'var(--status-success)' : 'var(--status-danger)',
              border: `1px solid ${n8nStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
            title={`n8n Engine: ${n8nStatus}`}
          >
            N8
          </div>
          <div 
            className={`collapsed-status-card ${sidecarStatus}`} 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              background: sidecarStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: sidecarStatus === 'online' ? 'var(--status-success)' : 'var(--status-danger)',
              border: `1px solid ${sidecarStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
            title={`Python Sidecar: ${sidecarStatus}`}
          >
            SC
          </div>
        </div>
      ) : (
        /* Full Expanded Dashboard View */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 1rem', gap: '1.25rem' }}>
          <div className="dashboard-section">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>System Health</h3>
            <div className="health-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div className="health-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="health-title" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>OpenClaw</span>
                <span className={`health-status ${openClawStatus}`} style={{ fontSize: '0.65rem', fontWeight: 600, color: openClawStatus === 'online' ? 'var(--status-success)' : openClawStatus === 'connecting' ? 'var(--status-warning)' : 'var(--status-danger)' }}>
                  {openClawStatus === 'online' ? '● Online' : openClawStatus === 'connecting' ? '● Connecting' : '○ Offline'}
                </span>
              </div>
              <div className="health-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="health-title" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>n8n Engine</span>
                <span className={`health-status ${n8nStatus}`} style={{ fontSize: '0.65rem', fontWeight: 600, color: n8nStatus === 'online' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                  {n8nStatus === 'online' ? '● Online' : '○ Offline'}
                </span>
              </div>
              <div className="health-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span className="health-title" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Sidecar</span>
                <span className={`health-status ${sidecarStatus}`} style={{ fontSize: '0.65rem', fontWeight: 600, color: sidecarStatus === 'online' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                  {sidecarStatus === 'online' ? '● Online' : '○ Offline'}
                </span>
              </div>
            </div>
            <div className="vault-path-card" style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="card-label" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Obsidian Vault Path</span>
              <span className="card-value" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={vaultPath}>{vaultPath}</span>
            </div>
          </div>

          <div className="dashboard-section grow flex flex-col" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Recent File Routes</h3>
            <div className="routes-list grow" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px' }}>
              {routes.map((route) => (
                <div key={route.id} className="route-item" style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className="route-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="route-file" style={{ fontSize: '0.75rem', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.filename}</span>
                    <span className={`category-badge ${route.category.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }}>
                      {route.category}
                    </span>
                  </div>
                  <span className="route-path" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.routed_path}</span>
                  <span className="route-time" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                    {new Date(route.created_at).toLocaleDateString()} at{' '}
                    {new Date(route.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {routes.length === 0 && (
                <span className="empty-placeholder" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No files routed yet.</span>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>n8n Quick Workflows</h3>
            <div className="quick-actions-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button onClick={() => triggerN8NWorkflow('sync-market')} className="quick-action-btn" style={{ padding: '0.45rem', fontSize: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                🔄 Sync Market Prices
              </button>
              <button onClick={() => triggerN8NWorkflow('backup-vault')} className="quick-action-btn" style={{ padding: '0.45rem', fontSize: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                💾 Backup Obsidian Vault
              </button>
            </div>
          </div>

          <div className="dashboard-section flex-col" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: '0.35rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Event Log</h3>
            <div className="events-log" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px' }}>
              {events.map((evt) => (
                <div key={evt.id} className="event-item" style={{ fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="event-type" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>[{evt.event_type}]</span>
                    <span className="event-time" style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <span className="event-desc" style={{ color: 'var(--text-secondary)' }}>{evt.description}</span>
                </div>
              ))}
              {events.length === 0 && (
                <span className="empty-placeholder" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No events logged today.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
