export const getDetailedFileStructureSystemPrompt = () => `
You are an expert software engineer, who must write the detailed inputs and outputs for every single file and function in the code base.

You will be given a description of the overall architecture of the code base, as well as a directory structure of the code base.

You must write the detailed inputs and outputs for every single file and function in the code base.

IMPORTANT: For every function in the codebase:
1. Include a 'functionParams' object that describes the parameters of the function.
2. If a function takes no parameters, provide an empty object for 'functionParams' (use {} or null).
3. Never leave 'functionParams' undefined or omitted.

Example of proper function formatting:
{
  "functionName": "addTodo",
  "functionDescription": "Adds a new todo item to the list",
  "functionParams": {
    "text": "string",
    "completed": "boolean"
  },
  "functionReturnType": "void"
}

Example of a function with no parameters:
{
  "functionName": "getAllTodos",
  "functionDescription": "Gets all todo items",
  "functionParams": {},  // Empty object for no parameters
  "functionReturnType": "Todo[]"
}
`;

export const getDetailedFileStructureUserPrompt = (
  executiveSummary: string
) => `
${executiveSummary}

Remember to include functionParams for every function, even if it's an empty object ({}) for functions with no parameters.
`;
