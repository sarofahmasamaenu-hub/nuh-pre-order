import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp as initFirebaseApp, getApps as getFirebaseApps, getApp as getFirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
  getDocs
} from "firebase/firestore";
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
import {
  smartMatchOrders,
  formatSingleOrderLineMessage,
  formatMultipleOrdersLineMessage,
  formatCustomerOrdersReport,
  buildOrdersLineFlexMessage,
  formatOrderNotFoundMessage,
  formatNewOrderCustomerConfirmation,
  formatNewOrderOwnerAlert,
  STATUS_MAP_TH,
  getStatusDetails
} from "./src/utils/lineMatcher";

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

// In-memory caches for fast access and resilience against disk write glitches
let cachedOrders: any[] | null = null;
let cachedDeletedOrders: string[] | null = null;
let cachedCatalogue: any[] | null = null;
let cachedSettings: any | null = null;
let cachedReviews: any[] | null = null;

// Safe Atomic JSON File Write: Writes to a unique temp file first, then renames atomically
function safeAtomicWriteJson(filePath: string, data: any): boolean {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  const backupPath = `${filePath}.bak`;
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonString, 'utf8');
    fs.renameSync(tempPath, filePath);
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch (_) {}
    return true;
  } catch (err) {
    console.error(`❌ Error writing to file ${filePath}:`, err);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
    return false;
  }
}

// Resilient JSON File Read with Backup and Soft Recovery
function safeResilientReadJson<T>(filePath: string, fallback: T): T {
  const backupPath = `${filePath}.bak`;
  
  // 1. Try reading primary file
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (raw && raw.trim()) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`⚠️ Warning: primary JSON file ${filePath} parse failed, trying backup:`, (err as any)?.message || err);
    }
  }

  // 2. Try reading backup file
  if (fs.existsSync(backupPath)) {
    try {
      const rawBak = fs.readFileSync(backupPath, 'utf8');
      if (rawBak && rawBak.trim()) {
        const parsed = JSON.parse(rawBak);
        console.log(`✅ Successfully recovered ${filePath} from backup file.`);
        // Restore primary from valid backup
        safeAtomicWriteJson(filePath, parsed);
        return parsed;
      }
    } catch (bakErr) {
      console.error(`❌ Backup file ${backupPath} also unreadable:`, bakErr);
    }
  }

  return fallback;
}

const firebaseConfig = {
  apiKey: "AIzaSyDbt86w9Tl3HTlmlQwr4P7StoBKyEC56vc",
  authDomain: "nuhpre-order.firebaseapp.com",
  projectId: "nuhpre-order",
  storageBucket: "nuhpre-order.firebasestorage.app",
  messagingSenderId: "81774640286",
  appId: "1:81774640286:web:e596d6d5bb638d11380f8f",
  measurementId: "G-YNVY3Y03PY"
};

let firestoreDb: any = null;
function getFirestoreDb() {
  if (!firestoreDb) {
    try {
      const fbApp = getFirebaseApps().length > 0 ? getFirebaseApp() : initFirebaseApp(firebaseConfig);
      firestoreDb = getFirestore(fbApp);
    } catch (e) {
      console.warn("Failed to initialize Firebase in server:", e);
    }
  }
  return firestoreDb;
}

// Helper to read deleted order IDs
async function readDeletedOrdersOnServer(): Promise<string[]> {
  if (isPostgresActive()) {
    try {
      const dbDeleted = await getDeletedOrderIdsFromDb();
      if (dbDeleted && dbDeleted.length > 0) {
        cachedDeletedOrders = dbDeleted;
        return dbDeleted;
      }
    } catch (e) {
      console.error("Error reading deleted orders from DB:", e);
    }
  }

  try {
    const fileDeleted = safeResilientReadJson<string[]>(DELETED_ORDERS_FILE, cachedDeletedOrders || []);
    if (fileDeleted && Array.isArray(fileDeleted)) {
      cachedDeletedOrders = fileDeleted;
      return fileDeleted;
    }
  } catch (err) {
    console.error("Error reading deleted orders from file:", err);
  }

  return cachedDeletedOrders || [];
}

