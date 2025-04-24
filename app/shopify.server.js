// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import Redis from "ioredis";

let redisClient;

/**  
 * Create a lazy-connect ioredis client so that
 * .connect() is only invoked by RedisSessionStorage.
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      // ioredis option to delay the actual “connect” call
      lazyConnect: true,
    });
    redisClient.on("ready", () => console.log("✅ [Redis] ready"));
    redisClient.on("error", (err) => console.error("❌ [Redis]", err));
  }
  return redisClient;
}

let shopify;
let sessionStorage;
let initPromise;

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔁 Initializing Shopify & Redis…");

  initPromise = (async () => {
    const client = getRedisClient();
    sessionStorage = new RedisSessionStorage(client);

    // this will call client.connect() exactly once
    await sessionStorage.init();

    shopify = shopifyApp({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET ?? "",
      apiVersion: ApiVersion.January25,
      scopes: process.env.SCOPES?.split(",")!,
      appUrl: process.env.SHOPIFY_APP_URL!,
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

export const addDocumentResponseHeaders = async (...args) =>
  (await initShopify()).addDocumentResponseHeaders(...args);

export const authenticate = async (...args) =>
  (await initShopify()).authenticate(...args);

export const unauthenticated = async (...args) =>
  (await initShopify()).unauthenticated(...args);

export const login = async (...args) =>
  (await initShopify()).login(...args);

export const registerWebhooks = async (...args) =>
  (await initShopify()).registerWebhooks(...args);

export const sessionStorageInstance = async () =>
  (await initShopify()).sessionStorage;