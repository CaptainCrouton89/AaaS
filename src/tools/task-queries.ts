import { tool } from "ai";
import { z } from "zod";
import { TaskService } from "../services/taskService";

/**
 * Tool to get tasks assigned to a team member
 */
export const getTasksByTeamMemberTool = tool({
  description:
    "Get all tasks assigned to a specific team member (such as yourself)",
  parameters: z.object({
    ownerId: z
      .string()
      .describe("ID of the team member whose tasks to retrieve"),
  }),
  execute: async ({ ownerId }) => {
    try {
      const taskService = new TaskService();
      const tasks = await taskService.getTasksByOwnerId(ownerId);

      if (tasks) {
        return {
          tasks: tasks,
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
  execute: async ({ parentTaskId }) => {
    try {
      const taskService = new TaskService();
      const subtasks = await taskService.getSubtasks(parentTaskId);

      if (subtasks) {
        return {
          subtasks: subtasks,
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
 * Tool to delegate a task to another team member
 */
export const delegateTaskTool = tool({
  description: "Delegate a task to a team member",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delegate"),
    teamMemberId: z
      .string()
      .describe("ID of the team member to delegate the task to"),
  }),
  execute: async ({ taskId, teamMemberId }) => {
    try {
      const taskService = new TaskService();
      const task = await taskService.updateTask(taskId, {
        owner_id: teamMemberId,
      });

      if (task) {
        return {
          message: "Task delegated successfully",
          taskId: task.id,
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
