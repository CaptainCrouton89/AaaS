import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, tool } from "ai";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { Agent } from "../../../types/database";
import { JobResponse } from "../../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "../baseTool";
import { FunctionContextType, getProgrammingSystemPrompt } from "./formatting";
import {
  getDetailedFileStructureSystemPrompt,
  getDetailedFileStructureUserPrompt,
} from "./prompts/detailedFileStructure.prompt";
import {
  getExecutiveSummarySystemPrompt,
  getExecutiveSummaryUserPrompt,
} from "./prompts/executiveSummary.prompt";

// Type for ScrapeTool arguments
type WriteCodeToolArgs = {
  fileContext: DetailedFile;
  relativeFilePath: string;
};

interface WriteCodeResponseData {}

type Directory = {
  name: string;
  files: File[];
  subDirectories: Directory[];
};

type File = {
  name: string;
  description: string;
  dependencies: string[];
};

type DetailedFile = {
  name: string;
  description: string;
  dependencies: string[];
  functionsWithin: FunctionContextType[];
};

type DetailedDirectory = {
  name: string;
  files: DetailedFile[];
  subDirectories: DetailedDirectory[];
};

const FileSchema = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    dependencies: z.array(z.string()),
  })
);

const DirectorySchema: z.ZodType<Directory> = z.lazy(() =>
  z.object({
    name: z.string(),
    files: z.array(FileSchema),
    subDirectories: z.array(DirectorySchema),
  })
);

const FunctionContextTypeSchema: z.ZodType<FunctionContextType> = z.object({
  functionName: z.string().describe("The name of the function"),
  functionDescription: z
    .string()
    .describe(
      "A brief, information-rich description of what the function does"
    ),
  functionParams: z
    .record(
      z.string().describe("The name of the parameter"),
      z.string().describe("The type of the parameter")
    )
    .nullable()
    .transform((val) => (val === undefined ? null : val))
    .describe("The parameters of the function"),
  functionReturnType: z
    .string()
    .describe("The type of data returned by the function"),
});

const DetailedFileSchema: z.ZodType<DetailedFile> = z.lazy(() =>
  z.object({
    name: z.string().describe("The name of the file"),
    description: z
      .string()
      .describe("A brief, information-rich description of the file"),
    dependencies: z
      .array(z.string())
      .describe(
        "The internal dependencies of the file, including other files and functions"
      ),
    functionsWithin: z
      .array(FunctionContextTypeSchema)
      .describe("The functions within the file"),
  })
);

const DetailedDirectorySchema: z.ZodType<DetailedDirectory> = z.lazy(() =>
  z.object({
    name: z.string().describe("The name of the directory"),
    files: z.array(DetailedFileSchema),
    subDirectories: z.array(DetailedDirectorySchema),
  })
);

export class WriteCodeTool extends BaseAsyncJobTool<WriteCodeToolArgs> {
  readonly name = "writeCode";
  readonly description =
    "Writes code for a given project using Hyperbrowser's API";
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

