# Architecture Overview - AaaS (Agent as a Service)

## Overview

AaaS (Agent as a Service) enables asynchronous tool calling by AI agents. The system receives agent requests, processes them asynchronously using a job queue and worker paradigm, and returns results via webhooks.

## Components

### API Server

- Built with Express and TypeScript.
- Exposes RESTful API endpoints for agent interactions, job queue management, and tool execution.
- Uses middleware for error handling and asynchronous processing.

### Agent Management

- Controllers and services handle agent creation, message handling, and history management.
- Stores agent details and message history in Supabase and Redis.

### Asynchronous Job Processing

- Utilizes Bull for managing job queues.
- Jobs are enqueued via the API and processed asynchronously.
- Redis serves as the backend for the Bull queue.

### Tool Execution

- Tools are defined under `src/tools/async-tools` and extend a base tool class.
- Example: `helloWorldTool` simulates asynchronous processing with an optional delay.
- Tools can be invoked synchronously (wrapping asynchronous execution) and leverage Bull queues.

### Message History

- Maintains chat history per agent using Redis for fast access and Supabase for persistent storage.
- Managed by the `agentMessageHistoryService` and related repositories.

### External Integrations

- Integrates with the Vercel AI SDK and OpenAI for generating AI responses.
- Uses Axios for HTTP calls, such as sending webhook notifications.

## Flow of Execution

1. A client sends a request (e.g., a chat message) to an agent via the API.
2. The controller validates the input and delegates processing to the service.
3. The service processes the message, updates the conversation history, and, if necessary, enqueues a tool execution job.
4. The Bull queue processes jobs asynchronously, executing the tool and sending results via a webhook callback.
5. The agent receives the response, and its conversation history is updated.
6. When an asynchronous task completes, the job queue triggers a webhook callback to the agent's designated endpoint. This callback simulates a new user message containing the tool's output, allowing the agent to process the result as part of the ongoing conversation. This design decouples tool execution from immediate responses, enabling longer or complex tasks without blocking the agent's workflow.

## Project Structure

```
src/
├── controllers/        # Business logic for handling API requests (agentController, jobController)
├── middleware/         # Custom middleware (error handling, async handler, Bull Board setup)
├── queues/             # Bull queue configuration and job processing logic
├── repositories/       # Data access layer (agents, message history, etc.)
├── routes/             # API route definitions (agents, jobs, tools)
├── services/           # Core logic services (agent management, message history management)
├── tools/              # Asynchronous tool definitions and utilities
└── config/             # Configuration and environment variable management
```

## Conclusion

AaaS provides a robust framework for asynchronous AI agent interactions and tool executions, offloading complex processing to background jobs while ensuring timely responses via webhooks.
