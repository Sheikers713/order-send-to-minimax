require("@shopify/shopify-app-remix/adapters/node");

const {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} = require("@shopify/shopify-app-remix/server");

const { RedisSessionStorage } = require("@shopify/shopify-app-session-storage-redis");
const { getRedisClient } = require("./lib/redis");

let shopify;
let sessionStorage;

async function initShopify() {
  if (shopify) return shopify;

  console.log("🔁 [shopify] Initializing Redis and Shopify instance...");
  const redisClient = getRedisClient();

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

module.exports = {
  getShopify: initShopify,
  apiVersion: ApiVersion.January25,
  addDocumentResponseHeaders: async (...args) =>
    (await initShopify()).addDocumentResponseHeaders(...args),
  authenticate: async (...args) => (await initShopify()).authenticate(...args),
  unauthenticated: async (...args) => (await initShopify()).unauthenticated(...args),
  login: async (...args) => (await initShopify()).login(...args),
  registerWebhooks: async (...args) => (await initShopify()).registerWebhooks(...args),
  sessionStorageInstance: async () => (await initShopify()).sessionStorage,
};