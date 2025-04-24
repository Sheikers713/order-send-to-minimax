// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import Redis from "ioredis";

let redisClient;
let shopify;
let initPromise;

/**
 * Create and initialize Redis client
 */
async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }
    
    console.log("🔌 Creating Redis client with URL:", redisUrl);
    
    redisClient = new Redis(redisUrl, {
      lazyConnect: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });

    redisClient.on("ready", () => console.log("✅ [Redis] ready"));
    redisClient.on("error", (err) => console.error("❌ [Redis]", err));
    redisClient.on("connect", () => console.log("🔌 [Redis] connected"));
    redisClient.on("reconnecting", () => console.log("🔄 [Redis] reconnecting"));
    redisClient.on("close", () => console.log("🔌 [Redis] connection closed"));

    // Wait for the connection to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Redis connection timeout"));
      }, 10000);

      redisClient.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });

      redisClient.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
  return redisClient;
}

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔁 Initializing Shopify & Redis session storage…");

  initPromise = (async () => {
    try {
      const client = await getRedisClient();
      console.log("🔌 Initializing Redis session storage...");
      
      const sessionStorage = new RedisSessionStorage(client);
      await sessionStorage.init();
      console.log("✅ Redis session storage initialized");

      const scopes = (process.env.SCOPES || "").split(",");

      shopify = shopifyApp({
        apiKey: process.env.SHOPIFY_API_KEY || "",
        apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
        apiVersion: ApiVersion.January25,
        scopes,
        appUrl: process.env.SHOPIFY_APP_URL || "",
        authPathPrefix: "/auth",
        sessionStorage,
        distribution: AppDistribution.AppStore,
        future: { unstable_newEmbeddedAuthStrategy: true, removeRest: true },
        ...(process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}),
      });

      console.log("✅ Shopify initialized");
      return shopify;
    } catch (error) {
      console.error("❌ Error initializing Shopify:", error);
      throw error;
    }
  })();

  return initPromise;
}

export const getShopify = initShopify;
export const apiVersion = ApiVersion.January25;

export const addDocumentResponseHeaders = async (...args) => (await initShopify()).addDocumentResponseHeaders(...args);
export const authenticate = async (...args) => (await initShopify()).authenticate(...args);
export const unauthenticated = async (...args) => (await initShopify()).unauthenticated(...args);
export const login = async (...args) => (await initShopify()).login(...args);
export const registerWebhooks = async (...args) => (await initShopify()).registerWebhooks(...args);
export const sessionStorageInstance = async () => (await initShopify()).sessionStorage;
