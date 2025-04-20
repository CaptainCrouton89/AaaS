import { Router } from "express";
import { taskController } from "../controllers/taskController";

const router = Router();

// Task routes
router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

// Subtask routes
router.get("/:id/subtasks", taskController.getSubtasks);

// Task by owner routes
router.get("/owner/:ownerId", taskController.getTasksByOwnerId);

export default router;
