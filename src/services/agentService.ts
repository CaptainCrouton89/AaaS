import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";
import dotenv from "dotenv";
import { AgentType } from "../constants/agents";
import { getSystemPrompt } from "../lib/prompts/agent.prompt";
import { agentRepository } from "../repositories";
import { toolRegistry, ToolResult } from "../tools/async-tools/baseTool";
import {
  createAgentTool,
  createTaskTool,
  delegateTaskTool,
  deleteTaskTool,
  getSubtasksTool,
  getTasksByOwnerTool,
  getTaskTool,
  updateTaskTool,
} from "../tools/delegation";
import { Agent } from "../types/database";
import agentMessageHistoryService from "./agentMessageHistoryService";

dotenv.config();

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
  public async chatWithAgent(agentId: string, messages: CoreMessage[]) {
    console.log(`[chatWithAgent] Processing chat for agent: ${agentId}`);
    console.log(
      `[chatWithAgent] Received messages:`,
      JSON.stringify(messages, null, 2)
    );

    const agent = await this.getAgentById(agentId);

    if (!agent) {
      console.error(`[chatWithAgent] Agent not found with ID: ${agentId}`);
      throw new Error("Agent not found");
    }

    // Validate message format for Vercel AI SDK
    console.error(
      `[chatWithAgent] Messages is not an array. Type:`,
      typeof messages
    );

    try {
      // Generate a complete text response using OpenAI
      const result = await generateText({
        model: openai("gpt-4.1-nano"),
        system: getSystemPrompt(agent),
        messages: messages,
        tools: {
          helloWorld: toolRegistry
            .getTool("helloWorld")!
            .getSynchronousTool(agentId),
          deepSearch: toolRegistry
            .getTool("deepSearch")!
            .getSynchronousTool(agentId),
          createAgent: createAgentTool,
          createTask: createTaskTool,
          getTask: getTaskTool,
          updateTask: updateTaskTool,
          deleteTask: deleteTaskTool,
          getTasksByOwner: getTasksByOwnerTool,
          getSubtasksTool: getSubtasksTool,
          delegateTask: delegateTaskTool,
        },
        maxSteps: 10, // Allow multiple steps for tool use
      });

      console.log(
        `[chatWithAgent] Generated response: "${result.text.substring(
          0,
          100
        )}..."`
      );
      console.log(`[chatWithAgent] Usage:`, result.usage);

      // Store the message in the agent's message history
      await agentMessageHistoryService.addMessage(agentId, {
        role: "assistant",
        content: result.text,
      });

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

  public async handleWebhook(
    agentId: string,
    toolName: string,
    toolCallId: string,
    body: ToolResult
  ) {
    if (body.success) {
      const result = await this.sendMessageToAgent(agentId, {
        role: "user",
        content: `[${toolName}: ToolId: ${toolCallId}] Result: ${JSON.stringify(
          body.data,
          null,
          2
        )}`,
      });
      return result;
    } else {
      return {
        role: "user",
        content: `[${toolName}: ToolId: ${toolCallId}] Error: ${body.error}`,
      };
    }
  }

  /**
   * Store user message in the agent's history and get a response
   * @param agentId The agent ID
   * @param message The user message
   * @returns The agent's response
   */
  public async sendMessageToAgent(agentId: string, message: CoreMessage) {
    try {
      let existingMessages =
        await agentMessageHistoryService.getMessagesByAgentId(agentId);

      // Filter and repair message history if needed
      console.log(
        `[sendMessageToAgent] Adding user message to history:`,
        message
      );
      await agentMessageHistoryService.addMessage(agentId, message);

      // Send all messages to the agent for processing
      const updatedMessages = [...existingMessages, message];
      console.log(
        `[sendMessageToAgent] Sending ${updatedMessages.length} messages to agent`
      );

      const response = await this.chatWithAgent(agentId, updatedMessages);

      console.log(`[sendMessageToAgent] Received response from chat`);
      return response;
    } catch (error) {
      console.error("Error in sendMessageToAgent:", error);
      throw error;
    }
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
}

export default new AgentService();
