import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const rawBody = await request.text();

  console.log("\n=== 📬 Incoming Webhook: APP_UNINSTALLED ===");
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log("📦 Raw Payload:", rawBody);

  try {
    const { shop, session, topic } = await authenticate.webhook(
      new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: rawBody, // reuse the already-read body
      })
    );

    console.log(`✅ Webhook Topic: ${topic}`);
    console.log(`🏬 Shop: ${shop}`);
    if (session) {
      console.log(`🧾 Session ID: ${session.id}`);
      await db.session.deleteMany({ where: { shop } });
      console.log("🗑 Session deleted from DB.");
    } else {
      console.log("⚠️ No session found. Possibly already deleted.");
    }

    console.log("✅ Webhook handled successfully.\n");
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("❌ Webhook handling failed.");
    console.error("📄 Error:", err?.message || err);
    console.log("❌ Webhook rejected.\n");
    return new Response("Webhook error", { status: 500 });
  }
};