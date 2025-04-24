// app/lib/verifyShopifyToken.js
import axios from "axios";

export async function verifyShopifyToken(shop, token) {
  const url = `https://${shop}/admin/api/2024-04/shop.json`;

  console.log("🧪 [verifyToken] Verifying token with /shop.json...");
  try {
    const response = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": token
      }
    });

    console.log("✅ [verifyToken] Token is valid. Shop info:");
    console.log(JSON.stringify(response.data, null, 2));
    return true;

  } catch (error) {
    console.error("❌ [verifyToken] Token is invalid.");
    if (error.response) {
      console.error("📨 Status:", error.response.status);
      console.error("📄 Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("⚠️ Error:", error.message);
    }
    return false;
  }
}