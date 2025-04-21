import { Tool } from "ai";
import { callAsyncTool } from "../utils";

// Interface for tool execution result
export interface ToolResult {
  success: boolean;
  type: "markdown" | "json";
  data?: string | object;
}

// Base tool class that all tools should extend
export abstract class BaseAsyncJobTool<T> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract execute(agentId: string, args: T): Promise<ToolResult>;
  abstract getSynchronousTool(agentId: string): Tool;

  callAsyncTool(args: T, agentId: string) {
    return callAsyncTool<T>({
      toolName: this.name,
      args: args,
      agentId: agentId,
      path: this.name,
    });
  }
}

// Registry to store and retrieve tools
class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, BaseAsyncJobTool<any>> = new Map();

  private constructor() {}

  // Singleton pattern
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  // Register a tool
  public registerTool(tool: BaseAsyncJobTool<any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  // Get a tool by name
  public getTool(name: string): BaseAsyncJobTool<any> | undefined {
    return this.tools.get(name);
  }

  // Check if a tool exists
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // Get all registered tools
  public getAllTools(): BaseAsyncJobTool<any>[] {
    return Array.from(this.tools.values());
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();

// Function to execute a tool by name
export async function executeTool<T>(
  toolName: string,
  agentId: string,
  args: T
): Promise<ToolResult> {
  const tool = toolRegistry.getTool(toolName);

  if (!tool) {
    return {
      success: false,
      type: "markdown",
      data: `Tool '${toolName}' not found.`,
    };
  }

  try {
    return await tool.execute(agentId, args as T);
  } catch (error) {
    return {
      success: false,
      type: "json",
      data: JSON.stringify({
        error: `Error executing tool '${toolName}': ${
          error instanceof Error ? error.message : String(error)
        }`,
        stack: error instanceof Error ? error.stack : String(error),
        toolName: toolName,
        agentId: agentId,
        args: args,
      }),
    };
  }
}
