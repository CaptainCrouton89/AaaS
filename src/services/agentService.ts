import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";
import { AgentType } from "../constants/agents";
import {
  getAgentTools,
  getBaseSystemPrompt,
} from "../lib/prompts/agent.prompt";
import { agentRepository } from "../repositories";
import { ToolResult } from "../tools/async-tools/baseTool";
import { Agent, AgentWithTasksAndContext, Task } from "../types/database";
import { AsyncToolResponse } from "../types/dto";
import agentMessageHistoryService from "./agentMessageHistoryService";
import { contextService } from "./index";
import taskService from "./taskService";

interface WebhookJob {
  toolName: string;
  toolCallId: string;
  body: ToolResult;
}

const getAsyncToolResponseFromWebhookJob = (
  webhookJob: WebhookJob
): AsyncToolResponse => {
  return {
    success: webhookJob.body.success,
    toolName: webhookJob.toolName,
    toolCallId: webhookJob.toolCallId,
    data: webhookJob.body.data,
    error: webhookJob.body.error,
  };
};

/**
 * Service to handle agent chat interactions using Vercel AI SDK
 */
export class AgentService {
  /**
   * Create an agent
   * @param name The agent name
   * @param description The agent description
   * @param agentType The agent type
   * @param background Additional background information for the agent
   * @param ownerId The ID of the owner
   * @returns The created agent
   */
  public async createAgent(
    ownerId: string = "system",
    name: string,
    goal: string,
    agentType: AgentType,
    background: string,
    contextId: string | undefined = undefined
  ) {
    if (!contextId) {
      const newContext = await contextService.createContext({}, ownerId);
      contextId = newContext.id;
    }

    return await agentRepository.create({
      title: name,
      goal: goal,
      agent_type: agentType,
      background: background,
      owner: ownerId,
      context_id: contextId,
    });
  }

  /**
   * Process a chat with the agent
   * @param agentId The agent ID
   * @param messages Previous message history
   * @returns A complete text response from the agent
   */
  public async chatWithAgent(agentId: string, message: CoreMessage) {
    console.log(`[chatWithAgent] Processing chat for agent: ${agentId}`);
    console.log(
      `[chatWithAgent] Received message:`,
      JSON.stringify(message, null, 2)
    );

    const agent = await this.getAgentById(agentId);

    if (!agent) {
      console.error(`[chatWithAgent] Agent not found with ID: ${agentId}`);
      throw new Error("Agent not found");
    }

    let existingMessages =
      await agentMessageHistoryService.getMessagesByAgentId(agentId);

    console.log("agent owner", agent.owner);

    try {
      // Generate a complete text response using OpenAI
      const result = await generateText({
        model: openai("gpt-4.1-nano"),
        system: getBaseSystemPrompt(agent),
        messages: [...existingMessages, message],
        tools: getAgentTools(agent),
        maxSteps: 100, // Allow multiple steps for tool use
      });

      const { text, usage, response } = result;

      console.log(
        `[chatWithAgent] Generated response: "${text.substring(0, 100)}..."`
      );
      console.log(`[chatWithAgent] Usage:`, usage);

      console.warn("response", JSON.stringify(response.messages, null, 2));

      // Store the message in the agent's message history
      await agentMessageHistoryService.addMessages(agentId, [
        message,
        ...response.messages,
      ]);

      return result;
    } catch (error) {
      console.error("Error in chatWithAgent:", error);
      throw error;
    }
  }

  /**
   * Get an agent by its ID
   * @param agentId The agent ID
   * @returns The agent or null if not found
   */
  public async getAgentById(
    agentId: string
  ): Promise<AgentWithTasksAndContext | null> {
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }
    if (!agent.context_id) {
      throw new Error("Agent has no context");
    }
    const context = await contextService.getContextById(agent.context_id);

    if (!context) {
      throw new Error("Agent has no context");
    }

    const tasks = await taskService.getTasksByOwnerId(agentId);

