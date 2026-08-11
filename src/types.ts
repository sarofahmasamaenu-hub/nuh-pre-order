/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum OrderStatus {
  RECEIVED = "RECEIVED",       // รับออเดอร์เรียบร้อย
  DESIGNING = "DESIGNING",     // อยู่ในขั้นตอนการออกแบบ/สรุปแบบ
  CUTTING = "CUTTING",       // กำลังตัดผ้า
  SEWING = "SEWING",         // กำลังขึ้นโครง/เย็บประกอบ
  FITTING = "FITTING",        // ขั้นตอนฟิตติ้ง/ปรับแต่งตัว
  READY = "READY",          // ตัดเย็บเสร็จสมบูรณ์พร้อมส่งมอบ
  COMPLETED = "COMPLETED"     // ส่งมอบให้ลูกค้าเรียบร้อย
}

export interface Measurements {
  chest: string;        // รอบอก (ซม.)
  waist: string;        // รอบเอว (ซม.)
  hips: string;         // รอบสะโพก (ซม.)
  shoulder: string;     // ไหล่กว้าง (ซม.)
  sleeveLength: string; // ความยาวแขน (ซม.)
  armhole: string;      // รอบวงแขน (ซม.)
  length: string;       // ความยาวชุด (ซม.)
  neck?: string;         // รอบคอ (ซม.)
  height: string;       // ส่วนสูง (ซม.)
  weight: string;       // น้ำหนัก (กก.)
  frontChest?: string;  // บ่าหน้า (ซม.)
  backChest?: string;   // บ่าหลัง (ซม.)
  frontLength?: string; // ยาวหน้า (ซม.)
  backLength?: string;  // ยาวหลัง (ซม.)
  wrist?: string;       // ข้อมือ (ซม.)
  otherNotes: string;   // รายละเอียดการวัดตัวอื่นๆ
  standardSize?: string; // ไซส์มาตรฐาน เช่น SS, S, M, L, XL
}

export interface CustomDesignDetails {
  silhouette: string;   // ทรงชุด (A-Line, Princess, Column, Mermaid, Fitted)
  neckline: string;     // คอเสื้อ (V-Neck, Round, Sweetheart, Off-shoulder, High Neck)
  sleeves: string;      // แขนเสื้อ (Sleeveless, Short, Puff, Long, Bell Sleeves)
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerSocial?: string;    // IG, Line, FB
  dressType: string;         // เดรสราตรี, อาบายะห์, จั๊มสูท, ชุดทำงาน, เดรสสั้น, อื่นๆ
  fabricType: string;        // ชนิดผ้า (ผ้าไหม, ผ้าชีฟอง, ผ้าลูกไม้, ผ้าซาติน, ผ้าลินิน, อื่นๆ)
  fabricColor: string;       // สีผ้า
  orderDate: string;         // วันที่สั่งซื้อ YYYY-MM-DD
  deliveryDate: string;      // วันที่กำหนดส่งมอบ YYYY-MM-DD
  price: number;             // ราคาเต็ม
  deposit: number;           // มัดจำ
  discount?: number;         // ส่วนลดเพิ่มเติม
  finalPaymentAmount?: number; // ยอดเงินที่ลูกค้าชำระส่วนต่างคงเหลือ (บาท)
  finalPaymentDate?: string;   // วันที่ชำระเงินส่วนต่าง (YYYY-MM-DD)
  finalPaymentMethod?: string; // ช่องทางการชำระเงินส่วนต่างคงเหลือ (เงินโอน, เงินสด, บัตรเครดิต)
  measurements: Measurements;
  status: OrderStatus;
  notes?: string;
  selectedDesignId?: string; // ไอดีแบบชุดจากแคตตาล็อก (ถ้ามี)
  sku?: string;              // รหัสสินค้า / SKU
  customDesign?: CustomDesignDetails;
  customImage?: string; // ภาพชุดอ้างอิงแนบมา (Base64 string หรือรูปภาพจากแคตตาล็อก)
  customImage2?: string; // ภาพชุดอ้างอิงแนบมา ช่องที่ 2 (Base64 string หรือรูปภาพจากแคตตาล็อก)
  customerPhotoFront?: string; // ภาพถ่ายลูกค้า ด้านหน้า
  customerPhotoSide?: string;  // ภาพถ่ายลูกค้า ด้านข้าง
  customerPhotoBack?: string;  // ภาพถ่ายลูกค้า ด้านหลัง
  branch?: string;           // สาขาที่รับออเดอร์ (สาขานราธิวาส, สาขายะลา, สาขาปัตตานี, สาขาหาดใหญ่)
  staffName?: string;        // ชื่อพนักงานผู้รับออเดอร์
  staffBranch?: string;      // สาขาของพนักงานผู้รับออเดอร์
  paymentMethod?: string;      // ช่องทางการชำระเงิน (เงินโอน, เงินสด, บัตรเครดิต)
  customerCategory?: string;   // ประเภทงาน เช่น IDD, IDH, ทั่วไป
  membershipTier?: 'PRIME' | 'PRIVILEGE' | 'TRADER' | 'MEMBER'; // ประเภทบัตรสมาชิก
  externalOrderId?: string;    // รหัสออเดอร์จากกัน / รหัสออเดอร์อ้างอิง
  lineUserId?: string;         // รหัส LINE User ID สำหรับติดต่อ
  slipImage?: string;          // ภาพสลิปโอนเงิน (Base64 string)
  feedbacks?: FeedbackMessage[]; // ข้อความตอบกลับ/แจ้งเตือนจากลูกค้าหรือร้านค้า
  isMatchingSet?: boolean;     // ระบุว่าเป็นงานเข้าชุด
  idhNumber?: string;          // เลข IDH สำหรับงานเข้าชุด (เช่น IDH-88)
  updatedAt?: number;          // วันที่อัปเดตล่าสุดเป็นมิลลิวินาที สำหรับใช้ซิงค์ระบบพนักงาน
  pickupSignature?: string;    // ภาพลายเซ็นลูกค้ารับมอบชุด (Base64 PNG string)
  pickupSigneeName?: string;   // ชื่อลูกค้า/ผู้รับมอบชุด
  pickupSignedAt?: string;     // วันเวลาที่เซ็นรับมอบชุด
  isLocked?: boolean;          // ล็อกออเดอร์ถาวร ห้ามแก้ไขหรือลบข้อมูล
}

