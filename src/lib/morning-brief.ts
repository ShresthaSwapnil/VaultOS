import fs from 'fs';
import path from 'path';
import { db, logSystemEvent } from './db';
import { config } from './config';
import { openClawClient } from './openclaw-client';

export async function generateMorningBrief(targetDateStr?: string): Promise<string> {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  
  try {
    // 1. Gather active tasks
    const pendingTasks = db.prepare(`
      SELECT title, due_date, module_id 
      FROM tasks 
      WHERE status != 'done'
    `).all() as any[];

    // 2. Fetch yesterday's journal summary if it exists
    const yesterday = new Date(Date.parse(dateStr) - 86400000).toISOString().split('T')[0];
    const yesterdayJournalPath = path.join(config.vaultPath, '_daily-journals', `${yesterday}.md`);
    let yesterdayContext = '';
    
    if (fs.existsSync(yesterdayJournalPath)) {
      try {
        yesterdayContext = fs.readFileSync(yesterdayJournalPath, 'utf8');
      } catch (e) {
        // Ignored
      }
    }

    const tasksContext = pendingTasks
      .map((t) => `- ${t.title} (due: ${t.due_date || 'no date'}, workspace: ${t.module_id || 'general'})`)
      .join('\n');

    const prompt = `You are the VaultOS Daily Planner. Luccy requires you to compile today's Morning Brief outline.
Today's Date: ${dateStr}

YESTERDAY'S JOURNAL:
${yesterdayContext || 'No yesterday journal log found.'}

PENDING TASKS:
${tasksContext || 'No pending tasks outstanding.'}

INSTRUCTIONS:
Output a structured morning brief format starting exactly with:
"Good morning, Luccy. Here is today's focus:"
Followed by a concise bullet list of 3-5 key priority action items for:
- Aqua Farm
- Content Pipeline
- Business Operations

Keep it actionable and extremely clean. Do not add intro/outro comments.
`;

    const clawRes = await openClawClient.streamCompletion({
      messages: [
        { role: 'system', content: 'You are a precise, action-oriented scheduler.' },
        { role: 'user', content: prompt }
      ],
      stream: false,
    });

    const data = await clawRes.json();
    const briefText = data.choices?.[0]?.message?.content || data.content || 'Failed to generate morning brief text.';

    // Write to _system/morning-briefs/YYYY-MM-DD.md
    const briefPath = path.join(config.vaultPath, '_system', 'morning-briefs', `${dateStr}.md`);
    fs.mkdirSync(path.dirname(briefPath), { recursive: true });
    fs.writeFileSync(briefPath, briefText, 'utf-8');

    logSystemEvent('brief_generated', `Morning Brief generated for date: ${dateStr}`);
    
    return briefText;

  } catch (error: any) {
    console.error('Error generating morning brief:', error);
    logSystemEvent('brief_generation_error', `Failed to generate brief for date ${dateStr}`, { error: error.message });
    throw error;
  }
}
