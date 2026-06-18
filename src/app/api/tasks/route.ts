import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, dueDate, moduleId } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = Math.random().toString(36).substring(2, 11);
    const today = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, title, status, due_date, module_id, created_at, updated_at)
      VALUES (?, ?, 'todo', ?, ?, ?, ?)
    `).run(id, title, dueDate || null, moduleId || null, today, today);

    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    return NextResponse.json({ task: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status parameters are required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `).run(status, new Date().toISOString(), id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    return NextResponse.json({ task: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
