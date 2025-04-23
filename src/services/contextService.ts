import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import dotenv from "dotenv";
import { contextRepository } from "../repositories";
import { Context, ContextInsert } from "../types/database";
import agentMessageHistoryService from "./agentMessageHistoryService";
import agentService from "./agentService";
import taskService from "./taskService";

dotenv.config();

/**
 * Service to handle context-related operations
 */
export class ContextService {
  public async getAllContextsByAgentId(agentId: string) {
    const tasks = await taskService.getTasksByOwnerId(agentId);
    const allContext = [];
    for (const task of tasks) {
      const context = await this.getContextById(task.context_id);
      allContext.push(`<${task.title}> ${context?.text_data} </${task.title}>`);
    }
    return allContext.join("\n");
  }

  /**
   * Get a context by its ID
   * @param contextId The context ID
   * @returns The context or null if not found
   */
  public async getContextById(contextId: string) {
    return await contextRepository.findById(contextId);
  }

  /**
   * Get all contexts
   * @returns An array of all contexts
   */
  public async getAllContexts() {
    return await contextRepository.findAll();
  }

  /**
   * Create a new context
   * @param context The context data
   * @param ownerId The ID of the owner (defaults to "system")
   * @returns The created context
   */
  public async createContext(context: ContextInsert) {
    return await contextRepository.create(context);
  }

  /**
   * Update an existing context
   * @param contextId The context ID
   * @param context The updated context data
   * @returns The updated context or null if not found
   */
  public async updateContext(contextId: string, context: Partial<Context>) {
    return await contextRepository.update(contextId, context);
  }

  /**
   * Append text to a context
   * @param contextId The context ID
   * @param textData The text to append
   * @returns The updated context or null if not found
   */
  public async appendToContext(contextId: string, textData: string) {
    const context = await this.getContextById(contextId);
    if (!context) {
      throw new Error("Context not found");
    }
    const newTextData = context.text_data
      ? `${context.text_data}\n${textData}`
      : textData;

    return await contextRepository.update(contextId, {
      text_data: newTextData,
    });
  }

  /**
   * Delete a context
   * @param contextId The context ID
   * @returns True if successfully deleted
   */
  public async deleteContext(contextId: string) {
    return await contextRepository.delete(contextId);
  }

  public async condenseMemory(agentId: string) {
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const messageHistory =
      await agentMessageHistoryService.getMessagesByAgentId(agentId);

    const systemPrompt = `
You specialize in condensing memories into simplified forms.

    You will be given a message history. Summarize it in detail. Be sure to include any IDs and other specific details.
    `;

    const prompt = `
    Summarize this message history in detail. Include any IDs and other specific details.
    ${messageHistory.map((message) => message.content).join("\n")}
    `;

    const codensedMemory = await generateText({
      model: openai("gpt-4.1-nano"),
      system: systemPrompt,
      temperature: 0.2,
      prompt: prompt,
    });
  }
}

export default new ContextService();
