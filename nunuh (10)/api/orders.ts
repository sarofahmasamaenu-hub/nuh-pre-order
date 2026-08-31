import {
  initDb,
  isPostgresActive,
  getOrdersFromDb,
  saveMultipleOrdersToDb,
  deleteOrderInDb,
  getDeletedOrderIdsFromDb
} from "../db";

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
      return res.status(200).json(orders);
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

      return res.status(200).json(currentDbOrders);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[Vercel orders.ts] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