export interface FeedbackMessage {
  id: string;
  sender: 'customer' | 'tailor'; // ผู้ส่ง: ลูกค้า หรือ ช่าง/ร้านค้า
  content: string;               // ข้อความ
  timestamp: string;             // วันเวลาที่ส่ง
}

export interface CustomerReview {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  dressType: string;
  rating: number;                // คะแนนดาวเฉลี่ย
  ratingDress?: number;          // คะแนนดาว - ทรงชุด (1-5)
  ratingFabric?: number;         // คะแนนดาว - คุณภาพผ้า (1-5)
  ratingService?: number;        // คะแนนดาว - บริการ (1-5)
  comment: string;               // ความคิดเห็นลูกค้า
  reviewImage?: string;          // รูปภาพรีวิว (Base64 string หรือ URL)
  tailorNote?: string;           // โน้ต/ความคิดเห็นสำหรับช่างเย็บในการปรับปรุงคูตูร์
  createdAt: string;             // วันที่สร้างรีวิว (YYYY-MM-DD)
}

export interface CatalogueItem {
  id: string;
  sku?: string;              // รหัส SKU
  name: string;
  description: string;
  priceRange: string;
  fabricRecommend: string;
  image: string;             // URL ของภาพแบบชุด
  category: string;          // หมวดหมู่ (Abaya, Evening Gown, Minimalist, Casual, Traditional)
  features: string[];        // จุดเด่นของชุด
  sizes?: string[];          // ไซส์มาตรฐานที่มีให้เลือก เช่น SS, S, M, L, XL
  sizePrices?: Record<string, number>; // ราคาสำหรับแต่ละไซส์
}

// แผนผังคำแปลและสีสถานะ
export interface StatusConfig {
  label: string;
  description: string;
  colorClass: string;        // คลาสสีพื้นหลังและตัวหนังสือสำหรับป้าย
  bgBorderClass: string;     // คลาสสำหรับการแสดงเส้นขอบการติดตาม
  textColor: string;
  icon: string;
}