// Helper to read orders from Firestore with fallback to PostgreSQL, cache and file
async function readOrdersOnServer(): Promise<any[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "orders"));
      if (!snap.empty) {
        const firestoreOrders: any[] = [];
        const deletedIds = await readDeletedOrdersOnServer();
        const deletedSet = new Set(deletedIds);
        snap.forEach((docSnap) => {
          if (!deletedSet.has(docSnap.id)) {
            const data = docSnap.data();
            firestoreOrders.push({ ...data, id: data.id || docSnap.id });
          }
        });
        if (firestoreOrders.length > 0) {
          cachedOrders = firestoreOrders;
          safeAtomicWriteJson(ORDERS_FILE, firestoreOrders);
          return firestoreOrders;
        }
      }
    } catch (fsErr) {
      console.warn("[Firestore] Error in readOrdersOnServer:", fsErr);
    }
  }

  if (isPostgresActive()) {
    try {
      const dbOrders = await getOrdersFromDb();
      if (dbOrders && dbOrders.length > 0) {
        cachedOrders = dbOrders;
        return dbOrders;
      }
    } catch (e) {
      console.error("Error reading orders from DB:", e);
    }
  }

  // Fallback to local file with resilience
  try {
    const fileOrders = safeResilientReadJson<any[]>(ORDERS_FILE, cachedOrders || []);
    if (fileOrders && Array.isArray(fileOrders) && fileOrders.length > 0) {
      cachedOrders = fileOrders;
      return fileOrders;
    }
  } catch (err) {
    console.error("Error reading orders from file:", err);
  }

  return cachedOrders || [];
}

// Helper to write orders to PostgreSQL and file safely
async function writeOrdersOnServer(orders: any[]) {
  cachedOrders = orders;

  if (isPostgresActive()) {
    try {
      await saveMultipleOrdersToDb(orders);
    } catch (e) {
      console.error("Error writing orders to DB:", e);
    }
  }

  safeAtomicWriteJson(ORDERS_FILE, orders);
}

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

