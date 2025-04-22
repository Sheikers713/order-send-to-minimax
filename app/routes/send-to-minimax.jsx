// app/routes/send-to-minimax.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAccessToken } from "../lib/getAccessToken";
import { getShopifyOrder } from "../lib/getShopifyOrder";
import { createCustomer, createReceivedOrder } from "../lib/minimax";

export async function loader({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("id");

  if (!orderId) {
    console.warn("⚠️ orderId not provided");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  console.log(`🧪 [send-to-minimax] Received orderId from URL: ${orderId}`);

  try {
    const authResult = await authenticate.admin(request);
    console.log("🔍 [authResult] = ", authResult);

    if ('redirect' in authResult) {
      console.warn("🔁 [authResult] Redirect required, returning redirect...");
      return authResult.redirect;
    }

    const { session } = authResult;

    if (!session || !session.shop || !session.accessToken) {
      console.error("❌ Session missing required fields:", session);
      return json({ success: false, message: "Invalid Shopify session" }, { status: 401 });
    }

    console.log(`🔐 Authenticated shop: ${session.shop}`);
    console.log(`🪪 Access token: ${session.accessToken.slice(0, 10)}...`);

    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);

    if (!shopifyOrder) {
      console.warn("❌ Failed to fetch order from Shopify");
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log("📦 Shopify order fetched:", shopifyOrder.name);

    const token = await getAccessToken();
    console.log("🔑 Minimax token acquired");

    const customerId = await createCustomer(token, shopifyOrder);

    if (!customerId) {
      console.error("❌ Failed to create customer in Minimax");
      return json({ success: false, message: "Customer creation failed" }, { status: 500 });
    }

    console.log("👤 Customer created in Minimax:", customerId);

    const response = await createReceivedOrder(token, shopifyOrder, customerId);
    console.log("✅ Order successfully created in Minimax:", response);

    return json({ success: true, minimaxResponse: response });
  } catch (err) {
    console.error("🛑 Unexpected error in send-to-minimax loader:", err);
    return json({
      success: false,
      message: "Unexpected error occurred",
      error: err?.message || "unknown"
    }, { status: 500 });
  }
}