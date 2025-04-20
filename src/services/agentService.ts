import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";
import dotenv from "dotenv";
import { AgentType } from "../constants/agents";
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
    description: string,
    agentType: AgentType,
    background: string
  ) {
    return await agentRepository.create({
      title: name,
      goal: description,
      agent_type: agentType,
      background: background,
    });
  }

  /**
   * Validates and filters a message array
   * @param messages The messages to validate
   * @returns Filtered and validated array of CoreMessage objects
   */
  private validateAndFilterMessages(messages: any[]): CoreMessage[] {
    // Filter out completely invalid messages
    const filteredMessages = this.filterValidMessageObjects(messages);

    // Ensure remaining messages are in correct format
    const validatedMessages: CoreMessage[] = filteredMessages
      .filter((msg) => this.hasRequiredMessageProperties(msg))
      .map((msg) => this.createValidatedMessage(msg));

    // Ensure there's at least one message
    if (validatedMessages.length === 0) {
      console.warn(
        `[validateMessages] No valid messages after filtering. Adding a default user message.`
      );
      validatedMessages.push(this.createDefaultMessage());
    }

    return validatedMessages;
  }

  /**
   * Filters out invalid message objects
   * @param messages Array of potential message objects
   * @returns Array of valid message objects
   */
  private filterValidMessageObjects(messages: any[]): any[] {
    const filteredMessages = messages.filter((msg) => {
      const isValid = msg && typeof msg === "object";
      if (!isValid) {
        console.warn(
          `[filterValidMessageObjects] Filtering out invalid message object:`,
          msg
        );
      }
      return isValid;
    });

    if (filteredMessages.length !== messages.length) {
      console.log(
        `[filterValidMessageObjects] Filtered out ${
          messages.length - filteredMessages.length
        } invalid message objects`
      );
    }

    return filteredMessages;
  }

  /**
   * Checks if a message has all required properties
   * @param msg The message to check
   * @returns True if the message has all required properties
   */
  private hasRequiredMessageProperties(msg: any): boolean {
    const isValid = msg.role && msg.content !== undefined;
    if (!isValid) {
      console.warn(
        `[hasRequiredMessageProperties] Filtering out message with missing properties:`,
        JSON.stringify(msg)
      );
    }
    return isValid;
  }

  /**
   * Creates a properly validated message object
   * @param msg The message to validate
   * @returns A validated CoreMessage
   */
  private createValidatedMessage(msg: any): CoreMessage {
    let validMsg: CoreMessage;

    // Ensure role is valid
    if (
      msg.role !== "user" &&
      msg.role !== "assistant" &&
      msg.role !== "system"
    ) {
      console.warn(
        `[createValidatedMessage] Invalid message role: ${msg.role}, defaulting to "user"`
      );
      validMsg = {
        role: "user",
        content:
          typeof msg.content === "string" ? msg.content : String(msg.content),
      };
    } else if (typeof msg.content !== "string") {
      // Ensure content is a string (Vercel AI SDK requirement)
      console.warn(
        `[createValidatedMessage] Message content is not a string, converting:`,
        msg.content
      );
      validMsg = {
        role: msg.role,
        content: String(msg.content),
      };
    } else {
      // Message is already valid
      validMsg = {
        role: msg.role,
        content: msg.content,
      };
    }

    return validMsg;
  }

  /**
   * Creates a default message when no valid messages are found
   * @returns A default user message
   */
  private createDefaultMessage(): CoreMessage {
    return {
      role: "user",
      content: "Hello",
    };
  }

  /**
   * Filters and repairs a message history
   * @param agentId Agent ID
   * @param messages Messages to filter and repair
   * @returns Cleaned message array
   */
  private async repairMessageHistory(
    agentId: string,
    messages: any[]
  ): Promise<CoreMessage[]> {
    const validMessages = messages.filter((msg) => {
      const isValid = msg && msg.role && msg.content !== undefined;
      if (!isValid) {
        console.warn(
          `[repairMessageHistory] Filtering out invalid message:`,
          JSON.stringify(msg)
        );
      }
      return isValid;
    });

    if (validMessages.length !== messages.length) {
      console.log(
        `[repairMessageHistory] Filtered out ${
          messages.length - validMessages.length
        } invalid messages`
      );

      // Update the stored messages to clean up the history
      await agentMessageHistoryService.storeMessages(agentId, validMessages);
      console.log(
        `[repairMessageHistory] Updated message history with only valid messages`
      );
    }

    return validMessages;
  }

  /**
   * Process a chat with the agent
   * @param agentId The agent ID
   * @param messages Previous message history
   * @returns A complete text response from the agent
   */
  public async chatWithAgent(agentId: string, messages: CoreMessage[]) {
    try {
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
      if (!Array.isArray(messages)) {
        console.error(
          `[chatWithAgent] Messages is not an array. Type:`,
          typeof messages
        );
        throw new Error("Messages must be an array");
      }

      // Validate and filter messages
      const validatedMessages = this.validateAndFilterMessages(messages);

      console.log(
        `[chatWithAgent] Generating response with ${validatedMessages.length} messages`
      );

      // Generate a complete text response using OpenAI
      const result = await generateText({
        model: openai("gpt-4.1-nano"),
        system: agent.background || "",
        messages: validatedMessages,
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
        content: `[${toolName}: ToolId: ${toolCallId}] Result:\n${JSON.stringify(
          body,
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
      existingMessages = await this.repairMessageHistory(
        agentId,
        existingMessages
      );

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