  /**
   * Ensures that a directory exists, creating it recursively if needed
   * @param dirPath The directory path to ensure exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Normalizes a file path to ensure consistent format
   * @param filePath The file path to normalize
   * @returns The normalized file path
   */
  private normalizeFilePath(filePath: string): string {
    // Ensure the path is absolute
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(process.cwd(), filePath);
    }
    return filePath;
  }

  /**
   * Saves code to a file, creating directories as needed
   * @param filePath The path where the file should be saved
   * @param code The code content to save
   * @returns Object containing success status and any error message
   */
  private saveCodeToFile(
    filePath: string,
    code: string
  ): { success: boolean; error?: string } {
    try {
      // Normalize the file path
      const normalizedPath = this.normalizeFilePath(filePath);

      // Get the directory path
      const dirPath = path.dirname(normalizedPath);

      // Ensure the directory exists
      this.ensureDirectoryExists(dirPath);

      // Write the file
      fs.writeFileSync(normalizedPath, code, "utf8");

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error saving file to ${filePath}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async execute(
    agent: Agent,
    { fileContext, relativeFilePath }: WriteCodeToolArgs
  ): Promise<ToolResult> {
    console.log(
      `writeCodeTool executing for file context: ${JSON.stringify(
        fileContext,
        null,
        2
      )}`
    );

    try {
      const codeResult = await generateText({
        model: openai("gpt-4.1-mini"),
        system: getProgrammingSystemPrompt([]),
        prompt: `Write the code for the file ${relativeFilePath} with the following context: ${JSON.stringify(
          fileContext
        )}
        
        Return only the raw code, no other text.`,
      });

      let codeContent = codeResult.text.trim();
      // Strip markdown code block fences if present
      const codeBlockRegex = /^```(?:\w+)?\n([\s\S]*?)\n```$/;
      const match = codeContent.match(codeBlockRegex);
      if (match && match[1]) {
        codeContent = match[1].trim();
      }

      if (!agent.cwd) {
        return {
          success: false,
          type: "markdown",
          data: `Error writing code: Agent has no working directory`,
        };
      }

      // Save the generated code to a file
      const absoluteFilePath = path.resolve(agent.cwd, relativeFilePath);
      const saveResult = this.saveCodeToFile(absoluteFilePath, codeContent);

      if (!saveResult.success) {
        return {
          success: false,
          type: "markdown",
          data: `Generated code successfully but failed to save to file: ${saveResult.error}`,
        };
      }

      return {
        success: true,
        type: "json",
        data: {
          code: codeContent,
          filePath: absoluteFilePath,
          saved: true,
        },
      };
    } catch (error) {
      console.error("Error in writeCodeTool:", error);

      return {
        success: false,
        type: "markdown",
        data: `Error writing code: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: this.description,
      parameters: z.object({
        projectBreakdown: z.string().describe("Project breakdown"),
      }),
      execute: async ({ projectBreakdown }): Promise<ToolResult> => {
        try {
          console.log(
            "Starting writeCodeTool execution with project breakdown:",
            projectBreakdown
          );

          const executiveSummary = await generateObject({
            model: openai("gpt-4.1-mini"),
            system: getExecutiveSummarySystemPrompt(),
            prompt: getExecutiveSummaryUserPrompt(projectBreakdown),
            schema: DirectorySchema,
          });

          // Add validation for the executive summary
          if (!executiveSummary.object) {
            console.error(
              "Failed to generate executive summary: No object returned"
            );
            throw new Error("Failed to generate executive summary");
          }

          console.log(
            "Executive summary generated successfully:",
            JSON.stringify(executiveSummary.object, null, 2)
          );

          // Ensure subDirectories exists even if empty
          if (!executiveSummary.object.subDirectories) {
            console.log(
              "Adding missing subDirectories array to executive summary"
            );
            executiveSummary.object.subDirectories = [];
          }

          try {
            console.log("Generating detailed architecture...");
            const { object: architectureObject } = await generateObject({
              model: openai("gpt-4.1-mini"),
              system: getDetailedFileStructureSystemPrompt(),
              prompt: getDetailedFileStructureUserPrompt(
                JSON.stringify(executiveSummary.object)
              ),
              schema: DetailedDirectorySchema,
            });

            console.log(
              "Detailed architecture generated successfully:",
              JSON.stringify(architectureObject, null, 2)
            );

            // Ensure all directory objects have subDirectories arrays
            const ensureSubDirectories = (dir: DetailedDirectory) => {
              if (!dir.subDirectories) {
                dir.subDirectories = [];
              }

              for (const subDir of dir.subDirectories) {
                ensureSubDirectories(subDir);
              }
            };

            ensureSubDirectories(architectureObject);

            // Process all files in the architecture
            const jobPromises: Promise<JobResponse>[] = [];
            const processDirectory = (dir: DetailedDirectory, path = "") => {
              // Process each file in this directory
              for (const file of dir.files) {
                // Ensure functionParams is set to null if undefined
                file.functionsWithin = file.functionsWithin.map((func) => ({
                  ...func,
                  functionParams: func.functionParams ?? null,
                }));

                const filePath = path ? `${path}/${file.name}` : file.name;
                console.log(
                  `filePath: ${filePath}, fileContext: ${file}, agentId: ${agentId}`
                );
                const jobPromise = this.callAsyncTool(
                  {
                    fileContext: file,
                    relativeFilePath: filePath,
                  },
                  agentId
                );
                jobPromises.push(jobPromise);
              }

              // Process subdirectories recursively
              for (const subDir of dir.subDirectories) {
                const subPath = path ? `${path}/${subDir.name}` : subDir.name;
                processDirectory(subDir, subPath);
              }
            };

            // Start processing from the root directory
            processDirectory(architectureObject);

            // Await all job promises at the end
            const jobResponses = await Promise.all(jobPromises);

            return {
              success: true,
              data: `Your code generation has been queued for ${jobResponses.length} files in the project. Files will be automatically saved to disk when generated. You will be notified when each file is ready.`,
              type: "markdown",
            };
          } catch (architectureError: any) {
            console.error(
              "Error generating detailed architecture:",
              architectureError
            );
            // Attempt to log the raw content if available in the error details
            if (architectureError.cause?.value) {
              console.error(
                "Raw response causing validation error:",
                JSON.stringify(architectureError.cause.value, null, 2)
              );

              // Try to extract required fields from failed response
              try {
                const failedValue = architectureError.cause.value;
                if (failedValue && typeof failedValue === "object") {
                  console.log("Attempting to recover from validation error...");

                  // Check which required fields are missing
                  if (failedValue.name && Array.isArray(failedValue.files)) {
                    console.log(
                      "Basic directory structure found, checking for missing subDirectories"
                    );

                    // If the object has the structure but is missing subDirectories, add it
                    if (!failedValue.subDirectories) {
                      console.log("Adding missing subDirectories array");
                      failedValue.subDirectories = [];

                      // Try processing with the fixed structure
                      const jobPromises: Promise<JobResponse>[] = [];

                      // Process each file in the root directory
                      for (const file of failedValue.files) {
                        // Ensure functionParams is set to null if undefined
                        if (file.functionsWithin) {
                          file.functionsWithin = file.functionsWithin.map(
                            (func: any) => ({
                              ...func,
                              functionParams: func.functionParams ?? null,
                            })
                          );
                        } else {
                          file.functionsWithin = [];
                        }

                        const filePath = file.name;
                        console.log(
                          `Recovered file: ${filePath}, fileContext: ${JSON.stringify(
                            file,
                            null,
                            2
                          )}, agentId: ${agentId}`
                        );
                        const jobPromise = this.callAsyncTool(
                          {
                            fileContext: file,
                            relativeFilePath: filePath,
                          },
                          agentId
                        );
                        jobPromises.push(jobPromise);
                      }

                      // Await all job promises
                      const jobResponses = await Promise.all(jobPromises);

                      return {
                        success: true,
                        data: `Your code generation has been queued for ${jobResponses.length} files in the project. Note: Recovery mode was used due to schema validation issues. Files will be automatically saved to disk when generated. You will be notified when each file is ready.`,
                        type: "markdown",
                      };
                    }
                  }
                }
              } catch (recoveryError) {
                console.error("Error during recovery attempt:", recoveryError);
              }
            }
            throw new Error(
              `Failed to generate detailed architecture: ${
                architectureError instanceof Error
                  ? architectureError.message
                  : String(architectureError)
              }`
            );
          }
        } catch (error) {
          console.error("Error submitting write code job:", error);
          throw new Error(
            `Failed to process write code request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const writeCodeTool = new WriteCodeTool();
toolRegistry.registerTool(writeCodeTool);

// Export the tool instance
export { writeCodeTool };
