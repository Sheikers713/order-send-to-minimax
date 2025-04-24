// app/lib/redis.js
import Redis from "ioredis";

let redisClient;
let redisReady = false;
let redisReadyPromise;

export function getRedisClient() {
  if (!redisClient) {
    console.log("🧠 [Redis] Creating Redis client...");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });

    redisReadyPromise = new Promise((resolve, reject) => {
      redisClient.once("ready", () => {
        console.log("✅ [Redis] Connected and ready");
        redisReady = true;
        resolve();
      });

      redisClient.once("error", (err) => {
        console.error("❌ [Redis] Connection error", err);
        reject(err);
      });
    });
  } else {
    console.log("♻️ [Redis] Reusing existing Redis client...");
  }

  return redisClient;
}

export async function waitForRedisReady() {
  if (redisReady) return;
  await redisReadyPromise;
}