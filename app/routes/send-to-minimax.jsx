// app/routes/send-to-minimax.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAccessToken } from "../lib/getAccessToken";
import { getShopifyOrder } from "../lib/getShopifyOrder";
import { createCustomer, createReceivedOrder } from "../lib/minimax";

export async function loader({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("id"); // <--- ЗДЕСЬ `id` а не `orderId`

  if (!orderId) {
    console.warn("⚠️ orderId не передан");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  console.log(`🧪 в send-to-minimax Получен orderId из URL: ${orderId}`);

  try {
    const { session } = await authenticate.admin(request);
    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);

    if (!shopifyOrder) {
      return json({ success: false, message: "Failed to fetch order" }, { status: 404 });
    }

    const token = await getAccessToken();
    const customerId = await createCustomer(token, shopifyOrder);

    if (!customerId) {
      return json({ success: false, message: "Customer creation failed" }, { status: 500 });
    }

    await createReceivedOrder(token, shopifyOrder, customerId);
    return json({ success: true });
  } catch (err) {
    console.error("🛑 Ошибка:", err);
    return json({ success: false, message: "Unexpected error" }, { status: 500 });
  }
}