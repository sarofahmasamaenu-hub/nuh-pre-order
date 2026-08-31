import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { userId, message } = req.body || {};
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

    if (!userId) {
      return res.status(400).json({ error: "userId (LINE User ID) is required" });
    }
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.warn("[Vercel API] LINE_CHANNEL_ACCESS_TOKEN not set, simulating push message sending.");
      return res.status(200).json({
        success: true,
        simulated: true,
        message: "LINE_CHANNEL_ACCESS_TOKEN not set on server. Simulating success."
      });
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      })
    });

    if (response.ok) {
      console.log(`[Vercel API] Push message sent successfully to ${userId}`);
      return res.status(200).json({ success: true });
    } else {
      const errText = await response.text();
      console.error(`[Vercel API] Failed to send push message to LINE: ${errText}`);
      return res.status(response.status).json({ error: errText });
    }
  } catch (err: any) {
    console.error("[Vercel API] Error sending push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
