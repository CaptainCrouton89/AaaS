# AaaS (Agent as a Service)

AaaS is a job queue service built with Express, Bull, and Redis to handle asynchronous tool execution requests from AI agents. It exposes RESTful APIs for managing agents, processing asynchronous jobs, and executing tools.

## Features

- Asynchronous tool execution using Bull queues and Redis.
- RESTful API endpoints for agent interactions.
- Integration with OpenAI / Vercel AI SDK for AI responses.
- Modular and clean project architecture with separation of concerns.
- Uses pnpm for package management.

## Project Structure

```
src/
├── controllers/      # API request handling (agent, job, tool controllers)
├── middleware/       # Custom middleware (error handling, async handler, Bull Board setup)
├── queues/           # Bull queue configuration and job processing logic
├── repositories/     # Data access layer for database operations
├── routes/           # API route definitions (agents, jobs, tools)
├── services/         # Core business logic (agent management, message history, etc.)
├── tools/            # Asynchronous tool definitions and utilities
└── config/           # Configuration and environment variable management
```

## Getting Started

### Prerequisites

- Node.js (>=14)
- pnpm (install with: `npm install -g pnpm`)
- Redis server (default: localhost:6379)
- Supabase or a similar database backend

### Installation

1. Clone the repository.
2. Run `pnpm install` to install dependencies.
3. Create a `.env` file at the root with the necessary environment variables (e.g., `PORT`, `REDIS_HOST`, `REDIS_PORT`, `API_BASE_URL`).

### Development

Start the development server with hot reloading:

```bash
pnpm dev
```

### Production

Build and start the production server:

```bash
pnpm build && pnpm start
```

## API Endpoints

- `POST /api/agents` - Create a new agent.
- `POST /api/agents/:agentId/chat` - Send a chat message to an agent.
- `GET /api/agents/:id` - Retrieve an agent by ID.
- `GET /api/agents/:id/messages` - Retrieve an agent with its message history.
- `DELETE /api/agents/:agentId/messages` - Clear an agent's message history.
- `POST /api/jobs` - Enqueue a new tool execution job.
- `GET /api/jobs` - List all jobs.
- `GET /api/jobs/:id` - Retrieve a job by its ID.

## Architecture

For a detailed overview of the project architecture, see `ARCHITECTURE.md`.

## Technologies

- Express
- Bull Queue
- Redis
- Supabase
- TypeScript
- Axios
- pnpm

## Contributing

Contributions are welcome! Please adhere to the project structure and coding guidelines. Submit pull requests for review.

## License

This project is licensed under the MIT License.
