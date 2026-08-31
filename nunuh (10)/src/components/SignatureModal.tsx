import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderStatus } from '../types';
import { X, Eraser, Check, Lock, ShieldCheck, PenTool, AlertCircle } from 'lucide-react';

interface SignatureModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSignature: (orderId: string, signatureDataUrl: string, signeeName: string, signedAt: string) => void;
}

export default function SignatureModal({ order, isOpen, onClose, onConfirmSignature }: SignatureModalProps) {
  if (!isOpen || !order) return null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signeeName, setSigneeName] = useState(order.customerName || '');
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Setup Canvas
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high resolution canvas
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      // Default canvas stroke style
      ctx.strokeStyle = '#2B1B17'; // Natural Espresso
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Canvas drawing helpers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setErrorMessage('');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setErrorMessage('');
  };

  const handleSubmit = () => {
    if (!hasDrawn) {
      setErrorMessage('กรุณาจรดลายเซ็นลูกค้าในช่องลายเซ็นก่อนยืนยัน');
      return;
    }
    if (!signeeName.trim()) {
      setErrorMessage('กรุณาระบุชื่อ-นามสกุล ผู้เซ็นรับมอบชุด');
      return;
    }
    if (!agreed) {
      setErrorMessage('กรุณาทำเครื่องหมายยินยอมตรวจสอบและรับมอบชุด');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL('image/png');

    const now = new Date();
    const formattedDate = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ` เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

    onConfirmSignature(order.id, signatureDataUrl, signeeName.trim(), formattedDate);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-natural-espresso/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-natural-wheat overflow-hidden flex flex-col my-8 animate-fadeIn">
        
        {/* Modal Header */}
        <div className="bg-natural-espresso text-natural-cream p-5 flex items-center justify-between border-b border-natural-espresso/20">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-natural-clay/30 border border-natural-clay/40 flex items-center justify-center text-natural-cream">
              <PenTool className="h-5 w-5 text-natural-ochre" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold tracking-wide text-natural-cream">
                เซ็นรับมอบชุดสั่งตัด (Pickup Sign-off)
              </h3>
              <p className="text-[11px] text-natural-cream/70 font-mono">
                ออเดอร์: <strong className="text-natural-ochre">{order.orderNumber}</strong> ({order.customerName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-natural-cream/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] bg-natural-cream/20">
          
          {/* Important Security Warning */}
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-amber-900 shadow-xs">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-950">
                <Lock className="h-3.5 w-3.5 text-amber-700 inline" /> การล็อกข้อมูลออเดอร์ถาวร (Security Guarantee)
              </p>
              <p className="text-amber-800/90 leading-relaxed">
                เมื่อบันทึกลายเซ็นรับมอบเรียบร้อยแล้ว ออเดอร์นี้จะเปลี่ยนสถานะเป็น <strong className="text-emerald-800 underline">"ส่งมอบสำเร็จ"</strong> และระบบจะ <strong className="text-amber-950 underline">ล็อกข้อมูลถาวร ห้ามแก้ไขหรือลบทุกกรณี</strong> เพื่อใช้เป็นหลักฐานยืนยันความสมบูรณ์
              </p>
            </div>
          </div>

          {/* Signee Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-natural-espresso">
              ชื่อ-นามสกุล ผู้เซ็นรับมอบชุด <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={signeeName}
              onChange={(e) => setSigneeName(e.target.value)}
              placeholder="ระบุชื่อผู้รับมอบชุด (ลูกค้า หรือ ผู้รับแทน)"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-natural-wheat bg-white focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay font-medium text-natural-espresso"
            />
          </div>

          {/* Canvas Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-natural-espresso flex items-center gap-1.5">
                <span>จรดลายเซ็นลงในกรอบด้านล่าง</span>
                <span className="text-[10px] text-natural-espresso/50 font-normal">(ใช้นิ้วมือสัมผัส หรือ เม้าส์ลากเซ็น)</span>
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>ล้างลายเซ็น</span>
              </button>
            </div>

            <div className="relative border-2 border-dashed border-natural-clay/40 rounded-2xl bg-white overflow-hidden shadow-inner group hover:border-natural-clay transition-colors">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 touch-none cursor-crosshair bg-white"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-natural-espresso/35 space-y-1">
                  <PenTool className="h-7 w-7 opacity-40 animate-bounce" />
                  <span className="text-xs font-serif font-bold">เซ็นชื่อตรงนี้</span>
                </div>
              )}
              <div className="absolute bottom-2 right-3 pointer-events-none text-[9px] text-natural-espresso/40 font-mono">
                NUNUH Atelier Digital Sign
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start space-x-3 p-3.5 bg-white rounded-2xl border border-natural-wheat/80 cursor-pointer hover:bg-natural-sand/20 transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-natural-wheat text-natural-espresso focus:ring-natural-clay cursor-pointer"
            />
            <span className="text-xs text-natural-espresso font-medium leading-relaxed">
              ข้าพเจ้าได้ตรวจสอบความถูกต้อง ความพอดีของขนาด และความสมบูรณ์เรียบร้อยของชุดสั่งตัด <strong className="text-natural-clay">"{order.dressType}"</strong> แล้ว ยินยอมรับมอบชุดไว้ในความครอบครอง
            </span>
          </label>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white p-5 border-t border-natural-wheat/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-natural-wheat text-xs font-bold text-natural-espresso hover:bg-natural-sand/30 transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-natural-espresso hover:bg-natural-clay text-natural-cream hover:text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>✍️ ยืนยันเซ็นรับมอบ & ล็อกข้อมูล</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
