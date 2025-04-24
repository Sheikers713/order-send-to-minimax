// app/lib/redis.js
import Redis from "ioredis";

let redisClientPromise;

export function getRedisClient() {
  if (!redisClientPromise) {
    console.log("🧠 [Redis] Creating Redis client (promise)...");
    redisClientPromise = Promise.resolve(new Redis(process.env.REDIS_URL));
  } else {
    console.log("♻️ [Redis] Reusing Redis client promise...");
  }

  return redisClientPromise;
}