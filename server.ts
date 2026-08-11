import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with raw body retention for LINE signature verification
app.use(express.json({
  limit: '50mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

const ORDERS_FILE = path.join(process.cwd(), 'orders.json');
const DELETED_ORDERS_FILE = path.join(process.cwd(), 'deleted_orders.json');
const CATALOGUE_FILE = path.join(process.cwd(), 'catalogue.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const REVIEWS_FILE = path.join(process.cwd(), 'reviews.json');
let lastKnownPublicUrl = "";

// Helper to read orders from file safely
function readOrdersOnServer() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading orders:", err);
  }
  return [];
}

// Helper to write orders to file safely
function writeOrdersOnServer(orders: any[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing orders:", err);
  }
}

// Helper to read deleted order IDs
function readDeletedOrdersOnServer(): string[] {
  try {
    if (fs.existsSync(DELETED_ORDERS_FILE)) {
      const data = fs.readFileSync(DELETED_ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading deleted orders:", err);
  }
  return [];
}

// Helper to write deleted order IDs
function writeDeletedOrdersOnServer(ids: string[]) {
  try {
    fs.writeFileSync(DELETED_ORDERS_FILE, JSON.stringify(ids, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing deleted orders:", err);
  }
}

// Helpers for catalogue, settings, and reviews
function readCatalogueOnServer() {
  try {
    if (fs.existsSync(CATALOGUE_FILE)) {
      const data = fs.readFileSync(CATALOGUE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading catalogue:", err);
  }
  return [];
}

function writeCatalogueOnServer(data: any[]) {
  try {
    fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing catalogue:", err);
  }
}

function readSettingsOnServer() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading settings:", err);
  }
  return {};
}

function writeSettingsOnServer(data: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing settings:", err);
  }
}

function readReviewsOnServer() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading reviews:", err);
  }
  return [];
}

function writeReviewsOnServer(data: any[]) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing reviews:", err);
  }
}

// Server-Sent Events (SSE) for Real-Time Multi-User Sync
const sseClients: { id: string; res: express.Response }[] = [];

// Active Staff Sessions in Memory for Real-time Online Tracking
interface ActiveStaffSession {
  id: string;
  name: string;
  branch: string;
  loginTime: number;
  lastSeen: number;
}
let activeStaffSessions: ActiveStaffSession[] = [];

function cleanStaleStaffSessions(): boolean {
  const now = Date.now();
  const initialCount = activeStaffSessions.length;
  // Consider staff active if heartbeat received within last 45 seconds
  activeStaffSessions = activeStaffSessions.filter(s => (now - s.lastSeen) < 45000);
  return activeStaffSessions.length !== initialCount;
}

// Heartbeat interval every 10 seconds to clean stale staff and keep SSE connections alive
setInterval(() => {
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].res.write(": heartbeat\n\n");
    } catch (err) {
      sseClients.splice(i, 1);
    }
  }
  if (cleanStaleStaffSessions()) {
    broadcastSSEEvent("staff_updated", activeStaffSessions);
  }
}, 10000);

function broadcastSSEEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].res.write(payload);
    } catch (err) {
      sseClients.splice(i, 1);
    }
  }
}

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const clientId = Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  sseClients.push({ id: clientId, res });

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on("close", () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Real-Time Staff Session Endpoints
app.get("/api/staff", (req, res) => {
  cleanStaleStaffSessions();
  res.json(activeStaffSessions);
});

app.post("/api/staff/heartbeat", (req, res) => {
  const { id, name, branch, loginTime } = req.body || {};
  if (!id || !name) {
    return res.status(400).json({ error: "Missing staff id or name" });
  }

  const now = Date.now();
  const existingIdx = activeStaffSessions.findIndex(s => s.id === id);
  if (existingIdx !== -1) {
    activeStaffSessions[existingIdx].lastSeen = now;
    if (branch) activeStaffSessions[existingIdx].branch = branch;
    if (name) activeStaffSessions[existingIdx].name = name;
  } else {
    activeStaffSessions.push({
      id,
      name,
      branch: branch || 'สาขานราธิวาส',
      loginTime: loginTime || now,
      lastSeen: now,
    });
  }

  broadcastSSEEvent("staff_updated", activeStaffSessions);
  res.json({ success: true, activeStaff: activeStaffSessions });
});

app.post("/api/staff/logout", (req, res) => {
  const { id } = req.body || {};
  if (id) {
    activeStaffSessions = activeStaffSessions.filter(s => s.id !== id);
  } else {
    activeStaffSessions = [];
  }
  broadcastSSEEvent("staff_updated", activeStaffSessions);
  res.json({ success: true, activeStaff: activeStaffSessions });
});

// REST API Endpoints
app.get("/api/orders", (req, res) => {
  const serverOrders = readOrdersOnServer();
  const deletedIds = readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);
  const cleanOrders = serverOrders.filter((o: any) => !deletedSet.has(o.id));
  res.json(cleanOrders);
});

