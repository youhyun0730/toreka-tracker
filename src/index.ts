import * as cron from 'node-cron';
import { loadConfig } from './utils/config';
import { initLogger, logger } from './utils/logger';
import { initDatabase, closeDatabase } from './database/db';
import { getNewComments, insertComments, getCommentCount } from './database/repository';
import { scrapeComments } from './scraper';
import { sendNotifications } from './notifier/webhook';
import { closeBrowser } from './scraper/fetcher';

// Load environment variables from .env file if in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch {
    // dotenv not installed in production
  }
}

/**
 * Main monitoring task
 */
async function monitorComments(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('='.repeat(60));
    logger.info('Starting monitoring cycle');

    const config = loadConfig();

    // Step 1: Scrape comments
    const scrapedComments = await scrapeComments(config.targetUrl);

    if (scrapedComments.length === 0) {
      logger.warn('No comments scraped, skipping cycle');
      return;
    }

    // Step 2: Check for new comments
    const newComments = getNewComments(scrapedComments);

    if (newComments.length === 0) {
      logger.info('No new comments found');
    } else {
      logger.info(`Found ${newComments.length} new comments!`);

      // Step 3: Insert new comments into database
      insertComments(newComments);

      // Step 4: Send Discord notifications
      await sendNotifications(config.discordWebhookUrl, newComments);
    }

    // Log statistics
    const totalComments = getCommentCount();
    const duration = Date.now() - startTime;

    logger.info('Monitoring cycle completed', {
      duration: `${duration}ms`,
      scraped: scrapedComments.length,
      new: newComments.length,
      total: totalComments
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in monitoring cycle', {
      error,
      duration: `${duration}ms`
    });
  } finally {
    logger.info('='.repeat(60));
  }
}

/**
 * Initialize and start the application
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig();

    // Initialize logger
    initLogger(config);

    logger.info('Starting Toreka Tracker');
    logger.info('Configuration:', {
      targetUrl: config.targetUrl,
      scrapeInterval: `${config.scrapeIntervalMinutes} minutes`,
      dbPath: config.dbPath,
      nodeEnv: config.nodeEnv
    });

    // Initialize database
    initDatabase(config.dbPath);

    // Run once immediately on startup
    logger.info('Running initial monitoring cycle...');
    await monitorComments();

    // Schedule periodic monitoring
    const cronExpression = `*/${config.scrapeIntervalMinutes} * * * *`;
    logger.info(`Scheduling monitoring task: ${cronExpression}`);

    cron.schedule(cronExpression, async () => {
      await monitorComments();
    });

    logger.info('Toreka Tracker is now running');
    logger.info(`Monitoring every ${config.scrapeIntervalMinutes} minute(s)`);

  } catch (error) {
    logger.error('Fatal error during initialization', { error });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      await closeBrowser();
      closeDatabase();
      logger.info('Cleanup completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error });
    await closeBrowser();
    closeDatabase();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled promise rejection', { reason });
    await closeBrowser();
    closeDatabase();
    process.exit(1);
  });
}

// Setup graceful shutdown
setupGracefulShutdown();

// Start the application
main().catch((error) => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});
