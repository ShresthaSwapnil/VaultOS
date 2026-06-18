import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildChatContext } from '@/lib/context-builder';
import { openClawClient } from '@/lib/openclaw-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const health = searchParams.get('health');
  const conversationId = searchParams.get('conversationId');

  if (health === 'true') {
    const isOnline = await openClawClient.isOnline();
    return NextResponse.json({ status: isOnline ? 'online' : 'offline' });
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  try {
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversationId);

    // Parse attachment JSON fields
    const formatted = messages.map((m: any) => ({
      ...m,
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
    }));

    return NextResponse.json({ messages: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content, attachments = [] } = await request.json();

    if (!conversationId || (!content.trim() && attachments.length === 0)) {
      return NextResponse.json({ error: 'Invalid message request parameters' }, { status: 400 });
    }

    const todayStr = new Date().toISOString();

    // 1. Persist user message in SQLite database
    const userMsgId = Math.random().toString(36).substring(2, 11);
    
    // Auto-create conversation if it doesn't exist
    const conversationExists = db.prepare('SELECT 1 FROM conversations WHERE id = ?').get(conversationId);
    if (!conversationExists) {
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(conversationId, content.substring(0, 40) || 'New Conversation', todayStr, todayStr);
    }

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, source, attachments, created_at)
      VALUES (?, ?, 'user', ?, 'web', ?, ?)
    `).run(
      userMsgId,
      conversationId,
      content,
      attachments.length > 0 ? JSON.stringify(attachments) : null,
      todayStr
    );

    // 2. Assemble context window & model prompt
    const messagesPayload = await buildChatContext(content, conversationId);

    // 3. Connect and stream from OpenClaw
    const clawResponse = await openClawClient.streamCompletion({
      messages: messagesPayload,
      stream: true,
    });

    const reader = clawResponse.body?.getReader();
    const decoder = new TextDecoder();

    // Create a new stream for the browser client
    const customStream = new ReadableStream({
      async start(controller) {
        let assistantContent = '';
        const assistantMsgId = Math.random().toString(36).substring(2, 11);

        try {
          while (true) {
            const chunk = await reader?.read();
            if (!chunk || chunk.done) break;
            
            const decodedText = decoder.decode(chunk.value, { stream: true });
            
            // Forward chunk to browser
            controller.enqueue(new TextEncoder().encode(decodedText));

            // Extract content to save in SQLite DB
            const lines = decodedText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(dataStr);
                  const chunkText = parsed.choices?.[0]?.delta?.content || parsed.content;
                  if (chunkText) {
                    assistantContent += chunkText;
                  }
                } catch (e) {
                  // Not standard OpenAI json chunk
                }
              }
            }
          }

          // Persist assistant message in SQLite
          db.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, source, created_at)
            VALUES (?, ?, 'assistant', ?, 'web', ?)
          `).run(assistantMsgId, conversationId, assistantContent, new Date().toISOString());

          // Update conversation last modified timestamp
          db.prepare(`
            UPDATE conversations 
            SET updated_at = ? 
            WHERE id = ?
          `).run(new Date().toISOString(), conversationId);

        } catch (e) {
          console.error('Streaming error in chat route handler:', e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error posting chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
