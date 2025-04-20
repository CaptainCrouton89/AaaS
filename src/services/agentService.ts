import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";
import { AgentType } from "../constants/agents";
import { getSystemPrompt } from "../lib/prompts/agent.prompt";
import { agentRepository } from "../repositories";
import { toolRegistry, ToolResult } from "../tools/async-tools/baseTool";
import {
  createTaskTool,
  delegateTaskTool,
  deleteTaskTool,
  getMessageTeamMemberTool,
  getSubtasksTool,
  getTasksByOwnerTool,
  getTaskTool,
  recruitTeamMemberTool,
  updateTaskTool,
} from "../tools/delegation";
import { Agent, Task } from "../types/database";
import { AsyncToolResponse } from "../types/dto";
import agentMessageHistoryService from "./agentMessageHistoryService";
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
   * @returns The created agent
   */
  public async createAgent(
    name: string,
    goal: string,
    agentType: AgentType,
    background: string
  ) {
    return await agentRepository.create({
      title: name,
      goal: goal,
      agent_type: agentType,
      background: background,
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

    try {
      // Generate a complete text response using OpenAI
      const result = await generateText({
        model: openai("gpt-4.1-nano"),
        system: getSystemPrompt(agent),
        messages: [...existingMessages, message],
        tools: {
          helloWorld: toolRegistry
            .getTool("helloWorld")!
            .getSynchronousTool(agentId),
          deepSearch: toolRegistry
            .getTool("deepSearch")!
            .getSynchronousTool(agentId),
          createAgent: recruitTeamMemberTool,
          createTask: createTaskTool,
          getTask: getTaskTool,
          updateTask: updateTaskTool,
          deleteTask: deleteTaskTool,
          getTasksByOwner: getTasksByOwnerTool,
          getSubtasksTool: getSubtasksTool,
          delegateTask: delegateTaskTool,
          messageTeamMember: getMessageTeamMemberTool(agentId),
        },
        maxSteps: 30, // Allow multiple steps for tool use
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
  public async getAgentById(agentId: string): Promise<Agent | null> {
    return await agentRepository.findById(agentId);
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
}

export default new AgentService();
