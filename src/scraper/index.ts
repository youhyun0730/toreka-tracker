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

    // Step 2: Generate URLs for latest two pages
    const pageUrls = generatePageUrls(targetUrl, latestPageNumber);

    // Step 3: Fetch all pages in parallel
    const htmlPages = await fetchPages(pageUrls);

    // Step 4: Parse comments from all pages
    const pagesWithNumbers = htmlPages.map((html, index) => {
      // URLs are ordered: [latest, latest-1]
      const pageNumber = latestPageNumber - index;
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
