// app/lib/getShopifyOrder.js
import axios from 'axios';

const API_VERSION = '2024-04';

export async function getShopifyOrder(orderId, shop, accessToken) {
  const url = `https://${shop}/admin/api/${API_VERSION}/orders/${orderId}.json`;

  console.log("📦 [getShopifyOrder] Fetching order from Shopify...");
  console.log("🛍️ [getShopifyOrder] Shop:", shop);
  console.log("📦 [getShopifyOrder] Order ID:", orderId);
  console.log("🔑 [getShopifyOrder] Token begins with:", accessToken?.slice(0, 10) + "...");

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken, // ✅ MUST BE EXACTLY THIS
      },
    });

    console.log("✅ [getShopifyOrder] Order fetched successfully");
    return response.data.order;

  } catch (error) {
    console.error("❌ [getShopifyOrder] Failed to fetch order from Shopify.");
    if (error.response) {
      console.error("📨 Status:", error.response.status);
      console.error("📄 Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("⚠️ Error:", error.message);
    }
    return null;
  }
}