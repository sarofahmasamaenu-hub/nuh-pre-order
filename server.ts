import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  initDb,
  isPostgresActive,
  getOrdersFromDb,
  saveOrderToDb,
  saveMultipleOrdersToDb,
  deleteOrderInDb,
  getDeletedOrderIdsFromDb,
  getCatalogueFromDb,
  saveCatalogueToDb,
  getSettingsFromDb,
  saveSettingsToDb,
  getReviewsFromDb,
  saveReviewsToDb
} from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Lazy initialization for Gemini AI SDK
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// Function to generate intelligent fashion and boutique reply using Gemini 3.7 Flash
async function generateAiFashionReply(userMessage: string, customerName?: string): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    return `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n📌 วิธีการตรวจสอบสถานะออเดอร์อัตโนมัติ:\n• พิมพ์ เบอร์โทรศัพท์ ที่แจ้งไว้ตอนวัดตัว (เช่น 086-555-1234)\n• หรือพิมพ์ เลขที่ออเดอร์ (เช่น NU-26008)\n• หรือพิมพ์ ชื่อ-นามสกุล ของท่าน\n\nระบบจะส่งลิงก์ติดตามสถานะชุด สัดส่วน และคิวตัดเย็บให้ทันทีค่ะ ✨`;
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userMessage,
      config: {
        systemInstruction: `คุณคือผู้ช่วย AI อัจฉริยะประจำร้าน "NUNUH Boutique" (นูเหนาะห์ บูทีค - ร้านตัดเย็บเสื้อผ้าสตรี ชุดเดรส ชุดราตรี ชุดเจ้าสาว ชุดลูกไม้ และชุดออกงานพรีเมียม).
หน้าที่ของคุณ:
1. ตอบคำถามลูกค้าใน LINE อย่างสุภาพ ไพเราะ อ่อนหวาน เป็นกันเอง ใช้น้ำเสียงแบบพนักงานห้องเสื้อชั้นนำ (ลงท้ายด้วยค่ะ/นะคะ)
2. แนะนำแบบชุด สีผ้า ทรงกระโปรง การเลือกผ้าลูกไม้ การดูแลรักษาชุดสั่งตัด หรือการเตรียมตัวก่อนมาวัดตัวที่ร้าน
3. หากลูกค้าต้องการเช็คออเดอร์ตัดเย็บ ให้แจ้งอย่างนุ่มนวลว่า "คุณลูกค้าสามารถพิมพ์เบอร์โทรศัพท์ หรือเลขที่ออเดอร์ เข้ามาในแชทนี้ได้เลยนะคะ ระบบจะค้นหาข้อมูลให้อัตโนมัติทันทีค่ะ"
4. ข้อความต้องกระชับ อ่านง่ายบนหน้าจอมือถือ (ประมาณ 2-4 ย่อหน้า ไม่ยาวเกินไป) ใช้ emoji สไตล์พรีเมียม เช่น ⚜️ ✨ 👗 ✂️ 💖 ได้อย่างเหมาะสม`,
      },
    });

    return response.text?.trim() || "สวัสดีค่ะ NUNUH Boutique ยินดีต้อนรับค่ะ สอบถามรายละเอียดการสั่งตัดชุด หรือพิมพ์เบอร์โทรศัพท์เพื่อติดตามออเดอร์ได้เลยนะคะ ✨";
  } catch (err) {
    console.error("Gemini AI generation error:", err);
    return `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n📌 คุณลูกค้าสามารถพิมพ์เบอร์โทรศัพท์ หรือเลขที่ออเดอร์เข้ามาเพื่อติดตามสถานะชุดสั่งตัดได้ทันทีเลยนะคะ ✨`;
  }
}

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

