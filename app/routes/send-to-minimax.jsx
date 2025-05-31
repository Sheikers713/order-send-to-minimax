// app/routes/send-to-minimax.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAccessToken } from "../lib/getAccessToken";
import { getShopifyOrder } from "../lib/getShopifyOrder";
import { createCustomer, createReceivedOrder, findExistingOrder } from "../lib/minimax";
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
    const { session } = await authenticate(request);
    console.log("🔐 [auth] Authenticated session:");
    console.log("🧾 [session] Full object:", JSON.stringify(session, null, 2));

    console.log(`🔐 [auth] Authenticated session for shop: ${session.shop}`);
    await verifyShopifyToken(session.shop, session.accessToken);
    
    // Get order from Shopify
    const shopifyOrder = await getShopifyOrder(orderId, session.shop, session.accessToken);
    if (!shopifyOrder) {
      return json({ success: false, message: "Failed to fetch order from Shopify" }, { status: 404 });
    }

    console.log(`[shopifyOrder] ✅ Order fetched: ${shopifyOrder.name}`);

    // Get Minimax token
    const token = await getAccessToken();
    
    // Create or get customer
    const customerId = await createCustomer(token, shopifyOrder);
    if (!customerId) {
      return json({ success: false, message: "Customer creation failed" }, { status: 500 });
    }

    // Create order in Minimax
    try {
      const minimaxOrder = await createReceivedOrder(token, shopifyOrder, customerId);
      console.log("[minimax] ✅ Order created in Minimax with ID:", minimaxOrder.ID);
      return json({ 
        success: true, 
        message: "Order successfully created in Minimax",
        orderId: minimaxOrder.ID
      });
    } catch (error) {
      console.error("[minimax] ❌ Error creating order:", error);
      
      // Check if order was actually created despite the error
      const existingOrder = await findExistingOrder(token, shopifyOrder.order_number);
      if (existingOrder) {
        console.log(`[minimax] ✅ Order was created despite error, returning existing order`);
        return json({ 
          success: true, 
          message: "Order was created in Minimax",
          orderId: existingOrder.ID
        });
      }
      
      return json({ 
        success: false, 
        message: error.message || "Failed to create order in Minimax"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("🛑 [send-to-minimax] Unexpected error:", error);
    return json({ 
      success: false, 
      message: error.message || "An unexpected error occurred"
    }, { status: 500 });
  }
}