// app/routes/send-to-minimax.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAccessToken } from "../lib/getAccessToken";
import { getShopifyOrder } from "../lib/getShopifyOrder";
import { createCustomer, createReceivedOrder } from "../lib/minimax";
import { verifyShopifyToken } from "../lib/verifyShopifyToken";


export async function loader({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("id");

  if (!orderId) {
    console.warn("[send-to-minimax] ❗ Missing orderId in URL");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  console.log(`🧪 [send-to-minimax] Received orderId from URL: ${orderId}`);

  try {
const { session } = await authenticate.admin(request);
    console.log("🔐 [auth] Authenticated session:");
    console.log("🧾 [session] Full object:", JSON.stringify(session, null, 2));

    console.log(`🔐 [auth] Authenticated session for shop: ${session.shop}`);
	await verifyShopifyToken(session.shop, session.accessToken);
    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
    if (!shopifyOrder) {
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log(`[shopifyOrder] ✅ Order fetched: ${shopifyOrder.name}`);

    const token = await getAccessToken();
    const customerId = await createCustomer(token, shopifyOrder);
    if (!customerId) {
      return json({ success: false, message: "Customer creation failed" }, { status: 500 });
    }

    await createReceivedOrder(token, shopifyOrder, customerId);
    console.log("[minimax] ✅ Order created in Minimax");

    return json({ success: true });

  } catch (err) {
    console.error("🛑 [send-to-minimax] Unexpected error:", err);
    return json(
      { success: false, message: "Unexpected error", error: err.message || "unknown" },
      { status: 500 }
    );
  }
}