/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, STATUS_MAP, Measurements, CatalogueItem, STANDARD_SIZE_CHART } from '../types';
import { Save, User, Sparkles, Ruler, CreditCard, ChevronRight, Check, Image as ImageIcon, UploadCloud, X, History, Database, MessageSquare, PenTool, Eraser, ShieldCheck, Lock } from 'lucide-react';
import { compressImage } from '../utils/image';

interface OrderFormProps {
  catalogue: CatalogueItem[];
  onAddOrder: (newOrder: Order) => void;
  nextOrderNumber: string;
  orders?: Order[];
  preselectedDesignId?: string;
  onClearPreselectedDesign?: () => void;
  staffName?: string;
  staffBranch?: string;
  activeStaffList?: Array<{ id: string; name: string; branch: string }>;
}

export default function OrderForm({ 
  catalogue, 
  onAddOrder, 
  nextOrderNumber, 
  orders = [],
  preselectedDesignId,
  onClearPreselectedDesign,
  staffName,
  staffBranch,
  activeStaffList = []
}: OrderFormProps) {
  // ฟอร์มแบ่งออกเป็น 4 ส่วนหลักเพื่อความเป็นระเบียบเรียบร้อย (Bento layout)
  const [selectedStaffName, setSelectedStaffName] = useState(staffName || activeStaffList[0]?.name || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSocial, setCustomerSocial] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [customerCategory, setCustomerCategory] = useState('IDD'); // ค่าเริ่มต้นเช่น IDD, IDH
  const [membershipTier, setMembershipTier] = useState<'PRIME' | 'PRIVILEGE' | 'TRADER' | 'MEMBER'>('MEMBER');
  const [externalOrderId, setExternalOrderId] = useState('');
  const [branch, setBranch] = useState(staffBranch || 'สาขานราธิวาส');
  
  const [dressType, setDressType] = useState('เดรสราตรี');
  const [customDressType, setCustomDressType] = useState('');
  const [fabricType, setFabricType] = useState('Heavy Premium Satin');
  const [customFabricType, setCustomFabricType] = useState('');
  const [fabricColor, setFabricColor] = useState('');
  
  const [selectedDesignId, setSelectedDesignId] = useState<string>('custom');
  const [customImage, setCustomImage] = useState<string>('');
  const [customImage2, setCustomImage2] = useState<string>('');
  
  // Custom design details
  const [silhouette, setSilhouette] = useState('A-Line');
  const [neckline, setNeckline] = useState('V-Neck');
  const [sleeves, setSleeves] = useState('Long Sleeves');

  // Measurements
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [shoulder, setShoulder] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [armhole, setArmhole] = useState('');
  const [length, setLength] = useState('');
  const [neck, setNeck] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [frontChest, setFrontChest] = useState('');
  const [backChest, setBackChest] = useState('');
  const [frontLength, setFrontLength] = useState('');
  const [backLength, setBackLength] = useState('');
  const [wrist, setWrist] = useState('');
  const [otherNotes, setOtherNotes] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Pricing & Delivery
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sku, setSku] = useState('');
  const [customerPhotoFront, setCustomerPhotoFront] = useState('');
  const [customerPhotoSide, setCustomerPhotoSide] = useState('');
  const [customerPhotoBack, setCustomerPhotoBack] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('เงินโอน');
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.RECEIVED);
  const [finalPaymentAmount, setFinalPaymentAmount] = useState('');
  const [finalPaymentDate, setFinalPaymentDate] = useState('');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState('เงินโอน');
  const [slipImage, setSlipImage] = useState<string>('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // งานเข้าชุด
  const [isMatchingSet, setIsMatchingSet] = useState(false);
  const [idhNumber, setIdhNumber] = useState('');

  // ลายเซ็นรับออเดอร์หน้าร้าน / พนักงาน (Staff / Customer Order Signature)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureDrawn, setHasSignatureDrawn] = useState(false);
  const [orderSignature, setOrderSignature] = useState<string>('');
  const [pickupSigneeName, setPickupSigneeName] = useState<string>('');
  const [pickupSignedAt, setPickupSignedAt] = useState<string>('');

  // ซิงค์ชื่อผู้เซ็นตามชื่อลูกค้าอัตโนมัติหากยังไม่ได้แก้ไข
  useEffect(() => {
    if (customerName && !pickupSigneeName) {
      setPickupSigneeName(customerName);
    }
  }, [customerName]);

  // ตั้งค่า Canvas สำหรับวาดลายเซ็น
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.strokeStyle = '#2B1B17';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignatureDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setOrderSignature(dataUrl);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ` เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
    setPickupSignedAt(formattedDate);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureDrawn(false);
    setOrderSignature('');
    setPickupSignedAt('');
  };

  // ค้นหาประวัติออเดอร์เดิมของลูกค้าตามเบอร์โทรศัพท์หรือชื่อ
  const getPastCustomerOrders = () => {
    if (!orders || orders.length === 0) return [];
    const cleanInputPhone = customerPhone.replace(/[\s-()]/g, '');
    if (!cleanInputPhone && !customerName.trim()) return [];

    return orders.filter(o => {
      if (cleanInputPhone) {
        const cleanOrderPhone = o.customerPhone.replace(/[\s-()]/g, '');
        return cleanOrderPhone === cleanInputPhone;
      }
      if (customerName.trim()) {
        return o.customerName.toLowerCase().includes(customerName.trim().toLowerCase());
      }
      return false;
    });
  };

  const pastCustomerOrders = getPastCustomerOrders();

  const handleApplyPastMeasurements = (pastOrder: Order) => {
    const m = pastOrder.measurements;
    setChest(m.chest !== '-' ? m.chest : '');
    setWaist(m.waist !== '-' ? m.waist : '');
    setHips(m.hips !== '-' ? m.hips : '');
    setShoulder(m.shoulder !== '-' ? m.shoulder : '');
    setSleeveLength(m.sleeveLength !== '-' ? m.sleeveLength : '');
    setArmhole(m.armhole !== '-' ? m.armhole : '');
    setLength(m.length !== '-' ? m.length : '');
    setNeck(m.neck && m.neck !== '-' ? m.neck : '');
    setHeight(m.height !== '-' ? m.height : '');
    setWeight(m.weight !== '-' ? m.weight : '');
    setFrontChest(m.frontChest && m.frontChest !== '-' ? m.frontChest : '');
    setBackChest(m.backChest && m.backChest !== '-' ? m.backChest : '');
    setFrontLength(m.frontLength && m.frontLength !== '-' ? m.frontLength : '');
    setBackLength(m.backLength && m.backLength !== '-' ? m.backLength : '');
    setWrist(m.wrist && m.wrist !== '-' ? m.wrist : '');
    setOtherNotes(m.otherNotes || '');
    if (m.standardSize) {
      setSelectedSize(m.standardSize);
    }
    // ดึงข้อมูลอื่นเพิ่มเติมหากว่างอยู่
    if (!customerSocial && pastOrder.customerSocial) setCustomerSocial(pastOrder.customerSocial);
    if (!lineUserId && pastOrder.lineUserId) setLineUserId(pastOrder.lineUserId);
    if (pastOrder.customerCategory) setCustomerCategory(pastOrder.customerCategory);
    if (pastOrder.membershipTier) setMembershipTier(pastOrder.membershipTier);
    if (pastOrder.isMatchingSet !== undefined) setIsMatchingSet(pastOrder.isMatchingSet);
    if (pastOrder.idhNumber) setIdhNumber(pastOrder.idhNumber);
  };

  // จัดการเมื่อเลือกแบบในแคตตาล็อก
  const handleSelectDesign = (designId: string) => {
    setSelectedDesignId(designId);
    if (designId !== 'custom') {
      const selected = catalogue.find(item => item.id === designId);
      if (selected) {
        setDressType(selected.category === 'Abaya' ? 'อาบายะห์' : 'เดรสราตรี');
        setFabricType(selected.fabricRecommend.split(' & ')[0] || '');
        setSku(selected.sku || '');
        
        // บันทึกรูปภาพแบบลงในรูปภาพสั่งตัดของออเดอร์ทันทีตามคำสั่งข้อ 1 ของผู้ใช้
        if (selected.image) {
          setCustomImage(selected.image);
        }
        
        // ตรวจสอบราคาเฉพาะไซส์ที่เลือกไว้ก่อนหน้า ถ้ามีให้ใส่ราคานั้นทันที
        if (selectedSize && selected.sizePrices && selected.sizePrices[selectedSize]) {
          const customPrice = selected.sizePrices[selectedSize];
          setPrice(customPrice.toString());
          setDeposit((customPrice / 2).toString());
        } else {
          // แนะนำราคาเริ่มต้นจากช่วงราคาของแบบชุด
          const numMatch = selected.priceRange.match(/\d+,\d+/g);
          if (numMatch && numMatch[0]) {
            const cleanNum = numMatch[0].replace(',', '');
            setPrice(cleanNum);
            setDeposit((parseInt(cleanNum) / 2).toString());
          }
        }
      }
    } else {
      setSku('');
    }
  };

  const handleSkuChange = (newSku: string) => {
    setSku(newSku);
    const matched = catalogue.find(item => item.sku && item.sku.toUpperCase() === newSku.toUpperCase().trim());
    if (matched) {
      setSelectedDesignId(matched.id);
      setDressType(matched.category === 'Abaya' ? 'อาบายะห์' : 'เดรสราตรี');
      setFabricType(matched.fabricRecommend.split(' & ')[0] || '');
      
      // บันทึกรูปภาพแบบลงในรูปภาพสั่งตัดของออเดอร์ทันทีตามคำสั่งข้อ 1 ของผู้ใช้
      if (matched.image) {
        setCustomImage(matched.image);
      }
      
      if (selectedSize && matched.sizePrices && matched.sizePrices[selectedSize]) {
        const customPrice = matched.sizePrices[selectedSize];
        setPrice(customPrice.toString());
        setDeposit((customPrice / 2).toString());
      } else {
        const numMatch = matched.priceRange.match(/\d+,\d+/g);
        if (numMatch && numMatch[0]) {
          const cleanNum = numMatch[0].replace(',', '');
          setPrice(cleanNum);
          setDeposit((parseInt(cleanNum) / 2).toString());
        }
      }
    } else {
      setSelectedDesignId('custom');
    }
  };

  // ตอบสนองเมื่อมีแบบชุดถูกส่งมาจากหน้าแคตตาล็อกผ่าน props
  useEffect(() => {
    if (preselectedDesignId && preselectedDesignId !== 'custom') {
      handleSelectDesign(preselectedDesignId);
      // เคลียร์ค่า preselected ใน App.tsx เพื่อไม่ให้รีเซ็ตกลับเมื่อพิมพ์ข้อมูลอื่น
      if (onClearPreselectedDesign) {
        onClearPreselectedDesign();
      }
    }
  }, [preselectedDesignId]);

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!customerName.trim()) tempErrors.customerName = "กรุณากรอกชื่อลูกค้า";
    if (!customerPhone.trim()) tempErrors.customerPhone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!price || isNaN(Number(price))) tempErrors.price = "กรุณากรอกราคาให้ถูกต้อง";
    if (!deposit || isNaN(Number(deposit))) tempErrors.deposit = "กรุณากรอกมัดจำให้ถูกต้อง";
    if (!deliveryDate) tempErrors.deliveryDate = "กรุณาเลือกวันกำหนดส่งชุด";
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // เลื่อนขึ้นไปแสดงข้อผิดพลาด
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const measurementsData: Measurements = {
      chest: chest || "-",
      waist: waist || "-",
      hips: hips || "-",
      shoulder: shoulder || "-",
      sleeveLength: sleeveLength || "-",
      armhole: armhole || "-",
      length: length || "-",
      neck: neck || "-",
      height: height || "-",
      weight: weight || "-",
      frontChest: frontChest || "-",
      backChest: backChest || "-",
      frontLength: frontLength || "-",
      backLength: backLength || "-",
      wrist: wrist || "-",
      otherNotes: otherNotes,
      standardSize: selectedSize || undefined
    };

    const finalDressType = dressType === 'อื่นๆ' ? customDressType : dressType;
    const finalFabricType = fabricType;

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderNumber: nextOrderNumber,
      customerName,
      customerPhone,
      customerSocial: customerSocial || undefined,
      lineUserId: lineUserId || undefined,
      dressType: finalDressType,
      fabricType: finalFabricType,
      fabricColor: fabricColor || "ตามแบบ",
      orderDate: todayStr,
      deliveryDate,
      price: parseInt(price),
      deposit: parseInt(deposit),
      discount: discount ? parseInt(discount) : 0,
      finalPaymentAmount: finalPaymentAmount.trim() !== '' ? (parseInt(finalPaymentAmount) || 0) : undefined,
      finalPaymentDate: finalPaymentDate.trim() || undefined,
      finalPaymentMethod: finalPaymentAmount.trim() !== '' && (parseInt(finalPaymentAmount) || 0) > 0 ? finalPaymentMethod : undefined,
      measurements: measurementsData,
      status: status || OrderStatus.RECEIVED,
      notes: notes || undefined,
      selectedDesignId: selectedDesignId !== 'custom' ? selectedDesignId : undefined,
      sku: sku.trim() || undefined,
      customDesign: selectedDesignId === 'custom' ? {
        silhouette,
        neckline,
        sleeves
      } : undefined,
      customImage: customImage || undefined,
      customImage2: customImage2 || undefined,
      customerPhotoFront: customerPhotoFront || undefined,
      customerPhotoSide: customerPhotoSide || undefined,
      customerPhotoBack: customerPhotoBack || undefined,
      paymentMethod: paymentMethod || 'เงินโอน',
      slipImage: slipImage || undefined,
      customerCategory: customerCategory || undefined,
      membershipTier: membershipTier,
      externalOrderId: externalOrderId.trim() || undefined,
      branch: branch || staffBranch || 'สาขานราธิวาส',
      staffName: selectedStaffName || staffName || undefined,
      staffBranch: staffBranch || branch || undefined,
      isMatchingSet: isMatchingSet || undefined,
      idhNumber: isMatchingSet ? (idhNumber.trim() || undefined) : undefined,
      pickupSignature: orderSignature || undefined,
      pickupSigneeName: pickupSigneeName || customerName || undefined,
      pickupSignedAt: orderSignature ? (pickupSignedAt || new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })) : undefined
    };

    onAddOrder(newOrder);
    setIsSuccess(true);
    
    // รีเซ็ตฟอร์ม
    setTimeout(() => {
      setIsSuccess(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerSocial('');
      setCustomerCategory('IDD');
      setMembershipTier('MEMBER');
      setExternalOrderId('');
      setBranch('สาขานราธิวาส');
      setIsMatchingSet(false);
      setIdhNumber('');
      handleClearSignature();
      setPickupSigneeName('');
      setPickupSignedAt('');
      setFabricColor('');
      setSku('');
      setChest('');
      setWaist('');
      setHips('');
      setShoulder('');
      setSleeveLength('');
      setArmhole('');
      setLength('');
      setNeck('');
      setHeight('');
      setWeight('');
      setFrontChest('');
      setBackChest('');
      setFrontLength('');
      setBackLength('');
      setWrist('');
      setOtherNotes('');
      setPrice('');
      setDeposit('');
      setDiscount('');
      setDiscountPercent('');
      setDeliveryDate('');
      setNotes('');
      setSelectedDesignId('custom');
      setCustomImage('');
      setCustomImage2('');
      setCustomerPhotoFront('');
      setCustomerPhotoSide('');
      setCustomerPhotoBack('');
      setPaymentMethod('เงินโอน');
      setSlipImage('');
      setSelectedSize('');
    }, 2000);
  };

  const handleSizeChange = (size: string, isIdh: boolean = false) => {
    setSelectedSize(size);
    if (size && STANDARD_SIZE_CHART[size]) {
      const config = STANDARD_SIZE_CHART[size];
      setChest(config.chest);
      setWaist(config.waist);
      setHips(config.hips);
      setShoulder(config.shoulder);
      setSleeveLength(config.sleeveLength);
      setLength(config.length);
    } else if (isIdh) {
      setChest('');
      setWaist('');
      setHips('');
      setShoulder('');
      setSleeveLength('');
      setArmhole('');
      setLength('');
      setNeck('');
      setHeight('');
      setWeight('');
      setFrontChest('');
      setBackChest('');
      setFrontLength('');
      setBackLength('');
      setWrist('');
    }

    // อัปเดตราคาและเงินมัดจำหากแบบชุดที่เลือกมีราคาเฉพาะไซส์นี้ตั้งไว้
    if (size) {
      let targetDesign = null;
      if (selectedDesignId !== 'custom') {
        targetDesign = catalogue.find(item => item.id === selectedDesignId);
      } else if (sku) {
        targetDesign = catalogue.find(item => item.sku && item.sku.toUpperCase() === sku.toUpperCase().trim());
      }

      if (targetDesign && targetDesign.sizePrices && targetDesign.sizePrices[size]) {
        const customPrice = targetDesign.sizePrices[size];
        setPrice(customPrice.toString());
        setDeposit((customPrice / 2).toString());
      }
    }
  };

  const autofillTemplate = () => {
    setCustomerName("คุณมัสยา มีสุข");
    setCustomerPhone("086-555-1234");
    setCustomerSocial("Line: massy_me");
    setCustomerCategory("IDD");
    setMembershipTier("PRIME");
    setFabricColor("Burgundy Deep Red");
    setChest("34");
    setWaist("26");
    setHips("37");
    setShoulder("15");
    setSleeveLength("22");
    setArmhole("15");
    setLength("56");
    setNeck("13.5");
    setHeight("163");
    setWeight("52");
    setFrontChest("13.5");
    setBackChest("14");
    setFrontLength("14.5");
    setBackLength("15.5");
    setWrist("6.5");
    setPrice("4500");
    setDeposit("2250");
    const demoDeliveryDate = new Date();
    demoDeliveryDate.setDate(demoDeliveryDate.getDate() + 7);
    setDeliveryDate(demoDeliveryDate.toISOString().split('T')[0]);
    setNotes("ต้องการซับในหนานุ่มพิเศษ และผ่าปลายแขนใส่กระดุมปั๊มทอง");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {isSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-8 text-center animate-pulse flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-serif font-bold">บันทึกออเดอร์สำเร็จ!</h3>
          <p className="text-sm">ออเดอร์หมายเลข <span className="font-mono font-bold text-lg">{nextOrderNumber}</span> ได้รับการบันทึกเข้าระบบแล้ว</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex justify-between items-center bg-natural-sand p-4 rounded-2xl border border-natural-wheat">
            <div className="flex items-center space-x-3">
              <span className="bg-natural-espresso text-natural-cream font-mono text-sm px-3 py-1.5 rounded-lg font-bold">
                {nextOrderNumber}
              </span>
              <div>
                <p className="text-xs text-natural-espresso/60 font-medium">รหัสออเดอร์ใหม่ถัดไป</p>
                <p className="text-sm font-semibold text-natural-espresso">ระบบจะระบุเลขนี้โดยอัตโนมัติ</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={autofillTemplate}
              className="text-xs bg-natural-wheat hover:bg-natural-wheat/80 text-natural-espresso py-1.5 px-3 rounded-lg transition-all font-medium cursor-pointer"
            >
              🪄 ใช้ข้อมูลตัวอย่างด่วน
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: ข้อมูลลูกค้า */}
            <div className="bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-3">
                <div className="p-1.5 bg-natural-sand rounded-lg text-natural-espresso">
                  <User className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso">1. ข้อมูลลูกค้า (Customer Info)</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">พนักงานผู้รับออเดอร์ (Staff Record)</label>
                  {activeStaffList.length > 0 ? (
                    <select
                      value={selectedStaffName}
                      onChange={(e) => setSelectedStaffName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-natural-wheat text-xs font-bold bg-natural-cream/20 text-natural-espresso focus:outline-none focus:ring-2 focus:ring-natural-clay/20"
                    >
                      {activeStaffList.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name} ({st.branch})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedStaffName}
                      onChange={(e) => setSelectedStaffName(e.target.value)}
                      placeholder="ระบุชื่อพนักงานผู้รับออเดอร์"
                      className="w-full px-3 py-2 rounded-xl border border-natural-wheat text-xs font-bold bg-natural-cream/20 text-natural-espresso focus:outline-none focus:ring-2 focus:ring-natural-clay/20"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">สาขาที่รับออเดอร์ <span className="text-natural-clay">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['สาขานราธิวาส', 'สาขายะลา', 'สาขาปัตตานี', 'สาขาหาดใหญ่'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBranch(b)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          branch === b
                            ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                            : 'bg-natural-cream/20 hover:bg-natural-sand text-natural-espresso border-natural-wheat'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ชื่อลูกค้า <span className="text-natural-clay">*</span></label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="เช่น คุณอาลีญา มะหมัด"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                  />
                  {errors.customerName && <p className="text-xs text-rose-500 mt-1">{errors.customerName}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-natural-espresso/70 mb-1">เบอร์โทรศัพท์ <span className="text-natural-clay">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                    />
                    {errors.customerPhone && <p className="text-xs text-rose-500 mt-1">{errors.customerPhone}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ช่องทางติดต่อโซเชียล</label>
                    <input
                      type="text"
                      value={customerSocial}
                      onChange={(e) => setCustomerSocial(e.target.value)}
                      placeholder="เช่น IG, Line id"
                      className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">LINE User ID (สำหรับเปิดแชท/ส่งข้อความโดยตรง)</label>
                  <input
                    type="text"
                    value={lineUserId}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const matches = val.match(/U[0-9a-zA-Z]{32}/g);
                      if (matches && matches.length > 0) {
                        // Customer ID is always the last match in a full URL
                        setLineUserId(matches[matches.length - 1]);
                      } else {
                        setLineUserId(e.target.value);
                      }
                    }}
                    placeholder="เช่น U1234567890abcdef1234567890abcdef"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20 font-mono"
                  />
                  <p className="text-[10px] text-natural-espresso/50 mt-1.5 leading-relaxed bg-natural-sand/30 p-2 rounded-lg border border-natural-wheat/30">
                    💡 <strong>รหัสนี้คืออะไร?</strong> คือรหัสเฉพาะใน LINE สำหรับลิงก์ไปหน้าแชทคนนี้โดยตรง คุณสามารถได้รหัสนี้มา 2 วิธี:<br />
                    1. <strong>อัตโนมัติ:</strong> เพียงให้ลูกค้าแชทพิมพ์เบอร์โทรหรือเลขที่ออเดอร์ใน LINE ร้าน ระบบจะดึงรหัสนี้มาบันทึกให้เองทันที!<br />
                    2. <strong>คัดลอกมาวางเอง:</strong> เมื่อคุณคุยกับลูกค้าบนเบราว์เซอร์ ให้ก๊อปรหัสตัว "U" หลังคำว่า <code className="bg-white/80 px-1 font-mono text-[9px]">/user/</code> ในช่อง Address bar ด้านบน มาวางที่นี่ได้เลยค่ะ
                  </p>
                </div>

                {/* ประวัติและฟีดแบ็กเดิมของลูกค้า (Customer History & Feedback Lookup) */}
                {pastCustomerOrders.length > 0 && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/50 rounded-xl space-y-3 mt-2 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-amber-200/30 pb-2">
                      <div className="flex items-center space-x-2 text-amber-950">
                        <History className="h-4 w-4 text-natural-clay" />
                        <span className="text-xs font-bold font-serif">✨ ประวัติและ FEEDBACK ของลูกค้าท่านนี้ ({pastCustomerOrders.length} รายการ)</span>
                      </div>
                      <span className="text-[9px] bg-natural-clay/10 text-natural-clay font-bold px-2 py-0.5 rounded-full">พบคลังข้อมูล</span>
                    </div>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {pastCustomerOrders.map((past) => {
                        const m = past.measurements;
                        const feedbacks = past.feedbacks || [];
                        return (
                          <div key={past.id} className="bg-white p-2.5 rounded-lg border border-amber-200/30 shadow-3xs space-y-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-natural-espresso">ออเดอร์: <span className="font-mono text-xs">{past.orderNumber}</span> ({past.dressType})</span>
                              <span className="text-natural-espresso/50 font-mono">{past.orderDate}</span>
                            </div>

                            {/* Measurements Quick Preview */}
                            <div className="bg-natural-sand/10 p-1.5 rounded text-[10px] grid grid-cols-4 gap-x-2 gap-y-1 text-natural-espresso/80 font-mono">
                              <div>อก: <span className="font-bold">{m.chest || '-'}</span></div>
                              <div>เอว: <span className="font-bold">{m.waist || '-'}</span></div>
                              <div>สพ: <span className="font-bold">{m.hips || '-'}</span></div>
                              <div>ยาว: <span className="font-bold">{m.length || '-'}</span></div>
                            </div>

                            {/* Feedbacks in this order */}
                            {feedbacks.length > 0 ? (
                              <div className="space-y-1 border-t border-natural-sand/20 pt-1.5">
                                <span className="text-[9px] font-bold text-natural-clay uppercase tracking-wider flex items-center">
                                  <MessageSquare className="h-2.5 w-2.5 mr-1" /> ประวัติฟีดแบ็กของออเดอร์นี้:
                                </span>
                                <div className="space-y-1 max-h-24 overflow-y-auto bg-natural-sand/5 p-1 rounded border border-natural-wheat/20 text-[9px]">
                                  {feedbacks.map((f) => (
                                    <div key={f.id} className="leading-tight text-natural-espresso/85">
                                      <strong className={f.sender === 'customer' ? 'text-amber-800' : 'text-natural-clay'}>
                                        {f.sender === 'customer' ? 'ลูกค้า: ' : 'ร้านค้า: '}
                                      </strong>
                                      <span>{f.content}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              past.notes && (
                                <div className="text-[9.5px] text-natural-espresso/70 italic bg-natural-sand/5 p-1 rounded">
                                  📌 โน้ต: {past.notes}
                                </div>
                              )
                            )}

                            {/* Action Button */}
                            <button
                              type="button"
                              onClick={() => handleApplyPastMeasurements(past)}
                              className="w-full text-center py-1.5 bg-natural-espresso hover:bg-natural-clay text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Database className="h-3.5 w-3.5" />
                              <span>📥 ดึงสัดส่วนและโปรไฟล์ลูกค้ามาใส่ฟอร์ม</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}



                {/* ประเภทงาน */}
                <div className="pt-1">
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ประเภทงาน (Job Type)</label>
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                    {['IDD', 'IDH', 'ทั่วไป'].map((cat) => {
                      const isSelected = customerCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCustomerCategory(cat);
                            if (cat === 'IDH') {
                              setIsMatchingSet(true);
                            }
                          }}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer border ${
                            isSelected
                              ? 'bg-natural-clay text-white border-natural-clay'
                              : 'bg-white hover:bg-natural-sand/20 text-natural-espresso/80 border-natural-wheat'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* เป็นงานเข้าชุด */}
                <div className="pt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isMatchingSet}
                      onChange={(e) => {
                        setIsMatchingSet(e.target.checked);
                      }}
                      className="h-4.5 w-4.5 rounded border-natural-wheat text-natural-clay focus:ring-natural-clay/20 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-natural-espresso">เป็นงานเข้าชุด (Matching Set)</span>
                  </label>
                  
                  {isMatchingSet && (
                    <div className="mt-2 pl-7 animate-fade-in">
                      <label className="block text-[11px] font-bold text-natural-clay mb-1">เลข IDH สำหรับงานเข้าชุด (IDH Number)</label>
                      <input
                        type="text"
                        value={idhNumber}
                        onChange={(e) => setIdhNumber(e.target.value)}
                        placeholder="ระบุเลข IDH เช่น IDH-88, IDH-102"
                        className="w-full max-w-xs text-xs px-3 py-2 rounded-lg border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-amber-50/20 font-bold text-natural-espresso placeholder-natural-espresso/40"
                      />
                    </div>
                  )}
                </div>

                {/* ประเภทบัตรสมาชิก */}
                <div className="pt-2 border-t border-natural-sand/30">
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1.5">ประเภทบัตรสมาชิก (Membership Card Type)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'PRIME', label: '1. PRIME' },
                      { id: 'PRIVILEGE', label: '2. PRIVILEGE' },
                      { id: 'TRADER', label: '3. TRADER' },
                      { id: 'MEMBER', label: '4. MEMBER' }
                    ] as const).map((tier) => {
                      const isSelected = membershipTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setMembershipTier(tier.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border flex items-center justify-between ${
                            isSelected
                              ? 'bg-natural-clay text-white border-natural-clay'
                              : 'bg-white hover:bg-natural-sand/20 text-natural-espresso/80 border-natural-wheat'
                          }`}
                        >
                          <span>{tier.label}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-white text-natural-clay border-white' : 'border-natural-wheat bg-natural-sand/20'
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[4]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: การเลือกแบบชุด */}
            <div className="bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-3">
                <div className="p-1.5 bg-natural-sand rounded-lg text-natural-espresso">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso">2. เลือกแบบชุดเสนอลูกค้า (Design)</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1 flex items-center space-x-1">
                    <span>เลือกแบบชุดเสนอแนะนำ (Designer Catalogue Selection)</span>
                  </label>
                  <select
                    value={selectedDesignId}
                    onChange={(e) => handleSelectDesign(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-white text-natural-espresso font-semibold"
                  >
                    <option value="custom">✨ กำหนดเอง / ออกแบบพิเศษ (Custom Design)</option>
                    {catalogue.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku ? `[${item.sku}] ` : ''}{item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1 flex items-center space-x-1">
                    <span>รหัสสินค้า / SKU</span>
                    <span className="text-[10px] text-natural-clay font-bold">(ดึงอัตโนมัติ/ระบุเพิ่ม)</span>
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="เช่น NNH-MKB-06"
                    list="sku-suggestions"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20 font-mono uppercase font-bold text-natural-clay"
                  />
                  <datalist id="sku-suggestions">
                    {catalogue.map((item) => (
                      <option key={item.id} value={item.sku}>
                        {item.name}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* แสดงรูปตัวอย่างชุดและข้อมูลแบบชุดเสนอแนะนำที่เลือก */}
                {(() => {
                  const matchedItem = selectedDesignId !== 'custom'
                    ? catalogue.find(item => item.id === selectedDesignId)
                    : (sku ? catalogue.find(item => item.sku && item.sku.toUpperCase() === sku.toUpperCase().trim()) : null);

                  if (!matchedItem) return null;

                  return (
                    <div className="bg-natural-sand/15 border border-natural-wheat rounded-2xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-fade-in mt-2">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-xl border border-natural-wheat p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                        <img 
                          src={matchedItem.image} 
                          alt={matchedItem.name} 
                          className="w-full h-full object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="text-[10px] bg-natural-clay text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                            {matchedItem.sku}
                          </span>
                          <span className="text-[10px] bg-natural-sand text-natural-espresso px-2 py-0.5 rounded-full font-bold">
                            {matchedItem.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-serif font-bold text-natural-espresso">
                          {matchedItem.name}
                        </h4>
                        <p className="text-xs text-natural-espresso/70 leading-relaxed line-clamp-2">
                          {matchedItem.description}
                        </p>
                        <p className="text-xs text-natural-ochre font-bold pt-1">
                          เริ่มต้น: {matchedItem.priceRange} (ผ้าแนะนำ: {matchedItem.fabricRecommend})
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">รหัสสี / สีผ้าที่ต้องการ</label>
                  <input
                    type="text"
                    value={fabricColor}
                    onChange={(e) => setFabricColor(e.target.value)}
                    placeholder="เช่น กรมท่าเข้ม, นู้ดชมพูอ่อน, แดงเบอร์กันดี"
                    list="color-suggestions"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                  />
                  <datalist id="color-suggestions">
                    <option value="ตามแบบ" />
                    <option value="กรมท่าเข้ม" />
                    <option value="นู้ดชมพูอ่อน" />
                    <option value="แดงเบอร์กันดี" />
                    <option value="ชมพูกลีบบัว" />
                    <option value="สีกะปิ" />
                    <option value="เทาอมฟ้า" />
                    <option value="เทาเงิน" />
                    <option value="น้ำตาลทอง" />
                    <option value="น้ำตาลช็อกโกแลต" />
                    <option value="ชมพูพีช" />
                    <option value="ดำสนิท" />
                    <option value="เขียวเอมเมอรัลด์" />
                    <option value="Midnight Black & Gold" />
                    <option value="Emerald Green" />
                    <option value="Dusty Rose" />
                    <option value="Off-White Cream" />
                    <option value="Lavender Mist" />
                    <option value="Ruby Burgundy" />
                  </datalist>
                </div>

                {/* อัปโหลดรูปภาพที่ลูกค้าจะสั่งตัด */}
                <div className="pt-3 border-t border-natural-sand/55">
                  <label className="block text-xs font-bold text-natural-espresso/80 mb-2 flex items-center space-x-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-natural-clay" />
                    <span>แนบรูปภาพแบบชุดสั่งตัด (Design Reference Photos)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* ช่องที่ 1 */}
                    <div>
                      <p className="text-[10px] font-bold text-natural-espresso/50 mb-1">รูปภาพช่องที่ 1 (Photo 1)</p>
                      {customImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-2 flex items-center justify-between h-[84px]">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <img 
                              src={customImage} 
                              alt="Custom Design Reference 1" 
                              className="h-14 w-14 object-cover rounded-lg border border-natural-wheat shadow-xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-natural-espresso">แนบรูปภาพเรียบร้อย ✓</p>
                              <p className="text-[10px] text-natural-espresso/50">รูปภาพช่องที่ 1</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomImage('')}
                            className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1 shrink-0"
                            title="ลบรูปภาพ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-3 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center h-[84px] flex flex-col items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                compressImage(file, 800, 800, 0.75)
                                  .then(setCustomImage)
                                  .catch((err) => {
                                    console.error(err);
                                    alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                                  });
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="คลิกหรือลากรูปภาพมาวางที่นี่"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <UploadCloud className="h-6 w-6 text-natural-clay/75" />
                            <p className="text-[11px] font-bold text-natural-espresso">อัปโหลดภาพที่ 1</p>
                            <p className="text-[9px] text-natural-espresso/40 font-medium">คลิกหรือลากไฟล์ภาพ</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ช่องที่ 2 */}
                    <div>
                      <p className="text-[10px] font-bold text-natural-espresso/50 mb-1">รูปภาพช่องที่ 2 (Photo 2)</p>
                      {customImage2 ? (
                        <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-2 flex items-center justify-between h-[84px]">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <img 
                              src={customImage2} 
                              alt="Custom Design Reference 2" 
                              className="h-14 w-14 object-cover rounded-lg border border-natural-wheat shadow-xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-natural-espresso">แนบรูปภาพเรียบร้อย ✓</p>
                              <p className="text-[10px] text-natural-espresso/50">รูปภาพช่องที่ 2</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomImage2('')}
                            className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1 shrink-0"
                            title="ลบรูปภาพ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-3 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center h-[84px] flex flex-col items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                compressImage(file, 800, 800, 0.75)
                                  .then(setCustomImage2)
                                  .catch((err) => {
                                    console.error(err);
                                    alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                                  });
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="คลิกหรือลากรูปภาพมาวางที่นี่"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <UploadCloud className="h-6 w-6 text-natural-clay/75" />
                            <p className="text-[11px] font-bold text-natural-espresso">อัปโหลดภาพที่ 2</p>
                            <p className="text-[9px] text-natural-espresso/40 font-medium">คลิกหรือลากไฟล์ภาพ</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 📲 LINE Official QR Code Section for Staff to Show Customers */}
                {(() => {
                  const activeLineOaId = localStorage.getItem('nunuh_line_oa_id') || '@237aynfq';
                  const cleanOaId = activeLineOaId.trim().replace(/^@/, '');
                  const lineQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://line.me/R/ti/p/@${cleanOaId}`)}`;
                  return (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center space-x-4 shadow-3xs animate-fade-in mt-4">
                      <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-3xs shrink-0 flex flex-col items-center">
                        <img 
                          src={lineQrUrl}
                          alt="LINE QR Code" 
                          className="h-18 w-18"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] font-bold text-[#05b34c] mt-1">สแกน QR Code</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#05b34c] text-white tracking-wider animate-pulse">
                            LINE OFFICIAL
                          </span>
                          <span className="text-[10px] font-bold text-natural-espresso/60">@{cleanOaId}</span>
                        </div>
                        <h4 className="text-xs font-bold text-natural-espresso font-serif">ให้ลูกค้าสแกนแอดไลน์ทันที! 📲</h4>
                        <p className="text-[10px] text-natural-espresso/70 leading-relaxed">
                          พนักงานกรุณาแจ้งให้ลูกค้า <strong>สแกน QR Code นี้เพื่อเพิ่มเพื่อน</strong> และทักแชทเข้ามา เพื่อเปิดรับระบบแจ้งเตือนอัปเดตสถานะชุดสั่งตัดผ่านไลน์แบบอัตโนมัติค่ะ ✨
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* CARD 3: ตารางสัดส่วนวัดตัว (Measurements) */}
          <div className="bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-natural-sand pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-natural-sand rounded-lg text-natural-espresso">
                  <Ruler className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso">3. ตารางวัดตัวสัดส่วนลูกค้า (Measurements in inches)</h3>
              </div>
              <span className="text-[10px] bg-natural-sand text-natural-espresso/70 px-2 py-1 rounded font-bold uppercase">
                หน่วย: นิ้ว (Inches)
              </span>
            </div>

            {customerCategory === 'IDH' ? (
              <div className="bg-amber-50/40 p-5 rounded-xl border border-amber-200/50 space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/30 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-natural-espresso flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-natural-clay" />
                      <span>กดเลือกไซส์ผ้าคลุม (IDH Hijab Size Selection)</span>
                    </h4>
                    <p className="text-xs text-natural-espresso/60 mt-1">
                      เมื่อลูกค้าสั่งตัดผ้าคลุม (IDH) ไม่จำเป็นต้องระบุรายละเอียดสัดส่วนตัวค่ะ โปรดเลือกไซส์ผ้าคลุมที่ต้องการด้านล่างนี้ได้เลยค่ะ
                    </p>
                  </div>
                  <span className="text-[10px] bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-3 py-1 rounded-full font-bold">
                    ไซส์ผ้าคลุม IDH 🧕
                  </span>
                </div>

                {/* ปุ่มเลือกไซส์ผ้าคลุม */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {['SS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeChange(size, true)}
                        className={`px-5 py-3 text-sm font-serif font-black rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center min-w-[70px] shadow-2xs ${
                          isSelected
                            ? 'bg-natural-clay text-white border-natural-clay scale-105 shadow-md ring-2 ring-natural-clay/20'
                            : 'bg-white hover:bg-natural-sand/25 text-natural-espresso border-natural-wheat hover:border-natural-clay/30'
                        }`}
                      >
                        <span className="text-sm">{size}</span>
                        <span className={`text-[9px] mt-0.5 font-sans font-medium ${isSelected ? 'text-white/80' : 'text-natural-espresso/45'}`}>
                          ผ้าคลุม IDH
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/40 text-xs text-amber-900/80 leading-relaxed">
                  💡 <strong>ข้อมูลเพิ่มเติม:</strong> การเลือกไซส์ผ้าคลุม <span className="font-bold">{selectedSize || '(ยังไม่ได้เลือก)'}</span> จะทำการกำหนดสัดส่วนผ้าคลุมโดยอัตโนมัติ ช่างแพทเทิร์นจะใช้ข้อมูลขนาดมาตรฐานของผ้าคลุม NUNUH เพื่อจัดเตรียมและตัดเย็บค่ะ หากมีรายละเอียดส่วนสูงหรือข้อกำหนดพิเศษเพิ่มเติม สามารถบันทึกในช่องด้านล่างได้เลยค่ะ
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">รายละเอียดการวัดตัวและสัดส่วนเพิ่มเติม (สำหรับผ้าคลุม)</label>
                  <textarea
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    placeholder="เช่น ความยาวหน้าผ้าคลุมยาวเป็นพิเศษ, ต้องการผ่าข้างแขน หรือดีเทลอื่นๆ..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-white"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* เลือกไซส์มาตรฐาน */}
                <div className="bg-natural-sand/20 p-4 rounded-xl border border-natural-wheat/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-natural-espresso flex items-center space-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-natural-ochre" />
                        <span>เลือกไซส์มาตรฐาน (Standard Size Preset)</span>
                      </h4>
                      <p className="text-[10px] text-natural-espresso/60">
                        เลือกไซส์มาตรฐานเพื่อกรอกข้อมูลสัดส่วนโดยอัตโนมัติ (สามารถปรับสัดส่วนหลวม/แน่น เพิ่มได้ทีละช่องหลังจากกด)
                      </p>
                    </div>
                    <span className="text-[10px] bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-2.5 py-0.5 rounded-full font-bold">
                      ตาราง SIZE มาตรฐาน NUNUH 👗
                    </span>
                  </div>

                  {/* ปุ่มเลือกไซส์ */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-natural-espresso/80 mb-1.5">
                        <span>👶 ไซส์เด็ก (Kids):</span>
                        <span className="text-[10px] text-natural-clay font-medium">DDS, DDM, DDL (รอบอก 24"-32")</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['DDS', 'DDM', 'DDL'].map((size) => {
                          const isSelected = selectedSize === size;
                          const matchedItem = selectedDesignId !== 'custom' ? catalogue.find(item => item.id === selectedDesignId) : null;
                          const isRecommended = matchedItem && matchedItem.sizes ? matchedItem.sizes.includes(size) : false;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleSizeChange(size)}
                              className={`px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center min-w-[55px] border relative ${
                                isSelected
                                  ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                                  : isRecommended
                                    ? 'bg-natural-ochre/5 hover:bg-natural-ochre/15 text-natural-espresso border-natural-ochre/40'
                                    : 'bg-amber-50/50 hover:bg-amber-100/50 text-natural-espresso border-amber-200 hover:border-natural-clay/30'
                              }`}
                            >
                              <span className="text-xs flex items-center gap-0.5">
                                {size}
                                {isRecommended && (
                                  <span className="text-[8px] bg-natural-ochre text-white px-0.5 py-px rounded-xs leading-none font-sans" title="ไซส์ตรงปกแบบชุดนี้">
                                    ★
                                  </span>
                                )}
                              </span>
                              <span className={`text-[9px] mt-0.5 font-sans font-medium ${isSelected ? 'text-white/80' : isRecommended ? 'text-natural-ochre' : 'text-amber-900/60'}`}>
                                อก {STANDARD_SIZE_CHART[size].chest}"
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-natural-espresso/80 mb-1.5">
                        <span>👩 ไซส์ผู้ใหญ่ (Adults):</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['SS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map((size) => {
                          const isSelected = selectedSize === size;
                          const matchedItem = selectedDesignId !== 'custom' ? catalogue.find(item => item.id === selectedDesignId) : null;
                          const isRecommended = matchedItem && matchedItem.sizes ? matchedItem.sizes.includes(size) : false;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleSizeChange(size)}
                              className={`px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center min-w-[55px] border relative ${
                                isSelected
                                  ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                                  : isRecommended
                                    ? 'bg-natural-ochre/5 hover:bg-natural-ochre/15 text-natural-espresso border-natural-ochre/40'
                                    : 'bg-white hover:bg-natural-sand/40 text-natural-espresso border-natural-wheat hover:border-natural-clay/30'
                              }`}
                            >
                              <span className="text-xs flex items-center gap-0.5">
                                {size}
                                {isRecommended && (
                                  <span className="text-[8px] bg-natural-ochre text-white px-0.5 py-px rounded-xs leading-none font-sans" title="ไซส์ตรงปกแบบชุดนี้">
                                    ★
                                  </span>
                                )}
                              </span>
                              <span className={`text-[9px] mt-0.5 font-sans font-medium ${isSelected ? 'text-white/80' : isRecommended ? 'text-natural-ochre' : 'text-natural-espresso/45'}`}>
                                อก {STANDARD_SIZE_CHART[size].chest}"
                              </span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => handleSizeChange('')}
                          className={`px-3 py-1 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center min-w-[55px] border ${
                            !selectedSize
                              ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                              : 'bg-white hover:bg-natural-sand/40 text-natural-espresso border-natural-wheat hover:border-natural-clay/30'
                          }`}
                        >
                          <span className="text-xs">CUSTOM</span>
                          <span className={`text-[9px] mt-0.5 font-sans font-medium ${!selectedSize ? 'text-white/80' : 'text-natural-espresso/45'}`}>
                            วัดตัวพิเศษ
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ตารางเปรียบเทียบด่วน */}
                  <div className="overflow-x-auto rounded-lg border border-natural-wheat bg-white text-[10px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-natural-sand/40 text-natural-espresso font-bold border-b border-natural-wheat">
                          <th className="p-1.5 text-center font-serif">ไซส์</th>
                          <th className="p-1.5 text-center">รอบอก (Chest)</th>
                          <th className="p-1.5 text-center">รอบเอว (Waist)</th>
                          <th className="p-1.5 text-center">สะโพก (Hips)</th>
                          <th className="p-1.5 text-center">ไหล่ (Shoulder)</th>
                          <th className="p-1.5 text-center">แขนยาว (Sleeve)</th>
                          <th className="p-1.5 text-center">ชุดยาว (Length)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(STANDARD_SIZE_CHART).map(([size, config]) => (
                          <tr 
                            key={size} 
                            onClick={() => handleSizeChange(size)}
                            className={`border-b border-natural-sand/50 hover:bg-natural-sand/15 transition-colors cursor-pointer text-center ${
                              selectedSize === size ? 'bg-natural-clay/5 font-bold text-natural-clay' : 'text-natural-espresso/85'
                            }`}
                          >
                            <td className="p-1 text-center font-serif font-bold bg-natural-sand/10 border-r border-natural-sand/50">{size}</td>
                            <td className="p-1">{config.chest}"</td>
                            <td className="p-1">{config.waist}"</td>
                            <td className="p-1">{config.hips}"</td>
                            <td className="p-1">{config.shoulder}"</td>
                            <td className="p-1">{config.sleeveLength}"</td>
                            <td className="p-1">{config.length}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* คำอธิบายเรื่องหน่วยวัดตัว */}
                <div className="bg-natural-sand/20 border border-natural-wheat/60 p-3 rounded-xl text-xs text-natural-espresso/80 space-y-1">
                  <p className="font-bold text-natural-clay flex items-center gap-1.5">
                    <Ruler className="h-4 w-4" />
                    <span>คำชี้แจงเกี่ยวกับหน่วยวัดสัดส่วน (Measurement Unit Guidelines):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li>
                      <span className="font-semibold text-natural-espresso">ตารางไซส์มาตรฐาน (ตารางด้านบน):</span> อ้างอิงและแสดงขนาดเป็นหน่วย <strong className="text-natural-clay font-bold">นิ้ว (″)</strong> ตามมาตรฐานชุดสำเร็จรูป
                    </li>
                    <li>
                      <span className="font-semibold text-natural-espresso">ช่องกรอกข้อมูลสัดส่วนเฉพาะบุคคล (ช่องกรอกด้านล่าง):</span> กรณีท่านระบุสัดส่วนที่ <strong className="text-natural-clay font-bold">วัดตัวด้วยตนเอง (Custom)</strong> กรุณากรอกตัวเลขโดยใช้หน่วยเป็น <strong className="text-natural-clay font-bold">เซนติเมตร (ซม.)</strong> เพื่อความละเอียดสูงสุดในการตัดเย็บ
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">รอบอก (Chest)</label>
                    <input
                      type="text"
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                      placeholder="เช่น 86"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">รอบเอว (Waist)</label>
                    <input
                      type="text"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      placeholder="เช่น 76"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">สะโพก (Hips)</label>
                    <input
                      type="text"
                      value={hips}
                      onChange={(e) => setHips(e.target.value)}
                      placeholder="เช่น 97"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ไหล่กว้าง (Shoulder)</label>
                    <input
                      type="text"
                      value={shoulder}
                      onChange={(e) => setShoulder(e.target.value)}
                      placeholder="เช่น 38"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ความยาวแขน (Sleeve)</label>
                    <input
                      type="text"
                      value={sleeveLength}
                      onChange={(e) => setSleeveLength(e.target.value)}
                      placeholder="เช่น 56"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">วงแขน (Armhole)</label>
                    <input
                      type="text"
                      value={armhole}
                      onChange={(e) => setArmhole(e.target.value)}
                      placeholder="เช่น 38"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ความยาวชุด (Length)</label>
                    <input
                      type="text"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="เช่น 137"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ส่วนสูง ซม. (Height)</label>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="เช่น 160"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">น้ำหนัก กก. (Weight)</label>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="เช่น 52"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">บ่าหน้า (Front Chest)</label>
                    <input
                      type="text"
                      value={frontChest}
                      onChange={(e) => setFrontChest(e.target.value)}
                      placeholder="เช่น 34"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">บ่าหลัง (Back Chest)</label>
                    <input
                      type="text"
                      value={backChest}
                      onChange={(e) => setBackChest(e.target.value)}
                      placeholder="เช่น 36"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ยาวหน้า (Front Length)</label>
                    <input
                      type="text"
                      value={frontLength}
                      onChange={(e) => setFrontLength(e.target.value)}
                      placeholder="เช่น 35"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ยาวหลัง (Back Length)</label>
                    <input
                      type="text"
                      value={backLength}
                      onChange={(e) => setBackLength(e.target.value)}
                      placeholder="เช่น 38"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-natural-espresso/60 mb-1">ข้อมือ (Wrist)</label>
                    <input
                      type="text"
                      value={wrist}
                      onChange={(e) => setWrist(e.target.value)}
                      placeholder="เช่น 15"
                      className="w-full text-center text-sm px-2 py-1.5 rounded-lg border border-natural-wheat bg-natural-cream/20 focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-medium text-natural-espresso/40 mb-1">เก็บค่าข้อมูลย่อย</label>
                    <span className="text-xs text-natural-espresso/50 block pt-2 text-center font-medium">กรอกเสร็จในตารางย่อย</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-natural-espresso/70 mb-1">รายละเอียดการวัดตัวและสัดส่วนเพิ่มเติม</label>
                  <textarea
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    placeholder="เช่น ต้องการเสริมฟองน้ำบริเวณหน้าอก, ไหล่เอียงขวาเล็กน้อย, ต้องการปรับสัดส่วนหลวมหน้าท้องเพื่อใส่คลุมสบาย..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                  />
                </div>
              </>
            )}

            {/* รูปถ่ายสัดส่วนลูกค้า (ด้านหน้า, ด้านข้าง, ด้านหลัง) */}
            {customerCategory !== 'IDH' && (
              <div className="pt-4 border-t border-natural-sand/55 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-natural-espresso flex items-center space-x-1.5" id="customer-photos-label">
                    <ImageIcon className="h-3.5 w-3.5 text-natural-clay" />
                    <span>รูปถ่ายหุ่น/สัดส่วนลูกค้า (Customer Body Photos)</span>
                  </h4>
                  <p className="text-[10px] text-natural-espresso/60">
                    แนบรูปถ่ายลูกค้าเพื่อช่วยประกอบการพิจารณาสรีระในการขึ้นแพทเทิร์นของช่างให้สมบูรณ์แบบที่สุด (ด้านหน้า, ด้านข้าง, ด้านหลัง)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* ด้านหน้า */}
                  <div className="space-y-1.5" id="photo-front-container">
                    <span className="text-[11px] font-bold text-natural-espresso/70 block">📸 ภาพถ่ายลูกค้า ด้านหน้า</span>
                    {customerPhotoFront ? (
                      <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-1.5 flex items-center justify-between">
                        <img 
                          src={customerPhotoFront} 
                          alt="Front View" 
                          className="h-16 w-16 object-cover rounded-lg border border-natural-wheat shadow-xs"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold ml-1">ด้านหน้าเรียบร้อย ✓</span>
                        <button
                          type="button"
                          onClick={() => setCustomerPhotoFront('')}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1"
                          title="ลบรูปภาพ"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative border border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-3 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center flex flex-col items-center justify-center h-[74px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              compressImage(file, 800, 800, 0.75)
                                .then(setCustomerPhotoFront)
                                .catch((err) => {
                                  console.error(err);
                                  alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                                });
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="อัปโหลดรูปด้านหน้า"
                        />
                        <UploadCloud className="h-5 w-5 text-natural-clay/70 mb-1" />
                        <span className="text-[10px] font-bold text-natural-espresso/80">อัปโหลดภาพ ด้านหน้า</span>
                      </div>
                    )}
                  </div>

                  {/* ด้านข้าง */}
                  <div className="space-y-1.5" id="photo-side-container">
                    <span className="text-[11px] font-bold text-natural-espresso/70 block">📸 ภาพถ่ายลูกค้า ด้านข้าง</span>
                    {customerPhotoSide ? (
                      <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-1.5 flex items-center justify-between">
                        <img 
                          src={customerPhotoSide} 
                          alt="Side View" 
                          className="h-16 w-16 object-cover rounded-lg border border-natural-wheat shadow-xs"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold ml-1">ด้านข้างเรียบร้อย ✓</span>
                        <button
                          type="button"
                          onClick={() => setCustomerPhotoSide('')}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1"
                          title="ลบรูปภาพ"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative border border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-3 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center flex flex-col items-center justify-center h-[74px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              compressImage(file, 800, 800, 0.75)
                                .then(setCustomerPhotoSide)
                                .catch((err) => {
                                  console.error(err);
                                  alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                                });
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="อัปโหลดรูปด้านข้าง"
                        />
                        <UploadCloud className="h-5 w-5 text-natural-clay/70 mb-1" />
                        <span className="text-[10px] font-bold text-natural-espresso/80">อัปโหลดภาพ ด้านข้าง</span>
                      </div>
                    )}
                  </div>

                  {/* ด้านหลัง */}
                  <div className="space-y-1.5" id="photo-back-container">
                    <span className="text-[11px] font-bold text-natural-espresso/70 block">📸 ภาพถ่ายลูกค้า ด้านหลัง</span>
                    {customerPhotoBack ? (
                      <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-1.5 flex items-center justify-between">
                        <img 
                          src={customerPhotoBack} 
                          alt="Back View" 
                          className="h-16 w-16 object-cover rounded-lg border border-natural-wheat shadow-xs"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold ml-1">ด้านหลังเรียบร้อย ✓</span>
                        <button
                          type="button"
                          onClick={() => setCustomerPhotoBack('')}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1"
                          title="ลบรูปภาพ"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative border border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-3 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center flex flex-col items-center justify-center h-[74px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              compressImage(file, 800, 800, 0.75)
                                .then(setCustomerPhotoBack)
                                .catch((err) => {
                                  console.error(err);
                                  alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                                });
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="อัปโหลดรูปด้านหลัง"
                        />
                        <UploadCloud className="h-5 w-5 text-natural-clay/70 mb-1" />
                        <span className="text-[10px] font-bold text-natural-espresso/80">อัปโหลดภาพ ด้านหลัง</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 4: ข้อมูลราคาและการจัดส่ง */}
          <div className="bg-white p-6 rounded-2xl border border-natural-wheat shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-natural-sand pb-3">
              <div className="p-1.5 bg-natural-sand rounded-lg text-natural-espresso">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="font-serif font-bold text-natural-espresso">4. ข้อมูลการเงิน และวันกำหนดส่งชุด (Pricing & Delivery)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ราคาค่าชุดรวมทั้งหมด (บาท) <span className="text-natural-clay">*</span></label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrice(val);
                    // auto deposit 50%
                    if (val) {
                      setDeposit((parseInt(val) / 2).toString());
                    } else {
                      setDeposit('');
                    }

                    // recalculate discount
                    const p = parseFloat(val) || 0;
                    if (discountPercent) {
                      const pct = parseFloat(discountPercent) || 0;
                      const d = Math.round((p * pct) / 100);
                      setDiscount(d > 0 ? d.toString() : '');
                    } else if (discount) {
                      const d = parseFloat(discount) || 0;
                      if (p > 0) {
                        const pct = (d / p) * 100;
                        setDiscountPercent(pct > 0 ? pct.toFixed(1).replace(/\.0$/, '') : '');
                      }
                    }
                  }}
                  placeholder="เช่น 4500"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                />
                {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">จำนวนเงินมัดจำ (บาท) <span className="text-natural-clay">*</span></label>
                <input
                  type="number"
                  required
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="มัดจำ 50% หรือระบุจำนวน"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                />
                {errors.deposit && <p className="text-xs text-rose-500 mt-1">{errors.deposit}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ส่วนลดพิเศษ (บาท)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscount(val);
                    const p = parseFloat(price) || 0;
                    const d = parseFloat(val) || 0;
                    if (p > 0 && d >= 0) {
                      const pct = (d / p) * 100;
                      setDiscountPercent(pct > 0 ? pct.toFixed(1).replace(/\.0$/, '') : '');
                    } else {
                      setDiscountPercent('');
                    }
                  }}
                  placeholder="ระบุส่วนลด (บาท)"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20 text-amber-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">ส่วนลดพิเศษ (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscountPercent(val);
                    const p = parseFloat(price) || 0;
                    const pct = parseFloat(val) || 0;
                    if (p > 0 && pct >= 0) {
                      const d = Math.round((p * pct) / 100);
                      setDiscount(d > 0 ? d.toString() : '');
                    } else {
                      setDiscount('');
                    }
                  }}
                  placeholder="ระบุส่วนลด (%)"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20 text-amber-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">สถานะเริ่มต้นของออเดอร์</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20 font-bold cursor-pointer"
                >
                  {Object.values(OrderStatus).map((os) => (
                    <option key={os} value={os}>
                      {STATUS_MAP[os].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-natural-espresso/70 mb-1">กำหนดส่งชุดให้ลูกค้า <span className="text-natural-clay">*</span></label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
                />
                {errors.deliveryDate && <p className="text-xs text-rose-500 mt-1">{errors.deliveryDate}</p>}
              </div>
            </div>

            {/* ช่องทางการรับเงิน (Payment Method) */}
            <div className="pt-4 border-t border-natural-sand/40">
              <label className="block text-xs font-bold text-natural-espresso/80 mb-2">ช่องทางการรับเงิน / ชำระเงิน (Payment Method) <span className="text-natural-clay">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'เงินโอน', label: 'เงินโอน (Bank Transfer)', desc: 'โอนผ่านบัญชีธนาคาร/QR' },
                  { id: 'เงินสด', label: 'เงินสด (Cash)', desc: 'ชำระหน้าร้านด้วยเงินสด' },
                  { id: 'บัตรเครดิต', label: 'บัตรเครดิต (Credit Card)', desc: 'ชำระด้วยบัตร/รูดบัตร' }
                ].map((item) => {
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id)}
                      className={`relative flex flex-col p-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-natural-clay bg-natural-sand/20 shadow-xs' 
                          : 'border-natural-wheat hover:border-natural-clay/40 bg-natural-cream/5 hover:bg-natural-sand/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isSelected ? 'text-natural-espresso' : 'text-natural-espresso/70'}`}>
                          {item.label}
                        </span>
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-natural-clay bg-natural-clay text-white' : 'border-natural-wheat bg-white'
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-natural-espresso/50 mt-1 block">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* แนบสลิปชำระเงิน */}
            <div className="pt-4 border-t border-natural-sand/40">
              <label className="block text-xs font-bold text-natural-espresso/80 mb-2 flex items-center space-x-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-natural-clay" />
                <span>แนบหลักฐานสลิปการโอนเงิน (Payment Slip Upload)</span>
              </label>

              {slipImage ? (
                <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-2 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={slipImage} 
                      alt="Payment Slip Reference" 
                      className="h-16 w-12 object-contain bg-white rounded-lg border border-natural-wheat shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold text-natural-espresso">แนบสลิปสำเร็จแล้ว ✓</p>
                      <p className="text-[10px] text-natural-espresso/50">หลักฐานการชำระเงินนี้จะแนบไปกับออเดอร์</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlipImage('')}
                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1"
                    title="ลบสลิป"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-natural-wheat hover:border-natural-clay/40 rounded-xl p-4 transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        compressImage(file, 800, 800, 0.75)
                          .then(setSlipImage)
                          .catch((err) => {
                            console.error(err);
                            alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
                          });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="คลิกหรือลากไฟล์สลิปมาวางที่นี่"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <UploadCloud className="h-7 w-7 text-natural-clay/75" />
                    <p className="text-xs font-bold text-natural-espresso">คลิก หรือลากไฟล์สลิปการโอนเงินมาวางที่นี่</p>
                    <p className="text-[10px] text-natural-espresso/40 font-medium">รองรับรูปถ่ายสลิปทุกประเภท JPG, PNG, WEBP</p>
                  </div>
                </div>
              )}
            </div>

            {/* ชำระส่วนต่างคงเหลือ (ถ้ามี - เฉพาะเมื่อถึงขั้นตอนที่ 7 ส่งมอบสำเร็จ หรือมีการป้อนยอดชำระ) */}
            {(status === OrderStatus.COMPLETED || !!finalPaymentAmount) && (
              <div className="pt-4 border-t border-natural-sand/40 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-emerald-900">ยอดชำระส่วนต่างคงเหลือ (บาท)</label>
                    {((parseFloat(price) || 0) - (parseFloat(deposit) || 0) - (parseFloat(discount) || 0)) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, (parseFloat(price) || 0) - (parseFloat(deposit) || 0) - (parseFloat(discount) || 0));
                          setFinalPaymentAmount(rem.toString());
                          if (!finalPaymentDate) {
                            setFinalPaymentDate(new Date().toISOString().split('T')[0]);
                          }
                        }}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-extrabold cursor-pointer"
                      >
                        ชำระส่วนต่างครบ
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={finalPaymentAmount}
                    onChange={(e) => setFinalPaymentAmount(e.target.value)}
                    placeholder="เช่น 1400 (เว้นว่างถ้ายังไม่จ่าย)"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-emerald-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">ช่องทางรับเงินส่วนต่าง</label>
                  <select
                    value={finalPaymentMethod}
                    onChange={(e) => setFinalPaymentMethod(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-emerald-950 font-bold cursor-pointer"
                  >
                    <option value="เงินโอน">💳 เงินโอนธนาคาร</option>
                    <option value="เงินสด">💵 ชำระเงินสด</option>
                    <option value="บัตรเครดิต">💳 บัตรเครดิต/เดบิต</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">วันที่ชำระเงินส่วนต่าง</label>
                  <input
                    type="date"
                    value={finalPaymentDate}
                    onChange={(e) => setFinalPaymentDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-emerald-950 font-medium"
                  />
                </div>
              </div>
            )}

            {/* กล่องแสดงยอดสุทธิหลังหักมัดจำและส่วนต่าง */}
            {(price || deposit || discount || finalPaymentAmount) && (
              <div className="bg-natural-sand/20 p-4 rounded-xl border border-natural-wheat/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-natural-espresso">📊 สรุปยอดเงินคงเหลือสุทธิ (Net Balance Summary)</p>
                  <p className="text-[10px] text-natural-espresso/60">สรุปยอดชำระ มัดจำ ส่วนต่างคงเหลือ และยอดค้างชำระ</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs w-full sm:w-auto justify-end">
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-natural-wheat/40 text-center min-w-[75px] flex-1 sm:flex-initial">
                    <span className="block text-[9px] text-natural-espresso/45 font-bold uppercase">ราคาชุด</span>
                    <strong className="text-xs text-natural-espresso font-mono font-extrabold">{(parseFloat(price) || 0).toLocaleString()} ฿</strong>
                  </div>
                  {parseFloat(discount) > 0 && (
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-natural-wheat/40 text-center min-w-[75px] flex-1 sm:flex-initial">
                      <span className="block text-[9px] text-amber-600 font-bold uppercase">ส่วนลด</span>
                      <strong className="text-xs text-amber-600 font-mono font-extrabold">-{(parseFloat(discount) || 0).toLocaleString()} ฿</strong>
                    </div>
                  )}
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-natural-wheat/40 text-center min-w-[75px] flex-1 sm:flex-initial">
                    <span className="block text-[9px] text-natural-clay/70 font-bold uppercase">มัดจำ</span>
                    <strong className="text-xs text-natural-clay font-mono font-extrabold">-{(parseFloat(deposit) || 0).toLocaleString()} ฿</strong>
                  </div>
                  {parseFloat(finalPaymentAmount) > 0 && (
                    <div className="bg-emerald-100/70 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-center min-w-[85px] flex-1 sm:flex-initial">
                      <span className="block text-[9px] text-emerald-800 font-bold uppercase">ชำระส่วนต่าง</span>
                      <strong className="text-xs text-emerald-900 font-mono font-extrabold">-{(parseFloat(finalPaymentAmount) || 0).toLocaleString()} ฿</strong>
                    </div>
                  )}
                  <div className={`px-3 py-1.5 rounded-lg text-center min-w-[100px] flex-1 sm:flex-initial shadow-xs ${
                    Math.max(0, (parseFloat(price) || 0) - (parseFloat(deposit) || 0) - (parseFloat(discount) || 0) - (parseFloat(finalPaymentAmount) || 0)) === 0
                      ? 'bg-emerald-600 text-white'
                      : 'bg-natural-clay text-white'
                  }`}>
                    <span className="block text-[9px] text-white/80 font-bold uppercase">ค้างชำระ</span>
                    <strong className="text-xs font-mono font-extrabold">
                      {Math.max(0, (parseFloat(price) || 0) - (parseFloat(deposit) || 0) - (parseFloat(discount) || 0) - (parseFloat(finalPaymentAmount) || 0)).toLocaleString()} ฿
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* ✍️ ลายเซ็นลูกค้ายืนยันการสั่งตัด / รับมอบออเดอร์ (Staff / Customer Signature Sign-off) */}
            <div className="pt-4 border-t border-natural-sand/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-natural-espresso/80 flex items-center space-x-1.5">
                  <PenTool className="h-4 w-4 text-natural-clay" />
                  <span>ลายเซ็นลูกค้ายืนยันสั่งตัด / วางมัดจำรับออเดอร์ (Customer Acceptance Signature)</span>
                </label>
                {hasSignatureDrawn && (
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>ล้างลายเซ็น</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-natural-sand/10 p-4 rounded-2xl border border-natural-wheat/60">
                {/* Signee Name & Info */}
                <div className="space-y-3 md:col-span-1">
                  <div>
                    <label className="block text-xs font-bold text-natural-espresso mb-1">
                      ชื่อ-นามสกุล ผู้เซ็นรับทราบ/สั่งตัด
                    </label>
                    <input
                      type="text"
                      value={pickupSigneeName}
                      onChange={(e) => setPickupSigneeName(e.target.value)}
                      placeholder="ระบุชื่อผู้เซ็น (ลูกค้า หรือ ผู้แทน)"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-natural-wheat bg-white focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay font-medium text-natural-espresso"
                    />
                  </div>
                  <div className="text-[11px] text-natural-espresso/70 space-y-1.5 bg-white p-3 rounded-xl border border-natural-wheat/50">
                    <p className="font-bold flex items-center gap-1 text-natural-espresso">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 inline shrink-0" />
                      <span>ยืนยันข้อมูลรับออเดอร์หน้าร้าน</span>
                    </p>
                    <p className="text-[10px] leading-relaxed text-natural-espresso/60">
                      พนักงานรับออเดอร์ (User รอง) สามารถยื่นหน้าจอให้ลูกค้าจรดลายเซ็นด้วยนิ้วมือเพื่อยืนยันแบบชุด สัดส่วนวัดตัว และยอดเงินมัดจำ
                    </p>
                    {pickupSignedAt && (
                      <p className="text-[9px] font-mono text-emerald-700 font-bold pt-1 border-t border-natural-sand">
                        เวลาเซ็น: {pickupSignedAt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Canvas Signature Pad */}
                <div className="md:col-span-2 space-y-1.5">
                  <div className="relative border-2 border-dashed border-natural-clay/40 rounded-2xl bg-white overflow-hidden shadow-inner hover:border-natural-clay transition-colors">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 touch-none cursor-crosshair bg-white"
                    />
                    {!hasSignatureDrawn && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-natural-espresso/35 space-y-1">
                        <PenTool className="h-6 w-6 opacity-40 animate-bounce" />
                        <span className="text-xs font-serif font-bold">จรดลายเซ็นลูกค้ารับออเดอร์ที่นี่</span>
                        <span className="text-[10px] text-natural-espresso/40">(ใช้นิ้วมือสัมผัสบนหน้าจอ หรือ เม้าส์ลากเซ็น)</span>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-3 pointer-events-none text-[8px] text-natural-espresso/40 font-mono">
                      NUNUH Order Intake Digital Sign
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-natural-espresso/70 mb-1">บันทึกเพิ่มเติมของดีไซเนอร์ / ช่างเย็บผ้า (Internal Notes)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ลูกค้านัดขอรับเองที่หน้าร้าน, ซับในสีเดียวกับผ้าไหมนอก, มีสายรวบเอวสำรองให้ 1 เส้น..."
                className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-natural-clay hover:bg-natural-clay-dark text-white font-serif font-semibold text-sm py-3.5 px-8 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกและออกรหัสออเดอร์</span>
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
