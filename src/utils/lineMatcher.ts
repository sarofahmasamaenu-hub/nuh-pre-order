/**
 * Smart matching and notification formatters for LINE Messaging API & Customer queries
 * NUNUH Boutique - Premier Tailoring Atelier
 */

export interface StatusConfig {
  label: string;
  desc: string;
  icon: string;
  badgeColor: string; // Hex color for LINE Flex
}

export const STATUS_MAP_TH: Record<string, StatusConfig> = {
  RECEIVED: { label: "1. รับออเดอร์เรียบร้อย", desc: "บันทึกข้อมูลและสัดส่วนเข้าระบบเรียบร้อยแล้ว", icon: "📋", badgeColor: "#3B82F6" },
  DESIGNING: { label: "2. สรุปแบบ/เตรียมผ้า", desc: "วางแพทเทิร์น ออกแบบ และเตรียมผ้าตัดเย็บ", icon: "✏️", badgeColor: "#6366F1" },
  FABRIC_ORDERED: { label: "สั่งผ้า/อะไหล่", desc: "อยู่ระหว่างรอผ้าหรืออุปกรณ์สั่งพิเศษ", icon: "📦", badgeColor: "#8B5CF6" },
  FABRIC_RECEIVED: { label: "ได้รับผ้าแล้ว", desc: "ผ้าและอุปกรณ์จัดเตรียมครบถ้วน พร้อมขึ้นแบบ", icon: "🧵", badgeColor: "#8B5CF6" },
  PATTERN_MAKING: { label: "สร้างแพทเทิร์น", desc: "สร้างแบบแพทเทิร์นตามสัดส่วนเฉพาะบุคคล", icon: "📐", badgeColor: "#EC4899" },
  CUTTING: { label: "3. ขึ้นแบบและตัดผ้า", desc: "ช่างตัดผ้าตามแพทเทิร์นเรียบร้อยแล้ว", icon: "✂️", badgeColor: "#F59E0B" },
  SEWING: { label: "4. กำลังเย็บประกอบ", desc: "ช่างกำลังเย็บขึ้นโครงชุดและเก็บรายละเอียด", icon: "🪡", badgeColor: "#F59E0B" },
  PATTERN_SEWING: { label: "ทำแพทเทิร์น/ตัดเย็บ", desc: "กำลังสร้างแพทเทิร์นและเย็บประกอบชุด", icon: "🪡", badgeColor: "#F59E0B" },
  FIRST_FITTING_READY: { label: "พร้อมลองโครงชุด", desc: "โครงชุดพร้อมสำหรับการลองโครงครั้งที่ 1", icon: "👗", badgeColor: "#A855F7" },
  FIRST_FITTING_DONE: { label: "ลองโครงเรียบร้อย", desc: "ปรับแก้สัดส่วนตามผลการลองโครงชุด", icon: "✨", badgeColor: "#A855F7" },
  SECOND_FITTING_READY: { label: "พร้อมลองเก็บทรง", desc: "ชุดพร้อมสำหรับการลองเก็บทรงครั้งที่ 2", icon: "👗", badgeColor: "#A855F7" },
  SECOND_FITTING_DONE: { label: "ลองเก็บทรงเรียบร้อย", desc: "ปรับแต่งสัดส่วนรอบสุดท้ายก่อนเก็บรายละเอียด", icon: "✨", badgeColor: "#A855F7" },
  EMBROIDERY: { label: "งานปัก/ลูกไม้", desc: "อยู่ระหว่างงานปัก ประดับคริสตัล หรือติดลูกไม้", icon: "🪡", badgeColor: "#EC4899" },
  HAND_FINISHING: { label: "สอยมือ/เก็บริม", desc: "เก็บรายละเอียดด้วยมือและงานฝีมือประณีต", icon: "🪡", badgeColor: "#EC4899" },
  FITTING: { label: "5. ขั้นตอนฟิตติ้ง", desc: "นัดหมายลองชุดและปรับแต่งทรงตามรูปร่าง", icon: "👗", badgeColor: "#A855F7" },
  ALTERING: { label: "ปรับแก้ทรง", desc: "ช่างกำลังปรับแก้สัดส่วนตามที่นัดฟิตติ้ง", icon: "✂️", badgeColor: "#F97316" },
  VERIFY_DETAILS: { label: "ตรวจสอบรายละเอียด", desc: "ตรวจสอบความถูกต้องของแบบชุดและสัดส่วน", icon: "🔍", badgeColor: "#06B6D4" },
  QUALITY_CHECK: { label: "ตรวจเช็กคุณภาพ (QC)", desc: "ตรวจสอบความประณีตของตะเข็บ ซิป และทรงชุด", icon: "🔍", badgeColor: "#06B6D4" },
  IRONING_PACKING: { label: "รีดอัดและแพ็กชุด", desc: "รีดไอน้ำจัดทรงชุดและแพ็กใส่ถุงคลุมเสื้อผ้า", icon: "👔", badgeColor: "#14B8A6" },
  READY: { label: "6. พร้อมส่งมอบ/รับชุด", desc: "ชุดตัดเย็บเสร็จสมบูรณ์ 100% พร้อมนัดรับชุดหรือจัดส่ง", icon: "🎉", badgeColor: "#10B981" },
  SHIPPED: { label: "จัดส่งพัสดุแล้ว", desc: "จัดส่งผ่านบริษัทขนส่งเรียบร้อยแล้ว", icon: "🚚", badgeColor: "#10B981" },
  DELIVERED: { label: "พัสดุถึงผู้รับแล้ว", desc: "พัสดุจัดส่งถึงลูกค้าเรียบร้อยแล้ว", icon: "📬", badgeColor: "#10B981" },
  COMPLETED: { label: "7. ส่งมอบสำเร็จ 🎉", desc: "ลูกค้าตรวจรับชุดและเซ็นรับมอบเรียบร้อยแล้ว", icon: "🏆", badgeColor: "#059669" },
  CANCELLED: { label: "ยกเลิกออเดอร์", desc: "รายการออเดอร์นี้ถูกยกเลิก", icon: "❌", badgeColor: "#EF4444" },

  // Thai Legacy Aliases
  "กำลังตัดเย็บ": { label: "4. กำลังเย็บประกอบ", desc: "ช่างกำลังเย็บขึ้นโครงชุดและเก็บรายละเอียด", icon: "🪡", badgeColor: "#F59E0B" },
  "ตัดเย็บ": { label: "4. กำลังเย็บประกอบ", desc: "ช่างกำลังเย็บขึ้นโครงชุดและเก็บรายละเอียด", icon: "🪡", badgeColor: "#F59E0B" },
  "รับออเดอร์": { label: "1. รับออเดอร์เรียบร้อย", desc: "บันทึกข้อมูลและสัดส่วนเข้าระบบเรียบร้อยแล้ว", icon: "📋", badgeColor: "#3B82F6" },
  "ออกแบบ": { label: "2. สรุปแบบ/เตรียมผ้า", desc: "วางแพทเทิร์น ออกแบบ และเตรียมผ้าตัดเย็บ", icon: "✏️", badgeColor: "#6366F1" },
  "ตัดผ้า": { label: "3. ขึ้นแบบและตัดผ้า", desc: "ช่างตัดผ้าตามแพทเทิร์นเรียบร้อยแล้ว", icon: "✂️", badgeColor: "#F59E0B" },
  "ฟิตติ้ง": { label: "5. ขั้นตอนฟิตติ้ง", desc: "นัดหมายลองชุดและปรับแต่งทรงตามรูปร่าง", icon: "👗", badgeColor: "#A855F7" },
  "พร้อมส่งมอบ": { label: "6. พร้อมส่งมอบ/รับชุด", desc: "ชุดตัดเย็บเสร็จสมบูรณ์ 100% พร้อมนัดรับชุดหรือจัดส่ง", icon: "🎉", badgeColor: "#10B981" },
  "ส่งมอบสำเร็จ": { label: "7. ส่งมอบสำเร็จ 🎉", desc: "ลูกค้าตรวจรับชุดและเซ็นรับมอบเรียบร้อยแล้ว", icon: "🏆", badgeColor: "#059669" }
};

