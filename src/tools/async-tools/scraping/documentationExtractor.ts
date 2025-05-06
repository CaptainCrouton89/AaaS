import extractDocs from "@r-mcp/docs-extractor";
import { tool } from "ai";
import { z } from "zod";
import { Agent } from "../../../types/database";
import { JobResponse } from "../../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "../baseTool";

// Type for ScrapeTool arguments
type DocumentationExtractorArgs = {
  urls: string[];
  focusOn: string;
};

/**
 * Tool for scraping web pages using Hyperbrowser's API
 */
export class DocumentationExtractor extends BaseAsyncJobTool<DocumentationExtractorArgs> {
  readonly name = "documentationExtractor";
  readonly description =
    "Intelligently extracts documentation from one or more URLs and returns high quality documentation in markdown format";

  constructor() {
    super();
  }

  async execute(
    agent: Agent,
    { urls, focusOn }: DocumentationExtractorArgs
  ): Promise<ToolResult> {
    console.log(`documentationExtractor executing for URLs: ${urls}`);

    try {
      const documentation = await extractDocs({
        links: urls,
        documentationFocus: focusOn,
        includeReasoning: true,
      });

      return {
        success: true,
        type: "markdown",
        data: documentation,
      };
    } catch (error) {
      console.error("Error in documentationExtractor:", error);

      return {
        success: false,
        type: "markdown",
        data: `Error extracting documentation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: this.description,
      parameters: z.object({
        urls: z
          .array(z.string().url())
          .describe("The URLs of the webpages to extract documentation from"),
        focusOn: z
          .string()
          .describe("The specific documentation focus to extract"),
      }),
      execute: async ({ urls, focusOn }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              urls,
              focusOn,
            },
            agentId
          );

          if (response.success) {
            return {
              success: true,
              data: `Your documentation extraction request has been queued. You will be notified when the results are ready.`,
              type: "markdown",
            };
          } else {
            throw new Error(`Failed to queue scrape job: ${response.message}`);
          }
        } catch (error) {
          console.error("Error submitting scrape job:", error);
          throw new Error(
            `Failed to process scrape request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const documentationExtractor = new DocumentationExtractor();
toolRegistry.registerTool(documentationExtractor);

// Export the tool instance
export { documentationExtractor };
