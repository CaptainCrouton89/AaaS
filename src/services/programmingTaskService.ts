import dotenv from "dotenv";
import { programmingTaskRepository } from "../repositories";
import { ProgrammingTask } from "../types/database";

dotenv.config();

/**
 * Service to handle programming task-related operations
 */
export class ProgrammingTaskService {
  /**
   * Get a programming task by its ID
   * @param taskId The programming task ID
   * @returns The programming task or null if not found
   */
  public async getProgrammingTaskById(taskId: string) {
    return await programmingTaskRepository.findById(taskId);
  }

  /**
   * Get all programming tasks
   * @returns An array of all programming tasks
   */
  public async getAllProgrammingTasks() {
    return await programmingTaskRepository.findAll();
  }

  /**
   * Create a new programming task
   * @param task The programming task data
   * @returns The created programming task
   */
  public async createProgrammingTask(task: Partial<ProgrammingTask>) {
    return await programmingTaskRepository.create(task);
  }

  /**
   * Update an existing programming task
   * @param taskId The programming task ID
   * @param task The updated programming task data
   * @returns The updated programming task or null if not found
   */
  public async updateProgrammingTask(
    taskId: string,
    task: Partial<ProgrammingTask>
  ) {
    return await programmingTaskRepository.update(taskId, task);
  }

  /**
   * Delete a programming task
   * @param taskId The programming task ID
   * @returns True if successfully deleted
   */
  public async deleteProgrammingTask(taskId: string) {
    return await programmingTaskRepository.delete(taskId);
  }

  /**
   * Get programming tasks by task ID
   * @param taskId The task ID
   * @returns Array of programming tasks
   */
  public async getProgrammingTasksByTaskId(taskId: string) {
    return await programmingTaskRepository.findByTaskId(taskId);
  }
}

export default new ProgrammingTaskService();
