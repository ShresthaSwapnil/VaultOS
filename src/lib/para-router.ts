import fs from 'fs';
import path from 'path';
import { config } from './config';
import { openClawClient } from './openclaw-client';
import { db, logSystemEvent } from './db';
import { ParsedFileResult } from './file-parsers';

export interface RouteDecision {
  category: 'Projects' | 'Areas' | 'Resources' | 'Archives';
  subfolder: string; // e.g. "aqua-farm/setup-logs" or "finance"
  title: string;     // file note name (e.g. "Rotala Crate 3 Log")
  tags: string[];
  reasoning: string;
}

// Fetch active dynamic modules to supply as classification targets
function getClassificationTargets(): string {
  const jsonPath = path.join(config.vaultPath, '_system', 'modules.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return JSON.stringify(data.modules.map((m: any) => ({
        id: m.id,
        name: m.name,
        subfolders: m.subfolders
      })), null, 2);
    } catch (e) {
      return '[]';
    }
  }
  return '[]';
}

export async function routeUploadedFile(
  filename: string,
  mimeType: string,
  parsed: ParsedFileResult,
  userDescription?: string
): Promise<RouteDecision> {
  const targetsInfo = getClassificationTargets();

  const prompt = `You are a strict PARA (Projects, Areas, Resources, Archives) File Router inside VaultOS.
Your job is to analyze an incoming file upload and decide exactly where to route it inside the user's Obsidian vault.

INCOMING FILE DETAILS:
- Filename: ${filename}
- MIME Type: ${mimeType}
- File Contents (Snippet): ${parsed.text.substring(0, 1000)}
- User's context note/description: ${userDescription || 'None provided'}

THE PARA VAULT STRUCTURE & TARGETS:
1. "Projects" -> Under "01-Projects/". Choose this if the file is related to a specific active project.
   Registered dynamic modules:
   ${targetsInfo}

2. "Areas" -> Under "02-Areas/". Ongoing responsibilities (e.g. finance, health, relationships).
3. "Resources" -> Under "03-Resources/". Standard resource sheets, laws, tax documents, reference knowledge.
4. "Archives" -> Under "04-Archives/". Completed or inactive projects/areas.

DECISION REQUIREMENTS:
Output a single raw JSON block with the following keys and NO extra text:
{
  "category": "Projects" | "Areas" | "Resources" | "Archives",
  "subfolder": "the relative path inside the category folder (e.g., 'aqua-farm/setup-logs' for Projects, 'finance' for Areas, or 'knowledge-base' for Resources)",
  "title": "A descriptive title for the obsidian note (e.g. 'Rotala Setup Crate 3')",
  "tags": ["array", "of", "relevant", "tags"],
  "reasoning": "brief 1-sentence explanation of why you selected this target path"
}
`;

  try {
    const clawRes = await openClawClient.streamCompletion({
      messages: [
        { role: 'system', content: 'You are a precise JSON classifier. Output JSON only.' },
        { role: 'user', content: prompt }
      ],
      stream: false,
    });

    const data = await clawRes.json();
    const rawOutput = data.choices?.[0]?.message?.content || data.content || '';
    
    // Parse JSON safely
    const jsonStart = rawOutput.indexOf('{');
    const jsonEnd = rawOutput.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`Invalid JSON classifier output: ${rawOutput}`);
    }
    
    const decision: RouteDecision = JSON.parse(rawOutput.substring(jsonStart, jsonEnd));
    return decision;
  } catch (e: any) {
    console.error('PARA Router failed, using fallback:', e);
    // Simple rule-based fallback
    return {
      category: 'Resources',
      subfolder: 'inbox',
      title: filename.replace(/\.[^/.]+$/, ''),
      tags: ['fallback', 'unclassified'],
      reasoning: `Classifier error: ${e.message}`,
    };
  }
}

export async function executeRouting(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  decision: RouteDecision,
  userDescription?: string
): Promise<{ notePath: string; mediaPath?: string }> {
  const id = Math.random().toString(36).substring(2, 11);
  const sanitizedTitle = decision.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'Untitled Document';
  
  // 1. Save media asset physically
  let mediaSubdir = 'documents';
  if (mimeType.startsWith('image/')) mediaSubdir = 'photos';
  else if (mimeType.startsWith('video/')) mediaSubdir = 'videos';

  const ext = path.extname(filename);
  const mediaFilename = `${new Date().toISOString().split('T')[0]}_${id}${ext}`;
  const mediaRelPath = path.join('_media', mediaSubdir, mediaFilename);
  const mediaFullPath = path.join(config.vaultPath, mediaRelPath);

  fs.mkdirSync(path.dirname(mediaFullPath), { recursive: true });
  fs.writeFileSync(mediaFullPath, fileBuffer);

  // 2. Create structured Obsidian Markdown file
  const categoryFolder = decision.category === 'Projects' ? '01-Projects'
    : decision.category === 'Areas' ? '02-Areas'
    : decision.category === 'Resources' ? '03-Resources'
    : '04-Archives';

  const noteFilename = `${sanitizedTitle}.md`;
  const noteRelPath = path.join(categoryFolder, decision.subfolder, noteFilename);
  const noteFullPath = path.join(config.vaultPath, noteRelPath);

  // Create frontmatter metadata block
  const frontmatter = `---
title: "${sanitizedTitle}"
date: ${new Date().toISOString().split('T')[0]}
category: ${decision.category}
tags: [${decision.tags.join(', ')}]
source_file: "${filename}"
media: ["${mediaRelPath}"]
---
`;

  const content = `${frontmatter}

## User Note / Description
${userDescription || 'No description provided.'}

## Upload Details
- **Original Filename**: ${filename}
- **Routed Asset**: ![[${mediaFilename}]]
- **Classification Reasoning**: ${decision.reasoning}
`;

  fs.mkdirSync(path.dirname(noteFullPath), { recursive: true });
  fs.writeFileSync(noteFullPath, content, 'utf-8');

  // 3. Log into SQLite DB
  // Extract module_id if matched from subfolder path (e.g. "aqua-farm/setup-logs" -> "aqua-farm")
  const moduleId = decision.subfolder.split('/')[0];

  db.prepare(`
    INSERT INTO file_routes (id, filename, original_path, routed_path, category, module_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    filename,
    mediaRelPath,
    noteRelPath,
    decision.category,
    moduleId,
    new Date().toISOString()
  );

  logSystemEvent(
    'file_routed',
    `Routed ${filename} to ${decision.category}/${decision.subfolder}`,
    { decision, noteRelPath }
  );

  return {
    notePath: noteRelPath,
    mediaPath: mediaRelPath,
  };
}