const STATUS_MAP_TH: Record<string, { label: string; desc: string }> = {
  RECEIVED: { label: "1. รับออเดอร์เรียบร้อย", desc: "บันทึกข้อมูลและสัดส่วนเข้าระบบเรียบร้อยแล้ว" },
  DESIGNING: { label: "2. สรุปแบบ/เตรียมผ้า", desc: "วางแพทเทิร์น ออกแบบ และเตรียมผ้าตัดเย็บ" },
  FABRIC_ORDERED: { label: "สั่งผ้า/อะไหล่", desc: "อยู่ระหว่างรอผ้าหรืออุปกรณ์สั่งพิเศษ" },
  FABRIC_RECEIVED: { label: "ได้รับผ้าแล้ว", desc: "ผ้าและอุปกรณ์จัดเตรียมครบถ้วน พร้อมขึ้นแบบ" },
  PATTERN_MAKING: { label: "สร้างแพทเทิร์น", desc: "สร้างแบบแพทเทิร์นตามสัดส่วนเฉพาะบุคคล" },
  CUTTING: { label: "3. ขึ้นแบบและตัดผ้า", desc: "ช่างตัดผ้าตามแพทเทิร์นเรียบร้อยแล้ว" },
  SEWING: { label: "4. กำลังเย็บประกอบ", desc: "ช่างกำลังเย็บขึ้นโครงชุดและเก็บรายละเอียด" },
  PATTERN_SEWING: { label: "ทำแพทเทิร์น/ตัดเย็บ", desc: "กำลังสร้างแพทเทิร์นและเย็บประกอบชุด" },
  FIRST_FITTING_READY: { label: "พร้อมลองโครงชุด", desc: "โครงชุดพร้อมสำหรับการลองโครงครั้งที่ 1" },
  FIRST_FITTING_DONE: { label: "ลองโครงเรียบร้อย", desc: "ปรับแก้สัดส่วนตามผลการลองโครงชุด" },
  SECOND_FITTING_READY: { label: "พร้อมลองเก็บทรง", desc: "ชุดพร้อมสำหรับการลองเก็บทรงครั้งที่ 2" },
  SECOND_FITTING_DONE: { label: "ลองเก็บทรงเรียบร้อย", desc: "ปรับแต่งสัดส่วนรอบสุดท้ายก่อนเก็บรายละเอียด" },
  EMBROIDERY: { label: "งานปัก/ลูกไม้", desc: "อยู่ระหว่างงานปัก ประดับคริสตัล หรือติดลูกไม้" },
  HAND_FINISHING: { label: "สอยมือ/เก็บริม", desc: "เก็บรายละเอียดด้วยมือและงานฝีมือประณีต" },
  FITTING: { label: "5. ขั้นตอนฟิตติ้ง", desc: "นัดหมายลองชุดและปรับแต่งทรงตามรูปร่าง" },
  ALTERING: { label: "ปรับแก้ทรง", desc: "ช่างกำลังปรับแก้สัดส่วนตามที่นัดฟิตติ้ง" },
  VERIFY_DETAILS: { label: "ตรวจสอบรายละเอียด", desc: "ตรวจสอบความถูกต้องของแบบชุดและสัดส่วน" },
  QUALITY_CHECK: { label: "ตรวจเช็กคุณภาพ (QC)", desc: "ตรวจสอบความประณีตของตะเข็บ ซิป และทรงชุด" },
  IRONING_PACKING: { label: "รีดอัดและแพ็กชุด", desc: "รีดไอน้ำจัดทรงชุดและแพ็กใส่ถุงคลุมเสื้อผ้า" },
  READY: { label: "6. พร้อมส่งมอบ/รับชุด", desc: "ชุดตัดเย็บเสร็จสมบูรณ์ 100% พร้อมนัดรับชุดหรือจัดส่ง" },
  SHIPPED: { label: "จัดส่งพัสดุแล้ว", desc: "จัดส่งผ่านบริษัทขนส่งเรียบร้อยแล้ว" },
  DELIVERED: { label: "พัสดุถึงผู้รับแล้ว", desc: "พัสดุจัดส่งถึงลูกค้าเรียบร้อยแล้ว" },
  COMPLETED: { label: "7. ส่งมอบสำเร็จ 🎉", desc: "ลูกค้าตรวจรับชุดและเซ็นรับมอบเรียบร้อยแล้ว" },
  CANCELLED: { label: "ยกเลิกออเดอร์", desc: "รายการออเดอร์นี้ถูกยกเลิก" }
};

