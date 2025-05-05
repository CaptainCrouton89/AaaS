#!/usr/bin/env node

import axios from "axios";
import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import MarkdownIt from "markdown-it";
import { stdin as input, stdout as output } from "process";
import * as readline from "readline/promises";

// Function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

const md = new MarkdownIt();
const program = new Command();

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log(chalk.blue("\nExiting CLI. Goodbye!"));
  process.exit(0);
});

program
  .name("aas-cli")
  .description("CLI for interacting with AaaS agents")
  .version("1.0.0");

// Function to fetch available agents
async function getAvailableAgents() {
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3800";
  try {
    const response = await axios.get(`${apiBaseUrl}/api/agents`);

    // Extract the agents array from the response
    let agents = response.data;

    // Check if the response has an 'agents' property
    if (
      response.data &&
      typeof response.data === "object" &&
      response.data.agents
    ) {
      agents = response.data.agents;
    }

    return agents;
  } catch (error: any) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error(chalk.red("\nError: Cannot connect to the AaaS server."));
      console.error(
        chalk.yellow(`Make sure the server is running at ${apiBaseUrl}`)
      );
      console.error(
        chalk.yellow(
          "You can set a custom API endpoint using the API_BASE_URL environment variable."
        )
      );
      process.exit(1);
    } else {
      console.error(chalk.red("\nError fetching agents:"), error.message);
      if (error.response) {
        console.error(chalk.red("Response data:"), error.response.data);
        console.error(chalk.red("Response status:"), error.response.status);
      }
    }
    return []; // Return empty array on failure
  }
}

// Function to prompt user to select an agent
async function promptForAgentSelection() {
  try {
    const agents = await getAvailableAgents();

    // Ensure we have a valid array of agents
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      console.error(
        chalk.red(
          "\nNo agents available or invalid response format from server."
        )
      );
      console.error(
        chalk.yellow(
          "Please create an agent first using the AaaS API or web interface."
        )
      );
      console.error(chalk.yellow("Example API call: POST /api/agents"));
      process.exit(1);
    }

    // Configure inquirer to handle Ctrl+C
    inquirer.prompt.prompts.list.prototype.onEnd = function (state: any) {
      if (state.answer === undefined) {
        console.log(chalk.blue("\nExiting CLI. Goodbye!"));
        process.exit(0);
      }
    };

    const { selectedAgent } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedAgent",
        message: "Select an agent to chat with:",
        choices: agents.map((agent: any) => ({
          name: `${agent.title || "Unnamed Agent"} (${agent.id})`,
          value: agent.id,
        })),
      },
    ]);

    return selectedAgent;
  } catch (error) {
    console.error(chalk.red("Error selecting agent:"), error);
    process.exit(1);
  }
}

// Function to configure API base URL
async function configureApiBaseUrl() {
  try {
    // Configure inquirer to handle Ctrl+C
    inquirer.prompt.prompts.input.prototype.onEnd = function (state: any) {
      if (state.answer === undefined) {
        console.log(chalk.blue("\nExiting CLI. Goodbye!"));
        process.exit(0);
      }
    };

    const { apiBaseUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "apiBaseUrl",
        message: "Enter the AaaS API base URL:",
        default: process.env.API_BASE_URL || "http://localhost:3800",
      },
    ]);

    return apiBaseUrl;
  } catch (error) {
    console.error(chalk.red("Error configuring API URL:"), error);
    process.exit(1);
  }
}

// Function to send a single message
async function sendMessage(
  agentId: string,
  message: string,
  verbose: boolean = false,
  apiBaseUrl?: string
) {
  const baseUrl =
    apiBaseUrl || process.env.API_BASE_URL || "http://localhost:3800";
  try {
    const response = await axios.post(`${baseUrl}/api/agents/${agentId}/chat`, {
      message,
    });

    // If response.data is a string with HTML entities, try to decode and parse it
    if (typeof response.data === "string" && response.data.includes("&quot;")) {
      try {
        const decodedData = decodeHtmlEntities(response.data);
        return JSON.parse(decodedData);
      } catch (e) {
        // If parsing fails, return the decoded string
        return decodeHtmlEntities(response.data);
      }
    }

    return response.data;
  } catch (error: any) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error(chalk.red("\nError: Cannot connect to the AaaS server."));
      console.error(
        chalk.yellow(`Make sure the server is running at ${baseUrl}`)
      );
      process.exit(1);
    }

    console.error("\nError sending message:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return null; // Indicate failure
  }
}

