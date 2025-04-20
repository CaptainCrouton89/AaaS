import { tool } from "ai";
import axios from "axios";
import { z } from "zod";
import { AgentType } from "../constants/agents";

export const createAgentTool = tool({
  description: "Create a new agent that can be delegated tasks to",
  parameters: z.object({
    name: z.string().describe("The name of the agent to create"),
    description: z.string().describe("The purpose or goal of the agent"),
    goal: z.string().describe("The goal of the agent"),
    agentType: z
      .enum(Object.values(AgentType) as [string, ...string[]])
      .optional()
      .describe("Type of agent to create (defaults to GENERAL)"),
    background: z
      .string()
      .optional()
      .describe("Additional background information for the agent"),
  }),
  execute: async ({ name, description, goal, agentType, background }) => {
    try {
      const response = await axios.post(`${process.env.URL}/agents`, {
        name,
        description,
        goal,
        agentType,
        background,
      });

      if (response.status === 200) {
        return {
          message: response.data.message,
          toolCallId: response.data.id,
        };
      } else {
        throw new Error(
          `Failed to queue agent creation: ${response.data.message}`
        );
      }
    } catch (error) {
      console.error("[CreateAgentTool] Error submitting job:", error);
      throw new Error(
        `Failed to create agent: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

export const createTaskTool = tool({
  description: "Create a new task that can be assigned to an agent",
  parameters: z.object({
    title: z.string().describe("The title of the task"),
    description: z
      .string()
      .describe("Detailed description of what the task involves"),
    ownerId: z
      .string()
      .optional()
      .describe("ID of the agent that will own this task"),
    parentId: z
      .string()
      .optional()
      .describe("ID of the parent task if this is a subtask"),
    contextId: z
      .string()
      .optional()
      .describe("ID of any associated context data"),
    status: z
      .string()
      .optional()
      .describe("Initial status of the task (defaults to 'pending')"),
  }),
  execute: async ({
    title,
    description,
    ownerId,
    parentId,
    contextId,
    status,
  }) => {
    try {
      const response = await axios.post(`${process.env.URL}/tasks`, {
        title,
        description,
        owner_id: ownerId,
        parent_id: parentId,
        context_id: contextId,
        status,
      });

      if (response.status === 201) {
        return {
          message: "Task created successfully",
          taskId: response.data.data.id,
        };
      } else {
        throw new Error(`Failed to create task: ${response.data.message}`);
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

export const updateTaskTool = tool({
  description: "Update an existing task's details",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    description: z.string().optional().describe("New description for the task"),
    status: z.string().optional().describe("New status for the task"),
    ownerId: z.string().optional().describe("ID of the new owner agent"),
  }),
  execute: async ({ taskId, title, description, status, ownerId }) => {
    try {
      const response = await axios.put(`${process.env.URL}/tasks/${taskId}`, {
        title,
        description,
        status,
        owner_id: ownerId,
      });

      if (response.status === 200) {
        return {
          message: "Task updated successfully",
          taskId: response.data.data.id,
        };
      } else {
        throw new Error(`Failed to update task: ${response.data.message}`);
      }
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

export const deleteTaskTool = tool({
  description: "Delete a task",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delete"),
  }),
  execute: async ({ taskId }) => {
    try {
      const response = await axios.delete(`${process.env.URL}/tasks/${taskId}`);

      if (response.status === 200) {
        return {
          message: "Task deleted successfully",
        };
      } else {
        throw new Error(`Failed to delete task: ${response.data.message}`);
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

export const getTaskTool = tool({
  description: "Get details of a specific task",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to retrieve"),
  }),
  execute: async ({ taskId }) => {
    try {
      const response = await axios.get(`${process.env.URL}/tasks/${taskId}`);

      if (response.status === 200) {
        return {
          task: response.data.data,
        };
      } else {
        throw new Error(`Failed to get task: ${response.data.message}`);
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

export const getTasksByOwnerTool = tool({
  description: "Get all tasks assigned to a specific agent",
  parameters: z.object({
    ownerId: z.string().describe("ID of the agent whose tasks to retrieve"),
  }),
  execute: async ({ ownerId }) => {
    try {
      const response = await axios.get(
        `${process.env.URL}/tasks/owner/${ownerId}`
      );

      if (response.status === 200) {
        return {
          tasks: response.data.data,
        };
      } else {
        throw new Error(`Failed to get tasks: ${response.data.message}`);
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

export const getSubtasksTool = tool({
  description: "Get all subtasks for a specific parent task",
  parameters: z.object({
    parentTaskId: z
      .string()
      .describe("ID of the parent task whose subtasks to retrieve"),
  }),
  execute: async ({ parentTaskId }) => {
    try {
      const response = await axios.get(
        `${process.env.URL}/tasks/${parentTaskId}/subtasks`
      );

      if (response.status === 200) {
        return {
          subtasks: response.data.data,
        };
      } else {
        throw new Error(`Failed to get subtasks: ${response.data.message}`);
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

export const delegateTaskTool = tool({
  description: "Delegate a task to an agent",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to delegate"),
    agentId: z.string().describe("ID of the agent to delegate the task to"),
  }),
  execute: async ({ taskId, agentId }) => {
    try {
      const response = await axios.post(
        `${process.env.URL}/tasks/${taskId}/delegate`,
        {
          agent_id: agentId,
        }
      );
    } catch (error) {
      console.error("[DelegateTaskTool] Error delegating task:", error);
      throw new Error(`Failed to delegate task: ${error}`);
    }
  },
});
