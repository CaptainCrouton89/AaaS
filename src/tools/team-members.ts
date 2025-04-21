import { tool } from "ai";
import { z } from "zod";
import { AgentType } from "../constants/agents";
import { AgentService } from "../services/agentService";

/**
 * Tool to recruit a new team member
 *
 * @param userId User ID for ownership tracking
 * @returns Tool instance for recruiting team members
 */
export const getRecruitTeamMemberTool = (userId: string) =>
  tool({
    description: "Recruit a new team member that can be delegated tasks to",
    parameters: z.object({
      name: z.string().describe("The name of the person to recruit"),
      contextId: z
        .string()
        .describe("ID of the context that the team member will use"),
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
    execute: async ({ name, goal, jobTitle, background, contextId }) => {
      try {
        console.log(
          `[RecruitTeamMemberTool] Recruiting team member: ${name} with goal: ${goal} and jobTitle: ${jobTitle} and background: ${background} for ownerId: ${userId}`
        );
        const agentService = new AgentService();
        const agent = await agentService.createAgent(
          userId,
          name,
          goal,
          jobTitle as AgentType,
          background || "",
          contextId
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

export const removeTeamMemberTool = tool({
  description: "Remove a team member from the team",
  parameters: z.object({
    teamMemberId: z.string().describe("ID of the team member to remove"),
  }),
  execute: async ({ teamMemberId }) => {
    try {
      const agentService = new AgentService();
      const result = await agentService.deleteAgent(teamMemberId);
      return {
        message: "Team member removed successfully",
        success: result,
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
