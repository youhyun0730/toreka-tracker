import { ScrapedComment } from '../types';
import { logger } from '../utils/logger';
import { fetchPage, fetchPages } from './fetcher';
import { detectLatestPageNumber, generatePageUrls } from './detector';
import { parseMultiplePages } from './parser';

/**
 * Scrape comments from the target website
 */
export async function scrapeComments(targetUrl: string): Promise<ScrapedComment[]> {
  try {
    logger.info('Starting scrape cycle', { targetUrl });

    // Step 1: Fetch the base page to detect latest page number
    logger.info('Fetching base page to detect latest page number');
    const baseHtml = await fetchPage(targetUrl);
    const latestPageNumber = detectLatestPageNumber(baseHtml);

    logger.info(`Latest page number detected: ${latestPageNumber}`);

    // Step 2: Generate URL for latest page only
    const pageUrls = generatePageUrls(targetUrl, latestPageNumber);

    // Step 3: Fetch the latest page only
    const htmlPages = await fetchPages(pageUrls);

    // Step 4: Parse comments from the latest page
    const pagesWithNumbers = htmlPages.map((html) => {
      // Only the latest page
      const pageNumber = latestPageNumber;
      return { html, pageNumber };
    });

    const comments = parseMultiplePages(pagesWithNumbers, targetUrl);

    logger.info(`Scrape cycle completed. Found ${comments.length} comments`);
    return comments;

  } catch (error) {
    logger.error('Error during scrape cycle', { error });
    throw error;
  }
}
