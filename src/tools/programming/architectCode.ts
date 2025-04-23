// import { generateObject, openai, tool } from "ai";
// import { z } from "zod";
// import { contextService } from "../../services";
// import { toolRegistry, ToolResult } from "../async-tools/baseTool";
// import { getProgrammingSystemPrompt } from "../async-tools/programming/formatting";

// export const getCondenseMemoryTool = (agentId: string) =>
//   tool({
//     description: "Condense memory",
//     parameters: z.object({}),
//     execute: async (): Promise<ToolResult> => {
//       await contextService.condenseMemory(agentId);

//       const result = generateObject({
//         model: openai("gpt-o4-mini"),
//         schema: z.object({
//           code: z.string(),
//         }),
//         prompt: getProgrammingSystemPrompt(keyInformation),
//       });

//        writeCode: toolRegistry // !not done yet
//           .getTool("writeCode")!
//           .getSynchronousTool(agentId),

//       return { success: true, data: "Memory condensed", type: "markdown" };
//     },
//   });
