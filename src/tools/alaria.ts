import { tool } from "ai";
import { z } from "zod";
import { ToolResult } from "./async-tools/baseTool";

// Store cookies for authenticated requests
let authCookies: string[] = [];

// Authenticate with the API
async function authenticate(): Promise<boolean> {
  try {
    console.log("Authenticating to Alaria Wiki API...");

    const response = await fetch(process.env.LOGIN_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.AUTH_EMAIL,
        password: process.env.AUTH_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    // Extract cookies from response headers
    const cookies = response.headers.get("set-cookie");
    if (!cookies || cookies.length === 0) {
      throw new Error("No authentication cookies received");
    }

    authCookies = cookies.split(";").map((cookie) => cookie.trim());

    console.log("✅ Authentication successful");
    return true;
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return false;
  }
}

// Refresh the authentication
async function refreshAuthentication(): Promise<boolean> {
  console.log("🔄 Refreshing authentication...");
  return authenticate();
}

// Get the current authentication cookies
function getAuthCookies(): string[] {
  return authCookies;
}

// Sleep function for retry delays
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tool to add a new note to the Alaria wiki
 */
export const getAddNewNoteTool = () => {
  const toolInstance = tool({
    description: "Add a new note to the wiki",
    parameters: z.object({
      title: z.string().describe("The title of the note"),
      subtitle: z.string().describe("Optional subtitle for the note"),
      category: z.string().describe("The category of the note"),
      markdown: z.string().describe("The markdown content of the note"),
    }),
    execute: async ({
      title,
      subtitle,
      category,
      markdown,
    }): Promise<ToolResult> => {
      return executeAddNote({ title, subtitle, category, markdown });
    },
  });

  // Separate function for recursive retries
  async function executeAddNote(
    {
      title,
      subtitle,
      category,
      markdown,
    }: { title: string; subtitle: string; category: string; markdown: string },
    retryCount = 0
  ): Promise<ToolResult> {
    try {
      // Ensure we're authenticated
      if (authCookies.length === 0) {
        await authenticate();
      }

      console.log(`📤 Uploading note: ${title}...`);

      const payload = {
        title,
        subtitle: subtitle || "Auto-generated subtitle",
        category,
        markdown,
      };

      const response = await fetch(process.env.PAGES_ENDPOINT!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: getAuthCookies().join("; "),
        },
        body: JSON.stringify(payload),
      });

      // Handle potential auth expiration
      if (response.status === 401 || response.status === 403) {
        if (retryCount < 3) {
          console.log("🔒 Authentication expired, refreshing...");
          await refreshAuthentication();
          return executeAddNote(
            { title, subtitle, category, markdown },
            retryCount + 1
          );
        } else {
          throw new Error("Authentication failed after multiple retries");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();

        // If we have server error and haven't exceeded retries
        if (
          (response.status >= 500 ||
            errorText.includes("Something went wrong")) &&
          retryCount < 3
        ) {
          console.log(
            `⚠️ Server error, retrying after delay (${retryCount + 1}/${3})...`
          );
          await sleep(1000);
          return executeAddNote(
            { title, subtitle, category, markdown },
            retryCount + 1
          );
        }

        throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: `Successfully added note: ${title}. Note ID: ${result.id}`,
        type: "markdown",
      };
    } catch (error) {
      console.error("[AddNewNoteTool] Error:", error);
      throw new Error(
        `Failed to add note: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return toolInstance;
};
