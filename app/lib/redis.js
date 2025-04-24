// app/lib/redis.js
import { createClient } from "redis";

let redisClient;

export function getRedisClient() {
  if (!redisClient) {
    console.log("🧠 [Redis] Creating Redis client...");

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
      },
    });

    redisClient.on("ready", () => console.log("✅ [Redis] Connected and ready"));
    redisClient.on("error", (err) => console.error("❌ [Redis] Connection error", err));

    redisClient.connect().catch(console.error);
  } else {
    console.log("♻️ [Redis] Reusing existing client...");
  }

  return redisClient;
}