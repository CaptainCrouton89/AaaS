import jobQueue from "./jobQueue";

// Example of enqueueing a job
async function enqueueExampleJob() {
  const job = await jobQueue.add({
    toolName: "exampleTool",
    args: {
      param1: "value1",
      param2: "value2",
    },
    agentId: "agent-123",
    path: "custom-path",
  });

  console.log(`Job added to queue with ID: ${job.id}`);
}

// Example usage
enqueueExampleJob()
  .then(() => console.log("Job enqueued successfully"))
  .catch((error) => console.error("Failed to enqueue job:", error));