export function getStatusDetails(status?: string): StatusConfig {
  if (!status) {
    return { label: "กำลังดำเนินการ", desc: "อยู่ระหว่างขั้นตอนการตัดเย็บ", icon: "⏳", badgeColor: "#64748B" };
  }
  const clean = status.trim();
  if (STATUS_MAP_TH[clean]) {
    return STATUS_MAP_TH[clean];
  }
  const upper = clean.toUpperCase();
  if (STATUS_MAP_TH[upper]) {
    return STATUS_MAP_TH[upper];
  }
  return { label: clean, desc: "อยู่ระหว่างขั้นตอนการตัดเย็บ", icon: "⏳", badgeColor: "#64748B" };
}

/**
 * Remove conversational prefixes and polite suffixes from Thai input
 */
export function cleanCustomerQuery(q: string): string {
  if (!q) return "";
  let res = q.trim();
  const prefixes = [
    "สวัสดีค่ะ", "สวัสดีครับ", "สวัสดี", "หวัดดีค่ะ", "หวัดดีครับ", "หวัดดี",
    "ขอสอบถามค่ะ", "ขอสอบถามครับ", "ขอสอบถาม", "สอบถามค่ะ", "สอบถามครับ", "สอบถาม",
    "ขอเช็คสถานะค่ะ", "ขอเช็คสถานะครับ", "ขอเช็คสถานะ", "เช็คสถานะค่ะ", "เช็คสถานะครับ", "เช็คสถานะ",
    "ขอเช็คชุดค่ะ", "ขอเช็คชุดครับ", "ขอเช็คชุด", "เช็คชุดค่ะ", "เช็คชุดครับ", "เช็คชุด",
    "ติดตามสถานะ", "ติดตามชุด", "ติดตามออเดอร์", "ติดตาม",
    "ขอเช็ค", "ขอดูสถานะ", "ขอดูชุด", "ขอดู", "ดูสถานะ", "ดูชุด", "เช็คออเดอร์", "เช็ค",
    "ชุดของ", "ชุดคุณ", "ชุด",
    "ออเดอร์ของ", "ออเดอร์คุณ", "ออเดอร์",
    "ของ", "คุณ", "นางสาว", "น.ส.", "นาง", "นาย", "ด.ญ.", "ด.ช.", "พี่", "น้อง", "ช่าง", "ลูกค้า",
    "เบอร์โทรศัพท์", "เบอร์โทร", "เบอร์", "โทร"
  ];
  const suffixes = [
    "ขอบคุณค่ะ", "ขอบคุณครับ", "นะคะ", "นะค่ะ", "หน่อยค่ะ", "หน่อยครับ", "หน่อย", "ด้วยค่ะ", "ด้วยครับ",
    "ค่ะ", "คะ", "ครับ", "จ้า", "จ๊ะ", "ไหมคะ", "มั้ยคะ", "ไหมครับ", "มั้ยครับ"
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

/**
 * Robust matcher for finding customer orders from any LINE message
 * Supports: Phone numbers (with or without hyphens/spaces/+66), Order Numbers (NU-26002, 26002),
 * Full Name, First Name, Last Name, Nickname, and LINE User ID.
 * Returns orders sorted from newest to oldest.
 */
export function smartMatchOrders(inputText: string, ordersList: any[], senderUserId?: string): any[] {
  if (!inputText || !ordersList || ordersList.length === 0) return [];
  const raw = inputText.trim();
  const lower = raw.toLowerCase();
  
  // 1. Extract ALL potential phone numbers (e.g. 080-146-2230, 080 146 2230, 0801462230, +66801462230)
  const digitsOnly = lower.replace(/\D/g, "");
  const phoneCandidates: string[] = [];
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

  // 2. Extract potential Order numbers (e.g. NU-26002, NU26002, 26002)
  const orderNumCandidates: string[] = [];
  const nuMatches = raw.match(/NU-?\s*\d{3,6}/gi) || [];
  for (const m of nuMatches) {
    orderNumCandidates.push(m.replace(/[- \s]/g, "").toLowerCase());
  }
  // Pure 4-6 digit sequence (e.g. "26002")
  const pureDigitsMatch = raw.match(/\b\d{4,6}\b/g) || [];
  for (const pd of pureDigitsMatch) {
    orderNumCandidates.push(pd);
    orderNumCandidates.push("nu" + pd);
  }

  // 3. Clean search queries
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

    // 0. Explicit LINE User ID match
    if (senderUserId && lineUid && lineUid === senderUserId.toLowerCase().trim()) {
      return true;
    }

    // A. Phone match
    for (const pc of phoneCandidates) {
      if (orderPhone && (orderPhone === pc || orderPhone.includes(pc) || pc.includes(orderPhone))) {
        return true;
      }
    }
    if (digitsOnly.length >= 7 && orderPhone && (orderPhone.includes(digitsOnly) || digitsOnly.includes(orderPhone))) {
      return true;
    }

    // B. Order number match
    for (const onc of orderNumCandidates) {
      if (orderNum && (orderNum === onc || orderNum.includes(onc) || onc.includes(orderNum))) return true;
      if (orderNumDigits && onc.includes(orderNumDigits)) return true;
    }

    // C. Name matching (bidirectional)
    // 1) Is the customer's name inside the raw or cleaned message? (e.g. "เช็คสถานะคุณซารอฟะห์ค่ะ" contains "ซารอฟะห์")
    if (nameNoSpaces.length >= 2 && cleanSearch.includes(nameNoSpaces)) return true;
    if (nameNoTitle.length >= 2 && lower.includes(nameNoTitle)) return true;

    // 2) Check individual name parts (first name / last name)
    const nameParts = nameNoTitle.split(/\s+/).filter(p => p.length >= 2);
    for (const part of nameParts) {
      const cleanPart = part.replace(/[- \s\t\n]/g, "");
      if (cleanPart.length >= 2 && (cleanSearch.includes(cleanPart) || strippedClean.includes(cleanPart))) {
        return true;
      }
    }

    // 3) Is the stripped query inside the customer's name? (e.g. user typed "ซารอฟะห์" and DB has "ซารอฟะห์ มะสาแม")
    if (strippedClean.length >= 2 && nameNoSpaces.includes(strippedClean)) return true;
    if (strippedText.length >= 2 && nameNoTitle.includes(strippedText)) return true;

    // 4) Nickname match
    if (nickname.length >= 2) {
      if (cleanSearch.includes(nickname) || lower.includes(nickname) || strippedClean.includes(nickname)) {
        return true;
      }
    }

    return false;
  });

  // Sort matched orders by order number descending (newest first)
  return matched.sort((a, b) => {
    return (b.orderNumber || "").localeCompare(a.orderNumber || "", undefined, { numeric: true });
  });
}

