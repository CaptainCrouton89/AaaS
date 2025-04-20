import { Router } from "express";
import { getTools } from "../controllers/toolController";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// GET all tools
router.get("/", asyncHandler(getTools));

export default router;
