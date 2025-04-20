import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import taskService from "../services/taskService";

/**
 * Controller for task-related operations
 */
export const taskController = {
  /**
   * Get all tasks
   */
  getAllTasks: asyncHandler(async (req: Request, res: Response) => {
    const tasks = await taskService.getAllTasks();
    res.status(200).json({ success: true, data: tasks });
  }),

  /**
   * Get a task by ID
   */
  getTaskById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.status(200).json({ success: true, data: task });
  }),

  /**
   * Create a new task
   */
  createTask: asyncHandler(async (req: Request, res: Response) => {
    // Add owner field from user context
    const taskData = {
      ...req.body,
      owner: req.user?.id || "system",
    };

    const task = await taskService.createTask(taskData);
    res.status(201).json({ success: true, data: task });
  }),

  /**
   * Update an existing task
   */
  updateTask: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const task = await taskService.updateTask(id, req.body);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.status(200).json({ success: true, data: task });
  }),

  /**
   * Delete a task
   */
  deleteTask: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await taskService.deleteTask(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Task not found or could not be deleted",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  }),

  /**
   * Get subtasks for a parent task
   */
  getSubtasks: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const subtasks = await taskService.getSubtasks(id);
    res.status(200).json({ success: true, data: subtasks });
  }),

  /**
   * Get tasks by owner (agent) ID
   */
  getTasksByOwnerId: asyncHandler(async (req: Request, res: Response) => {
    const { ownerId } = req.params;
    const tasks = await taskService.getTasksByOwnerId(ownerId);
    res.status(200).json({ success: true, data: tasks });
  }),
};
