import { supabase } from "../lib/supabase";
import {
  Task,
  TaskInsert,
  TaskWithContext,
  TaskWithSubTasks,
} from "../types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository for Task-related database operations
 */
export class TaskRepository implements BaseRepository<Task> {
  /**
   * Find a task by its ID
   * @param id The task ID
   * @returns The task or null if not found
   */
  async findById(id: string): Promise<TaskWithContext | null> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, context:contexts(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching task:", error);
      return null;
    }

    return data;
  }

  /**
   * Get all tasks
   * @returns An array of all tasks
   */
  async findAll(): Promise<Task[]> {
    const { data, error } = await supabase.from("tasks").select("*");

    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new task
   * @param data The task data
   * @returns The created task
   */
  async create(data: TaskInsert): Promise<Task> {
    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert(data)
      .select()
      .single();

    if (error || !newTask) {
      console.error("Error creating task:", error);
      throw new Error(`Failed to create task: ${error?.message}`);
    }

    return newTask;
  }

  /**
   * Update an existing task
   * @param id The task ID
   * @param data The updated task data
   * @returns The updated task or null if not found
   */
  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const { data: updatedTask, error } = await supabase
      .from("tasks")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return null;
    }

    return updatedTask;
  }

  /**
   * Delete a task
   * @param id The task ID
   * @returns True if successfully deleted
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      return false;
    }

    return true;
  }

  /**
   * Find tasks by owner (agent) ID
   * @param ownerId The owner (agent) ID
   * @returns Array of tasks owned by the specified agent
   */
  async findByOwnerId(ownerId: string): Promise<TaskWithSubTasks[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", ownerId)
      .is("parent_id", null); // Only fetch top-level tasks

    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    // Convert tasks to TaskWithSubTasks and fetch subtasks recursively
    const tasksWithSubtasks = await Promise.all(
      (data || []).map(async (task) => this.buildTaskWithSubtasks(task))
    );

    return tasksWithSubtasks;
  }

  /**
   * Recursively build a task with its subtasks
   * @param task The parent task
   * @returns The task with populated subtasks
   */
  private async buildTaskWithSubtasks(task: Task): Promise<TaskWithSubTasks> {
    const subtasks = await this.findSubtasks(task.id);

    // Recursively fetch subtasks for each subtask
    const subTasksWithChildren = await Promise.all(
      subtasks.map(async (subtask) => this.buildTaskWithSubtasks(subtask))
    );

    // Return the task with its subtasks
    return {
      ...task,
      sub_tasks: subTasksWithChildren,
    };
  }

  /**
   * Find subtasks by parent ID
   * @param parentId The parent task ID
   * @returns Array of subtasks
   */
  async findSubtasks(parentId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("parent_id", parentId);

    if (error) {
      console.error("Error fetching subtasks:", error);
      return [];
    }

    return data || [];
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();
