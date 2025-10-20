import * as cheerio from 'cheerio';
import { ScrapedComment } from '../types';
import { logger } from '../utils/logger';

/**
 * Parse comments from HTML content
 */
export function parseComments(html: string, pageNumber: number, baseUrl: string): ScrapedComment[] {
  const $ = cheerio.load(html);
  const comments: ScrapedComment[] = [];

  // Find all comment containers (including nested replies in ul.children)
  // Structure: div#wpd-comm-{id}_0 > div.wpd-comment-wrap > div#comment-{id}
  // Reply structure: ul.children > li > div#wpd-comm-{id}_{parentId}
  // Use descendant selector to capture ALL comment divs regardless of nesting
  // 🔍 DEBUG: Check for reply comments in HTML
  const bodyHtml = $('body').html() || '';
  const allWpdCommIds = bodyHtml.match(/id="wpd-comm-\d+_\d+"/g) || [];
  const replyIds = allWpdCommIds.filter(id => !id.includes('_0"'));
  logger.debug(`HTML contains ${allWpdCommIds.length} wpd-comm IDs, ${replyIds.length} are replies`);
  if (replyIds.length > 0) {
    logger.debug('Sample reply IDs found in HTML:', replyIds.slice(0, 5));
  }

  const allCommentContainers = $('div[id^="wpd-comm-"]');
  logger.debug(`Found ${allCommentContainers.length} comment containers on page ${pageNumber}`);

  allCommentContainers.each((_, commentContainer) => {
    try {
      const $container = $(commentContainer);

      // Extract comment ID from wpd-comm-{id}_{parentId}
      // Format: wpd-comm-{id}_0 for top-level comments
      //         wpd-comm-{id}_{parentId} for replies
      const containerId = $container.attr('id') || '';
      const idMatch = containerId.match(/wpd-comm-(\d+)_(\d+)/);

      if (!idMatch) {
        logger.debug(`Skipping container with invalid ID: ${containerId}`);
        return;
      }

      // 🔍 DEBUG: Log all container IDs to verify we're finding replies
      const isHidden = $container.css('display') === 'none' || $container.attr('style')?.includes('display: none');
      logger.debug(`Processing container: ${containerId}${isHidden ? ' [HIDDEN]' : ''}`);

      const commentId = parseInt(idMatch[1], 10);
      const parentIdFromContainer = parseInt(idMatch[2], 10);

      // Find the actual comment div
      const $commentDiv = $container.find(`div#comment-${commentId}`);

      if ($commentDiv.length === 0) {
        logger.debug(`Comment div not found for ID: ${commentId}`);
        return;
      }

      // Extract author
      const author = $commentDiv.find('.wpd-comment-author').first().text().trim() || '匿名';

      // Extract content
      const content = $commentDiv.find('.wpd-comment-text').first().text().trim();

      if (!content) {
        logger.debug(`Empty content for comment ${commentId}, skipping`);
        return;
      }

      // Extract timestamp
      const timestamp = $commentDiv.find('.wpd-comment-date').first().text().trim();

      // Determine if this is a reply based on parent ID
      // parentIdFromContainer is 0 for top-level comments, non-zero for replies
      const parentId = parentIdFromContainer !== 0 ? parentIdFromContainer : null;

      // Build comment URL
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const url = `${cleanBaseUrl}/comment-page-${pageNumber}/#comment-${commentId}`;

      const comment: ScrapedComment = {
        id: commentId,
        pageNumber,
        author,
        content,
        timestamp,
        parentId,
        url
      };

      comments.push(comment);

      if (parentId) {
        logger.debug(`Parsed REPLY comment ${commentId} (parent: ${parentId})`, { author });
      } else {
        logger.debug(`Parsed top-level comment ${commentId}`, { author });
      }

    } catch (error) {
      logger.error('Error parsing comment', { error });
    }
  });

  const topLevelCount = comments.filter(c => !c.parentId).length;
  const replyCount = comments.filter(c => c.parentId).length;

  logger.info(`Parsed ${comments.length} comments from page ${pageNumber} (${topLevelCount} top-level, ${replyCount} replies)`);
  return comments;
}

/**
 * Parse comments from multiple pages
 */
export function parseMultiplePages(
  htmlPages: { html: string; pageNumber: number }[],
  baseUrl: string
): ScrapedComment[] {
  const allComments: ScrapedComment[] = [];

  for (const { html, pageNumber } of htmlPages) {
    const comments = parseComments(html, pageNumber, baseUrl);
    allComments.push(...comments);
  }

  logger.info(`Total parsed comments: ${allComments.length}`);
  return allComments;
}