export const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  [OrderStatus.RECEIVED]: {
    label: "รับออเดอร์",
    description: "รับรายละเอียดการสั่งซื้อและวัดตัวเรียบร้อย",
    colorClass: "bg-natural-sand/80 text-natural-espresso border-natural-wheat",
    bgBorderClass: "border-natural-wheat bg-natural-sand/20",
    textColor: "text-natural-espresso",
    icon: "ClipboardCheck"
  },
  [OrderStatus.DESIGNING]: {
    label: "ออกแบบและจัดเตรียม",
    description: "กำลังวาดสเก็ตช์ จับคู่แพทเทิร์น และคัดสรรผืนผ้า",
    colorClass: "bg-[rgba(185,98,72,0.1)] text-natural-clay border-natural-clay/20",
    bgBorderClass: "border-natural-clay/30 bg-[rgba(185,98,72,0.05)]",
    textColor: "text-natural-clay",
    icon: "Palette"
  },
  [OrderStatus.CUTTING]: {
    label: "ขึ้นแบบและตัดผ้า",
    description: "กำลังวางแพทเทิร์นลงผ้าและตัดเตรียมชิ้นส่วน",
    colorClass: "bg-[rgba(194,141,84,0.1)] text-natural-ochre border-natural-ochre/20",
    bgBorderClass: "border-natural-ochre/30 bg-[rgba(194,141,84,0.05)]",
    textColor: "text-natural-ochre",
    icon: "Scissors"
  },
  [OrderStatus.SEWING]: {
    label: "ขึ้นโครงและเย็บประกอบ",
    description: "ช่างฝีมืออยู่ระหว่างเย็บชิ้นส่วนเสื้อผ้าเข้าด้วยกัน",
    colorClass: "bg-stone-100 text-stone-700 border-stone-200",
    bgBorderClass: "border-stone-300 bg-stone-50/50",
    textColor: "text-stone-700",
    icon: "Layers"
  },
  [OrderStatus.FITTING]: {
    label: "ฟิตติ้งและปรับแต่ง",
    description: "ตรวจสอบความพอดีของโครงชุดหรือรอฟิตติ้งรอบสอง",
    colorClass: "bg-[rgba(152,78,55,0.12)] text-natural-clay-dark border-natural-clay-dark/20",
    bgBorderClass: "border-natural-clay-dark/30 bg-[rgba(152,78,55,0.05)]",
    textColor: "text-natural-clay-dark",
    icon: "Ruler"
  },
  [OrderStatus.READY]: {
    label: "ตัดเย็บเรียบร้อย",
    description: "ผ่านการตรวจสอบ QC รีด สตรีม และแพ็คเตรียมส่งมอบ",
    colorClass: "bg-[rgba(93,114,96,0.12)] text-natural-sage border-natural-sage/20",
    bgBorderClass: "border-natural-sage/30 bg-[rgba(93,114,96,0.05)]",
    textColor: "text-natural-sage",
    icon: "Sparkles"
  },
  [OrderStatus.COMPLETED]: {
    label: "ส่งมอบสำเร็จ",
    description: "ชุดถึงมือลูกค้าอย่างปลอดภัยและสมบูรณ์แบบ",
    colorClass: "bg-stone-200/50 text-stone-500 border-stone-300",
    bgBorderClass: "border-stone-300 bg-stone-100/50",
    textColor: "text-stone-500",
    icon: "CheckCircle2"
  }
};

export const STANDARD_SIZE_CHART: Record<string, {
  chest: string;
  waist: string;
  hips: string;
  shoulder: string;
  sleeveLength: string;
  length: string;
}> = {
  DDS: { chest: "24", waist: "26", hips: "26", shoulder: "11", sleeveLength: "16", length: "35" },
  DDM: { chest: "26", waist: "28", hips: "28", shoulder: "12", sleeveLength: "18", length: "42" },
  DDL: { chest: "30-32", waist: "32", hips: "34", shoulder: "13", sleeveLength: "20", length: "45" },
  SS: { chest: "34", waist: "30", hips: "38", shoulder: "14", sleeveLength: "21", length: "53" },
  S: { chest: "38", waist: "34", hips: "42", shoulder: "14.5", sleeveLength: "21", length: "53" },
  M: { chest: "40", waist: "36", hips: "44", shoulder: "15", sleeveLength: "22", length: "54" },
  L: { chest: "42", waist: "38", hips: "46", shoulder: "15.5", sleeveLength: "23", length: "56" },
  XL: { chest: "44", waist: "40", hips: "48", shoulder: "16", sleeveLength: "24", length: "57" },
  "2XL": { chest: "46", waist: "42", hips: "50", shoulder: "16.5", sleeveLength: "24.5", length: "58" },
  "3XL": { chest: "48", waist: "44", hips: "52", shoulder: "17", sleeveLength: "25", length: "59" }
};

