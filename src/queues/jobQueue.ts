import axios from "axios";
import Queue from "bull";
import { executeTool } from "../tools/async-tools/baseTool";

// Interface for job data
export interface JobData {
  toolName: string;
  args: Record<string, unknown>;
  agentId?: string;
  path?: string;
  timestamp?: string;
}

// Interface for job result
export interface JobResult {
  completed: boolean;
  timestamp: string;
  [key: string]: string | number | boolean;
}

// Connect to Redis
const jobQueue = new Queue<JobData>("agent-job-queue", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Process jobs
jobQueue.process(5, async (job) => {
  try {
    job.progress(0);
    const { toolName, args, agentId, path } = job.data;

    console.log(`Processing job ${job.id} for tool: ${toolName}`);
    console.log(`Tool arguments:`, args);

    // Execute the tool
    const toolResult = await executeTool(toolName, args);
    job.progress(100);

    if (toolResult.success) {
      console.log(`Tool '${toolName}' executed successfully`);
    } else {
      console.error(`Tool '${toolName}' execution failed:`, toolResult.error);
    }

    if (!agentId && !path) {
      return {
        completed: true,
        timestamp: new Date().toISOString(),
        webhookStatus: 0,
        webhookError: `Webhook URL not found`,
      };
    }

    // Ping the agent webhook with the result
    const webhookUrl = `${process.env.URL}/api/agents/${agentId}/webhook/${path}/${job.id}`;

    try {
      const response = await axios.post(webhookUrl, {
        success: toolResult.success,
        data: toolResult.data,
        error: toolResult.error,
      });

      console.log(
        `Webhook notification sent to ${webhookUrl}, status: ${response.status}`
      );

      return {
        completed: true,
        timestamp: new Date().toISOString(),
        webhookStatus: response.status,
      };
    } catch (error) {
      // Handle webhook errors more cleanly
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;

        if (statusCode === 404) {
          console.error(`Webhook endpoint not found: ${webhookUrl}`);
        } else {
          console.error(`Webhook error (${statusCode}): ${errorMessage}`);
        }

        return {
          completed: true, // The tool execution was completed, even if webhook failed
          timestamp: new Date().toISOString(),
          webhookStatus: statusCode || 0,
          webhookUrl: webhookUrl,
          webhookError: `Failed to send result: ${errorMessage}`,
          toolSuccess: toolResult.success,
          toolData: toolResult.data,
        };
      }

      console.error(
        `Webhook notification failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        completed: true,
        timestamp: new Date().toISOString(),
        webhookStatus: 0,
        webhookError: `Unknown error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        toolSuccess: toolResult.success,
        toolData: toolResult.data,
      };
    }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

// Event listeners
jobQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} has been completed with result:`, result);
});

jobQueue.on("failed", (job, error) => {
  console.error(`Job ${job.id} has failed with error:`, error);
});

jobQueue.on("progress", (job, progress) => {
  console.log(`Job ${job.id} is ${progress}% complete`);
});

export default jobQueue;
