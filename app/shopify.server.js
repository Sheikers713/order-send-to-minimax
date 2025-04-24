// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "./session.server";

let shopify;
let initPromise;

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔁 Initializing Shopify & Prisma session storage…");

  initPromise = (async () => {
    try {
      // Create session storage with Prisma
      const sessionStorage = new PrismaSessionStorage();
      
      console.log("🔌 Initializing Prisma session storage...");
      console.log("✅ Prisma session storage initialized successfully");

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
    } catch (error) {
      console.error("❌ Failed to initialize Prisma:", error);
      throw error;
    }
  })();

  return initPromise;
}

// Export the Shopify instance
export const getShopify = initShopify;

// Export authentication functions
export async function authenticate(request) {
  const shopifyInstance = await initShopify();
  return shopifyInstance.authenticate(request);
}

export async function unauthenticated(request) {
  const shopifyInstance = await initShopify();
  return shopifyInstance.unauthenticated(request);
}

export async function login(request) {
  const shopifyInstance = await initShopify();
  return shopifyInstance.login(request);
}

export async function registerWebhooks(request) {
  const shopifyInstance = await initShopify();
  return shopifyInstance.registerWebhooks(request);
}

export async function sessionStorageInstance() {
  const shopifyInstance = await initShopify();
  return shopifyInstance.sessionStorage;
}

export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = async (...args) => (await initShopify()).addDocumentResponseHeaders(...args);