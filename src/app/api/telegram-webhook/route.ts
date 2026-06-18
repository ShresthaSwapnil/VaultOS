import { NextRequest, NextResponse } from 'next/server';
import { db, logSystemEvent } from '@/lib/db';
import { openClawClient, OpenClawMessage } from '@/lib/openclaw-client';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { text, from, isVoice, mediaUrl } = payload;

    if (!text) {
      return NextResponse.json({ error: 'Text content is missing' }, { status: 400 });
    }

    logSystemEvent('telegram_webhook_received', `Received Telegram message from ${from || 'user'}`, payload);

    // Get the most recently active conversation or create one
    let activeConv = db.prepare('SELECT id FROM conversations ORDER BY updated_at DESC LIMIT 1').get() as { id: string } | undefined;
    let conversationId = activeConv?.id;

    if (!conversationId) {
      conversationId = Math.random().toString(36).substring(2, 11);
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, 'Telegram Conversation', ?, ?)
      `).run(conversationId, new Date().toISOString(), new Date().toISOString());
    }

    // Insert user message with source 'telegram'
    const msgId = Math.random().toString(36).substring(2, 11);
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, source, created_at)
      VALUES (?, ?, 'user', ?, 'telegram', ?)
    `).run(msgId, conversationId, text, new Date().toISOString());

    // Generate response using OpenClaw backend (Codex runtime)
    const activeMessages: OpenClawMessage[] = [
      { role: 'system', content: 'You are OpenClaw answering Luccy via Telegram Bot. Keep answers concise and direct.' },
      { role: 'user', content: text }
    ];

    const clawRes = await openClawClient.streamCompletion({
      messages: activeMessages,
      stream: false, // For webhooks, fetch block non-stream is cleaner
    });

    if (clawRes.ok) {
      const data = await clawRes.json();
      const responseText = data.choices?.[0]?.message?.content || data.content || '';
      
      // Save assistant response
      const assistantId = Math.random().toString(36).substring(2, 11);
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, source, created_at)
        VALUES (?, ?, 'assistant', ?, 'telegram', ?)
      `).run(assistantId, conversationId, responseText, new Date().toISOString());

      // Update conversation timestamp
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        conversationId
      );

      // Return response to Telegram proxy (e.g. OpenClaw)
      return NextResponse.json({ text: responseText });
    }

    return NextResponse.json({ error: 'OpenClaw API call failed' }, { status: 502 });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
