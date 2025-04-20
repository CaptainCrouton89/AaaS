import { Request, Response } from "express";
import { toolRegistry } from "../tools/async-tools";

export const getTools = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tools = toolRegistry.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));

    res.json({
      success: true,
      count: tools.length,
      tools,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
