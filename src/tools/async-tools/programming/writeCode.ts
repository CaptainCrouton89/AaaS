import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { Agent } from "../../../types/database";
import { JobResponse } from "../../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "../baseTool";
import { getProgrammingSystemPrompt } from "./formatting";
import { PathRegistry, Registry } from "./pathRegistry";
import {
  getDetailedFileStructureSystemPrompt,
  getDetailedFileStructureUserPrompt,
} from "./prompts/detailedFileStructure.prompt";
import {
  getExecutiveSummarySystemPrompt,
  getExecutiveSummaryUserPrompt,
} from "./prompts/executiveSummary.prompt";
import { Directory, File } from "./types";

// Type for ScrapeTool arguments
type WriteCodeToolArgs = {
  executiveSummary: string;
  fileContext: File;
  relativeFilePath: string;
  pathRegistry: Registry;
};

interface WriteCodeResponseData {}

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
    {
      executiveSummary,
      fileContext,
      relativeFilePath,
      pathRegistry,
    }: WriteCodeToolArgs
  ): Promise<ToolResult> {
    console.log(
      `writeCodeTool executing for file context: ${JSON.stringify(
        fileContext,
        null,
        2
      )}`
    );

    const importedPathRegistry = new PathRegistry(pathRegistry);

    const context = importedPathRegistry.formatContextFromImports(
      fileContext.imports
    );

    const prompt = `
        ${executiveSummary}

        Relevant file context:
        ${context}

        Write the code for the file ${relativeFilePath} with the following specifications:
        ${fileContext}
        
        Return only the raw code, no other text.`;

    // Log the input for code generation
    this.addLogEntry("async", "writeCode", "input", {
      system: getProgrammingSystemPrompt(),
      user: prompt,
    });

    try {
      const codeResult = await generateText({
        model: anthropic("claude-3-7-sonnet-20250219"),
        system: getProgrammingSystemPrompt(),
        prompt,
      });

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
      const saveResult = this.saveCodeToFile(absoluteFilePath, codeContent);

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
          code: codeContent,
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

          console.log(
            "Starting writeCodeTool execution with project description:",
            projectDescription
          );

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

          console.log(
            "Executive summary generated successfully:",
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

            const architectureTextResult = await generateText({
              model: openai("gpt-4o"),
              system: architectureSystemPrompt,
              prompt: architectureUserPrompt,
            });

            // Log the raw architecture output
            this.addLogEntry(
              "sync",
              "architecture",
              "output",
              architectureTextResult.text
            );

            console.log(
              "Text generation complete, attempting to parse as JSON"
            );
            let architectureObject;
            try {
              // Try to parse the text as JSON
              architectureObject = JSON.parse(architectureTextResult.text);
              console.log("Successfully parsed architecture JSON");
              // Log the parsed JSON
              this.addLogEntry(
                "sync",
                "architecture",
                "parsed",
                architectureObject
              );
            } catch (parseError) {
              console.error(
                "Failed to parse architecture as JSON:",
                parseError
              );

              // Log the parse error
              this.addLogEntry("sync", "architecture", "parseError", {
                error:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
                rawText: architectureTextResult.text,
              });

              // Log the raw text
              console.error("Raw response text:");
              console.error(architectureTextResult.text);

              // Try to extract JSON from the response using regex
              try {
                const jsonMatch =
                  architectureTextResult.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  console.log(
                    "Found potential JSON in the response, attempting to parse"
                  );
                  architectureObject = JSON.parse(jsonMatch[0]);
                  console.log("Successfully parsed extracted JSON");
                  // Log the extracted JSON
                  this.addLogEntry(
                    "sync",
                    "architecture",
                    "extractedParsed",
                    architectureObject
                  );
                } else {
                  this.addLogEntry(
                    "sync",
                    "architecture",
                    "extractError",
                    "No JSON object found in response"
                  );
                  throw new Error("No JSON object found in response");
                }
              } catch (extractError) {
                console.error(
                  "Failed to extract and parse JSON:",
                  extractError
                );
                this.addLogEntry(
                  "sync",
                  "architecture",
                  "extractError",
                  extractError instanceof Error
                    ? extractError.message
                    : String(extractError)
                );
                throw new Error("Could not parse architecture from response");
              }
            }

            console.log(
              "Detailed architecture generated successfully:",
              JSON.stringify(architectureObject, null, 2)
            );

            const pathRegistry = new PathRegistry({});

            // Register all directories in the architecture to the registry
            const registerDirectories = (dir: Directory, path = "") => {
              const currentPath = path ? `${path}/${dir.name}` : dir.name;
              console.log(`Registering directory: ${currentPath}`);
              pathRegistry.registerPath(currentPath, dir);

              for (const file of dir.files) {
                console.log(`Registering file: ${currentPath}/${file.name}`);
                pathRegistry.registerPath(`${currentPath}/${file.name}`, file);
              }

              for (const subDir of dir.subDirectories) {
                console.log(
                  `Processing subdirectory: ${subDir.name} in ${currentPath}`
                );
                registerDirectories(subDir, currentPath);
              }
            };

            // Use a safe conversion function to handle potential object structure issues
            const convertToValidDirectory = (obj: any): Directory => {
              console.log(
                `Converting object to Directory: ${obj?.name || "unnamed"}`
              );
              if (!obj) {
                console.error("Received null/undefined object to convert");
                this.addLogEntry(
                  "sync",
                  "architecture",
                  "conversionError",
                  "Received null/undefined object to convert"
                );
                return { name: "root", files: [], subDirectories: [] };
              }

              const dir: Directory = {
                name: obj.name || "root",
                files: [],
                subDirectories: [],
              };

              // Copy files if they exist
              if (Array.isArray(obj.files)) {
                console.log(
                  `Converting ${obj.files.length} files in ${dir.name}`
                );
                dir.files = obj.files.map((f: any) => ({
                  name: f.name || "untitled",
                  description: f.description || "",
                  imports: Array.isArray(f.imports) ? f.imports : [],
                  exports: Array.isArray(f.exports) ? f.exports : [],
                }));
              } else {
                console.warn(
                  `No files array in ${
                    dir.name
                  } or invalid format: ${typeof obj.files}`
                );
                this.addLogEntry(
                  "sync",
                  "architecture",
                  "warning",
                  `No files array in ${
                    dir.name
                  } or invalid format: ${typeof obj.files}`
                );
              }

              // Process subdirectories
              if (Array.isArray(obj.subDirectories)) {
                console.log(
                  `Processing ${obj.subDirectories.length} subdirectories in ${dir.name}`
                );
                // Use a try/catch for each subdirectory to prevent a single bad one from breaking everything
                const validSubDirs: Directory[] = [];
                for (const subDir of obj.subDirectories) {
                  if (!subDir || typeof subDir !== "object") {
                    console.warn(
                      `Skipping invalid subdirectory entry: ${typeof subDir}`
                    );
                    this.addLogEntry(
                      "sync",
                      "architecture",
                      "warning",
                      `Skipping invalid subdirectory entry: ${typeof subDir}`
                    );
                    continue;
                  }
                  try {
                    const convertedSubDir = convertToValidDirectory(subDir);
                    validSubDirs.push(convertedSubDir);
                  } catch (error) {
                    console.error(
                      `Error converting subdirectory ${
                        subDir?.name || "unnamed"
                      } in ${dir.name}:`,
                      error
                    );
                    this.addLogEntry(
                      "sync",
                      "architecture",
                      "error",
                      `Error converting subdirectory ${
                        subDir?.name || "unnamed"
                      } in ${dir.name}: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                    // Don't add it to the valid ones
                  }
                }
                dir.subDirectories = validSubDirs;
              } else {
                console.warn(
                  `No subDirectories array in ${
                    dir.name
                  } or invalid format: ${typeof obj.subDirectories}`
                );
                this.addLogEntry(
                  "sync",
                  "architecture",
                  "warning",
                  `No subDirectories array in ${
                    dir.name
                  } or invalid format: ${typeof obj.subDirectories}`
                );
              }

              console.log(
                `Conversion complete for ${dir.name} with ${dir.files.length} files and ${dir.subDirectories.length} subdirectories`
              );
              return dir;
            };

            // Convert and register
            console.log(
              "Starting conversion of architectureObject to valid Directory structure"
            );
            console.log(
              "Raw architectureObject structure:",
              JSON.stringify(
                typeof architectureObject === "object"
                  ? Object.keys(architectureObject || {})
                  : typeof architectureObject,
                null,
                2
              )
            );
            const validDirStructure =
              convertToValidDirectory(architectureObject);
            console.log(
              "Conversion completed, starting directory registration"
            );
            registerDirectories(validDirStructure, "");

            console.log("All directories registered in the path registry");
            this.addLogEntry("sync", "pathRegistry", "complete", {
              totalPaths: Object.keys(pathRegistry.getRegistry()).length,
            });

            // Process all files in the architecture
            const jobPromises: Promise<JobResponse>[] = [];
            const processDirectory = (dir: Directory, path = "") => {
              // Process each file in this directory
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

                const jobPromise = this.callAsyncTool(
                  {
                    executiveSummary: executiveSummary.text,
                    fileContext: file,
                    relativeFilePath: filePath,
                    pathRegistry: pathRegistry.getRegistry(),
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
            processDirectory(validDirStructure);

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
