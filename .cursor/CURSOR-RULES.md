# Cursor Rules for AaaS (Agent as a Service)

This document outlines the coding standards and practices to follow when developing in this project using Cursor.

## Project Overview

This is a job queue service built with Express, Bull, and Redis for handling agent tool execution requests.

## Development Rules

### Project Structure

- The project follows a clean modular structure with dedicated directories
- Keep code organized in the following directories:
  - `src/routes/` - API route definitions
  - `src/controllers/` - Request/response handling logic
  - `src/middleware/` - Express middleware
  - `src/queues/` - Job queue definitions
  - `src/config/` - Configuration from environment variables
  - `src/services/` - Business logic

### Package Management

- Always use pnpm for package management
- Run `pnpm install <package>` to add dependencies
- Run `pnpm run <script>` for scripts
- Check package.json for existing dependencies before adding new ones

### TypeScript

- All new files should use TypeScript with proper type definitions
- Define interfaces for all data structures
- Ensure proper type safety across the codebase
- Follow the existing TypeScript configuration

### API Design

- Follow REST conventions for API endpoints
- Controllers should handle request/response logic
- Services should handle business logic
- Use appropriate HTTP status codes for responses
- Structure API responses consistently

### Error Handling

- Use the asyncHandler middleware for async route handlers
- Let the global error handler manage errors
- Return consistent error responses from API endpoints
- Properly validate input data

### Queue Management

- Use Bull for queue management
- Define jobs with proper interfaces
- Use the Bull API for queue operations
- Implement proper error handling for job processing
- Use Bull Board for monitoring queue status

### Environment Configuration

- Store configuration in .env file
- Access environment variables via the config module
- Don't hardcode configuration values in application code
- Provide sensible defaults for local development

### Testing

- Write unit tests for all business logic
- Write integration tests for API endpoints
- Test error handling scenarios
- Mock external dependencies in tests

### Middleware Usage

- Register middleware in app.ts
- Custom middleware should be in the middleware directory
- Keep middleware functions focused on a single responsibility
- Document middleware purpose and behavior

### Logging

- Use console.log for development
- Consider implementing a proper logging service for production
- Log appropriate information for debugging
- Don't log sensitive information

### Redis Connection

- Redis connection details should be configured via environment variables
- Handle Redis connection errors gracefully
- Use connection pooling for efficiency

### Development Workflow

- Use `pnpm dev` for development with hot reloading
- Use `pnpm build && pnpm start` for production
- Follow Git best practices for version control
- Document all significant changes

### Documentation

- Document all public functions, classes, and interfaces with JSDoc comments
- Keep README.md up to date with setup and usage instructions
- Document API endpoints with example requests and responses
- Update documentation when making significant changes
