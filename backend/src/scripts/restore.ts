/**
 * restore.ts — Database restore utility
 * Restores a SQLite database or runs SQL scripts to restore PostgreSQL databases.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { logger } from '../middleware/logger';

dotenv.config();
const execPromise = promisify(exec);

const DB_TYPE = process.env.DATABASE_URL ? 'postgres' : 'sqlite';

export async function runRestore(backupFilePath: string) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  try {
    logger.info(`Starting restore process for database type: ${DB_TYPE} using file: ${backupFilePath}`);

    if (DB_TYPE === 'postgres') {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL environment variable is missing');

      // Drop and recreate schema (simulated or direct execution)
      await execPromise(`psql "${dbUrl}" -f "${backupFilePath}"`);
    } else {
      const sqlitePath = path.resolve(__dirname, '../../../database.db');
      
      // SQLite: overwrite database file directly
      fs.copyFileSync(backupFilePath, sqlitePath);
    }

    logger.info('Database restore completed successfully');
  } catch (error: any) {
    logger.error('Database restore failed', { error: error.message });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    logger.error('Please specify the path to the backup file to restore.');
    process.exit(1);
  }
  runRestore(args[0]).then(() => {
    logger.info('Restore script executed successfully');
    process.exit(0);
  }).catch((err) => {
    logger.error('Restore script execution failed', { error: err.message });
    process.exit(1);
  });
}
