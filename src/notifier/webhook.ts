import axios, { AxiosError } from 'axios';
import { ScrapedComment, DiscordWebhookPayload, DiscordEmbed } from '../types';
import { logger } from '../utils/logger';

// Discord color codes
const COLORS = {
  NEW_COMMENT: 0x5865F2,  // Discord Blurple
  REPLY: 0x57F287         // Green
};

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create Discord embed for a new comment
 */
function createCommentEmbed(comment: ScrapedComment): DiscordEmbed {
  const isReply = comment.parentId !== null;

  const embed: DiscordEmbed = {
    title: isReply ? '💬 返信コメント' : '🆕 新規コメント',
    description: truncate(comment.content, 300),
    color: isReply ? COLORS.REPLY : COLORS.NEW_COMMENT,
    fields: [
      {
        name: '👤 投稿者',
        value: comment.author,
        inline: true
      },
      {
        name: '🕐 投稿時刻',
        value: comment.timestamp,
        inline: true
      }
    ],
    url: comment.url,
    timestamp: new Date().toISOString()
  };

  // Add parent comment info for replies
  if (isReply && comment.parentId) {
    embed.fields.push({
      name: '↩️ 返信先',
      value: `コメントID: ${comment.parentId}`,
      inline: false
    });
  }

  return embed;
}

/**
 * Send notification to Discord webhook
 */
export async function sendNotification(
  webhookUrl: string,
  comment: ScrapedComment,
  retries = 2
): Promise<void> {
  const embed = createCommentEmbed(comment);
  const payload: DiscordWebhookPayload = {
    embeds: [embed]
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Sending notification for comment ${comment.id} (attempt ${attempt}/${retries})`);

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info(`Successfully sent notification for comment ${comment.id}`);
      return;

    } catch (error) {
      const axiosError = error as AxiosError;

      if (attempt === retries) {
        logger.error(`Failed to send notification after ${retries} attempts`, {
          commentId: comment.id,
          error: axiosError.message,
          status: axiosError.response?.status
        });
        throw new Error(`Failed to send Discord notification: ${axiosError.message}`);
      }

      // Backoff before retry
      const delay = attempt * 2000;
      logger.warn(`Retrying notification in ${delay}ms...`, { commentId: comment.id, attempt });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Send notifications for multiple comments
 */
export async function sendNotifications(
  webhookUrl: string,
  comments: ScrapedComment[]
): Promise<void> {
  if (comments.length === 0) {
    logger.debug('No comments to notify');
    return;
  }

  logger.info(`Sending ${comments.length} notifications`);

  const results = await Promise.allSettled(
    comments.map(comment => sendNotification(webhookUrl, comment))
  );

  // Count successes and failures
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;

  logger.info(`Notification results: ${successCount} succeeded, ${failureCount} failed`);

  if (failureCount > 0) {
    logger.warn(`Some notifications failed`, { failureCount, totalCount: comments.length });
  }
}
