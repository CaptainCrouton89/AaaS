import express from "express";
import { setupBullBoard } from "./middleware/bullBoard";
import { errorHandler } from "./middleware/errorHandler";
import apiRoutes from "./routes";
// Import tools to ensure they're registered
import "./tools/async-tools";

// Create Express application
const app = express();

// Middleware
app.use(express.json());

// Set up Bull Board
const { router: bullBoardRouter, basePath: bullBoardPath } = setupBullBoard();
app.use(bullBoardPath, bullBoardRouter);

// API routes
app.use("/api", apiRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
