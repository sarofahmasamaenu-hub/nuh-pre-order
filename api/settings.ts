import {
  initDb,
  isPostgresActive,
  getSettingsFromDb,
  saveSettingsToDb
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
      let settings: any = {};
      if (isPostgresActive()) {
        try {
          settings = await getSettingsFromDb();
        } catch (e) {
          console.error("[Vercel settings.ts] DB read error:", e);
        }
      }
      return res.status(200).json(settings);
    }

    if (req.method === "POST") {
      const incoming = req.body || {};
      if (isPostgresActive()) {
        try {
          await saveSettingsToDb(incoming);
        } catch (e) {
          console.error("[Vercel settings.ts] DB write error:", e);
        }
      }
      return res.status(200).json({ success: true, settings: incoming });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[Vercel settings.ts] Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
