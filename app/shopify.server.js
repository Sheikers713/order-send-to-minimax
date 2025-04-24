// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

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

    // Pass the Redis URL directly so the adapter creates its own client
    const sessionStorage = new RedisSessionStorage(redisUrl);
    // Initialize connection and run migrations
    await sessionStorage.init();
    console.log("✅ Redis session storage initialized");

    const scopes = (process.env.SCOPES || "").split(",");

    shopify = shopifyApp({
      apiKey:         process.env.SHOPIFY_API_KEY || "",
      apiSecretKey:   process.env.SHOPIFY_API_SECRET || "",
      apiVersion:     ApiVersion.January25,
      scopes,
      appUrl:         process.env.SHOPIFY_APP_URL || "",
      authPathPrefix: "/auth",
      sessionStorage,
      distribution:   AppDistribution.AppStore,
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

export const getShopify                 = initShopify;
export const apiVersion                 = ApiVersion.January25;
export const addDocumentResponseHeaders = async (...args) =>
  (await initShopify()).addDocumentResponseHeaders(...args);
export const authenticate               = async (...args) =>
  (await initShopify()).authenticate(...args);
export const unauthenticated            = async (...args) =>
  (await initShopify()).unauthenticated(...args);
export const login                      = async (...args) =>
  (await initShopify()).login(...args);
export const registerWebhooks           = async (...args) =>
  (await initShopify()).registerWebhooks(...args);
export const sessionStorageInstance     = async () =>
  (await initShopify()).sessionStorage;
