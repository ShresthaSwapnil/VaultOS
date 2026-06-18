'use client';

import React from 'react';
import { marked } from 'marked';

export interface ChatAttachment {
  name: string;
  type: string;
  path: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'web' | 'telegram';
  attachments?: ChatAttachment[];
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  onRouteFile?: (attachment: ChatAttachment) => void;
}

export default function MessageBubble({ message, onRouteFile }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  // Custom markdown parser settings for marked
  const renderMarkdown = (text: string) => {
    try {
      return { __html: marked.parse(text) };
    } catch (e) {
      return { __html: text };
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'} animate-fade-in`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🪐'}
      </div>
      <div className="message-bubble-wrapper">
        <div className="message-metadata">
          <span className="sender-name">{isUser ? 'You' : 'OpenClaw'}</span>
          {message.source === 'telegram' && (
            <span className="source-badge telegram" title="Sent via Telegram Bot">Telegram</span>
          )}
          <span className="message-time">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="message-bubble">
          {message.content && (
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={renderMarkdown(message.content)}
            />
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((file, idx) => {
                const isImg = file.type.startsWith('image/');
                const isVid = file.type.startsWith('video/');
                
                return (
                  <div key={idx} className="message-attachment-item">
                    {isImg ? (
                      <div className="attachment-image-wrapper">
                        <img src={`/api/vault?path=${encodeURIComponent(file.path)}`} alt={file.name} className="attachment-img" />
                      </div>
                    ) : isVid ? (
                      <div className="attachment-video-wrapper">
                        <video src={`/api/vault?path=${encodeURIComponent(file.path)}`} className="attachment-vid" controls />
                      </div>
                    ) : (
                      <div className="attachment-doc-wrapper">
                        <span className="doc-icon">📄</span>
                        <span className="doc-title">{file.name}</span>
                      </div>
                    )}
                    
                    {onRouteFile && (
                      <button 
                        type="button" 
                        className="route-btn" 
                        onClick={() => onRouteFile(file)}
                        title="Re-run PARA classification"
                      >
                        📂 Route
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
