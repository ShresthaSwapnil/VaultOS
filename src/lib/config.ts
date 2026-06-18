import path from 'path';

export interface SystemConfig {
  vaultPath: string;
  openClawUrl: string;
  n8nUrl: string;
  userName: string;
  timezone: string;
  telegramBotToken?: string;
  openClawToken?: string;
}

// Set up default settings
const DEFAULT_CONFIG: SystemConfig = {
  vaultPath: path.resolve(process.cwd(), 'vault'),
  openClawUrl: process.env.OPENCLAW_URL || 'http://localhost:18789',
  n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
  userName: process.env.USER_NAME || 'Luccy',
  timezone: process.env.TIMEZONE || 'Asia/Kathmandu',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  openClawToken: process.env.OPENCLAW_TOKEN || '',
};

export const config = {
  ...DEFAULT_CONFIG,
  // Allow overrides from environment variables if present
  vaultPath: process.env.VAULT_PATH ? path.resolve(process.env.VAULT_PATH) : DEFAULT_CONFIG.vaultPath,
};