function formatThaiDate(dateStr?: string): string {
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

/**
 * Formats a single order into a rich LINE reply message
 */
export function formatSingleOrderLineMessage(order: any, baseAppUrl: string, userId?: string): string {
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

  return `⚜️ ข้อมูลชุดสั่งตัด NUNUH Boutique ⚜️\n\n` +
    `👤 เรียนคุณ: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}\n` +
    `🧾 รหัสออเดอร์: ${order.orderNumber}\n` +
    `👗 แบบชุด: ${order.dressType}\n` +
    `🧵 ชนิดผ้า/สี: ${order.fabricType || "ตามที่ระบุ"} (${order.fabricColor || "-"})\n` +
    (order.tailorName ? `✂️ ช่างตัดเย็บ: ${order.tailorName}\n\n` : `\n`) +
    `📍 สถานะ Real-Time: ${stCfg.icon} [${stCfg.label}]\n` +
    `ℹ️ ขั้นตอนปัจจุบัน: "${stCfg.desc}"\n` +
    `📅 วันที่อัปเดตสถานะ: ${formatThaiDate(order.statusDate || order.orderDate)}\n` +
    `⏳ กำหนดส่งมอบชุด: ${formattedDelivery}\n\n` +
    `💰 ข้อมูลยอดเงิน:\n` +
    `• ราคารวม: ${price.toLocaleString()} บาท\n` +
    `• ชำระมัดจำแล้ว: ${deposit.toLocaleString()} บาท\n` +
    (unpaid === 0 ? `• สถานะชำระ: ชำระครบถ้วนแล้ว ✓\n\n` : `• ยอดคงเหลือวันรับชุด: ${unpaid.toLocaleString()} บาท\n\n`) +
    `🔗 ตรวจสอบรายละเอียด สัดส่วนที่วัด และติดตามสถานะแบบ Real-Time ตลอด 24 ชม.:\n` +
    `${portalUrl}\n\n` +
    `หากต้องการสอบถามเพิ่มเติม สามารถพิมพ์ข้อความทิ้งไว้ในแชทนี้ได้เลยนะคะ ✨`;
}

/**
 * Formats multiple matched orders into a complete, comprehensive LINE list message
 * listing ALL order items and details
 */
export function formatMultipleOrdersLineMessage(matchedOrders: any[], baseAppUrl: string, userId?: string): string {
  const customerName = matchedOrders[0]?.customerName || "คุณลูกค้า";
  const customerNickname = matchedOrders[0]?.customerNickname ? ` (${matchedOrders[0]?.customerNickname})` : "";

  let totalPrice = 0;
  let totalDeposit = 0;
  let totalUnpaid = 0;

  let itemsText = "";

  matchedOrders.forEach((order: any, idx: number) => {
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

    itemsText += `━━━━━━━━━━━━━━━━━━━━\n`;
    itemsText += `👗 รายการที่ ${idx + 1}: ${order.orderNumber} - ${order.dressType}\n`;
    itemsText += `• ผ้า/สี: ${order.fabricType || "ตามที่ระบุ"} (${order.fabricColor || "-"})\n`;
    itemsText += `• สถานะ: ${stCfg.icon} [${stCfg.label}]\n`;
    itemsText += `  ↳ "${stCfg.desc}"\n`;
    itemsText += `• กำหนดส่งมอบ: ${delDate}\n`;
    itemsText += `• ราคา: ${price.toLocaleString()} บ. | มัดจำ: ${deposit.toLocaleString()} บ. | คงเหลือ: ${unpaid.toLocaleString()} บ.\n`;
  });

  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;

  return `⚜️ NUNUH Boutique - รายการออเดอร์ทั้งหมด ⚜️\n\n` +
    `👤 เรียนคุณ: ${customerName}${customerNickname}\n` +
    `📦 พบรายการสั่งตัดของคุณทั้งหมด ${matchedOrders.length} ออเดอร์ ดังนี้ค่ะ:\n\n` +
    `${itemsText}━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 สรุปยอดรวมทั้งหมด (${matchedOrders.length} รายการ):\n` +
    `• รวมมูลค่าชุด: ${totalPrice.toLocaleString()} บาท\n` +
    `• ชำระมัดจำรวม: ${totalDeposit.toLocaleString()} บาท\n` +
    (totalUnpaid === 0 ? `• สถานะชำระ: ชำระครบถ้วนทั้งหมดแล้ว ✓\n\n` : `• ยอดคงเหลือสุทธิวันรับชุด: ${totalUnpaid.toLocaleString()} บาท\n\n`) +
    `🔗 เปิดดูรายละเอียด สัดส่วน รูปภาพแบบชุด และติดตามสถานะทุกชุดแบบ Real-Time ได้ที่นี่ค่ะ:\n` +
    `${portalUrl}\n\n` +
    `ขอบพระคุณที่ไว้วางใจให้ห้องเสื้อ NUNUH ดูแลชุดสวยของคุณค่ะ 💖✨`;
}

/**
 * Unified formatter for customer orders report
 */
export function formatCustomerOrdersReport(matchedOrders: any[], baseAppUrl: string, userId?: string): string {
  if (!matchedOrders || matchedOrders.length === 0) return "";
  if (matchedOrders.length === 1) {
    return formatSingleOrderLineMessage(matchedOrders[0], baseAppUrl, userId);
  }
  return formatMultipleOrdersLineMessage(matchedOrders, baseAppUrl, userId);
}

/**
 * Builds a luxury LINE Flex Message (Bubble for 1 order, Carousel for multiple orders)
 */
export function buildOrdersLineFlexMessage(matchedOrders: any[], baseAppUrl: string, userId?: string): any {
  if (!matchedOrders || matchedOrders.length === 0) return null;

  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;

  const bubbles = matchedOrders.slice(0, 10).map((order: any, idx: number) => {
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
                text: "⚜️ NUNUH BOUTIQUE",
                weight: "bold",
                color: "#D4AF37",
                size: "xs",
                flex: 1
              },
              {
                type: "text",
                text: matchedOrders.length > 1 ? `#${idx + 1} จาก ${matchedOrders.length}` : "ออเดอร์สั่งตัด",
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
            text: order.dressType || "ชุดสั่งตัดพิเศษ",
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
                  { type: "text", text: "👤 ลูกค้า", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: order.customerName || "-", size: "xxs", color: "#211C1A", weight: "bold", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🧵 ชนิดผ้า", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: `${order.fabricType || "-"} (${order.fabricColor || "-"})`, size: "xxs", color: "#211C1A", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "⏳ กำหนดส่ง", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: delDate, size: "xxs", color: "#D97706", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "💰 ยอดเงิน", size: "xxs", color: "#8E8882", width: "70px" },
                  {
                    type: "text",
                    text: unpaid === 0 ? "ชำระครบแล้ว ✓" : `คงเหลือ ${unpaid.toLocaleString()} บ.`,
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
              label: "🔍 ดูสัดส่วน & ติดตาม Real-Time",
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
      altText: `⚜️ อัปเดตออเดอร์ ${matchedOrders[0].orderNumber} (${matchedOrders[0].dressType})`,
      contents: bubbles[0]
    };
  }

  return {
    type: "flex",
    altText: `⚜️ รายการออเดอร์ของคุณทั้งหมด ${matchedOrders.length} รายการ (NUNUH Boutique)`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}

/**
 * Formats order not found reply with helpful tips
 */
export function formatOrderNotFoundMessage(originalText: string): string {
  return `สวัสดีค่ะคุณลูกค้า ⚜️ NUNUH Boutique ⚜️ ยินดีให้บริการค่ะ\n\n` +
    `❌ ขออภัยค่ะ ระบบยังไม่พบข้อมูลออเดอร์ที่ตรงกับ "${originalText}"\n\n` +
    `📌 วิธีการตรวจสอบสถานะออเดอร์อัตโนมัติ:\n` +
    `• พิมพ์ เบอร์โทรศัพท์ ที่แจ้งไว้ตอนวัดตัว (เช่น 0801462230 หรือ 086-555-1234)\n` +
    `• หรือพิมพ์ ชื่อ-นามสกุล ของท่าน\n` +
    `• หรือพิมพ์ รหัสออเดอร์ (เช่น NU-26002 หรือ 26002)\n\n` +
    `ระบบจะค้นหาข้อมูลและส่งรายงานออเดอร์ทั้งหมด พร้อมลิงก์ติดตามงานให้ท่านตรวจสอบสัดส่วน และความคืบหน้าแบบ Real-Time ได้ทันทีตลอด 24 ชม. เลยนะคะ ✨`;
}

/**
 * Formats customer welcome / new order confirmation push notification
 */
export function formatNewOrderCustomerConfirmation(order: any, baseAppUrl: string): string {
  const formattedDelivery = formatThaiDate(order.deliveryDate);
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const userParam = order.lineUserId ? `&lineUserId=${encodeURIComponent(order.lineUserId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;

  return `⚜️ ยืนยันการบันทึกออเดอร์สั่งตัด NUNUH Boutique ⚜️\n\n` +
    `👤 เรียนคุณ: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}\n` +
    `🧾 รหัสออเดอร์: ${order.orderNumber}\n` +
    `👗 แบบชุด: ${order.dressType}\n` +
    `🧵 ชนิดผ้า: ${order.fabricType || "ตามที่ระบุ"} (${order.fabricColor || "-"})\n` +
    `📍 สถานะ: [1. รับออเดอร์เรียบร้อย]\n` +
    `📅 วันที่บันทึก: ${formatThaiDate(order.orderDate || new Date().toISOString().split("T")[0])}\n` +
    `⏳ กำหนดส่งมอบ: ${formattedDelivery}\n\n` +
    `💰 ข้อมูลยอดเงิน:\n` +
    `• ราคารวม: ${Number(order.price || 0).toLocaleString()} บาท\n` +
    `• ชำระมัดจำแล้ว: ${Number(order.deposit || 0).toLocaleString()} บาท\n` +
    `• คงเหลือวันรับชุด: ${Math.max(0, Number(order.price || 0) - Number(order.deposit || 0) - Number(order.discount || 0)).toLocaleString()} บาท\n\n` +
    `🔗 ติดตามสถานะงานตัดเย็บ สัดส่วนที่วัด และภาพแบบชุดได้ที่ลิงก์นี้ตลอด 24 ชม.:\n` +
    `${portalUrl}\n\n` +
    `ขอบพระคุณที่ไว้วางใจให้ห้องเสื้อ NUNUH ดูแลชุดสวยของคุณค่ะ 💖✨`;
}

/**
 * Formats shop owner alert when a new order is received
 */
export function formatNewOrderOwnerAlert(order: any, baseAppUrl: string): string {
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}`;

  return `🔔 [แจ้งเตือนร้าน] มีออเดอร์สั่งตัดใหม่เข้ามาในระบบ!\n\n` +
    `🧾 รหัสออเดอร์: ${order.orderNumber}\n` +
    `👤 ลูกค้า: ${order.customerName}\n` +
    `📞 เบอร์โทร: ${order.customerPhone || "-"}\n` +
    `👗 แบบชุด: ${order.dressType}\n` +
    `💰 ราคารวม: ${Number(order.price || 0).toLocaleString()} บาท (มัดจำ: ${Number(order.deposit || 0).toLocaleString()} บ.)\n` +
    `⏳ กำหนดส่ง: ${formatThaiDate(order.deliveryDate)}\n` +
    `📍 สาขา: ${order.branch || "สาขาหลัก"}\n` +
    `👤 บันทึกโดย: ${order.staffName || "พนักงาน"}\n\n` +
    `🔗 ลิงก์ตรวจออเดอร์: ${portalUrl}`;
}
