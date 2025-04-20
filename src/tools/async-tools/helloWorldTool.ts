import { tool } from "ai";
import { z } from "zod";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

// does something slow, such as research
export class HelloWorldTool extends BaseAsyncJobTool {
  readonly name = "helloWorld";
  readonly description =
    "A simple tool that returns a greeting message with optional delay";
  async execute({
    name,
    delay = 10,
  }: {
    name: string;
    delay?: number;
  }): Promise<ToolResult> {
    try {
      console.log("asynchelloWorldTool executing");

      // If there's a delay, simulate some async processing
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }

      console.log("helloWorldTool executed");

      return {
        success: true,
        data: {
          type: "text",
          text: `Said hello to ${name}. ${
            delay > 0 ? `(after waiting ${delay} seconds).` : ""
          }`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description:
        "Send a greeting message to a person. The response will be processed asynchronously.",
      parameters: z.object({
        name: z.string().describe("The name of the person to greet"),
        delay: z
          .number()
          .optional()
          .describe("Optional delay in seconds (for testing async processing)"),
      }),
      execute: async ({ name, delay }) => {
        try {
          // Post the job to the job queue
          const response: JobResponse = await this.callAsyncTool(
            { name, delay },
            agentId
          );

          console.log("helloWorldTool synchronous tool response", response);

          if (response.success) {
            return {
              message:
                "Tool call has been queued and is being processed. Results will be delivered when ready.",
              toolCallId: response.jobId,
            };
          } else {
            throw new Error(`Failed to queue job: ${response.message}`);
          }
        } catch (error) {
          console.error("Error submitting HelloWorld job:", error);
          throw new Error(
            `Failed to process greeting: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const helloWorldTool = new HelloWorldTool();
toolRegistry.registerTool(helloWorldTool);
