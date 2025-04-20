import { tool } from "ai";
import { z } from "zod";
import { AgentType } from "../constants/agents";
import { AgentService } from "../services/agentService";
import { TaskService } from "../services/taskService";

export const recruitTeamMemberTool = tool({
  description: "Recruite a new team member that can be delegated tasks to",
  parameters: z.object({
    name: z.string().describe("The name of the person to recruit"),
    goal: z.string().describe("The goal of the person to recruit"),
    jobTitle: z
      .enum(Object.values(AgentType) as [string, ...string[]])
      .describe("The job title of the person to recruit"),
    background: z
      .string()
      .describe(
        "Additional background information for the person to recruit (relevant to the job title)"
      ),
  }),
  execute: async ({ name, goal, jobTitle, background }) => {
    try {
      const agentService = new AgentService();
      const agent = await agentService.createAgent(
        name,
        goal,
        jobTitle as AgentType,
        background || ""
      );

      if (agent) {
        return {
          message: "Team member recruited successfully",
          teamMemberId: agent.id,
        };
      } else {
        throw new Error(`Failed to queue team member recruitment: ${name}`);
      }
    } catch (error) {
      console.error("[RecruitTeamMemberTool] Error submitting job:", error);
      throw new Error(
        `Failed to recruit team member: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

export const createTaskTool = tool({
  description: "Create a new task that can be assigned to a team member",
  parameters: z.object({
    title: z.string().describe("The title of the task"),
    description: z
      .string()
      .describe("Detailed description of what the task involves"),
    ownerId: z
      .string()
      .optional()
      .describe("ID of the team member that will own this task"),
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
      const taskService = new TaskService();
      const task = await taskService.createTask({
        title,
        description,
        owner_id: ownerId,
        parent_id: parentId,
        context_id: contextId,
        status,
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

export const getTasksByOwnerTool = tool({
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
      //   const task = await taskService.delegateTask(taskId, agentId);

      //   if (task) {
      //     return {
      //       message: "Task delegated successfully",
      //       taskId: task.id,
      //     };
      //   } else {
      //     throw new Error(`Failed to delegate task: ${taskId}`);
      //   }
    } catch (error) {
      console.error("[DelegateTaskTool] Error delegating task:", error);
      throw new Error(`Failed to delegate task: ${error}`);
    }
  },
});

export const getMessageTeamMemberTool = (fromTeamMemberId: string) =>
  tool({
    description: "Send a message to a team member",
    parameters: z.object({
      teamMemberId: z
        .string()
        .describe("ID of the team member to send the message to"),
      message: z.string().describe("The message to send to the team member"),
    }),
    execute: async ({ teamMemberId, message }) => {
      try {
        const agentService = new AgentService();
        const result = await agentService.chatWithAgent(teamMemberId, {
          role: "user",
          content: `From team member ${fromTeamMemberId}: ${message}`,
        });

        const text: string = result.text;

        return text;
      } catch (error) {
        console.error("[MessageAgentTool] Error sending message:", error);
        throw new Error(`Failed to send message: ${error}`);
      }
    },
  });
