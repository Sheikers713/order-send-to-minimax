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

  console.log(`🧪 In send-to-minimax: got orderId from URL: ${orderId}`);

  const authResult = await authenticate.admin(request);

  if ('redirect' in authResult) {
    console.log("🔁 Shopify requires reauthentication");
    return authResult.redirect; // <--- this is correct for Remix
  }

  try {
    const { session } = authResult;
    console.log(`🔐 Authenticated: ${session.shop}`);

    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
    if (!shopifyOrder) {
      console.warn("❌ Could not fetch order from Shopify");
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log("📦 Order from Shopify retrieved:", shopifyOrder.name);

    const token = await getAccessToken();
    console.log("🔑 Minimax token retrieved");

    const customerId = await createCustomer(token, shopifyOrder);
    if (!customerId) {
      console.error("❌ Failed to create customer in Minimax");
      return json({ success: false, message: "Customer creation failed in Minimax" }, { status: 500 });
    }

    console.log("👤 Customer created in Minimax:", customerId);

    const minimaxResponse = await createReceivedOrder(token, shopifyOrder, customerId);
    console.log("✅ Order successfully created in Minimax:", minimaxResponse);

    return json({ success: true, minimaxResponse });
  } catch (err) {
    console.error("🛑 Error during send-to-minimax execution:", err);
    return json({ success: false, message: "Unexpected error", error: err.message }, { status: 500 });
  }
}