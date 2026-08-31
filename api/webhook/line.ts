import type { IncomingMessage, ServerResponse } from "http";
import crypto from "crypto";

// Vercel Serverless Function for LINE Messaging API Webhook
export default async function handler(req: any, res: any) {
  // Allow CORS / preflight if needed
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-line-signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Support GET request for simple browser verification test
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "LINE Webhook endpoint is active and ready for Messaging API events on Vercel.",
      hasToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      hasSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
      hasGemini: Boolean(process.env.GEMINI_API_KEY)
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const signature = (req.headers["x-line-signature"] || req.headers["X-Line-Signature"]) as string;

    const body = req.body || {};
    const events = body.events || [];

    console.log(`[Vercel Webhook] Received LINE request with ${events.length} event(s)`);

    // Verify signature if secret is provided
    if (LINE_CHANNEL_SECRET && signature) {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const hash = crypto
        .createHmac("SHA256", LINE_CHANNEL_SECRET)
        .update(rawBody)
        .digest("base64");

      if (hash !== signature) {
        console.warn("[Vercel Webhook] Signature mismatch warning");
      }
    }

    // Process events asynchronously
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = (event.message.text || "").trim();
        const text = originalText.toLowerCase();

        let replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n📌 วิธีการตรวจสอบสถานะออเดอร์อัตโนมัติ:\n• พิมพ์ เบอร์โทรศัพท์ ที่แจ้งไว้ตอนวัดตัว (เช่น 086-555-1234)\n• หรือพิมพ์ เลขที่ออเดอร์ (เช่น NU-26008)\n\nระบบจะส่งลิงก์ติดตามงานให้ท่านตรวจสอบรายละเอียด สัดส่วน และสถานะชุดได้ทันทีเลยค่ะ ✨`;

        // If Gemini API is available, generate smart reply for non-search greetings
        if (process.env.GEMINI_API_KEY && !/^[0-9-+\s]{6,}$/.test(text) && !text.startsWith("nu-") && !text.startsWith("nn-")) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: originalText }] }],
                systemInstruction: {
                  parts: [{
                    text: `คุณคือผู้ช่วย AI ของร้าน NUNUH Boutique (ร้านตัดเย็บเสื้อผ้าสตรี ชุดเดรส ชุดราตรี ชุดเจ้าสาว). ตอบลูกค้าอย่างสุภาพ อ่อนหวาน ลงท้ายด้วยค่ะ/นะคะ สั้นกระชับ 2-3 ย่อหน้า ใช้ emoji ⚜️✨👗 ตัดเย็บ และบอกลูกค้าว่าสามารถพิมพ์เบอร์โทรศัพท์เพื่อเช็คสถานะงานตัดเย็บได้ตลอด 24 ชม.`
                  }]
                }
              })
            });
            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidateText) {
                replyMessage = candidateText.trim();
              }
            }
          } catch (e) {
            console.error("[Vercel Webhook] Gemini error:", e);
          }
        }

        // Send reply back to LINE
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          try {
            await fetch("https://api.line.me/v2/bot/message/reply", {
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
          } catch (replyErr) {
            console.error("[Vercel Webhook] Error replying to LINE:", replyErr);
          }
        }
      }
    }

    // Always respond 200 OK with { message: "OK" } for LINE Verify
    return res.status(200).json({ message: "OK" });
  } catch (err: any) {
    console.error("[Vercel Webhook] Handler error:", err);
    return res.status(200).json({ message: "OK" });
  }
}
