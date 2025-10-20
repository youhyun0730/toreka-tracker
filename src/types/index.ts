/**
 * Scraped comment data from the website
 */
export interface ScrapedComment {
  id: number;
  pageNumber: number;
  author: string;
  content: string;
  timestamp: string;
  parentId: number | null;
  url: string;
}

/**
 * Comment stored in database
 */
export interface StoredComment extends ScrapedComment {
  firstSeenAt: Date;
}

/**
 * Configuration loaded from environment variables
 */
export interface Config {
  discordWebhookUrl: string;
  targetUrl: string;
  scrapeIntervalMinutes: number;
  dbPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: 'development' | 'production';
}

/**
 * Discord embed field
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord embed structure
 */
export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: DiscordEmbedField[];
  url: string;
  timestamp: string;
}

/**
 * Discord webhook payload
 */
export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}
