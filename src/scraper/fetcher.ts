import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';

/**
 * Close the browser instance (no-op now, kept for compatibility)
 */
export async function closeBrowser(): Promise<void> {
  // Browser is now closed after each fetch, so this is a no-op
  logger.debug('closeBrowser called (no-op in optimized mode)');
}

/**
 * Fetch HTML content using Puppeteer (renders JavaScript)
 * Opens and closes browser for each fetch to minimize memory usage
 */
async function fetchPageWithPuppeteer(url: string): Promise<string> {
  let browser: Browser | null = null;

  try {
    logger.debug('Launching temporary browser instance');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--single-process', // Single process mode saves memory
        '--disable-features=site-per-process',
        // Fix DBus errors
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-dbus',
        '--no-service-autorun',
        '--password-store=basic',
        '--use-mock-keychain'
      ],
      executablePath: '/usr/bin/chromium'
    });

    const page = await browser.newPage();

    // Set viewport to minimal size to save memory
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Block unnecessary resources to save bandwidth and memory
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block images, fonts, stylesheets to save memory
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to page with minimal waiting
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Faster than networkidle0
      timeout: 60000 // Increase timeout to 60 seconds for slow servers
    });

    // Wait for comments to load
    await page.waitForSelector('div[id^="wpd-comm-"]', { timeout: 20000 });

    // Click all "View Replies" buttons to expand nested comments
    logger.debug('Expanding all reply comments...');

    const replyButtons = await page.$$('div.wpd-toggle.wpd_not_clicked');
    logger.debug(`Found ${replyButtons.length} collapsed reply sections`);

    // Click buttons in batches to reduce memory spikes
    for (const button of replyButtons) {
      try {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.debug('Failed to click reply button, continuing...');
      }
    }

    // Short wait for content to load
    await new Promise(resolve => setTimeout(resolve, 800));

    // Get the HTML content
    const html = await page.content();

    return html;
  } finally {
    // Always close browser to free memory
    if (browser) {
      await browser.close();
      logger.debug('Browser instance closed, memory freed');
    }
  }
}

/**
 * Fetch HTML content from a URL with retry logic
 */
export async function fetchPage(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Fetching page with Puppeteer: ${url} (attempt ${attempt}/${retries})`);

      const html = await fetchPageWithPuppeteer(url);

      logger.debug(`Successfully fetched page: ${url}`);
      return html;
    } catch (error) {
      const err = error as Error;

      if (attempt === retries) {
        logger.error(`Failed to fetch page after ${retries} attempts: ${url}`, {
          error: err.message
        });
        throw new Error(`Failed to fetch ${url}: ${err.message}`);
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