    return { ...agent, context, tasks };
  }

  /**
   * Get an agent by its ID along with its message history
   * @param agentId The agent ID
   * @returns The agent with message history or null if not found
   */
  public async getAgentWithMessageHistory(
    agentId: string
  ): Promise<{ agent: Agent; messageHistory: CoreMessage[] } | null> {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      return null;
    }

    const messageHistory =
      await agentMessageHistoryService.getMessagesByAgentId(agentId);

    return {
      agent,
      messageHistory,
    };
  }

  public async handleWebhook(agentId: string, webhookJob: WebhookJob) {
    return await this.chatWithAgent(agentId, {
      role: "user",
      content: `${JSON.stringify(
        [getAsyncToolResponseFromWebhookJob(webhookJob)],
        null,
        2
      )}`,
    });
  }

  public async handleWebhooks(agentId: string, webhookJobs: WebhookJob[]) {
    const content: AsyncToolResponse[] = [];
    for (const job of webhookJobs) {
      content.push(getAsyncToolResponseFromWebhookJob(job));
    }

    return await this.chatWithAgent(agentId, {
      role: "user",
      content: JSON.stringify(content, null, 2),
    });
  }

  /**
   * Store multiple messages in the agent's history
   * @param agentId The agent ID
   * @param messages The messages to store
   * @returns True if successfully stored
   */
  public async storeMessagesInHistory(
    agentId: string,
    messages: CoreMessage[]
  ) {
    return await agentMessageHistoryService.storeMessages(agentId, messages);
  }

  /**
   * Clear message history for an agent
   * @param agentId The agent ID
   * @returns True if successfully cleared
   */
  public async clearMessageHistory(agentId: string): Promise<boolean> {
    try {
      console.log(
        `[clearMessageHistory] Clearing message history for agent: ${agentId}`
      );
      return await agentMessageHistoryService.clearMessages(agentId);
    } catch (error) {
      console.error("Error in clearMessageHistory:", error);
      return false;
    }
  }

  /**
   * Delete an agent and its message history
   * @param agentId The agent ID
   * @returns True if successfully deleted
   */
  public async deleteAgent(agentId: string): Promise<boolean> {
    try {
      // Find the agent first to make sure it exists
      const agent = await agentRepository.findById(agentId);

      if (!agent) {
        throw new Error("Agent not found");
      }

      // Clear message history first
      await agentMessageHistoryService.clearMessages(agentId);

      // Delete the agent
      const result = await agentRepository.delete(agentId);

      return result;
    } catch (error) {
      console.error(`Error deleting agent ${agentId}:`, error);
      throw new Error(
        `Failed to delete agent: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get all agents
   * @returns Array of all agents
   */
  public async getAllAgents(): Promise<Agent[]> {
    try {
      console.log(`[getAllAgents] Retrieving all agents`);
      return await agentRepository.findAll();
    } catch (error) {
      console.error("Error in getAllAgents:", error);
      throw error;
    }
  }

  /**
   * Get an agent by its ID along with its tasks
   * @param agentId The agent ID
   * @returns The agent and its tasks or null if not found
   */
  public async getAgentWithTasks(
    agentId: string
  ): Promise<{ agent: Agent; tasks: Task[] } | null> {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      return null;
    }

    const tasks = await taskService.getTasksByOwnerId(agentId);

    return { agent, tasks };
  }

  /**
   * Update an existing agent
   * @param agentId The agent ID
   * @param agentData The updated agent data
   * @returns The updated agent or null if not found
   */
  public async updateAgent(
    agentId: string,
    agentData: Partial<Agent>
  ): Promise<Agent | null> {
    try {
      console.log(`[updateAgent] Updating agent: ${agentId}`);
      const result = await agentRepository.update(agentId, agentData);
      return result;
    } catch (error) {
      console.error("Error in updateAgent:", error);
      throw error;
    }
  }
}

export default new AgentService();
