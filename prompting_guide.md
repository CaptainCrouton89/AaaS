Part 1: Architecture of Modern AI System Prompts - AI System Prompts Guide

# Part 1: The Architecture of Modern AI System Prompts

Modern AI system prompts have evolved from simple instructions to sophisticated architectural frameworks that govern how AI assistants operate. This section examines the key architectural patterns observed in leaked system prompts from various AI tools.

## 1.1 Hierarchical Structure

Modern AI system prompts follow a hierarchical structure that progresses from general to specific:

1. **Identity and Role Definition:** Establishes who the AI is and its purpose

   - "You are Manus, an AI agent created by the Manus team."
   - "You are Devin, a software engineer using a real computer operating system."

2. **Capability Enumeration:** Lists what the AI can do in broad categories

   - Manus lists capabilities like "Information gathering, fact-checking, and documentation"
   - Cursor emphasizes "powerful agentic AI coding assistant" capabilities

3. **Operational Guidelines:** Explains how the AI should perform its functions

   - Detailed workflows for handling different types of requests
   - Rules for prioritizing different approaches

4. **Specific Rules and Constraints:** Provides detailed instructions for particular scenarios

   - Edge case handling
   - Error recovery procedures

5. **Tool/Function Definitions:** Specifies the exact mechanisms for taking action

   - JSON Schema definitions of available functions
   - Parameter specifications and validation rules

**Why this matters:** This hierarchical approach is similar to how complex software systems are organized - from high-level concepts down to specific implementation details. It allows the AI to understand both its overall purpose and the specific details of how to accomplish tasks.

**Practical Example:**

```
# Level 1: Identity
You are CodeAssist, an AI programming assistant.

# Level 2: Capabilities
You can help with:
- Writing and debugging code
- Explaining programming concepts
- Suggesting improvements to existing code
- Answering technical questions

# Level 3: Operational Guidelines
When helping with code:
1. First understand the user's goal
2. Consider the programming language and context
3. Provide complete, working solutions
4. Include explanations of your approach

# Level 4: Specific Rules
For debugging requests:
- Always check for syntax errors first
- Consider edge cases and input validation
- Suggest tests to verify the solution

# Level 5: Function Definitions
{"name": "write_code", "parameters": {"language": "string", "task": "string"}}
{"name": "debug_code", "parameters": {"code": "string", "error": "string"}}
```

**Source:** Composite example based on patterns from multiple system prompts

## 1.2 Modular Design

Advanced system prompts employ a modular design with distinct sections for different functional domains:

- **Core Identity Module:** Defines the AI's fundamental identity and purpose
- **Capability Modules:** Specify what the AI can do in different domains
- **Operational Modules:** Define how the AI should operate in different contexts
- **Tool/Function Modules:** Specify the mechanisms for taking action
- **Safety and Alignment Modules:** Ensure the AI behaves appropriately

This modular approach allows for:

- Easier maintenance and updates to specific aspects of the AI's behavior
- Clear separation of concerns between different functional domains
- More precise control over the AI's capabilities and limitations
- Better organization of complex instruction sets

Manus demonstrates the most sophisticated modular design, with over 20 distinct functional components:

```
<intro>
You excel at the following tasks:
1. Information gathering, fact-checking, and documentation
2. Data processing, analysis, and visualization
3. Writing multi-chapter articles and in-depth research reports
...
</intro>

<language_settings>
- Default working language: **English**
- Use the language specified by user in messages as the working language when explicitly provided
...
</language_settings>

<system_capability>
- Communicate with users through message tools
- Access a Linux sandbox environment with internet connection
...
</system_capability>
```

**Source:** Manus prompt.txt - Modular sections with XML-style tags

Devin also employs a modular approach, though with less formal separation:

```
## System Capabilities
You have access to a real computer with the following capabilities:
- A terminal for running commands
- A web browser for accessing the internet
- A code editor for writing and editing code

## Task Approach
When solving problems, you should:
1. Break down complex tasks into smaller steps
2. Plan your approach before implementation
3. Test your solutions thoroughly
4. Document your work clearly
```

**Source:** Devin system prompt - Modular sections with markdown-style headers

## 1.3 XML-Style Semantic Markup

The most advanced system prompts use XML-style tags to create semantic structure within the prompt. This approach provides several advantages:

- Clear delineation between different functional components
- Semantic meaning attached to different sections of the prompt
- Easier parsing and interpretation by the AI model
- More precise control over how different instructions are applied

Manus makes extensive use of XML-style markup:

```
<agent_loop>
You are operating in an agent loop, iteratively completing tasks through these steps:
1. Analyze Events: Understand user needs and current state through event stream...
2. Select Tools: Choose next tool call based on current state...
3. Wait for Execution: Selected tool action will be executed...
4. Iterate: Choose only one tool call per iteration...
5. Submit Results: Send results to user via message tools...
6. Enter Standby: Enter idle state when all tasks are completed...
</agent_loop>

<planner_module>
- System is equipped with planner module for overall task planning
- Task planning will be provided as events in the event stream
- Task plans use numbered pseudocode to represent execution steps
...
</planner_module>
```

**Source:** Manus agent_loop.txt and prompt.txt - XML-style semantic markup

Lovable also uses a form of XML-style markup, though focused specifically on file operations:

```
Use only ONE <lov-code> block to wrap ALL code changes and technical details in your response...
Use <lov-write> for creating or updating files...
Use <lov-rename> for renaming files...
Use <lov-delete> for removing files...
```

**Source:** Lovable system prompt - Custom XML-style markup for file operations

## 1.4 Function-Based Agency Model

The most sophisticated system prompts define specific functions with formal parameter schemas that the AI can use to take action. This function-based agency model provides several advantages:

- Precise control over what actions the AI can take
- Formal validation of parameters to ensure correct usage
- Clear separation between different types of actions
- Easier integration with external systems and APIs

Manus implements a comprehensive function-based agency model with formal JSON Schema definitions:

```
<function>{"description": "Send a message to user.\n\nRecommended scenarios:\n- Immediately acknowledge receipt of any user message\n- When achieving milestone progress or significant changes in task planning\n- Before executing complex tasks, inform user of expected duration\n- When changing methods or strategies, explain reasons to user\n- When attachments need to be shown to user\n- When all tasks are completed\n\nBest practices:\n- Use this tool for user communication instead of direct text output\n- Files in attachments must use absolute paths within the sandbox\n- Messages must be informative (no need for user response), avoid questions\n- Must provide all relevant files as attachments since user may not have direct access to local filesystem\n- When reporting task completion, include important deliverables or URLs as attachments\n- Before entering idle state, confirm task completion results are communicated using this tool", "name": "message_notify_user", "parameters": {"properties": {"attachments": {"anyOf": [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}], "description": "(Optional) List of attachments to show to user, must include all files mentioned in message text.\nCan be absolute path of single file or URL, e.g., \"/home/example/report.pdf\" or \"http://example.com/webpage\".\nCan also be list of multiple absolute file paths or URLs, e.g., [\"/home/example/part_1.md\", \"/home/example/part_2.md\"].\nWhen providing multiple attachments, the most important one must be placed first, with the rest arranged in the recommended reading order for the user."}, "text": {"description": "Message text to display to user. e.g. \"I will help you search for news and comments about hydrogen fuel cell vehicles. This may take a few minutes.\"", "type": "string"}}, "required": ["text"], "type": "object"}}
```

