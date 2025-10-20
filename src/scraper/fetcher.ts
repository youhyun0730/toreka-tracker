import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

/**
 * Fetch HTML content from a URL with retry logic
 */
export async function fetchPage(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Fetching page: ${url} (attempt ${attempt}/${retries})`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      logger.debug(`Successfully fetched page: ${url}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (attempt === retries) {
        logger.error(`Failed to fetch page after ${retries} attempts: ${url}`, {
          error: axiosError.message,
          status: axiosError.response?.status
        });
        throw new Error(`Failed to fetch ${url}: ${axiosError.message}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Retrying fetch in ${delay}ms...`, { url, attempt });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unexpected error in fetchPage');
}

/**
 * Fetch multiple pages in parallel
 */
export async function fetchPages(urls: string[]): Promise<string[]> {
  logger.info(`Fetching ${urls.length} pages in parallel`);

  try {
    const results = await Promise.all(
      urls.map(url => fetchPage(url))
    );

    logger.info(`Successfully fetched all ${urls.length} pages`);
    return results;
  } catch (error) {
    logger.error('Error fetching pages in parallel', { error });
    throw error;
  }
}
