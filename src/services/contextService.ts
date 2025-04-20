import dotenv from "dotenv";
import { contextRepository } from "../repositories";
import { Context } from "../types/database";

dotenv.config();

/**
 * Service to handle context-related operations
 */
export class ContextService {
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
   * @returns The created context
   */
  public async createContext(context: Partial<Context>) {
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
   * Delete a context
   * @param contextId The context ID
   * @returns True if successfully deleted
   */
  public async deleteContext(contextId: string) {
    return await contextRepository.delete(contextId);
  }
}

export default new ContextService();
