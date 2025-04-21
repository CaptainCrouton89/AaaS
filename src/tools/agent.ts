import { tool } from "ai";
import { z } from "zod";
import { agentService } from "../services";
import { ToolResult } from "./async-tools/baseTool";

export const getWriteToLogsTool = (agentId: string) =>
  tool({
    description: "Write to your personal memory",
    parameters: z.object({
      message: z.string().describe("The message to write to your memory"),
    }),
    execute: async ({ message }): Promise<ToolResult> => {
      await agentService.appendToLogs(agentId, message);
      return {
        success: true,
        data: "Message written to memory",
        type: "markdown",
      };
    },
  });
