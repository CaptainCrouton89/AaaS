import redisClient from "../lib/redis";
import { ToolResult } from "../tools/async-tools/baseTool";

/**
 * Interface for webhook data to be stored in the queue
 */
export interface WebhookQueueItem {
  toolName: string;
  toolCallId: string;
  body: ToolResult;
  timestamp: string;
}

/**
 * Repository for managing webhook queues in Redis
 */
export class WebhookQueueRepository {
  private readonly queueKeyPrefix = "agent:webhook:queue:";
  private readonly lockKeyPrefix = "agent:webhook:processing:";
  private readonly lockExpirySeconds = 60; // Lock expires after 60 seconds to prevent deadlocks

  /**
   * Add a webhook to an agent's queue
   * @param agentId The agent ID
   * @param webhookData The webhook data to queue
   * @returns True if successfully queued
   */
  async queueWebhook(
    agentId: string,
    webhookData: WebhookQueueItem
  ): Promise<boolean> {
    try {
      const queueKey = this.getQueueKey(agentId);
      await redisClient.rpush(queueKey, JSON.stringify(webhookData));
      return true;
    } catch (error) {
      console.error("Error queueing webhook:", error);
      return false;
    }
  }

  /**
   * Try to acquire the processing lock for an agent
   * @param agentId The agent ID
   * @returns True if lock was acquired, false if it already exists
   */
  async acquireAgentLock(agentId: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(agentId);
      const result = await redisClient.set(
        lockKey,
        "locked",
        "EX",
        this.lockExpirySeconds,
        "NX"
      );

      // If result is null, the key already exists (lock already held)
      return result === "OK";
    } catch (error) {
      console.error("Error acquiring agent lock:", error);
      return false;
    }
  }

  /**
   * Release the processing lock for an agent
   * @param agentId The agent ID
   * @returns True if successfully released
   */
  async releaseAgentLock(agentId: string): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(agentId);
      await redisClient.del(lockKey);
      return true;
    } catch (error) {
      console.error("Error releasing agent lock:", error);
      return false;
    }
  }

  /**
   * Get the current length of an agent's webhook queue
   * @param agentId The agent ID
   * @returns The number of webhooks in the queue
   */
  async getQueueLength(agentId: string): Promise<number> {
    try {
      const queueKey = this.getQueueKey(agentId);
      return await redisClient.llen(queueKey);
    } catch (error) {
      console.error("Error getting queue length:", error);
      return 0;
    }
  }

  /**
   * Remove and return the oldest webhook from an agent's queue
   * @param agentId The agent ID
   * @returns The webhook data or null if queue is empty
   */
  async dequeueWebhook(agentId: string): Promise<WebhookQueueItem | null> {
    try {
      const queueKey = this.getQueueKey(agentId);
      const webhookData = await redisClient.lpop(queueKey);

      if (!webhookData) {
        return null;
      }

      return JSON.parse(webhookData) as WebhookQueueItem;
    } catch (error) {
      console.error("Error dequeuing webhook:", error);
      return null;
    }
  }

  /**
   * Get the Redis key for an agent's webhook queue
   * @param agentId The agent ID
   * @returns The Redis key
   */
  private getQueueKey(agentId: string): string {
    return `${this.queueKeyPrefix}${agentId}`;
  }

  /**
   * Get the Redis key for an agent's processing lock
   * @param agentId The agent ID
   * @returns The Redis key
   */
  private getLockKey(agentId: string): string {
    return `${this.lockKeyPrefix}${agentId}`;
  }
}

// Export singleton instance
export const webhookQueueRepository = new WebhookQueueRepository();
