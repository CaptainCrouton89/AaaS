import { supabase } from "../lib/supabase";
import { ProgrammingTask } from "../types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository for ProgrammingTask-related database operations
 */
export class ProgrammingTaskRepository
  implements BaseRepository<ProgrammingTask>
{
  /**
   * Find a programming task by its ID
   * @param id The programming task ID
   * @returns The programming task or null if not found
   */
  async findById(id: string): Promise<ProgrammingTask | null> {
    const { data, error } = await supabase
      .from("programming_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching programming task:", error);
      return null;
    }

    return data;
  }

  /**
   * Get all programming tasks
   * @returns An array of all programming tasks
   */
  async findAll(): Promise<ProgrammingTask[]> {
    const { data, error } = await supabase
      .from("programming_tasks")
      .select("*");

    if (error) {
      console.error("Error fetching programming tasks:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new programming task
   * @param data The programming task data
   * @returns The created programming task
   */
  async create(data: Partial<ProgrammingTask>): Promise<ProgrammingTask> {
    const { data: newTask, error } = await supabase
      .from("programming_tasks")
      .insert(data)
      .select()
      .single();

    if (error || !newTask) {
      console.error("Error creating programming task:", error);
      throw new Error(`Failed to create programming task: ${error?.message}`);
    }

    return newTask;
  }

  /**
   * Update an existing programming task
   * @param id The programming task ID
   * @param data The updated programming task data
   * @returns The updated programming task or null if not found
   */
  async update(
    id: string,
    data: Partial<ProgrammingTask>
  ): Promise<ProgrammingTask | null> {
    const { data: updatedTask, error } = await supabase
      .from("programming_tasks")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating programming task:", error);
      return null;
    }

    return updatedTask;
  }

  /**
   * Delete a programming task
   * @param id The programming task ID
   * @returns True if successfully deleted
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("programming_tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting programming task:", error);
      return false;
    }

    return true;
  }

  /**
   * Find programming tasks by task ID
   * @param taskId The task ID
   * @returns Array of programming tasks
   */
  async findByTaskId(taskId: string): Promise<ProgrammingTask[]> {
    const { data, error } = await supabase
      .from("programming_tasks")
      .select("*")
      .eq("task_id", taskId);

    if (error) {
      console.error("Error fetching programming tasks by task ID:", error);
      return [];
    }

    return data || [];
  }
}

// Export singleton instance
export const programmingTaskRepository = new ProgrammingTaskRepository();
