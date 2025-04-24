// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import { createClient } from 'redis';

let shopify;
let initPromise;

// Create a wrapper that adds the missing isReady property
function createRedisClientWithIsReady(options) {
  const client = createClient(options);
  
  // Add isReady property
  Object.defineProperty(client, 'isReady', {
    get: function() {
      return this.isOpen;
    }
  });
  
  return client;
}

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔁 Initializing Shopify & Redis session storage…");

  initPromise = (async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    console.log("🔌 Using Redis URL:", redisUrl);

    try {
      // Create Redis client with isReady property
      const redisClient = createRedisClientWithIsReady({
        url: redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false
        }
      });

      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      redisClient.on('connect', () => console.log('Redis Client Connected'));
      
      // Connect to Redis
      await redisClient.connect();
      await redisClient.ping();
      console.log("✅ Redis connection test successful");

      // Create session storage with the wrapped Redis client
      const sessionStorage = new RedisSessionStorage(redisClient);
      
      console.log("🔌 Initializing Redis session storage...");
      await sessionStorage.init();
      console.log("✅ Redis session storage initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Redis:", error);
      throw error;
    }

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
      future: {
        unstable_newEmbeddedAuthStrategy: true,
        removeRest: true,
      },
      ...(process.env.SHOP_CUSTOM_DOMAIN
        ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
        : {}),
    });

    console.log("✅ Shopify initialized");
    return shopify;
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