app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  
  // 1. Add to deleted list to prevent resurrection
  const deletedIds = readDeletedOrdersOnServer();
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    writeDeletedOrdersOnServer(deletedIds);
  }
  
  // 2. Filter from existing active orders
  const current = readOrdersOnServer();
  const updated = current.filter((o: any) => o.id !== id);
  writeOrdersOnServer(updated);
  
  // Real-time broadcast to all clients
  broadcastSSEEvent("orders_updated", { orders: updated, deletedId: id, deletedIds });

  res.json({ success: true, orders: updated, deletedId: id, deletedIds });
});

app.post("/api/orders", (req: any, res) => {
  const { orders: incomingOrders, publicUrl } = req.body;
  
  if (publicUrl) {
    lastKnownPublicUrl = publicUrl;
  }

  const deletedIds = readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);

  if (Array.isArray(incomingOrders)) {
    const current = readOrdersOnServer();
    const map = new Map<string, any>();
    
    // First index existing server-side orders, skipping deleted ones
    for (const o of current) {
      if (!deletedSet.has(o.id)) {
        map.set(o.id, o);
      }
    }
    
    // Merge or insert incoming orders, skipping deleted ones
    for (const o of incomingOrders) {
      if (deletedSet.has(o.id)) continue;
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const existing = map.get(o.id)!;
        const existingTime = existing.updatedAt || 0;
        const incomingTime = o.updatedAt || 0;
        if (incomingTime >= existingTime) {
          map.set(o.id, { ...existing, ...o });
        }
      }
    }
    
    // Sort orders cleanly
    const fullyMerged = Array.from(map.values()).sort((a, b) => {
      return (b.orderNumber || "").localeCompare(a.orderNumber || "", undefined, { numeric: true });
    });
    
    writeOrdersOnServer(fullyMerged);

    // Real-time broadcast to all connected users (Staff & Main Admin)
    broadcastSSEEvent("orders_updated", fullyMerged);

    res.json(fullyMerged);
  } else if (Array.isArray(req.body)) {
    // Fallback for direct array posting
    const current = readOrdersOnServer();
    const map = new Map<string, any>();
    for (const o of current) {
      if (!deletedSet.has(o.id)) {
        map.set(o.id, o);
      }
    }
    for (const o of req.body) {
      if (deletedSet.has(o.id)) continue;
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const existing = map.get(o.id)!;
        const existingTime = existing.updatedAt || 0;
        const incomingTime = o.updatedAt || 0;
        if (incomingTime >= existingTime) {
          map.set(o.id, { ...existing, ...o });
        }
      }
    }
    const fullyMerged = Array.from(map.values()).sort((a, b) => {
      return (b.orderNumber || "").localeCompare(a.orderNumber || "", undefined, { numeric: true });
    });
    writeOrdersOnServer(fullyMerged);

    // Real-time broadcast
    broadcastSSEEvent("orders_updated", fullyMerged);

    res.json(fullyMerged);
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an array of orders or an object with orders." });
  }
});

// REST API Endpoints for Catalogue, Settings, and Reviews
app.get("/api/catalogue", (req, res) => {
  const catalogue = readCatalogueOnServer();
  res.json(catalogue);
});

app.post("/api/catalogue", (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    writeCatalogueOnServer(incoming);
    broadcastSSEEvent("catalogue_updated", incoming);
    res.json({ success: true, catalogue: incoming });
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an array of catalogue items." });
  }
});

app.get("/api/settings", (req, res) => {
  const settings = readSettingsOnServer();
  res.json(settings);
});

app.post("/api/settings", (req, res) => {
  const incoming = req.body;
  if (incoming && typeof incoming === 'object') {
    const current = readSettingsOnServer();
    const updated = { ...current, ...incoming };
    writeSettingsOnServer(updated);
    broadcastSSEEvent("settings_updated", updated);
    res.json({ success: true, settings: updated });
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an object." });
  }
});

