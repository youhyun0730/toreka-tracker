import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';

let sharedBrowser: Browser | null = null;

/**
 * Get or create a persistent browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }

  logger.info('Launching persistent browser instance');
  sharedBrowser = await puppeteer.launch({
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
      '--single-process',
      '--disable-features=site-per-process',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-dbus',
      '--no-service-autorun',
      '--password-store=basic',
      '--use-mock-keychain'
    ],
    executablePath: '/usr/bin/chromium'
  });

  return sharedBrowser;
}

/**
 * Close the persistent browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    logger.info('Browser instance closed');
  }
}

/**
 * Fetch HTML content using Puppeteer (renders JavaScript)
 * Uses persistent browser instance for better performance
 */
async function fetchPageWithPuppeteer(url: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {

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

    if (replyButtons.length > 0) {
      // Click all buttons quickly without waiting
      for (const button of replyButtons) {
        try {
          await button.click();
        } catch (error) {
          logger.debug('Failed to click reply button, continuing...');
        }
      }

      // Wait for network to be idle after all clicks
      logger.debug('Waiting for replies to load...');
      await page.waitForNetworkIdle({ timeout: 30000, idleTime: 1000 });
      logger.debug('All replies loaded');
    }

    // Get the HTML content
    const html = await page.content();

    return html;
  } finally {
    // Close only the page, keep browser alive
    await page.close();
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
 * Fetch multiple pages sequentially (to avoid memory/timeout issues on low-spec servers)
 */
export async function fetchPages(urls: string[]): Promise<string[]> {
  logger.info(`Fetching ${urls.length} pages sequentially`);

  const results: string[] = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      logger.debug(`Fetching page ${i + 1}/${urls.length}: ${urls[i]}`);
      const html = await fetchPage(urls[i]);
      results.push(html);

      // Small delay between fetches to reduce load
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info(`Successfully fetched all ${urls.length} pages`);
    return results;
  } catch (error) {
    logger.error('Error fetching pages sequentially', { error });
    throw error;
  }
}
