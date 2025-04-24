// app/routes/verify.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import axios from "axios";

export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);

    console.log("🧾 [verify] Session object:", JSON.stringify(session, null, 2));

    const shopInfo = await axios.get(`https://${session.shop}/admin/api/2024-04/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
      },
    });

    return json({
      status: "✅ Valid session",
      shop: session.shop,
      scope: session.scope,
      isOnline: session.isOnline,
      shopInfo: shopInfo.data,
    });
  } catch (error) {
    console.error("❌ [verify] Verification failed:", error?.response?.data || error.message);
    return json({
      status: "❌ Invalid session or token",
      error: error?.response?.data || error.message,
    }, { status: 401 });
  }
}