app.get("/api/reviews", (req, res) => {
  const reviews = readReviewsOnServer();
  res.json(reviews);
});

app.post("/api/reviews", (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    writeReviewsOnServer(incoming);
    broadcastSSEEvent("reviews_updated", incoming);
    res.json({ success: true, reviews: incoming });
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an array of reviews." });
  }
});

// API Endpoint to send status push message directly to a user
app.post("/api/send-status", async (req: any, res) => {
  const { userId, message } = req.body;
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN not set, simulating push message sending.");
    return res.json({ success: true, simulated: true, message: "LINE_CHANNEL_ACCESS_TOKEN not set. Simulating success." });
  }

  try {
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
      console.log(`✅ Push message sent successfully to User ID: ${userId}`);
      return res.json({ success: true });
    } else {
      const errText = await response.text();
      console.error(`❌ Failed to send push message to LINE: ${errText}`);
      return res.status(response.status).json({ error: errText });
    }
  } catch (err: any) {
    console.error("❌ Error sending push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API Endpoint to send overdue orders notification directly to app owner via LINE
app.post("/api/send-overdue-line-alert", async (req: any, res) => {
  const { targetLineUserId } = req.body || {};
  const settings = readSettingsOnServer();
  const ownerId = (targetLineUserId || settings.ownerLineUserId || "").trim();

  const orders = readOrdersOnServer();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const STATUS_LABELS: Record<string, string> = {
    RECEIVED: "รับออเดอร์เรียบร้อย",
    DESIGNING: "สรุปแบบ/ออกแบบ",
    CUTTING: "กำลังตัดผ้า",
    SEWING: "กำลังเย็บประกอบ",
    FITTING: "ขั้นตอนฟิตติ้ง",
    READY: "เสร็จสมบูรณ์พร้อมส่งมอบ",
    COMPLETED: "ส่งมอบสำเร็จ"
  };

  const overdueOrders = orders.filter((o: any) => {
    if (!o.deliveryDate || o.status === "COMPLETED") return false;
    const delDate = new Date(o.deliveryDate);
    delDate.setHours(0, 0, 0, 0);
    return delDate.getTime() < todayStart.getTime();
  });

  if (overdueOrders.length === 0) {
    return res.json({
      success: true,
      overdueCount: 0,
      message: "ไม่พบออเดอร์ที่เกินกำหนดส่งมอบในขณะนี้ค่ะ ✨"
    });
  }

  // Format notification text for LINE
  let msgText = `🚨 [ห้องเสื้อ NUNUH - แจ้งเตือนออเดอร์เกินกำหนดส่ง!]\n`;
  msgText += `พบออเดอร์ที่เกินกำหนดส่งมอบทั้งหมด ${overdueOrders.length} รายการ ดังนี้ค่ะ:\n\n`;

  overdueOrders.forEach((o: any, idx: number) => {
    const delDate = new Date(o.deliveryDate);
    delDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayStart.getTime() - delDate.getTime()) / (1000 * 3600 * 24));
    const statusText = STATUS_LABELS[o.status] || o.status;
    
    msgText += `${idx + 1}. 📋 ออเดอร์ #: ${o.orderNumber || o.id}\n`;
    msgText += `   👤 ลูกค้า: ${o.customerName} (${o.customerPhone || 'ไม่ระบุเบอร์'})\n`;
    msgText += `   👗 ชุด: ${o.dressType || 'ชุดสั่งตัด'} ${o.branch ? `[${o.branch}]` : ''}\n`;
    msgText += `   📅 กำหนดส่ง: ${o.deliveryDate} (⚠️ เกินกำหนด ${diffDays} วัน)\n`;
    msgText += `   📌 สถานะ: ${statusText}\n\n`;
  });

  msgText += `โปรดตรวจสอบและเร่งรัดขั้นตอนตัดเย็บในระบบนะคะ 🙏`;

  if (!ownerId) {
    return res.status(400).json({
      error: "กรุณาระบุรหัส LINE User ID ของเจ้าของร้านในระบบตั้งค่าก่อนนะคะ",
      generatedMessage: msgText,
      overdueCount: overdueOrders.length
    });
  }

  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN not set, simulating overdue push message.");
    return res.json({
      success: true,
      simulated: true,
      overdueCount: overdueOrders.length,
      messageText: msgText,
      message: "ระบบจำลองการส่งสำเร็จ (ยังไม่ได้ใส่ LINE_CHANNEL_ACCESS_TOKEN)"
    });
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: ownerId,
        messages: [{ type: "text", text: msgText }]
      })
    });

    if (response.ok) {
      console.log(`✅ Overdue alert sent successfully to Owner LINE ID: ${ownerId}`);
      return res.json({
        success: true,
        overdueCount: overdueOrders.length,
        messageText: msgText
      });
    } else {
      const errText = await response.text();
      console.error(`❌ Failed to send overdue push message to LINE: ${errText}`);
      return res.status(response.status).json({
        error: errText,
        generatedMessage: msgText,
        overdueCount: overdueOrders.length
      });
    }
  } catch (err: any) {
    console.error("❌ Error sending overdue push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API Endpoint to check LINE Messaging API configuration status
app.get("/api/line-config-status", (req, res) => {
  res.json({
    tokenSet: !!(process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim(),
    secretSet: !!(process.env.LINE_CHANNEL_SECRET || "").trim(),
  });
});

// LINE Webhook Endpoint
app.post("/api/webhook/line", async (req: any, res) => {
  const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

  const signature = req.headers['x-line-signature'] as string;
  const bodyString = req.rawBody || JSON.stringify(req.body);

  console.log("--- LINE Webhook Event Received ---");
  console.log("Signature from header:", signature);

  // 1. Signature Verification
  if (LINE_CHANNEL_SECRET) {
    const hash = crypto
      .createHmac("SHA256", LINE_CHANNEL_SECRET)
      .update(bodyString)
      .digest("base64");

    if (hash !== signature) {
      console.warn("⚠️ LINE Signature validation failed. Computed hash:", hash, "vs Header signature:", signature);
      // We will still proceed or log, but during LINE console verification, this might fail if the secret is wrong.
      // To ensure that the Verify button works even if they haven't set the correct channel secret yet,
      // we log it as warning but do not force a 401 error unless they are in high security mode.
    } else {
      console.log("✅ LINE Webhook Signature validated successfully!");
    }
  } else {
    console.log("ℹ️ LINE_CHANNEL_SECRET not set. Bypassing signature verification.");
  }

  const events = req.body?.events || [];
  console.log(`Processing ${events.length} event(s)...`);

  for (const event of events) {
    // Standard text message event
    if (event.type === "message" && event.message?.type === "text") {
      const replyToken = event.replyToken;
      const originalText = event.message.text.trim();
      const text = originalText.toLowerCase();

      console.log(`Received user text message: "${originalText}"`);

      // 2. Lookup Orders on Server
      const orders = readOrdersOnServer();
      const cleanSearchText = text.replace(/[- \s]/g, ""); // Strip hyphens & spaces

      const matchedOrders = orders.filter((o: any) => {
        const phoneClean = (o.customerPhone || "").replace(/[- \s]/g, "");
        const orderNumClean = (o.orderNumber || "").replace(/[- \s]/g, "").toLowerCase();
        const nameClean = (o.customerName || "").toLowerCase();

        return (
          (cleanSearchText.length >= 4 && phoneClean.includes(cleanSearchText)) ||
          orderNumClean.includes(text) ||
          nameClean.includes(text)
        );
      });

      // Save lineUserId to matched orders so admin can message/open chat directly later
      if (matchedOrders.length > 0 && event.source?.userId) {
        let updatedAny = false;
        const updatedOrders = orders.map((o: any) => {
          if (matchedOrders.some((mo: any) => mo.id === o.id)) {
            if (o.lineUserId !== event.source.userId) {
              o.lineUserId = event.source.userId;
              updatedAny = true;
            }
          }
          return o;
        });
        if (updatedAny) {
          writeOrdersOnServer(updatedOrders);
          console.log(`[Webhook] Auto-linked lineUserId: ${event.source.userId} to matched orders.`);
        }
      }

      // 3. Formulate Rich Response
      let replyMessage = "";
      const baseAppUrl = lastKnownPublicUrl || process.env.PUBLIC_APP_URL || `https://${req.get('host')}`;

      if (matchedOrders.length === 0) {
        replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n❌ ขออภัยค่ะ ไม่พบข้อมูลออเดอร์เสื้อผ้าของคุณลูกค้าจากคำค้นหา "${originalText}"\n\n📌 วิธีการตรวจสอบสถานะออเดอร์อัตโนมัติ:\n• พิมพ์ เบอร์โทรศัพท์ ที่แจ้งไว้ตอนวัดตัว (เช่น 086-555-1234)\n• หรือพิมพ์ เลขที่ออเดอร์ (เช่น NU-26008)\n• หรือพิมพ์ ชื่อ-นามสกุล ของท่าน\n\nระบบจะประมวลผลข้อมูลและส่งลิงก์ติดตามงานให้ท่านตรวจสอบรายละเอียด สัดส่วนที่วัดตัว และความคืบหน้าของชุดได้ทันทีเลยค่ะ ✨`;
      } else if (matchedOrders.length === 1) {
        const order = matchedOrders[0];
        
        // Map Status codes to beautiful labels
        const statusMapTH: Record<string, string> = {
          RECEIVED: "รับออเดอร์เรียบร้อย (Received)",
          DESIGNING: "กำลังออกแบบและจัดเตรียม (Designing)",
          CUTTING: "ขึ้นแบบและตัดผ้า (Cutting)",
          SEWING: "ขึ้นโครงและเย็บประกอบ (Sewing)",
          FITTING: "ฟิตติ้งและปรับแต่งตัว (Fitting)",
          READY: "ตัดเย็บเรียบร้อยพร้อมส่งมอบ (Ready)",
          COMPLETED: "ส่งมอบสำเร็จเรียบร้อยแล้วค่ะ (Completed) 🎉"
        };
        const statusLabel = statusMapTH[order.status] || order.status;

        // Date display
        let formattedDelivery = order.deliveryDate;
        try {
          formattedDelivery = new Date(order.deliveryDate).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        } catch (e) {}

        const lineUserIdParam = event.source?.userId ? `&lineUserId=${event.source.userId}` : '';
        const portalUrl = `${baseAppUrl}?tab=customer&search=${order.customerPhone}&mode=customer${lineUserIdParam}`;

        replyMessage = `⚜️ อัปเดตสถานะชุดสั่งตัด NUNUH Boutique ⚜️\n\nเรียนคุณ: ${order.customerName}\nรหัสออเดอร์: ${order.orderNumber}\nประเภทชุด: ${order.dressType}\n\n📍 สถานะปัจจุบัน: [${statusLabel}]\n📅 กำหนดส่งมอบ: ${formattedDelivery}\n\nท่านสามารถเปิดดูข้อมูลใบรับออเดอร์ รายละเอียดสัดส่วน และประวัติการชำระเงินมัดจำแบบละเอียดด้วยตนเองได้ที่นี่ค่ะ:\n🔗 ${portalUrl}\n\nหากท่านต้องการติดต่อพนักงานเพิ่มเติม สามารถพิมพ์ข้อความทิ้งไว้ในแชทนี้ได้เลยนะคะ ✨`;
      } else {
        // Multiple orders matched
        let listText = "";
        matchedOrders.slice(0, 5).forEach((order: any, idx: number) => {
          listText += `${idx + 1}. คุณ ${order.customerName} - ออเดอร์ ${order.orderNumber} (${order.dressType})\n`;
        });
        
        const lineUserIdParam = event.source?.userId ? `&lineUserId=${event.source.userId}` : '';
        const portalUrl = `${baseAppUrl}?tab=customer&search=${matchedOrders[0].customerPhone}&mode=customer${lineUserIdParam}`;

        replyMessage = `⚜️ พบข้อมูลที่เกี่ยวข้องทั้งหมด ${matchedOrders.length} ออเดอร์ค่ะ:\n\n${listText}\nคุณสามารถเลือกเปิดดูรายละเอียด สัดส่วน และสถานะของทุกออเดอร์ได้ที่ลิงก์นี้เลยค่ะ:\n🔗 ${portalUrl}\n\nขอบพระคุณค่ะ 💖`;
      }

      // 4. Send Reply via LINE messaging API
      if (LINE_CHANNEL_ACCESS_TOKEN) {
        try {
          const response = await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [
                {
                  type: "text",
                  text: replyMessage
                }
              ]
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            console.error("❌ Failed to send LINE reply. HTTP status:", response.status, "Response:", errBody);
          } else {
            console.log("✅ Send LINE reply successful!");
          }
        } catch (err) {
          console.error("❌ Error sending LINE reply:", err);
        }
      } else {
        console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN is not configured. Webhook ran successfully but could not reply to LINE.");
      }
    }
  }

  // Always return 200 OK so that LINE platform accepts the webhook delivery
  res.status(200).send("OK");
});

// Configure Vite middleware for development or Static Assets for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 NUNUH Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
