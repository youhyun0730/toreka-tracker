import Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

let db: Database.Database | null = null;

/**
 * Initialize SQLite database
 */
export function initDatabase(dbPath: string): Database.Database {
  try {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created database directory: ${dir}`);
    }

    // Open database
    db = new Database(dbPath);
    logger.info(`Database opened: ${dbPath}`);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Create tables
    createTables(db);

    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error, dbPath });
    throw error;
  }
}

/**
 * Create database tables
 */
function createTables(database: Database.Database): void {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      page_number INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      parent_id INTEGER,
      url TEXT NOT NULL,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_first_seen
    ON comments(first_seen_at)
  `;

  const createPageIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_page_number
    ON comments(page_number)
  `;

  try {
    database.exec(createTableSQL);
    database.exec(createIndexSQL);
    database.exec(createPageIndexSQL);
    logger.info('Database tables created/verified');
  } catch (error) {
    logger.error('Failed to create tables', { error });
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}
