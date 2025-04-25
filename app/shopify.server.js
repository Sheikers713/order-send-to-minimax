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
    v3_authenticatePublic: true,
    v3_lineItemBilling: true,
    v3_webhookAdminContext: true,
  },
  isEmbeddedApp: true,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

// Export the Shopify app instance
export default shopify;

// Export authentication functions
export const authenticate = async (request) => {
  const { session } = await shopify.authenticate.admin(request);
  return { session };
};

export const unauthenticated = async (request) => {
  return shopify.authenticate.public(request);
};

export const login = async (request) => {
  return shopify.authenticate.login(request);
};

export const registerWebhooks = async (request) => {
  return shopify.webhooks.register(request);
};

export const sessionStorage = shopify.sessionStorage;
export const apiVersion = ApiVersion.January25;

export const addDocumentResponseHeaders = async (request, responseHeaders) => {
  const { headers } = await shopify.authenticate.admin(request);
  Object.entries(headers).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });
};