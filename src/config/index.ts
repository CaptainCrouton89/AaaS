import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  agentUrl: process.env.AGENT_URL || "http://localhost:3000",
  environment: process.env.NODE_ENV || "development",
};
