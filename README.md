# Job Queue Service

A simple job queue service built with Express, Bull, and Redis following best practices.

## Project Structure

```
src/
├── server.ts              # Main entry point
├── app.ts                 # Express app configuration
├── config/                # Configuration from environment variables
├── middleware/            # Application middleware
│   ├── asyncHandler.ts    # Async route handler wrapper
│   ├── bullBoard.ts       # Bull Board setup
│   └── errorHandler.ts    # Global error handling
├── routes/                # API routes
├── controllers/           # Request handlers
├── services/              # Business logic
└── queues/                # Job queue definitions
```

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Configure environment variables in a `.env` file:

   ```
   PORT=3000
   REDIS_HOST=localhost
   REDIS_PORT=6379
   AGENT_URL=http://localhost:3000
   NODE_ENV=development
   ```

3. Run the server:

   ```
   # Development
   pnpm dev

   # Production
   pnpm build
   pnpm start
   ```

## API Endpoints

- `POST /api/jobs` - Create a new job

  - Required fields: `toolName`, `agentId`, `path`
  - Optional fields: `args` (object)

- `GET /api/jobs/:id` - Get job by ID

  - Returns job details including state and progress

- `GET /api/jobs` - Get all jobs
  - Returns waiting, active, completed, and failed jobs

## Admin Interface

A Bull Board UI is available at `/admin/queues` for monitoring jobs.
