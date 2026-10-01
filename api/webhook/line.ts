import type { IncomingMessage, ServerResponse } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDbModule } from "../_db_helper";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "../../src/firebase";
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

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-line-signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET route for testing / health check
  if (req.method === "GET") {
    const db = await getDbModule();
    return res.status(200).json({
      status: "ok",
      message: "LINE Webhook endpoint is active and ready for Messaging API events.",
      hasToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      hasSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
      hasDb: db.isPostgresActive(),
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = await getDbModule();

    // Fetch settings to check tokens
    let settings: any = {};
    try {
      settings = await db.getSettingsFromDb();
    } catch (e) {}

    const LINE_CHANNEL_ACCESS_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || settings.lineChannelAccessToken || "").trim();
    const LINE_CHANNEL_SECRET = (process.env.LINE_CHANNEL_SECRET || settings.lineChannelSecret || "").trim();

    // Verify LINE signature if secret is present
    const signature = req.headers["x-line-signature"];
    const body = req.body;
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);

    if (LINE_CHANNEL_SECRET && signature && bodyString) {
      const hash = crypto
        .createHmac("SHA256", LINE_CHANNEL_SECRET)
        .update(bodyString)
        .digest("base64");
      if (hash !== signature) {
        console.warn("[Vercel LINE Webhook] Signature verification mismatch warning");
      }
    }

    // Determine public URL for customer portal
    const host = req.headers["x-forwarded-host"] || req.headers.host || "to-do-list-two-lovat.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const configuredUrl = (settings.publicUrl || "").trim();
    const baseAppUrl = configuredUrl || `${proto}://${host}`;

    // Read live orders from Firebase Firestore first
    let allOrders: any[] = [];
    let fsDbInstance: any = null;
    try {
      const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      fsDbInstance = getFirestore(fbApp);
      const snap = await getDocs(collection(fsDbInstance, "orders"));
      if (!snap.empty) {
        snap.forEach((d) => {
          const docData = d.data();
          allOrders.push({ ...docData, id: docData.id || d.id });
        });
        console.log(`[LINE Webhook] Loaded ${allOrders.length} live orders from Firebase Firestore.`);
      }
    } catch (fsErr) {
      console.warn("[LINE Webhook] Firestore fetch warning:", fsErr);
    }

    // Fallback to PostgreSQL if Firestore had no orders
    if (allOrders.length === 0 && db.isPostgresActive()) {
      try {
        await db.initDb().catch(() => {});
        allOrders = await db.getOrdersFromDb();
      } catch (dbErr) {
        console.error("[LINE Webhook] Database query error:", dbErr);
      }
    }

    // Fallback to orders.json if still empty
    if (allOrders.length === 0) {
      try {
        const localPath = path.join(process.cwd(), "orders.json");
        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, "utf-8");
          allOrders = JSON.parse(raw);
        }
      } catch (fsErr) {}
    }

    const events = (req.body && req.body.events) || [];

    // Process each incoming event
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = (event.message.text || "").trim();
        const userId = event.source?.userId || "";

        console.log(`[LINE Webhook] Received message: "${originalText}" from userId: "${userId}"`);

        // Smart match against all orders
        const matchedOrders = smartMatchOrders(originalText, allOrders, userId);

        // Auto-link lineUserId in Firestore and database
        if (matchedOrders.length > 0 && userId) {
          for (const mo of matchedOrders) {
            if (mo.id && mo.lineUserId !== userId) {
              mo.lineUserId = userId;
              mo.updatedAt = Date.now();
              if (fsDbInstance) {
                setDoc(doc(fsDbInstance, "orders", mo.id), { lineUserId: userId, updatedAt: Date.now() }, { merge: true }).catch(() => {});
              }
              if (db.isPostgresActive()) {
                db.saveOrderToDb(mo).catch(() => {});
              }
            }
          }
        }

        let replyMessage = "";

        if (matchedOrders.length > 0) {
          replyMessage = formatCustomerOrdersReport(matchedOrders, baseAppUrl, userId);
        } else {
          // No order found or customer greeting
          const stripped = cleanCustomerQuery(originalText);
          const digits = originalText.replace(/\D/g, "");
          const isSearchAttempt = digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText) || stripped.length >= 2;

          if (isSearchAttempt && (digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText))) {
            replyMessage = formatOrderNotFoundMessage(originalText);
          } else if (process.env.GEMINI_API_KEY) {
            // Use Gemini AI for natural fashion concierge conversation
            try {
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: originalText }] }],
                    systemInstruction: {
                      parts: [
                        {
                          text: `คุณคือผู้ช่วย AI ประจำห้องเสื้อ NUNUH Boutique (ร้านตัดเย็บเสื้อผ้าสตรี ชุดเดรส ชุดราตรี ชุดเจ้าสาว ชุดลูกไม้).
ตอบลูกค้าอย่างสุภาพ อ่อนหวาน ลงท้ายด้วยค่ะ/นะคะ สั้นกระชับ 2-3 ย่อหน้า ใช้ emoji ⚜️✨👗
แจ้งลูกค้าว่าสามารถพิมพ์ "เบอร์โทรศัพท์" หรือ "เลขที่ออเดอร์" หรือ "ชื่อลูกค้า" เพื่อเช็คสถานะชุดสั่งตัด สัดส่วน และกำหนดส่งมอบได้ทันทีตลอด 24 ชั่วโมงค่ะ`
                        }
                      ]
                    }
                  })
                }
              );

              if (geminiRes.ok) {
                const geminiData = await geminiRes.json();
                const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidateText) {
                  replyMessage = candidateText.trim();
                }
              }
            } catch (e) {
              console.error("[LINE Webhook] Gemini AI error:", e);
            }
          }

          if (!replyMessage) {
            replyMessage =
              `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n` +
              `คุณลูกค้าสามารถสอบถามข้อมูลการสั่งตัดชุด หรือพิมพ์ "เบอร์โทรศัพท์", "ชื่อ", หรือ "เลขที่ออเดอร์" เพื่อติดตามสถานะงานตัดเย็บได้ตลอด 24 ชม. เลยนะคะ ✨`;
          }
        }

        // Send reply to LINE Messaging API
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          try {
            const flexObj = matchedOrders.length > 0 ? buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, userId) : null;
            const messagesPayload: any[] = [];
            if (flexObj) {
              messagesPayload.push(flexObj);
            }
            if (replyMessage) {
              messagesPayload.push({ type: "text", text: replyMessage });
            }

            let replyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
              },
              body: JSON.stringify({
                replyToken: replyToken,
                messages: messagesPayload
              })
            });

            // Resilient fallback to pure text if flex fails
            if (!replyRes.ok && flexObj) {
              replyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  replyToken: replyToken,
                  messages: [{ type: "text", text: replyMessage }]
                })
              });
            }

            if (!replyRes.ok) {
              console.error("[LINE Webhook] LINE reply error status:", replyRes.status, await replyRes.text());
            } else {
              console.log(`[LINE Webhook] Reply sent successfully for ${matchedOrders.length} order(s)!`);
            }
          } catch (replyErr) {
            console.error("[LINE Webhook] Error replying to LINE:", replyErr);
          }
        }
      }
    }

    return res.status(200).json({ message: "OK" });
  } catch (err: any) {
    console.error("[LINE Webhook] Handler error:", err);
    return res.status(200).json({ message: "OK" });
  }
}
