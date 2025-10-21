import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

/**
 * Detect the latest comment page number from HTML
 */
export function detectLatestPageNumber(html: string): number {
  const $ = cheerio.load(html);

  // Look for comment-page-XXX in URLs
  const commentPageRegex = /comment-page-(\d+)/g;
  const matches: number[] = [];

  // Search in all links and data attributes
  $('a[href*="comment-page-"], [data-wpd-clipboard*="comment-page-"]').each((_, elem) => {
    const href = $(elem).attr('href') || '';
    const clipboard = $(elem).attr('data-wpd-clipboard') || '';
    const text = href + clipboard;

    let match;
    while ((match = commentPageRegex.exec(text)) !== null) {
      matches.push(parseInt(match[1], 10));
    }
  });

  if (matches.length === 0) {
    logger.warn('No comment page numbers found in HTML, assuming page 1');
    return 1;
  }

  const latestPage = Math.max(...matches);
  logger.debug(`Detected latest page number: ${latestPage}`);

  return latestPage;
}

/**
 * Generate URL for the latest page only
 */
export function generatePageUrls(baseUrl: string, latestPageNumber: number): string[] {
  // Remove trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  const urls: string[] = [];

  // Latest page only (no previous page to save processing time)
  urls.push(`${cleanBaseUrl}/comment-page-${latestPageNumber}/`);

  logger.debug(`Generated page URL:`, urls);
  return urls;
}
