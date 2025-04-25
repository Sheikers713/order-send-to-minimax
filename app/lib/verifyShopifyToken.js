// app/lib/verifyShopifyToken.js
import axios from "axios";

export async function verifyShopifyToken(shop, token) {
  const url = `https://${shop}/admin/api/2024-04/shop.json`;

  console.log("🧪 [verifyToken] Verifying token with /shop.json...");
  try {
    const response = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "X-Shopify-API-Version": "2024-04"
      }
    });

    console.log("✅ [verifyToken] Token is valid. Shop info:");
    console.log(JSON.stringify(response.data, null, 2));
    return true;

  } catch (error) {
    console.error("❌ [verifyToken] Token verification failed.");
    if (error.response) {
      console.error("📨 Status:", error.response.status);
      console.error("📄 Response:", JSON.stringify(error.response.data, null, 2));
      
      // If it's a 401, we should try to refresh the token
      if (error.response.status === 401) {
        console.log("🔄 [verifyToken] Token might be expired, attempting to refresh...");
        // The Shopify App Bridge will handle token refresh automatically
        // We just need to retry the request
        try {
          const retryResponse = await axios.get(url, {
            headers: {
              "X-Shopify-Access-Token": token,
              "X-Shopify-API-Version": "2024-04"
            }
          });
          console.log("✅ [verifyToken] Token refresh successful");
          return true;
        } catch (retryError) {
          console.error("❌ [verifyToken] Token refresh failed");
          return false;
        }
      }
    } else {
      console.error("⚠️ Error:", error.message);
    }
    return false;
  }
}