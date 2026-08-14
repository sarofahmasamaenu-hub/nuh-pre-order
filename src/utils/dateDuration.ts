/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, STATUS_MAP } from '../types';

/**
 * คำนวณจำนวนวันระหว่างวันที่ 2 วัน (YYYY-MM-DD)
 */
export function getDaysDifference(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr) return 0;
  const s = startDateStr.split('T')[0];
  const e = endDateStr ? endDateStr.split('T')[0] : new Date().toISOString().split('T')[0];

  const start = new Date(s);
  const end = new Date(e);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  // Set time to 00:00:00 to avoid timezone DST discrepancies
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * สร้างข้อความสรุปไทม์ไลน์สถานะพร้อมจำนวนวันที่ใช้ในแต่ละขั้นตอน
 * ตัวอย่าง: [2026-08-01] 1. รับออร์เดอร์ (2 วัน) ➔ [2026-08-03] 5. ระหว่างการปัก (4 วัน) ➔ [2026-08-07] 6. ระหว่างการปักคริสตัล (อยู่ในขั้นตอนนี้ 3 วัน)
 */
export function formatStatusDurationTimeline(order: Order): string {
  const history = order.statusHistory && order.statusHistory.length > 0
    ? order.statusHistory
    : [{
        status: order.status,
        date: order.statusDate || order.orderDate,
        note: '',
        updatedBy: order.staffName || ''
      }];

  const todayStr = new Date().toISOString().split('T')[0];

  return history.map((entry, idx) => {
    const statusLabel = STATUS_MAP[entry.status as OrderStatus]?.label || entry.status;
    const isLast = idx === history.length - 1;
    const nextDate = isLast
      ? (order.status === OrderStatus.COMPLETED ? (order.statusDate || entry.date) : todayStr)
      : history[idx + 1].date;

    const days = getDaysDifference(entry.date, nextDate);
    const durationText = isLast
      ? (order.status === OrderStatus.COMPLETED ? `${days} วัน (เสร็จสิ้น)` : `อยู่ในขั้นตอนนี้ ${days} วัน`)
      : `ใช้เวลา ${days} วัน`;

    return `[${entry.date}] ${statusLabel} (${durationText})`;
  }).join(' ➔ ');
}
