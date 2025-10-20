import { Config } from '../types';

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const required = [
    'DISCORD_WEBHOOK_URL',
    'TARGET_URL'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevel}`);
  }

  const nodeEnv = (process.env.NODE_ENV || 'production').toLowerCase();
  if (!['development', 'production'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }

  return {
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    targetUrl: process.env.TARGET_URL!,
    scrapeIntervalMinutes: parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '1', 10),
    dbPath: process.env.DB_PATH || './data/comments.db',
    logLevel: logLevel as Config['logLevel'],
    nodeEnv: nodeEnv as Config['nodeEnv']
  };
}
