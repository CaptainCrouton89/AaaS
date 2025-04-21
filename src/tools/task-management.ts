import { tool } from "ai";
import { z } from "zod";
import { contextService } from "../services";
import agentService from "../services/agentService";
import taskService, { TaskService } from "../services/taskService";
import { ToolResult } from "./async-tools/baseTool";

/**
 * Tool to create a new task
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance for creating tasks
 */
export const getCreateTaskTool = (agentId: string) =>
  tool({
    description: "Create a new task to do",
    parameters: z.object({
      title: z.string().describe("The title of the task"),
      description: z
        .string()
        .describe("Detailed description of what the task involves"),
      complexity: z
        .number()
        .describe(
          "The complexity of the task, 1 being the easiest and 10 being the hardest"
        ),
      parentId: z
        .string()
        .optional()
        .describe("ID of the parent task if this is a subtask"),
      contextId: z
        .string()
        .optional()
        .describe(
          "ID of the context to use for the task (leave blank for new context)"
        ),
    }),
    execute: async ({
      title,
      description,
      parentId,
      complexity,
      contextId,
    }): Promise<ToolResult> => {
      try {
        const agent = await agentService.getAgentById(agentId);
        if (!agent) {
          throw new Error("Agent not found");
        }

        if (!contextId) {
          const context = await contextService.createContext({
            owner: agent.owner,
          });
          contextId = context.id;
        }

        const task = await taskService.createTask({
          title,
          description,
          owner_id: agentId,
          parent_id: parentId,
          status: "in_progress",
          owner: agent.owner,
          context_id: contextId,
          complexity: complexity,
        });

        if (task) {
          return {
            success: true,
            data: `Task with id ${task.id} created successfully.${
              task.complexity > 5
                ? " This task should be broken down into smaller tasks."
                : ""
            }`,
            type: "markdown",
          };
        } else {
          throw new Error(`Failed to create task: ${title}`);
        }
      } catch (error) {
        console.error("[CreateTaskTool] Error creating task:", error);
        throw new Error(
          `Failed to create task: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  });

/**
 * Tool to get details of a specific task
 */
export const getTaskTool = tool({
  description: "Get details of a specific task",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to retrieve"),
  }),
  execute: async ({ taskId }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const task = await taskService.getTaskById(taskId);

      if (task) {
        return {
          success: true,
          data: task,
          type: "json",
        };
      } else {
        throw new Error(`Failed to get task: ${taskId}`);
      }
    } catch (error) {
      console.error("[GetTaskTool] Error getting task:", error);
      throw new Error(
        `Failed to get task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to update an existing task
 */
export const updateTaskTool = tool({
  description: "Update an existing task's details",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    description: z.string().optional().describe("New description for the task"),
    status: z.string().optional().describe("New status for the task"),
    ownerId: z.string().optional().describe("ID of the new owner team member"),
    contextId: z
      .string()
      .optional()
      .describe("ID of the new context for the task"),
  }),
  execute: async ({
    taskId,
    title,
    description,
    status,
    ownerId,
    contextId,
  }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const task = await taskService.updateTask(taskId, {
        title,
        description,
        status,
        owner_id: ownerId,
        context_id: contextId,
      });

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        data: `Task with id ${task?.id} updated successfully`,
        type: "markdown",
      };
    } catch (error) {
      console.error("[UpdateTaskTool] Error updating task:", error);
      throw new Error(
        `Failed to update task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to delete a task
 */
export const deleteTaskTool = tool({
  description: "Delete a task",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delete"),
  }),
  execute: async ({ taskId }): Promise<ToolResult> => {
    try {
      const taskService = new TaskService();
      const task = await taskService.deleteTask(taskId);

      if (task) {
        return {
          success: true,
          data: `Task with id ${taskId} deleted successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Failed to delete task: ${taskId}`);
      }
    } catch (error) {
      console.error("[DeleteTaskTool] Error deleting task:", error);
      throw new Error(
        `Failed to delete task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
