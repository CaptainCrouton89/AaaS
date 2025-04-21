import dotenv from "dotenv";
import { contextRepository } from "../repositories";
import { Context, ContextInsert } from "../types/database";
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
}

export default new ContextService();
