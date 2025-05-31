// app/routes/send-to-minimax.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAccessToken } from "../lib/getAccessToken";
import { getShopifyOrder } from "../lib/getShopifyOrder";
import { createCustomer, createReceivedOrder } from "../lib/minimax";
import { verifyShopifyToken } from "../lib/verifyShopifyToken";

// Cache for in-flight requests
const requestCache = new Map();

export async function loader({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("id");

  if (!orderId) {
    console.warn("[send-to-minimax] ❗ Missing orderId in URL");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  // Check if request is already in progress
  if (requestCache.has(orderId)) {
    console.log(`🔄 [send-to-minimax] Request for order ${orderId} already in progress, waiting...`);
    const cachedResponse = await requestCache.get(orderId);
    return json(cachedResponse);
  }

  console.log(`🧪 [send-to-minimax] Received orderId from URL: ${orderId}`);

  // Create a promise for this request
  const requestPromise = (async () => {
    try {
      const { session } = await authenticate(request);
      console.log("🔐 [auth] Authenticated session:");
      console.log("🧾 [session] Full object:", JSON.stringify(session, null, 2));

      console.log(`🔐 [auth] Authenticated session for shop: ${session.shop}`);
      await verifyShopifyToken(session.shop, session.accessToken);
      
      // Get order from Shopify
      const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
      if (!shopifyOrder) {
        return { success: false, message: "Failed to fetch order from Shopify" };
      }

      console.log(`[shopifyOrder] ✅ Order fetched: ${shopifyOrder.name}`);

      // Get Minimax token
      const token = await getAccessToken();
      
      // Create or get customer
      const customerId = await createCustomer(token, shopifyOrder);
      if (!customerId) {
        return { success: false, message: "Customer creation failed" };
      }

      // Create order in Minimax
      try {
        const minimaxOrder = await createReceivedOrder(token, shopifyOrder, customerId);
        console.log("[minimax] ✅ Order created in Minimax with ID:", minimaxOrder.ID);
        return { 
          success: true, 
          message: "Order successfully created in Minimax",
          orderId: minimaxOrder.ID
        };
      } catch (error) {
        console.error("[minimax] ❌ Error creating order:", error);
        return { 
          success: false, 
          message: error.message || "Failed to create order in Minimax"
        };
      }
    } catch (error) {
      console.error("🛑 [send-to-minimax] Unexpected error:", error);
      return { 
        success: false, 
        message: error.message || "An unexpected error occurred"
      };
    }
  })();

  // Store the promise in cache
  requestCache.set(orderId, requestPromise);

  try {
    const result = await requestPromise;
    return json(result, { status: result.success ? 200 : 500 });
  } finally {
    // Clean up cache
    requestCache.delete(orderId);
  }
}