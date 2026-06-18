'use client';

import React, { useState } from 'react';

interface ModuleBuilderProps {
  onClose: () => void;
  onSave: (module: { name: string; icon: string; color: string; description: string; subfolders: string[] }) => void;
}

export default function ModuleBuilder({ onClose, onSave }: ModuleBuilderProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#38bdf8');
  const [description, setDescription] = useState('');
  const [subfolders, setSubfolders] = useState<string[]>([]);
  const [newSubfolder, setNewSubfolder] = useState('');

  const handleAddSubfolder = () => {
    if (newSubfolder.trim() && !subfolders.includes(newSubfolder.trim())) {
      setSubfolders((prev) => [...prev, newSubfolder.trim()]);
      setNewSubfolder('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      icon,
      color,
      description,
      subfolders
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3>Create Dynamic Module</h3>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Module Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Aqua Farm, Phone Business"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icon (Emoji)</label>
              <input 
                type="text" 
                value={icon} 
                onChange={(e) => setIcon(e.target.value)} 
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.25rem' }}
              />
            </div>
            <div className="form-group">
              <label>Accent Color</label>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="form-color-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What is the operational purpose of this module?"
              className="form-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Subfolder Structure inside Vault</label>
            <div className="subfolder-input-row">
              <input 
                type="text" 
                value={newSubfolder} 
                onChange={(e) => setNewSubfolder(e.target.value)} 
                placeholder="e.g. setup-logs, deals"
                className="form-input"
              />
              <button type="button" onClick={handleAddSubfolder} className="btn-secondary">Add</button>
            </div>
            {subfolders.length > 0 && (
              <div className="subfolders-tags">
                {subfolders.map((folder, idx) => (
                  <span key={idx} className="subfolder-tag">
                    {folder}
                    <button type="button" onClick={() => setSubfolders(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-text">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={!name.trim()}>Create Module</button>
        </div>
      </div>
    </div>
  );
}
