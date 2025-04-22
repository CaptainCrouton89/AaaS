import { tool } from "ai";
import { z } from "zod";
import { TaskService } from "../services/taskService";
import { ToolResult } from "./async-tools/baseTool";

/**
 * Tool to get tasks assigned to another agent
 */
export const getTasksByAgentTool = tool({
  description: "Get all tasks assigned to a specific agent (such as yourself)",
  parameters: z.object({
    ownerId: z.string().describe("ID of the agent whose tasks to retrieve"),
  }),
  execute: async ({ ownerId }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const tasks = await taskService.getTasksByOwnerId(ownerId);

      if (tasks) {
        return {
          success: true,
          data: tasks,
          type: "json",
        };
      } else {
        throw new Error(`Failed to get tasks: ${ownerId}`);
      }
    } catch (error) {
      console.error("[GetTasksByOwnerTool] Error getting tasks:", error);
      throw new Error(
        `Failed to get tasks: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to get subtasks for a parent task
 */
export const getSubtasksTool = tool({
  description: "Get all subtasks for a specific parent task",
  parameters: z.object({
    parentTaskId: z
      .string()
      .describe("ID of the parent task whose subtasks to retrieve"),
  }),
  execute: async ({ parentTaskId }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const subtasks = await taskService.getSubtasks(parentTaskId);

      if (subtasks) {
        return {
          success: true,
          data: subtasks,
          type: "json",
        };
      } else {
        throw new Error(`Failed to get subtasks: ${parentTaskId}`);
      }
    } catch (error) {
      console.error("[GetSubtasksTool] Error getting subtasks:", error);
      throw new Error(
        `Failed to get subtasks: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to delegate a task to another agent
 */
export const delegateTaskTool = tool({
  description: "Delegate a task to an agent",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delegate"),
    agentId: z.string().describe("ID of the agent to delegate the task to"),
  }),
  execute: async ({ taskId, agentId }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const task = await taskService.updateTask(taskId, {
        owner_id: agentId,
      });

      if (task) {
        return {
          success: true,
          data: `Task with id ${task.id} delegated successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Failed to delegate task: ${taskId}`);
      }
    } catch (error) {
      console.error("[DelegateTaskTool] Error delegating task:", error);
      throw new Error(
        `Failed to delegate task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
