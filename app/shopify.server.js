import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import Redis from "ioredis";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

let shopify;
let sessionStorage;

// ✅ Один раз создаём и повторно используем Redis клиент + sessionStorage
async function initShopify() {
  if (shopify) return shopify;

  console.log("🔁 [shopify] Initializing Redis and Shopify instance...");

  const redisClient = new Redis(process.env.REDIS_URL);

  if (!sessionStorage) {
    sessionStorage = new RedisSessionStorage(redisClient);
    await sessionStorage.init();
    console.log("✅ [Redis] Session storage initialized");
  }

  shopify = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    apiVersion: ApiVersion.January25,
    scopes: process.env.SCOPES?.split(","),
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

  console.log("✅ [shopify] Initialized");

  return shopify;
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