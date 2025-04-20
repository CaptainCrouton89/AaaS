import { CoreMessage } from "ai";
import dotenv from "dotenv";
import { agentMessageHistoryRedisRepository } from "../repositories/AgentMessageHistoryRedisRepository";

dotenv.config();

/**
 * Service to handle agent message history operations using Redis
 */
export class AgentMessageHistoryService {
  /**
   * Get all messages for a specific agent
   * @param agentId The agent ID
   * @returns Array of CoreMessage objects for the specified agent
   */
  public async getMessagesByAgentId(agentId: string): Promise<CoreMessage[]> {
    return await agentMessageHistoryRedisRepository.getMessagesByAgentId(
      agentId
    );
  }

  /**
   * Add a single message to the agent's history
   * @param agentId The agent ID
   * @param message The CoreMessage to add
   * @returns True if successfully added
   */
  public async addMessage(
    agentId: string,
    message: CoreMessage
  ): Promise<boolean> {
    return await agentMessageHistoryRedisRepository.addMessage(
      agentId,
      message
    );
  }

  /**
   * Add multiple messages to the agent's history
   * @param agentId The agent ID
   * @param messages Array of CoreMessage objects to add
   * @param ownerId The ID of the owner (defaults to "system")
   * @returns True if successfully added
   */
  public async addMessages(
    agentId: string,
    messages: CoreMessage[],
    ownerId: string = "system"
  ): Promise<boolean> {
    return await agentMessageHistoryRedisRepository.addMessages(
      agentId,
      messages,
      ownerId
    );
  }

  /**
   * Store the entire message history for an agent
   * @param agentId The agent ID
   * @param messages Array of CoreMessage objects
   * @returns True if successfully stored
   */
  public async storeMessages(
    agentId: string,
    messages: CoreMessage[]
  ): Promise<boolean> {
    return await agentMessageHistoryRedisRepository.storeMessages(
      agentId,
      messages
    );
  }

  /**
   * Clear message history for an agent
   * @param agentId The agent ID
   * @returns True if successfully cleared
   */
  public async clearMessages(agentId: string): Promise<boolean> {
    return await agentMessageHistoryRedisRepository.clearMessages(agentId);
  }
}

export default new AgentMessageHistoryService();
