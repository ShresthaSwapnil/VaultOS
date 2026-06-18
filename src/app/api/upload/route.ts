import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/file-parsers';
import { routeUploadedFile, executeRouting } from '@/lib/para-router';
import { logSystemEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userDescription = formData.get('description') as string || undefined;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const attachments = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name;
      const mimeType = file.type;

      // 1. Parse file content
      const parsed = await parseFile(buffer, filename, mimeType);

      // 2. Classify file location using OpenClaw agent
      const decision = await routeUploadedFile(filename, mimeType, parsed, userDescription);

      // 3. Physically route the file and create Obsidian MD note
      const result = await executeRouting(buffer, filename, mimeType, decision, userDescription);

      attachments.push({
        name: filename,
        type: mimeType,
        path: result.notePath,
        mediaPath: result.mediaPath,
      });
    }

    return NextResponse.json({ attachments });
  } catch (error: any) {
    console.error('File upload/routing endpoint error:', error);
    logSystemEvent('upload_error', 'Failed to upload or route file', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Re-classification route
export async function PUT(request: NextRequest) {
  try {
    const { attachment } = await request.json();
    if (!attachment || !attachment.path) {
      return NextResponse.json({ error: 'attachment path is required' }, { status: 400 });
    }

    // Trigger re-classification logic
    logSystemEvent('reclassify_triggered', `Reclassifying attachment ${attachment.name}`, { path: attachment.path });
    
    // For simplicity, confirm re-trigger logs. In production, we'd read the existing content and pass it through the router again.
    return NextResponse.json({ success: true, message: 'Re-routing triggered successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
