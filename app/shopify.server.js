// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import { createClient } from 'redis';

let shopify;
let initPromise;

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
      // First, test the Redis connection directly
      const redisClient = createClient({
        url: redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false
        }
      });

      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      redisClient.on('connect', () => console.log('Redis Client Connected'));
      
      await redisClient.connect();
      await redisClient.ping();
      console.log("✅ Redis connection test successful");

      // Now create the session storage
      const sessionStorage = new RedisSessionStorage({
        url: redisUrl,
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log("🔌 Initializing Redis session storage...");
      await sessionStorage.init();
      console.log("✅ Redis session storage initialized successfully");

      // Close the test client
      await redisClient.quit();
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