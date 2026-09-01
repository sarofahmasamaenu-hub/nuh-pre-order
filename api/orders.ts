import fs from "fs";
import path from "path";
import {
  initDb,
  isPostgresActive,
  getOrdersFromDb,
  saveMultipleOrdersToDb,
  deleteOrderInDb,
  getDeletedOrderIdsFromDb
} from "../db";

const ORDERS_FILE = path.join(process.cwd(), "orders.json");
const DELETED_ORDERS_FILE = path.join(process.cwd(), "deleted_orders.json");

function readOrdersFromFile(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("[api/orders.ts] Error reading orders from file:", e);
  }
  return [];
}

function readDeletedOrdersFromFile(): string[] {
  try {
    if (fs.existsSync(DELETED_ORDERS_FILE)) {
      const data = fs.readFileSync(DELETED_ORDERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {}
  return [];
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (isPostgresActive()) {
      await initDb().catch(() => {});
    }

    if (req.method === "GET") {
      let orders: any[] = [];
      if (isPostgresActive()) {
        try {
          orders = await getOrdersFromDb();
        } catch (e) {
          console.error("[Vercel orders.ts] Error reading from DB:", e);
        }
      }
      if (!orders || orders.length === 0) {
        orders = readOrdersFromFile();
      }

      let deletedIds: string[] = [];
      if (isPostgresActive()) {
        try {
          deletedIds = await getDeletedOrderIdsFromDb();
        } catch (e) {}
      }
      if (!deletedIds || deletedIds.length === 0) {
        deletedIds = readDeletedOrdersFromFile();
      }

      const deletedSet = new Set(deletedIds);
      const cleanOrders = orders.filter((o: any) => !deletedSet.has(o.id));

      return res.status(200).json(cleanOrders);
    }

    if (req.method === "POST") {
      const { orders: incomingOrders } = req.body || {};
      const ordersToSave = Array.isArray(incomingOrders) ? incomingOrders : (Array.isArray(req.body) ? req.body : []);

      if (ordersToSave.length > 0 && isPostgresActive()) {
        try {
          await saveMultipleOrdersToDb(ordersToSave);
        } catch (e) {
          console.error("[Vercel orders.ts] Error writing to DB:", e);
        }
      }

      let currentDbOrders: any[] = ordersToSave;
      if (isPostgresActive()) {
        try {
          const fresh = await getOrdersFromDb();
          if (fresh && fresh.length > 0) {
            currentDbOrders = fresh;
          }
        } catch (e) {}
      }

      if (!currentDbOrders || currentDbOrders.length === 0) {
        currentDbOrders = readOrdersFromFile();
      }

      return res.status(200).json(currentDbOrders);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[Vercel orders.ts] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
