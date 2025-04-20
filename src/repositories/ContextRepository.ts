import { supabase } from "../lib/supabase";
import { Context } from "../types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository for Context-related database operations
 */
export class ContextRepository implements BaseRepository<Context> {
  /**
   * Find a context by its ID
   * @param id The context ID
   * @returns The context or null if not found
   */
  async findById(id: string): Promise<Context | null> {
    const { data, error } = await supabase
      .from("contexts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching context:", error);
      return null;
    }

    return data;
  }

  /**
   * Get all contexts
   * @returns An array of all contexts
   */
  async findAll(): Promise<Context[]> {
    const { data, error } = await supabase.from("contexts").select("*");

    if (error) {
      console.error("Error fetching contexts:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new context
   * @param data The context data
   * @returns The created context
   */
  async create(data: Partial<Context>): Promise<Context> {
    const { data: newContext, error } = await supabase
      .from("contexts")
      .insert(data)
      .select()
      .single();

    if (error || !newContext) {
      console.error("Error creating context:", error);
      throw new Error(`Failed to create context: ${error?.message}`);
    }

    return newContext;
  }

  /**
   * Update an existing context
   * @param id The context ID
   * @param data The updated context data
   * @returns The updated context or null if not found
   */
  async update(id: string, data: Partial<Context>): Promise<Context | null> {
    const { data: updatedContext, error } = await supabase
      .from("contexts")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating context:", error);
      return null;
    }

    return updatedContext;
  }

  /**
   * Delete a context
   * @param id The context ID
   * @returns True if successfully deleted
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("contexts").delete().eq("id", id);

    if (error) {
      console.error("Error deleting context:", error);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const contextRepository = new ContextRepository();
