import { tool } from "ai";
import { z } from "zod";
import { AgentType } from "../constants/agents";
import { AgentService } from "../services/agentService";
import { ToolResult } from "./async-tools/baseTool";

/**
 * Tool to recruit a new team member
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance for recruiting team members
 */
export const getRecruitTeamMemberTool = (userId: string, agentId: string) =>
  tool({
    description: "Recruits a new team member and puts them to work",
    parameters: z.object({
      name: z.string().describe("The name of the person to recruit"),
      jobTitle: z
        .enum(Object.values(AgentType) as [string, ...string[]])
        .describe("The job title of the person to recruit"),
      goal: z
        .string()
        .describe("A detailed objective for the person, in bullet points"),
      background: z
        .string()
        .describe(
          "Additional background information for the person to recruit (relevant to the job title)"
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
          `[RecruitTeamMemberTool] Recruiting team member: ${name} with goal: ${goal} and jobTitle: ${jobTitle} and background: ${background} for ownerId: ${userId}`
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
            data: `Team member with id ${agent.id} recruited and has been put to work`,
            type: "markdown",
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

/**
 * Tool for sending messages between team members
 *
 * @param fromTeamMemberId ID of the team member sending the message
 * @returns Tool instance for messaging team members
 */
export const getMessageTeamMemberTool = (fromTeamMemberId: string) =>
  tool({
    description: "Send a message to a team member",
    parameters: z.object({
      teamMemberId: z
        .string()
        .describe("ID of the team member to send the message to"),
      message: z.string().describe("The message to send to the team member"),
    }),
    execute: async ({ teamMemberId, message }): Promise<ToolResult> => {
      try {
        const agentService = new AgentService();
        const result = await agentService.sendMessageFromAgentToAgent(
          fromTeamMemberId,
          teamMemberId,
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

export const removeTeamMemberTool = tool({
  description: "Remove a team member from the team",
  parameters: z.object({
    teamMemberId: z.string().describe("ID of the team member to remove"),
  }),
  execute: async ({ teamMemberId }): Promise<ToolResult> => {
    try {
      const agentService = new AgentService();
      await agentService.deleteAgent(teamMemberId);
      return {
        success: true,
        data: `Team member with id ${teamMemberId} removed successfully`,
        type: "markdown",
      };
    } catch (error) {
      console.error(
        "[RemoveTeamMemberTool] Error removing team member:",
        error
      );
      throw new Error(
        `Failed to remove team member: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
