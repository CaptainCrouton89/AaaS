import { Request, Response } from "express";
import { AgentType } from "../constants/agents";
import agentService from "../services/agentService";
import webhookQueueService from "../services/webhookQueueService";
/**
 * Controller to handle agent related requests
 */
class AgentController {
  constructor() {
    // Bind all methods to maintain 'this' context when used with Express middleware
    this.createAgent = this.createAgent.bind(this);
    this.chatWithAgent = this.chatWithAgent.bind(this);
    this.getAgentById = this.getAgentById.bind(this);
    this.getAgentWithMessageHistory =
      this.getAgentWithMessageHistory.bind(this);
    this.handleWebhook = this.handleWebhook.bind(this);
    this.clearAgentMessageHistory = this.clearAgentMessageHistory.bind(this);
    this.getAllAgents = this.getAllAgents.bind(this);

    // Also bind the private helper methods
    this.validateAgentId = this.validateAgentId.bind(this);
    this.validateChatMessage = this.validateChatMessage.bind(this);
    this.handleControllerError = this.handleControllerError.bind(this);
  }

  /**
   * Validates if an agent ID is present in the request
   * @param agentId The agent ID to validate
   * @param res Express response object
   * @returns True if agent ID is valid, false otherwise
   */
  private validateAgentId(agentId: string | undefined, res: Response): boolean {
    if (!agentId) {
      console.error(`[validateAgentId] Missing agent ID in request`);
      res.status(400).json({ error: "Agent ID is required" });
      return false;
    }
    return true;
  }

  /**
   * Handles errors in the controller methods
   * @param error The error that occurred
   * @param res Express response object
   * @param context Additional context about where the error occurred
   */
  private handleControllerError(
    error: any,
    res: Response,
    context: string
  ): Response {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({
      error: "An error occurred while processing the request",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Validates a chat message from the request body
   * @param message The message to validate
   * @param res Express response object
   * @returns True if message is valid, false otherwise
   */
  private validateChatMessage(message: any, res: Response): boolean {
    if (!message) {
      console.error(`[validateChatMessage] Missing message in request body`);
      res.status(400).json({
        error: "Message is required",
        hint: "Make sure 'message' is spelled correctly in your request body",
      });
      return false;
    }

    if (typeof message !== "string") {
      console.error(
        `[validateChatMessage] Invalid message type: ${typeof message}`
      );
      res.status(400).json({
        error: "Message must be a string",
        received: typeof message,
      });
      return false;
    }

    return true;
  }

  /**
   * Create an agent
   * @param req Express request object
   * @param res Express response object
   */
  public async createAgent(req: Request, res: Response) {
    try {
      const { name, goal, agentType, background } = req.body;
      const ownerId = req.user?.id || "system";

      const agent = await agentService.createAgent({
        title: name,
        goal: goal,
        agent_type: agentType as AgentType,
        background: background,
        owner: ownerId,
      });

      return res.status(201).json({ agent });
    } catch (error) {
      return this.handleControllerError(error, res, "createAgent");
    }
  }

  /**
   * Handle chat with agent endpoint
   * @param req Express request object
   * @param res Express response object
   */
  public async chatWithAgent(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { message } = req.body;

      console.log(
        `[chatWithAgent] Received chat request for agent: ${agentId}`
      );
      console.log(
        `[chatWithAgent] Request body:`,
        JSON.stringify(req.body, null, 2)
      );

      if (!this.validateAgentId(agentId, res)) return res;
      if (!this.validateChatMessage(message, res)) return res;

      // Process the chat using the agent service
      console.log(
        `[chatWithAgent] Sending message to agent service: "${message}"`
      );
      const result = await agentService.chatWithAgent(agentId, {
        role: "user",
        content: message,
      });
      console.log(`[chatWithAgent] Received response from agent service`);

      // Return the complete response
      return res.status(200).json({
        response: result?.text,
        usage: result?.usage,
      });
    } catch (error) {
      return this.handleControllerError(error, res, "chatWithAgent");
    }
  }

  /**
   * Get an agent by ID
   * @param req Express request object
   * @param res Express response object
   */
  public async getAgentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!this.validateAgentId(id, res)) return res;

      const agent = await agentService.getAgentById(id);

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      return res.status(200).json({ agent });
    } catch (error) {
      return this.handleControllerError(error, res, "getAgentById");
    }
  }

  /**
   * Get an agent by ID with message history
   * @param req Express request object
   * @param res Express response object
   */
  public async getAgentWithMessageHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!this.validateAgentId(id, res)) return res;

      const result = await agentService.getAgentWithMessageHistory(id);

      if (!result) {
        return res.status(404).json({ error: "Agent not found" });
      }

      return res.status(200).json(result);
    } catch (error) {
      return this.handleControllerError(
        error,
        res,
        "getAgentWithMessageHistory"
      );
    }
  }

  /**
   * Handle webhook from tools
   * @param req Express request object
   * @param res Express response object
   */
  public async handleWebhook(req: Request, res: Response) {
    try {
      const { agentId, toolName, toolCallId } = req.params;
      const { body } = req;

      if (!this.validateAgentId(agentId, res)) return res;
      if (!toolName) {
        return res.status(400).json({ error: "Tool name is required" });
      }

      console.log(
        `[handleWebhook] Received webhook for agent: ${agentId}, tool: ${toolName}`
      );

      // Queue the webhook for processing
      const queued = await webhookQueueService.handleWebhook(
        agentId,
        toolName,
        toolCallId,
        body
      );

      if (queued) {
        return res.status(200).json({
          success: true,
          message: "Webhook queued for processing",
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Failed to queue webhook",
        });
      }
    } catch (error) {
      return this.handleControllerError(error, res, "handleWebhook");
    }
  }

  /**
   * Clear message history for an agent
   * @param req Express request object
   * @param res Express response object
   */
  public async clearAgentMessageHistory(req: Request, res: Response) {
    try {
      const { agentId } = req.params;

      console.log(
        `[clearAgentMessageHistory] Clearing messages for agent: ${agentId}`
      );

      if (!this.validateAgentId(agentId, res)) return res;

      const result = await agentService.clearMessageHistory(agentId);

      if (result) {
        return res.status(200).json({
          success: true,
          message: `Message history cleared for agent: ${agentId}`,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Failed to clear message history",
        });
      }
    } catch (error) {
      return this.handleControllerError(error, res, "clearAgentMessageHistory");
    }
  }

  /**
   * Get all agents
   * @param req Express request object
   * @param res Express response object
   */
  public async getAllAgents(req: Request, res: Response) {
    try {
      console.log(`[getAllAgents] Retrieving all agents`);

      const agents = await agentService.getAllAgents();

      return res.status(200).json({ agents });
    } catch (error) {
      return this.handleControllerError(error, res, "getAllAgents");
    }
  }
}

// Export a singleton instance of the controller
export default new AgentController();