// Function to format and display the agent's response
function displayAgentResponse(responseData: any, verbose: boolean = false) {
  if (!responseData) {
    console.log(chalk.red("Failed to get response from agent."));
    return;
  }

  // Check if the input is a string that contains HTML entities
  if (typeof responseData === "string" && responseData.includes("&quot;")) {
    try {
      // Try to parse it as JSON
      const jsonObj = JSON.parse(decodeHtmlEntities(responseData));
      responseData = jsonObj;
    } catch (e) {
      // If it's not valid JSON, just decode the HTML entities
      responseData = decodeHtmlEntities(responseData);
    }
  }

  // Extract the response message
  let agentResponse;
  let isJsonResponse = false;
  let usageData = null;

  if (typeof responseData === "object") {
    // Save usage data if available
    if (responseData.usage) {
      usageData = responseData.usage;
    } else if (responseData.tokenUsage) {
      usageData = responseData.tokenUsage;
    }

    if (responseData.reply) {
      agentResponse = responseData.reply;
    } else if (responseData.response) {
      // Handle case where response is in the "response" field
      agentResponse = decodeHtmlEntities(responseData.response);
    } else {
      // For JSON responses, extract the main content parts
      isJsonResponse = true;

      // Create a clean representation of the response
      if (responseData.response) {
        agentResponse = decodeHtmlEntities(responseData.response);
      } else {
        // Create a clean copy of the object without usage data for display
        const displayObject = { ...responseData };
        delete displayObject.usage;
        delete displayObject.tokenUsage;

        // Convert to a nicely formatted string
        const jsonString = JSON.stringify(displayObject, null, 2);
        agentResponse = decodeHtmlEntities(jsonString);
      }
    }
  } else {
    agentResponse = responseData;
  }

  // Display token usage in verbose mode
  if (verbose && usageData) {
    const { promptTokens, completionTokens, totalTokens } = usageData;
    console.log(chalk.yellow("\n--- Token Usage ---"));
    console.log(chalk.yellow(`Prompt tokens: ${promptTokens}`));
    console.log(chalk.yellow(`Completion tokens: ${completionTokens}`));
    console.log(chalk.yellow(`Total tokens: ${totalTokens}`));
    console.log(chalk.yellow("------------------\n"));
  }

  // Display the formatted response without the "Agent Response:" heading
  if (isJsonResponse) {
    // For JSON objects with a response field, just show the response content
    if (typeof responseData === "object" && responseData.response) {
      console.log(
        chalk.green("\n" + decodeHtmlEntities(responseData.response))
      );
    } else {
      // Just print the JSON content without the markdown processing
      console.log(agentResponse);
    }
  } else {
    try {
      // Render markdown to HTML-like text representation
      const formattedResponse = md.render(agentResponse);

      // For terminal display, we'll do a basic cleanup of HTML tags
      // A more sophisticated approach could use a package like terminal-link
      const cleanedResponse = formattedResponse
        .replace(/<\/?p>/g, "\n")
        .replace(/<\/?code>/g, "`")
        .replace(/<\/?strong>/g, "**")
        .replace(/<\/?em>/g, "_")
        .replace(/<\/?h[1-6]>/g, "\n")
        .replace(/<br\/?>/g, "\n")
        .replace(/<li>/g, "• ")
        .replace(/<\/li>/g, "\n")
        .replace(/<\/?[^>]+(>|$)/g, ""); // Remove any remaining HTML tags

      console.log(chalk.green("\n" + cleanedResponse));
    } catch (error) {
      // Fallback to plain text if markdown rendering fails
      console.log(chalk.green("\n" + agentResponse));
    }
  }
}

