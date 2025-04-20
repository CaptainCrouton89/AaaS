import { Router } from "express";
import agentRoutes from "./agentRoutes";
import jobRoutes from "./jobRoutes";
import toolRoutes from "./toolRoutes";

const router = Router();

// Mount all routes
router.use("/jobs", jobRoutes);
router.use("/tools", toolRoutes);
router.use("/agents", agentRoutes);

export default router;
