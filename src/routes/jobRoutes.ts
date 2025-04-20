import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
} from "../controllers/jobController";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// GET all jobs
router.get("/", asyncHandler(getAllJobs));

// GET job by ID
router.get("/:id", asyncHandler(getJobById));

// POST new job
router.post("/", asyncHandler(createJob));

export default router;
