import { Router } from "express";
import agentController from "../controllers/agentController";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

/**
 * @route GET /api/agents
 * @desc Get all agents
 * @access Public
 */
router.get("/", asyncHandler(agentController.getAllAgents));

/**
 * @route POST /api/agents/:agentId/chat
 * @desc Chat with an agent
 * @access Public
 */
router.post("/:agentId/chat", asyncHandler(agentController.chatWithAgent));

/**
 * @route POST /api/agents
 * @desc Create an agent
 * @access Public
 */
router.post("/", asyncHandler(agentController.createAgent));

/**
 * @route GET /api/agents/:id
 * @desc Get an agent by ID
 * @access Public
 */
router.get("/:id", asyncHandler(agentController.getAgentById));

/**
 * @route GET /api/agents/:id/messages
 * @desc Get an agent by ID with message history
 * @access Public
 */
router.get(
  "/:id/messages",
  asyncHandler(agentController.getAgentWithMessageHistory)
);

/**
 * @route POST /api/agents/:agentId/webhook/:toolName
 * @desc Handle agent webhook
 * @access Public
 */
router.post(
  "/:agentId/webhook/:toolName/:toolCallId",
  asyncHandler(agentController.handleWebhook)
);

/**
 * @route DELETE /api/agents/:agentId/messages
 * @desc Clear message history for an agent
 * @access Public
 */
router.delete(
  "/:agentId/messages",
  asyncHandler(agentController.clearAgentMessageHistory)
);

export default router;
