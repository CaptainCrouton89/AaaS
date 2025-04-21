import { tool } from "ai";
import { z } from "zod";
import { agentService, taskService } from "../services";
import contextService, { ContextService } from "../services/contextService";
import { ToolResult } from "./async-tools/baseTool";

/**
 * Tool to create a new context
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance
 */
export const getCreateContextTool = (userId: string, agentId: string) =>
  tool({
    description: "Create a new context with information for tasks or agents",
    parameters: z.object({
      textData: z
        .string()
        .describe("Text content of the context (information, data, etc.)"),
    }),
    execute: async ({ textData }): Promise<ToolResult> => {
      try {
        const contextService = new ContextService();
        const context = await contextService.createContext({
          text_data: textData,
          owner: userId,
        });

        if (context) {
          return {
            success: true,
            data: `Context with id ${context.id} created successfully`,
            type: "markdown",
          };
        } else {
          throw new Error(`Failed to create context`);
        }
      } catch (error) {
        console.error("[CreateContextTool] Error:", error);
        throw new Error(
          `Failed to create context: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  });

/**
 * Tool to get context by ID
 */
export const getContextTool = tool({
  description: "Get details of a specific context",
  parameters: z.object({
    contextId: z.string().describe("ID of the context to retrieve"),
  }),
  execute: async ({ contextId }): Promise<ToolResult> => {
    try {
      const contextService = new ContextService();
      const context = await contextService.getContextById(contextId);

      if (context) {
        return {
          success: true,
          data: context,
          type: "json",
        };
      } else {
        throw new Error(`Context not found: ${contextId}`);
      }
    } catch (error) {
      console.error("[GetContextTool] Error:", error);
      throw new Error(
        `Failed to get context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

export const getContextByTaskIdTool = tool({
  description: "Get context by task ID",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to retrieve context for"),
  }),
  execute: async ({ taskId }): Promise<ToolResult> => {
    const task = await taskService.getTaskById(taskId);
    if (task) {
      return {
        success: true,
        data: task.context.text_data,
        type: "markdown",
      };
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  },
});

export const getGatherFullContextTool = (agentId: string) =>
  tool({
    description: "Look at the full picture. Gathers all context from all tasks",
    parameters: z.object({}),
    execute: async (): Promise<ToolResult> => {
      const allContext = await contextService.getAllContextsByAgentId(agentId);

      if (allContext) {
        return {
          success: true,
          data: allContext,
          type: "json",
        };
      } else {
        return {
          success: true,
          data: "No context found for agent: ${agentId}",
          type: "markdown",
        };
      }
    },
  });

/**
 * Tool to update an existing context
 */
export const updateContextTool = tool({
  description: "Update an existing context's content",
  parameters: z.object({
    contextId: z.string().describe("ID of the context to update"),
    textData: z.string().describe("New text content for the context"),
  }),
  execute: async ({ contextId, textData }): Promise<ToolResult> => {
    try {
      const contextService = new ContextService();
      const context = await contextService.updateContext(contextId, {
        text_data: textData,
      });

      if (context) {
        return {
          success: true,
          data: `Context with id ${context.id} updated successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Context not found: ${contextId}`);
      }
    } catch (error) {
      console.error("[UpdateContextTool] Error:", error);
      throw new Error(
        `Failed to update context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to delete a context
 */
export const deleteContextTool = tool({
  description: "Delete a context",
  parameters: z.object({
    contextId: z.string().describe("ID of the context to delete"),
  }),
  execute: async ({ contextId }): Promise<ToolResult> => {
    try {
      const contextService = new ContextService();
      const success = await contextService.deleteContext(contextId);

      if (success) {
        return {
          success: true,
          data: `Context with id ${contextId} deleted successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Failed to delete context: ${contextId}`);
      }
    } catch (error) {
      console.error("[DeleteContextTool] Error:", error);
      throw new Error(
        `Failed to delete context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to add or update context for a task
 */
export const updateTaskContextTool = tool({
  description: "Add or update context for a task",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to update"),
    contextId: z.string().describe("ID of the context to assign to the task"),
  }),
  execute: async ({ taskId, contextId }): Promise<ToolResult> => {
    try {
      const { TaskService } = require("../services/taskService");
      const taskService = new TaskService();

      // Verify that the context exists
      const contextService = new ContextService();
      const context = await contextService.getContextById(contextId);

      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }

      const task = await taskService.updateTask(taskId, {
        context_id: contextId,
      });

      if (task) {
        return {
          success: true,
          data: `Task with id ${task.id} updated successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Task not found: ${taskId}`);
      }
    } catch (error) {
      console.error("[UpdateTaskContextTool] Error:", error);
      throw new Error(
        `Failed to update task context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to add or update context for an agent
 */
export const updateAgentContextTool = tool({
  description: "Add or update context for an agent",
  parameters: z.object({
    agentId: z.string().describe("ID of the agent to update"),
    contextId: z.string().describe("ID of the context to assign to the agent"),
  }),
  execute: async ({ agentId, contextId }): Promise<ToolResult> => {
    try {
      const { AgentService } = require("../services/agentService");
      const agentService = new AgentService();

      // Verify that the context exists
      const contextService = new ContextService();
      const context = await contextService.getContextById(contextId);

      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }

      const agent = await agentService.updateAgent(agentId, {
        context_id: contextId,
      });

      if (agent) {
        return {
          success: true,
          data: `Agent with id ${agent.id} updated successfully`,
          type: "markdown",
        };
      } else {
        throw new Error(`Agent not found: ${agentId}`);
      }
    } catch (error) {
      console.error("[UpdateAgentContextTool] Error:", error);
      throw new Error(
        `Failed to update agent context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool to append to context
 */
// export const appendToContextTool = tool({
//   description: "Append to context",
//   parameters: z.object({
//     contextId: z.string().describe("ID of the context to append to"),
//     textData: z.string().describe("Text data to append to the context"),
//   }),
//   execute: async ({ contextId, textData }) => {
//     const context = await contextService.appendToContext(contextId, textData);

//     return {
//       message: "Context updated successfully",
//     };
//   },
// });

export const getShareTaskContextTool = (agentId: string) =>
  tool({
    description: "Share a task context with a team member",
    parameters: z.object({
      taskId: z.string().describe("ID of the task to share"),
      teamMemberId: z
        .string()
        .describe("ID of the team member to share the task context with"),
    }),
    execute: async ({ taskId, teamMemberId }): Promise<ToolResult> => {
      const task = await taskService.getTaskById(taskId);
      const teamMember = await agentService.getAgentById(teamMemberId);

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (!teamMember) {
        throw new Error(`Team member not found: ${teamMemberId}`);
      }

      const result = await agentService.sendMessageFromAgentToAgent(
        agentId,
        teamMemberId,
        `Here's some context for the task: ${task.title} Id: ${task.context.text_data}
        
        Context: ${task.context.text_data}`
      );

      return {
        success: true,
        data: result,
        type: "markdown",
      };
    },
  });
