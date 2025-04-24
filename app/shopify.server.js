import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

import Redis from "ioredis";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

let shopifyInstance;

export async function getShopify() {
  if (shopifyInstance) return shopifyInstance;

  // 🔧 создаём Redis-клиент правильно
  const redisClient = new Redis(process.env.REDIS_URL);
  const sessionStorage = new RedisSessionStorage(redisClient);
  await sessionStorage.init(); // 👈 обязательно

  const shopify = shopifyApp({
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

  shopifyInstance = shopify;
  return shopify;
}

export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = async (...args) =>
  (await getShopify()).addDocumentResponseHeaders(...args);
export const authenticate = async (...args) =>
  (await getShopify()).authenticate(...args);
export const unauthenticated = async (...args) =>
  (await getShopify()).unauthenticated(...args);
export const login = async (...args) =>
  (await getShopify()).login(...args);
export const registerWebhooks = async (...args) =>
  (await getShopify()).registerWebhooks(...args);
export const sessionStorage = async () =>
  (await getShopify()).sessionStorage;