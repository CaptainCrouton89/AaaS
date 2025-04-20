import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Router } from "express";
import jobQueue from "../queues/jobQueue";

export const setupBullBoard = (): {
  router: Router;
  basePath: string;
} => {
  const serverAdapter = new ExpressAdapter();
  const basePath = "/admin/queues";
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [new BullAdapter(jobQueue)],
    serverAdapter,
  });

  return {
    router: serverAdapter.getRouter(),
    basePath,
  };
};
