import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  smartMatchOrders,
  cleanCustomerQuery,
  formatSingleOrderLineMessage,
  formatMultipleOrdersLineMessage,
  formatCustomerOrdersReport,
  buildOrdersLineFlexMessage,
  formatOrderNotFoundMessage,
  STATUS_MAP_TH
} from "../../src/utils/lineMatcher";

// Helper to fetch live orders from Firestore REST API without heavy SDKs
async function fetchOrdersFromFirestore(): Promise<any[]> {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/nuhpre-order/databases/(default)/documents/orders");
    if (!res.ok) return [];
    const data = await res.json();
    const parseFields = (fields: any): any => {
      const resObj: any = {};
      for (const [k, v] of Object.entries(fields || {})) {
        const valObj = v as any;
        if ("stringValue" in valObj) resObj[k] = valObj.stringValue;
        else if ("integerValue" in valObj) resObj[k] = parseInt(valObj.integerValue, 10);
        else if ("doubleValue" in valObj) resObj[k] = parseFloat(valObj.doubleValue);
        else if ("booleanValue" in valObj) resObj[k] = valObj.booleanValue;
        else if ("arrayValue" in valObj) resObj[k] = (valObj.arrayValue.values || []).map((x: any) => Object.values(x)[0]);
        else if ("mapValue" in valObj) resObj[k] = parseFields(valObj.mapValue.fields);
      }
      return resObj;
    };
    return (data.documents || []).map((doc: any) => ({
      id: doc.name.split("/").pop(),
      ...parseFields(doc.fields)
    }));
  } catch (e) {
    console.warn("[Vercel Webhook] Firestore fetch failed:", e);
    return [];
  }
}

// Fallback to read orders from local file
function readOrdersFromFile(): any[] {
  try {
    const p = path.join(process.cwd(), "orders.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch (e) {}
  return [];
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-line-signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET route for LINE verification or uptime check
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "NUNUH LINE Webhook endpoint is active and ready.",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const LINE_CHANNEL_ACCESS_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const LINE_CHANNEL_SECRET = (process.env.LINE_CHANNEL_SECRET || "").trim();

    // Verify LINE signature if secret and signature present
    const signature = req.headers["x-line-signature"];
    const body = req.body || {};
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);

    if (LINE_CHANNEL_SECRET && signature && bodyString) {
      try {
        const hash = crypto
          .createHmac("SHA256", LINE_CHANNEL_SECRET)
          .update(bodyString)
          .digest("base64");
        if (hash !== signature) {
          console.warn("[Vercel LINE Webhook] Signature mismatch warning");
        }
      } catch (e) {}
    }

    // LINE Webhook Verification test (empty events array or no events)
    const events = (typeof body === "object" && Array.isArray(body.events)) ? body.events : [];
    if (events.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Webhook verification verified successfully by LINE platform."
      });
    }

    // Determine public URL
    const host = req.headers["x-forwarded-host"] || req.headers.host || "to-do-list-two-lovat.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseAppUrl = `${proto}://${host}`.replace(/\/+$/, "");

    // Load orders
    let allOrders = await fetchOrdersFromFirestore();
    if (!allOrders || allOrders.length === 0) {
      allOrders = readOrdersFromFile();
    }

    // Process events
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = (event.message.text || "").trim();
        const userId = event.source?.userId;

        console.log(`[Vercel Webhook] Received user message: "${originalText}" from userId: ${userId}`);

        // Match orders
        const matchedOrders = smartMatchOrders(originalText, allOrders, userId);

        let replyMessage = "";
        let flexObj: any = null;

        if (matchedOrders.length === 0) {
          const digits = originalText.replace(/\D/g, "");
          const isLikelySearch = digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText);
          if (isLikelySearch) {
            replyMessage = formatOrderNotFoundMessage(originalText);
          } else {
            replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\nคุณลูกค้าสามารถพิมพ์เบอร์โทรศัพท์ (เช่น 0801462230) หรือชื่อ เพื่อติดตามสถานะออเดอร์งานตัดเย็บทั้งหมดได้ทันทีนะคะ ✨`;
          }
        } else {
          // Format orders report & flex message
          replyMessage = formatCustomerOrdersReport(matchedOrders, baseAppUrl, userId);
          try {
            flexObj = buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, userId);
          } catch (e) {
            console.warn("Error building flex message:", e);
          }
        }

        // Send reply to customer via LINE API
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          const messagesPayload: any[] = [];
          if (flexObj) {
            messagesPayload.push(flexObj);
          }
          if (replyMessage) {
            messagesPayload.push({
              type: "text",
              text: replyMessage
            });
          }

          try {
            const lineReplyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
              },
              body: JSON.stringify({
                replyToken,
                messages: messagesPayload.slice(0, 5) // LINE allows up to 5 messages per reply
              })
            });

            if (!lineReplyRes.ok) {
              const errBody = await lineReplyRes.text();
              console.error("[Vercel Webhook] LINE reply error:", errBody);
            } else {
              console.log(`[Vercel Webhook] Reply sent successfully to user for query "${originalText}".`);
            }
          } catch (replyErr) {
            console.error("[Vercel Webhook] Failed to fetch LINE reply API:", replyErr);
          }
        }
      }
    }

    return res.status(200).json({ status: "success", processed: events.length });
  } catch (err: any) {
    console.error("[Vercel Webhook Error]", err);
    // Never crash: always return 200 to LINE platform so LINE doesn't drop the connection
    return res.status(200).json({ status: "error_handled", error: err.message });
  }
}
