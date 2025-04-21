import { Tool } from "ai";
import { callAsyncTool } from "../utils";

// Interface for tool execution result
export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

// Base tool class that all tools should extend
export abstract class BaseAsyncJobTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract execute(
    agentId: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;
  abstract getSynchronousTool(agentId: string): Tool;

  callAsyncTool(args: Record<string, unknown>, agentId: string) {
    return callAsyncTool({
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
  private tools: Map<string, BaseAsyncJobTool> = new Map();

  private constructor() {}

  // Singleton pattern
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  // Register a tool
  public registerTool(tool: BaseAsyncJobTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  // Get a tool by name
  public getTool(name: string): BaseAsyncJobTool | undefined {
    return this.tools.get(name);
  }

  // Check if a tool exists
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // Get all registered tools
  public getAllTools(): BaseAsyncJobTool[] {
    return Array.from(this.tools.values());
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();

// Function to execute a tool by name
export async function executeTool(
  toolName: string,
  agentId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const tool = toolRegistry.getTool(toolName);

  if (!tool) {
    return {
      success: false,
      data: null,
      error: `Tool '${toolName}' not found.`,
    };
  }

  try {
    return await tool.execute(agentId, args);
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Error executing tool '${toolName}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
