import { tool } from "ai";
import { z } from "zod";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

type WaitToolArgs = {
  durationMs: number;
};

export class WaitTool extends BaseAsyncJobTool<WaitToolArgs> {
  readonly name = "wait";
  readonly description = "Waits for a specified duration before continuing";

  async execute(
    agentId: string,
    { durationMs }: WaitToolArgs
  ): Promise<ToolResult> {
    try {
      console.log(`waitTool executing with duration: ${durationMs}ms`);

      // Ensure the duration is within reasonable limits (max 5 minutes)
      const clampedDuration = Math.min(durationMs, 5 * 60 * 1000);

      // Wait for the specified duration
      await new Promise((resolve) => setTimeout(resolve, clampedDuration));

      console.log(`waitTool completed waiting for ${clampedDuration}ms`);

      return {
        success: true,
        data: `Continue with your tasks.`,
        type: "markdown",
      };
    } catch (error) {
      console.error("Error in waitTool:", error);
      return {
        success: false,
        type: "markdown",
        data: `Error in waitTool: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: "Wait for a specified duration before continuing",
      parameters: z.object({
        durationMs: z
          .number()
          .describe("The duration to wait in milliseconds")
          .min(1)
          .max(5 * 60 * 1000), // Max 5 minutes
      }),
      execute: async ({ durationMs }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              durationMs,
            },
            agentId
          );

          const seconds = durationMs / 1000;

          if (response.success) {
            return {
              success: true,
              data: `Your wait request has been queued. You will be automatically prompted again in ${seconds} seconds.`,
              type: "markdown",
            };
          } else {
            throw new Error(`Failed to queue wait job: ${response.message}`);
          }
        } catch (error) {
          console.error("Error submitting wait job:", error);
          throw new Error(
            `Failed to process wait request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const waitTool = new WaitTool();
toolRegistry.registerTool(waitTool);

// Export the tool instance
export { waitTool };