**Source:** Manus tools.json - Function definition with JSON Schema parameters

Cursor also implements a function-based approach, though with less formal parameter definitions:

```
function searchCodebase(query: string): Promise<SearchResult[]> {
  // Search the codebase for the given query
  // Returns a list of search results with file paths and line numbers
}

function readFile(path: string): Promise<string> {
  // Read the contents of a file at the given path
  // Returns the file contents as a string
}
```

**Source:** Cursor system prompt - Function definitions for codebase interaction

This function-based agency model represents the cutting edge of prompt engineering, enabling more precise control over AI behavior and better integration with external systems.

## Summary

The architecture of modern AI system prompts has evolved significantly, with the most advanced systems employing:

- Hierarchical structure that progresses from general to specific
- Modular design with distinct functional components
- XML-style semantic markup for clear delineation
- Function-based agency model with formal parameter schemas

These architectural patterns enable more sophisticated AI behavior, better control over AI actions, and clearer organization of complex instruction sets. Understanding these patterns provides valuable insights into how modern AI systems are designed and optimized.

In the next section, we'll explore the operational frameworks that govern how AI assistants process and respond to user inputs.

Part 2: Operational Frameworks - AI System Prompts Guide

# Part 2: Operational Frameworks

Modern AI system prompts implement sophisticated operational frameworks that govern how AI systems process information, make decisions, and respond to user inputs. This section examines the key operational frameworks observed in leaked system prompts from various AI tools.

## 2.1 Agent Loops

One of the most significant patterns observed in advanced AI system prompts is the concept of an "agent loop" - a structured cycle of operations that the AI follows to complete tasks.

### The Manus Agent Loop

The most sophisticated implementation of an agent loop can be found in the Manus system prompt, which defines a clear iterative process:

```
<agent_loop>
You are operating in an agent loop, iteratively completing tasks through these steps:
1. Analyze Events: Understand user needs and current state through event stream...
2. Select Tools: Choose next tool call based on current state...
3. Wait for Execution: Selected tool action will be executed...
4. Iterate: Choose only one tool call per iteration...
5. Submit Results: Send results to user via message tools...
6. Enter Standby: Enter idle state when all tasks are completed...
</agent_loop>
```

**Source:** Manus agent_loop.txt

This structured approach enables the AI to maintain context across multiple interactions, make appropriate tool selections, and follow a consistent process for task completion.

### Devin's Planning-Execution Loop

Devin implements a similar but more software engineering-focused operational loop:

```
When solving problems:
1. Break down complex tasks into smaller steps
2. Plan your approach before implementation
3. Test your solutions thoroughly
4. Document your work clearly

For complex tasks, create a plan with specific steps before executing. This helps ensure you don't miss important details and allows for methodical progress tracking.
```

**Source:** Devin system prompt

This framework emphasizes planning before execution, which is particularly important for complex software engineering tasks.

## 2.2 Decision Trees

Another common operational framework is the use of decision trees to guide AI behavior based on different scenarios.

### Cursor's Conditional Logic

Cursor's system prompt makes extensive use of conditional logic to guide the AI's behavior in different scenarios:

```
If the user's input is unclear, ambiguous, or purely informational:
  Provide explanations, guidance, or suggestions without modifying the code.
  If the requested change has already been made in the codebase, point this out to the user...
Else if the user requests a specific code change:
  First understand the current state of the code and the user's intent
  Consider the broader context of the codebase
  Make minimal, focused changes that address the user's request
  Explain your changes and reasoning
```

**Source:** Cursor system prompt

This decision tree approach helps the AI determine the appropriate response based on the nature of the user's input.

## 2.3 Event Stream Processing

More advanced AI systems implement event stream processing frameworks that allow them to process and respond to a chronological sequence of events.

### Manus Event Stream

The Manus system prompt defines a sophisticated event stream processing architecture:

```
<event_stream>
You will be provided with a chronological event stream (may be truncated or partially omitted) containing the following types of events:
1. Message: Messages input by actual users
2. Action: Tool use (function calling) actions
3. Observation: Results generated from corresponding action execution
4. Plan: Task step planning and status updates provided by the Planner module
5. Knowledge: Task-related knowledge and best practices provided by the Knowledge module
6. Datasource: Data API documentation provided by the Datasource module
7. Other miscellaneous events generated during system operation
</event_stream>
```

**Source:** Manus prompt.txt

This framework enables the AI to maintain a coherent understanding of the interaction history and context, which is crucial for complex, multi-step tasks.

## 2.4 Tool Use Frameworks

Modern AI system prompts often include frameworks for tool use - the ability to interact with external systems and APIs.

### Manus Tool Use Rules

Manus implements a comprehensive framework for tool use:

```
<tool_use_rules>
- Must respond with a tool use (function calling); plain text responses are forbidden
- Do not mention any specific tool names to users in messages
- Carefully verify available tools; do not fabricate non-existent tools
- Events may originate from other system modules; only use explicitly provided tools
</tool_use_rules>
```

**Source:** Manus prompt.txt

This framework ensures that the AI uses tools appropriately and consistently, which is essential for reliable task execution.

### Devin's System Interaction

Devin's system prompt includes detailed guidelines for interacting with computer systems:

```
You have access to a terminal, web browser, and code editor.
When using the terminal:
- Use standard Unix commands
- Check command syntax before execution
- Verify results after execution

When using the browser:
- Navigate to documentation when needed
- Search for solutions to unfamiliar problems
- Test web applications thoroughly
```

**Source:** Devin system prompt

This framework provides specific guidelines for different types of system interactions, which helps the AI use tools effectively in a software development context.

## 2.5 Error Recovery Frameworks

Advanced AI system prompts include frameworks for handling errors and recovering from failures.

### Manus Error Handling

Manus implements a structured approach to error handling:

```
<error_handling>
- Tool execution failures are provided as events in the event stream
- When errors occur, first verify tool names and arguments
- Attempt to fix issues based on error messages; if unsuccessful, try alternative methods
- When multiple approaches fail, report failure reasons to user and request assistance
</error_handling>
```

**Source:** Manus prompt.txt

This framework enables the AI to respond appropriately to errors and take steps to recover, which is essential for robust task execution.

## 2.6 Operational Implications

The operational frameworks observed in modern AI system prompts have significant implications for AI system design:

