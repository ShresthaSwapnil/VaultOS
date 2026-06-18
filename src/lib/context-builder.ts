import fs from 'fs';
import path from 'path';
import { config } from './config';
import { searchVault } from './vault';
import { db } from './db';

// Read active modules config
function getActiveModulesInfo(): string {
  const modulesJsonPath = path.join(config.vaultPath, '_system', 'modules.json');
  if (fs.existsSync(modulesJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(modulesJsonPath, 'utf8'));
      return JSON.stringify(data.modules || [], null, 2);
    } catch (e) {
      return '[]';
    }
  }
  return '[]';
}

// Retrieve today's daily journal content
function getTodayJournal(): string {
  const today = new Date().toISOString().split('T')[0];
  const journalPath = path.join(config.vaultPath, '_daily-journals', `${today}.md`);
  
  if (fs.existsSync(journalPath)) {
    try {
      const content = fs.readFileSync(journalPath, 'utf8');
      return `TODAY'S JOURNAL (${today}):\n${content}`;
    } catch (e) {
      return '';
    }
  }

  // Fallback to yesterday's journal for continuity if today's isn't generated
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const yesterdayPath = path.join(config.vaultPath, '_daily-journals', `${yesterday}.md`);
  
  if (fs.existsSync(yesterdayPath)) {
    try {
      const content = fs.readFileSync(yesterdayPath, 'utf8');
      return `YESTERDAY'S JOURNAL (${yesterday}) (Use for initial context):\n${content}`;
    } catch (e) {
      return '';
    }
  }

  return 'No recent daily journal found.';
}

export async function buildChatContext(userMessage: string, conversationId: string): Promise<any[]> {
  const systemPrompt = `You are OpenClaw running with the Codex harness runtime inside VaultOS, a local-first personal operating system for Luccy.
Today's local date/time is: ${new Date().toLocaleString('en-US', { timeZone: config.timezone })}.

Your primary directive is to serve as Luccy's personal workspace orchestrator. You are helper, planner, and system controller.
You have access to an Obsidian vault organized using the PARA method:
- 01-Projects (Specific active projects: Aqua Farm, Phone Business, Content Factory)
- 02-Areas (Ongoing responsibilities like finance, learning)
- 03-Resources (Knowledge items, rules, scraping data)
- 04-Archives (Completed projects)

DYNAMIC MODULE SYSTEMS:
Luccy manages these workspaces using dynamic system modules. Currently registered soft-coded modules:
${getActiveModulesInfo()}

ANTI-HALLUCINATION GROUND TRUTH:
Strictly reference the daily logs, notes, and task lists below as your ground truth. If asked about tasks or project statuses, query this context. Do not make up setup states, phone deals, or breeding cycles.

${getTodayJournal()}

RAG SEARCH CONTEXT (Relevant notes found in the vault matching query):
${JSON.stringify(searchVault(userMessage), null, 2)}
`;

  // Fetch recent conversation history from SQLite (last 10 turns)
  const rows: any[] = db.prepare(`
    SELECT role, content 
    FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC 
    LIMIT 10
  `).all(conversationId);

  const messagesPayload: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Append history
  for (const row of rows) {
    messagesPayload.push({
      role: row.role,
      content: row.content
    });
  }

  // Append current user message
  messagesPayload.push({
    role: 'user',
    content: userMessage
  });

  return messagesPayload;
}
