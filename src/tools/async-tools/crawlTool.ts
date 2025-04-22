import { tool } from "ai";
import axios from "axios";
import { z } from "zod";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

// Type for CrawlTool arguments
type CrawlToolArgs = {
  url: string;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  formats?: Array<"markdown" | "html" | "links" | "screenshot">;
  onlyMainContent?: boolean;
  timeout?: number;
};

// Interface for crawl response data
interface CrawlResponseData {
  totalCrawledPages: number;
  pages: Array<{
    url: string;
    title: string;
    description: string;
    status: string;
    markdown?: string;
    html?: string;
    links?: string[];
    error?: string;
  }>;
}

/**
 * Tool for crawling websites using Hyperbrowser's API
 */
export class CrawlTool extends BaseAsyncJobTool<CrawlToolArgs> {
  readonly name = "crawl";
  readonly description =
    "Crawls a website and its links to extract content from multiple pages";
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    super();
    this.apiKey = process.env.HYPERBROWSER_API_KEY || "";
    this.apiUrl =
      process.env.HYPERBROWSER_API_URL || "https://app.hyperbrowser.ai/api";

    if (!this.apiKey) {
      console.warn(
        "HYPERBROWSER_API_KEY is not set. Crawl tool might not work properly."
      );
    }
  }

  async execute(
    agentId: string,
    {
      url,
      maxPages,
      includePatterns,
      excludePatterns,
      formats,
      onlyMainContent,
      timeout,
    }: CrawlToolArgs
  ): Promise<ToolResult> {
    console.log(`crawlTool executing for URL: ${url}`);

    try {
      if (!this.apiKey) {
        return {
          success: false,
          type: "markdown",
          data: "Crawling failed: HYPERBROWSER_API_KEY is not configured",
        };
      }

      // Set default formats if not provided
      const defaultFormats = ["markdown"];
      const crawlFormats = formats || defaultFormats;

      // Prepare crawl request payload
      const payload: any = {
        url,
        maxPages: maxPages || 10, // Default to 10 pages max
      };

      // Add optional parameters if provided
      if (includePatterns && includePatterns.length > 0) {
        payload.includePatterns = includePatterns;
      }

      if (excludePatterns && excludePatterns.length > 0) {
        payload.excludePatterns = excludePatterns;
      }

      // Add scrape options
      payload.scrapeOptions = {
        formats: crawlFormats,
        onlyMainContent: onlyMainContent !== undefined ? onlyMainContent : true,
        timeout: timeout || 10000,
      };

      // Start the crawl job
      const startResponse = await axios.post(`${this.apiUrl}/crawl`, payload, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
      });

      const jobId = startResponse.data.jobId;
      if (!jobId) {
        return {
          success: false,
          type: "markdown",
          data: "Failed to start crawl job: No job ID returned",
        };
      }

      // Poll for job completion
      let maxAttempts = 60; // 60 attempts with 5s delay = max 5 minute wait
      let attempts = 0;
      let crawlResult;

      while (attempts < maxAttempts) {
        attempts++;

        const checkResponse = await axios.get(`${this.apiUrl}/crawl/${jobId}`, {
          headers: {
            "x-api-key": this.apiKey,
          },
        });

        if (checkResponse.data.status === "completed") {
          crawlResult = checkResponse.data;
          break;
        } else if (checkResponse.data.status === "failed") {
          return {
            success: false,
            type: "markdown",
            data: `Crawling failed: ${
              checkResponse.data.error || "Unknown error"
            }`,
          };
        }

        // Wait before checking again (longer wait for crawl as it takes more time)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!crawlResult) {
        return {
          success: false,
          type: "markdown",
          data: "Crawling timed out after waiting for completion",
        };
      }

      // Format the response
      const formattedData: CrawlResponseData = {
        totalCrawledPages: crawlResult.totalCrawledPages || 0,
        pages: [],
      };

      // Process each crawled page
      if (Array.isArray(crawlResult.data)) {
        formattedData.pages = crawlResult.data.map((page: any) => ({
          url: page.url || "Unknown URL",
          title: page.metadata?.title || "No title",
          description: page.metadata?.description || "No description",
          status: page.status || "unknown",
          markdown: page.markdown,
          html: page.html,
          links: page.links,
          error: page.error,
        }));
      }

      return {
        success: true,
        type: "json",
        data: formattedData,
      };
    } catch (error) {
      console.error("Error in crawlTool:", error);

      return {
        success: false,
        type: "markdown",
        data: `Error crawling website: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: this.description,
      parameters: z.object({
        url: z.string().url().describe("The URL of the website to crawl"),
        maxPages: z
          .number()
          .optional()
          .describe("Maximum number of pages to crawl (default: 10)"),
        includePatterns: z
          .array(z.string())
          .optional()
          .describe(
            "URL patterns to include in the crawl (e.g., ['/blogs/*'])"
          ),
        excludePatterns: z
          .array(z.string())
          .optional()
          .describe("URL patterns to exclude from the crawl"),
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
            "Maximum time in milliseconds to wait for each page to load"
          ),
      }),
      execute: async ({
        url,
        maxPages,
        includePatterns,
        excludePatterns,
        formats,
        onlyMainContent,
        timeout,
      }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              url,
              maxPages,
              includePatterns,
              excludePatterns,
              formats,
              onlyMainContent,
              timeout,
            },
            agentId
          );

          if (response.success) {
            const pagesLimit = maxPages
              ? `up to ${maxPages} pages`
              : "multiple pages";

            return {
              success: true,
              data: `Your crawl request for ${url} (${pagesLimit}) has been queued. You will be notified when the results are ready.`,
              type: "markdown",
            };
          } else {
            throw new Error(`Failed to queue crawl job: ${response.message}`);
          }
        } catch (error) {
          console.error("Error submitting crawl job:", error);
          throw new Error(
            `Failed to process crawl request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const crawlTool = new CrawlTool();
toolRegistry.registerTool(crawlTool);

// Export the tool instance
export { crawlTool };
