/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Order, OrderStatus, STATUS_MAP } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Phone, 
  Sparkles, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

interface DeliveryCalendarProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export default function DeliveryCalendar({ orders, onUpdateOrderStatus }: DeliveryCalendarProps) {
  // วันที่และเวลาปัจจุบันเรียลไทม์ (Real-Time System Date)
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed: 0 = ม.ค.
  const todayDate = today.getDate();

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    const y = todayYear;
    const m = String(todayMonth + 1).padStart(2, '0');
    const d = String(todayDate).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // วันแรกของเดือนเริ่มที่วันไหน (0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // คำนวณจำนวนวันในเดือนนั้นๆ แบบ dynamic รองรับปีอธิกสุรทิน
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDateStr(null);
  };

  // ดึงออเดอร์ทั้งหมดในเดือนและปีที่แสดงผล
  const getOrdersForDate = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    return orders.filter(o => o.deliveryDate === dateStr);
  };

  // ดึงงานจัดส่งทั้งหมด เรียงตามกำหนดส่งใกล้สุด (ที่ยังไม่สำเร็จ หรือรวมทั้งหมดที่ต้องการติดตาม)
  const activeDeliveries = [...orders]
    .filter(o => o.status !== OrderStatus.COMPLETED)
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. SECTION: Interactive Calendar Grid (2/3 width on large screens) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
        
        {/* Calendar Header with toggles */}
        <div className="flex items-center justify-between border-b border-natural-sand pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-natural-sand text-natural-clay rounded-xl">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-natural-espresso text-lg">ปฏิทินนัดหมายส่งมอบชุด</h3>
              <p className="text-xs text-natural-espresso/60">ตารางกำหนดส่งงานให้ลูกค้า ประจำแต่ละเดือน</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-natural-sand p-1 rounded-xl">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/80 rounded-lg transition-all text-natural-espresso/80 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-serif font-bold text-natural-espresso px-2 min-w-28 text-center">
              {monthNamesThai[currentMonth]} {currentYear + 543}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/80 rounded-lg transition-all text-natural-espresso/80 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of week header labels (Sun - Sat) */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-natural-espresso/45 py-1">
          <div className="text-natural-clay">อา.</div>
          <div>จ.</div>
          <div>อ.</div>
          <div>พ.</div>
          <div>พฤ.</div>
          <div>ศ.</div>
          <div className="text-natural-ochre">ส.</div>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2.5">
          {/* Empty cells before first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-20 bg-natural-sand/20 rounded-xl border border-natural-wheat/40"></div>
          ))}

          {/* Month days */}
          {Array.from({ length: totalDays }).map((_, index) => {
            const dayNum = index + 1;
            const formattedMonth = String(currentMonth + 1).padStart(2, '0');
            const formattedDay = String(dayNum).padStart(2, '0');
            const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
            
            const dayOrders = getOrdersForDate(dayNum);
            const hasDeliveries = dayOrders.length > 0;
            const isSelected = selectedDateStr === dateStr;

            // ตรวจสอบว่าเป็นวันปัจจุบันจริงแบบ Real-time หรือไม่
            const isTodayReal = currentYear === todayYear && currentMonth === todayMonth && dayNum === todayDate;

            return (
              <div
                key={`day-${dayNum}`}
                id={`day-${dateStr}`}
                onClick={() => {
                  if (hasDeliveries) {
                    setSelectedDateStr(dateStr);
                  } else {
                    setSelectedDateStr(null);
                  }
                }}
                className={`h-20 p-2 rounded-xl border flex flex-col justify-between transition-all select-none relative ${
                  hasDeliveries ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isSelected
                    ? 'border-natural-espresso bg-natural-espresso text-natural-cream shadow-md ring-2 ring-natural-espresso/5'
                    : isTodayReal
                      ? 'border-natural-clay bg-rose-50/90 text-natural-espresso font-semibold ring-2 ring-natural-clay/30'
                      : hasDeliveries
                        ? 'border-natural-clay/35 bg-natural-cream/35 hover:border-natural-clay/80 hover:bg-natural-cream/55'
                        : 'border-natural-wheat/40 bg-natural-cream/10 text-natural-espresso/80 hover:border-natural-wheat/60'
                }`}
              >
                {/* Date indicator */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isTodayReal && !isSelected ? 'text-natural-clay underline font-extrabold' : ''
                  }`}>
                    {dayNum}
                  </span>
                  
                  {isTodayReal && (
                    <span className="text-[8px] bg-natural-clay text-white px-1 py-0.2 rounded font-bold uppercase tracking-wider shadow-xs">
                      วันนี้
                    </span>
                  )}
                </div>

                {/* Event badges on the day */}
                <div className="space-y-1">
                  {dayOrders.map((order) => {
                    const isCompleted = order.status === OrderStatus.COMPLETED;
                    return (
                      <div 
                        key={order.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium text-left leading-tight ${
                          isSelected 
                            ? 'bg-natural-espresso/80 text-natural-cream' 
                            : isCompleted 
                              ? 'bg-natural-sand/50 text-natural-espresso/40 line-through' 
                              : 'bg-natural-sand border border-natural-wheat/40 text-natural-espresso/90'
                        }`}
                      >
                        {order.customerName.replace("คุณ", "")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected date drawer details */}
        {selectedDateStr && (
          <div className="mt-4 p-4 rounded-xl border border-natural-clay/35 bg-natural-sand/20 space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold text-natural-clay uppercase tracking-wider flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> รายละเอียดงานจัดส่งประจำวันที่ {
                new Date(selectedDateStr).toLocaleDateString('th-TH', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })
              }
            </h4>
            
            <div className="divide-y divide-natural-wheat/60">
              {orders.filter(o => o.deliveryDate === selectedDateStr).map((order) => {
                const cfg = STATUS_MAP[order.status];
                return (
                  <div key={order.id} className="py-2.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-natural-espresso">
                        {order.customerName} ({order.orderNumber})
                      </p>
                      <p className="text-xs text-natural-espresso/80">
                        ชุด: <span className="font-semibold">{order.dressType}</span> | ผ้า: <span className="font-medium">{order.fabricType}</span>
                      </p>
                      <p className="text-[11px] text-natural-clay font-medium">
                        📞 {order.customerPhone} | {order.notes || "ไม่มีบันทึกเพิ่มเติม"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.colorClass}`}>
                        {cfg.label}
                      </span>
                      {order.status !== OrderStatus.COMPLETED && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, OrderStatus.COMPLETED)}
                          className="bg-natural-espresso hover:bg-natural-clay text-white font-medium text-[10px] py-1 px-2.5 rounded-lg transition-all cursor-pointer"
                        >
                          ส่งมอบเรียบร้อย ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 2. SECTION: Upcoming Deliveries Timeline (1/3 width on large screens) */}
      <div className="bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
        <div className="border-b border-natural-sand pb-3 flex items-center justify-between">
          <h3 className="font-serif font-bold text-natural-espresso text-base flex items-center">
            <Clock className="h-4.5 w-4.5 mr-2 text-natural-espresso/60" /> ลำดับงานส่งมอบถัดไป
          </h3>
          <span className="text-[10px] bg-natural-sand text-natural-espresso/85 font-mono px-2 py-0.5 rounded-full font-bold">
            {activeDeliveries.length} ชุดที่กำลังรอ
          </span>
        </div>

        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {activeDeliveries.length === 0 ? (
            <div className="py-12 text-center text-natural-espresso/40">
              <CheckCircle className="h-8 w-8 mx-auto text-natural-sage mb-2" />
              <p className="text-xs font-semibold">ส่งชุดครบหมดทุกตัวแล้ว!</p>
              <p className="text-[10px] mt-0.5">ไม่มีงานค้างส่งในสัปดาห์นี้</p>
            </div>
          ) : (
            activeDeliveries.map((order, idx) => {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);

              const delDate = new Date(order.deliveryDate);
              delDate.setHours(0, 0, 0, 0);

              const diffDays = Math.round((delDate.getTime() - todayStart.getTime()) / (1000 * 3600 * 24));
              let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              let timeText = `🟢 อีก ${diffDays} วัน`;

              if (order.status === OrderStatus.COMPLETED) {
                badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                timeText = "✨ ส่งมอบแล้ว";
              } else if (diffDays === 0) {
                badgeColor = "bg-red-600 text-white border-red-700 animate-pulse font-bold";
                timeText = "🚨 ส่งวันนี้!";
              } else if (diffDays === 1) {
                badgeColor = "bg-orange-100 text-orange-800 border-orange-300 font-bold";
                timeText = "⚠️ พรุ่งนี้!";
              } else if (diffDays < 0) {
                badgeColor = "bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse";
                timeText = `⚠️ เกิน ${Math.abs(diffDays)} วัน`;
              } else if (diffDays <= 3) {
                badgeColor = "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
                timeText = `⏳ อีก ${diffDays} วัน`;
              }

              const statusCfg = STATUS_MAP[order.status];

              return (
                <div 
                  key={order.id}
                  className="flex items-start space-x-3 p-3.5 rounded-xl border border-natural-sand/40 bg-natural-cream/10 hover:bg-natural-sand/20 transition-all"
                >
                  {/* Timeline Index or Indicator */}
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {timeText}
                    </span>
                    <div className="w-0.5 h-12 bg-natural-sand mt-2 last:hidden"></div>
                  </div>

                  {/* Delivery Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-natural-espresso/40">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusCfg.colorClass}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-natural-espresso text-sm">
                      {order.customerName}
                    </h4>

                    <p className="text-xs text-natural-espresso/70 leading-normal">
                      ชุด <span className="font-semibold text-natural-espresso/90">{order.dressType}</span> ({order.fabricType})
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-natural-espresso/40 font-bold">
                        📅 {new Date(order.deliveryDate).toLocaleDateString('th-TH', { 
                          day: 'numeric', 
                          month: 'short'
                        })}
                      </p>
                      
                      {order.status === OrderStatus.READY ? (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, OrderStatus.COMPLETED)}
                          className="text-[9px] font-bold bg-natural-sage hover:bg-natural-sage-dark text-white px-2 py-0.8 rounded transition-all cursor-pointer"
                        >
                          ส่งชุดแล้ว ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, OrderStatus.READY)}
                          className="text-[9px] font-bold bg-natural-espresso hover:bg-natural-clay text-natural-cream px-2 py-0.8 rounded transition-all cursor-pointer"
                        >
                          ช่างเย็บเสร็จ &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