- **Structured Processes:** Clear operational frameworks provide structure and consistency to AI behavior
- **Context Maintenance:** Frameworks like event stream processing enable AIs to maintain context across interactions
- **Appropriate Tool Selection:** Tool use frameworks ensure that AIs use tools effectively and appropriately
- **Robust Error Handling:** Error recovery frameworks enable AIs to handle failures gracefully
- **Task Completion:** Agent loops ensure that AIs follow a consistent process for completing tasks

By implementing these operational frameworks, AI system designers can create more capable, reliable, and effective AI assistants.

## Key Takeaways

- Modern AI system prompts implement sophisticated operational frameworks that govern AI behavior
- Agent loops provide structure to the AI's task completion process
- Decision trees guide AI behavior based on different scenarios
- Event stream processing enables AIs to maintain context across interactions
- Tool use frameworks ensure appropriate and effective tool usage
- Error recovery frameworks enable AIs to handle failures gracefully

In the next section, we'll explore how AI system prompts implement communication and interaction models that govern how AIs communicate with users.

Part 3: Communication and Interaction Models - AI System Prompts Guide

# Part 3: Communication and Interaction Models

Modern AI system prompts implement sophisticated communication and interaction models that govern how AI systems communicate with users, present information, and manage conversations. This section examines the key communication patterns observed in leaked system prompts from various AI tools.

## 3.1 Message Rules

Advanced AI system prompts often include detailed rules for how the AI should communicate with users.

### Manus Message Rules

Manus implements a comprehensive framework for user communication:

```
<message_rules>
- Communicate with users via message tools instead of direct text responses
- Reply immediately to new user messages before other operations
- First reply must be brief, only confirming receipt without specific solutions
- Events from Planner, Knowledge, and Datasource modules are system-generated, no reply needed
- Notify users with brief explanation when changing methods or strategies
- Message tools are divided into notify (non-blocking, no reply needed from users) and ask (blocking, reply required)
- Actively use notify for progress updates, but reserve ask for only essential needs to minimize user disruption and avoid blocking progress
- Provide all relevant files as attachments, as users may not have direct access to local filesystem
- Must message users with results and deliverables before entering idle state upon task completion
</message_rules>
```

**Source:** Manus prompt.txt

This framework ensures that the AI communicates with users in a consistent, helpful, and non-disruptive manner.

### Devin's Communication Guidelines

Devin's system prompt includes specific guidelines for communication:

```
When communicating with users:
- Be clear and concise
- Explain your reasoning and approach
- Provide context for your decisions
- Use technical terminology appropriately
- Document your work clearly

When reporting problems:
- Describe the issue precisely
- Explain your understanding of the cause
- Suggest potential solutions
- Provide relevant error messages and logs
```

**Source:** Devin system prompt

These guidelines help the AI communicate effectively in a software development context, where clear explanations and documentation are essential.

## 3.2 Interaction Models

AI system prompts implement different interaction models that define how the AI engages with users.

### Manus Ask vs. Notify Model

Manus implements a sophisticated interaction model that distinguishes between different types of communication:

```
<function>{"description": "Send a message to user.\n\nRecommended scenarios:\n- Immediately acknowledge receipt of any user message\n- When achieving milestone progress or significant changes in task planning\n- Before executing complex tasks, inform user of expected duration\n- When changing methods or strategies, explain reasons to user\n- When attachments need to be shown to user\n- When all tasks are completed\n\nBest practices:\n- Use this tool for user communication instead of direct text output\n- Files in attachments must use absolute paths within the sandbox\n- Messages must be informative (no need for user response), avoid questions\n- Must provide all relevant files as attachments since user may not have direct access to local filesystem\n- When reporting task completion, include important deliverables or URLs as attachments\n- Before entering idle state, confirm task completion results are communicated using this tool", "name": "message_notify_user", "parameters": {"properties": {"attachments": {"anyOf": [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}], "description": "(Optional) List of attachments to show to user, must include all files mentioned in message text.\nCan be absolute path of single file or URL, e.g., \"/home/example/report.pdf\" or \"http://example.com/webpage\".\nCan also be list of multiple absolute file paths or URLs, e.g., [\"/home/example/part_1.md\", \"/home/example/part_2.md\"].\nWhen providing multiple attachments, the most important one must be placed first, with the rest arranged in the recommended reading order for the user."}, "text": {"description": "Message text to display to user. e.g. \"I will help you search for news and comments about hydrogen fuel cell vehicles. This may take a few minutes.\"", "type": "string"}}, "required": ["text"], "type": "object"}}
```

**Source:** Manus tools.json - message_notify_user function

```
<function>{"description": "Ask user a question and wait for response.\n\nRecommended scenarios:\n- When user presents complex requirements, clarify your understanding and request confirmation to ensure accuracy\n- When user confirmation is needed for an operation\n- When user input is required at critical decision points\n- When suggesting temporary browser takeover to user\n\nBest practices:\n- Use this tool to request user responses instead of direct text output\n- Request user responses only when necessary to minimize user disruption and avoid blocking progress\n- Questions must be clear and unambiguous; if options exist, clearly list all available choices\n- Must provide all relevant files as attachments since user may not have direct access to local filesystem\n- When necessary, suggest user to temporarily take over browser for sensitive operations or operations with side effects (e.g., account login, payment completion)\n- When suggesting takeover, also indicate that the user can choose to provide necessary information via messages", "name": "message_ask_user", "parameters": {"properties": {"attachments": {"anyOf": [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}], "description": "(Optional) List of question-related files or reference materials, must include all files mentioned in message text.\nCan be absolute path of single file or URL, e.g., \"/home/example/report.pdf\" or \"http://example.com/webpage\".\nCan also be list of multiple absolute file paths or URLs, e.g., [\"/home/example/part_1.md\", \"/home/example/part_2.md\"].\nWhen providing multiple attachments, the most important one must be placed first, with the rest arranged in the recommended reading order for the user."}, "suggest_user_takeover": {"description": "(Optional) Suggested operation for user takeover. Defaults to \"none\", indicating no takeover is suggested; \"browser\" indicates recommending temporary browser control for specific steps.", "enum": ["none", "browser"], "type": "string"}, "text": {"description": "Question text to present to user", "type": "string"}}, "required": ["text"], "type": "object"}}
```

**Source:** Manus tools.json - message_ask_user function

