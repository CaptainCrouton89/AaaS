import Redis from "ioredis";
import config from "../config";

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

export default redisClient;
