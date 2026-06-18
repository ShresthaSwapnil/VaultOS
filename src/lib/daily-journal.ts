import fs from 'fs';
import path from 'path';
import { db, logSystemEvent } from './db';
import { config } from './config';
import { openClawClient } from './openclaw-client';

export async function generateDailyJournal(targetDateStr?: string): Promise<string> {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  
  try {
    // 1. Gather all data for target date
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // Messages
    const messages = db.prepare(`
      SELECT role, content, source, created_at 
      FROM messages 
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at ASC
    `).all(startOfDay, endOfDay) as any[];

    // Routed Files
    const routes = db.prepare(`
      SELECT filename, category, routed_path 
      FROM file_routes 
      WHERE created_at BETWEEN ? AND ?
    `).all(startOfDay, endOfDay) as any[];

    // Tasks completed or created today
    const tasks = db.prepare(`
      SELECT title, status, updated_at 
      FROM tasks 
      WHERE created_at BETWEEN ? AND ? OR updated_at BETWEEN ? AND ?
    `).all(startOfDay, endOfDay, startOfDay, endOfDay) as any[];

    if (messages.length === 0 && routes.length === 0 && tasks.length === 0) {
      const emptyMsg = `No activities logged for ${dateStr}.`;
      writeJournalFile(dateStr, emptyMsg, []);
      return emptyMsg;
    }

    // 2. Format details into a text context for the agent summary
    const messagesContext = messages.map((m) => `[${m.role}] [${m.source}]: ${m.content}`).join('\n');
    const routesContext = routes.map((r) => `- File ${r.filename} routed to ${r.category}/${r.routed_path}`).join('\n');
    const tasksContext = tasks.map((t) => `- Task: ${t.title} [Status: ${t.status}]`).join('\n');

    const prompt = `You are the VaultOS Daily Archivist. Luccy requires you to compile today's everyday log note.
Target Date: ${dateStr}

TODAY'S RAW LOG DETAILS:
---
MESSAGES:
${messagesContext || 'No dialogue messages today.'}

ROUTED FILES:
${routesContext || 'No files routed today.'}

TASKS MODIFIED/CREATED:
${tasksContext || 'No task modifications today.'}
---

Your job is to summarize these activities in a clean, helpful Obsidian note narrative.
FORMAT REQUIREMENTS:
Write a markdown summary narrative. Start with a header "## Executive Summary", then "## Key Decisions & Learnings", and finally "## Tomorrow's Priorities".
Keep the narrative concise, highlighting key events, setups (e.g. aquatic plant tub changes), and trade actions.
`;

    const clawRes = await openClawClient.streamCompletion({
      messages: [
        { role: 'system', content: 'You are a precise, analytical archivist.' },
        { role: 'user', content: prompt }
      ],
      stream: false,
    });

    const data = await clawRes.json();
    const summaryNarrative = data.choices?.[0]?.message?.content || data.content || 'Failed to generate summary narrative.';

    // 3. Write Obsidian Markdown Note
    writeJournalFile(dateStr, summaryNarrative, tasks);

    // 4. Save into SQLite
    db.prepare(`
      INSERT OR REPLACE INTO daily_journals (date, summary, created_at)
      VALUES (?, ?, ?)
    `).run(dateStr, summaryNarrative, new Date().toISOString());

    logSystemEvent('journal_generated', `Everyday Journal successfully generated for date: ${dateStr}`);
    
    return summaryNarrative;

  } catch (error: any) {
    console.error('Error generating daily journal:', error);
    logSystemEvent('journal_generation_error', `Failed to generate journal for date ${dateStr}`, { error: error.message });
    throw error;
  }
}

function writeJournalFile(dateStr: string, summary: string, tasks: any[]) {
  const journalPath = path.join(config.vaultPath, '_daily-journals', `${dateStr}.md`);

  const createdTasks = tasks.filter((t) => t.status === 'todo');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  const content = `---
title: "Everyday Journal — ${dateStr}"
date: ${dateStr}
type: daily-journal
---

# Everyday Journal — ${dateStr}

${summary}

## Tasks Checklist
### Completed
${completedTasks.map((t) => `- [x] ${t.title}`).join('\n') || '*No tasks completed today.*'}

### Pending / Created
${createdTasks.map((t) => `- [ ] ${t.title}`).join('\n') || '*No pending tasks created today.*'}
`;

  fs.mkdirSync(path.dirname(journalPath), { recursive: true });
  fs.writeFileSync(journalPath, content, 'utf-8');
}