This model distinguishes between notifications (which don't require a response) and questions (which do), which helps minimize unnecessary interruptions while ensuring that the AI gets the information it needs.

### Cursor's Context-Aware Responses

Cursor implements a context-aware interaction model that adapts based on the user's input:

```
If the user's input is unclear, ambiguous, or purely informational:
  Provide explanations, guidance, or suggestions without modifying the code.
  If the requested change has already been made in the codebase, point this out to the user...
Else if the user requests a specific code change:
  First understand the current state of the code and the user's intent
  Consider the broader context of the codebase
  Make minimal, focused changes that address the user's request
  Explain your changes and reasoning
```

**Source:** Cursor system prompt

This model enables the AI to provide appropriate responses based on the nature of the user's input, which is particularly important in a code editing context.

## 3.3 Information Presentation

AI system prompts often include guidelines for how information should be presented to users.

### Manus Writing Rules

Manus includes detailed rules for content creation:

```
<writing_rules>
- Write content in continuous paragraphs using varied sentence lengths for engaging prose; avoid list formatting
- Use prose and paragraphs by default; only employ lists when explicitly requested by users
- All writing must be highly detailed with a minimum length of several thousand words, unless user explicitly specifies length or format requirements
- When writing based on references, actively cite original text with sources and provide a reference list with URLs at the end
- For lengthy documents, first save each section as separate draft files, then append them sequentially to create the final document
- During final compilation, no content should be reduced or summarized; the final length must exceed the sum of all individual draft files
</writing_rules>
```

**Source:** Manus prompt.txt

These rules ensure that the AI creates high-quality, detailed content that meets user expectations.

### Lovable's Presentation Guidelines

Lovable includes specific guidelines for presenting information to users:

```
When presenting information to users:
- Use clear, concise language
- Organize information logically
- Highlight important points
- Use appropriate formatting for different types of content
- Provide context and explanations for technical concepts

When presenting code:
- Use syntax highlighting
- Include comments to explain complex logic
- Organize code logically
- Follow best practices for the relevant programming language
- Ensure code is readable and maintainable
```

**Source:** Lovable system prompt

These guidelines help the AI present information in a way that is clear, organized, and easy to understand.

## 3.4 Conversation Management

Advanced AI system prompts include frameworks for managing conversations over time.

### Manus Event Stream Processing

Manus uses event stream processing to maintain conversation context:

```
<event_stream>
You will be provided with a chronological event stream (may be truncated or partially omitted) containing the following types of events:
1. Message: Messages input by actual users
2. Action: Tool use (function calling) actions
3. Observation: Results generated from corresponding action execution
4. Plan: Task step planning and status updates provided by the Planner module
5. Knowledge: Task-related knowledge and best practices provided by the Knowledge module
6. Datasource: Data API documentation provided by the Datasource module
7. Other miscellaneous events generated during system operation
</event_stream>
```

**Source:** Manus prompt.txt

This framework enables the AI to maintain a coherent understanding of the conversation history, which is essential for providing contextually appropriate responses.

## 3.5 Communication Patterns

AI system prompts implement different communication patterns that define how the AI structures its responses.

### Lovable's Custom Markup

Lovable uses a custom markup language to structure its responses:

```
Use only ONE <lov-code> block to wrap ALL code changes and technical details in your response...
Use <lov-write> for creating or updating files...
Use <lov-rename> for renaming files...
Use <lov-delete> for removing files...
```

**Source:** Lovable system prompt

This markup language provides a clear structure for the AI's responses, making it easier for users to understand and implement the AI's suggestions.

### Manus Function Calling

Manus uses a function-based communication pattern:

```
<tool_use_rules>
- Must respond with a tool use (function calling); plain text responses are forbidden
- Do not mention any specific tool names to users in messages
- Carefully verify available tools; do not fabricate non-existent tools
- Events may originate from other system modules; only use explicitly provided tools
</tool_use_rules>
```

**Source:** Manus prompt.txt

This pattern ensures that the AI's responses are structured and actionable, which is particularly important for complex tasks that involve multiple steps.

## 3.6 Communication Implications

The communication and interaction models observed in modern AI system prompts have significant implications for AI system design:

- **User Experience:** Clear communication guidelines ensure a consistent and positive user experience
- **Task Efficiency:** Appropriate interaction models minimize unnecessary interruptions and maximize task efficiency
- **Information Quality:** Guidelines for information presentation ensure that users receive high-quality, well-organized information
- **Conversation Coherence:** Frameworks for conversation management ensure that the AI maintains context and provides coherent responses
- **Response Structure:** Communication patterns ensure that the AI's responses are structured and actionable

By implementing these communication and interaction models, AI system designers can create more effective, user-friendly AI assistants.

## Key Takeaways

- Modern AI system prompts implement sophisticated communication and interaction models
- Message rules provide guidelines for how the AI should communicate with users
- Interaction models define how the AI engages with users and manages conversations
- Information presentation guidelines ensure that users receive high-quality, well-organized information
- Conversation management frameworks help the AI maintain context and provide coherent responses
- Communication patterns ensure that the AI's responses are structured and actionable

In the next section, we'll explore how AI system prompts implement domain specialization to tailor AI behavior for specific use cases.

Part 4: Domain Specialization - AI System Prompts Guide

# Part 4: Domain Specialization

Modern AI system prompts often include specialized instructions and knowledge for specific domains. This section examines how different AI systems implement domain specialization to enhance their capabilities in particular areas.

## 4.1 Software Development Specialization

Several AI systems in our analysis include specialized instructions for software development tasks.

### Cursor's Code-Centric Specialization

Cursor's system prompt includes extensive domain-specific instructions for code understanding and generation:

```
When analyzing code:
- First understand the overall structure and purpose of the code
- Identify key components, functions, and data structures
- Consider the programming paradigm and language-specific idioms
- Look for potential issues, inefficiencies, or bugs

When generating code:
- Follow the conventions and style of the existing codebase
- Use appropriate data structures and algorithms for the task
- Consider edge cases and error handling
- Include comments for complex logic
- Ensure the code is readable and maintainable
```

**Source:** Cursor system prompt

These specialized instructions enable Cursor to provide more effective assistance for software development tasks.

### Devin's Software Engineering Focus

Devin's system prompt is heavily specialized for software engineering:

```
You are Devin, a software engineer using a real computer operating system.
You have access to a terminal, web browser, and code editor.
When solving problems:
1. Break down complex tasks into smaller steps
2. Plan your approach before implementation
3. Test your solutions thoroughly
4. Document your work clearly

For debugging:
- Read error messages carefully
- Check logs for relevant information
- Use print statements or debuggers to trace execution
- Test hypotheses systematically
- Fix one issue at a time
```

**Source:** Devin system prompt

This specialization enables Devin to function effectively as an autonomous software engineer, capable of understanding, planning, and executing complex development tasks.

## 4.2 Web Development Specialization

Some AI systems include specialized instructions for web development tasks.

### Lovable's Web Development Focus

Lovable's system prompt includes detailed domain-specific instructions for web development:

```
When developing web applications:
- Follow modern web development best practices
- Ensure responsive design for different screen sizes
- Consider accessibility requirements
- Optimize for performance
- Implement proper error handling

For React applications:
- Use functional components and hooks
- Follow the React component lifecycle
- Manage state appropriately
- Implement proper prop validation
- Consider component reusability
```

**Source:** Lovable system prompt

This specialization enables Lovable to provide more effective assistance for web development tasks, particularly for React applications.

## 4.3 Data Analysis Specialization

Some AI systems include specialized instructions for data analysis tasks.

### Manus Data API Integration

Manus includes a sophisticated data API module for accessing authoritative data sources:

```
<datasource_module>
- System is equipped with data API module for accessing authoritative datasources
- Available data APIs and their documentation will be provided as events in the event stream
- Only use data APIs already existing in the event stream; fabricating non-existent APIs is prohibited
- Prioritize using APIs for data retrieval; only use public internet when data APIs cannot meet requirements
- Data API usage costs are covered by the system, no login or authorization needed
- Data APIs must be called through Python code and cannot be used as tools
- Python libraries for data APIs are pre-installed in the environment, ready to use after import
- Save retrieved data to files instead of outputting intermediate results
</datasource_module>
```

**Source:** Manus prompt.txt

This specialization enables Manus to access and analyze data from authoritative sources, which is essential for data-intensive tasks.

## 4.4 Content Creation Specialization

Some AI systems include specialized instructions for content creation tasks.

### Manus Writing Rules

Manus includes detailed domain-specific instructions for content creation:

```
<writing_rules>
- Write content in continuous paragraphs using varied sentence lengths for engaging prose; avoid list formatting
- Use prose and paragraphs by default; only employ lists when explicitly requested by users
- All writing must be highly detailed with a minimum length of several thousand words, unless user explicitly specifies length or format requirements
- When writing based on references, actively cite original text with sources and provide a reference list with URLs at the end
- For lengthy documents, first save each section as separate draft files, then append them sequentially to create the final document
- During final compilation, no content should be reduced or summarized; the final length must exceed the sum of all individual draft files
</writing_rules>
```

**Source:** Manus prompt.txt

This specialization enables Manus to create high-quality, detailed content that meets user expectations.

## 4.5 Deployment Specialization

Some AI systems include specialized instructions for deployment tasks.

### Manus Deployment Rules

Manus includes detailed domain-specific instructions for deployment:

```
<deploy_rules>
- All services can be temporarily accessed externally via expose port tool; static websites and specific applications support permanent deployment
- Users cannot directly access sandbox environment network; expose port tool must be used when providing running services
- Expose port tool returns public proxied domains with port information encoded in prefixes, no additional port specification needed
- Determine public access URLs based on proxied domains, send complete public URLs to users, and emphasize their temporary nature
- For web services, must first test access locally via browser
- When starting services, must listen on 0.0.0.0, avoid binding to specific IP addresses or Host headers to ensure user accessibility
- For deployable websites or applications, ask users if permanent deployment to production environment is needed
</deploy_rules>
```

**Source:** Manus prompt.txt

This specialization enables Manus to effectively deploy websites and applications, which is essential for development and demonstration tasks.

## 4.6 Domain-Specific Knowledge

In addition to specialized instructions, some AI systems include domain-specific knowledge modules.

### Manus Knowledge Module

Manus includes a knowledge module that provides domain-specific best practices:

```
<knowledge_module>
- System is equipped with knowledge and memory module for best practice references
- Task-relevant knowledge will be provided as events in the event stream
- Each knowledge item has its scope and should only be adopted when conditions are met
</knowledge_module>
```

**Source:** Manus prompt.txt

This module enables Manus to access and apply domain-specific knowledge and best practices, which enhances its effectiveness across different domains.

## 4.7 Domain Specialization Techniques

Our analysis reveals several common techniques for implementing domain specialization in AI system prompts:

### 1\. Domain-Specific Instructions

The most common approach is to include detailed instructions for specific domains, as seen in Cursor's code-centric instructions and Lovable's web development guidelines.

### 2\. Specialized Modules

Some systems, like Manus, implement specialized modules for different domains, such as the data API module for data analysis and the knowledge module for best practices.

### 3\. Domain-Specific Terminology

AI system prompts often include domain-specific terminology and concepts, which helps the AI understand and communicate effectively in that domain.

### 4\. Task-Specific Workflows

Many systems include task-specific workflows for common tasks in a domain, such as Devin's debugging workflow and Manus's deployment workflow.

### 5\. Domain-Specific Examples

Some systems include examples of common tasks and solutions in a domain, which helps the AI understand how to approach similar problems.

## 4.8 Domain Specialization Implications

The domain specialization patterns observed in modern AI system prompts have significant implications for AI system design:

- **Enhanced Capabilities:** Domain specialization enables AI systems to provide more effective assistance for specific tasks
- **Improved Accuracy:** Domain-specific instructions and knowledge help AI systems generate more accurate and appropriate responses
- **Better User Experience:** Specialized AI systems can provide a more tailored and helpful user experience
- **Increased Efficiency:** Domain-specific workflows and examples help AI systems complete tasks more efficiently
- **Broader Applicability:** By combining multiple domains of specialization, AI systems can address a wider range of user needs

By implementing domain specialization, AI system designers can create more capable and effective AI assistants that excel in specific areas.

## Key Takeaways

- Modern AI system prompts often include domain specialization to enhance capabilities in specific areas
- Software development specialization enables AI systems to understand and generate code more effectively
- Web development specialization provides tailored assistance for creating web applications
- Data analysis specialization enables AI systems to access and analyze data from authoritative sources
- Content creation specialization helps AI systems generate high-quality, detailed content
- Deployment specialization enables AI systems to effectively deploy websites and applications
- Domain-specific knowledge modules provide access to best practices and specialized information

In the next section, we'll explore how AI system prompts implement safety and alignment mechanisms to ensure responsible AI behavior.

Part 6: Implementation Insights - AI System Prompts Guide

# Part 6: Implementation Insights

This section provides practical insights for implementing effective AI system prompts based on patterns observed in leaked system prompts from various AI tools. These insights can help technical teams create more capable, reliable, and aligned AI systems.

## 6.1 Prompt Structure Best Practices

Our analysis reveals several best practices for structuring AI system prompts:

### Hierarchical Organization

Effective system prompts use hierarchical organization to manage complexity:

```
1. Top-level identity and purpose definition
2. Mid-level operational frameworks and rules
3. Low-level specific instructions and examples
```

**Source:** Pattern observed across multiple system prompts

This hierarchical approach helps the AI understand the relative importance of different instructions and navigate complex prompt structures.

### Modular Design

The most sophisticated system prompts use modular design to organize instructions:

```
<intro>
You excel at the following tasks:
1. Information gathering, fact-checking, and documentation
2. Data processing, analysis, and visualization
3. Writing multi-chapter articles and in-depth research reports
4. Creating websites, applications, and tools
5. Using programming to solve various problems beyond development
6. Collaborating with users to automate processes like booking and purchasing
7. Various tasks that can be accomplished using computers and the internet
</intro>

<language_settings>
- Default working language: **English**
- Use the language specified by user in messages as the working language when explicitly provided
- All thinking and responses must be in the working language
- Natural language arguments in tool calls must be in the working language
- Avoid using pure lists and bullet points format in any language
</language_settings>
```

**Source:** Manus prompt.txt

This modular approach makes system prompts easier to maintain, update, and debug, as each module can be modified independently.

### XML-Style Markup

XML-style markup provides clear structure and semantic meaning:

```
<agent_loop>
You are operating in an agent loop, iteratively completing tasks through these steps:
1. Analyze Events: Understand user needs and current state through event stream...
2. Select Tools: Choose next tool call based on current state...
3. Wait for Execution: Selected tool action will be executed...
4. Iterate: Choose only one tool call per iteration...
5. Submit Results: Send results to user via message tools...
6. Enter Standby: Enter idle state when all tasks are completed...
</agent_loop>
```

**Source:** Manus agent_loop.txt

This markup style helps the AI distinguish between different types of instructions and understand their semantic meaning.

## 6.2 Effective Instruction Techniques

Our analysis reveals several techniques for writing effective instructions in AI system prompts:

### Clear, Specific Instructions

Effective system prompts use clear, specific instructions:

```
<file_rules>
- Use file tools for reading, writing, appending, and editing to avoid string escape issues in shell commands
- Actively save intermediate results and store different types of reference information in separate files
- When merging text files, must use append mode of file writing tool to concatenate content to target file
- Strictly follow requirements in <writing_rules>, and avoid using list formats in any files except todo.md
</file_rules>
```

**Source:** Manus prompt.txt

These instructions are clear, specific, and actionable, which helps the AI understand exactly what is expected.

### Positive and Negative Instructions

Effective system prompts use both positive instructions (what to do) and negative instructions (what not to do):

```
<shell_rules>
- Avoid commands requiring confirmation; actively use -y or -f flags for automatic confirmation
- Avoid commands with excessive output; save to files when necessary
- Chain multiple commands with && operator to minimize interruptions
- Use pipe operator to pass command outputs, simplifying operations
- Use non-interactive `bc` for simple calculations, Python for complex math; never calculate mentally
- Use `uptime` command when users explicitly request sandbox status check or wake-up
</shell_rules>
```

**Source:** Manus prompt.txt

This balanced approach helps the AI understand both what it should do and what it should avoid.

### Scenario-Based Instructions

Effective system prompts use scenario-based instructions to guide AI behavior in different situations:

```
<function>{"description": "Send a message to user.\n\nRecommended scenarios:\n- Immediately acknowledge receipt of any user message\n- When achieving milestone progress or significant changes in task planning\n- Before executing complex tasks, inform user of expected duration\n- When changing methods or strategies, explain reasons to user\n- When attachments need to be shown to user\n- When all tasks are completed\n\nBest practices:\n- Use this tool for user communication instead of direct text output\n- Files in attachments must use absolute paths within the sandbox\n- Messages must be informative (no need for user response), avoid questions\n- Must provide all relevant files as attachments since user may not have direct access to local filesystem\n- When reporting task completion, include important deliverables or URLs as attachments\n- Before entering idle state, confirm task completion results are communicated using this tool", "name": "message_notify_user", "parameters": {...}}
```

**Source:** Manus tools.json

This approach helps the AI understand when and how to apply different instructions, which is essential for context-appropriate behavior.

## 6.3 Function-Based Agency

Advanced AI system prompts use function-based agency to enable structured interaction with external systems:

### Function Definitions

Manus defines functions using JSON Schema format:

```
<function>{"description": "Execute commands in a specified shell session.\n\nRecommended scenarios:\n- When running code\n- When installing packages\n- When copying, moving, or deleting files\n- When user explicitly requests to wake up sandbox environment, boot up, or check status\n\nBest practices:\n- Use absolute paths when specifying file locations\n- Verify command safety before execution\n- Prepare backups or rollback plans when necessary\n- Use uptime command when requested to wake up sandbox environment or check status", "name": "shell_exec", "parameters": {"properties": {"command": {"description": "Shell command to execute", "type": "string"}, "exec_dir": {"description": "Working directory for command execution (must use absolute path)", "type": "string"}, "id": {"description": "Unique identifier of the target shell session; automatically creates new session if not exists", "type": "string"}}, "required": ["id", "exec_dir", "command"], "type": "object"}}
```

**Source:** Manus tools.json

This structured approach enables the AI to interact with external systems in a controlled and predictable manner.

### Function Calling Rules

Manus includes specific rules for function calling:

```
<tool_use_rules>
- Must respond with a tool use (function calling); plain text responses are forbidden
- Do not mention any specific tool names to users in messages
- Carefully verify available tools; do not fabricate non-existent tools
- Events may originate from other system modules; only use explicitly provided tools
</tool_use_rules>
```

**Source:** Manus prompt.txt

These rules ensure that the AI uses functions appropriately and consistently, which is essential for reliable operation.

## 6.4 Context Management

Advanced AI system prompts include mechanisms for managing context across interactions:

### Event Stream Processing

Manus uses event stream processing to maintain context:

```
<event_stream>
You will be provided with a chronological event stream (may be truncated or partially omitted) containing the following types of events:
1. Message: Messages input by actual users
2. Action: Tool use (function calling) actions
3. Observation: Results generated from corresponding action execution
4. Plan: Task step planning and status updates provided by the Planner module
5. Knowledge: Task-related knowledge and best practices provided by the Knowledge module
6. Datasource: Data API documentation provided by the Datasource module
7. Other miscellaneous events generated during system operation
</event_stream>
```

**Source:** Manus prompt.txt

This approach enables the AI to maintain a coherent understanding of the interaction history, which is essential for context-appropriate responses.

### Planner Module

Manus includes a planner module for task planning:

```
<planner_module>
- System is equipped with planner module for overall task planning
- Task planning will be provided as events in the event stream
- Task plans use numbered pseudocode to represent execution steps
- Each planning update includes the current step number, status, and reflection
- Pseudocode representing execution steps will update when overall task objective changes
- Must complete all planned steps and reach the final step number by completion
</planner_module>
```

**Source:** Manus prompt.txt

This module helps the AI maintain context across complex, multi-step tasks by providing a structured plan to follow.

## 6.5 Error Handling and Recovery

Effective system prompts include mechanisms for handling errors and recovering from failures:

### Structured Error Handling

Manus includes a structured approach to error handling:

```
<error_handling>
- Tool execution failures are provided as events in the event stream
- When errors occur, first verify tool names and arguments
- Attempt to fix issues based on error messages; if unsuccessful, try alternative methods
- When multiple approaches fail, report failure reasons to user and request assistance
</error_handling>
```

**Source:** Manus prompt.txt

This approach helps the AI respond appropriately to errors and take steps to recover, which is essential for reliable operation.

## 6.6 Implementation Challenges

Our analysis reveals several common challenges in implementing effective AI system prompts:

### Prompt Length Limitations

AI models often have limitations on the maximum prompt length, which can constrain the complexity of system prompts. This challenge is addressed in different ways:

- **Modular Design:** Breaking the prompt into modules that can be loaded as needed
- **Concise Language:** Using clear, concise language to maximize information density
- **Prioritization:** Focusing on the most important instructions and omitting less critical details

### Instruction Conflicts

Complex system prompts may contain conflicting instructions, which can confuse the AI. This challenge is addressed through:

- **Hierarchical Structure:** Clearly indicating the relative importance of different instructions
- **Explicit Prioritization:** Providing explicit guidance on how to resolve conflicts
- **Consistent Terminology:** Using consistent terminology to avoid ambiguity

### Context Window Limitations

AI models have limited context windows, which can constrain the amount of information available for decision-making. This challenge is addressed through:

- **Efficient Context Management:** Prioritizing the most relevant information in the context window
- **External Memory:** Using external storage for information that doesn't fit in the context window
- **Summarization:** Summarizing past interactions to maintain context while reducing token usage

## 6.7 Implementation Recommendations

Based on our analysis, we offer the following recommendations for implementing effective AI system prompts:

### 1\. Start with a Clear Identity and Purpose

Begin your system prompt with a clear definition of the AI's identity and purpose, which provides a foundation for all other instructions.

### 2\. Use Hierarchical, Modular Structure

Organize your system prompt using a hierarchical, modular structure, which makes it easier to maintain, update, and debug.

### 3\. Use XML-Style Markup for Clarity

Use XML-style markup to provide clear structure and semantic meaning, which helps the AI understand the purpose of different instructions.

### 4\. Provide Both Positive and Negative Instructions

Include both what the AI should do and what it should avoid, which provides a more complete guide for behavior.

### 5\. Use Scenario-Based Instructions

Provide context-specific instructions for different scenarios, which helps the AI understand when and how to apply different rules.

### 6\. Implement Robust Error Handling

Include mechanisms for handling errors and recovering from failures, which ensures reliable operation in real-world conditions.

### 7\. Test and Iterate

Continuously test your system prompt with diverse inputs and iterate based on the results, which helps identify and address issues.

## Key Takeaways

- Effective AI system prompts use hierarchical organization, modular design, and XML-style markup
- Clear, specific instructions with both positive and negative guidance are most effective
- Scenario-based instructions help the AI understand when and how to apply different rules
- Function-based agency enables structured interaction with external systems
- Context management mechanisms help maintain coherence across interactions
- Robust error handling ensures reliable operation in real-world conditions
- Implementation challenges include prompt length limitations, instruction conflicts, and context window constraints

In the next section, we'll provide a comparative analysis of AI system prompts from different tools, highlighting their strengths, weaknesses, and unique approaches.

Comparative Analysis of AI System Prompts - AI System Prompts Guide

# Comparative Analysis of AI System Prompts

This section provides a detailed comparison of the prompting styles, underlying philosophies, methodologies, and evaluation approaches used by different AI products. It also offers an assessment of which product demonstrates the most sophisticated prompt engineering techniques.

## Prompting Styles Across AI Products

Each AI system in our analysis employs distinct prompting styles that reflect their intended use cases and design philosophies:

### Cursor 8.0/10

**Prompting Style:** Cursor employs a highly structured, code-centric prompting style with extensive use of conditional logic and specialized instructions for different programming languages and development environments.

#### Key Characteristics:

- Heavy emphasis on code understanding and generation
- Detailed instructions for handling different file types and programming paradigms
- Extensive use of semantic search capabilities for codebase navigation
- Specialized instructions for IDE integration and editor operations

#### Example Pattern:

```
If the user's input is unclear, ambiguous, or purely informational:
  Provide explanations, guidance, or suggestions without modifying the code.
  If the requested change has already been made in the codebase, point this out to the user...
Proceed with code edits only if the user explicitly requests changes or new features that have not already been implemented...
```

**Source:** Cursor system prompt - <making_code_changes> section

### Devin 8.5/10

**Prompting Style:** Devin uses a comprehensive software engineering-focused prompt style that emphasizes autonomous problem-solving and system interaction capabilities.

#### Key Characteristics:

- Detailed instructions for software development workflows
- Strong emphasis on autonomous planning and execution
- Extensive guidelines for system interaction and tool usage
- Structured approach to debugging and problem diagnosis

#### Example Pattern:

```
You are Devin, a software engineer using a real computer operating system.
You have access to a terminal, web browser, and code editor.
When solving problems:
1. Break down complex tasks into smaller steps
2. Plan your approach before implementation
3. Test your solutions thoroughly
4. Document your work clearly
```

**Source:** Devin system prompt - Opening identity statement

### Lovable 7.5/10

**Prompting Style:** Lovable employs a web development-focused prompting style with custom markup language for specific operations and strong emphasis on user experience design.

#### Key Characteristics:

- Custom markup language for file operations ( `<lov-code>`, `<lov-write>`, etc.)
- Detailed instructions for web application development
- Framework-specific guidelines (React, Next.js, etc.)
- Strong focus on responsive design and user experience

#### Example Pattern:

```
Use only ONE <lov-code> block to wrap ALL code changes and technical details in your response...
Use <lov-write> for creating or updating files...
Use <lov-rename> for renaming files...
Use <lov-delete> for removing files...
```

**Source:** Lovable system prompt - File operation instructions

### Manus 9.5/10

**Prompting Style:** Manus uses a highly modular, agent-based prompting style with extensive use of XML-style semantic markup and function-based agency model.

#### Key Characteristics:

- Comprehensive modular design with 20+ distinct functional components
- Detailed event stream processing architecture
- Extensive tool definitions with formal parameter specifications
- Clear separation between different operational domains

#### Example Pattern:

```
<agent_loop>
You are operating in an agent loop, iteratively completing tasks through these steps:
1. Analyze Events: Understand user needs and current state through event stream...
2. Select Tools: Choose next tool call based on current state...
3. Wait for Execution: Selected tool action will be executed...
4. Iterate: Choose only one tool call per iteration...
5. Submit Results: Send results to user via message tools...
6. Enter Standby: Enter idle state when all tasks are completed...
</agent_loop>
```

**Source:** Manus agent_loop.txt - Agent loop definition

## Underlying Philosophies and Methodologies

The system prompts reveal distinct philosophical approaches to AI assistant design:

### Cursor: Tool-Augmented Specialist

**Philosophy:** Cursor's prompts reflect a philosophy that AI should be deeply integrated with existing developer tools and workflows, serving as an extension of the developer's capabilities rather than a replacement.

**Source:** Derived from Cursor's prompt emphasis on IDE integration and specialized code editing instructions

#### Methodology:

- Deep integration with IDE and development environment
- Specialized knowledge of programming languages and paradigms
- Context-aware assistance based on current code state
- Incremental improvement of existing code rather than wholesale generation

#### Evaluation Approach:

Cursor appears to be evaluated primarily on:

- Accuracy of code modifications
- Relevance of suggestions to the current context
- Ability to understand and navigate complex codebases
- Quality of explanations for code-related concepts

### Devin: Autonomous Problem Solver

**Philosophy:** Devin's prompts embody a philosophy that AI can function as an autonomous software engineer, capable of understanding, planning, and executing complex development tasks with minimal human intervention.

**Source:** Directly stated in Devin's prompt with emphasis on autonomous planning and execution

#### Methodology:

- Comprehensive planning before execution
- Systematic debugging and problem diagnosis
- Autonomous exploration of solution spaces
- Self-evaluation and iterative improvement

#### Evaluation Approach:

Devin appears to be evaluated on:

- End-to-end task completion capability
- Problem-solving effectiveness
- Autonomy in planning and execution
- Quality and maintainability of produced code

### Lovable: User-Centered Creator

**Philosophy:** Lovable's prompts reflect a philosophy centered on creating user-friendly web applications with a focus on both technical correctness and user experience.

**Source:** Evident in Lovable's prompt focus on web development and user experience design

#### Methodology:

- Structured approach to web application development
- Framework-specific best practices
- User experience and design considerations
- Standardized patterns for common web development tasks

#### Evaluation Approach:

Lovable appears to be evaluated on:

- Functional correctness of web applications
- User experience quality
- Adherence to modern web development standards
- Visual design and responsive behavior

### Manus: Modular Agent Framework

**Philosophy:** Manus's prompts represent a philosophy that AI assistants should operate as modular, tool-using agents with clear operational frameworks and specialized capabilities for different domains.

**Source:** Evident in Manus's extensive modular design and agent loop architecture

#### Methodology:

- Modular design with specialized components
- Event-driven processing architecture
- Tool-based agency model with formal parameter specifications
- Iterative task completion through agent loops

#### Evaluation Approach:

Manus appears to be evaluated on:

- Task completion effectiveness across diverse domains
- Appropriate tool selection and usage
- Adherence to operational frameworks
- Quality of user interaction and communication

## Sophistication Assessment

Based on our analysis of the leaked system prompts, we can assess the relative sophistication of each product's prompt engineering techniques:

### Manus: 9.5/10

Manus demonstrates the most sophisticated prompt engineering techniques, with:

- Comprehensive modular design with clear separation of concerns
- Extensive use of XML-style semantic markup for structured instructions
- Formal function definitions with JSON Schema parameter specifications
- Detailed event stream processing architecture
- Specialized modules for different operational domains

**Source:** Analysis of Manus prompt.txt, agent_loop.txt, modules.txt, and tools.json

### Devin: 8.5/10

Devin shows highly sophisticated prompt engineering, particularly in:

- Comprehensive instructions for autonomous software development
- Detailed guidelines for system interaction and tool usage
- Structured approach to planning and problem-solving
- Effective use of markdown-style formatting for clarity

**Source:** Analysis of Devin system prompt

### Cursor: 8.0/10

Cursor demonstrates sophisticated prompt engineering in its domain, with:

- Highly specialized instructions for code understanding and generation
- Detailed guidelines for different programming languages and paradigms
- Effective use of conditional logic for different scenarios
- Clear integration with IDE and development environment

**Source:** Analysis of Cursor system prompt

### Lovable: 7.5/10

Lovable shows good prompt engineering techniques, particularly in:

- Custom markup language for file operations
- Detailed instructions for web application development
- Framework-specific guidelines
- Focus on user experience and design considerations

**Source:** Analysis of Lovable system prompt

## Methodological Innovations

Each product introduces unique methodological innovations in prompt engineering:

### Manus: Event Stream Processing

Manus introduces a sophisticated event stream processing architecture that allows the AI to process and respond to a chronological stream of events, including messages, actions, observations, plans, and knowledge items.

```
<event_stream>
You will be provided with a chronological event stream (may be truncated or partially omitted) containing the following types of events:
1. Message: Messages input by actual users
2. Action: Tool use (function calling) actions
3. Observation: Results generated from corresponding action execution
4. Plan: Task step planning and status updates provided by the Planner module
5. Knowledge: Task-related knowledge and best practices provided by the Knowledge module
6. Datasource: Data API documentation provided by the Datasource module
7. Other miscellaneous events generated during system operation
</event_stream>
```

**Source:** Manus prompt.txt - Event stream processing architecture

### Devin: Autonomous Planning Framework

Devin introduces an autonomous planning framework that enables the AI to break down complex tasks, plan approaches, and execute solutions with minimal human intervention.

```
When solving problems:
1. Break down complex tasks into smaller steps
2. Plan your approach before implementation
3. Test your solutions thoroughly
4. Document your work clearly

For complex tasks, create a plan with specific steps before executing. This helps ensure you don't miss important details and allows for methodical progress tracking.
```

**Source:** Devin system prompt - Autonomous planning framework

### Cursor: Context-Aware Code Assistance

Cursor introduces a context-aware code assistance model that enables the AI to understand and modify code based on the current state of the codebase and the user's intent.

```
When making code changes:
1. First understand the current state of the code and the user's intent
2. Consider the broader context of the codebase
3. Make minimal, focused changes that address the user's request
4. Explain your changes and reasoning

If the requested change has already been made in the codebase, point this out to the user rather than making redundant changes.
```

**Source:** Cursor system prompt - Context-aware code assistance model

### Lovable: Custom Markup Language

Lovable introduces a custom markup language for file operations that enables the AI to clearly indicate different types of actions in its responses.

```
Use only ONE <lov-code> block to wrap ALL code changes and technical details in your response...
Use <lov-write> for creating or updating files...
Use <lov-rename> for renaming files...
Use <lov-delete> for removing files...
```

**Source:** Lovable system prompt - Custom markup language for file operations

## Conclusion

Our comparative analysis reveals that while each AI product employs distinct prompting styles and philosophical approaches tailored to their specific domains, Manus demonstrates the most sophisticated prompt engineering techniques overall, with its comprehensive modular design, XML-style semantic markup, formal function definitions, and event stream processing architecture.

Devin follows closely with its autonomous planning framework and comprehensive software engineering guidelines, while Cursor excels in its specialized domain with context-aware code assistance. Lovable, while less sophisticated overall, introduces innovative approaches to web development with its custom markup language.

These differences reflect the diverse approaches to AI assistant design and highlight the rapid evolution of prompt engineering as a discipline. By understanding these different approaches, developers can make more informed decisions about which techniques to adopt for their own AI applications.
