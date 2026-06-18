'use client';

import React, { useState, useEffect } from 'react';
import Sidebar, { ModuleConfig } from '../components/ui/Sidebar';
import ChatInterface from '../components/chat/ChatInterface';
import SystemDashboard from '../components/dashboard/SystemDashboard';
import CalendarView from '../components/calendar/CalendarView';
import ModuleRenderer from '../components/modules/ModuleRenderer';
import ModuleBuilder from '../components/modules/ModuleBuilder';
import NoteEditor from '../components/ui/NoteEditor';

export default function Home() {
  const [currentView, setCurrentView] = useState<'chat' | 'calendar' | 'automation' | string>('chat');
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [showModuleBuilder, setShowModuleBuilder] = useState(false);
  const [openClawStatus, setOpenClawStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');
  const [n8nStatus, setN8NStatus] = useState<'online' | 'offline'>('offline');
  const [sidecarStatus, setSidecarStatus] = useState<'online' | 'offline'>('offline');
  const [vaultPath, setVaultPath] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Initialize status indicators and config details
  const fetchStatusAndConfig = async () => {
    try {
      // 1. Check OpenClaw Status
      const clawRes = await fetch('/api/chat?health=true');
      if (clawRes.ok) {
        const data = await clawRes.json();
        setOpenClawStatus(data.status === 'online' ? 'online' : 'offline');
      } else {
        setOpenClawStatus('offline');
      }
    } catch (e) {
      setOpenClawStatus('offline');
    }

    try {
      // 2. Check n8n Status
      const n8nRes = await fetch('/api/automation?health=true');
      if (n8nRes.ok) {
        const data = await n8nRes.json();
        setN8NStatus(data.status === 'online' ? 'online' : 'offline');
      } else {
        setN8NStatus('offline');
      }
    } catch (e) {
      setN8NStatus('offline');
    }

    try {
      // 2b. Check Python Sidecar Status
      const sidecarRes = await fetch('http://127.0.0.1:8001/health');
      if (sidecarRes.ok) {
        const data = await sidecarRes.json();
        setSidecarStatus(data.status === 'online' ? 'online' : 'offline');
      } else {
        setSidecarStatus('offline');
      }
    } catch (e) {
      setSidecarStatus('offline');
    }

    try {
      // 3. Load general configurations & modules
      const configRes = await fetch('/api/vault?config=true');
      if (configRes.ok) {
        const data = await configRes.json();
        setVaultPath(data.vaultPath || '');
        setModules(data.modules || []);
      }
    } catch (e) {
      console.error('Failed to load initial configs:', e);
    }
  };

  useEffect(() => {
    fetchStatusAndConfig();
    // Poll checks every 15 seconds
    const interval = setInterval(fetchStatusAndConfig, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAddModule = (newModuleData: {
    name: string;
    icon: string;
    color: string;
    description: string;
    subfolders: string[];
  }) => {
    // Save module configurations to backend
    fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModuleData),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to create module');
      })
      .then((data) => {
        setModules((prev) => [...prev, data.module]);
        setShowModuleBuilder(false);
        setCurrentView(data.module.id);
      })
      .catch((err) => {
        console.error('Error creating module:', err);
        alert('Could not save the new module inside vault.');
      });
  };

  // Compute grid template based on collapse states
  const getGridColumns = () => {
    const left = leftCollapsed ? '68px' : '240px';
    const right = rightCollapsed ? '48px' : '340px';
    return `${left} 1fr ${right}`;
  };

  // Render main viewport dynamically based on sidebar navigation
  const renderCenterView = () => {
    if (currentView === 'chat') {
      return (
        <ChatInterface
          activeConversationId={activeConversationId}
          onNewMessage={fetchStatusAndConfig}
        />
      );
    }
    if (currentView === 'calendar') {
      return <CalendarView />;
    }
    if (currentView === 'automation') {
      return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <h2>n8n Automation Engine</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Trigger and monitor workflows from here.</p>
          <iframe
            src="http://localhost:5678"
            style={{ width: '100%', height: '100%', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-secondary)' }}
            title="n8n Panel"
          />
        </div>
      );
    }
    
    // Check note editor view
    if (currentView === 'editor' && activeFile) {
      return (
        <NoteEditor
          relativePath={activeFile}
          onClose={() => {
            setCurrentView('chat');
            setActiveFile(null);
          }}
          onSaveSuccess={() => {
            fetchStatusAndConfig();
          }}
          onDeleteSuccess={() => {
            setCurrentView('chat');
            setActiveFile(null);
            fetchStatusAndConfig();
          }}
        />
      );
    }
    
    // Check dynamic modules
    const activeModule = modules.find((m) => m.id === currentView);
    if (activeModule) {
      return <ModuleRenderer moduleId={activeModule.id} moduleConfig={activeModule} />;
    }

    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>View not found</h3>
      </div>
    );
  };

  return (
    <div className="app-container" style={{ gridTemplateColumns: getGridColumns(), position: 'relative' }}>
      {/* Left Sidebar Slot Wrapper */}
      <div style={{ width: leftCollapsed ? '68px' : '240px', height: '100%', position: 'relative', transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          modules={modules}
          onAddModule={() => setShowModuleBuilder(true)}
          openClawStatus={openClawStatus}
          isCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((prev) => !prev)}
          activeFile={activeFile}
          onFileSelect={setActiveFile}
        />
      </div>

      <main className="center-viewport flex flex-col" style={{ overflowY: 'auto', borderRight: '1px solid var(--border-subtle)' }}>
        {renderCenterView()}
      </main>

      {/* Right Sidebar Slot Wrapper */}
      <div style={{ width: rightCollapsed ? '48px' : '340px', height: '100%', position: 'relative', transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <SystemDashboard
          n8nStatus={n8nStatus}
          openClawStatus={openClawStatus}
          sidecarStatus={sidecarStatus}
          vaultPath={vaultPath}
          isCollapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed((prev) => !prev)}
        />
      </div>

      {showModuleBuilder && (
        <ModuleBuilder
          onClose={() => setShowModuleBuilder(false)}
          onSave={(moduleData) => handleAddModule(moduleData)}
        />
      )}
    </div>
  );
}
