import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import { getRedisClient } from "./lib/redis.js";

let shopify;
let sessionStorage;
let initPromise;

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔂 [Shopify] initShopify called");
  console.log("🔁 [shopify] Initializing Redis and Shopify instance...");

  initPromise = (async () => {
    const redis = getRedisClient();

    sessionStorage = new RedisSessionStorage(redis);
    await sessionStorage.init();

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