// Helper to read orders from PostgreSQL with fallback to file
async function readOrdersOnServer(): Promise<any[]> {
  if (isPostgresActive()) {
    try {
      const dbOrders = await getOrdersFromDb();
      if (dbOrders && dbOrders.length > 0) {
        return dbOrders;
      }
    } catch (e) {
      console.error("Error reading orders from DB:", e);
    }
  }

  // Fallback to local file
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading orders from file:", err);
  }
  return [];
}

// Helper to write orders to PostgreSQL and file safely
async function writeOrdersOnServer(orders: any[]) {
  if (isPostgresActive()) {
    try {
      await saveMultipleOrdersToDb(orders);
    } catch (e) {
      console.error("Error writing orders to DB:", e);
    }
  }

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing orders to file:", err);
  }
}

// Helper to read deleted order IDs
async function readDeletedOrdersOnServer(): Promise<string[]> {
  if (isPostgresActive()) {
    try {
      const dbDeleted = await getDeletedOrderIdsFromDb();
      if (dbDeleted && dbDeleted.length > 0) {
        return dbDeleted;
      }
    } catch (e) {
      console.error("Error reading deleted orders from DB:", e);
    }
  }

  try {
    if (fs.existsSync(DELETED_ORDERS_FILE)) {
      const data = fs.readFileSync(DELETED_ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading deleted orders from file:", err);
  }
  return [];
}

// Helper to write deleted order IDs
async function writeDeletedOrdersOnServer(ids: string[], newDeletedId?: string) {
  if (isPostgresActive() && newDeletedId) {
    try {
      await deleteOrderInDb(newDeletedId);
    } catch (e) {
      console.error("Error deleting order in DB:", e);
    }
  }

  try {
    fs.writeFileSync(DELETED_ORDERS_FILE, JSON.stringify(ids, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing deleted orders to file:", err);
  }
}

// Helpers for catalogue, settings, and reviews
async function readCatalogueOnServer(): Promise<any[]> {
  if (isPostgresActive()) {
    try {
      const dbCat = await getCatalogueFromDb();
      if (dbCat && dbCat.length > 0) {
        return dbCat;
      }
    } catch (e) {
      console.error("Error reading catalogue from DB:", e);
    }
  }

  try {
    if (fs.existsSync(CATALOGUE_FILE)) {
      const data = fs.readFileSync(CATALOGUE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading catalogue from file:", err);
  }
  return [];
}

async function writeCatalogueOnServer(data: any[]) {
  if (isPostgresActive()) {
    try {
      await saveCatalogueToDb(data);
    } catch (e) {
      console.error("Error writing catalogue to DB:", e);
    }
  }

  try {
    fs.writeFileSync(CATALOGUE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing catalogue to file:", err);
  }
}

async function readSettingsOnServer(): Promise<any> {
  if (isPostgresActive()) {
    try {
      const dbSettings = await getSettingsFromDb();
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        return dbSettings;
      }
    } catch (e) {
      console.error("Error reading settings from DB:", e);
    }
  }

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading settings from file:", err);
  }
  return {};
}

async function writeSettingsOnServer(data: any) {
  if (isPostgresActive()) {
    try {
      await saveSettingsToDb(data);
    } catch (e) {
      console.error("Error writing settings to DB:", e);
    }
  }

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing settings to file:", err);
  }
}

async function readReviewsOnServer(): Promise<any[]> {
  if (isPostgresActive()) {
    try {
      const dbReviews = await getReviewsFromDb();
      if (dbReviews && dbReviews.length > 0) {
        return dbReviews;
      }
    } catch (e) {
      console.error("Error reading reviews from DB:", e);
    }
  }

  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading reviews from file:", err);
  }
  return [];
}

async function writeReviewsOnServer(data: any[]) {
  if (isPostgresActive()) {
    try {
      await saveReviewsToDb(data);
    } catch (e) {
      console.error("Error writing reviews to DB:", e);
    }
  }

  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing reviews to file:", err);
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

// Database Status Endpoint
app.get("/api/db-status", (req, res) => {
  res.json({
    postgresActive: isPostgresActive(),
    mode: isPostgresActive() ? "PostgreSQL (Cloud Database)" : "Local Persistent JSON File Mode",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
  });
});

// REST API Endpoints
app.get("/api/orders", async (req, res) => {
  const serverOrders = await readOrdersOnServer();
  const deletedIds = await readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);
  const cleanOrders = serverOrders.filter((o: any) => !deletedSet.has(o.id));
  res.json(cleanOrders);
});

app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  
  // 1. Add to deleted list to prevent resurrection
  const deletedIds = await readDeletedOrdersOnServer();
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await writeDeletedOrdersOnServer(deletedIds, id);
  }
  
  // 2. Filter from existing active orders
  const current = await readOrdersOnServer();
  const updated = current.filter((o: any) => o.id !== id);
  await writeOrdersOnServer(updated);
  
  // Real-time broadcast to all clients
  broadcastSSEEvent("orders_updated", { orders: updated, deletedId: id, deletedIds });

  res.json({ success: true, orders: updated, deletedId: id, deletedIds });
});

