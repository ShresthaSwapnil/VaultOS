import { NextRequest, NextResponse } from 'next/server';
import { createModule } from '@/lib/module-engine';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const modulesList = db.prepare("SELECT * FROM modules WHERE status = 'active'").all();
    const formatted = modulesList.map((m: any) => ({
      ...m,
      subfolders: JSON.parse(m.subfolders),
      features: JSON.parse(m.features),
    }));
    return NextResponse.json({ modules: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, color, description, subfolders } = body;

    if (!name) {
      return NextResponse.json({ error: 'Module name is required' }, { status: 400 });
    }

    const createdModule = await createModule({
      name,
      icon,
      color,
      description,
      subfolders: subfolders || [],
    });

    return NextResponse.json({ module: createdModule });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
