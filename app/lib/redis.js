// app/lib/redis.js
import Redis from "ioredis";

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    console.log("🧠 [Redis] Creating new Redis client...");
    redisClient = new Redis(process.env.REDIS_URL);
  }
  return redisClient;
}