import fs from 'fs';
import path from 'path';
import { config } from './config';
import { db, logSystemEvent } from './db';

export interface ModuleData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subfolders: string[];
  features: string[];
  createdAt: string;
  status: 'active' | 'archived';
}

// Scaffold target folders inside the vault for a new dynamic module
export async function createModule(newMod: {
  name: string;
  icon: string;
  color: string;
  description: string;
  subfolders: string[];
}): Promise<ModuleData> {
  const id = newMod.name.toLowerCase().replace(/[^a-z0-9]/g, '-').trim();
  const today = new Date().toISOString().split('T')[0];

  const moduleData: ModuleData = {
    id,
    name: newMod.name,
    icon: newMod.icon || '📁',
    color: newMod.color || '#38bdf8',
    description: newMod.description || '',
    subfolders: newMod.subfolders.length > 0 ? newMod.subfolders : ['setup-logs', 'tasks', 'planning'],
    features: ['project-board'],
    createdAt: today,
    status: 'active',
  };

  // 1. Scaffold subfolders under 01-Projects/{id}/
  const moduleRootRel = path.join('01-Projects', id);
  const moduleRootFull = path.join(config.vaultPath, moduleRootRel);
  
  if (!fs.existsSync(moduleRootFull)) {
    fs.mkdirSync(moduleRootFull, { recursive: true });
  }

  for (const sub of moduleData.subfolders) {
    const subPath = path.join(moduleRootFull, sub);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  }

  // Write default _project-board.md in module folder
  const boardPath = path.join(moduleRootFull, '_project-board.md');
  if (!fs.existsSync(boardPath)) {
    const defaultBoardText = `---
title: "${moduleData.name} Board"
type: project-board
module: "${id}"
---

# ${moduleData.name} Project Board
Organized workspace for ${moduleData.name}.
`;
    fs.writeFileSync(boardPath, defaultBoardText, 'utf-8');
  }

  // 2. Persist in modules.json registry
  const registryPath = path.join(config.vaultPath, '_system', 'modules.json');
  let registry = { modules: [] as ModuleData[] };
  
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (e) {
      // Ignore parse error
    }
  }

  // Remove existing with same id if any, and append new
  registry.modules = registry.modules.filter((m: ModuleData) => m.id !== id);
  registry.modules.push(moduleData);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');

  // 3. Sync to SQLite modules database table
  db.prepare(`
    INSERT OR REPLACE INTO modules (id, name, icon, color, description, subfolders, features, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    moduleData.name,
    moduleData.icon,
    moduleData.color,
    moduleData.description,
    JSON.stringify(moduleData.subfolders),
    JSON.stringify(moduleData.features),
    moduleData.status,
    moduleData.createdAt
  );

  logSystemEvent('module_created', `Successfully created dynamic module: ${moduleData.name}`, { id });

  return moduleData;
}
