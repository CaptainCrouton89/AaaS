import { tool } from "ai";
import { z } from "zod";
import { AgentType } from "../constants/agents";
import { AgentService } from "../services/agentService";
import { ToolResult } from "./async-tools/baseTool";

/**
 * Tool to spawn a new agent
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance for recruiting agent team members
 */
export const getSpawnAgentTool = (userId: string, agentId: string) =>
  tool({
    description: "Spawns a new agent",
    parameters: z.object({
      name: z.string().describe("The name of the agent to spawn"),
      jobTitle: z
        .enum(Object.values(AgentType) as [string, ...string[]])
        .describe("The job title of the agent to spawn"),
      goal: z
        .string()
        .describe("A detailed objective for the person, in bullet points"),
      background: z
        .string()
        .describe(
          "Additional background information for the agent to spawn (relevant to the job title)"
        ),
    }),
    execute: async ({
      name,
      goal,
      jobTitle,
      background,
    }): Promise<ToolResult> => {
      try {
        console.log(
          `[SpawnAgentTool] Spawning agent: ${name} with goal: ${goal} and jobTitle: ${jobTitle} and background: ${background} for ownerId: ${userId}`
        );
        const agentService = new AgentService();
        const agent = await agentService.createAgent({
          title: name,
          goal: goal,
          agent_type: jobTitle as AgentType,
          background: background || "",
          owner: userId,
          boss_id: agentId,
        });

        agentService.initializeAgent(agent.id);

        if (agent) {
          return {
            success: true,
            data: `Agent with id ${agent.id} spawned and has been put to work`,
            type: "markdown",
          };
        } else {
          throw new Error(`Failed to queue agent spawning: ${name}`);
        }
      } catch (error) {
        console.error("[SpawnAgentTool] Error submitting job:", error);
        throw new Error(
          `Failed to spawn agent: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  });

/**
 * Tool for sending messages between agents
 *
 * @param fromAgentId ID of the agent sending the message
 * @returns Tool instance for messaging agents
 */
export const getMessageAgentTool = (fromAgentId: string) =>
  tool({
    description: "Send a message to an agent",
    parameters: z.object({
      agentId: z.string().describe("ID of the agent to send the message to"),
      message: z.string().describe("The message to send to the agent"),
    }),
    execute: async ({ agentId, message }): Promise<ToolResult> => {
      try {
        const agentService = new AgentService();
        const result = await agentService.sendMessageFromAgentToAgent(
          fromAgentId,
          agentId,
          message
        );

        const text: string = result.text;

        return {
          success: true,
          data: text,
          type: "markdown",
        };
      } catch (error) {
        console.error("[MessageAgentTool] Error sending message:", error);
        throw new Error(`Failed to send message: ${error}`);
      }
    },
  });

export const removeAgentTool = tool({
  description: "Remove an agent from the team",
  parameters: z.object({
    agentId: z.string().describe("ID of the agent to remove"),
  }),
  execute: async ({ agentId }): Promise<ToolResult> => {
    try {
      const agentService = new AgentService();
      await agentService.deleteAgent(agentId);
      return {
        success: true,
        data: `Agent with id ${agentId} removed successfully`,
        type: "markdown",
      };
    } catch (error) {
      console.error("[RemoveAgentTool] Error removing agent:", error);
      throw new Error(
        `Failed to remove agent: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
