import React, { useState } from 'react';
import { Order, FeedbackMessage } from '../types';
import { MessageSquare, Send, Clock, User, Sparkles, Trash2 } from 'lucide-react';

interface FeedbackSectionProps {
  order: Order;
  currentUserType: 'customer' | 'tailor';
  onAddFeedbackMessage: (content: string, sender: 'customer' | 'tailor') => void;
  onDeleteFeedbackMessage?: (messageId: string) => void;
}

export default function FeedbackSection({ order, currentUserType, onAddFeedbackMessage, onDeleteFeedbackMessage }: FeedbackSectionProps) {
  const [messageText, setMessageText] = useState('');

  const feedbacks = order.feedbacks || [];

  const handleSend = () => {
    if (!messageText.trim()) return;
    onAddFeedbackMessage(messageText.trim(), currentUserType);
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick reply/template options depending on who is currently viewing
  const customerTemplates = [
    "สัดส่วนถูกต้องเรียบร้อยค่ะ",
    "ขอแจ้งปรับเอวเพิ่ม 2 ซม. ได้ไหมคะ",
    "ขออัปเดตงานเพิ่มเติมค่ะ",
    "ได้รับชุดแล้วค่ะ ใส่พอดีและสวยงามมากๆ เลยค่ะ ❤️"
  ];

  const tailorTemplates = [
    "ทางห้องเสื้อรับทราบข้อมูลเรียบร้อยแล้วค่ะ ช่างกำลังปรับโครงสร้างชุดตามแจ้งนะคะ",
    "ชุดตัดเย็บเสร็จสมบูรณ์เรียบร้อยแล้วค่ะ พร้อมจัดส่งในรอบถัดไปนะคะ",
    "รบกวนตรวจสอบภาพแบบชุดและสัดส่วนอีกครั้งนะคะ หากถูกต้องรบกวนแจ้งยืนยันด้วยค่ะ",
    "ขอบพระคุณสำหรับฟีดแบ็กที่ดีมากๆ นะคะ ยินดีให้บริการเสมอค่ะ"
  ];

  const activeTemplates = currentUserType === 'customer' ? customerTemplates : tailorTemplates;

  return (
    <div className="bg-natural-sand/15 border border-natural-wheat/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-3xs" id={`feedback-section-${order.id}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-natural-sand pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-natural-clay/10 text-natural-clay rounded-lg">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h5 className="font-serif font-bold text-natural-espresso text-sm">
              💬 ช่องทางการแจ้ง & FEEDBACK ลูกค้า (Order Feedback Chat)
            </h5>
            <p className="text-[10px] text-natural-espresso/60 font-medium">
              สื่อสาร พูดคุย แจ้งปรับสัดส่วน หรือรายงานความคืบหน้าเฉพาะบุคคล
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-natural-clay/10 text-natural-clay font-mono font-bold px-2 py-0.5 rounded-full border border-natural-clay/20 uppercase">
          {currentUserType === 'customer' ? 'ฝั่งลูกค้า' : 'ฝั่งร้านค้า/ช่าง'}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
        {feedbacks.length === 0 ? (
          <div className="py-8 text-center text-natural-espresso/40 space-y-1 bg-white/40 border border-dashed border-natural-wheat/40 rounded-xl">
            <Sparkles className="h-5 w-5 mx-auto text-natural-espresso/20" />
            <p className="text-xs font-bold">ยังไม่มีข้อความฟีดแบ็กส่งถึงกันในออเดอร์นี้</p>
            <p className="text-[10px]">คุณสามารถส่งข้อความปรึกษา แจ้งปรับแต่ง หรือตอบกลับกันผ่านกล่องด้านล่างได้ทันทีค่ะ</p>
          </div>
        ) : (
          feedbacks.map((msg) => {
            const isMe = msg.sender === currentUserType;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender Tag & Time */}
                <div className={`flex items-center space-x-1.5 text-[9px] font-bold ${isMe ? 'text-natural-clay' : 'text-natural-espresso/55'}`}>
                  {!isMe && <User className="h-2.5 w-2.5" />}
                  <span>
                    {msg.sender === 'customer' ? 'คุณลูกค้า (Customer)' : 'ห้องเสื้อ NUNUH (Tailor)'}
                  </span>
                  <span className="text-[8px] font-mono font-medium text-natural-espresso/40">•</span>
                  <span className="text-[8px] font-mono text-natural-espresso/45">
                    {new Date(msg.timestamp).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit'
                    })} {new Date(msg.timestamp).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} น.
                  </span>
                </div>

                {/* Message Bubble & Interactive Delete Button */}
                <div className="flex items-center gap-1.5 max-w-[90%] group/msg">
                  {isMe && onDeleteFeedbackMessage && (
                    <button
                      type="button"
                      onClick={() => onDeleteFeedbackMessage(msg.id)}
                      className="opacity-40 hover:opacity-100 md:opacity-0 group-hover/msg:opacity-100 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                      title="ลบข้อความนี้"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-3xs ${
                      msg.sender === 'customer'
                        ? 'bg-amber-50/70 border border-amber-200/50 text-natural-espresso rounded-tr-none'
                        : 'bg-white border border-natural-wheat/60 text-natural-espresso rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {!isMe && onDeleteFeedbackMessage && (
                    <button
                      type="button"
                      onClick={() => onDeleteFeedbackMessage(msg.id)}
                      className="opacity-40 hover:opacity-100 md:opacity-0 group-hover/msg:opacity-100 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                      title="ลบข้อความนี้"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="space-y-1.5">
        <p className="text-[9px] text-natural-espresso/40 font-bold uppercase tracking-wider flex items-center">
          <Sparkles className="h-2.5 w-2.5 mr-1 text-natural-clay/60" /> แทมเพลตข้อความด่วน (Quick Notes)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {activeTemplates.map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMessageText(tpl)}
              className="text-[10px] font-medium bg-white hover:bg-natural-sand/20 text-natural-espresso/80 hover:text-natural-espresso px-2.5 py-1 rounded-lg border border-natural-wheat/40 transition-all cursor-pointer truncate max-w-full"
            >
              {tpl}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="flex gap-2 items-end pt-1">
        <div className="relative flex-1">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentUserType === 'customer'
                ? "พิมพ์ปรึกษาช่าง แจ้งสัดส่วน หรือระบุแบบสั่งตัดชุดได้ทันทีค่ะ..."
                : "ระบุรายงานความคืบหน้า ชี้แจง หรือตอบกลับคุณลูกค้า..."
            }
            className="w-full text-xs bg-white text-natural-espresso border border-natural-wheat/70 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-natural-clay/40 resize-none min-h-[3.5rem] max-h-[8rem] placeholder:text-natural-espresso/35 leading-relaxed font-medium"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!messageText.trim()}
          className="bg-natural-espresso hover:bg-natural-clay text-white disabled:bg-natural-sand/60 disabled:text-natural-espresso/30 p-3 rounded-xl transition-all flex-shrink-0 cursor-pointer shadow-xs disabled:cursor-not-allowed"
          title="ส่งข้อความ"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
