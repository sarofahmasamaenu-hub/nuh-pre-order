// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv2 from "dotenv";
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

// db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
var connectionString = process.env.DATABASE_URL;
var pool = null;
var isDbConnected = false;
if (connectionString) {
  try {
    const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    const poolConfig = {
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 20,
      // Max concurrent connections in pool
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 3e3
      // Fail fast (3s) if network/DNS unreachable
    };
    pool = new Pool(poolConfig);
    pool.on("connect", () => {
    });
    pool.on("error", (err) => {
      isDbConnected = false;
    });
  } catch (err) {
    console.error("\u274C Failed to initialize PostgreSQL pool:", err);
    pool = null;
  }
} else {
  console.log("\u2139\uFE0F DATABASE_URL not detected. Server will use local persistent JSON file storage.");
}
async function initDb() {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    try {
      console.log("\u{1F504} Initializing PostgreSQL database schemas...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255),
          name VARCHAR(150) NOT NULL,
          role VARCHAR(50) DEFAULT 'staff',
          branch VARCHAR(100) NOT NULL,
          pin_code VARCHAR(10),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(100) PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          customer_name VARCHAR(150) NOT NULL,
          customer_nickname VARCHAR(100),
          customer_phone VARCHAR(50) NOT NULL,
          customer_social VARCHAR(150),
          line_user_id VARCHAR(100),
          dress_type VARCHAR(100) NOT NULL,
          fabric_type VARCHAR(100),
          price NUMERIC(12, 2) DEFAULT 0,
          deposit NUMERIC(12, 2) DEFAULT 0,
          discount NUMERIC(12, 2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'RECEIVED',
          status_date VARCHAR(50),
          order_date VARCHAR(50),
          delivery_date VARCHAR(50),
          branch VARCHAR(100) NOT NULL,
          staff_name VARCHAR(100),
          tailor_name VARCHAR(100),
          notes TEXT,
          measurements JSONB DEFAULT '{}'::jsonb,
          status_history JSONB DEFAULT '[]'::jsonb,
          reference_images JSONB DEFAULT '[]'::jsonb,
          fitting_images JSONB DEFAULT '[]'::jsonb,
          pickup_signee_name VARCHAR(150),
          pickup_signed_at VARCHAR(100),
          pickup_signature_data TEXT,
          pickup_notes TEXT,
          raw_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at BIGINT DEFAULT 0
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS catalogue (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          dress_type VARCHAR(100),
          price NUMERIC(12, 2) DEFAULT 0,
          fabric VARCHAR(100),
          description TEXT,
          image_url TEXT,
          images JSONB DEFAULT '[]'::jsonb,
          raw_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(100) PRIMARY KEY,
          order_id VARCHAR(100),
          order_number VARCHAR(100),
          customer_name VARCHAR(150),
          dress_type VARCHAR(100),
          rating INT DEFAULT 5,
          comment TEXT,
          reply_comment TEXT,
          status VARCHAR(50) DEFAULT 'approved',
          images JSONB DEFAULT '[]'::jsonb,
          raw_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS deleted_orders (
          id VARCHAR(100) PRIMARY KEY,
          deleted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
        CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
        CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch);
      `);
      isDbConnected = true;
      console.log("\u2705 PostgreSQL tables initialized and ready!");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    isDbConnected = false;
    const errMsg = err?.message || String(err);
    if (errMsg.includes("getaddrinfo") || errMsg.includes("EAI_AGAIN") || errMsg.includes("ENOTFOUND")) {
      console.log("\u2139\uFE0F PostgreSQL Hostname is only accessible inside Render Private Network (or DNS is resolving). Falling back gracefully to Local File Storage.");
    } else {
      console.warn("\u26A0\uFE0F PostgreSQL connection notice:", errMsg, "- Using Local File Storage fallback.");
    }
    return false;
  }
}
function isPostgresActive() {
  return Boolean(pool && isDbConnected);
}
async function getOrdersFromDb() {
  if (!isPostgresActive() || !pool) return [];
  try {
    const res = await pool.query(`
      SELECT 
        o.id,
        o.order_number AS "orderNumber",
        o.customer_name AS "customerName",
        o.customer_nickname AS "customerNickname",
        o.customer_phone AS "customerPhone",
        o.customer_social AS "customerSocial",
        o.line_user_id AS "lineUserId",
        o.dress_type AS "dressType",
        o.fabric_type AS "fabricType",
        o.price::float AS "price",
        o.deposit::float AS "deposit",
        o.discount::float AS "discount",
        o.status,
        o.status_date AS "statusDate",
        o.order_date AS "orderDate",
        o.delivery_date AS "deliveryDate",
        o.branch,
        o.staff_name AS "staffName",
        o.tailor_name AS "tailorName",
        o.notes,
        o.measurements,
        o.status_history AS "statusHistory",
        o.reference_images AS "referenceImages",
        o.fitting_images AS "fittingImages",
        o.pickup_signee_name AS "pickupSigneeName",
        o.pickup_signed_at AS "pickupSignedAt",
        o.pickup_signature_data AS "pickupSignatureData",
        o.pickup_notes AS "pickupNotes",
        o.updated_at AS "updatedAt",
        o.raw_data AS "rawData"
      FROM orders o
      WHERE o.id NOT IN (SELECT id FROM deleted_orders)
      ORDER BY o.order_number DESC;
    `);
    return res.rows.map((row) => {
      const raw = row.rawData || {};
      const { rawData, ...rest } = row;
      return { ...raw, ...rest };
    });
  } catch (err) {
    console.error("\u274C Error fetching orders from DB:", err);
    return [];
  }
}
async function saveOrderToDb(order) {
  if (!isPostgresActive() || !pool || !order || !order.id) return false;
  try {
    const query = `
      INSERT INTO orders (
        id, order_number, customer_name, customer_nickname, customer_phone,
        customer_social, line_user_id, dress_type, fabric_type, price,
        deposit, discount, status, status_date, order_date, delivery_date,
        branch, staff_name, tailor_name, notes, measurements, status_history,
        reference_images, fitting_images, pickup_signee_name, pickup_signed_at,
        pickup_signature_data, pickup_notes, raw_data, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30
      )
      ON CONFLICT (id) DO UPDATE SET
        order_number = EXCLUDED.order_number,
        customer_name = EXCLUDED.customer_name,
        customer_nickname = EXCLUDED.customer_nickname,
        customer_phone = EXCLUDED.customer_phone,
        customer_social = EXCLUDED.customer_social,
        line_user_id = EXCLUDED.line_user_id,
        dress_type = EXCLUDED.dress_type,
        fabric_type = EXCLUDED.fabric_type,
        price = EXCLUDED.price,
        deposit = EXCLUDED.deposit,
        discount = EXCLUDED.discount,
        status = EXCLUDED.status,
        status_date = EXCLUDED.status_date,
        order_date = EXCLUDED.order_date,
        delivery_date = EXCLUDED.delivery_date,
        branch = EXCLUDED.branch,
        staff_name = EXCLUDED.staff_name,
        tailor_name = EXCLUDED.tailor_name,
        notes = EXCLUDED.notes,
        measurements = EXCLUDED.measurements,
        status_history = EXCLUDED.status_history,
        reference_images = EXCLUDED.reference_images,
        fitting_images = EXCLUDED.fitting_images,
        pickup_signee_name = EXCLUDED.pickup_signee_name,
        pickup_signed_at = EXCLUDED.pickup_signed_at,
        pickup_signature_data = EXCLUDED.pickup_signature_data,
        pickup_notes = EXCLUDED.pickup_notes,
        raw_data = EXCLUDED.raw_data,
        updated_at = EXCLUDED.updated_at;
    `;
    const values = [
      order.id,
      order.orderNumber || order.id,
      order.customerName || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D",
      order.customerNickname || null,
      order.customerPhone || "",
      order.customerSocial || null,
      order.lineUserId || null,
      order.dressType || "\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14",
      order.fabricType || null,
      Number(order.price) || 0,
      Number(order.deposit) || 0,
      Number(order.discount) || 0,
      order.status || "RECEIVED",
      order.statusDate || null,
      order.orderDate || null,
      order.deliveryDate || null,
      order.branch || "\u0E2A\u0E32\u0E02\u0E32\u0E19\u0E23\u0E32\u0E18\u0E34\u0E27\u0E32\u0E2A",
      order.staffName || null,
      order.tailorName || null,
      order.notes || null,
      JSON.stringify(order.measurements || {}),
      JSON.stringify(order.statusHistory || []),
      JSON.stringify(order.referenceImages || []),
      JSON.stringify(order.fittingImages || []),
      order.pickupSigneeName || null,
      order.pickupSignedAt || null,
      order.pickupSignatureData || null,
      order.pickupNotes || null,
      JSON.stringify(order),
      order.updatedAt || Date.now()
    ];
    await pool.query(query, values);
    return true;
  } catch (err) {
    console.error("\u274C Error saving order to DB:", err);
    return false;
  }
}
async function saveMultipleOrdersToDb(orders) {
  if (!isPostgresActive() || !pool || !Array.isArray(orders)) return false;
  try {
    for (const order of orders) {
      await saveOrderToDb(order);
    }
    return true;
  } catch (err) {
    console.error("\u274C Error saving multiple orders to DB:", err);
    return false;
  }
}
async function deleteOrderInDb(id) {
  if (!isPostgresActive() || !pool || !id) return false;
  try {
    await pool.query(`INSERT INTO deleted_orders (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [id]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [id]);
    return true;
  } catch (err) {
    console.error("\u274C Error deleting order in DB:", err);
    return false;
  }
}
async function getDeletedOrderIdsFromDb() {
  if (!isPostgresActive() || !pool) return [];
  try {
    const res = await pool.query(`SELECT id FROM deleted_orders`);
    return res.rows.map((r) => r.id);
  } catch (err) {
    console.error("\u274C Error getting deleted orders from DB:", err);
    return [];
  }
}
async function getCatalogueFromDb() {
  if (!isPostgresActive() || !pool) return [];
  try {
    const res = await pool.query(`SELECT raw_data FROM catalogue ORDER BY created_at ASC`);
    return res.rows.map((r) => r.raw_data).filter(Boolean);
  } catch (err) {
    console.error("\u274C Error getting catalogue from DB:", err);
    return [];
  }
}
async function saveCatalogueToDb(items) {
  if (!isPostgresActive() || !pool || !Array.isArray(items)) return false;
  try {
    for (const item of items) {
      if (!item.id) continue;
      await pool.query(`
        INSERT INTO catalogue (id, name, dress_type, price, fabric, description, image_url, images, raw_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          dress_type = EXCLUDED.dress_type,
          price = EXCLUDED.price,
          fabric = EXCLUDED.fabric,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          images = EXCLUDED.images,
          raw_data = EXCLUDED.raw_data,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        item.id,
        item.name || "",
        item.dressType || "",
        Number(item.price) || 0,
        item.fabric || "",
        item.description || "",
        item.imageUrl || item.image || "",
        JSON.stringify(item.images || []),
        JSON.stringify(item)
      ]);
    }
    return true;
  } catch (err) {
    console.error("\u274C Error saving catalogue to DB:", err);
    return false;
  }
}
async function getSettingsFromDb() {
  if (!isPostgresActive() || !pool) return {};
  try {
    const res = await pool.query(`SELECT key, value FROM store_settings`);
    const settings = {};
    for (const row of res.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (err) {
    console.error("\u274C Error getting settings from DB:", err);
    return {};
  }
}
async function saveSettingsToDb(settings) {
  if (!isPostgresActive() || !pool || !settings || typeof settings !== "object") return false;
  try {
    for (const [key, val] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO store_settings (key, value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP;
      `, [key, JSON.stringify(val)]);
    }
    return true;
  } catch (err) {
    console.error("\u274C Error saving settings to DB:", err);
    return false;
  }
}
async function getReviewsFromDb() {
  if (!isPostgresActive() || !pool) return [];
  try {
    const res = await pool.query(`SELECT raw_data FROM reviews ORDER BY created_at DESC`);
    return res.rows.map((r) => r.raw_data).filter(Boolean);
  } catch (err) {
    console.error("\u274C Error getting reviews from DB:", err);
    return [];
  }
}
async function saveReviewsToDb(reviews) {
  if (!isPostgresActive() || !pool || !Array.isArray(reviews)) return false;
  try {
    for (const rev of reviews) {
      if (!rev.id) continue;
      await pool.query(`
        INSERT INTO reviews (id, order_id, order_number, customer_name, dress_type, rating, comment, reply_comment, status, images, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          reply_comment = EXCLUDED.reply_comment,
          status = EXCLUDED.status,
          images = EXCLUDED.images,
          raw_data = EXCLUDED.raw_data;
      `, [
        rev.id,
        rev.orderId || null,
        rev.orderNumber || null,
        rev.customerName || "",
        rev.dressType || "",
        Number(rev.rating) || 5,
        rev.comment || "",
        rev.replyComment || null,
        rev.status || "approved",
        JSON.stringify(rev.images || []),
        JSON.stringify(rev)
      ]);
    }
    return true;
  } catch (err) {
    console.error("\u274C Error saving reviews to DB:", err);
    return false;
  }
}

// src/utils/lineMatcher.ts
var STATUS_MAP_TH = {
  RECEIVED: { label: "1. \u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4CB}", badgeColor: "#3B82F6" },
  DESIGNING: { label: "2. \u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A/\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32", desc: "\u0E27\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A \u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u270F\uFE0F", badgeColor: "#6366F1" },
  FABRIC_ORDERED: { label: "\u0E2A\u0E31\u0E48\u0E07\u0E1C\u0E49\u0E32/\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E1C\u0E49\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E1E\u0E34\u0E40\u0E28\u0E29", icon: "\u{1F4E6}", badgeColor: "#8B5CF6" },
  FABRIC_RECEIVED: { label: "\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27", desc: "\u0E1C\u0E49\u0E32\u0E41\u0E25\u0E30\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E08\u0E31\u0E14\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A", icon: "\u{1F9F5}", badgeColor: "#8B5CF6" },
  PATTERN_MAKING: { label: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19", desc: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1A\u0E1A\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1A\u0E38\u0E04\u0E04\u0E25", icon: "\u{1F4D0}", badgeColor: "#EC4899" },
  CUTTING: { label: "3. \u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E41\u0E25\u0E30\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32\u0E15\u0E32\u0E21\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u2702\uFE0F", badgeColor: "#F59E0B" },
  SEWING: { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  PATTERN_SEWING: { label: "\u0E17\u0E33\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19/\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", desc: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E41\u0E25\u0E30\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E0A\u0E38\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  FIRST_FITTING_READY: { label: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14", desc: "\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 1", icon: "\u{1F457}", badgeColor: "#A855F7" },
  FIRST_FITTING_DONE: { label: "\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E32\u0E21\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14", icon: "\u2728", badgeColor: "#A855F7" },
  SECOND_FITTING_READY: { label: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07", desc: "\u0E0A\u0E38\u0E14\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 2", icon: "\u{1F457}", badgeColor: "#A855F7" },
  SECOND_FITTING_DONE: { label: "\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E2D\u0E1A\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u2728", badgeColor: "#A855F7" },
  EMBROIDERY: { label: "\u0E07\u0E32\u0E19\u0E1B\u0E31\u0E01/\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E07\u0E32\u0E19\u0E1B\u0E31\u0E01 \u0E1B\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25 \u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49", icon: "\u{1FAA1}", badgeColor: "#EC4899" },
  HAND_FINISHING: { label: "\u0E2A\u0E2D\u0E22\u0E21\u0E37\u0E2D/\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E34\u0E21", desc: "\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E14\u0E49\u0E27\u0E22\u0E21\u0E37\u0E2D\u0E41\u0E25\u0E30\u0E07\u0E32\u0E19\u0E1D\u0E35\u0E21\u0E37\u0E2D\u0E1B\u0E23\u0E30\u0E13\u0E35\u0E15", icon: "\u{1FAA1}", badgeColor: "#EC4899" },
  FITTING: { label: "5. \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", desc: "\u0E19\u0E31\u0E14\u0E2B\u0E21\u0E32\u0E22\u0E25\u0E2D\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E17\u0E23\u0E07\u0E15\u0E32\u0E21\u0E23\u0E39\u0E1B\u0E23\u0E48\u0E32\u0E07", icon: "\u{1F457}", badgeColor: "#A855F7" },
  ALTERING: { label: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E17\u0E23\u0E07", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E19\u0E31\u0E14\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", icon: "\u2702\uFE0F", badgeColor: "#F97316" },
  VERIFY_DETAILS: { label: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", desc: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19", icon: "\u{1F50D}", badgeColor: "#06B6D4" },
  QUALITY_CHECK: { label: "\u0E15\u0E23\u0E27\u0E08\u0E40\u0E0A\u0E47\u0E01\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E (QC)", desc: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E13\u0E35\u0E15\u0E02\u0E2D\u0E07\u0E15\u0E30\u0E40\u0E02\u0E47\u0E1A \u0E0B\u0E34\u0E1B \u0E41\u0E25\u0E30\u0E17\u0E23\u0E07\u0E0A\u0E38\u0E14", icon: "\u{1F50D}", badgeColor: "#06B6D4" },
  IRONING_PACKING: { label: "\u0E23\u0E35\u0E14\u0E2D\u0E31\u0E14\u0E41\u0E25\u0E30\u0E41\u0E1E\u0E47\u0E01\u0E0A\u0E38\u0E14", desc: "\u0E23\u0E35\u0E14\u0E44\u0E2D\u0E19\u0E49\u0E33\u0E08\u0E31\u0E14\u0E17\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E41\u0E1E\u0E47\u0E01\u0E43\u0E2A\u0E48\u0E16\u0E38\u0E07\u0E04\u0E25\u0E38\u0E21\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E1C\u0E49\u0E32", icon: "\u{1F454}", badgeColor: "#14B8A6" },
  READY: { label: "6. \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A/\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14", desc: "\u0E0A\u0E38\u0E14\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100% \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E19\u0E31\u0E14\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07", icon: "\u{1F389}", badgeColor: "#10B981" },
  SHIPPED: { label: "\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E41\u0E25\u0E49\u0E27", desc: "\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17\u0E02\u0E19\u0E2A\u0E48\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F69A}", badgeColor: "#10B981" },
  DELIVERED: { label: "\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E16\u0E36\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E41\u0E25\u0E49\u0E27", desc: "\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E16\u0E36\u0E07\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4EC}", badgeColor: "#10B981" },
  COMPLETED: { label: "7. \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u{1F389}", desc: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E0B\u0E47\u0E19\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F3C6}", badgeColor: "#059669" },
  CANCELLED: { label: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C", desc: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01", icon: "\u274C", badgeColor: "#EF4444" },
  // Thai Legacy Aliases
  "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A": { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  "\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A": { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  "\u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C": { label: "1. \u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4CB}", badgeColor: "#3B82F6" },
  "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A": { label: "2. \u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A/\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32", desc: "\u0E27\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A \u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u270F\uFE0F", badgeColor: "#6366F1" },
  "\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32": { label: "3. \u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E41\u0E25\u0E30\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32\u0E15\u0E32\u0E21\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u2702\uFE0F", badgeColor: "#F59E0B" },
  "\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07": { label: "5. \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", desc: "\u0E19\u0E31\u0E14\u0E2B\u0E21\u0E32\u0E22\u0E25\u0E2D\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E17\u0E23\u0E07\u0E15\u0E32\u0E21\u0E23\u0E39\u0E1B\u0E23\u0E48\u0E32\u0E07", icon: "\u{1F457}", badgeColor: "#A855F7" },
  "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A": { label: "6. \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A/\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14", desc: "\u0E0A\u0E38\u0E14\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100% \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E19\u0E31\u0E14\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07", icon: "\u{1F389}", badgeColor: "#10B981" },
  "\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08": { label: "7. \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u{1F389}", desc: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E0B\u0E47\u0E19\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F3C6}", badgeColor: "#059669" }
};
function getStatusDetails(status) {
  if (!status) {
    return { label: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u23F3", badgeColor: "#64748B" };
  }
  const clean = status.trim();
  if (STATUS_MAP_TH[clean]) {
    return STATUS_MAP_TH[clean];
  }
  const upper = clean.toUpperCase();
  if (STATUS_MAP_TH[upper]) {
    return STATUS_MAP_TH[upper];
  }
  return { label: clean, desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u23F3", badgeColor: "#64748B" };
}
function cleanCustomerQuery(q) {
  if (!q) return "";
  let res = q.trim();
  const prefixes = [
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30",
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35\u0E04\u0E48\u0E30",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E48\u0E30",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E23\u0E31\u0E1A",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E48\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E23\u0E31\u0E1A",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E0A\u0E38\u0E14",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04",
    "\u0E02\u0E2D\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E02\u0E2D\u0E14\u0E39\u0E0A\u0E38\u0E14",
    "\u0E02\u0E2D\u0E14\u0E39",
    "\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E14\u0E39\u0E0A\u0E38\u0E14",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E40\u0E0A\u0E47\u0E04",
    "\u0E0A\u0E38\u0E14\u0E02\u0E2D\u0E07",
    "\u0E0A\u0E38\u0E14\u0E04\u0E38\u0E13",
    "\u0E0A\u0E38\u0E14",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E04\u0E38\u0E13",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E02\u0E2D\u0E07",
    "\u0E04\u0E38\u0E13",
    "\u0E19\u0E32\u0E07\u0E2A\u0E32\u0E27",
    "\u0E19.\u0E2A.",
    "\u0E19\u0E32\u0E07",
    "\u0E19\u0E32\u0E22",
    "\u0E14.\u0E0D.",
    "\u0E14.\u0E0A.",
    "\u0E1E\u0E35\u0E48",
    "\u0E19\u0E49\u0E2D\u0E07",
    "\u0E0A\u0E48\u0E32\u0E07",
    "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C",
    "\u0E42\u0E17\u0E23"
  ];
  const suffixes = [
    "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E23\u0E31\u0E1A",
    "\u0E19\u0E30\u0E04\u0E30",
    "\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E04\u0E48\u0E30",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22",
    "\u0E14\u0E49\u0E27\u0E22\u0E04\u0E48\u0E30",
    "\u0E14\u0E49\u0E27\u0E22\u0E04\u0E23\u0E31\u0E1A",
    "\u0E04\u0E48\u0E30",
    "\u0E04\u0E30",
    "\u0E04\u0E23\u0E31\u0E1A",
    "\u0E08\u0E49\u0E32",
    "\u0E08\u0E4A\u0E30",
    "\u0E44\u0E2B\u0E21\u0E04\u0E30",
    "\u0E21\u0E31\u0E49\u0E22\u0E04\u0E30",
    "\u0E44\u0E2B\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E21\u0E31\u0E49\u0E22\u0E04\u0E23\u0E31\u0E1A"
  ];
  let changed = true;
  let loops = 0;
  while (changed && loops < 10) {
    loops++;
    changed = false;
    res = res.trim();
    for (const p of prefixes) {
      if (res.startsWith(p)) {
        res = res.slice(p.length).trim();
        changed = true;
      }
    }
    for (const s of suffixes) {
      if (res.endsWith(s)) {
        res = res.slice(0, -s.length).trim();
        changed = true;
      }
    }
  }
  return res.trim();
}
function smartMatchOrders(inputText, ordersList, senderUserId) {
  if (!inputText || !ordersList || ordersList.length === 0) return [];
  const raw = inputText.trim();
  const lower = raw.toLowerCase();
  const digitsOnly = lower.replace(/\D/g, "");
  const phoneCandidates = [];
  const phoneMatches = raw.match(/(?:0|\+?66)[0-9\s-]{8,14}/g) || [];
  for (const m of phoneMatches) {
    const d = m.replace(/\D/g, "");
    const normalized = d.startsWith("66") ? "0" + d.slice(2) : d;
    if (normalized.length >= 9 && normalized.length <= 10) {
      phoneCandidates.push(normalized);
    }
  }
  if (digitsOnly.length >= 9 && digitsOnly.length <= 10) {
    const norm = digitsOnly.startsWith("66") ? "0" + digitsOnly.slice(2) : digitsOnly;
    if (!phoneCandidates.includes(norm)) phoneCandidates.push(norm);
  }
  const orderNumCandidates = [];
  const nuMatches = raw.match(/NU-?\s*\d{3,6}/gi) || [];
  for (const m of nuMatches) {
    orderNumCandidates.push(m.replace(/[- \s]/g, "").toLowerCase());
  }
  const pureDigitsMatch = raw.match(/\b\d{4,6}\b/g) || [];
  for (const pd of pureDigitsMatch) {
    orderNumCandidates.push(pd);
    orderNumCandidates.push("nu" + pd);
  }
  const cleanSearch = lower.replace(/[- \s\t\n()#_]/g, "");
  const strippedText = cleanCustomerQuery(raw).toLowerCase();
  const strippedClean = strippedText.replace(/[- \s\t\n()#_]/g, "");
  const matched = ordersList.filter((order) => {
    if (!order) return false;
    const orderPhone = (order.customerPhone || "").replace(/\D/g, "");
    const orderNum = (order.orderNumber || "").replace(/[- \s]/g, "").toLowerCase();
    const orderNumDigits = orderNum.replace(/\D/g, "");
    const name = (order.customerName || "").toLowerCase();
    const nameNoTitle = name.replace(/^(คุณ|นางสาว|น\.ส\.|นาง|นาย|ด\.ญ\.|ด\.ช\.|พี่|น้อง|ช่าง|ลูกค้า)\s*/i, "").trim();
    const nameNoSpaces = nameNoTitle.replace(/[- \s\t\n]/g, "");
    const nickname = (order.customerNickname || "").toLowerCase().trim();
    const lineUid = (order.lineUserId || "").toLowerCase().trim();
    if (senderUserId && lineUid && lineUid === senderUserId.toLowerCase().trim()) {
      return true;
    }
    for (const pc of phoneCandidates) {
      if (orderPhone && (orderPhone === pc || orderPhone.includes(pc) || pc.includes(orderPhone))) {
        return true;
      }
    }
    if (digitsOnly.length >= 7 && orderPhone && (orderPhone.includes(digitsOnly) || digitsOnly.includes(orderPhone))) {
      return true;
    }
    for (const onc of orderNumCandidates) {
      if (orderNum && (orderNum === onc || orderNum.includes(onc) || onc.includes(orderNum))) return true;
      if (orderNumDigits && onc.includes(orderNumDigits)) return true;
    }
    if (nameNoSpaces.length >= 2 && cleanSearch.includes(nameNoSpaces)) return true;
    if (nameNoTitle.length >= 2 && lower.includes(nameNoTitle)) return true;
    const nameParts = nameNoTitle.split(/\s+/).filter((p) => p.length >= 2);
    for (const part of nameParts) {
      const cleanPart = part.replace(/[- \s\t\n]/g, "");
      if (cleanPart.length >= 2 && (cleanSearch.includes(cleanPart) || strippedClean.includes(cleanPart))) {
        return true;
      }
    }
    if (strippedClean.length >= 2 && nameNoSpaces.includes(strippedClean)) return true;
    if (strippedText.length >= 2 && nameNoTitle.includes(strippedText)) return true;
    if (nickname.length >= 2) {
      if (cleanSearch.includes(nickname) || lower.includes(nickname) || strippedClean.includes(nickname)) {
        return true;
      }
    }
    return false;
  });
  return matched.sort((a, b) => {
    return (b.orderNumber || "").localeCompare(a.orderNumber || "", void 0, { numeric: true });
  });
}
function formatThaiDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (_) {
    return dateStr;
  }
}
function formatSingleOrderLineMessage(order, baseAppUrl, userId) {
  const stCfg = getStatusDetails(order.status);
  const formattedDelivery = formatThaiDate(order.deliveryDate);
  const price = Number(order.price || 0);
  const deposit = Number(order.deposit || 0);
  const discount = Number(order.discount || 0);
  const finalPaid = Number(order.finalPaymentAmount || 0);
  const unpaid = Math.max(0, price - deposit - discount - finalPaid);
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  return `\u269C\uFE0F \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14 NUNUH Boutique \u269C\uFE0F

\u{1F464} \u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E38\u0E13: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}
\u{1F9FE} \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C: ${order.orderNumber}
\u{1F457} \u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14: ${order.dressType}
\u{1F9F5} \u0E0A\u0E19\u0E34\u0E14\u0E1C\u0E49\u0E32/\u0E2A\u0E35: ${order.fabricType || "\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38"} (${order.fabricColor || "-"})
` + (order.tailorName ? `\u2702\uFE0F \u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A: ${order.tailorName}

` : `
`) + `\u{1F4CD} \u0E2A\u0E16\u0E32\u0E19\u0E30 Real-Time: ${stCfg.icon} [${stCfg.label}]
\u2139\uFE0F \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: "${stCfg.desc}"
\u{1F4C5} \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E2A\u0E16\u0E32\u0E19\u0E30: ${formatThaiDate(order.statusDate || order.orderDate)}
\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E0A\u0E38\u0E14: ${formattedDelivery}

\u{1F4B0} \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19:
\u2022 \u0E23\u0E32\u0E04\u0E32\u0E23\u0E27\u0E21: ${price.toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E0A\u0E33\u0E23\u0E30\u0E21\u0E31\u0E14\u0E08\u0E33\u0E41\u0E25\u0E49\u0E27: ${deposit.toLocaleString()} \u0E1A\u0E32\u0E17
` + (unpaid === 0 ? `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E33\u0E23\u0E30: \u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E41\u0E25\u0E49\u0E27 \u2713

` : `\u2022 \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14: ${unpaid.toLocaleString()} \u0E1A\u0E32\u0E17

`) + `\u{1F517} \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E27\u0E31\u0E14 \u0E41\u0E25\u0E30\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E41\u0E1A\u0E1A Real-Time \u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21.:
${portalUrl}

\u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21 \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49\u0E43\u0E19\u0E41\u0E0A\u0E17\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
}
function formatMultipleOrdersLineMessage(matchedOrders, baseAppUrl, userId) {
  const customerName = matchedOrders[0]?.customerName || "\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32";
  const customerNickname = matchedOrders[0]?.customerNickname ? ` (${matchedOrders[0]?.customerNickname})` : "";
  let totalPrice = 0;
  let totalDeposit = 0;
  let totalUnpaid = 0;
  let itemsText = "";
  matchedOrders.forEach((order, idx) => {
    const stCfg = getStatusDetails(order.status);
    const delDate = formatThaiDate(order.deliveryDate);
    const price = Number(order.price || 0);
    const deposit = Number(order.deposit || 0);
    const discount = Number(order.discount || 0);
    const finalPaid = Number(order.finalPaymentAmount || 0);
    const unpaid = Math.max(0, price - deposit - discount - finalPaid);
    totalPrice += price;
    totalDeposit += deposit;
    totalUnpaid += unpaid;
    itemsText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
    itemsText += `\u{1F457} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48 ${idx + 1}: ${order.orderNumber} - ${order.dressType}
`;
    itemsText += `\u2022 \u0E1C\u0E49\u0E32/\u0E2A\u0E35: ${order.fabricType || "\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38"} (${order.fabricColor || "-"})
`;
    itemsText += `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30: ${stCfg.icon} [${stCfg.label}]
`;
    itemsText += `  \u21B3 "${stCfg.desc}"
`;
    itemsText += `\u2022 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A: ${delDate}
`;
    itemsText += `\u2022 \u0E23\u0E32\u0E04\u0E32: ${price.toLocaleString()} \u0E1A. | \u0E21\u0E31\u0E14\u0E08\u0E33: ${deposit.toLocaleString()} \u0E1A. | \u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${unpaid.toLocaleString()} \u0E1A.
`;
  });
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  return `\u269C\uFE0F NUNUH Boutique - \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u269C\uFE0F

\u{1F464} \u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E38\u0E13: ${customerName}${customerNickname}
\u{1F4E6} \u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${matchedOrders.length} \u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C \u0E14\u0E31\u0E07\u0E19\u0E35\u0E49\u0E04\u0E48\u0E30:

${itemsText}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4CA} \u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 (${matchedOrders.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23):
\u2022 \u0E23\u0E27\u0E21\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E0A\u0E38\u0E14: ${totalPrice.toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E0A\u0E33\u0E23\u0E30\u0E21\u0E31\u0E14\u0E08\u0E33\u0E23\u0E27\u0E21: ${totalDeposit.toLocaleString()} \u0E1A\u0E32\u0E17
` + (totalUnpaid === 0 ? `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E33\u0E23\u0E30: \u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E41\u0E25\u0E49\u0E27 \u2713

` : `\u2022 \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2A\u0E38\u0E17\u0E18\u0E34\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14: ${totalUnpaid.toLocaleString()} \u0E1A\u0E32\u0E17

`) + `\u{1F517} \u0E40\u0E1B\u0E34\u0E14\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 \u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14 \u0E41\u0E25\u0E30\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E17\u0E38\u0E01\u0E0A\u0E38\u0E14\u0E41\u0E1A\u0E1A Real-Time \u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48\u0E04\u0E48\u0E30:
${portalUrl}

\u0E02\u0E2D\u0E1A\u0E1E\u0E23\u0E30\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E43\u0E2B\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D NUNUH \u0E14\u0E39\u0E41\u0E25\u0E0A\u0E38\u0E14\u0E2A\u0E27\u0E22\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E48\u0E30 \u{1F496}\u2728`;
}
function formatCustomerOrdersReport(matchedOrders, baseAppUrl, userId) {
  if (!matchedOrders || matchedOrders.length === 0) return "";
  if (matchedOrders.length === 1) {
    return formatSingleOrderLineMessage(matchedOrders[0], baseAppUrl, userId);
  }
  return formatMultipleOrdersLineMessage(matchedOrders, baseAppUrl, userId);
}
function buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, userId) {
  if (!matchedOrders || matchedOrders.length === 0) return null;
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  const bubbles = matchedOrders.slice(0, 10).map((order, idx) => {
    const stCfg = getStatusDetails(order.status);
    const delDate = formatThaiDate(order.deliveryDate);
    const price = Number(order.price || 0);
    const deposit = Number(order.deposit || 0);
    const discount = Number(order.discount || 0);
    const finalPaid = Number(order.finalPaymentAmount || 0);
    const unpaid = Math.max(0, price - deposit - discount - finalPaid);
    const singleOrderUrl = `${cleanBase}/?mode=customer&search=${encodeURIComponent(order.orderNumber)}${userParam}`;
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#211C1A",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "\u269C\uFE0F NUNUH BOUTIQUE",
                weight: "bold",
                color: "#D4AF37",
                size: "xs",
                flex: 1
              },
              {
                type: "text",
                text: matchedOrders.length > 1 ? `#${idx + 1} \u0E08\u0E32\u0E01 ${matchedOrders.length}` : "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14",
                color: "#E2D9D0",
                size: "xxs",
                align: "end"
              }
            ]
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: order.orderNumber || "NU-ORDER",
                weight: "bold",
                size: "lg",
                color: "#211C1A",
                flex: 1
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: stCfg.badgeColor,
                cornerRadius: "8px",
                paddingStart: "8px",
                paddingEnd: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [
                  {
                    type: "text",
                    text: stCfg.label.split(". ")[1] || stCfg.label,
                    color: "#FFFFFF",
                    size: "xxs",
                    weight: "bold"
                  }
                ]
              }
            ]
          },
          {
            type: "text",
            text: order.dressType || "\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E1E\u0E34\u0E40\u0E28\u0E29",
            weight: "bold",
            size: "sm",
            color: "#8B5E3C",
            wrap: true
          },
          {
            type: "separator",
            margin: "sm",
            color: "#F0EAE1"
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F464} \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: order.customerName || "-", size: "xxs", color: "#211C1A", weight: "bold", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F9F5} \u0E0A\u0E19\u0E34\u0E14\u0E1C\u0E49\u0E32", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: `${order.fabricType || "-"} (${order.fabricColor || "-"})`, size: "xxs", color: "#211C1A", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: delDate, size: "xxs", color: "#D97706", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F4B0} \u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19", size: "xxs", color: "#8E8882", width: "70px" },
                  {
                    type: "text",
                    text: unpaid === 0 ? "\u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27 \u2713" : `\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ${unpaid.toLocaleString()} \u0E1A.`,
                    size: "xxs",
                    color: unpaid === 0 ? "#059669" : "#DC2626",
                    weight: "bold"
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        spacing: "xs",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#8B5E3C",
            height: "sm",
            action: {
              type: "uri",
              label: "\u{1F50D} \u0E14\u0E39\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 & \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21 Real-Time",
              uri: singleOrderUrl
            }
          }
        ]
      }
    };
  });
  if (bubbles.length === 1) {
    return {
      type: "flex",
      altText: `\u269C\uFE0F \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C ${matchedOrders[0].orderNumber} (${matchedOrders[0].dressType})`,
      contents: bubbles[0]
    };
  }
  return {
    type: "flex",
    altText: `\u269C\uFE0F \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${matchedOrders.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 (NUNUH Boutique)`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}
function formatOrderNotFoundMessage(originalText) {
  return `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u274C \u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22\u0E04\u0E48\u0E30 \u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A "${originalText}"

\u{1F4CC} \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34:
\u2022 \u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C \u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E44\u0E27\u0E49\u0E15\u0E2D\u0E19\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27 (\u0E40\u0E0A\u0E48\u0E19 0801462230 \u0E2B\u0E23\u0E37\u0E2D 086-555-1234)
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 \u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C (\u0E40\u0E0A\u0E48\u0E19 NU-26002 \u0E2B\u0E23\u0E37\u0E2D 26002)

\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E48\u0E07\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E17\u0E48\u0E32\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 \u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E1A\u0E1A Real-Time \u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21. \u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
}
function formatNewOrderCustomerConfirmation(order, baseAppUrl) {
  const formattedDelivery = formatThaiDate(order.deliveryDate);
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const userParam = order.lineUserId ? `&lineUserId=${encodeURIComponent(order.lineUserId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  return `\u269C\uFE0F \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14 NUNUH Boutique \u269C\uFE0F

\u{1F464} \u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E38\u0E13: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}
\u{1F9FE} \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C: ${order.orderNumber}
\u{1F457} \u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14: ${order.dressType}
\u{1F9F5} \u0E0A\u0E19\u0E34\u0E14\u0E1C\u0E49\u0E32: ${order.fabricType || "\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38"} (${order.fabricColor || "-"})
\u{1F4CD} \u0E2A\u0E16\u0E32\u0E19\u0E30: [1. \u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22]
\u{1F4C5} \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01: ${formatThaiDate(order.orderDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0])}
\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A: ${formattedDelivery}

\u{1F4B0} \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19:
\u2022 \u0E23\u0E32\u0E04\u0E32\u0E23\u0E27\u0E21: ${Number(order.price || 0).toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E0A\u0E33\u0E23\u0E30\u0E21\u0E31\u0E14\u0E08\u0E33\u0E41\u0E25\u0E49\u0E27: ${Number(order.deposit || 0).toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14: ${Math.max(0, Number(order.price || 0) - Number(order.deposit || 0) - Number(order.discount || 0)).toLocaleString()} \u0E1A\u0E32\u0E17

\u{1F517} \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E07\u0E32\u0E19\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E27\u0E31\u0E14 \u0E41\u0E25\u0E30\u0E20\u0E32\u0E1E\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14\u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E19\u0E35\u0E49\u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21.:
${portalUrl}

\u0E02\u0E2D\u0E1A\u0E1E\u0E23\u0E30\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E43\u0E2B\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D NUNUH \u0E14\u0E39\u0E41\u0E25\u0E0A\u0E38\u0E14\u0E2A\u0E27\u0E22\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E48\u0E30 \u{1F496}\u2728`;
}
function formatNewOrderOwnerAlert(order, baseAppUrl) {
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}`;
  return `\u{1F514} [\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E23\u0E49\u0E32\u0E19] \u0E21\u0E35\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A!

\u{1F9FE} \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C: ${order.orderNumber}
\u{1F464} \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32: ${order.customerName}
\u{1F4DE} \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23: ${order.customerPhone || "-"}
\u{1F457} \u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14: ${order.dressType}
\u{1F4B0} \u0E23\u0E32\u0E04\u0E32\u0E23\u0E27\u0E21: ${Number(order.price || 0).toLocaleString()} \u0E1A\u0E32\u0E17 (\u0E21\u0E31\u0E14\u0E08\u0E33: ${Number(order.deposit || 0).toLocaleString()} \u0E1A.)
\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07: ${formatThaiDate(order.deliveryDate)}
\u{1F4CD} \u0E2A\u0E32\u0E02\u0E32: ${order.branch || "\u0E2A\u0E32\u0E02\u0E32\u0E2B\u0E25\u0E31\u0E01"}
\u{1F464} \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E42\u0E14\u0E22: ${order.staffName || "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19"}

\u{1F517} \u0E25\u0E34\u0E07\u0E01\u0E4C\u0E15\u0E23\u0E27\u0E08\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C: ${portalUrl}`;
}

// server.ts
dotenv2.config();
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var geminiClient = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}
async function generateAiFashionReply(userMessage, customerName) {
  const client = getGeminiClient();
  if (!client) {
    return `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u{1F4CC} \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34:
\u2022 \u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C \u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E44\u0E27\u0E49\u0E15\u0E2D\u0E19\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27 (\u0E40\u0E0A\u0E48\u0E19 086-555-1234)
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C (\u0E40\u0E0A\u0E48\u0E19 NU-26008)
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 \u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19

\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E2A\u0E48\u0E07\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E38\u0E14 \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 \u0E41\u0E25\u0E30\u0E04\u0E34\u0E27\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E43\u0E2B\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E04\u0E48\u0E30 \u2728`;
  }
  try {
    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userMessage,
      config: {
        systemInstruction: `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22 AI \u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E23\u0E49\u0E32\u0E19 "NUNUH Boutique" (\u0E19\u0E39\u0E40\u0E2B\u0E19\u0E32\u0E30\u0E2B\u0E4C \u0E1A\u0E39\u0E17\u0E35\u0E04 - \u0E23\u0E49\u0E32\u0E19\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E1C\u0E49\u0E32\u0E2A\u0E15\u0E23\u0E35 \u0E0A\u0E38\u0E14\u0E40\u0E14\u0E23\u0E2A \u0E0A\u0E38\u0E14\u0E23\u0E32\u0E15\u0E23\u0E35 \u0E0A\u0E38\u0E14\u0E40\u0E08\u0E49\u0E32\u0E2A\u0E32\u0E27 \u0E0A\u0E38\u0E14\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49 \u0E41\u0E25\u0E30\u0E0A\u0E38\u0E14\u0E2D\u0E2D\u0E01\u0E07\u0E32\u0E19\u0E1E\u0E23\u0E35\u0E40\u0E21\u0E35\u0E22\u0E21).
\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13:
1. \u0E15\u0E2D\u0E1A\u0E04\u0E33\u0E16\u0E32\u0E21\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E43\u0E19 LINE \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E38\u0E20\u0E32\u0E1E \u0E44\u0E1E\u0E40\u0E23\u0E32\u0E30 \u0E2D\u0E48\u0E2D\u0E19\u0E2B\u0E27\u0E32\u0E19 \u0E40\u0E1B\u0E47\u0E19\u0E01\u0E31\u0E19\u0E40\u0E2D\u0E07 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E1A\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E0A\u0E31\u0E49\u0E19\u0E19\u0E33 (\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22\u0E04\u0E48\u0E30/\u0E19\u0E30\u0E04\u0E30)
2. \u0E41\u0E19\u0E30\u0E19\u0E33\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14 \u0E2A\u0E35\u0E1C\u0E49\u0E32 \u0E17\u0E23\u0E07\u0E01\u0E23\u0E30\u0E42\u0E1B\u0E23\u0E07 \u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1C\u0E49\u0E32\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49 \u0E01\u0E32\u0E23\u0E14\u0E39\u0E41\u0E25\u0E23\u0E31\u0E01\u0E29\u0E32\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14 \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E32\u0E23\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E15\u0E31\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E21\u0E32\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27\u0E17\u0E35\u0E48\u0E23\u0E49\u0E32\u0E19
3. \u0E2B\u0E32\u0E01\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E47\u0E04\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A \u0E43\u0E2B\u0E49\u0E41\u0E08\u0E49\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E38\u0E48\u0E21\u0E19\u0E27\u0E25\u0E27\u0E48\u0E32 "\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C \u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E43\u0E19\u0E41\u0E0A\u0E17\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E17\u0E31\u0E19\u0E17\u0E35\u0E04\u0E48\u0E30"
4. \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A \u0E2D\u0E48\u0E32\u0E19\u0E07\u0E48\u0E32\u0E22\u0E1A\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D (\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 2-4 \u0E22\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32 \u0E44\u0E21\u0E48\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B) \u0E43\u0E0A\u0E49 emoji \u0E2A\u0E44\u0E15\u0E25\u0E4C\u0E1E\u0E23\u0E35\u0E40\u0E21\u0E35\u0E22\u0E21 \u0E40\u0E0A\u0E48\u0E19 \u269C\uFE0F \u2728 \u{1F457} \u2702\uFE0F \u{1F496} \u0E44\u0E14\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E2A\u0E21`
      }
    });
    return response.text?.trim() || "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30 NUNUH Boutique \u0E22\u0E34\u0E19\u0E14\u0E35\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E30 \u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E0A\u0E38\u0E14 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728";
  } catch (err) {
    console.error("Gemini AI generation error:", err);
    return `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u{1F4CC} \u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
  }
}
app.use(express.json({
  limit: "50mb",
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
var ORDERS_FILE = path.join(process.cwd(), "orders.json");
var DELETED_ORDERS_FILE = path.join(process.cwd(), "deleted_orders.json");
var CATALOGUE_FILE = path.join(process.cwd(), "catalogue.json");
var SETTINGS_FILE = path.join(process.cwd(), "settings.json");
var REVIEWS_FILE = path.join(process.cwd(), "reviews.json");
var lastKnownPublicUrl = "";
var cachedOrders = null;
var cachedDeletedOrders = null;
var cachedCatalogue = null;
var cachedSettings = null;
var cachedReviews = null;
function safeAtomicWriteJson(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  const backupPath = `${filePath}.bak`;
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonString, "utf8");
    fs.renameSync(tempPath, filePath);
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch (_) {
    }
    return true;
  } catch (err) {
    console.error(`\u274C Error writing to file ${filePath}:`, err);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {
    }
    return false;
  }
}
function safeResilientReadJson(filePath, fallback) {
  const backupPath = `${filePath}.bak`;
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (raw && raw.trim()) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`\u26A0\uFE0F Warning: primary JSON file ${filePath} parse failed, trying backup:`, err?.message || err);
    }
  }
  if (fs.existsSync(backupPath)) {
    try {
      const rawBak = fs.readFileSync(backupPath, "utf8");
      if (rawBak && rawBak.trim()) {
        const parsed = JSON.parse(rawBak);
        console.log(`\u2705 Successfully recovered ${filePath} from backup file.`);
        safeAtomicWriteJson(filePath, parsed);
        return parsed;
      }
    } catch (bakErr) {
      console.error(`\u274C Backup file ${backupPath} also unreadable:`, bakErr);
    }
  }
  return fallback;
}
var firebaseConfig = {
  apiKey: "AIzaSyDbt86w9Tl3HTlmlQwr4P7StoBKyEC56vc",
  authDomain: "nuhpre-order.firebaseapp.com",
  projectId: "nuhpre-order",
  storageBucket: "nuhpre-order.firebasestorage.app",
  messagingSenderId: "81774640286",
  appId: "1:81774640286:web:e596d6d5bb638d11380f8f",
  measurementId: "G-YNVY3Y03PY"
};
var firestoreDb = null;
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
async function readDeletedOrdersOnServer() {
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
    const fileDeleted = safeResilientReadJson(DELETED_ORDERS_FILE, cachedDeletedOrders || []);
    if (fileDeleted && Array.isArray(fileDeleted)) {
      cachedDeletedOrders = fileDeleted;
      return fileDeleted;
    }
  } catch (err) {
    console.error("Error reading deleted orders from file:", err);
  }
  return cachedDeletedOrders || [];
}
async function readOrdersOnServer() {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "orders"));
      if (!snap.empty) {
        const firestoreOrders = [];
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
  try {
    const fileOrders = safeResilientReadJson(ORDERS_FILE, cachedOrders || []);
    if (fileOrders && Array.isArray(fileOrders) && fileOrders.length > 0) {
      cachedOrders = fileOrders;
      return fileOrders;
    }
  } catch (err) {
    console.error("Error reading orders from file:", err);
  }
  return cachedOrders || [];
}
async function writeOrdersOnServer(orders) {
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
function sanitizeForFirestore(obj) {
  if (obj === null || obj === void 0) return null;
  if (Array.isArray(obj)) {
    return obj.filter((item) => item !== void 0).map((item) => sanitizeForFirestore(item));
  }
  if (typeof obj === "object") {
    const res = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== void 0) {
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
  try {
    onSnapshot(doc(db, "settings", "deleted_orders"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.deletedIds)) {
          const combined = Array.from(/* @__PURE__ */ new Set([...cachedDeletedOrders || [], ...data.deletedIds]));
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
  try {
    onSnapshot(collection(db, "orders"), async (snapshot) => {
      const currentDeleted = cachedDeletedOrders || [];
      const delSet = new Set(currentDeleted);
      let hasZombie = false;
      const validFromFirestore = [];
      snapshot.forEach((docSnap) => {
        const orderId = docSnap.id;
        if (delSet.has(orderId)) {
          hasZombie = true;
          console.warn(`[Firestore Sentinel] Zombie order detected in Firestore: ${orderId}. Purging immediately.`);
          deleteDoc(doc(db, "orders", orderId)).catch(() => {
          });
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
      if (validFromFirestore.length > 0) {
        try {
          const current = await readOrdersOnServer();
          const map = /* @__PURE__ */ new Map();
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
              const existing = map.get(fo.id);
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
              return (b.orderNumber || "").localeCompare(a.orderNumber || "", void 0, { numeric: true });
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
  getDocs(collection(db, "orders")).then((snap) => {
    snap.forEach(async (docSnap) => {
      if (cachedDeletedOrders && cachedDeletedOrders.includes(docSnap.id)) {
        console.warn(`[Firestore Sentinel] Initial purge of zombie order ${docSnap.id}`);
        await deleteDoc(doc(db, "orders", docSnap.id)).catch(() => {
        });
      }
    });
  }).catch(() => {
  });
}
async function writeDeletedOrdersOnServer(ids, newDeletedId) {
  cachedDeletedOrders = ids;
  if (isPostgresActive() && newDeletedId) {
    try {
      await deleteOrderInDb(newDeletedId);
    } catch (e) {
      console.error("Error deleting order in DB:", e);
    }
  }
  const db = getFirestoreDb();
  if (db) {
    try {
      setDoc(doc(db, "settings", "deleted_orders"), {
        deletedIds: arrayUnion(...ids),
        _syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true }).catch(() => {
      });
      if (newDeletedId) {
        deleteDoc(doc(db, "orders", newDeletedId)).catch(() => {
        });
      }
    } catch (e) {
    }
  }
  safeAtomicWriteJson(DELETED_ORDERS_FILE, ids);
}
async function readCatalogueOnServer() {
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
    const fileCat = safeResilientReadJson(CATALOGUE_FILE, cachedCatalogue || []);
    if (fileCat && Array.isArray(fileCat)) {
      cachedCatalogue = fileCat;
      return fileCat;
    }
  } catch (err) {
    console.error("Error reading catalogue from file:", err);
  }
  return cachedCatalogue || [];
}
async function writeCatalogueOnServer(data) {
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
async function readSettingsOnServer() {
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
    const fileSettings = safeResilientReadJson(SETTINGS_FILE, cachedSettings || {});
    if (fileSettings && typeof fileSettings === "object") {
      cachedSettings = fileSettings;
      return fileSettings;
    }
  } catch (err) {
    console.error("Error reading settings from file:", err);
  }
  return cachedSettings || {};
}
async function writeSettingsOnServer(data) {
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
async function readReviewsOnServer() {
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
    const fileReviews = safeResilientReadJson(REVIEWS_FILE, cachedReviews || []);
    if (fileReviews && Array.isArray(fileReviews)) {
      cachedReviews = fileReviews;
      return fileReviews;
    }
  } catch (err) {
    console.error("Error reading reviews from file:", err);
  }
  return cachedReviews || [];
}
async function writeReviewsOnServer(data) {
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
var sseClients = [];
var activeStaffSessions = [];
function cleanStaleStaffSessions() {
  const now = Date.now();
  const initialCount = activeStaffSessions.length;
  activeStaffSessions = activeStaffSessions.filter((s) => now - s.lastSeen < 45e3);
  return activeStaffSessions.length !== initialCount;
}
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
}, 1e4);
function broadcastSSEEvent(type, data) {
  const payload = `data: ${JSON.stringify({ type, data })}

`;
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
  res.write(`data: ${JSON.stringify({ type: "connected" })}

`);
  req.on("close", () => {
    const idx = sseClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});
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
  const existingIdx = activeStaffSessions.findIndex((s) => s.id === id);
  if (existingIdx !== -1) {
    activeStaffSessions[existingIdx].lastSeen = now;
    if (branch) activeStaffSessions[existingIdx].branch = branch;
    if (name) activeStaffSessions[existingIdx].name = name;
  } else {
    activeStaffSessions.push({
      id,
      name,
      branch: branch || "\u0E2A\u0E32\u0E02\u0E32\u0E19\u0E23\u0E32\u0E18\u0E34\u0E27\u0E32\u0E2A",
      loginTime: loginTime || now,
      lastSeen: now
    });
  }
  broadcastSSEEvent("staff_updated", activeStaffSessions);
  res.json({ success: true, activeStaff: activeStaffSessions });
});
app.post("/api/staff/logout", (req, res) => {
  const { id } = req.body || {};
  if (id) {
    activeStaffSessions = activeStaffSessions.filter((s) => s.id !== id);
  } else {
    activeStaffSessions = [];
  }
  broadcastSSEEvent("staff_updated", activeStaffSessions);
  res.json({ success: true, activeStaff: activeStaffSessions });
});
app.get("/api/db-status", (req, res) => {
  res.json({
    postgresActive: isPostgresActive(),
    mode: isPostgresActive() ? "PostgreSQL (Cloud Database)" : "Local Persistent JSON File Mode",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
  });
});
app.get("/api/orders", async (req, res) => {
  const serverOrders = await readOrdersOnServer();
  const deletedIds = await readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);
  const cleanOrders = serverOrders.filter((o) => !deletedSet.has(o.id));
  res.json(cleanOrders);
});
app.get("/api/deleted-orders", async (req, res) => {
  const deletedIds = await readDeletedOrdersOnServer();
  res.json({ deletedIds });
});
app.delete("/api/orders", async (req, res) => {
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
  const updated = current.filter((o) => o.id !== id);
  await writeOrdersOnServer(updated);
  broadcastSSEEvent("order_deleted", { orders: updated, deletedId: id, deletedIds });
  broadcastSSEEvent("orders_updated", { orders: updated, deletedId: id, deletedIds });
  res.json({ success: true, orders: updated, deletedId: id, deletedIds });
});
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const deletedIds = await readDeletedOrdersOnServer();
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await writeDeletedOrdersOnServer(deletedIds, id);
  }
  const current = await readOrdersOnServer();
  const updated = current.filter((o) => o.id !== id);
  await writeOrdersOnServer(updated);
  broadcastSSEEvent("order_deleted", { orders: updated, deletedId: id, deletedIds });
  broadcastSSEEvent("orders_updated", { orders: updated, deletedId: id, deletedIds });
  res.json({ success: true, orders: updated, deletedId: id, deletedIds });
});
app.post("/api/orders", async (req, res) => {
  const { orders: incomingOrders, publicUrl } = req.body;
  if (publicUrl) {
    lastKnownPublicUrl = publicUrl;
  }
  const deletedIds = await readDeletedOrdersOnServer();
  const deletedSet = new Set(deletedIds);
  if (Array.isArray(incomingOrders)) {
    const current = await readOrdersOnServer();
    const map = /* @__PURE__ */ new Map();
    for (const o of current) {
      if (!deletedSet.has(o.id)) {
        map.set(o.id, o);
      }
    }
    for (const o of incomingOrders) {
      if (deletedSet.has(o.id)) continue;
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const existing = map.get(o.id);
        const existingTime = existing.updatedAt || 0;
        const incomingTime = o.updatedAt || 0;
        if (incomingTime >= existingTime) {
          map.set(o.id, { ...existing, ...o });
        }
      }
    }
    const fullyMerged = Array.from(map.values()).sort((a, b) => {
      return (b.orderNumber || "").localeCompare(a.orderNumber || "", void 0, { numeric: true });
    });
    await writeOrdersOnServer(fullyMerged);
    broadcastSSEEvent("orders_updated", { orders: fullyMerged, deletedIds });
    const db = getFirestoreDb();
    if (db) {
      for (const o of incomingOrders) {
        if (o && o.id && !deletedSet.has(o.id)) {
          const sanitized = sanitizeForFirestore({
            ...o,
            _syncedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          setDoc(doc(db, "orders", o.id), sanitized, { merge: true }).catch((err) => {
            console.warn(`[Server] Firestore write error for order ${o.id}:`, err);
          });
        }
      }
    }
    res.json(fullyMerged);
  } else if (Array.isArray(req.body)) {
    const current = await readOrdersOnServer();
    const map = /* @__PURE__ */ new Map();
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
        const existing = map.get(o.id);
        const existingTime = existing.updatedAt || 0;
        const incomingTime = o.updatedAt || 0;
        if (incomingTime >= existingTime) {
          map.set(o.id, { ...existing, ...o });
        }
      }
    }
    const fullyMerged = Array.from(map.values()).sort((a, b) => {
      return (b.orderNumber || "").localeCompare(a.orderNumber || "", void 0, { numeric: true });
    });
    await writeOrdersOnServer(fullyMerged);
    broadcastSSEEvent("orders_updated", { orders: fullyMerged, deletedIds });
    const db = getFirestoreDb();
    if (db) {
      for (const o of req.body) {
        if (o && o.id && !deletedSet.has(o.id)) {
          const sanitized = sanitizeForFirestore({
            ...o,
            _syncedAt: (/* @__PURE__ */ new Date()).toISOString()
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
  if (incoming && typeof incoming === "object") {
    const current = await readSettingsOnServer();
    const filteredIncoming = { ...incoming };
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
async function getEffectiveLineConfig(req) {
  const settings = await readSettingsOnServer();
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || settings.lineChannelAccessToken || "").trim();
  const secret = (process.env.LINE_CHANNEL_SECRET || settings.lineChannelSecret || "").trim();
  const oaId = (settings.lineOaId || process.env.LINE_OA_ID || "@237aynfq").trim();
  const host = req ? req.get("x-forwarded-host") || req.get("host") : "";
  const proto = req ? req.get("x-forwarded-proto") || "https" : "https";
  const requestBaseUrl = host ? `${proto}://${host}` : "";
  const configuredUrl = (settings.publicUrl || "").trim();
  const validConfigured = configuredUrl && !configuredUrl.includes("nunuh-pre-order2026.onrender.com") && !configuredUrl.includes("nunuh.onrender.com") ? configuredUrl : "";
  const appUrl = (process.env.APP_URL || "").trim();
  const rawBaseUrl = validConfigured || appUrl || requestBaseUrl || lastKnownPublicUrl || process.env.PUBLIC_APP_URL || "";
  const cleanBase = (rawBaseUrl || "").replace(/\/+$/, "");
  const webhookUrl = cleanBase ? `${cleanBase}/api/webhook/line` : "/api/webhook/line";
  return {
    token,
    secret,
    oaId,
    webhookUrl,
    hasToken: Boolean(token),
    hasSecret: Boolean(secret),
    source: process.env.LINE_CHANNEL_ACCESS_TOKEN ? "env" : settings.lineChannelAccessToken ? "settings" : "none"
  };
}
app.post("/api/send-status", async (req, res) => {
  let { userId, orderId, orderNumber, customerPhone, message } = req.body || {};
  const lineConfig = await getEffectiveLineConfig(req);
  const LINE_CHANNEL_ACCESS_TOKEN = lineConfig.token;
  if (!userId && (orderId || orderNumber || customerPhone)) {
    try {
      const orders = await readOrdersOnServer();
      const matched = orders.find(
        (o) => orderId && o.id === orderId || orderNumber && o.orderNumber?.toLowerCase() === orderNumber?.toLowerCase() || customerPhone && o.customerPhone?.replace(/\D/g, "") === customerPhone?.replace(/\D/g, "")
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
      message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A LINE User ID \u0E02\u0E2D\u0E07\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E23\u0E32\u0E22\u0E19\u0E35\u0E49 (\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E48\u0E07\u0E43\u0E19\u0E41\u0E1C\u0E07\u0E41\u0E0A\u0E17\u0E43\u0E2B\u0E49\u0E04\u0E48\u0E30)"
    });
  }
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("\u26A0\uFE0F LINE_CHANNEL_ACCESS_TOKEN not set, simulating push message sending to userId:", userId);
    return res.json({
      success: true,
      simulated: true,
      hasUserId: true,
      hasToken: false,
      message: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E30\u0E1A\u0E38 LINE Channel Access Token \u0E43\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 (\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E0A\u0E17\u0E43\u0E2B\u0E49\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30)"
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
      console.log(`\u2705 Push message sent successfully to User ID: ${userId}`);
      return res.json({ success: true, hasUserId: true, hasToken: true, simulated: false });
    } else {
      const errText = await response.text();
      console.error(`\u274C Failed to send push message to LINE: ${errText}`);
      return res.status(response.status).json({ error: errText, hasUserId: true, hasToken: true });
    }
  } catch (err) {
    console.error("\u274C Error sending push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
app.post("/api/notify-order-created", async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!order) {
      return res.status(400).json({ error: "Order object is required" });
    }
    const settings = await readSettingsOnServer();
    const lineConfig = await getEffectiveLineConfig(req);
    const token = lineConfig.token;
    const baseAppUrl = lineConfig.webhookUrl.replace(/\/api\/webhook\/line$/, "");
    let customerNotified = false;
    let ownerNotified = false;
    if (token) {
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
  } catch (err) {
    console.error("Error in /api/notify-order-created:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
app.post("/api/test-line-push", async (req, res) => {
  const { targetUserId, testMessage } = req.body || {};
  const lineConfig = await getEffectiveLineConfig(req);
  const token = lineConfig.token;
  if (!token) {
    return res.status(400).json({
      success: false,
      error: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E30\u0E1A\u0E38 LINE Channel Access Token \u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E30\u0E04\u0E30"
    });
  }
  if (!targetUserId || !targetUserId.trim()) {
    return res.status(400).json({
      success: false,
      error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 LINE User ID \u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A (\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22\u0E15\u0E31\u0E27 U \u0E40\u0E0A\u0E48\u0E19 Uf150dba359d90219f8d...)"
    });
  }
  const msgToSend = (testMessage || `\u269C\uFE0F \u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D LINE Messaging API \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08! \u269C\uFE0F
\u0E23\u0E30\u0E1A\u0E1A\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D NUNUH Boutique \u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E01\u0E31\u0E1A LINE \u0E1A\u0E2D\u0E17\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30 \u2728`).trim();
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
      console.log(`\u2705 Test push message successfully delivered to: ${targetUserId}`);
      return res.json({
        success: true,
        targetUserId,
        message: "\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30! \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E19\u0E41\u0E2D\u0E1B LINE \u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19"
      });
    } else {
      const errText = await response.text();
      console.error(`\u274C LINE Test Push API Error: ${errText}`);
      return res.status(response.status).json({
        success: false,
        error: errText,
        helpTip: errText.includes("Invalid reply token") || errText.includes("Not found") ? "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E23\u0E32\u0E22\u0E19\u0E35\u0E49 (\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E04\u0E22\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E01\u0E31\u0E1A LINE Official Account \u0E02\u0E2D\u0E07\u0E17\u0E32\u0E07\u0E23\u0E49\u0E32\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E30\u0E04\u0E30)" : errText.includes("Authentication failed") || errText.includes("Invalid access token") ? "Channel Access Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u0E01\u0E23\u0E38\u0E13\u0E32 Issue Token \u0E43\u0E2B\u0E21\u0E48\u0E08\u0E32\u0E01 LINE Developers Console \u0E04\u0E48\u0E30" : "\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07\u0E08\u0E32\u0E01 LINE API"
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to reach LINE API"
    });
  }
});
app.post("/api/send-overdue-line-alert", async (req, res) => {
  const { targetLineUserId } = req.body || {};
  const settings = await readSettingsOnServer();
  const ownerId = (targetLineUserId || settings.ownerLineUserId || "").trim();
  const orders = await readOrdersOnServer();
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const STATUS_LABELS = {
    RECEIVED: "\u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22",
    DESIGNING: "\u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A/\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A",
    CUTTING: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32",
    SEWING: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A",
    FITTING: "\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07",
    READY: "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A",
    COMPLETED: "\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
  };
  const overdueOrders = orders.filter((o) => {
    if (!o.deliveryDate || o.status === "COMPLETED") return false;
    const delDate = new Date(o.deliveryDate);
    delDate.setHours(0, 0, 0, 0);
    return delDate.getTime() < todayStart.getTime();
  });
  if (overdueOrders.length === 0) {
    return res.json({
      success: true,
      overdueCount: 0,
      message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u0E04\u0E48\u0E30 \u2728"
    });
  }
  let msgText = `\u{1F6A8} [\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D NUNUH - \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07!]
`;
  msgText += `\u0E1E\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${overdueOrders.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E14\u0E31\u0E07\u0E19\u0E35\u0E49\u0E04\u0E48\u0E30:

`;
  overdueOrders.forEach((o, idx) => {
    const delDate = new Date(o.deliveryDate);
    delDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayStart.getTime() - delDate.getTime()) / (1e3 * 3600 * 24));
    const statusText = STATUS_LABELS[o.status] || o.status;
    msgText += `${idx + 1}. \u{1F4CB} \u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C #: ${o.orderNumber || o.id}
`;
    msgText += `   \u{1F464} \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32: ${o.customerName} (${o.customerPhone || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E1A\u0E2D\u0E23\u0E4C"})
`;
    msgText += `   \u{1F457} \u0E0A\u0E38\u0E14: ${o.dressType || "\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14"} ${o.branch ? `[${o.branch}]` : ""}
`;
    msgText += `   \u{1F4C5} \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07: ${o.deliveryDate} (\u26A0\uFE0F \u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14 ${diffDays} \u0E27\u0E31\u0E19)
`;
    msgText += `   \u{1F4CC} \u0E2A\u0E16\u0E32\u0E19\u0E30: ${statusText}

`;
  });
  msgText += `\u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E40\u0E23\u0E48\u0E07\u0E23\u0E31\u0E14\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E19\u0E30\u0E04\u0E30 \u{1F64F}`;
  if (!ownerId) {
    return res.status(400).json({
      error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A LINE User ID \u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E23\u0E49\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E30\u0E04\u0E30",
      generatedMessage: msgText,
      overdueCount: overdueOrders.length
    });
  }
  const lineConfig = await getEffectiveLineConfig(req);
  const LINE_CHANNEL_ACCESS_TOKEN = lineConfig.token;
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("\u26A0\uFE0F LINE_CHANNEL_ACCESS_TOKEN not set, simulating overdue push message.");
    return res.json({
      success: true,
      simulated: true,
      overdueCount: overdueOrders.length,
      messageText: msgText,
      message: "\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E33\u0E25\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E43\u0E2A\u0E48 LINE Channel Access Token)"
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
      console.log(`\u2705 Overdue alert sent successfully to Owner LINE ID: ${ownerId}`);
      return res.json({
        success: true,
        overdueCount: overdueOrders.length,
        messageText: msgText
      });
    } else {
      const errText = await response.text();
      console.error(`\u274C Failed to send overdue push message to LINE: ${errText}`);
      return res.status(response.status).json({
        error: errText,
        generatedMessage: msgText,
        overdueCount: overdueOrders.length
      });
    }
  } catch (err) {
    console.error("\u274C Error sending overdue push message:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
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
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to query LINE webhook endpoint" });
  }
});
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
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to test LINE webhook" });
  }
});
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
      const cleanBase = endpoint.replace(/\/api\/webhook\/line$/, "").replace(/\/webhook\/line$/, "");
      const settings = await readSettingsOnServer();
      settings.publicUrl = cleanBase;
      await writeSettingsOnServer(settings);
      return res.json({ success: true, endpoint: endpoint.trim() });
    } else {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to set LINE webhook endpoint" });
  }
});
app.get(["/api/webhook/line", "/webhook/line", "/api/line/webhook", "/api/line-webhook"], (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "LINE Webhook endpoint is active and ready for Messaging API events.",
    hasToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasSecret: Boolean(process.env.LINE_CHANNEL_SECRET)
  });
});
app.post(["/api/webhook/line", "/webhook/line", "/api/line/webhook", "/api/line-webhook"], async (req, res) => {
  try {
    const lineConfig = await getEffectiveLineConfig(req);
    const LINE_CHANNEL_SECRET = (lineConfig.secret || process.env.LINE_CHANNEL_SECRET || "").trim();
    const LINE_CHANNEL_ACCESS_TOKEN = (lineConfig.token || process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const signature = req.headers["x-line-signature"];
    const bodyString = req.rawBody || JSON.stringify(req.body);
    console.log("--- LINE Webhook Event Received ---");
    if (signature) {
      console.log("Signature from header:", signature);
    }
    if (LINE_CHANNEL_SECRET && signature) {
      const hash = crypto.createHmac("SHA256", LINE_CHANNEL_SECRET).update(bodyString).digest("base64");
      if (hash !== signature) {
        console.warn("\u26A0\uFE0F LINE Signature mismatch. Computed hash:", hash, "vs Header signature:", signature);
      } else {
        console.log("\u2705 LINE Webhook Signature validated successfully!");
      }
    }
    const events = req.body?.events || [];
    console.log(`Processing ${events.length} event(s)...`);
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = event.message.text.trim();
        const text = originalText.toLowerCase();
        console.log(`Received user text message: "${originalText}"`);
        const orders = await readOrdersOnServer();
        const matchedOrders = smartMatchOrders(originalText, orders, event.source?.userId);
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
        let replyMessage = "";
        const proto = req.get("x-forwarded-proto") || "https";
        const host = req.get("x-forwarded-host") || req.get("host");
        const settings = await readSettingsOnServer();
        const configuredUrl = (settings.publicUrl || "").trim();
        const appUrl = (process.env.APP_URL || "").trim();
        const baseAppUrl = (configuredUrl || appUrl || lastKnownPublicUrl || (host ? `${proto}://${host}` : "") || process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "");
        if (matchedOrders.length === 0) {
          const digits = originalText.replace(/\D/g, "");
          const isLikelySearch = digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText) || originalText.length >= 2;
          if (isLikelySearch && (digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText))) {
            replyMessage = formatOrderNotFoundMessage(originalText);
          } else {
            try {
              replyMessage = await generateAiFashionReply(originalText);
            } catch (e) {
              replyMessage = `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E0A\u0E38\u0E14 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C/\u0E0A\u0E37\u0E48\u0E2D/\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E07\u0E32\u0E19\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E44\u0E14\u0E49\u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21. \u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
            }
          }
        } else {
          replyMessage = formatCustomerOrdersReport(matchedOrders, baseAppUrl, event.source?.userId);
        }
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          try {
            const flexObj = matchedOrders.length > 0 ? buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, event.source?.userId) : null;
            const messagesPayload = [];
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
                replyToken,
                messages: messagesPayload
              })
            });
            if (!response.ok && flexObj) {
              const flexErr = await response.text();
              console.warn("\u26A0\uFE0F LINE reply with Flex failed, falling back to pure text message. Status:", response.status, "Error:", flexErr);
              response = await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [{ type: "text", text: replyMessage }]
                })
              });
            }
            if (!response.ok) {
              const errBody = await response.text();
              console.error("\u274C Failed to send LINE reply. HTTP status:", response.status, "Response:", errBody);
            } else {
              console.log(`\u2705 Send LINE reply successful for ${matchedOrders.length} order(s)!`);
            }
          } catch (err) {
            console.error("\u274C Error sending LINE reply:", err);
          }
        }
      }
    }
    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("\u274C Error in LINE Webhook handler:", error);
    return res.status(200).json({ message: "OK" });
  }
});
app.post("/api/chat/gemini", async (req, res) => {
  try {
    const { message, customerName } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    const reply = await generateAiFashionReply(message, customerName);
    return res.json({ reply, success: true });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});
async function startServer() {
  await initDb();
  initFirestoreSentinel();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} NUNUH Full-Stack Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.js.map
