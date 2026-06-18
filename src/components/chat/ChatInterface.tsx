'use client';

import React, { useState, useEffect, useRef } from 'react';
import MessageBubble, { Message, ChatAttachment } from './MessageBubble';
import UniversalUpload, { Attachment } from '../upload/UniversalUpload';

interface ChatInterfaceProps {
  activeConversationId: string | null;
  onNewMessage: () => void;
}

export default function ChatInterface({ activeConversationId, onNewMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation messages
  const fetchMessages = async () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(`/api/chat?conversationId=${activeConversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [activeConversationId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle uploading files and/or sending text message
  const handleSendMessage = async (uploadedAttachments: Attachment[], text: string) => {
    setIsLoading(true);
    setIsRouting(uploadedAttachments.length > 0);

    const tempConvId = activeConversationId || Math.random().toString(36).substring(2, 11);

    try {
      // 1. Upload attachments first if there are any
      let savedAttachments: ChatAttachment[] = [];
      if (uploadedAttachments.length > 0) {
        const formData = new FormData();
        uploadedAttachments.forEach((att) => {
          formData.append('files', att.rawFile);
        });
        formData.append('conversationId', tempConvId);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          savedAttachments = uploadData.attachments || [];
        } else {
          console.error('Failed to upload files');
        }
      }

      // Add user message locally
      const userMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        role: 'user',
        content: text,
        source: 'web',
        attachments: savedAttachments,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsRouting(false);

      // 2. Call chat completions endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: tempConvId,
          content: text,
          attachments: savedAttachments,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API returned an error');
      }

      // Read chunked response stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessageId = Math.random().toString(36).substring(2, 11);
      
      // Add empty assistant bubble
      const assistantPlaceholder: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        source: 'web',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      while (true) {
        const chunk = await reader?.read();
        if (!chunk || chunk.done) break;
        const textChunk = decoder.decode(chunk.value, { stream: true });
        
        // Split chunks by Server Sent Events line syntax
        const lines = textChunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              const chunkText = parsed.choices?.[0]?.delta?.content || parsed.content;
              if (chunkText) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + chunkText }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Not JSON chunk
            }
          }
        }
      }
      
      // Update sidebar if we created a new conversation
      if (!activeConversationId) {
        onNewMessage();
      }

    } catch (err) {
      console.error('Chat error:', err);
      // Add error bubble
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 11),
          role: 'assistant',
          content: '⚠️ *Sorry, I encountered an error connecting to OpenClaw. Make sure the OpenClaw service is running.*',
          source: 'web',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRouting(false);
    }
  };

  const handleRouteFile = async (attachment: ChatAttachment) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment }),
      });
      if (res.ok) {
        alert('File routed successfully!');
      } else {
        alert('Failed to route file.');
      }
    } catch (err) {
      console.error('Routing failed:', err);
    }
  };

  return (
    <div className="chat-interface-panel flex flex-col grow">
      <div className="chat-header">
        <h2>Command Chat</h2>
        <p className="chat-subtitle">Streaming context-aware system orchestrator</p>
      </div>

      <div className="messages-scroll-area">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <span className="empty-state-icon">🪐</span>
            <h3>Welcome to VaultOS, Luccy</h3>
            <p>I am your local agent. Upload files, check the dashboard, or type a command to get started.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              onRouteFile={handleRouteFile}
            />
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="message-row assistant-row animate-fade-in">
            <div className="message-avatar">🪐</div>
            <div className="message-bubble-wrapper">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <UniversalUpload 
          onUploadComplete={handleSendMessage} 
          isRouting={isRouting}
        />
      </div>
    </div>
  );
}
