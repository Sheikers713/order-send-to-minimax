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

      const app = shopifyApp({
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
      return app;
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
  const app = await initShopify();
  return app.authenticate(request);
}

export async function unauthenticated(request) {
  const app = await initShopify();
  return app.unauthenticated(request);
}

export async function login(request) {
  const app = await initShopify();
  return app.login(request);
}

export async function registerWebhooks(request) {
  const app = await initShopify();
  return app.registerWebhooks(request);
}

export async function sessionStorageInstance() {
  const app = await initShopify();
  return app.sessionStorage;
}

export const apiVersion = ApiVersion.January25;

export async function addDocumentResponseHeaders(request) {
  const app = await initShopify();
  return app.addDocumentResponseHeaders(request);
}