import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "./session.server";
import { authenticate, unauthenticated, login } from "@shopify/shopify-app-remix/adapters/node";

let shopify;
let initPromise;

export async function initShopify() {
  if (shopify) return shopify;
  if (initPromise) return initPromise;

  console.log("🔁 Initializing Shopify & Prisma session storage…");

  initPromise = (async () => {
    try {
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
      console.error("❌ Failed to initialize Shopify:", error);
      throw error;
    }
  })();

  return initPromise;
}

export const getShopify = initShopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = async (...args) => (await initShopify()).addDocumentResponseHeaders(...args);

// ✅ Use Remix adapter-provided versions
export { authenticate, unauthenticated, login };