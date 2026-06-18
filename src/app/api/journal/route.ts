import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';
import { generateDailyJournal } from '@/lib/daily-journal';
import { generateMorningBrief } from '@/lib/morning-brief';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const briefQuery = searchParams.get('brief');
  const today = new Date().toISOString().split('T')[0];

  if (briefQuery === 'true') {
    const briefPath = path.join(config.vaultPath, '_system', 'morning-briefs', `${today}.md`);

    if (fs.existsSync(briefPath)) {
      try {
        const text = fs.readFileSync(briefPath, 'utf-8');
        return NextResponse.json({ brief: text });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    // Attempt to generate a new brief if missing
    try {
      const briefText = await generateMorningBrief(today);
      return NextResponse.json({ brief: briefText });
    } catch (e: any) {
      return NextResponse.json({ brief: `Good morning, Luccy. Ready for your instructions today.\n*Failed to generate custom morning brief: ${e.message}*` });
    }
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const summary = await generateDailyJournal(targetDate);
    return NextResponse.json({ success: true, date: targetDate, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