function initFirestoreSentinel() {
  const db = getFirestoreDb();
  if (!db) return;

  console.log("[Firestore Sentinel] Active and guarding against zombie orders & syncing staff orders...");

  // 1. Listen for changes in settings/deleted_orders from Firestore
  try {
    onSnapshot(doc(db, "settings", "deleted_orders"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.deletedIds)) {
          const combined = Array.from(new Set([...(cachedDeletedOrders || []), ...data.deletedIds]));
          if (combined.length > (cachedDeletedOrders || []).length) {
            writeDeletedOrdersOnServer(combined);
          }
        }
      }
    }, (err) => {
      console.warn("[Firestore Sentinel] deleted_orders subscription error:", err);
    });
  } catch (err) {
    console.warn("[Firestore Sentinel] Failed to subscribe to deleted_orders:", err);
  }

  // 2. Real-time sentinel on orders collection:
  // - Purge zombie orders immediately if written
  // - Synchronize new staff orders from Firestore to server & SSE
  try {
    onSnapshot(collection(db, "orders"), async (snapshot) => {
      const currentDeleted = cachedDeletedOrders || [];
      const delSet = new Set(currentDeleted);
      let hasZombie = false;
      const validFromFirestore: any[] = [];

      snapshot.forEach((docSnap) => {
        const orderId = docSnap.id;
        if (delSet.has(orderId)) {
          hasZombie = true;
          console.warn(`[Firestore Sentinel] Zombie order detected in Firestore: ${orderId}. Purging immediately.`);
          deleteDoc(doc(db, "orders", orderId)).catch(() => {});
        } else {
          const docData = docSnap.data();
          if (docData && (docData.id || orderId)) {
            validFromFirestore.push({ ...docData, id: docData.id || orderId });
          }
        }
      });

      if (hasZombie) {
        broadcastSSEEvent("order_deleted", { deletedIds: currentDeleted });
      }

      // Synchronize valid orders into server memory and broadcast to main admin/clients
      if (validFromFirestore.length > 0) {
        try {
          const current = await readOrdersOnServer();
          const map = new Map<string, any>();
          for (const o of current) {
            if (!delSet.has(o.id)) map.set(o.id, o);
          }

          let anyChange = false;
          for (const fo of validFromFirestore) {
            if (!fo || !fo.id || delSet.has(fo.id)) continue;
            if (!map.has(fo.id)) {
              map.set(fo.id, fo);
              anyChange = true;
            } else {
              const existing = map.get(fo.id)!;
              const existingTime = existing.updatedAt || 0;
              const incomingTime = fo.updatedAt || 0;
              if (incomingTime > existingTime) {
                map.set(fo.id, { ...existing, ...fo });
                anyChange = true;
              }
            }
          }

          if (anyChange) {
            const fullyMerged = Array.from(map.values()).sort((a, b) => {
              return (b.orderNumber || "").localeCompare(a.orderNumber || "", undefined, { numeric: true });
            });
            await writeOrdersOnServer(fullyMerged);
            broadcastSSEEvent("orders_updated", { orders: fullyMerged, deletedIds: currentDeleted });
            console.log(`[Firestore Sentinel] Synced ${fullyMerged.length} orders from Firestore to server.`);
          }
        } catch (e) {
          console.warn("[Firestore Sentinel] Error syncing orders to server:", e);
        }
      }
    }, (err) => {
      console.warn("[Firestore Sentinel] orders subscription error:", err);
    });
  } catch (err) {
    console.warn("[Firestore Sentinel] Failed to subscribe to orders collection:", err);
  }

  // 3. Initial sweep on start:
  getDocs(collection(db, "orders")).then((snap) => {
    snap.forEach(async (docSnap) => {
      if (cachedDeletedOrders && cachedDeletedOrders.includes(docSnap.id)) {
        console.warn(`[Firestore Sentinel] Initial purge of zombie order ${docSnap.id}`);
        await deleteDoc(doc(db, "orders", docSnap.id)).catch(() => {});
      }
    });
  }).catch(() => {});
}

