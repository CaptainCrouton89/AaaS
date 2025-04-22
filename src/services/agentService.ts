import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText, StepResult, ToolSet } from "ai";
import {
  getAgentTools,
  getInitializationPrompt,
} from "../lib/prompts/agent.prompt";
import { getBaseSystemPrompt } from "../lib/prompts/baseAgent.system.prompt";
import { agentRepository } from "../repositories";
import { ToolResult } from "../tools/async-tools/baseTool";
import { Agent, AgentInsert, AgentWithTasks, Task } from "../types/database";
import agentMessageHistoryService from "./agentMessageHistoryService";
import taskService from "./taskService";

interface WebhookJob {
  toolName: string;
  toolCallId: string;
  body: ToolResult;
}

const getAsyncToolResponseFromWebhookJob = (webhookJob: WebhookJob) => {
  return {
    success: webhookJob.body.success,
    toolName: webhookJob.toolName,
    toolCallId: webhookJob.toolCallId,
    data: webhookJob.body.data,
    nextSteps: webhookJob.body.nextSteps,
  };
};

/**
 * Helper function to safely get a message ID, handling different message types
 * @param message The message to get ID from
 * @returns The message ID or undefined if not present
 */
const getMessageId = (message: CoreMessage): string | undefined => {
  // Check if the message has an id property
  return (message as any).id;
};

/**
 * Service to handle agent chat interactions using Vercel AI SDK
 */
export class AgentService {
  /**
   * Create an agent
   * @param data The agent data
   * @returns The created agent
   */
  public async createAgent(data: AgentInsert) {
    return await agentRepository.create(data);
  }

  public async initializeAgent(agentId: string) {
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    await this.chatWithAgent(agentId, {
      role: "user",
      content: getInitializationPrompt(agent),
    });

    await this.chatWithAgent(agentId, {
      role: "user",
      content: `Begin working on your tasks.`,
    });
  }

  public async sendMessageFromAgentToAgent(
    fromAgentId: string,
    toAgentId: string,
    message: string
  ) {
    const fromAgent = await this.getAgentById(fromAgentId);
    const toAgent = await this.getAgentById(toAgentId);

    if (!fromAgent) {
      throw new Error(`From agent not found: ${fromAgentId}`);
    }

    if (!toAgent) {
      throw new Error(`To agent not found: ${toAgentId}`);
    }

    return await this.chatWithAgent(toAgentId, {
      role: "user",
      content: `Team Member ${fromAgentId} said: ${message}`,
    });
  }

  /**
   * Process a chat with the agent
   * @param agentId The agent ID
   * @param messages Previous message history
   * @returns A complete text response from the agent
   */
  public async chatWithAgent(
    agentId: string,
    message: CoreMessage,
    nextSteps?: string
  ) {
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

    console.log("Sending new message", message);

    // First store the user message right away
    await agentMessageHistoryService.addMessages(agentId, [message]);

    // Track stored message IDs to prevent duplicates
    const storedMessageIds = new Set<string>();

    let alteredMessage: CoreMessage | undefined = message;
    if (message.role === "user" && nextSteps) {
      alteredMessage = {
        ...message,
        content: message.content + "\n\n" + "Next steps: " + nextSteps,
      };
    }

    try {
      // Generate a complete text response using OpenAI
      const result = await generateText({
        model: openai("gpt-4.1-nano"),
        system: getBaseSystemPrompt(agent),
        temperature: 0.2,
        messages: [...existingMessages, alteredMessage],
        tools: getAgentTools(agent),
        maxSteps: 500, // Allow multiple steps for tool use
        onStepFinish: async (step: StepResult<ToolSet>) => {
          console.log("step finished", JSON.stringify(step, null, 2));

          // Store step messages in history as they become available
          if (step.response.messages && step.response.messages.length > 0) {
            // Filter out messages that have already been stored
            const newMessages = step.response.messages.filter((msg) => {
              const id = getMessageId(msg);
              if (!id) return true;
              if (storedMessageIds.has(id)) return false;
              storedMessageIds.add(id);
              return true;
            });
            await agentMessageHistoryService.addMessages(agentId, newMessages);
          }
        },
      });

      const { text, usage, response } = result;
      console.log(`[chatWithAgent] Usage:`, usage);
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
  public async getAgentById(agentId: string): Promise<AgentWithTasks | null> {
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const tasks = await taskService.getTasksByOwnerId(agentId);

    return { ...agent, tasks };
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
    return await this.chatWithAgent(
      agentId,
      {
        role: "user",
        content: `${JSON.stringify(
          [getAsyncToolResponseFromWebhookJob(webhookJob)],
          null,
          2
        )}`,
      },
      webhookJob.body.nextSteps
    );
  }

  public async handleWebhooks(agentId: string, webhookJobs: WebhookJob[]) {
    const content = [];
    for (const job of webhookJobs) {
      content.push(getAsyncToolResponseFromWebhookJob(job));
    }

    return await this.chatWithAgent(
      agentId,
      {
        role: "user",
        content: JSON.stringify(content, null, 2),
      },
      webhookJobs.map((job) => job.body.nextSteps).join("\n")
    );
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

  public async appendToLogs(agentId: string, message: string) {
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const logs = agent.logs?.split("\n") || [];
    logs.push(`${new Date().toISOString().split("T")[0]}: ${message}`);

    const newLogs = logs.slice(-50);

    await this.updateAgent(agentId, {
      logs: newLogs?.join("\n"),
    });
  }
}

export default new AgentService();
