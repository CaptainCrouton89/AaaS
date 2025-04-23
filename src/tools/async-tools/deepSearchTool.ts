import { tool } from "ai";
import axios from "axios";
import { z } from "zod";
import { contextService, taskService } from "../../services";
import { Agent } from "../../types/database";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

const PERPLEXITY_DOMAINS = [
  "reddit",
  "twitter",
  "youtube",
  "tiktok",
  "instagram",
  "wikipedia",
  "news",
  "academia",
  "quora",
  "medium",
  "github",
  "stackoverflow",
  "google",
  "jstor",
  "pubmed",
  "sciencedirect",
  "arxiv",
  "springerlink",
  "wiley",
  "acm",
  "ieee",
  "taylor",
  "sage",
  "projectmuse",
  "eric",
  "ssrn",
  "plosone",
  "biomedcentral",
  "openlibhums",
  "doaj",
  "hal",
  "researchgate",
] as const;

const DOMAIN_MAP: Record<(typeof PERPLEXITY_DOMAINS)[number], string> = {
  reddit: "https://www.reddit.com",
  twitter: "https://twitter.com",
  youtube: "https://www.youtube.com",
  tiktok: "https://www.tiktok.com",
  instagram: "https://www.instagram.com",
  wikipedia: "https://www.wikipedia.org",
  news: "https://www.news.com",
  academia: "https://www.academia.edu",
  quora: "https://www.quora.com",
  medium: "https://www.medium.com",
  github: "https://www.github.com",
  stackoverflow: "https://www.stackoverflow.com",
  google: "https://scholar.google.com",
  jstor: "https://www.jstor.org",
  pubmed: "https://pubmed.ncbi.nlm.nih.gov",
  sciencedirect: "https://www.sciencedirect.com",
  arxiv: "https://arxiv.org",
  springerlink: "https://link.springer.com",
  wiley: "https://onlinelibrary.wiley.com",
  acm: "https://dl.acm.org",
  ieee: "https://ieeexplore.ieee.org",
  taylor: "https://www.tandfonline.com",
  sage: "https://journals.sagepub.com",
  projectmuse: "https://muse.jhu.edu",
  eric: "https://eric.ed.gov",
  ssrn: "https://www.ssrn.com",
  plosone: "https://journals.plos.org/plosone",
  biomedcentral: "https://www.biomedcentral.com",
  openlibhums: "https://www.openlibhums.org",
  doaj: "https://www.doaj.org",
  hal: "https://hal.archives-ouvertes.fr",
  researchgate: "https://www.researchgate.net",
};
// Interface for Perplexity API Response
interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

type DeepSearchToolArgs = {
  query: string;
  taskId: string;
  model?: string;
  contextSize?: string;
  excludeDomains?: (typeof PERPLEXITY_DOMAINS)[number][];
  includeDomains?: (typeof PERPLEXITY_DOMAINS)[number][];
};

export class DeepSearchTool extends BaseAsyncJobTool<DeepSearchToolArgs> {
  readonly name = "deepSearch";
  readonly description =
    "Performs deep research and search on a topic using Perplexity API";

  private async callPerplexityAPI(
    query: string,
    model: string,
    contextSize: string,
    excludeDomains?: (typeof PERPLEXITY_DOMAINS)[number][],
    includeDomains?: (typeof PERPLEXITY_DOMAINS)[number][]
  ): Promise<string> {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY environment variable is not set");
    }

    try {
      const response = await axios.post<PerplexityResponse>(
        "https://api.perplexity.ai/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert researcher in your field. Provide detailed, accurate information with citations when appropriate.",
            },
            {
              role: "user",
              content: query,
            },
          ],
          temperature: 0.2,
          max_tokens: 10000,
          top_p: 0.9,
          frequency_penalty: 1,
          presence_penalty: 0,
          web_search_options: {
            search_context_size: contextSize,
            search_domain_filter: [
              ...(excludeDomains?.map((domain) => DOMAIN_MAP[domain]) || []),
              ...(includeDomains?.map((domain) => "-" + DOMAIN_MAP[domain]) ||
                []),
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error("No response content received from Perplexity API");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Perplexity API Error: ${
            error.response?.data?.error?.message || error.message
          }`
        );
      }
      throw error;
    }
  }

  async execute(
    agent: Agent,
    {
      query,
      taskId,
      model = "sonar",
      contextSize = "medium",
    }: DeepSearchToolArgs
  ): Promise<ToolResult> {
    try {
      console.log(`deepSearchTool executing with query: ${query}`);

      // Call Perplexity API
      const researchResults = await this.callPerplexityAPI(
        query,
        model,
        contextSize
      );

      console.log("deepSearchTool executed successfully");
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        throw new Error("Task not found");
      }
      await contextService.appendToContext(task.context_id, researchResults);

      return {
        success: true,
        type: "markdown",
        data: "Query results for '" + query + "' added to task context.",
        nextSteps:
          "Continue researching if there's more information needed. Otherwise, continue with the next task.",
      };
    } catch (error) {
      console.error("Error in deepSearchTool:", error);
      return {
        success: false,
        type: "markdown",
        data: `Error in deepSearchTool: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description:
        "Performs deep research on topics using the Perplexity AI API and adds the results to the task context.",
      parameters: z.object({
        query: z
          .string()
          .describe("The search query or research question to investigate"),
        taskId: z.string().describe("The task ID associated with the research"),
        model: z
          .enum([
            "sonar",
            "pplx-7b-online",
            "pplx-70b-online",
            "sonar-deep-research",
          ])
          .optional()
          .default("sonar")
          .describe(
            "The Perplexity model to use, in order of depth of research (default: sonar)"
          ),
        excludeDomains: z
          .array(z.enum(PERPLEXITY_DOMAINS))
          .optional()
          .default([])
          .describe(
            "Domains to exclude from the search results (default: empty list)"
          ),
        includeDomains: z
          .array(z.enum(PERPLEXITY_DOMAINS))
          .optional()
          .default([])
          .describe(
            "Domains to include in the search results (default: empty list)"
          ),
        contextSize: z
          .enum(["low", "medium", "high"])
          .optional()
          .default("medium")
          .describe("How much search context to retrieve (default: medium)"),
      }),
      execute: async ({
        query,
        model,
        contextSize,
        taskId,
        excludeDomains,
        includeDomains,
      }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              query,
              model,
              contextSize,
              taskId,
              excludeDomains,
              includeDomains,
            },
            agentId
          );

          if (response.success) {
            return {
              success: true,
              data:
                "Your research request for '" +
                query +
                "' is pending. Results will be delivered when ready.",
              type: "markdown",
            };
          } else {
            throw new Error(
              `Failed to queue research job: ${response.message}`
            );
          }
        } catch (error) {
          console.error("Error submitting deepSearch job:", error);
          throw new Error(
            `Failed to process research request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const deepSearchTool = new DeepSearchTool();
toolRegistry.registerTool(deepSearchTool);
