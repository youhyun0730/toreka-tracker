import { ScrapedComment } from '../types';
import { logger } from '../utils/logger';
import { fetchPage } from './fetcher';
import { parseMultiplePages } from './parser';

/**
 * Scrape comments from the target website
 */
export async function scrapeComments(targetUrl: string): Promise<ScrapedComment[]> {
  try {
    logger.info('Starting scrape cycle', { targetUrl });

    // Fetch the base page (which shows the latest comments automatically)
    logger.info('Fetching latest comments page');
    const html = await fetchPage(targetUrl);

    // Parse comments from the page
    const comments = parseMultiplePages([{ html, pageNumber: 1 }], targetUrl);

    logger.info(`Scrape cycle completed. Found ${comments.length} comments`);
    return comments;

  } catch (error) {
    logger.error('Error during scrape cycle', { error });
    throw error;
  }
}
