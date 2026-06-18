import cron from 'node-cron';
import { generateDailyJournal } from './daily-journal';
import { generateMorningBrief } from './morning-brief';
import { logSystemEvent } from './db';

let cronInitialized = false;

export function initCronJobs() {
  if (cronInitialized) return;
  cronInitialized = true;

  logSystemEvent('cron_init', 'VaultOS Cron scheduler successfully started.');

  // Everyday Journal generation: runs at 23:55 (11:55 PM) daily
  cron.schedule('55 23 * * *', async () => {
    try {
      logSystemEvent('cron_trigger', 'Triggering daily journal generation...');
      await generateDailyJournal();
    } catch (e: any) {
      console.error('Failed to run daily journal cron job:', e);
    }
  });

  // Morning Brief generation: runs at 06:00 (6:00 AM) daily
  cron.schedule('0 6 * * *', async () => {
    try {
      logSystemEvent('cron_trigger', 'Triggering morning brief generation...');
      await generateMorningBrief();
    } catch (e: any) {
      console.error('Failed to run morning brief cron job:', e);
    }
  });
}