app.post("/api/orders", async (req: any, res) => {
  const { orders: incomingOrders, publicUrl } = req.body;
  
  if (publicUrl) {
    lastKnownPublicUrl = publicUrl;
  }

  const deletedIds = await readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);

  if (Array.isArray(incomingOrders)) {
    const current = await readOrdersOnServer();
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
    
    await writeOrdersOnServer(fullyMerged);

    // Real-time broadcast to all connected users (Staff & Main Admin)
    broadcastSSEEvent("orders_updated", fullyMerged);

    res.json(fullyMerged);
  } else if (Array.isArray(req.body)) {
    // Fallback for direct array posting
    const current = await readOrdersOnServer();
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
    await writeOrdersOnServer(fullyMerged);

    // Real-time broadcast
    broadcastSSEEvent("orders_updated", fullyMerged);

    res.json(fullyMerged);
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an array of orders or an object with orders." });
  }
});

// REST API Endpoints for Catalogue, Settings, and Reviews
app.get("/api/catalogue", async (req, res) => {
  const catalogue = await readCatalogueOnServer();
  res.json(catalogue);
});

app.post("/api/catalogue", async (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    await writeCatalogueOnServer(incoming);
    broadcastSSEEvent("catalogue_updated", incoming);
    res.json({ success: true, catalogue: incoming });
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an array of catalogue items." });
  }
});

app.get("/api/settings", async (req, res) => {
  const settings = await readSettingsOnServer();
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  const incoming = req.body;
  if (incoming && typeof incoming === 'object') {
    const current = await readSettingsOnServer();
    const updated = { ...current, ...incoming };
    await writeSettingsOnServer(updated);
    broadcastSSEEvent("settings_updated", updated);
    res.json({ success: true, settings: updated });
  } else {
    res.status(400).json({ error: "Invalid data format. Expected an object." });
  }
});

app.get("/api/reviews", async (req, res) => {
  const reviews = await readReviewsOnServer();
  res.json(reviews);
});

app.post("/api/reviews", async (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    await writeReviewsOnServer(incoming);
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
  const settings = await readSettingsOnServer();
  const ownerId = (targetLineUserId || settings.ownerLineUserId || "").trim();

  const orders = await readOrdersOnServer();
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

// LINE Webhook Endpoint (Supports GET for browser status check & POST for LINE Messaging API Events & Verification)
app.get(["/api/webhook/line", "/webhook/line", "/api/line/webhook", "/api/line-webhook"], (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "LINE Webhook endpoint is active and ready for Messaging API events.",
    hasToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasSecret: Boolean(process.env.LINE_CHANNEL_SECRET)
  });
});

