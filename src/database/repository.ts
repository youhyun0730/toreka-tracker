import { ScrapedComment, StoredComment } from '../types';
import { getDatabase } from './db';
import { logger } from '../utils/logger';

/**
 * Check if a comment exists in the database
 */
export function commentExists(commentId: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT 1 FROM comments WHERE id = ? LIMIT 1');
  const result = stmt.get(commentId);
  return result !== undefined;
}

/**
 * Get a comment by ID
 */
export function getComment(commentId: number): StoredComment | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT
      id, page_number as pageNumber, author, content,
      timestamp, parent_id as parentId, url,
      first_seen_at as firstSeenAt
    FROM comments
    WHERE id = ?
  `);

  const row = stmt.get(commentId) as any;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pageNumber: row.pageNumber,
    author: row.author,
    content: row.content,
    timestamp: row.timestamp,
    parentId: row.parentId,
    url: row.url,
    firstSeenAt: new Date(row.firstSeenAt)
  };
}

/**
 * Insert a new comment
 */
export function insertComment(comment: ScrapedComment): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO comments (id, page_number, author, content, timestamp, parent_id, url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      comment.id,
      comment.pageNumber,
      comment.author,
      comment.content,
      comment.timestamp,
      comment.parentId,
      comment.url
    );

    logger.debug(`Inserted comment ${comment.id} into database`);
  } catch (error) {
    logger.error(`Failed to insert comment ${comment.id}`, { error });
    throw error;
  }
}

/**
 * Insert multiple comments in a transaction
 */
export function insertComments(comments: ScrapedComment[]): void {
  if (comments.length === 0) {
    return;
  }

  const db = getDatabase();

  const insertMany = db.transaction((comments: ScrapedComment[]) => {
    const stmt = db.prepare(`
      INSERT INTO comments (id, page_number, author, content, timestamp, parent_id, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const comment of comments) {
      stmt.run(
        comment.id,
        comment.pageNumber,
        comment.author,
        comment.content,
        comment.timestamp,
        comment.parentId,
        comment.url
      );
    }
  });

  try {
    insertMany(comments);
    logger.info(`Inserted ${comments.length} comments into database`);
  } catch (error) {
    logger.error('Failed to insert comments', { error, count: comments.length });
    throw error;
  }
}

/**
 * Get new comments (not in database)
 */
export function getNewComments(scrapedComments: ScrapedComment[]): ScrapedComment[] {
  const newComments: ScrapedComment[] = [];

  for (const comment of scrapedComments) {
    if (!commentExists(comment.id)) {
      newComments.push(comment);
    }
  }

  logger.info(`Found ${newComments.length} new comments out of ${scrapedComments.length} scraped`);
  return newComments;
}

/**
 * Get total comment count
 */
export function getCommentCount(): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM comments');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Delete old comments (older than specified days)
 */
export function deleteOldComments(daysOld: number): number {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM comments
    WHERE first_seen_at < datetime('now', '-' || ? || ' days')
  `);

  const result = stmt.run(daysOld);
  const deletedCount = result.changes;

  if (deletedCount > 0) {
    logger.info(`Deleted ${deletedCount} comments older than ${daysOld} days`);
  }

  return deletedCount;
}
