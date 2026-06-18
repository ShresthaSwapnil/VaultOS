import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { config } from '@/lib/config';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const calendarItems: any[] = [];

    // 1. Fetch tasks from SQLite database
    const tasks = db.prepare('SELECT * FROM tasks').all();
    for (const task of tasks as any[]) {
      if (task.due_date) {
        calendarItems.push({
          id: task.id,
          date: task.due_date,
          type: 'task',
          title: task.title,
          status: task.status,
          moduleId: task.module_id,
        });
      }
    }

    // 2. Fetch daily journals from the Obsidian Vault folder
    const journalsDir = path.join(config.vaultPath, '_daily-journals');
    if (fs.existsSync(journalsDir)) {
      const files = fs.readdirSync(journalsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const dateStr = file.replace('.md', ''); // e.g. "2026-06-13"
          try {
            const rawContent = fs.readFileSync(path.join(journalsDir, file), 'utf8');
            const parsed = matter(rawContent);

            calendarItems.push({
              id: dateStr,
              date: dateStr,
              type: 'journal',
              title: `Everyday Journal — ${dateStr}`,
              content: parsed.content,
              frontmatter: parsed.data,
            });
          } catch (e) {
            // Ignore file read/parse exceptions
          }
        }
      }
    }

    return NextResponse.json({ items: calendarItems });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