app.post(["/api/webhook/line", "/webhook/line", "/api/line/webhook", "/api/line-webhook"], async (req: any, res) => {
  try {
    const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

    const signature = req.headers['x-line-signature'] as string;
    const bodyString = req.rawBody || JSON.stringify(req.body);

    console.log("--- LINE Webhook Event Received ---");
    if (signature) {
      console.log("Signature from header:", signature);
    }

    // 1. Signature Verification (if LINE_CHANNEL_SECRET is configured)
    if (LINE_CHANNEL_SECRET && signature) {
      const hash = crypto
        .createHmac("SHA256", LINE_CHANNEL_SECRET)
        .update(bodyString)
        .digest("base64");

      if (hash !== signature) {
        console.warn("⚠️ LINE Signature mismatch. Computed hash:", hash, "vs Header signature:", signature);
      } else {
        console.log("✅ LINE Webhook Signature validated successfully!");
      }
    }

    const events = req.body?.events || [];
    console.log(`Processing ${events.length} event(s)...`);

    // Handle incoming events asynchronously
    for (const event of events) {
      // Standard text message event
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = event.message.text.trim();
        const text = originalText.toLowerCase();

        console.log(`Received user text message: "${originalText}"`);

        // Lookup Orders on Server
        const orders = await readOrdersOnServer();
        const cleanSearchText = text.replace(/[- \s\t\n]/g, ""); // Strip hyphens & spaces

        // Extract phone numbers or order numbers from incoming text
        const phoneMatch = originalText.match(/0\d{8,9}/);
        const orderNumMatch = originalText.match(/NU-?\d{4,6}/i);
        const extractedPhone = phoneMatch ? phoneMatch[0] : "";
        const extractedOrderNum = orderNumMatch ? orderNumMatch[0].replace(/-/g, "").toLowerCase() : "";

        // Normalize text by removing common Thai titles/prefixes (e.g. คุณ, นาง, น.ส., นางสาว, ด.ญ., ด.ช., พี่, น้อง)
        const strippedTitleText = text.replace(/^(คุณ|นางสาว|น\.ส\.|นาง|นาย|ด\.ญ\.|ด\.ช\.|พี่|น้อง)\s*/i, "").trim();
        const cleanStrippedTitle = strippedTitleText.replace(/[- \s\t\n]/g, "");

        const matchedOrders = orders.filter((o: any) => {
          if (!o) return false;
          const phoneClean = (o.customerPhone || "").replace(/[- \s]/g, "");
          const orderNumClean = (o.orderNumber || "").replace(/[- \s]/g, "").toLowerCase();
          const nameClean = (o.customerName || "").toLowerCase();
          const nameCleanNoTitle = nameClean.replace(/^(คุณ|นางสาว|น\.ส\.|นาง|นาย|ด\.ญ\.|ด\.ช\.|พี่|น้อง)\s*/i, "").trim();
          const nameNoSpaces = nameCleanNoTitle.replace(/[- \s\t\n]/g, "");
          const nicknameClean = (o.customerNickname || "").toLowerCase();
          const lineUid = (o.lineUserId || "").toLowerCase();

          // Phone matching
          const matchesPhone = extractedPhone && phoneClean.includes(extractedPhone);
          const matchesCleanSearchPhone = cleanSearchText.length >= 4 && phoneClean.includes(cleanSearchText);
          
          // Order number matching
          const matchesExtractedOrder = extractedOrderNum && orderNumClean.includes(extractedOrderNum);
          const matchesCleanSearchOrder = cleanSearchText.length >= 3 && orderNumClean.includes(cleanSearchText);
          
          // Direct name matching
          const matchesDirectName = nameClean.includes(text) || (nameCleanNoTitle && nameCleanNoTitle.includes(strippedTitleText));
          const matchesNickname = (nicknameClean && (nicknameClean.includes(text) || nicknameClean.includes(strippedTitleText) || text.includes(nicknameClean)));
          const matchesNoSpaceName = cleanStrippedTitle.length >= 2 && nameNoSpaces.includes(cleanStrippedTitle);
          
          // Word tokens matching (e.g. first name or last name match)
          const words = text.split(/\s+/).filter((w: string) => w.length >= 2);
          const matchesNameWords = words.length > 0 && words.some((w: string) => 
            nameClean.includes(w) || 
            nameCleanNoTitle.includes(w) || 
            (nicknameClean && nicknameClean.includes(w))
          );
          
          // Line user ID matching
          const matchesLineUid = event.source?.userId && lineUid === event.source.userId.toLowerCase();

          return (
            matchesPhone ||
            matchesCleanSearchPhone ||
            matchesExtractedOrder ||
            matchesCleanSearchOrder ||
            matchesDirectName ||
            matchesNickname ||
            matchesNoSpaceName ||
            matchesNameWords ||
            matchesLineUid
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
            await writeOrdersOnServer(updatedOrders);
            console.log(`[Webhook] Auto-linked lineUserId: ${event.source.userId} to matched orders.`);
          }
        }

        // Formulate Rich Response
        let replyMessage = "";
        const baseAppUrl = lastKnownPublicUrl || process.env.PUBLIC_APP_URL || `https://${req.get('host')}`;

        if (matchedOrders.length === 0) {
          const isLikelySearchQuery = /^(\+?66|0)[0-9]{8,9}$/.test(cleanSearchText) || /^[A-Za-z0-9_-]{4,15}$/.test(cleanSearchText);
          
          if (isLikelySearchQuery && cleanSearchText.length >= 6) {
            replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n❌ ขออภัยค่ะ ไม่พบข้อมูลออเดอร์เสื้อผ้าของคุณลูกค้าจากคำค้นหา "${originalText}"\n\n📌 วิธีการตรวจสอบสถานะออเดอร์อัตโนมัติ:\n• พิมพ์ เบอร์โทรศัพท์ ที่แจ้งไว้ตอนวัดตัว (เช่น 086-555-1234)\n• หรือพิมพ์ เลขที่ออเดอร์ (เช่น NU-26008)\n• หรือพิมพ์ ชื่อ-นามสกุล ของท่าน\n\nระบบจะประมวลผลข้อมูลและส่งลิงก์ติดตามงานให้ท่านตรวจสอบรายละเอียด สัดส่วนที่วัดตัว และความคืบหน้าของชุดได้ทันทีเลยค่ะ ✨`;
          } else {
            // Intelligent conversation / advice powered by Gemini AI
            try {
              replyMessage = await generateAiFashionReply(originalText);
            } catch (e) {
              replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\nคุณลูกค้าสามารถสอบถามข้อมูลการสั่งตัดชุด หรือพิมพ์เบอร์โทรศัพท์/เลขที่ออเดอร์ เพื่อติดตามสถานะงานตัดเย็บได้ตลอด 24 ชม. เลยนะคะ ✨`;
            }
          }
        } else if (matchedOrders.length === 1) {
          const order = matchedOrders[0];
          const stCfg = STATUS_MAP_TH[order.status] || { label: order.status, desc: "กำลังดำเนินการ" };

          // Date display
          let formattedDelivery = order.deliveryDate || "-";
          try {
            formattedDelivery = new Date(order.deliveryDate).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          } catch (e) {}

          const price = Number(order.price || 0);
          const deposit = Number(order.deposit || 0);
          const discount = Number(order.discount || 0);
          const finalPaid = Number(order.finalPaymentAmount || 0);
          const unpaid = Math.max(0, price - deposit - discount - finalPaid);

          const lineUserIdParam = event.source?.userId ? `&lineUserId=${event.source.userId}` : '';
          const portalUrl = `${baseAppUrl}/?mode=customer&search=${encodeURIComponent(order.customerPhone || order.orderNumber)}${lineUserIdParam}`;

          replyMessage = `⚜️ อัปเดตสถานะชุดสั่งตัด NUNUH Boutique ⚜️\n\n` +
            `👤 เรียนคุณ: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}\n` +
            `🧾 รหัสออเดอร์: ${order.orderNumber}\n` +
            `👗 แบบชุด: ${order.dressType}\n` +
            `🧵 ชนิดผ้า: ${order.fabricType || "ตามที่ระบุ"} (${order.fabricColor || "-"})\n\n` +
            `📍 สถานะปัจจุบัน: [${stCfg.label}]\n` +
            `ℹ️ รายละเอียด: "${stCfg.desc}"\n` +
            `📅 วันที่อัปเดตสถานะ: ${order.statusDate || order.orderDate || "-"}\n` +
            `⏳ กำหนดส่งมอบ: ${formattedDelivery}\n\n` +
            `💰 ข้อมูลยอดเงิน:\n` +
            `• ราคารวม: ${price.toLocaleString()} บาท\n` +
            `• มัดจำแล้ว: ${deposit.toLocaleString()} บาท\n` +
            (unpaid === 0 ? `• สถานะชำระ: ชำระครบถ้วนแล้ว ✓\n\n` : `• ยอดคงเหลือวันรับชุด: ${unpaid.toLocaleString()} บาท\n\n`) +
            `🔗 ตรวจสอบรายละเอียด สัดส่วน และติดตามงานตัดเย็บด้วยตนเองได้ที่นี่ค่ะ:\n` +
            `${portalUrl}\n\n` +
            `หากท่านต้องการสอบถามข้อมูลเพิ่มเติม สามารถพิมพ์ข้อความทิ้งไว้ในแชทนี้ได้เลยนะคะ ✨`;
        } else {
          // Multiple orders matched
          let listText = "";
          matchedOrders.slice(0, 5).forEach((order: any, idx: number) => {
            const stCfg = STATUS_MAP_TH[order.status] || { label: order.status, desc: "" };
            listText += `${idx + 1}. ออเดอร์ ${order.orderNumber} (${order.dressType})\n   📍 สถานะ: [${stCfg.label || order.status}]\n`;
          });
          
          const lineUserIdParam = event.source?.userId ? `&lineUserId=${event.source.userId}` : '';
          const portalUrl = `${baseAppUrl}/?mode=customer&search=${encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber)}${lineUserIdParam}`;

          replyMessage = `⚜️ พบรายการสั่งตัดของคุณทั้งหมด ${matchedOrders.length} ออเดอร์ค่ะ:\n\n${listText}\n` +
            `🔗 เปิดดูรายละเอียด สัดส่วน และสถานะทุกออเดอร์ได้ที่ลิงก์นี้เลยค่ะ:\n` +
            `${portalUrl}\n\n` +
            `ขอบพระคุณที่ไว้วางใจ NUNUH Boutique ค่ะ 💖`;
        }

        // Send Reply via LINE messaging API
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
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
        }
      }
    }

    // Return 200 OK with JSON { message: "OK" } for LINE Developer verification & normal delivery
    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("❌ Error in LINE Webhook handler:", error);
    // Return 200 OK anyway to prevent LINE Webhook disablement
    return res.status(200).json({ message: "OK" });
  }
});

// Direct AI Assistant API endpoint for web client or testing
app.post("/api/chat/gemini", async (req, res) => {
  try {
    const { message, customerName } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }
    const reply = await generateAiFashionReply(message, customerName);
    return res.json({ reply, success: true });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Configure Vite middleware for development or Static Assets for production
async function startServer() {
  // Initialize PostgreSQL tables if DATABASE_URL is available
  await initDb();

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
