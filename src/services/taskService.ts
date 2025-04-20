import dotenv from "dotenv";
import { taskRepository } from "../repositories";
import { Task } from "../types/database";

dotenv.config();

/**
 * Service to handle task-related operations
 */
export class TaskService {
  /**
   * Get a task by its ID
   * @param taskId The task ID
   * @returns The task or null if not found
   */
  public async getTaskById(taskId: string) {
    return await taskRepository.findById(taskId);
  }

  /**
   * Get all tasks
   * @returns An array of all tasks
   */
  public async getAllTasks() {
    return await taskRepository.findAll();
  }

  /**
   * Create a new task
   * @param task The task data
   * @returns The created task
   */
  public async createTask(task: Partial<Task>) {
    return await taskRepository.create(task);
  }

  /**
   * Update an existing task
   * @param taskId The task ID
   * @param task The updated task data
   * @returns The updated task or null if not found
   */
  public async updateTask(taskId: string, task: Partial<Task>) {
    return await taskRepository.update(taskId, task);
  }

  /**
   * Delete a task
   * @param taskId The task ID
   * @returns True if successfully deleted
   */
  public async deleteTask(taskId: string) {
    return await taskRepository.delete(taskId);
  }

  /**
   * Get tasks by owner (agent) ID
   * @param ownerId The owner (agent) ID
   * @returns Array of tasks owned by the specified agent
   */
  public async getTasksByOwnerId(ownerId: string) {
    return await taskRepository.findByOwnerId(ownerId);
  }

  /**
   * Get subtasks by parent ID
   * @param parentId The parent task ID
   * @returns Array of subtasks
   */
  public async getSubtasks(parentId: string) {
    return await taskRepository.findSubtasks(parentId);
  }
}

export default new TaskService();
