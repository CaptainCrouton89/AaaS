import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, tool } from "ai";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { functionWithExponentialBackoff } from "../../../lib/utils";
import { Agent } from "../../../types/database";
import { JobResponse } from "../../utils";
import { BaseAsyncJobTool, toolRegistry, ToolResult } from "../baseTool";
import { PathRegistry, registerDirectories, Registry } from "./PathRegistry";
import {
  getDetailedFileStructureSystemPrompt,
  getDetailedFileStructureUserPrompt,
} from "./prompts/detailedFileStructure.prompt";
import {
  getExecutiveSummarySystemPrompt,
  getExecutiveSummaryUserPrompt,
} from "./prompts/executiveSummary.prompt";
import { getProgrammingSystemPrompt } from "./prompts/programming.system.prompt";
import { Directory, DirectorySchema, File } from "./types";
// Type for ScrapeTool arguments
type WriteCodeToolArgs = {
  systemPrompt: string;
  codePrompt: string;
  relativeFilePath: string;
};

// Log entry interface
interface LogEntry {
  timestamp: string;
  source: string;
  stage: string;
  type: string;
  data: any;
}

export class WriteCodeTool extends BaseAsyncJobTool<WriteCodeToolArgs> {
  readonly name = "writeCode";
  readonly description = "Writes code for a given project";
  private logDir: string;
  private runId: string;
  private logEntries: LogEntry[] = [];
  private logFilePath: string;

  constructor() {
    super();
    this.logDir = path.resolve(process.cwd(), "logs", "writeCodeTool");
    this.ensureLogDirectory();
    this.runId = this.generateRunId();
    this.logFilePath = path.join(this.logDir, `${this.runId}.json`);
  }

