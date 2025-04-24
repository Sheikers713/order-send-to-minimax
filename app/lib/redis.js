const Redis = require("ioredis");

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error("❌ REDIS_URL is not defined in environment variables.");
    }

    redisClient = new Redis(process.env.REDIS_URL);
    console.log("✅ [redis] Client initialized");
  }

  return redisClient;
}

module.exports = { getRedisClient };