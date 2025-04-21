import { tool } from "ai";
import { z } from "zod";
import agentService from "../services/agentService";
import taskService, { TaskService } from "../services/taskService";

/**
 * Tool to create a new task
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance for creating tasks
 */
export const getCreateTaskTool = (agentId: string) =>
  tool({
    description: "Create a new task and assign it to a team member",
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
    }),
    execute: async ({ title, description, parentId, complexity }) => {
      try {
        const agent = await agentService.getAgentById(agentId);
        if (!agent) {
          throw new Error("Agent not found");
        }

        const task = await taskService.createTask({
          title,
          description,
          owner_id: agentId,
          parent_id: parentId,
          status: "in_progress",
          owner: agent.owner,
          context_id: agent.context_id,
          complexity: complexity,
        });

        if (task) {
          return {
            message: "Task created successfully",
            taskId: task.id,
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
  execute: async ({ taskId }) => {
    try {
      const taskService = new TaskService();
      const task = await taskService.getTaskById(taskId);

      if (task) {
        return {
          task: task,
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
  }),
  execute: async ({ taskId, title, description, status, ownerId }) => {
    try {
      const taskService = new TaskService();
      const task = await taskService.updateTask(taskId, {
        title,
        description,
        status,
        owner_id: ownerId,
      });

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        message: "Task updated successfully",
        taskId: task?.id,
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
  execute: async ({ taskId }) => {
    try {
      const taskService = new TaskService();
      const task = await taskService.deleteTask(taskId);

      if (task) {
        return {
          message: "Task deleted successfully",
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
