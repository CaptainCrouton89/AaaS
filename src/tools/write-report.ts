import { tool } from "ai";
import { z } from "zod";

export const writeReportTool = tool({
  description: "Write a report about the tasks you have completed",
  parameters: z.object({
    taskId: z.string().describe("The ID of the task you have completed"),
    report: z.string().describe("The report you have written"),
  }),
  execute: async ({ taskId, report }) => {
    console.log(`Writing report for task ${taskId}: ${report}`);
  },
});
