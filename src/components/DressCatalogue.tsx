/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { CatalogueItem } from '../types';
import { Search, Plus, Upload, X, Image, Sparkles, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { compressImage } from '../utils/image';

interface DressCatalogueProps {
  catalogue: CatalogueItem[];
  onSelectDesignForOrder: (designId: string) => void;
  onAddCatalogueItem: (newItem: CatalogueItem) => void;
  onDeleteCatalogueItem: (designId: string) => void;
  onUpdateCatalogueItem?: (updatedItem: CatalogueItem) => void;
  isReadOnly?: boolean;
}

export default function DressCatalogue({ 
  catalogue, 
  onSelectDesignForOrder, 
  onAddCatalogueItem, 
  onDeleteCatalogueItem, 
  onUpdateCatalogueItem,
  isReadOnly = false 
}: DressCatalogueProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // สเตตสำหรับ Modal เพิ่ม/แก้ไขแบบชุดใหม่
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Abaya');
  const [customCategory, setCustomCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [fabricRecommend, setFabricRecommend] = useState('');
  const [description, setDescription] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formSizes, setFormSizes] = useState<string[]>(['SS', 'S', 'M', 'L', 'XL']);
  const [sizePricesMap, setSizePricesMap] = useState<Record<string, string>>({
    SS: '3800',
    S: '4000',
    M: '4200',
    L: '4500',
    XL: '4800'
  });

  const handleToggleSize = (size: string) => {
    const sizeOrder = ['SS', 'S', 'M', 'L', 'XL'];
    let newSizes: string[];
    if (formSizes.includes(size)) {
      newSizes = formSizes.filter(s => s !== size);
    } else {
      newSizes = [...formSizes, size];
    }
    newSizes.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
    setFormSizes(newSizes);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['ALL', 'Abaya', 'Evening Gown', 'Minimalist', 'Traditional'];
  const formCategories = ['Abaya', 'Evening Gown', 'Minimalist', 'Traditional', 'Casual-Chic', 'Custom'];

  // กรองสินค้าแคตตาล็อก
  const filteredCatalogue = catalogue.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fabricRecommend.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // แปลงไฟล์รูปภาพเป็น Base64 พร้อมบีบอัดภาพเพื่อประหยัดพื้นที่เก็บข้อมูล
  const handleFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 800, 800, 0.75);
        setImagePreview(compressed);
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้งค่ะ');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleOpenEditModal = (item: CatalogueItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku || '');
    setCategory(item.category);
    if (!['Abaya', 'Evening Gown', 'Minimalist', 'Traditional', 'Casual-Chic'].includes(item.category)) {
      setCategory('Custom');
      setCustomCategory(item.category);
    } else {
      setCustomCategory('');
    }
    setPriceRange(item.priceRange.replace(' บาท', ''));
    setFabricRecommend(item.fabricRecommend);
    setDescription(item.description);
    setFeaturesInput(item.features.join(', '));
    setFormSizes(item.sizes || ['SS', 'S', 'M', 'L', 'XL']);
    
    const newPriceMap: Record<string, string> = {
      SS: '3800',
      S: '4000',
      M: '4200',
      L: '4500',
      XL: '4800'
    };
    if (item.sizePrices) {
      Object.entries(item.sizePrices).forEach(([sz, pr]) => {
        newPriceMap[sz] = String(pr);
      });
    }
    setSizePricesMap(newPriceMap);
    setImagePreview(item.image);
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setSku('');
    setCategory('Abaya');
    setCustomCategory('');
    setPriceRange('');
    setFabricRecommend('');
    setDescription('');
    setFeaturesInput('');
    setFormSizes(['SS', 'S', 'M', 'L', 'XL']);
    setSizePricesMap({
      SS: '3800',
      S: '4000',
      M: '4200',
      L: '4500',
      XL: '4800'
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // บันทึกแบบชุดใหม่ หรือ บันทึกแก้ไขแบบชุดเดิม
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceRange || !fabricRecommend || !description) {
      alert("กรุณากรอกข้อมูลหลักให้ครบถ้วนค่ะ (ชื่อชุด, ช่วงราคา, ผ้าแนะนำ, รายละเอียดสไตล์)");
      return;
    }

    const finalCategory = category === 'Custom' ? (customCategory || 'Custom') : category;
    const finalFeatures = featuresInput
      ? featuresInput.split(',').map(f => f.trim()).filter(Boolean)
      : ["งานคัตติ้งเนี้ยบเฉพาะบุคคล"];

    const finalSizePrices: Record<string, number> = {};
    formSizes.forEach((sz) => {
      if (sizePricesMap[sz]) {
        finalSizePrices[sz] = parseInt(sizePricesMap[sz], 10) || 0;
      }
    });

    if (editingItem) {
      const updatedItem: CatalogueItem = {
        ...editingItem,
        sku: sku.trim() || undefined,
        name,
        description,
        priceRange: priceRange.includes('บาท') ? priceRange : `${priceRange} บาท`,
        fabricRecommend,
        image: imagePreview || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=600",
        category: finalCategory,
        features: finalFeatures,
        sizes: formSizes.length > 0 ? formSizes : undefined,
        sizePrices: Object.keys(finalSizePrices).length > 0 ? finalSizePrices : undefined
      };
      
      if (onUpdateCatalogueItem) {
        onUpdateCatalogueItem(updatedItem);
      }
      alert("แก้ไขรายละเอียดแบบชุดในแคตตาล็อก NUNUH เรียบร้อยแล้วค่ะ! 💖");
    } else {
      const newItem: CatalogueItem = {
        id: `cat-${Date.now()}`,
        sku: sku.trim() || undefined,
        name,
        description,
        priceRange: priceRange.includes('บาท') ? priceRange : `${priceRange} บาท`,
        fabricRecommend,
        image: imagePreview || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=600",
        category: finalCategory,
        features: finalFeatures,
        sizes: formSizes.length > 0 ? formSizes : undefined,
        sizePrices: Object.keys(finalSizePrices).length > 0 ? finalSizePrices : undefined
      };

      onAddCatalogueItem(newItem);
      alert("เพิ่มแบบชุดใหม่เข้าสู่แคตตาล็อก NUNUH เรียบร้อยแล้วค่ะ! 💖");
    }
    
    // ล้างข้อมูลฟอร์ม
    setName('');
    setSku('');
    setCategory('Abaya');
    setCustomCategory('');
    setPriceRange('');
    setFabricRecommend('');
    setDescription('');
    setFeaturesInput('');
    setFormSizes(['SS', 'S', 'M', 'L', 'XL']);
    setSizePricesMap({
      SS: '3800',
      S: '4000',
      M: '4200',
      L: '4500',
      XL: '4800'
    });
    setImagePreview(null);
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      
      {/* SECTION: THE READY-TO-PROPOSE DRESS CATALOGUE */}
      <div className="space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-natural-sand/60 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="font-serif font-bold text-natural-espresso text-lg">แคตตาล็อกแบบชุด NUNUH Boutique</h3>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="bg-natural-clay hover:bg-natural-clay-dark text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center space-x-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>อัปโหลดแบบชุดเพิ่ม</span>
                </button>
              )}
            </div>
            <p className="text-xs text-natural-espresso/60">แคตตาล็อกคอลเลกชันยอดนิยมสำหรับนำเสนอ หรือนำมาใช้ตั้งต้นสำหรับออเดอร์สั่งตัด</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาแบบชุด เนื้อผ้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-2 w-full sm:w-64 rounded-xl border border-natural-wheat bg-white text-xs text-natural-espresso placeholder-natural-espresso/40 focus:outline-none focus:ring-1 focus:ring-natural-clay"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-natural-espresso/40" />
            </div>

            {/* Filters Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-natural-espresso text-natural-cream'
                      : 'bg-natural-sand hover:bg-natural-wheat text-natural-espresso/80'
                  }`}
                >
                  {cat === 'ALL' ? '🌈 ทั้งหมด' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalogue Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredCatalogue.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-2xl border border-natural-wheat shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image layout */}
                <div className="relative h-56 bg-natural-sand overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-natural-espresso/80 text-natural-cream text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                    {item.category}
                  </span>
                  {item.sku && (
                    <span className="absolute top-3 right-3 bg-natural-clay text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full tracking-wider shadow-xs">
                      SKU: {item.sku}
                    </span>
                  )}
                </div>

                {/* Info Text */}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-serif font-bold text-natural-espresso text-base">{item.name}</h4>
                    <span className="text-xs font-bold text-natural-clay whitespace-nowrap bg-natural-cream border border-natural-wheat/80 px-2 py-0.5 rounded">
                      {item.priceRange.replace(" บาท", "")}
                    </span>
                  </div>
                  <p className="text-xs text-natural-espresso/80 line-clamp-3 leading-relaxed">{item.description}</p>
                  
                  {/* Features badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {item.features.map((feature, idx) => (
                      <span key={idx} className="text-[10px] bg-natural-cream border border-natural-wheat text-natural-espresso/70 px-2 py-0.5 rounded-full">
                        ✨ {feature}
                      </span>
                    ))}
                  </div>

                  {/* Available Sizes list */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-natural-espresso/50 uppercase">ไซส์พร้อมตัด:</span>
                    {item.sizes && item.sizes.length > 0 ? (
                      item.sizes.map((sz, idx) => (
                        <span key={idx} className="text-[10px] bg-natural-clay/5 text-natural-clay border border-natural-clay/20 px-1.5 py-0.2 rounded font-bold font-serif">
                          {sz}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-natural-espresso/40">Custom / วัดตัวพิเศษ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action row at bottom */}
              <div className="p-4 bg-natural-sand/20 border-t border-natural-sand flex items-center justify-between">
                <span className="text-[10px] text-natural-espresso/60 font-semibold italic">
                  ผ้าแนะนำ: {item.fabricRecommend.split(' & ')[0]}
                </span>
                <div className="flex items-center space-x-2">
                  {!isReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all cursor-pointer border border-amber-200 text-xs flex items-center justify-center"
                        title="แก้ไขแบบชุดนี้"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`คุณต้องการลบแบบชุด "${item.name}" ออกจากแคตตาล็อกใช่หรือไม่?`)) {
                            onDeleteCatalogueItem(item.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200 text-xs flex items-center justify-center"
                        title="ลบแบบชุดนี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectDesignForOrder(item.id)}
                    className="bg-natural-espresso hover:bg-natural-clay text-natural-cream hover:text-white font-serif font-bold text-xs py-1.5 px-3.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>ใช้ออกแบบนี้ &rarr;</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* MODAL: ADD NEW DESIGN TO CATALOGUE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-natural-espresso/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-natural-cream border border-natural-wheat rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="bg-natural-espresso text-natural-cream p-5 rounded-t-3xl flex justify-between items-center border-b border-natural-sand/10">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-natural-clay text-white rounded-lg">
                  <Sparkles className="h-4 w-4 text-natural-ochre" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-natural-sand">
                    {editingItem ? 'แก้ไขรายละเอียดแบบชุดดีไซน์ (Edit Dress Design)' : 'อัปโหลดแบบชุดใหม่ลงคลังผลงาน (Upload New Dress Design)'}
                  </h3>
                  <p className="text-[10px] text-natural-sand/70">บันทึกแบบดีไซน์ใหม่ลงแคตตาล็อกทางร้าน เพื่อใช้อ้างอิงและเสนอให้ลูกค้าเลือกสั่งตัด</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-natural-espresso-dark text-natural-sand/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-natural-espresso flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left fields column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-natural-espresso/70 mb-1">ชื่อชุดดีไซน์ *</label>
                      <input 
                        type="text"
                        required
                        placeholder="เช่น Malika Royal Kaftan"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-natural-espresso/70 mb-1">รหัส SKU</label>
                      <input 
                        type="text"
                        placeholder="เช่น NNH-MKB-06"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-natural-espresso/70 mb-1">หมวดหมู่ชุด *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                      >
                        {formCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-natural-espresso/70 mb-1">ช่วงราคาประเมิน *</label>
                      <input 
                        type="text"
                        required
                        placeholder="เช่น 4,500 - 5,800"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                      />
                    </div>
                  </div>

                  {category === 'Custom' && (
                    <div>
                      <label className="block text-xs font-bold text-natural-espresso/70 mb-1">ระบุหมวดหมู่ของคุณเอง</label>
                      <input 
                        type="text"
                        placeholder="เช่น ชุดสูท, เดรสสั้น"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-natural-espresso/70 mb-1">ประเภทผ้าที่แนะนำสำหรับตัดชุด *</label>
                    <input 
                      type="text"
                      required
                      placeholder="เช่น Premium Silk Satin หรือผ้าเครปซาอุดิ"
                      value={fabricRecommend}
                      onChange={(e) => setFabricRecommend(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-natural-espresso/70 mb-1.5">ไซส์มาตรฐานพร้อมผลิตสำหรับดีไซน์นี้ *</label>
                    <div className="flex items-center gap-2">
                      {['SS', 'S', 'M', 'L', 'XL'].map((size) => {
                        const isSelected = formSizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleToggleSize(size)}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-natural-clay text-white border-natural-clay shadow-xs'
                                : 'bg-white text-natural-espresso border-natural-wheat hover:bg-natural-sand/30'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-natural-espresso/50 mt-1">คลิกเพื่อเปิด/ปิดไซส์ที่รองรับเพื่อให้เจ้าหน้าที่และลูกค้าเลือกออเดอร์ด่วนได้ง่ายขึ้น</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-natural-espresso/70 mb-1">จุดเด่นของดีไซน์ (ใส่คอมม่าคั่นสำหรับหลายข้อ)</label>
                    <input 
                      type="text"
                      placeholder="เช่น ลูกไม้ฝรั่งเศสฉลุลาย, แขนพองทรงเจ้าหญิง, มีสายผูกเอวปรับรูปทรง"
                      value={featuresInput}
                      onChange={(e) => setFeaturesInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                    />
                    <p className="text-[10px] text-natural-espresso/50 mt-1">ช่วยอำนวยความสะดวกให้ช่างดูจุดเน้นในการขึ้นโครงได้ง่ายขึ้น</p>
                  </div>
                </div>

                {/* Right image upload column */}
                <div className="flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-natural-espresso/70 mb-2">รูปภาพแบบดีไซน์ของชุด *</label>
                    
                    {/* Image Drag and Drop Container */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center min-h-[220px] transition-all ${
                        dragActive 
                          ? 'border-natural-clay bg-natural-sand/40 scale-[0.99]' 
                          : 'border-natural-wheat bg-white hover:bg-natural-sand/10'
                      }`}
                    >
                       {isCompressing ? (
                        <div className="space-y-3 py-6 flex flex-col items-center justify-center">
                          <div className="h-8 w-8 border-4 border-natural-clay/30 border-t-natural-clay rounded-full animate-spin"></div>
                          <p className="text-xs font-semibold text-natural-clay">กำลังประมวลผลและบีบอัดรูปภาพ...</p>
                        </div>
                      ) : imagePreview ? (
                        <div className="relative group w-full h-44 flex items-center justify-center">
                          <img 
                            src={imagePreview} 
                            alt="Design Preview" 
                            className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setImagePreview(null)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-all cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <div className="mx-auto h-11 w-11 rounded-full bg-natural-sand flex items-center justify-center text-natural-espresso/60">
                            <Upload className="h-5 w-5 text-natural-clay" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-natural-clay hover:underline">คลิกเพื่ออัปโหลด</span>
                            <span className="text-natural-espresso/60"> หรือลากไฟล์ภาพชุดมาวางที่นี่</span>
                          </div>
                          <p className="text-[10px] text-natural-espresso/40">รองรับไฟล์ JPG, PNG (รูปภาพถ่ายแบบจริง หรือ ภาพสเก็ตช์สไตล์)</p>
                        </div>
                      )}

                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                </div>

              </div>

              {formSizes.length > 0 && (
                <div className="bg-natural-sand/25 border border-natural-wheat/70 rounded-2xl p-5 space-y-3.5">
                  <p className="text-xs font-extrabold text-natural-clay uppercase tracking-wider">ตั้งราคาเฉพาะของแต่ละไซส์ (บาท):</p>
                  <div className="grid grid-cols-5 gap-3">
                    {formSizes.map((size) => (
                      <div key={size} className="space-y-1.5">
                        <span className="text-xs font-extrabold text-natural-espresso/80 block text-center font-serif">ไซส์ {size}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          placeholder="ราคา"
                          value={sizePricesMap[size] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setSizePricesMap({
                              ...sizePricesMap,
                              [size]: val
                            });
                          }}
                          className="w-full px-3 py-3 text-center border border-natural-wheat/80 rounded-xl bg-white text-sm text-natural-espresso focus:ring-1 focus:ring-natural-clay focus:outline-none font-black shadow-3xs tracking-wide"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-natural-espresso/70 mb-1">รายละเอียดและคำอธิบายสไตล์การแต่งตัว *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="เขียนบรรยายโครงร่าง รายละเอียดการเย็บสไตล์ ความพิเศษอื่นๆ ของแบบชุดชิ้นนี้ เพื่อประกอบการเสนอแนะให้เห็นลุคโดยรวมที่สมบูรณ์แบบ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-3 border-t border-natural-sand/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-natural-wheat text-xs font-bold text-natural-espresso/70 hover:bg-natural-sand/30 hover:text-natural-espresso transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-natural-espresso hover:bg-natural-clay text-natural-cream hover:text-white py-2.5 rounded-xl text-xs font-serif font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{editingItem ? 'บันทึกการแก้ไขแบบชุด' : 'บันทึกเข้าแคตตาล็อก'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
