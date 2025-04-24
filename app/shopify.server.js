// app/shopify.server.js
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, ApiVersion, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "./session.server";

const scopes = (process.env.SCOPES || "").split(",");

// Initialize the Shopify app
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes,
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

// Export the Shopify app instance
export default shopify;

// Export authentication functions
export const authenticate = (request) => shopify.authenticate(request);
export const unauthenticated = (request) => shopify.unauthenticated(request);
export const login = (request) => shopify.login(request);
export const registerWebhooks = (request) => shopify.registerWebhooks(request);
export const sessionStorage = shopify.sessionStorage;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = (request) => shopify.addDocumentResponseHeaders(request);