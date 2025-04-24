// app/lib/redis.js
import Redis from "ioredis";

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    console.log("🧠 [Redis] Creating Redis client...");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });

    redisClient.on("ready", () => {
      console.log("✅ [Redis] Connected and ready");
    });

    redisClient.on("error", (err) => {
      console.error("❌ [Redis] Connection error", err);
    });
  } else {
    console.log("♻️ [Redis] Reusing existing Redis client...");
  }

  return redisClient;
}