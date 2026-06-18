'use client';

import React, { useState, useRef } from 'react';

export interface Attachment {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  rawFile: File;
}

interface UniversalUploadProps {
  onUploadComplete: (attachments: Attachment[], description: string) => void;
  isRouting: boolean;
}

export default function UniversalUpload({ onUploadComplete, isRouting }: UniversalUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFiles = (files: FileList) => {
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : undefined;

      newAttachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl,
        rawFile: file,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      if (updated[index].previewUrl) {
        URL.revokeObjectURL(updated[index].previewUrl!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attachments.length === 0 && !description.trim()) return;
    onUploadComplete(attachments, description);
    setAttachments([]);
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="upload-container">
      <div
        className={`drag-drop-zone ${isDragOver ? 'drag-over' : ''} ${attachments.length > 0 ? 'has-files' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden-file-input"
          style={{ display: 'none' }}
        />
        
        {attachments.length === 0 ? (
          <div className="upload-prompt">
            <span className="upload-icon">📁</span>
            <p className="upload-text">Drag files here or click to browse</p>
            <span className="upload-subtext">Accepts photos, videos, PDFs, text files</span>
          </div>
        ) : (
          <div className="previews-grid" onClick={(e) => e.stopPropagation()}>
            {attachments.map((file, idx) => (
              <div key={idx} className="preview-card">
                {file.type.startsWith('image/') && file.previewUrl ? (
                  <img src={file.previewUrl} alt={file.name} className="preview-image" />
                ) : file.type.startsWith('video/') && file.previewUrl ? (
                  <div className="video-preview-wrapper">
                    <video src={file.previewUrl} className="preview-video" muted />
                    <span className="video-badge">▶</span>
                  </div>
                ) : (
                  <div className="doc-preview">
                    <span className="doc-icon">📄</span>
                    <span className="doc-name">{file.name.slice(0, 15)}...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="remove-preview-btn"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-more-previews-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              + Add
            </button>
          </div>
        )}
      </div>

      <div className="upload-footer-row">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            attachments.length > 0
              ? 'Add a quick description or action note for these files...'
              : 'Message OpenClaw or paste content to route...'
          }
          className="upload-textarea"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="upload-submit-btn"
          disabled={isRouting || (attachments.length === 0 && !description.trim())}
        >
          {isRouting ? (
            <span className="spinner-loader"></span>
          ) : (
            <span className="submit-icon">🚀</span>
          )}
        </button>
      </div>
    </form>
  );
}
