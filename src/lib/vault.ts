import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { config } from './config';
import { logSystemEvent } from './db';

// Ensure the vault folder structure exists
export function scaffoldPARA() {
  const folders = [
    '', // Vault Root
    '01-Projects',
    '02-Areas',
    '03-Resources',
    '04-Archives',
    '_daily-journals',
    '_system',
    '_media',
    '_media/photos',
    '_media/videos',
    '_media/documents',
  ];

  try {
    for (const folder of folders) {
      const targetPath = path.join(config.vaultPath, folder);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
    }

    // Initialize modules.json if it doesn't exist
    const modulesJsonPath = path.join(config.vaultPath, '_system', 'modules.json');
    if (!fs.existsSync(modulesJsonPath)) {
      const defaultModules = {
        modules: [
          {
            id: 'aqua-farm',
            name: 'Aqua Farm',
            icon: '🐟',
            color: '#14b8a6',
            description: 'Aquatic plant farming & fish breeding',
            subfolders: ['setup-logs', 'water-tests', 'breeding-cycles'],
            features: ['photo-gallery', 'alerts'],
            createdAt: new Date().toISOString().split('T')[0],
            status: 'active'
          },
          {
            id: 'phone-business',
            name: 'Phone Business',
            icon: '📱',
            color: '#f59e0b',
            description: 'Smartphone trading & market research',
            subfolders: ['market-research', 'deals', 'inventory'],
            features: ['deal-tracker', 'market-data'],
            createdAt: new Date().toISOString().split('T')[0],
            status: 'active'
          },
          {
            id: 'content-factory',
            name: 'Content Factory',
            icon: '🎬',
            color: '#a855f7',
            description: 'YouTube, Facebook, Instagram content pipeline',
            subfolders: ['youtube', 'facebook', 'instagram', 'scripts'],
            features: ['content-pipeline', 'calendar-overlay'],
            createdAt: new Date().toISOString().split('T')[0],
            status: 'active'
          }
        ]
      };
      fs.writeFileSync(modulesJsonPath, JSON.stringify(defaultModules, null, 2), 'utf-8');
    }

    logSystemEvent('vault_scaffold', 'Obsidian PARA Vault structure successfully scaffolded.');
  } catch (error: any) {
    console.error('Error scaffolding vault:', error);
    logSystemEvent('vault_scaffold_error', 'Failed to scaffold PARA Vault', { error: error.message });
  }
}

// Read and parse frontmatter + content from a markdown file
export function readMarkdownFile(relativeFilePath: string) {
  const fullPath = path.resolve(config.vaultPath, relativeFilePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${relativeFilePath}`);
  }

  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const parsed = matter(fileContent);

  return {
    content: parsed.content.trim(),
    frontmatter: parsed.data,
  };
}

// Write structured markdown content + frontmatter
export function writeMarkdownFile(relativeFilePath: string, content: string, frontmatter: Record<string, any> = {}) {
  const fullPath = path.resolve(config.vaultPath, relativeFilePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileData = matter.stringify(content, frontmatter);
  fs.writeFileSync(fullPath, fileData, 'utf8');

  logSystemEvent('file_written', `Successfully wrote to vault file: ${relativeFilePath}`, { path: relativeFilePath });
}

// Full text search vault files
export interface SearchResult {
  filePath: string;
  title: string;
  excerpt: string;
  score: number;
}

export function searchVault(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowercaseQuery = query.toLowerCase();

  function traverseDir(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relativePath = path.relative(config.vaultPath, fullPath).replace(/\\/g, '/');

      // Skip internal folders and media
      if (file.startsWith('.') || relativePath.startsWith('_media') || file === '_system') {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverseDir(fullPath);
      } else if (file.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lowercaseContent = content.toLowerCase();

          if (lowercaseContent.includes(lowercaseQuery)) {
            // Simple match score based on occurrences
            const occurrences = (lowercaseContent.match(new RegExp(lowercaseQuery, 'g')) || []).length;
            const index = lowercaseContent.indexOf(lowercaseQuery);
            const start = Math.max(0, index - 60);
            const end = Math.min(content.length, index + lowercaseQuery.length + 60);
            const excerpt = '...' + content.substring(start, end).replace(/\n/g, ' ') + '...';

            results.push({
              filePath: relativePath,
              title: file.replace('.md', ''),
              excerpt,
              score: occurrences,
            });
          }
        } catch (e) {
          // Ignore read errors
        }
      }
    }
  }

  if (fs.existsSync(config.vaultPath)) {
    traverseDir(config.vaultPath);
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// List all files in a folder recursively
export function listDirectoryFiles(relativeDirPath: string): string[] {
  const dirPath = path.resolve(config.vaultPath, relativeDirPath);
  const results: string[] = [];

  if (!fs.existsSync(dirPath)) return [];

  function traverse(currentPath: string) {
    const list = fs.readdirSync(currentPath);
    for (const file of list) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        results.push(path.relative(config.vaultPath, fullPath).replace(/\\/g, '/'));
      }
    }
  }

  traverse(dirPath);
  return results;
}

// Auto-initialize scaffolding
scaffoldPARA();
