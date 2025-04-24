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
    console.warn("[send-to-minimax] ❗ Missing orderId in URL");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  console.log(`🧪 [send-to-minimax] Received orderId from URL: ${orderId}`);

  let authResult;
  try {
    authResult = await authenticate.admin(request);

    if ('redirect' in authResult) {
      console.log("🔁 [authResult] Redirect required, returning redirect...");
      return authResult.redirect;
    }

    const { session } = authResult;
    console.log(`🔐 [authResult] Authenticated session for shop: ${session.shop}`);

    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
    if (!shopifyOrder) {
      console.warn("[shopifyOrder] ❌ Failed to fetch order from Shopify");
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log(`[shopifyOrder] ✅ Order fetched from Shopify: ${shopifyOrder.name}`);

    const token = await getAccessToken();
    console.log("[minimax] 🔑 Token received");

    const customerId = await createCustomer(token, shopifyOrder);
    if (!customerId) {
      console.error("[minimax] ❌ Failed to create customer in Minimax");
      return json({ success: false, message: "Customer creation failed" }, { status: 500 });
    }

    console.log(`[minimax] 👤 Customer created with ID: ${customerId}`);

    const minimaxResponse = await createReceivedOrder(token, shopifyOrder, customerId);
    console.log("[minimax] ✅ Order created in Minimax:", minimaxResponse);

    return json({ success: true, minimaxResponse });

  } catch (err) {
    // ✨ Новая логика: если ошибка содержит redirect — возвращаем его
    if (err && typeof err === "object" && "status" in err && err.status === 302 && "headers" in err) {
      const location = err.headers.get("location");
      console.warn("↪️ [send-to-minimax] Redirect caught as error, redirecting to:", location);
      return Response.redirect(location, 302);
    }

    console.error("🛑 Unexpected error in send-to-minimax loader:", err);
    return json({ success: false, message: "Unexpected error", error: err.message || "unknown" }, { status: 500 });
  }
}