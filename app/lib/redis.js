// app/lib/redis.js
import Redis from "ioredis";

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    console.log("🧠 [Redis] Creating Redis client...");
    redisClient = new Redis(process.env.REDIS_URL);
  } else {
    console.log("♻️ [Redis] Reusing Redis client...");
  }
  return redisClient;
}