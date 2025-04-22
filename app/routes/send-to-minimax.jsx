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
    console.warn("⚠️ orderId не передан");
    return json({ success: false, message: "Missing orderId" }, { status: 400 });
  }

  console.log(`🧪 В send-to-minimax: получен orderId из URL: ${orderId}`);

  try {
    const authResult = await authenticate.admin(request);

    if ('redirect' in authResult) {
      console.log("🔁 Shopify требует переаутентификации");
      return authResult.redirect;
    }

    const { session } = authResult;
    console.log(`🔐 Аутентифицировано: ${session.shop}`);

    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
    if (!shopifyOrder) {
      console.warn("❌ Не удалось получить заказ из Shopify");
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log("📦 Заказ из Shopify получен:", shopifyOrder.name);

    const token = await getAccessToken();
    console.log("🔑 Токен Minimax получен");

    const customerId = await createCustomer(token, shopifyOrder);
    if (!customerId) {
      console.error("❌ Ошибка при создании клиента в Minimax");
      return json({ success: false, message: "Customer creation failed in Minimax" }, { status: 500 });
    }

    console.log("👤 Клиент в Minimax создан:", customerId);

    const minimaxResponse = await createReceivedOrder(token, shopifyOrder, customerId);
    console.log("✅ Заказ успешно создан в Minimax:", minimaxResponse);

    return json({ success: true, minimaxResponse });
  } catch (err) {
    console.error("🛑 Ошибка во время выполнения send-to-minimax:", err);
    return json({ success: false, message: "Unexpected error", error: err.message }, { status: 500 });
  }
}