// Helper to write deleted order IDs
async function writeDeletedOrdersOnServer(ids: string[], newDeletedId?: string) {
  cachedDeletedOrders = ids;

  if (isPostgresActive() && newDeletedId) {
    try {
      await deleteOrderInDb(newDeletedId);
    } catch (e) {
      console.error("Error deleting order in DB:", e);
    }
  }

  // Also sync to Firestore deleted_orders doc and delete doc from orders collection
  const db = getFirestoreDb();
  if (db) {
    try {
      setDoc(doc(db, "settings", "deleted_orders"), {
        deletedIds: arrayUnion(...ids),
        _syncedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
      if (newDeletedId) {
        deleteDoc(doc(db, "orders", newDeletedId)).catch(() => {});
      }
    } catch (e) {}
  }

  safeAtomicWriteJson(DELETED_ORDERS_FILE, ids);
}

// Helpers for catalogue, settings, and reviews
async function readCatalogueOnServer(): Promise<any[]> {
  if (isPostgresActive()) {
    try {
      const dbCat = await getCatalogueFromDb();
      if (dbCat && dbCat.length > 0) {
        cachedCatalogue = dbCat;
        return dbCat;
      }
    } catch (e) {
      console.error("Error reading catalogue from DB:", e);
    }
  }

  try {
    const fileCat = safeResilientReadJson<any[]>(CATALOGUE_FILE, cachedCatalogue || []);
    if (fileCat && Array.isArray(fileCat)) {
      cachedCatalogue = fileCat;
      return fileCat;
    }
  } catch (err) {
    console.error("Error reading catalogue from file:", err);
  }

  return cachedCatalogue || [];
}

async function writeCatalogueOnServer(data: any[]) {
  cachedCatalogue = data;

  if (isPostgresActive()) {
    try {
      await saveCatalogueToDb(data);
    } catch (e) {
      console.error("Error writing catalogue to DB:", e);
    }
  }

  safeAtomicWriteJson(CATALOGUE_FILE, data);
}

async function readSettingsOnServer(): Promise<any> {
  if (isPostgresActive()) {
    try {
      const dbSettings = await getSettingsFromDb();
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        cachedSettings = dbSettings;
        return dbSettings;
      }
    } catch (e) {
      console.error("Error reading settings from DB:", e);
    }
  }

  try {
    const fileSettings = safeResilientReadJson<any>(SETTINGS_FILE, cachedSettings || {});
    if (fileSettings && typeof fileSettings === 'object') {
      cachedSettings = fileSettings;
      return fileSettings;
    }
  } catch (err) {
    console.error("Error reading settings from file:", err);
  }

  return cachedSettings || {};
}

async function writeSettingsOnServer(data: any) {
  cachedSettings = data;

  if (isPostgresActive()) {
    try {
      await saveSettingsToDb(data);
    } catch (e) {
      console.error("Error writing settings to DB:", e);
    }
  }

  safeAtomicWriteJson(SETTINGS_FILE, data);
}

async function readReviewsOnServer(): Promise<any[]> {
  if (isPostgresActive()) {
    try {
      const dbReviews = await getReviewsFromDb();
      if (dbReviews && dbReviews.length > 0) {
        cachedReviews = dbReviews;
        return dbReviews;
      }
    } catch (e) {
      console.error("Error reading reviews from DB:", e);
    }
  }

  try {
    const fileReviews = safeResilientReadJson<any[]>(REVIEWS_FILE, cachedReviews || []);
    if (fileReviews && Array.isArray(fileReviews)) {
      cachedReviews = fileReviews;
      return fileReviews;
    }
  } catch (err) {
    console.error("Error reading reviews from file:", err);
  }

  return cachedReviews || [];
}

async function writeReviewsOnServer(data: any[]) {
  cachedReviews = data;

  if (isPostgresActive()) {
    try {
      await saveReviewsToDb(data);
    } catch (e) {
      console.error("Error writing reviews to DB:", e);
    }
  }

  safeAtomicWriteJson(REVIEWS_FILE, data);
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

app.get("/api/deleted-orders", async (req, res) => {
  const deletedIds = await readDeletedOrdersOnServer();
  res.json({ deletedIds });
});

app.delete("/api/orders", async (req: any, res) => {
  const id = req.query?.id || req.body?.id;
  if (!id) {
    return res.status(400).json({ error: "Order id is required" });
  }

  const deletedIds = await readDeletedOrdersOnServer();
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await writeDeletedOrdersOnServer(deletedIds, id);
  }

  const current = await readOrdersOnServer();
  const updated = current.filter((o: any) => o.id !== id);
  await writeOrdersOnServer(updated);

  broadcastSSEEvent("order_deleted", { orders: updated, deletedId: id, deletedIds });
  broadcastSSEEvent("orders_updated", { orders: updated, deletedId: id, deletedIds });

  res.json({ success: true, orders: updated, deletedId: id, deletedIds });
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
  
  // Real-time broadcast to all clients with explicit order_deleted and orders_updated
  broadcastSSEEvent("order_deleted", { orders: updated, deletedId: id, deletedIds });
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

    // Real-time broadcast to all connected users (Staff & Main Admin) with deletedIds to prevent resurrection
    broadcastSSEEvent("orders_updated", { orders: fullyMerged, deletedIds });

    // Mirror to Firestore so all clients and devices stay 100% in sync
    const db = getFirestoreDb();
    if (db) {
      for (const o of incomingOrders) {
        if (o && o.id && !deletedSet.has(o.id)) {
          const sanitized = sanitizeForFirestore({
            ...o,
            _syncedAt: new Date().toISOString()
          });
          setDoc(doc(db, "orders", o.id), sanitized, { merge: true }).catch((err) => {
            console.warn(`[Server] Firestore write error for order ${o.id}:`, err);
          });
        }
      }
    }

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
    broadcastSSEEvent("orders_updated", { orders: fullyMerged, deletedIds });

    // Mirror to Firestore
    const db = getFirestoreDb();
    if (db) {
      for (const o of req.body) {
        if (o && o.id && !deletedSet.has(o.id)) {
          const sanitized = sanitizeForFirestore({
            ...o,
            _syncedAt: new Date().toISOString()
          });
          setDoc(doc(db, "orders", o.id), sanitized, { merge: true }).catch((err) => {
            console.warn(`[Server] Firestore write error for order ${o.id}:`, err);
          });
        }
      }
    }

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
    const filteredIncoming = { ...incoming };
    
    // Prevent empty string logo or phone from overwriting valid existing values unless explicit delete flag is set
    if (filteredIncoming.boutiqueLogo === "" && current.boutiqueLogo && !filteredIncoming._explicitDelete) {
      delete filteredIncoming.boutiqueLogo;
    }
    if (filteredIncoming.boutiquePhone === "" && current.boutiquePhone && !filteredIncoming._explicitDelete) {
      delete filteredIncoming.boutiquePhone;
    }
    
    delete filteredIncoming._explicitDelete;
    const updated = { ...current, ...filteredIncoming };
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

// Helper to get effective LINE Messaging API configuration from Environment or Database Settings
async function getEffectiveLineConfig(req?: any) {
  const settings = await readSettingsOnServer();
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || settings.lineChannelAccessToken || "").trim();
  const secret = (process.env.LINE_CHANNEL_SECRET || settings.lineChannelSecret || "").trim();
  const oaId = (settings.lineOaId || process.env.LINE_OA_ID || "@237aynfq").trim();
  const host = req ? (req.get('x-forwarded-host') || req.get('host')) : '';
  const proto = req ? (req.get('x-forwarded-proto') || 'https') : 'https';

  const requestBaseUrl = host ? `${proto}://${host}` : '';
  const configuredUrl = (settings.publicUrl || '').trim();
  const validConfigured = (configuredUrl && !configuredUrl.includes('nunuh-pre-order2026.onrender.com') && !configuredUrl.includes('nunuh.onrender.com')) ? configuredUrl : '';
  const appUrl = (process.env.APP_URL || '').trim();
  const rawBaseUrl = validConfigured || appUrl || requestBaseUrl || lastKnownPublicUrl || process.env.PUBLIC_APP_URL || '';
  const cleanBase = (rawBaseUrl || '').replace(/\/+$/, '');
  const webhookUrl = cleanBase ? `${cleanBase}/api/webhook/line` : '/api/webhook/line';
  
  return {
    token,
    secret,
    oaId,
    webhookUrl,
    hasToken: Boolean(token),
    hasSecret: Boolean(secret),
    source: process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'env' : (settings.lineChannelAccessToken ? 'settings' : 'none')
  };
}

// API Endpoint to send status push message directly to a user
app.post("/api/send-status", async (req: any, res) => {
  let { userId, orderId, orderNumber, customerPhone, message } = req.body || {};
  const lineConfig = await getEffectiveLineConfig(req);
  const LINE_CHANNEL_ACCESS_TOKEN = lineConfig.token;

  // If userId is not provided, look up from orders
  if (!userId && (orderId || orderNumber || customerPhone)) {
    try {
      const orders = await readOrdersOnServer();
      const matched = orders.find((o: any) => 
        (orderId && o.id === orderId) ||
        (orderNumber && o.orderNumber?.toLowerCase() === orderNumber?.toLowerCase()) ||
        (customerPhone && o.customerPhone?.replace(/\D/g, '') === customerPhone?.replace(/\D/g, ''))
      );
      if (matched && matched.lineUserId) {
        userId = matched.lineUserId;
      }
    } catch (e) {
      console.warn("Failed to lookup order for lineUserId:", e);
    }
  }

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!userId) {
    return res.json({ 
      success: true, 
      simulated: true, 
      hasUserId: false,
      hasToken: Boolean(LINE_CHANNEL_ACCESS_TOKEN),
      message: "ไม่พบ LINE User ID ของลูกค้ารายนี้ (ระบบได้คัดลอกข้อความเพื่อเปิดส่งในแผงแชทให้ค่ะ)" 
    });
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN not set, simulating push message sending to userId:", userId);
    return res.json({ 
      success: true, 
      simulated: true, 
      hasUserId: true,
      hasToken: false,
      message: "ยังไม่ได้ระบุ LINE Channel Access Token ในการตั้งค่า (ระบบคัดลอกข้อความพร้อมเปิดแชทให้แล้วค่ะ)" 
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
      return res.json({ success: true, hasUserId: true, hasToken: true, simulated: false });
    } else {
      const errText = await response.text();
      console.error(`❌ Failed to send push message to LINE: ${errText}`);
      return res.status(response.status).json({ error: errText, hasUserId: true, hasToken: true });
    }
  } catch (err: any) {
    console.error("❌ Error sending push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API Endpoint to send instant notification when a new order is recorded
app.post("/api/notify-order-created", async (req: any, res) => {
  try {
    const { order } = req.body || {};
    if (!order) {
      return res.status(400).json({ error: "Order object is required" });
    }

    const settings = await readSettingsOnServer();
    const lineConfig = await getEffectiveLineConfig(req);
    const token = lineConfig.token;
    const baseAppUrl = lineConfig.webhookUrl.replace(/\/api\/webhook\/line$/, '');

    let customerNotified = false;
    let ownerNotified = false;

    if (token) {
      // 1. If customer lineUserId is known, push confirmation to customer
      if (order.lineUserId) {
        try {
          const customerMsg = formatNewOrderCustomerConfirmation(order, baseAppUrl);
          const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              to: order.lineUserId,
              messages: [{ type: "text", text: customerMsg }]
            })
          });
          customerNotified = pushRes.ok;
          if (!pushRes.ok) {
            console.warn("[LINE Push] Customer push failed:", await pushRes.text());
          }
        } catch (cErr) {
          console.warn("[LINE Push] Error pushing to customer:", cErr);
        }
      }

      // 2. If shop owner Line User ID is configured in settings or environment, send alert to owner
      const ownerUserId = (settings.ownerLineUserId || process.env.OWNER_LINE_USER_ID || "").trim();
      if (ownerUserId) {
        try {
          const ownerMsg = formatNewOrderOwnerAlert(order, baseAppUrl);
          const ownerRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              to: ownerUserId,
              messages: [{ type: "text", text: ownerMsg }]
            })
          });
          ownerNotified = ownerRes.ok;
        } catch (oErr) {
          console.warn("[LINE Push] Error pushing to owner:", oErr);
        }
      }
    }

    return res.json({ success: true, customerNotified, ownerNotified });
  } catch (err: any) {
    console.error("Error in /api/notify-order-created:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API Endpoint to test LINE Push Message directly
app.post("/api/test-line-push", async (req: any, res) => {
  const { targetUserId, testMessage } = req.body || {};
  const lineConfig = await getEffectiveLineConfig(req);
  const token = lineConfig.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "ยังไม่ได้ระบุ LINE Channel Access Token ในระบบ กรุณาระบุในหน้าต่างตั้งค่าก่อนนะคะ"
    });
  }

  if (!targetUserId || !targetUserId.trim()) {
    return res.status(400).json({
      success: false,
      error: "กรุณาระบุ LINE User ID ของผู้รับ (ขึ้นต้นด้วยตัว U เช่น Uf150dba359d90219f8d...)"
    });
  }

  const msgToSend = (testMessage || `⚜️ ทดสอบการเชื่อมต่อ LINE Messaging API สำเร็จ! ⚜️\nระบบห้องเสื้อ NUNUH Boutique เชื่อมต่อกับ LINE บอทเรียบร้อยแล้วค่ะ ✨`).trim();

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        to: targetUserId.trim(),
        messages: [{ type: "text", text: msgToSend }]
      })
    });

    if (response.ok) {
      console.log(`✅ Test push message successfully delivered to: ${targetUserId}`);
      return res.json({
        success: true,
        targetUserId,
        message: "ส่งข้อความทดสอบสำเร็จเรียบร้อยแล้วค่ะ! กรุณาตรวจสอบในแอป LINE ของท่าน"
      });
    } else {
      const errText = await response.text();
      console.error(`❌ LINE Test Push API Error: ${errText}`);
      return res.status(response.status).json({
        success: false,
        error: errText,
        helpTip: errText.includes("Invalid reply token") || errText.includes("Not found") 
          ? "ไม่พบผู้ใช้รายนี้ (ผู้ใช้ต้องเคยเพิ่มเพื่อนกับ LINE Official Account ของทางร้านก่อนนะคะ)"
          : errText.includes("Authentication failed") || errText.includes("Invalid access token")
          ? "Channel Access Token ไม่ถูกต้องหรือหมดอายุ กรุณา Issue Token ใหม่จาก LINE Developers Console ค่ะ"
          : "การส่งข้อความขัดข้องจาก LINE API"
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to reach LINE API"
    });
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

  const lineConfig = await getEffectiveLineConfig(req);
  const LINE_CHANNEL_ACCESS_TOKEN = lineConfig.token;
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN not set, simulating overdue push message.");
    return res.json({
      success: true,
      simulated: true,
      overdueCount: overdueOrders.length,
      messageText: msgText,
      message: "ระบบจำลองการส่งสำเร็จ (ยังไม่ได้ใส่ LINE Channel Access Token)"
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
app.get("/api/line-config-status", async (req, res) => {
  const lineConfig = await getEffectiveLineConfig(req);
  res.json({
    tokenSet: lineConfig.hasToken,
    secretSet: lineConfig.hasSecret,
    lineOaId: lineConfig.oaId,
    webhookUrl: lineConfig.webhookUrl,
    source: lineConfig.source
  });
});

// API Endpoint to query current registered webhook endpoint directly from LINE Messaging API
app.get("/api/line/webhook-endpoint", async (req, res) => {
  const lineConfig = await getEffectiveLineConfig(req);
  const token = lineConfig.token;
  if (!token) {
    return res.status(400).json({ error: "LINE Channel Access Token not configured" });
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to query LINE webhook endpoint" });
  }
});

// API Endpoint to test webhook connectivity directly with LINE's server
app.post("/api/line/test-webhook", async (req, res) => {
  const lineConfig = await getEffectiveLineConfig(req);
  const token = lineConfig.token;
  if (!token) {
    return res.status(400).json({ error: "LINE Channel Access Token not configured" });
  }

  try {
    const { endpoint } = req.body || {};
    const testBody = endpoint ? { endpoint } : {};
    const response = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(testBody)
    });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to test LINE webhook" });
  }
});

// API Endpoint to update the webhook endpoint registered with LINE
app.post("/api/line/set-webhook-endpoint", async (req, res) => {
  const lineConfig = await getEffectiveLineConfig(req);
  const token = lineConfig.token;
  if (!token) {
    return res.status(400).json({ error: "LINE Channel Access Token not configured" });
  }

  const { endpoint } = req.body || {};
  if (!endpoint || !endpoint.startsWith("https://")) {
    return res.status(400).json({ error: "Valid HTTPS Webhook endpoint is required" });
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ endpoint: endpoint.trim() })
    });

    if (response.ok) {
      // Also update settings.publicUrl if needed
      const cleanBase = endpoint.replace(/\/api\/webhook\/line$/, "").replace(/\/webhook\/line$/, "");
      const settings = await readSettingsOnServer();
      settings.publicUrl = cleanBase;
      await writeSettingsOnServer(settings);

      return res.json({ success: true, endpoint: endpoint.trim() });
    } else {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to set LINE webhook endpoint" });
  }
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
    const lineConfig = await getEffectiveLineConfig(req);
    const LINE_CHANNEL_SECRET = (lineConfig.secret || process.env.LINE_CHANNEL_SECRET || "").trim();
    const LINE_CHANNEL_ACCESS_TOKEN = (lineConfig.token || process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();

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

        // Lookup Orders on Server (loads fresh orders from Firestore)
        const orders = await readOrdersOnServer();
        const matchedOrders = smartMatchOrders(originalText, orders, event.source?.userId);

        // Auto-link lineUserId in Firestore and in server memory
        if (matchedOrders.length > 0 && event.source?.userId) {
          const userId = event.source.userId;
          const fsDb = getFirestoreDb();
          let updatedAny = false;
          for (const mo of matchedOrders) {
            if (mo && mo.id && mo.lineUserId !== userId) {
              mo.lineUserId = userId;
              mo.updatedAt = Date.now();
              updatedAny = true;
              if (fsDb) {
                setDoc(doc(fsDb, "orders", mo.id), { lineUserId: userId, updatedAt: Date.now() }, { merge: true }).catch((err) => {
                  console.warn("[Firestore] Failed to save lineUserId to order:", err);
                });
              }
            }
          }
          if (updatedAny) {
            await writeOrdersOnServer(orders);
            broadcastSSEEvent("orders_updated", { orders });
            console.log(`[Webhook] Auto-linked lineUserId: ${userId} to ${matchedOrders.length} order(s).`);
          }
        }

        // Formulate Rich Response
        let replyMessage = "";
        const proto = req.get('x-forwarded-proto') || 'https';
        const host = req.get('x-forwarded-host') || req.get('host');
        const settings = await readSettingsOnServer();
        const configuredUrl = (settings.publicUrl || '').trim();
        const appUrl = (process.env.APP_URL || '').trim();
        const baseAppUrl = (configuredUrl || appUrl || lastKnownPublicUrl || (host ? `${proto}://${host}` : '') || process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');

        if (matchedOrders.length === 0) {
          const digits = originalText.replace(/\D/g, "");
          const isLikelySearch = digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText) || originalText.length >= 2;

          if (isLikelySearch && (digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText))) {
            replyMessage = formatOrderNotFoundMessage(originalText);
          } else {
            // Intelligent conversation / advice powered by Gemini AI
            try {
              replyMessage = await generateAiFashionReply(originalText);
            } catch (e) {
              replyMessage = `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\nคุณลูกค้าสามารถสอบถามข้อมูลการสั่งตัดชุด หรือพิมพ์เบอร์โทรศัพท์/ชื่อ/เลขที่ออเดอร์ เพื่อติดตามสถานะงานตัดเย็บได้ตลอด 24 ชม. เลยนะคะ ✨`;
            }
          }
        } else {
          // Format full report for ALL customer orders
          replyMessage = formatCustomerOrdersReport(matchedOrders, baseAppUrl, event.source?.userId);
        }

        // Send Reply via LINE messaging API
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          try {
            const flexObj = matchedOrders.length > 0 ? buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, event.source?.userId) : null;
            
            // Build payload: Send interactive Flex card(s) followed by full item breakdown text
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

            let response = await fetch("https://api.line.me/v2/bot/message/reply", {
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

            // Resilient fallback: If combined Flex+Text payload fails (e.g. Flex schema nuance on older LINE versions), retry with pure text
            if (!response.ok && flexObj) {
              const flexErr = await response.text();
              console.warn("⚠️ LINE reply with Flex failed, falling back to pure text message. Status:", response.status, "Error:", flexErr);
              response = await fetch("https://api.line.me/v2/bot/message/reply", {
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

            if (!response.ok) {
              const errBody = await response.text();
              console.error("❌ Failed to send LINE reply. HTTP status:", response.status, "Response:", errBody);
            } else {
              console.log(`✅ Send LINE reply successful for ${matchedOrders.length} order(s)!`);
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

  // Initialize real-time Firestore sentinel to purge any resurrected deleted orders
  initFirestoreSentinel();

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
