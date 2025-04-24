// app/lib/redis.js
import Redis from "ioredis";

let redisClientPromise;

export function getRedisClient() {
  if (!redisClientPromise) {
    console.log("🧠 [Redis] Creating Redis client...");
    redisClientPromise = new Promise((resolve, reject) => {
      const client = new Redis(process.env.REDIS_URL);
      client.once("ready", () => {
        console.log("✅ [Redis] Connected");
        resolve(client);
      });
      client.once("error", (err) => {
        console.error("❌ [Redis] Connection error", err);
        reject(err);
      });
    });
  } else {
    console.log("♻️ [Redis] Reusing Redis client promise...");
  }
  return redisClientPromise;
}