// Function for interactive chat
async function startInteractiveChat(
  agentId: string,
  verbose: boolean = false,
  apiBaseUrl?: string
) {
  const rl = readline.createInterface({ input, output });
  const baseUrl =
    apiBaseUrl || process.env.API_BASE_URL || "http://localhost:3800";

  // Handle Ctrl+C in interactive mode
  rl.on("SIGINT", () => {
    console.log(chalk.blue("\nChat session ended."));
    rl.close();
    process.exit(0);
  });

  console.log(
    chalk.blue(
      `Starting interactive chat with agent ${agentId}. Type 'exit' to quit or '/clear' to clear history.`
    )
  );

  if (verbose) {
    console.log(
      chalk.yellow(
        "Verbose mode enabled. Token usage will be displayed for each message."
      )
    );
  }

  while (true) {
    const userInput = await rl.question(chalk.cyan("> "));
    const command = userInput.toLowerCase();

    if (command === "exit") {
      break;
    }

    if (command === "/clear") {
      try {
        console.log(chalk.yellow("Clearing chat history..."));
        await axios.delete(`${baseUrl}/api/agents/${agentId}/messages`);
        console.log(chalk.green("Chat history cleared successfully."));
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          console.error(
            chalk.red("\nError: Cannot connect to the AaaS server.")
          );
          console.error(
            chalk.yellow(`Make sure the server is running at ${baseUrl}`)
          );
          break;
        }

        console.error(
          chalk.red("\nError clearing chat history:"),
          error.message
        );
        if (error.response) {
          console.error(chalk.red("Response data:"), error.response.data);
          console.error(chalk.red("Response status:"), error.response.status);
        }
      }
      continue; // Prompt for next input
    }

    // Send message if it wasn't a command
    const responseData = await sendMessage(
      agentId,
      userInput,
      verbose,
      baseUrl
    );
    displayAgentResponse(responseData, verbose);
  }

  rl.close();
  console.log(chalk.blue("Chat session ended."));
}

// Add a configuration command
program
  .command("config")
  .description("Configure the CLI")
  .action(async () => {
    const apiBaseUrl = await configureApiBaseUrl();
    console.log(
      chalk.green(`\nConfiguration updated. API base URL set to: ${apiBaseUrl}`)
    );
    console.log(
      chalk.yellow("Note: This setting is only for the current session.")
    );
    console.log(
      chalk.yellow(
        "To make it permanent, set the API_BASE_URL environment variable."
      )
    );
    process.env.API_BASE_URL = apiBaseUrl;
  });

// Chat command
program
  .command("chat")
  .description(
    "Send a message to an agent or start an interactive chat session"
  )
  .option("-a, --agentId <id>", "ID of the agent to chat with")
  .option(
    "-m, --message <text>",
    "The message to send (optional, starts interactive mode if omitted)"
  )
  .option(
    "-v, --verbose",
    "Enable verbose mode to show token usage information",
    false
  )
  .action(async (options) => {
    let { agentId, message, verbose } = options;

    // If no agent ID is provided, prompt the user to select one
    if (!agentId) {
      agentId = await promptForAgentSelection();
    }

    if (message) {
      // Single message mode
      console.log(chalk.blue(`Sending message to agent ${agentId}...`));
      const responseData = await sendMessage(agentId, message, verbose);
      displayAgentResponse(responseData, verbose);
    } else {
      // Interactive mode
      await startInteractiveChat(agentId, verbose);
    }
  });

// Default command (when no command is specified)
program
  .addHelpCommand()
  .allowUnknownOption(false)
  .showHelpAfterError(true)
  .command("start", { isDefault: true, hidden: true })
  .description("Start interactive chat with an agent")
  .action(async () => {
    const agentId = await promptForAgentSelection();
    await startInteractiveChat(agentId, false);
  });

program.parse(process.argv);
