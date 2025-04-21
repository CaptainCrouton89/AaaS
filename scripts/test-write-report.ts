import dotenv from "dotenv";
dotenv.config();

import { executeTool } from "../src/tools/async-tools/baseTool";

async function main() {
  const agentId = process.env.TEST_AGENT_ID || "test-agent-id"; // Replace with a real agent ID

  // Execute the writeReport tool
  console.log(`Testing writeReport tool for agent ${agentId}`);

  try {
    const result = await executeTool("writeReport", agentId, {
      researchDepth: 3,
    });

    console.log("Tool execution result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error executing tool:", error);
  }
}

main().catch(console.error);
