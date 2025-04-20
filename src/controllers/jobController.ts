import { NextFunction, Request, Response } from "express";
import jobQueue, { JobData } from "../queues/jobQueue";

export const createJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { toolName, args, agentId, path } = req.body;

  // Validate required fields
  if (!toolName) {
    res.status(400).json({
      success: false,
      message: "Missing required fields: toolName is required",
    });
    return;
  }

  try {
    // Add job to queue
    // This will be processed by the job queue processor in jobQueue.ts
    // which will execute the tool with the matching toolName
    const job = await jobQueue.add({
      toolName,
      args: args || {},
      agentId: agentId || "",
      path: path || "",
    } as JobData);

    res.status(201).json({
      success: true,
      message: "Job successfully enqueued.",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Error enqueuing job:", error);
    next(error);
  }
};

export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;

  try {
    const job = await jobQueue.getJob(id);

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job not found",
      });
      return;
    }

    const state = await job.getState();

    res.json({
      success: true,
      job: {
        id: job.id,
        data: job.data,
        state,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllJobs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      jobQueue.getWaiting(),
      jobQueue.getActive(),
      jobQueue.getCompleted(),
      jobQueue.getFailed(),
    ]);

    res.json({
      success: true,
      jobs: {
        waiting: waiting.map((job) => ({ id: job.id, data: job.data })),
        active: active.map((job) => ({ id: job.id, data: job.data })),
        completed: completed.map((job) => ({ id: job.id, data: job.data })),
        failed: failed.map((job) => ({ id: job.id, data: job.data })),
      },
    });
  } catch (error) {
    next(error);
  }
};
