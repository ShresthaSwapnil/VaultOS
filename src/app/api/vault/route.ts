import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { initCronJobs } from '@/lib/cron-scheduler';
import { listDirectoryFiles, writeMarkdownFile } from '@/lib/vault';

export async function GET(request: NextRequest) {
  // Ensure background cron scheduler is active
  initCronJobs();
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get('path');
  const dashboard = searchParams.get('dashboard');
  const configQuery = searchParams.get('config');

  // Case 1: Serving general configurations
  if (configQuery === 'true') {
    const modulesJsonPath = path.join(config.vaultPath, '_system', 'modules.json');
    let modulesList: any[] = [];
    
    if (fs.existsSync(modulesJsonPath)) {
      try {
        const raw = fs.readFileSync(modulesJsonPath, 'utf8');
        modulesList = JSON.parse(raw).modules || [];
      } catch (e) {
        // Failed to parse
      }
    }
    
    return NextResponse.json({
      vaultPath: config.vaultPath,
      userName: config.userName,
      timezone: config.timezone,
      modules: modulesList,
    });
  }

  // Case 2: Serving dashboard logs and system events
  if (dashboard === 'true') {
    try {
      const routes = db.prepare('SELECT * FROM file_routes ORDER BY created_at DESC LIMIT 10').all();
      const events = db.prepare('SELECT * FROM system_events ORDER BY created_at DESC LIMIT 10').all();
      return NextResponse.json({ routes, events });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Case 3: List files inside a directory
  const listDir = searchParams.get('listDir');
  const directory = searchParams.get('directory');
  if (listDir === 'true' && directory) {
    try {
      const files = listDirectoryFiles(directory);
      return NextResponse.json({ files });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Case 4: Serving static files safely (images, video, documents)
  if (!filePathParam) {
    return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
  }

  const safePath = path.normalize(filePathParam).replace(/^(\.\.(\/|\\))+/, '');
  const absolutePath = path.join(config.vaultPath, safePath);

  // Directory traversal validation
  if (!absolutePath.startsWith(config.vaultPath)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(absolutePath);
    
    // Inline MIME Type lookup
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { relativePath, content, frontmatter = {} } = await request.json();

    if (!relativePath || content === undefined) {
      return NextResponse.json({ error: 'relativePath and content are required' }, { status: 400 });
    }

    writeMarkdownFile(relativePath, content, frontmatter);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { oldRelativePath, newRelativePath } = await request.json();

    if (!oldRelativePath || !newRelativePath) {
      return NextResponse.json({ error: 'oldRelativePath and newRelativePath are required' }, { status: 400 });
    }

    const oldPath = path.resolve(config.vaultPath, oldRelativePath);
    const newPath = path.resolve(config.vaultPath, newRelativePath);

    // Validate path boundaries
    if (!oldPath.startsWith(config.vaultPath) || !newPath.startsWith(config.vaultPath)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(oldPath)) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    // Ensure target directory exists
    const targetDir = path.dirname(newPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.renameSync(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { relativePath } = await request.json();

    if (!relativePath) {
      return NextResponse.json({ error: 'relativePath is required' }, { status: 400 });
    }

    const fullPath = path.resolve(config.vaultPath, relativePath);

    // Validate boundary
    if (!fullPath.startsWith(config.vaultPath)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    fs.unlinkSync(fullPath);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
