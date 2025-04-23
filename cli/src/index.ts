import axios from "axios";
import { Command } from "commander";
import { stdin as input, stdout as output } from "process";
import * as readline from "readline/promises";

const program = new Command();

program
  .name("aas-cli")
  .description("CLI for interacting with AaaS agents")
  .version("1.0.0");

// Function to send a single message
async function sendMessage(agentId: string, message: string) {
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3800";
  try {
    const response = await axios.post(
      `${apiBaseUrl}/api/agents/${agentId}/chat`,
      {
        message,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("\nError sending message:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return null; // Indicate failure
  }
}

// Function for interactive chat
async function startInteractiveChat(agentId: string) {
  const rl = readline.createInterface({ input, output });
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3800"; // Define here for reuse
  console.log(
    `Starting interactive chat with agent ${agentId}. Type 'exit' to quit or '/clear' to clear history.`
  );

  while (true) {
    const userInput = await rl.question("> ");
    const command = userInput.toLowerCase();

    if (command === "exit") {
      break;
    }

    if (command === "/clear") {
      try {
        console.log("Clearing chat history...");
        await axios.delete(`${apiBaseUrl}/api/agents/${agentId}/messages`);
        console.log("Chat history cleared successfully.");
      } catch (error: any) {
        console.error("\nError clearing chat history:", error.message);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
      }
      continue; // Prompt for next input
    }

    // Send message if it wasn't a command
    const responseData = await sendMessage(agentId, userInput);
    if (responseData) {
      // Assuming the agent's response is directly in responseData or a specific field like 'reply'
      // Adjust based on the actual API response structure
      const agentResponse =
        typeof responseData === "object" && responseData.reply
          ? responseData.reply
          : JSON.stringify(responseData);
      console.log(`a> ${agentResponse}`);
    } else {
      // Error already printed by sendMessage
      console.log("Failed to get response from agent.");
    }
  }

  rl.close();
  console.log("Chat session ended.");
}

program
  .command("chat")
  .description(
    "Send a message to an agent or start an interactive chat session"
  )
  .requiredOption("-a, --agentId <id>", "ID of the agent to chat with")
  .option(
    "-m, --message <text>",
    "The message to send (optional, starts interactive mode if omitted)"
  )
  .action(async (options) => {
    const { agentId, message } = options;

    if (message) {
      // Single message mode
      console.log(`Sending message to agent ${agentId}...`);
      const responseData = await sendMessage(agentId, message);
      if (responseData) {
        console.log("Response from agent:");
        console.log(responseData);
      } else {
        console.error("Failed to send message.");
      }
    } else {
      // Interactive mode
      await startInteractiveChat(agentId);
    }
  });

program.parse(process.argv);
