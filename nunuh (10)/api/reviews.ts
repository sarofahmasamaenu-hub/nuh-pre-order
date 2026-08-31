import {
  initDb,
  isPostgresActive,
  getReviewsFromDb,
  saveReviewsToDb
} from "../db";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (isPostgresActive()) {
      await initDb().catch(() => {});
    }

    if (req.method === "GET") {
      let reviews: any[] = [];
      if (isPostgresActive()) {
        try {
          reviews = await getReviewsFromDb();
        } catch (e) {
          console.error("[Vercel reviews.ts] DB read error:", e);
        }
      }
      return res.status(200).json(reviews);
    }

    if (req.method === "POST") {
      const incoming = Array.isArray(req.body) ? req.body : [];
      if (isPostgresActive() && incoming.length > 0) {
        try {
          await saveReviewsToDb(incoming);
        } catch (e) {
          console.error("[Vercel reviews.ts] DB write error:", e);
        }
      }
      return res.status(200).json({ success: true, reviews: incoming });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[Vercel reviews.ts] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
