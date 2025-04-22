import { tool } from "ai";
import axios from "axios";
import { z } from "zod";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

// Type for ScrapeTool arguments
type ScrapeToolArgs = {
  url: string;
  formats?: Array<"markdown" | "html" | "links" | "screenshot">;
  onlyMainContent?: boolean;
  timeout?: number;
};

interface ScrapeResponseData {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  html?: string;
  links?: string[];
}

/**
 * Tool for scraping web pages using Hyperbrowser's API
 */
export class ScrapeTool extends BaseAsyncJobTool<ScrapeToolArgs> {
  readonly name = "scrape";
  readonly description =
    "Scrapes content from a web page using Hyperbrowser's API";
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    super();
    this.apiKey = process.env.HYPERBROWSER_API_KEY || "";
    this.apiUrl =
      process.env.HYPERBROWSER_API_URL || "https://app.hyperbrowser.ai/api";

    if (!this.apiKey) {
      console.warn(
        "HYPERBROWSER_API_KEY is not set. Scrape tool might not work properly."
      );
    }
  }

  async execute(
    agentId: string,
    { url, formats, onlyMainContent, timeout }: ScrapeToolArgs
  ): Promise<ToolResult> {
    console.log(`scrapeTool executing for URL: ${url}`);

    try {
      if (!this.apiKey) {
        return {
          success: false,
          type: "markdown",
          data: "Scraping failed: HYPERBROWSER_API_KEY is not configured",
        };
      }

      // Set default formats if not provided
      const defaultFormats = ["markdown"];
      const scrapeFormats = formats || defaultFormats;

      // Start the scrape job
      const startResponse = await axios.post(
        `${this.apiUrl}/scrape`,
        {
          url,
          scrapeOptions: {
            formats: scrapeFormats,
            onlyMainContent:
              onlyMainContent !== undefined ? onlyMainContent : true,
            timeout: timeout || 15000,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );

      const jobId = startResponse.data.jobId;
      if (!jobId) {
        return {
          success: false,
          type: "markdown",
          data: "Failed to start scrape job: No job ID returned",
        };
      }

      // Poll for job completion
      let maxAttempts = 30; // 30 attempts with 2s delay = max 1 minute wait
      let attempts = 0;
      let scrapeResult;

      while (attempts < maxAttempts) {
        attempts++;

        const checkResponse = await axios.get(
          `${this.apiUrl}/scrape/${jobId}`,
          {
            headers: {
              "x-api-key": this.apiKey,
            },
          }
        );

        if (checkResponse.data.status === "completed") {
          scrapeResult = checkResponse.data;
          break;
        } else if (checkResponse.data.status === "failed") {
          return {
            success: false,
            type: "markdown",
            data: `Scraping failed: ${
              checkResponse.data.error || "Unknown error"
            }`,
          };
        }

        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!scrapeResult) {
        return {
          success: false,
          type: "markdown",
          data: "Scraping timed out after waiting for completion",
        };
      }

      // Format the response
      const formattedData: ScrapeResponseData = {
        url: url,
        title: scrapeResult.data.metadata?.title || "No title",
        description:
          scrapeResult.data.metadata?.description || "No description",
      };

      // Add different format contents if available
      if (scrapeResult.data.markdown) {
        formattedData.markdown = scrapeResult.data.markdown;
      }

      if (scrapeResult.data.html) {
        formattedData.html = scrapeResult.data.html;
      }

      if (scrapeResult.data.links) {
        formattedData.links = scrapeResult.data.links;
      }

      return {
        success: true,
        type: "json",
        data: formattedData,
      };
    } catch (error) {
      console.error("Error in scrapeTool:", error);

      return {
        success: false,
        type: "markdown",
        data: `Error scraping URL: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: this.description,
      parameters: z.object({
        url: z.string().url().describe("The URL of the webpage to scrape"),
        formats: z
          .array(z.enum(["markdown", "html", "links", "screenshot"]))
          .optional()
          .describe("Content formats to extract (default: ['markdown'])"),
        onlyMainContent: z
          .boolean()
          .optional()
          .describe(
            "Extract only the main content, filtering out navigation, footers, etc."
          ),
        timeout: z
          .number()
          .optional()
          .describe(
            "Maximum time in milliseconds to wait for the page to load"
          ),
      }),
      execute: async ({
        url,
        formats,
        onlyMainContent,
        timeout,
      }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              url,
              formats,
              onlyMainContent,
              timeout,
            },
            agentId
          );

          if (response.success) {
            return {
              success: true,
              data: `Your scraping request for ${url} has been queued. You will be notified when the results are ready.`,
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
const scrapeTool = new ScrapeTool();
toolRegistry.registerTool(scrapeTool);

// Export the tool instance
export { scrapeTool };
