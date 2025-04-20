import { CoreMessage } from "ai";
import redisClient from "../lib/redis";

/**
 * Repository for storing agent message history in Redis using CoreMessage format
 */
export class AgentMessageHistoryRedisRepository {
  private readonly keyPrefix = "agent:message:history:";

  /**
   * Get message history for an agent
   * @param agentId The agent ID
   * @returns Array of CoreMessage objects for the specified agent
   */
  async getMessagesByAgentId(agentId: string): Promise<CoreMessage[]> {
    try {
      const key = this.getRedisKey(agentId);
      const messageHistory = await redisClient.get(key);

      if (!messageHistory) {
        return [];
      }

      return JSON.parse(messageHistory) as CoreMessage[];
    } catch (error) {
      console.error("Error fetching message history from Redis:", error);
      return [];
    }
  }

  /**
   * Store the entire message history for an agent
   * @param agentId The agent ID
   * @param messages Array of CoreMessage objects
   * @returns True if successfully stored
   */
  async storeMessages(
    agentId: string,
    messages: CoreMessage[]
  ): Promise<boolean> {
    try {
      const key = this.getRedisKey(agentId);
      await redisClient.set(key, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error("Error storing messages in Redis:", error);
      return false;
    }
  }

  /**
   * Add a single message to the agent's message history
   * @param agentId The agent ID
   * @param message The CoreMessage to add
   * @returns True if successfully added
   */
  async addMessage(agentId: string, message: CoreMessage): Promise<boolean> {
    try {
      const existingMessages = await this.getMessagesByAgentId(agentId);
      const updatedMessages = [...existingMessages, message];
      return await this.storeMessages(agentId, updatedMessages);
    } catch (error) {
      console.error("Error adding message to Redis:", error);
      return false;
    }
  }

  /**
   * Add multiple messages to the agent's message history
   * @param agentId The agent ID
   * @param messages Array of CoreMessage objects to add
   * @returns True if successfully added
   */
  async addMessages(
    agentId: string,
    messages: CoreMessage[]
  ): Promise<boolean> {
    try {
      const existingMessages = await this.getMessagesByAgentId(agentId);
      const updatedMessages = [...existingMessages, ...messages];
      return await this.storeMessages(agentId, updatedMessages);
    } catch (error) {
      console.error("Error adding messages to Redis:", error);
      return false;
    }
  }

  /**
   * Clear message history for an agent
   * @param agentId The agent ID
   * @returns True if successfully cleared
   */
  async clearMessages(agentId: string): Promise<boolean> {
    try {
      const key = this.getRedisKey(agentId);
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error("Error clearing message history from Redis:", error);
      return false;
    }
  }

  /**
   * Get the Redis key for storing agent message history
   * @param agentId The agent ID
   * @returns The Redis key
   */
  private getRedisKey(agentId: string): string {
    return `${this.keyPrefix}${agentId}`;
  }
}

// Export singleton instance
export const agentMessageHistoryRedisRepository =
  new AgentMessageHistoryRedisRepository();