  /**
   * Generates a unique run ID based on timestamp
   */
  private generateRunId(): string {
    return `run_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  }

  /**
   * Creates a new run ID and log file for a new execution
   */
  private startNewRun(): void {
    this.runId = this.generateRunId();
    this.logEntries = [];
    this.logFilePath = path.join(this.logDir, `${this.runId}.json`);
    // Initialize the log file with an empty array
    fs.writeFileSync(this.logFilePath, JSON.stringify([], null, 2), "utf8");
    console.log(`Started new log run: ${this.runId}`);
  }

  /**
   * Ensures that the log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`Created log directory at ${this.logDir}`);
    }
  }

  /**
   * Adds a log entry and updates the log file
   * @param source The source of the log (e.g., 'sync', 'async')
   * @param stage The processing stage (e.g., 'executiveSummary', 'architecture')
   * @param type The type of log (e.g., 'input', 'output')
   * @param data The data to log
   */
  private addLogEntry(
    source: string,
    stage: string,
    type: string,
    data: any
  ): void {
    try {
      // Format the data for better readability if it's JSON or contains JSON
      let formattedData = data;

      if (typeof data === "string") {
        // Try to detect and parse JSON in the string (handles both raw JSON and code blocks)
        const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/g;
        const matches = [...data.matchAll(jsonRegex)];

        if (matches.length > 0) {
          let processedData = data;
          for (const match of matches) {
            const jsonStr = match[1] || match[2]; // Get the matched JSON string
            try {
              const parsed = JSON.parse(jsonStr);
              const formatted = JSON.stringify(parsed, null, 2);
              // Replace the original JSON with the prettified version
              if (match[1]) {
                // It was in a code block
                processedData = processedData.replace(
                  match[0],
                  "```json\n" + formatted + "\n```"
                );
              } else {
                processedData = processedData.replace(match[0], formatted);
              }
            } catch (parseError: Error | unknown) {
              // If parsing fails, leave as-is
              console.log(
                `Failed to parse JSON in string: ${
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError)
                }`
              );
            }
          }
          formattedData = processedData;
        }
      } else if (typeof data === "object" && data !== null) {
        // Convert object to formatted JSON string
        try {
          formattedData = JSON.stringify(data, null, 2);
        } catch (stringifyError) {
          console.error("Error stringifying object:", stringifyError);
          formattedData = String(data);
        }
      }

      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        source,
        stage,
        type,
        data: formattedData,
      };

      this.logEntries.push(logEntry);

      // Update the log file with all entries
      fs.writeFileSync(
        this.logFilePath,
        JSON.stringify(this.logEntries, null, 2),
        "utf8"
      );

      console.log(`Added log entry for ${source}:${stage}:${type}`);
    } catch (error) {
      console.error(`Error adding log entry for ${stage} ${type}:`, error);
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
    code: string,
    context: string
  ): { success: boolean; error?: string } {
    try {
      // Normalize the file path
      const normalizedPath = this.normalizeFilePath(filePath);

      // Get the directory path
      const dirPath = path.dirname(normalizedPath);

      // Ensure the directory exists

      this.ensureDirectoryExists(dirPath);

      const fileContent = `/*
${context}
*/
${code}`;

      // Write the file
      fs.writeFileSync(normalizedPath, fileContent, "utf8");

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error saving file to ${filePath}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  queueDirectoryForCodeCreation = (
    executiveSummary: string,
    pathRegistry: PathRegistry,
    agentId: string,
    jobPromises: Promise<JobResponse>[],
    dir: Directory,
    rootPath: string,
    path = ""
  ) => {
    // Process each file in this directory
    if (dir.files) {
      for (const file of dir.files) {
        const filePath = path ? `${path}/${file.name}` : file.name;
        console.log(
          `filePath: ${filePath}, fileContext: ${file}, agentId: ${agentId}`
        );

        // Log each file being queued for processing
        this.addLogEntry("sync", "queueing", "file", {
          filePath,
          fileContext: file,
        });

        const prompt = this.getPrompt(
          executiveSummary,
          file,
          pathRegistry.getRegistry(),
          rootPath,
          filePath
        );

        const jobPromise = this.callAsyncTool(
          {
            systemPrompt: getProgrammingSystemPrompt(executiveSummary),
            codePrompt: prompt,
            relativeFilePath: filePath,
          },
          agentId
        );
        jobPromises.push(jobPromise);
      }
    }
    if (dir.subDirectories) {
      for (const subDir of dir.subDirectories) {
        const subPath = path ? `${path}/${subDir.name}` : subDir.name;
        this.queueDirectoryForCodeCreation(
          executiveSummary,
          pathRegistry,
          agentId,
          jobPromises,
          subDir,
          rootPath,
          subPath
        );
      }
    }
  };

  async execute(
    agent: Agent,
    { relativeFilePath, codePrompt, systemPrompt }: WriteCodeToolArgs
  ): Promise<ToolResult> {
    // Log the input for code generation
    this.addLogEntry("async", "writeCode", "input", {
      system: systemPrompt,
      user: codePrompt,
    });

    try {
      const codeResult = await functionWithExponentialBackoff(
        async () =>
          generateText({
            model: anthropic("claude-3-7-sonnet-20250219"),
            temperature: 0,
            maxRetries: 1,
            system: systemPrompt,
            prompt: codePrompt,
          }),
        10,
        5000
      );

      let codeContent = codeResult.text.trim();
      // Strip markdown code block fences if present
      const codeBlockRegex = /^```(?:\w+)?\n([\s\S]*?)\n```$/;
      const match = codeContent.match(codeBlockRegex);
      if (match && match[1]) {
        codeContent = match[1].trim();
      }

      if (!agent.cwd) {
        // Log the error
        this.addLogEntry(
          "async",
          "writeCode",
          "error",
          "Agent has no working directory"
        );
        return {
          success: false,
          type: "markdown",
          data: `Error writing code: Agent has no working directory`,
        };
      }

      // Log the generated code
      this.addLogEntry("async", "writeCode", "output", codeContent);

      // Save the generated code to a file
      const absoluteFilePath = path.resolve(agent.cwd, relativeFilePath);
      const saveResult = this.saveCodeToFile(
        absoluteFilePath,
        codeContent,
        `Relative file path: ${relativeFilePath}\n\n${codePrompt}`
      );

      if (!saveResult.success) {
        // Log the save error
        this.addLogEntry("async", "writeCode", "error", saveResult.error);
        return {
          success: false,
          type: "markdown",
          data: `Generated code successfully but failed to save to file: ${saveResult.error}`,
        };
      }

      // Log successful save
      this.addLogEntry("async", "writeCode", "success", {
        filePath: absoluteFilePath,
        saved: true,
      });

      return {
        success: true,
        type: "json",
        data: {
          filePath: absoluteFilePath,
          saved: true,
        },
      };
    } catch (error) {
      console.error("Error in writeCodeTool:", error);

      // Log the error
      this.addLogEntry(
        "async",
        "writeCode",
        "error",
        error instanceof Error ? error.message : String(error)
      );

      return {
        success: false,
        type: "markdown",
        data: `Error writing code: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private getPrompt(
    executiveSummary: string,
    fileContext: File,
    pathRegistry: Registry,
    rootPath: string,
    relativeFilePath: string
  ) {
    const importedPathRegistry = new PathRegistry(pathRegistry);

    const importFileContext = fileContext.imports
      ? importedPathRegistry
          .formatContextFromImports(fileContext.imports, rootPath)
          .map(({ path, context }) => `${path}: ${context}`)
          .join("\n")
      : "";

    const importContext = fileContext.imports
      ?.map(({ filePathFromRoot }) => `- ${filePathFromRoot}`)
      .join("\n");

    const exportContext = fileContext.exports
      ?.map((exportItem) => {
        if (exportItem.type === "function") {
          return `<Function name="${exportItem.name}" description="${
            exportItem.description
          }">\n${
            exportItem.params
              ? `Parameters:\n${JSON.stringify(exportItem.params, null, 2)}\n`
              : ""
          }\nReturn type: ${exportItem.returnType}\n</Function>`;
        } else if (exportItem.type === "type") {
          return `<Type name="${exportItem.name}" description="${
            exportItem.description
          }">\nProperties:\n${JSON.stringify(
            exportItem.properties,
            null,
            2
          )}\n</Type>`;
        } else if (exportItem.type === "component") {
          return `<Component name="${exportItem.name}" description="${
            exportItem.description
          }">\n${
            exportItem.params
              ? `Parameters:\n${JSON.stringify(exportItem.params, null, 2)}`
              : ""
          }\n${
            exportItem.properties
              ? `Properties:\n${JSON.stringify(exportItem.properties, null, 2)}`
              : ""
          }\nExported as default export.\n</Component>`;
        } else if (exportItem.type === "class") {
          return `<Class name="${exportItem.name}" description="${exportItem.description}">\n</Class>`;
        }
      })
      .join("\n");

    const prompt = `Relevant file context:
${importFileContext}

Write the code for the file ${relativeFilePath} with the following specifications:
${fileContext.name}: ${fileContext.description}
Imports: 
${importContext}
Exports: 
${exportContext}

Instructions:
- Return only the raw code, no other text.
- Do not use imports from other files that are not listed in the imports section.
`;

    return prompt;
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: this.description,
      parameters: z.object({
        projectDescription: z
          .string()
          .describe("Project description (4-5 sentences, non-technical)"),
      }),
      execute: async ({ projectDescription }): Promise<ToolResult> => {
        try {
          // Start a new log run for this execution
          this.startNewRun();

          // Log the inputs for executive summary
          const executiveSummaryInput = {
            system: getExecutiveSummarySystemPrompt(),
            user: getExecutiveSummaryUserPrompt(projectDescription),
          };

          this.addLogEntry(
            "sync",
            "executiveSummary",
            "input",
            executiveSummaryInput
          );

          const executiveSummary = await generateText({
            model: openai("gpt-4.1"),
            system: executiveSummaryInput.system,
            prompt: executiveSummaryInput.user,
          });

          // Add validation for the executive summary
          if (!executiveSummary.text) {
            console.error(
              "Failed to generate executive summary: No text returned"
            );
            this.addLogEntry(
              "sync",
              "executiveSummary",
              "error",
              "No text returned from API"
            );
            throw new Error("Failed to generate executive summary");
          }

          // Log the executive summary output
          this.addLogEntry(
            "sync",
            "executiveSummary",
            "output",
            executiveSummary.text
          );

          try {
            console.log("Generating detailed architecture...");
            console.log(
              "Using text-based generation for architecture instead of generateObject"
            );

            // Prepare input for architecture generation
            const architectureSystemPrompt =
              getDetailedFileStructureSystemPrompt() +
              "\n\nIMPORTANT: Return a valid JSON object that strictly follows the DirectorySchema format.";
            const architectureUserPrompt =
              getDetailedFileStructureUserPrompt(executiveSummary.text) +
              "\n\nPlease ensure your response is valid JSON that can be parsed directly.";

            // Log the input for architecture generation
            this.addLogEntry("sync", "architecture", "input", {
              system: architectureSystemPrompt,
              user: architectureUserPrompt,
            });

            const architectureObjectResult = await generateObject({
              model: openai("gpt-4.1"),
              system: architectureSystemPrompt,
              prompt: architectureUserPrompt,
              schema: DirectorySchema,
            });

            // Log the raw architecture output
            this.addLogEntry(
              "sync",
              "architecture",
              "output",
              architectureObjectResult.object
            );

            // Register all directories in the architecture to the registry
            const pathRegistry = new PathRegistry({});

            registerDirectories(architectureObjectResult.object, pathRegistry);

            console.log(
              "pathRegistry.getRegistry()",
              pathRegistry.getRegistry()
            );

            console.log("All directories registered in the path registry");
            this.addLogEntry(
              "sync",
              "pathRegistry",
              "complete",
              pathRegistry.getRegistry()
            );

            // Process all files in the architecture
            const jobPromises: Promise<JobResponse>[] = [];

            console.log("queueing directory for code creation");
            console.log(
              "architectureObjectResult.object",
              JSON.stringify(architectureObjectResult.object, null, 2)
            );

            const dbPrompt = `
            With this context, write the code for the file init-db.sql.
            ${JSON.stringify(architectureObjectResult.object, null, 2)}
            `;

            const jobPromise = this.callAsyncTool(
              {
                systemPrompt: getProgrammingSystemPrompt(executiveSummary.text),
                codePrompt: dbPrompt,
                relativeFilePath: "init-db.sql",
              },
              agentId
            );

            jobPromises.push(jobPromise);

            // Start processing from the root directory
            this.queueDirectoryForCodeCreation(
              executiveSummary.text,
              pathRegistry,
              agentId,
              jobPromises,
              architectureObjectResult.object,
              architectureObjectResult.object.name
            );

            // Log the total number of jobs queued
            this.addLogEntry("sync", "queueing", "complete", {
              totalJobs: jobPromises.length,
            });

            // Await all job promises at the end
            const jobResponses = await Promise.all(jobPromises);

            // Log job responses
            this.addLogEntry("sync", "jobResponses", "complete", {
              successCount: jobResponses.filter((j) => j.success).length,
              failureCount: jobResponses.filter((j) => !j.success).length,
              totalJobs: jobResponses.length,
            });

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

            // Log the architecture error
            this.addLogEntry(
              "sync",
              "architecture",
              "error",
              architectureError instanceof Error
                ? architectureError.message
                : String(architectureError)
            );

            // Attempt to log the raw content if available in the error details
            const rawResponse = (architectureError as any).cause?.error
              ?.response?.choices?.[0]?.message?.content;
            if (rawResponse) {
              console.error(
                "Raw response causing validation error:",
                rawResponse
              );
              this.addLogEntry("sync", "architecture", "rawError", rawResponse);
            } else if (architectureError.cause?.value) {
              // Fallback for other potential error structures
              console.error(
                "Raw response causing validation error (fallback):",
                JSON.stringify(architectureError.cause.value, null, 2)
              );
              this.addLogEntry(
                "sync",
                "architecture",
                "rawErrorFallback",
                architectureError.cause.value
              );
            }
            return {
              success: false,
              type: "markdown",
              data: `Error generating detailed architecture: ${
                architectureError instanceof Error
                  ? architectureError.message
                  : String(architectureError)
              }`,
            };
          }
        } catch (error) {
          console.error("Error submitting write code job:", error);
          // Log the top-level error
          this.addLogEntry(
            "sync",
            "general",
            "error",
            error instanceof Error ? error.message : String(error)
          );
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
