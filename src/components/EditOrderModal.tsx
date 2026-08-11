/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Measurements, STATUS_MAP, STANDARD_SIZE_CHART } from '../types';
import { X, Save, User, Sparkles, Ruler, CreditCard, Image as ImageIcon, UploadCloud, Check, Lock, ShieldCheck } from 'lucide-react';
import { INITIAL_CATALOGUE } from '../initialData';
import { compressImage } from '../utils/image';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

export default function EditOrderModal({ order, onClose, onSave }: EditOrderModalProps) {
  const [catalogue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nunuh_catalogue');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CATALOGUE;
  });

  // Customer info states
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [customerSocial, setCustomerSocial] = useState(order.customerSocial || '');
  const [lineUserId, setLineUserId] = useState(order.lineUserId || '');
  const [customerCategory, setCustomerCategory] = useState(order.customerCategory || 'ทั่วไป');
  const [membershipTier, setMembershipTier] = useState<'PRIME' | 'PRIVILEGE' | 'TRADER' | 'MEMBER'>(order.membershipTier || 'MEMBER');
  const [externalOrderId, setExternalOrderId] = useState(order.externalOrderId || '');
  const [isMatchingSet, setIsMatchingSet] = useState(order.isMatchingSet || false);
  const [idhNumber, setIdhNumber] = useState(order.idhNumber || '');

  // Dress specification states
  const [dressType, setDressType] = useState(order.dressType || 'เดรสราตรี');
  const [fabricType, setFabricType] = useState(order.fabricType || 'Heavy Premium Satin');
  const [fabricColor, setFabricColor] = useState(order.fabricColor || '');
  const [sku, setSku] = useState(order.sku || '');
  const [notes, setNotes] = useState(order.notes || '');

  // Pricing & Date states
  const [price, setPrice] = useState(order.price.toString());
  const [discount, setDiscount] = useState((order.discount || 0).toString());
  const [discountPercent, setDiscountPercent] = useState(() => {
    const p = order.price || 0;
    const d = order.discount || 0;
    if (p > 0 && d > 0) {
      const pct = (d / p) * 100;
      return pct.toFixed(1).replace(/\.0$/, '');
    }
    return '';
  });
  const [deposit, setDeposit] = useState(order.deposit.toString());
  const [finalPaymentAmount, setFinalPaymentAmount] = useState(order.finalPaymentAmount !== undefined ? order.finalPaymentAmount.toString() : '');
  const [finalPaymentDate, setFinalPaymentDate] = useState(order.finalPaymentDate || '');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState(order.finalPaymentMethod || 'เงินโอน');
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || 'เงินโอน');
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || '');
  const [status, setStatus] = useState<OrderStatus>(order.status || OrderStatus.RECEIVED);
  const [branch, setBranch] = useState(order.branch || 'สาขานราธิวาส');

  // Measurements states
  const [chest, setChest] = useState(order.measurements.chest || '');
  const [waist, setWaist] = useState(order.measurements.waist || '');
  const [hips, setHips] = useState(order.measurements.hips || '');
  const [shoulder, setShoulder] = useState(order.measurements.shoulder || '');
  const [sleeveLength, setSleeveLength] = useState(order.measurements.sleeveLength || '');
  const [armhole, setArmhole] = useState(order.measurements.armhole || '');
  const [length, setLength] = useState(order.measurements.length || '');
  const [neck, setNeck] = useState(order.measurements.neck || '');
  const [height, setHeight] = useState((order.measurements.height || '').toString());
  const [weight, setWeight] = useState((order.measurements.weight || '').toString());
  const [frontChest, setFrontChest] = useState(order.measurements.frontChest || '');
  const [backChest, setBackChest] = useState(order.measurements.backChest || '');
  const [frontLength, setFrontLength] = useState(order.measurements.frontLength || '');
  const [backLength, setBackLength] = useState(order.measurements.backLength || '');
  const [wrist, setWrist] = useState(order.measurements.wrist || '');
  const [otherNotes, setOtherNotes] = useState(order.measurements.otherNotes || '');
  const [selectedSize, setSelectedSize] = useState<string>(order.measurements.standardSize || '');

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

    // อัปเดตราคาและเงินมัดจำหากมีรหัส sku ตรงกับแบบชุดในระบบ และมีราคากำหนดเฉพาะไซส์ไว้
    if (sku && size) {
      const matched = catalogue.find(item => item.sku && item.sku.toUpperCase() === sku.toUpperCase().trim());
      if (matched && matched.sizePrices && matched.sizePrices[size]) {
        const customPrice = matched.sizePrices[size];
        setPrice(customPrice.toString());
        setDeposit((customPrice / 2).toString());
      }
    }
  };

  const handleSkuChange = (newSku: string) => {
    setSku(newSku);
    const matched = catalogue.find(item => item.sku && item.sku.toUpperCase() === newSku.toUpperCase().trim());
    if (matched) {
      setDressType(matched.category === 'Abaya' ? 'อาบายะห์' : 'เดรสราตรี');
      setFabricType(matched.fabricRecommend.split(' & ')[0] || '');
      
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
    }
  };

  // Image states
  const [customImage, setCustomImage] = useState(order.customImage || '');
  const [customImage2, setCustomImage2] = useState(order.customImage2 || '');
  const [customerPhotoFront, setCustomerPhotoFront] = useState(order.customerPhotoFront || '');
  const [customerPhotoSide, setCustomerPhotoSide] = useState(order.customerPhotoSide || '');
  const [customerPhotoBack, setCustomerPhotoBack] = useState(order.customerPhotoBack || '');
  const [slipImage, setSlipImage] = useState(order.slipImage || '');

  // Ensure body scroll is managed when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleImageUpload = (file: File, type: 'custom' | 'custom2' | 'front' | 'side' | 'back' | 'slip') => {
    compressImage(file, 800, 800, 0.75)
      .then((compressedBase64) => {
        if (type === 'custom') setCustomImage(compressedBase64);
        if (type === 'custom2') setCustomImage2(compressedBase64);
        if (type === 'front') setCustomerPhotoFront(compressedBase64);
        if (type === 'side') setCustomerPhotoSide(compressedBase64);
        if (type === 'back') setCustomerPhotoBack(compressedBase64);
        if (type === 'slip') setSlipImage(compressedBase64);
      })
      .catch((err) => {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพค่ะ');
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์ของลูกค้า');
      return;
    }

    const updatedMeasurements: Measurements = {
      chest: chest.trim(),
      waist: waist.trim(),
      hips: hips.trim(),
      shoulder: shoulder.trim(),
      sleeveLength: sleeveLength.trim(),
      armhole: armhole.trim(),
      length: length.trim(),
      neck: neck.trim(),
      height: height.trim(),
      weight: weight.trim(),
      frontChest: frontChest.trim(),
      backChest: backChest.trim(),
      frontLength: frontLength.trim(),
      backLength: backLength.trim(),
      wrist: wrist.trim(),
      otherNotes: otherNotes.trim(),
      standardSize: selectedSize || undefined
    };

    const updatedOrder: Order = {
      ...order,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerSocial: customerSocial.trim() || undefined,
      lineUserId: lineUserId.trim() || undefined,
      customerCategory: customerCategory.trim() || undefined,
      membershipTier,
      externalOrderId: externalOrderId.trim() || undefined,
      branch: branch.trim() || undefined,
      dressType: dressType.trim(),
      fabricType: fabricType.trim(),
      fabricColor: fabricColor.trim(),
      sku: sku.trim() || undefined,
      notes: notes.trim() || undefined,
      price: parseFloat(price) || 0,
      discount: parseFloat(discount) || 0,
      deposit: parseFloat(deposit) || 0,
      finalPaymentAmount: finalPaymentAmount.trim() !== '' ? (parseFloat(finalPaymentAmount) || 0) : undefined,
      finalPaymentDate: finalPaymentDate.trim() || undefined,
      finalPaymentMethod: finalPaymentAmount.trim() !== '' && (parseFloat(finalPaymentAmount) || 0) > 0 ? finalPaymentMethod : undefined,
      paymentMethod,
      deliveryDate,
      status,
      measurements: updatedMeasurements,
      customImage: customImage || undefined,
      customImage2: customImage2 || undefined,
      customerPhotoFront: customerPhotoFront || undefined,
      customerPhotoSide: customerPhotoSide || undefined,
      customerPhotoBack: customerPhotoBack || undefined,
      slipImage: slipImage || undefined,
      isMatchingSet: isMatchingSet || undefined,
      idhNumber: isMatchingSet ? (idhNumber.trim() || undefined) : undefined
    };

    onSave(updatedOrder);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-natural-cream rounded-3xl border border-natural-wheat shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-white px-6 py-5 border-b border-natural-sand flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-natural-espresso text-natural-cream font-mono text-xs px-2.5 py-1 rounded-md font-extrabold uppercase">
                {order.orderNumber}
              </span>
              <h2 className="text-xl font-serif font-bold text-natural-espresso">แก้ไขข้อมูลออเดอร์ตัดเย็บ (Edit Order Details)</h2>
            </div>
            <p className="text-xs text-natural-espresso/60">อัปเดตสเปกชุด สัญญาราคา การจ่ายชำระ และข้อมูลวัดตัวสัดส่วนลูกค้าได้ตามสะดวก</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-natural-espresso/40 hover:text-natural-espresso hover:bg-natural-sand/50 rounded-full transition-all cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {(order.isLocked || order.pickupSignature) && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-start space-x-3 text-emerald-950 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <span>🔒 ออเดอร์นี้ลูกค้าเซ็นรับมอบชุดแล้ว (แก้ไขได้เฉพาะเจ้าของแอป)</span>
                </p>
                <p className="text-emerald-900 leading-relaxed">
                  ออเดอร์นี้ได้รับการเซ็นรับมอบชุดโดย <strong>คุณ{order.pickupSigneeName || order.customerName}</strong> เมื่อ <strong>{order.pickupSignedAt || 'ไม่ระบุวันเวลา'}</strong> แต่ในฐานะเจ้าของแอป คุณยังสามารถแก้ไขข้อมูลออเดอร์นี้ได้ตลอดเวลาตามต้องการค่ะ
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Section 1: Customer Information */}
            <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-2.5">
                <div className="p-1 bg-natural-sand rounded-md text-natural-espresso">
                  <User className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso text-sm">1. ข้อมูลลูกค้า (Customer Info)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">สาขาที่รับออเดอร์ <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['สาขานราธิวาส', 'สาขายะลา', 'สาขาปัตตานี', 'สาขาหาดใหญ่'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBranch(b)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          branch === b
                            ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                            : 'bg-natural-cream/10 hover:bg-natural-sand text-natural-espresso border-natural-wheat'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ชื่อลูกค้า <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ช่องทางติดต่อ (IG/LINE)</label>
                  <input
                    type="text"
                    value={customerSocial}
                    onChange={(e) => setCustomerSocial(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">LINE User ID (สำหรับเปิดแชท/ส่งแจ้งเตือน)</label>
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
                    placeholder="เช่น U1234567890abcdef..."
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 font-mono"
                  />
                  <p className="text-[10px] text-natural-espresso/50 mt-1.5 leading-relaxed bg-natural-sand/30 p-2 rounded-lg border border-natural-wheat/30">
                    💡 <strong>รหัสนี้คืออะไร?</strong> คือรหัสเฉพาะใน LINE สำหรับลิงก์ไปหน้าแชทคนนี้โดยตรง คุณสามารถได้รหัสนี้มา 2 วิธี:<br />
                    1. <strong>อัตโนมัติ:</strong> เพียงให้ลูกค้าแชทพิมพ์เบอร์โทรหรือเลขที่ออเดอร์ใน LINE ร้าน ระบบจะดึงรหัสนี้มาบันทึกให้เองทันที!<br />
                    2. <strong>คัดลอกมาวางเอง:</strong> เมื่อคุณคุยกับลูกค้าบนเบราว์เซอร์ ให้ก๊อปรหัสตัว "U" หลังคำว่า <code className="bg-white/80 px-1 font-mono text-[9px]">/user/</code> ในช่อง Address bar ด้านบน มาวางที่นี่ได้เลยค่ะ
                  </p>
                </div>



                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ประเภทงาน (Job Type)</label>
                  <select
                    value={customerCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerCategory(val);
                      if (val === 'IDH') {
                        setIsMatchingSet(true);
                      }
                    }}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 cursor-pointer"
                  >
                    <option value="IDD">IDD (พรีเมียมตัดเฉพาะตัว)</option>
                    <option value="IDH">IDH (กึ่งกูตูร์)</option>
                    <option value="ทั่วไป">ทั่วไป (Standard Work)</option>
                  </select>
                </div>

                {/* เป็นงานเข้าชุด */}
                <div className="pt-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isMatchingSet}
                      onChange={(e) => {
                        setIsMatchingSet(e.target.checked);
                      }}
                      className="h-4 w-4 rounded border-natural-wheat text-natural-clay focus:ring-natural-clay/20 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-natural-espresso">เป็นงานเข้าชุด (Matching Set)</span>
                  </label>
                  
                  {isMatchingSet && (
                    <div className="mt-2 pl-6 animate-fade-in">
                      <label className="block text-[11px] font-bold text-natural-clay mb-1">เลข IDH สำหรับงานเข้าชุด (IDH Number)</label>
                      <input
                        type="text"
                        value={idhNumber}
                        onChange={(e) => setIdhNumber(e.target.value)}
                        placeholder="ระบุเลข IDH เช่น IDH-88, IDH-102"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-amber-50/20 font-bold text-natural-espresso placeholder-natural-espresso/40"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">บัตรสมาชิก (Membership)</label>
                  <select
                    value={membershipTier}
                    onChange={(e) => setMembershipTier(e.target.value as any)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 cursor-pointer"
                  >
                    <option value="MEMBER">MEMBER (Standard)</option>
                    <option value="TRADER">TRADER (Gold)</option>
                    <option value="PRIVILEGE">PRIVILEGE (Royal VIP)</option>
                    <option value="PRIME">PRIME (VIP Elite)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">รหัสออเดอร์เชื่อมโยง/รหัสจากกัน</label>
                  <input
                    type="text"
                    value={externalOrderId}
                    onChange={(e) => setExternalOrderId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Dress Details */}
            <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-2.5">
                <div className="p-1 bg-natural-sand rounded-md text-natural-espresso">
                  <Sparkles className="h-4 w-4 text-natural-ochre" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso text-sm">2. รายละเอียดชุดสั่งตัด (Dress Spec)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ประเภทชุด</label>
                  <select
                    value={dressType}
                    onChange={(e) => setDressType(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 cursor-pointer"
                  >
                    <option value="เดรสราตรี">เดรสราตรีออกงาน</option>
                    <option value="อาบายะห์">อาบายะห์ (Abaya)</option>
                    <option value="จั๊มสูท">จั๊มสูท (Jumpsuit)</option>
                    <option value="เดรสสั้น">เดรสสั้น (Short Dress)</option>
                    <option value="ชุดทำงาน">ชุดทำงาน / สูทสุภาพ</option>
                    <option value="ชุดไทย">ชุดไทยประยุกต์</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ชนิดเนื้อผ้า</label>
                  <input
                    type="text"
                    list="edit-fabric-types"
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value)}
                    placeholder="ระบุหรือเลือกชนิดผ้า"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                  <datalist id="edit-fabric-types">
                    <option value="Heavy Premium Satin" />
                    <option value="Premium Silk Crepe" />
                    <option value="French Chantilly Lace" />
                    <option value="Italian Wool Blend" />
                    <option value="Luminous Organza" />
                    <option value="ผ้าลินินธรรมชาติ" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">เฉดสีผ้า / รหัสสี</label>
                  <input
                    type="text"
                    value={fabricColor}
                    onChange={(e) => setFabricColor(e.target.value)}
                    list="edit-color-suggestions"
                    placeholder="ระบุหรือเลือกสีผ้า"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                  <datalist id="edit-color-suggestions">
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

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">รหัสสินค้า / SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    list="edit-sku-suggestions"
                    placeholder="เช่น NNH-MKB-06"
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 font-mono uppercase"
                  />
                  <datalist id="edit-sku-suggestions">
                    {catalogue.map((item) => (
                      <option key={item.id} value={item.sku}>
                        {item.name}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* แสดงรูปตัวอย่างชุดและข้อมูลแบบชุดเสนอแนะนำที่เลือก */}
                {(() => {
                  const matchedItem = sku ? catalogue.find(item => item.sku && item.sku.toUpperCase() === sku.toUpperCase().trim()) : null;

                  if (!matchedItem) return null;

                  return (
                    <div className="col-span-2 bg-natural-sand/15 border border-natural-wheat rounded-2xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-fade-in mt-1">
                      <div className="w-20 h-20 bg-white rounded-xl border border-natural-wheat p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                        <img 
                          src={matchedItem.image} 
                          alt={matchedItem.name} 
                          className="w-full h-full object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                          <span className="text-[9px] bg-natural-clay text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                            {matchedItem.sku}
                          </span>
                          <span className="text-[9px] bg-natural-sand text-natural-espresso px-2 py-0.5 rounded-full font-bold">
                            {matchedItem.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-serif font-bold text-natural-espresso">
                          {matchedItem.name}
                        </h4>
                        <p className="text-[11px] text-natural-espresso/70 leading-relaxed line-clamp-2">
                          {matchedItem.description}
                        </p>
                        <p className="text-[11px] text-natural-ochre font-bold">
                          เริ่มต้น: {matchedItem.priceRange} (ผ้าแนะนำ: {matchedItem.fabricRecommend})
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">หมายเหตุเพิ่มเติมของชุด (Dress Notes)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                    placeholder="ความต้องการพิเศษ รายละเอียดกระดุม บล็อก ซับใน..."
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pricing and Payment */}
            <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-2.5">
                <div className="p-1 bg-natural-sand rounded-md text-natural-espresso">
                  <CreditCard className="h-4 w-4 text-natural-clay" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso text-sm">3. สัญญาราคาและการชำระเงิน (Price & Payments)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ราคาเต็มชุด (บาท)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrice(val);
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
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ยอดเงินมัดจำรับมา (บาท)</label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ส่วนลดลดเพิ่ม (บาท)</label>
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
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 text-amber-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ส่วนลดลดเพิ่ม (%)</label>
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
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 text-amber-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">ช่องทางรับเงิน (Payment Method)</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 cursor-pointer"
                  >
                    <option value="เงินโอน">เงินโอนธนาคาร</option>
                    <option value="เงินสด">ชำระเงินสด</option>
                    <option value="บัตรเครดิต">บัตรเครดิต/เดบิต</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">กำหนดส่งมอบชุด</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-1">สถานะออเดอร์</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/10 cursor-pointer font-bold"
                  >
                    {Object.values(OrderStatus).map((os) => (
                      <option key={os} value={os}>
                        {STATUS_MAP[os].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 pt-2 border-t border-natural-sand/50">
                  <label className="block text-xs font-semibold text-natural-espresso/70 mb-2 flex items-center space-x-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-natural-clay" />
                    <span>รูปภาพสลิปชำระเงิน (Payment Slip Reference)</span>
                  </label>
                  
                  {slipImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/10 p-2 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={slipImage} 
                          alt="Payment Slip Reference" 
                          className="h-16 w-12 object-contain bg-white rounded-lg border border-natural-wheat shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-bold text-natural-espresso">แนบรูปสลิปเรียบร้อย ✓</p>
                          <p className="text-[10px] text-natural-espresso/50">คลิกปุ่มสีแดงเพื่อลบหรือเปลี่ยนรูปภาพ</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlipImage('')}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer mr-1"
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
                            handleImageUpload(file, 'slip');
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="คลิกหรือลากรูปภาพมาวางที่นี่"
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <UploadCloud className="h-6 w-6 text-natural-clay/75" />
                        <p className="text-xs font-bold text-natural-espresso">อัปโหลดสลิปเงินโอน/ชำระเงิน</p>
                        <p className="text-[10px] text-natural-espresso/40 font-medium">คลิก หรือลากไฟล์ภาพมาวาง</p>
                      </div>
                    </div>
                  )}
                </div>

                {(status === OrderStatus.COMPLETED || !!finalPaymentAmount) && (
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
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
                        placeholder="เช่น 1400"
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

                <div className="col-span-1 md:col-span-2 pt-1">
                  {(() => {
                    const p = parseFloat(price) || 0;
                    const d = parseFloat(deposit) || 0;
                    const disc = parseFloat(discount) || 0;
                    const fp = parseFloat(finalPaymentAmount) || 0;
                    const unpaid = Math.max(0, p - d - disc - fp);

                    return (
                      <div className={`p-3 rounded-xl border text-center text-xs transition-colors ${
                        unpaid === 0 && (d > 0 || fp > 0)
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-natural-sand/30 border-natural-wheat/50 text-natural-espresso'
                      }`}>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                          <span>ราคาเต็ม: <strong>{p.toLocaleString()} ฿</strong></span>
                          {disc > 0 && <span>ส่วนลด: <strong className="text-amber-700">-{disc.toLocaleString()} ฿</strong></span>}
                          <span>มัดจำ: <strong className="text-natural-clay">-{d.toLocaleString()} ฿</strong></span>
                          {fp > 0 && (
                            <span className="text-emerald-700 font-medium">
                              ชำระส่วนต่าง: <strong>-{fp.toLocaleString()} ฿</strong> ({finalPaymentMethod || 'เงินโอน'}) {finalPaymentDate ? `(${finalPaymentDate})` : ''}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-natural-wheat/40 font-bold text-xs sm:text-sm">
                          {unpaid === 0 ? (
                            <span className="text-emerald-700 font-extrabold flex items-center justify-center space-x-1">
                              <span>✓ ลูกค้าชำระเงินครบถ้วนเรียบร้อยแล้ว</span>
                            </span>
                          ) : (
                            <span>
                              ค้างจ่ายคงเหลือกำหนดรับชุด: <strong className="text-natural-clay text-sm font-extrabold ml-1">{unpaid.toLocaleString()} บาท</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Section 4: Customer Proportion Measurements */}
            <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-2.5">
                <div className="p-1 bg-natural-sand rounded-md text-natural-espresso">
                  <Ruler className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso text-sm">4. ตารางประวัติสัดส่วนวัดตัว (Measurements)</h3>
              </div>

              {customerCategory === 'IDH' ? (
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/50 space-y-3 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/20 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-natural-espresso flex items-center space-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-natural-clay" />
                        <span>กดเลือกไซส์ผ้าคลุม (IDH Hijab Size Selection)</span>
                      </h4>
                      <p className="text-[10px] text-natural-espresso/60 mt-0.5">
                        เลือกไซส์ผ้าคลุมที่ต้องการด้านล่างนี้ได้เลยค่ะ (ไม่ต้องกรอกตารางสัดส่วน)
                      </p>
                    </div>
                    <span className="text-[10px] bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-2.5 py-0.5 rounded-full font-bold">
                      ไซส์ผ้าคลุม IDH 🧕
                    </span>
                  </div>

                  {/* ปุ่มเลือกไซส์ผ้าคลุม */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['SS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleSizeChange(size, true)}
                          className={`px-4 py-2 text-xs font-serif font-black rounded-lg transition-all cursor-pointer border flex flex-col items-center justify-center min-w-[60px] shadow-3xs ${
                            isSelected
                              ? 'bg-natural-clay text-white border-natural-clay scale-105 shadow-xs ring-1 ring-natural-clay/20'
                              : 'bg-white hover:bg-natural-sand/25 text-natural-espresso border-natural-wheat hover:border-natural-clay/30'
                          }`}
                        >
                          <span>{size}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <label className="block font-medium text-natural-espresso/70 mb-1 text-xs">หมายเหตุการวัดตัวอื่นๆ (สำหรับผ้าคลุม)</label>
                    <textarea
                      value={otherNotes}
                      onChange={(e) => setOtherNotes(e.target.value)}
                      rows={2}
                      placeholder="ระบุข้อกำหนดเพิ่มเติม เช่น ความยาวข้างพิเศษ, ดีเทลขอบหน้าผ้าคลุม..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-white"
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
                          <span className="text-[10px] text-natural-clay font-medium">DDS, DDM, DDL</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['DDS', 'DDM', 'DDL'].map((size) => {
                            const isSelected = selectedSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => handleSizeChange(size)}
                                className={`px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center min-w-[55px] border relative ${
                                  isSelected
                                    ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                                    : 'bg-amber-50/50 hover:bg-amber-100/50 text-natural-espresso border-amber-200 hover:border-natural-clay/30'
                                }`}
                              >
                                <span className="text-xs flex items-center gap-0.5">
                                  {size}
                                </span>
                                <span className={`text-[9px] mt-0.5 font-sans font-medium ${isSelected ? 'text-white/80' : 'text-amber-900/60'}`}>
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
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => handleSizeChange(size)}
                                className={`px-3 py-1.5 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center min-w-[55px] border relative ${
                                  isSelected
                                    ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                                    : 'bg-white hover:bg-natural-sand/40 text-natural-espresso border-natural-wheat hover:border-natural-clay/30'
                                }`}
                              >
                                <span className="text-xs flex items-center gap-0.5">
                                  {size}
                                </span>
                                <span className={`text-[9px] mt-0.5 font-sans font-medium ${isSelected ? 'text-white/80' : 'text-natural-espresso/45'}`}>
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
                        <span className="font-semibold text-natural-espresso">ตารางไซส์มาตรฐาน (ตารางด้านบน):</span> แสดงขนาดเป็นหน่วย <strong className="text-natural-clay font-bold">นิ้ว (″)</strong> ตามมาตรฐานชุดสำเร็จรูป
                      </li>
                      <li>
                        <span className="font-semibold text-natural-espresso">ช่องกรอกข้อมูลสัดส่วนเฉพาะบุคคล (ช่องกรอกด้านล่าง):</span> กรณีท่านระบุสัดส่วนที่ <strong className="text-natural-clay font-bold">วัดตัวด้วยตนเอง (Custom)</strong> กรุณากรอกตัวเลขโดยใช้หน่วยเป็น <strong className="text-natural-clay font-bold">เซนติเมตร (ซม.)</strong> เพื่อความละเอียดสูงสุดในการตัดเย็บ
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">รอบอก (ซม.)</label>
                      <input
                        type="text"
                        value={chest}
                        onChange={(e) => setChest(e.target.value)}
                        placeholder="เช่น 86"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">รอบเอว (ซม.)</label>
                      <input
                        type="text"
                        value={waist}
                        onChange={(e) => setWaist(e.target.value)}
                        placeholder="เช่น 76"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">รอบสะโพก (ซม.)</label>
                      <input
                        type="text"
                        value={hips}
                        onChange={(e) => setHips(e.target.value)}
                        placeholder="เช่น 97"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ไหล่กว้าง (ซม.)</label>
                      <input
                        type="text"
                        value={shoulder}
                        onChange={(e) => setShoulder(e.target.value)}
                        placeholder="เช่น 38"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ความยาวแขน (ซม.)</label>
                      <input
                        type="text"
                        value={sleeveLength}
                        onChange={(e) => setSleeveLength(e.target.value)}
                        placeholder="เช่น 56"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">รอบวงแขน (ซม.)</label>
                      <input
                        type="text"
                        value={armhole}
                        onChange={(e) => setArmhole(e.target.value)}
                        placeholder="เช่น 38"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ความยาวชุด (ซม.)</label>
                      <input
                        type="text"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="เช่น 137"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>



                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ส่วนสูงลูกค้า (ซม.)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="เช่น 163"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">น้ำหนักลูกค้า (กก.)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="เช่น 52"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">บ่าหน้า (ซม.)</label>
                      <input
                        type="text"
                        value={frontChest}
                        onChange={(e) => setFrontChest(e.target.value)}
                        placeholder="เช่น 34"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">บ่าหลัง (ซม.)</label>
                      <input
                        type="text"
                        value={backChest}
                        onChange={(e) => setBackChest(e.target.value)}
                        placeholder="เช่น 36"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ยาวหน้า (ซม.)</label>
                      <input
                        type="text"
                        value={frontLength}
                        onChange={(e) => setFrontLength(e.target.value)}
                        placeholder="เช่น 35"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ยาวหลัง (ซม.)</label>
                      <input
                        type="text"
                        value={backLength}
                        onChange={(e) => setBackLength(e.target.value)}
                        placeholder="เช่น 38"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-natural-espresso/70 mb-0.5">ข้อมือ (ซม.)</label>
                      <input
                        type="text"
                        value={wrist}
                        onChange={(e) => setWrist(e.target.value)}
                        placeholder="เช่น 15"
                        className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-natural-wheat focus:outline-none focus:ring-1 focus:ring-natural-clay bg-natural-cream/5"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block font-medium text-natural-espresso/70 mb-1">หมายเหตุการวัดตัวอื่นๆ</label>
                      <textarea
                        value={otherNotes}
                        onChange={(e) => setOtherNotes(e.target.value)}
                        rows={2}
                        placeholder="ไหล่สโลปพิเศษ, อกห่าง 7 นิ้ว, เอวคอดช่วงสูง..."
                        className="w-full text-sm px-3 py-2 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/5"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Section 5: Order Photo uploads */}
            <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-xs space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2 border-b border-natural-sand pb-2.5">
                <div className="p-1 bg-natural-sand rounded-md text-natural-espresso">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <h3 className="font-serif font-bold text-natural-espresso text-sm">5. แนบหรือเปลี่ยนภาพถ่ายประกอบ (Photos Attachment)</h3>
              </div>

              <div className={`grid grid-cols-2 ${customerCategory === 'IDH' ? 'sm:grid-cols-2 max-w-sm mx-auto' : 'sm:grid-cols-5'} gap-3`}>
                {/* Design Reference 1 */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-natural-espresso/75 text-center">ภาพดีไซน์อ้างอิง 1</p>
                  {customImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-natural-wheat h-36 bg-natural-sand/5 flex items-center justify-center group">
                      <img src={customImage} alt="Ref" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                      <button 
                        type="button" 
                        onClick={() => setCustomImage('')} 
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-natural-sand/50 hover:border-natural-clay/40 rounded-xl h-36 flex flex-col items-center justify-center transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'custom')} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <UploadCloud className="h-5 w-5 text-natural-clay/60 mb-1" />
                      <span className="text-[10px] text-natural-espresso/50 font-semibold">อัปโหลดแบบที่ 1</span>
                    </div>
                  )}
                </div>

                {/* Design Reference 2 */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-natural-espresso/75 text-center">ภาพดีไซน์อ้างอิง 2</p>
                  {customImage2 ? (
                    <div className="relative rounded-xl overflow-hidden border border-natural-wheat h-36 bg-natural-sand/5 flex items-center justify-center group">
                      <img src={customImage2} alt="Ref 2" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                      <button 
                        type="button" 
                        onClick={() => setCustomImage2('')} 
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-natural-sand/50 hover:border-natural-clay/40 rounded-xl h-36 flex flex-col items-center justify-center transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'custom2')} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <UploadCloud className="h-5 w-5 text-natural-clay/60 mb-1" />
                      <span className="text-[10px] text-natural-espresso/50 font-semibold">อัปโหลดแบบที่ 2</span>
                    </div>
                  )}
                </div>

                {customerCategory !== 'IDH' && (
                  <>
                    {/* Front View */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-natural-espresso/75 text-center">สัดส่วน ด้านหน้า</p>
                      {customerPhotoFront ? (
                        <div className="relative rounded-xl overflow-hidden border border-natural-wheat h-36 bg-natural-sand/5 flex items-center justify-center group">
                          <img src={customerPhotoFront} alt="Front" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            type="button" 
                            onClick={() => setCustomerPhotoFront('')} 
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-natural-sand/50 hover:border-natural-clay/40 rounded-xl h-36 flex flex-col items-center justify-center transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'front')} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          <UploadCloud className="h-5 w-5 text-natural-clay/60 mb-1" />
                          <span className="text-[10px] text-natural-espresso/50">อัปโหลดด้านหน้า</span>
                        </div>
                      )}
                    </div>

                    {/* Side View */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-natural-espresso/75 text-center">สัดส่วน ด้านข้าง</p>
                      {customerPhotoSide ? (
                        <div className="relative rounded-xl overflow-hidden border border-natural-wheat h-36 bg-natural-sand/5 flex items-center justify-center group">
                          <img src={customerPhotoSide} alt="Side" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            type="button" 
                            onClick={() => setCustomerPhotoSide('')} 
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-natural-sand/50 hover:border-natural-clay/40 rounded-xl h-36 flex flex-col items-center justify-center transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'side')} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          <UploadCloud className="h-5 w-5 text-natural-clay/60 mb-1" />
                          <span className="text-[10px] text-natural-espresso/50">อัปโหลดด้านข้าง</span>
                        </div>
                      )}
                    </div>

                    {/* Back View */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-natural-espresso/75 text-center">สัดส่วน ด้านหลัง</p>
                      {customerPhotoBack ? (
                        <div className="relative rounded-xl overflow-hidden border border-natural-wheat h-36 bg-natural-sand/5 flex items-center justify-center group">
                          <img src={customerPhotoBack} alt="Back" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            type="button" 
                            onClick={() => setCustomerPhotoBack('')} 
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-natural-sand/50 hover:border-natural-clay/40 rounded-xl h-36 flex flex-col items-center justify-center transition-all bg-natural-cream/5 hover:bg-natural-sand/10 text-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'back')} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          <UploadCloud className="h-5 w-5 text-natural-clay/60 mb-1" />
                          <span className="text-[10px] text-natural-espresso/50">อัปโหลดด้านหลัง</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-natural-sand flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-natural-wheat hover:bg-natural-sand text-sm font-bold text-natural-espresso transition-all cursor-pointer"
            >
              ยกเลิก (Cancel)
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-natural-espresso hover:bg-stone-800 text-white text-sm font-bold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกการแก้ไข (Save Changes)</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
