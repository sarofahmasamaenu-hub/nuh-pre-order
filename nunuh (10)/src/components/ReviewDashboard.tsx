import React, { useState } from 'react';
import { CustomerReview, Order, OrderStatus } from '../types';
import { 
  Star, Search, Filter, Plus, Upload, X, Check, Trash2, 
  Scissors, MessageSquare, Clipboard, Award, TrendingUp, Sparkles, MessageCircle,
  Share2, Send
} from 'lucide-react';
import { compressImage } from '../utils/image';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewDashboardProps {
  reviews: CustomerReview[];
  orders: Order[];
  onAddReview: (newReview: CustomerReview) => void;
  onUpdateReview: (updatedReview: CustomerReview) => void;
  onDeleteReview: (id: string) => void;
}

export default function ReviewDashboard({ 
  reviews, 
  orders, 
  onAddReview, 
  onUpdateReview, 
  onDeleteReview 
}: ReviewDashboardProps) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotesValue, setTempNotesValue] = useState('');

  // Form States for New Review
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [newRatingDress, setNewRatingDress] = useState(5);
  const [newRatingFabric, setNewRatingFabric] = useState(5);
  const [newRatingService, setNewRatingService] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newReviewImage, setNewReviewImage] = useState<string | null>(null);
  const [newTailorNote, setNewTailorNote] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Get completed orders that can be reviewed
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

  // Find completed orders without a review
  const unreviewedCompletedOrders = completedOrders.filter(
    order => !reviews.some(rev => rev.orderId === order.id || rev.orderNumber === order.orderNumber)
  );

  // Filtered reviews
  const filteredReviews = reviews.filter(rev => {
    const matchesSearch = 
      rev.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.dressType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' ? true : rev.rating === ratingFilter;
    
    return matchesSearch && matchesRating;
  });

  // Math metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) 
    : '0.0';
  
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { stars, count, pct };
  });

  // Handle Note Save for Tailors
  const handleStartEditingNotes = (rev: CustomerReview) => {
    setEditingNotesId(rev.id);
    setTempNotesValue(rev.tailorNote || '');
  };

  const handleSaveNotes = (rev: CustomerReview) => {
    onUpdateReview({
      ...rev,
      tailorNote: tempNotesValue
    });
    setEditingNotesId(null);
  };

  // Image Upload handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 800, 800, 0.75);
        setNewReviewImage(compressed);
      } catch (err: any) {
        console.error(err);
        alert('ไม่สามารถประมวลผลรูปภาพได้ค่ะ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  // Submit New Review
  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('กรุณาเลือกออเดอร์ของลูกค้าที่ต้องการรีวิวค่ะ');
      return;
    }

    const matchedOrder = orders.find(o => o.id === selectedOrderId);
    if (!matchedOrder) return;

    // Calculate overall average rating (rounded)
    const overallRating = Math.round((newRatingDress + newRatingFabric + newRatingService) / 3);

    const newReviewItem: CustomerReview = {
      id: `rev-${Date.now()}`,
      orderId: matchedOrder.id,
      orderNumber: matchedOrder.orderNumber,
      customerName: matchedOrder.customerName,
      dressType: matchedOrder.dressType,
      rating: overallRating,
      ratingDress: newRatingDress,
      ratingFabric: newRatingFabric,
      ratingService: newRatingService,
      comment: newComment,
      reviewImage: newReviewImage || undefined,
      tailorNote: newTailorNote || undefined,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddReview(newReviewItem);
    
    // Reset Form
    setSelectedOrderId('');
    setNewRatingDress(5);
    setNewRatingFabric(5);
    setNewRatingService(5);
    setNewComment('');
    setNewReviewImage(null);
    setNewTailorNote('');
    setShowAddModal(false);
  };

  const sendReviewLinkToCustomer = async (order: Order) => {
    const directLink = `${window.location.origin}/?mode=customer&search=${order.orderNumber}&action=review`;
    const reviewInvitationText = `🌟 ห้องเสื้อ NUNUH - ขอรบกวนประเมินความพึงพอใจและเขียนรีวิวสำหรับชุด ${order.dressType} (${order.orderNumber})\n\nเรียนคุณ ${order.customerName}\nท่านสามารถกดเปิดลิงก์ด้านล่างเพื่อเขียนรีวิวและให้คะแนนความพึงพอใจได้ทันทีโดยไม่ต้องค้นหาเองค่ะ 👇\n🔗 ${directLink}\n\nขอขอบพระคุณล่วงหน้าค่ะ 🙏✨`;

    // 1. Copy to clipboard automatically
    try {
      await navigator.clipboard.writeText(reviewInvitationText);
    } catch (e) {}

    // 2. Push message via LINE API if lineUserId exists
    let pushedViaApi = false;
    if (order.lineUserId) {
      try {
        const res = await fetch('/api/send-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: order.lineUserId,
            message: reviewInvitationText
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          pushedViaApi = true;
        }
      } catch (err) {}
    }

    // 3. Open LINE messaging / share scheme directly
    const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(reviewInvitationText)}`;
    window.open(lineShareUrl, '_blank');

    // 4. Alert user
    if (pushedViaApi) {
      alert(`📲 ส่งลิงก์เขียนรีวิวให้ คุณ${order.customerName.replace('คุณ', '').trim()} เข้า LINE เรียบร้อยแล้วค่ะ! ✨`);
    } else {
      alert(`📲 ส่งลิงก์เขียนรีวิวให้ คุณ${order.customerName.replace('คุณ', '').trim()} เรียบร้อยแล้วค่ะ!\n(เปิดแอป LINE พร้อมคัดลอกข้อความลง Clipboard ให้อัตโนมัติค่ะ) ✨`);
    }
  };

  return (
    <div id="review-dashboard-panel" className="space-y-6">
      
      {/* 1. SATISFACTION METRICS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Average Score */}
        <div className="bg-white rounded-2xl border border-natural-wheat p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold tracking-wider text-natural-espresso/40 uppercase">คะแนนความพึงพอใจเฉลี่ย</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-serif font-black text-natural-espresso">{avgRating}</span>
              <span className="text-sm font-bold text-natural-espresso/50">/ 5.0</span>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`h-4.5 w-4.5 ${
                    s <= Math.round(Number(avgRating)) 
                      ? 'text-amber-400 fill-amber-400' 
                      : 'text-stone-200'
                  }`} 
                />
              ))}
            </div>
          </div>
          <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Award className="h-8 w-8" />
          </div>
        </div>

        {/* Metric 2: Rating Distribution */}
        <div className="bg-white rounded-2xl border border-natural-wheat p-5 space-y-2 shadow-xs">
          <span className="text-[10px] font-extrabold tracking-wider text-natural-espresso/40 uppercase">การกระจายคะแนนโหวต ({totalReviews} รีวิว)</span>
          <div className="space-y-1.5 pt-1">
            {ratingDistribution.map(({ stars, count, pct }) => (
              <div key={stars} className="flex items-center text-xs text-natural-espresso/70">
                <div className="flex items-center w-12 text-[11px] font-bold">
                  <span>{stars}</span>
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400 ml-1" />
                </div>
                <div className="flex-1 bg-stone-100 h-2 rounded-full overflow-hidden mx-2">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono font-bold text-[11px]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 3: Couture Improvement Focus */}
        <div className="bg-gradient-to-br from-natural-sand/30 to-natural-clay/5 rounded-2xl border border-natural-wheat p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="h-4 w-4 text-natural-clay" />
              <span className="text-[10px] font-extrabold tracking-wider text-natural-clay uppercase">เป้าหมายด้านคุณภาพ</span>
            </div>
            <h4 className="text-sm font-serif font-bold text-natural-espresso pt-1">รักษามาตรฐานคูตูร์แฮนด์เมด</h4>
            <p className="text-[11px] leading-relaxed text-natural-espresso/70">
              ทุกคะแนนรีวิวจากลูกค้าจะถูกส่งต่อไปยังช่างเย็บ ช่างแพทเทิร์น และช่างปักโดยตรงเพื่อวิเคราะห์โครงสวมใส่ สัดส่วน และความพริ้วไหวของเนื้อผ้าชั้นเลิศ
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 w-full py-2 bg-natural-clay hover:bg-natural-clay-dark text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>เพิ่มรีวิวใหม่เข้าคลัง</span>
          </button>
        </div>

      </div>

      {/* CUSTOMER REVIEW LINK GENERATOR & DIRECT SHARE */}
      <div className="bg-white rounded-2xl border border-natural-wheat/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-natural-espresso text-natural-cream rounded-xl shrink-0">
              <Share2 className="h-5 w-5 text-natural-ochre" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-natural-espresso">🔗 แชร์ลิงก์ส่งให้ลูกค้าเขียนรีวิวความพึงพอใจ</h4>
              <p className="text-[11px] text-natural-espresso/60 mt-0.5">คัดลอกลิงก์ด้านล่างเพื่อส่งให้ลูกค้าทาง LINE, Messenger หรือช่องทางต่างๆ เพื่อให้ลูกค้ากดเข้ามาเขียนรีวิวและประเมินผลงานได้โดยตรง</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
              Online Active ✓
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center border-t border-natural-wheat/40 pt-3">
          {/* General Customer Lounge link */}
          <div className="lg:col-span-6 space-y-1.5">
            <label className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
              1. ลิงก์ทั่วไป (หน้าหลักบริการตนเอง - Customer Lounge)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?mode=customer`}
                className="flex-1 bg-stone-50 border border-natural-wheat rounded-xl px-3 py-2 text-xs text-natural-espresso/80 font-mono font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?mode=customer`);
                  alert('คัดลอกลิงก์หน้าหลักบริการลูกค้าเรียบร้อยค่ะ! 📋');
                }}
                className="bg-natural-espresso hover:bg-natural-clay text-natural-cream hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>คัดลอกลิงก์</span>
              </button>
            </div>
          </div>

          {/* Quick link guide */}
          <div className="lg:col-span-6 bg-amber-50/40 p-3 rounded-xl border border-amber-200/40 text-[11px] text-natural-espresso/80 leading-relaxed space-y-1">
            <span className="font-bold text-amber-800 flex items-center gap-1">
              <span>💡 คำแนะนำเพื่อความสะดวกรวดเร็ว:</span>
            </span>
            <p>ทางร้านสามารถกดปุ่ม <span className="font-bold text-pink-700">"ส่งลิงก์ให้ลูกค้า 📲"</span> จากรายชื่อออเดอร์สำเร็จด้านล่างนี้ได้ทันที ระบบจะส่งลิงก์ตรงสำหรับ<b>ค้นหาข้อมูลและรหัสชุดของลูกค้าให้อัตโนมัติเข้า LINE</b> ลูกค้ากดลิงก์เขียนรีวิวได้ทันทีโดยไม่ต้องกรอกเบอร์โทรค้นหาเองค่ะ!</p>
          </div>
        </div>

        {/* Unreviewed completed orders direct link buttons */}
        {unreviewedCompletedOrders.length > 0 ? (
          <div className="border-t border-natural-wheat/40 pt-3.5 space-y-2">
            <span className="block text-[11px] font-bold text-natural-espresso/70 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📋 รายชื่อออเดอร์จัดส่งแล้วที่ยังไม่ได้เขียนรีวิว ({unreviewedCompletedOrders.length} ออเดอร์)</span>
              </span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {unreviewedCompletedOrders.map((order) => {
                return (
                  <div key={order.id} className="bg-stone-50/70 border border-pink-200/80 p-3 rounded-2xl flex items-center justify-between text-xs hover:border-pink-300 hover:bg-pink-50/40 transition-all shadow-3xs group">
                    <div className="space-y-0.5 min-w-0 mr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-black text-pink-950 text-xs">{order.orderNumber}</span>
                        <span className="text-[11px] font-bold text-natural-espresso truncate">{order.customerName}</span>
                      </div>
                      <p className="text-[10px] text-natural-espresso/60 truncate font-serif">{order.dressType} — {order.fabricColor || 'ตามแบบ'}</p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => sendReviewLinkToCustomer(order)}
                        className="bg-pink-600 hover:bg-pink-700 text-white border border-pink-600 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center space-x-1 cursor-pointer shadow-3xs active:scale-95 hover:shadow-2xs"
                        title="กดส่งลิงก์เขียนรีวิวตรงให้ลูกค้ารายนี้ผ่าน LINE / Message ทันที"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>ส่งลิงก์ให้ลูกค้า 📲</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border-t border-natural-wheat/40 pt-3 text-center py-2 bg-emerald-50/20 border border-emerald-100 rounded-xl">
            <p className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
              <span>🎉 ดีเยี่ยม! ออเดอร์ที่ส่งมอบเสร็จสิ้นทั้งหมดได้รับการรีวิวเรียบร้อยครบถ้วนแล้วค่ะ</span>
            </p>
          </div>
        )}
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl border border-natural-wheat p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-natural-espresso/40" />
          <input
            type="text"
            placeholder="ค้นหาตามรหัสออเดอร์, ชื่อลูกค้า, ชนิดชุด หรือคำวิจารณ์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-natural-wheat/80 rounded-xl text-xs text-natural-espresso focus:outline-none focus:ring-1 focus:ring-natural-clay focus:bg-white"
          />
        </div>

        {/* Filter Group */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-natural-espresso/60 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">กรองคะแนน:</span>
          </div>
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                ratingFilter === 'all'
                  ? 'bg-white text-natural-espresso shadow-3xs border border-natural-wheat/40'
                  : 'text-natural-espresso/60 hover:text-natural-espresso'
              }`}
            >
              ทั้งหมด
            </button>
            {[5, 4, 3, 2, 1].map(stars => (
              <button
                key={stars}
                onClick={() => setRatingFilter(stars)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-0.5 ${
                  ratingFilter === stars
                    ? 'bg-white text-natural-espresso shadow-3xs border border-natural-wheat/40'
                    : 'text-natural-espresso/60 hover:text-natural-espresso'
                }`}
              >
                <span>{stars}</span>
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 3. DETAILED FEEDBACK TABLE FOR TAILORING TEAM */}
      <div className="bg-white rounded-2xl border border-natural-wheat overflow-hidden shadow-xs">
        
        {/* Table Header Accent */}
        <div className="bg-gradient-to-r from-natural-espresso to-natural-clay/90 px-6 py-4 flex items-center justify-between text-white border-b border-natural-wheat">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-natural-ochre" />
            <div>
              <h3 className="font-serif font-black text-sm tracking-wide">ตารางสรุปความคิดเห็นและบันทึกถึงทีมช่างตัดเย็บ</h3>
              <p className="text-[10px] text-white/70">วิเคราะห์สัดส่วน แก้ไขงาน และเก็บสะสมสถิติความเนี้ยบของชุดคูตูร์แบรนด์ NUNUH</p>
            </div>
          </div>
          <span className="bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
            แสดง {filteredReviews.length} จาก {totalReviews} รีวิว
          </span>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-natural-wheat text-[10px] font-extrabold tracking-wider text-natural-espresso/60 uppercase">
                <th className="py-3 px-6 w-32">รหัสออเดอร์ / ลูกค้า</th>
                <th className="py-3 px-4 w-28">ประเภทชุด</th>
                <th className="py-3 px-4 w-24">คะแนนดาว</th>
                <th className="py-3 px-6">ความคิดเห็นและรูปรีวิว</th>
                <th className="py-3 px-6 w-96">Note พิเศษสำหรับทีมช่างเย็บ (Tailor Notes)</th>
                <th className="py-3 px-4 text-center w-16">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-natural-wheat/40">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-stone-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <MessageCircle className="h-8 w-8 text-stone-300" />
                      <p>ไม่พบรายการรีวิวหรือความคิดเห็นตรงกับเงื่อนไขค้นหาค่ะ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((rev) => {
                  const isNotesEditing = editingNotesId === rev.id;

                  return (
                    <tr key={rev.id} className="hover:bg-natural-sand/10 transition-colors text-xs align-top">
                      
                      {/* Column 1: Order details & Customer */}
                      <td className="py-4 px-6 space-y-1 border-r border-stone-100">
                        <div className="font-mono font-extrabold text-natural-espresso">{rev.orderNumber}</div>
                        <div className="font-bold text-natural-espresso/80">{rev.customerName}</div>
                        <div className="text-[9px] text-natural-espresso/40 font-mono">{rev.createdAt}</div>
                      </td>

                      {/* Column 2: Dress Type */}
                      <td className="py-4 px-4 font-medium text-natural-espresso/75 border-r border-stone-100">
                        {rev.dressType}
                      </td>

                      {/* Column 3: Star rating */}
                      <td className="py-4 px-4 border-r border-stone-100 space-y-2">
                        {/* Overall */}
                        <div>
                          <div className="text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider mb-0.5">คะแนนเฉลี่ย</div>
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-3.5 w-3.5 ${
                                  star <= rev.rating 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-stone-200'
                                }`} 
                              />
                            ))}
                            <span className="text-[10px] font-black text-natural-espresso/60 ml-1.5">{rev.rating}.0</span>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="pt-1.5 border-t border-dashed border-stone-100 space-y-1 text-[10px]">
                          {/* 1. ทรงชุด */}
                          <div className="flex items-center justify-between">
                            <span className="text-natural-espresso/50 text-[9px] font-medium">สัดส่วน/ทรงชุด:</span>
                            <div className="flex items-center ml-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-2.5 w-2.5 ${
                                    star <= (rev.ratingDress || rev.rating) 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-stone-200'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                          {/* 2. เนื้อผ้า */}
                          <div className="flex items-center justify-between">
                            <span className="text-natural-espresso/50 text-[9px] font-medium">คุณภาพเนื้อผ้า:</span>
                            <div className="flex items-center ml-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-2.5 w-2.5 ${
                                    star <= (rev.ratingFabric || rev.rating) 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-stone-200'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                          {/* 3. การบริการ */}
                          <div className="flex items-center justify-between">
                            <span className="text-natural-espresso/50 text-[9px] font-medium">การบริการลูกค้า:</span>
                            <div className="flex items-center ml-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-2.5 w-2.5 ${
                                    star <= (rev.ratingService || rev.rating) 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-stone-200'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Comments and image preview */}
                      <td className="py-4 px-6 border-r border-stone-100 space-y-3">
                        <p className="text-natural-espresso leading-relaxed italic bg-stone-50/50 p-2.5 rounded-xl border border-stone-100">
                          "{rev.comment}"
                        </p>
                        {rev.reviewImage && (
                          <div className="relative group w-20 h-24 rounded-lg overflow-hidden border border-natural-wheat shadow-3xs hover:scale-105 transition-transform">
                            <img 
                              src={rev.reviewImage} 
                              alt="Customer review photo" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity">
                              ขยายดูรูป
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Editable tailor note */}
                      <td className="py-4 px-6">
                        {isNotesEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={tempNotesValue}
                              onChange={(e) => setTempNotesValue(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 text-xs border border-natural-wheat rounded-xl bg-white text-natural-espresso focus:outline-none focus:ring-1 focus:ring-natural-clay"
                              placeholder="ตัวอย่าง: ปรับขนาดอกอีก 0.5 นิ้วในการดีไซน์รอบถัดไป..."
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSaveNotes(rev)}
                                className="px-3 py-1 bg-natural-clay hover:bg-natural-clay-dark text-white text-[10px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                <span>บันทึกสำเร็จ</span>
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-natural-espresso text-[10px] font-medium rounded-lg transition-all cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 group">
                            {rev.tailorNote ? (
                              <div className="bg-amber-50/40 text-natural-clay-dark p-3 rounded-xl border border-amber-200/50 leading-relaxed font-serif">
                                <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wide flex items-center space-x-1 mb-1">
                                  <Scissors className="h-3 w-3" />
                                  <span>ข้อคิดเห็นในการตัดเย็บ:</span>
                                </div>
                                {rev.tailorNote}
                              </div>
                            ) : (
                              <p className="text-stone-400 italic text-[11px] py-1">ไม่มีข้อกำหนดพิเศษระบุเพิ่มเติมสำหรับช่างเย็บ</p>
                            )}
                            <button
                              onClick={() => handleStartEditingNotes(rev)}
                              className="text-[10px] text-natural-clay font-bold hover:underline opacity-80 hover:opacity-100 flex items-center space-x-1 cursor-pointer pt-1"
                            >
                              <span>✏️ {rev.tailorNote ? 'แก้ไขโน้ต' : 'เพิ่มบันทึกสำหรับช่าง'}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('คุณต้องการลบความคิดเห็นรีวิวนี้ออกจากคลังหรือไม่?')) {
                              onDeleteReview(rev.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="ลบรีวิว"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. MODAL FOR ADDING CUSTOMER REVIEW */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-natural-wheat w-full max-w-lg shadow-xl overflow-hidden"
            >
              
              {/* Modal Header */}
              <div className="bg-natural-espresso px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <span className="font-serif font-black text-sm tracking-wide">เพิ่มความพึงพอใจและรีวิวเข้าคลัง</span>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddReviewSubmit} className="p-6 space-y-4">
                
                {/* 1. Select completed order */}
                <div>
                  <label className="block text-xs font-bold text-natural-espresso/80 mb-1">
                    เลือกประวัติออเดอร์ที่ตัดเย็บเสร็จสิ้น *
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => {
                      setSelectedOrderId(e.target.value);
                      const matched = orders.find(o => o.id === e.target.value);
                      if (matched) {
                        setNewComment(`ชุดดีมากค่ะ ทรงสวยถูกใจ ${matched.customerName}`);
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                  >
                    <option value="">-- กรุณาเลือกออเดอร์สำเร็จ --</option>
                    {completedOrders.length === 0 ? (
                      <option disabled>ไม่มีออเดอร์ที่อยู่ในสถานะ 'ส่งมอบสำเร็จ'</option>
                    ) : (
                      completedOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} - {o.customerName} ({o.dressType})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[10px] text-natural-espresso/40 mt-1">
                    * ระบบจะดึงเฉพาะออเดอร์ในสถานะ 'ส่งมอบสำเร็จ' (Completed) เพื่อนำมาประเมินรีวิวหลังใช้งานจริง
                  </p>
                </div>

                {/* 2. Rating Selection */}
                <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-natural-wheat/60">
                  <span className="block text-xs font-extrabold text-natural-espresso/80 uppercase tracking-wider">
                    คะแนนความพึงพอใจแยกตามหมวดหมู่ *
                  </span>

                  {/* 2.1 ทรงชุด */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-natural-espresso/70">1. การตัดเย็บและสัดส่วนทรงชุด:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRatingDress(star)}
                          className="p-0.5 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star 
                            className={`h-5 w-5 ${
                              star <= newRatingDress 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-stone-200'
                            }`} 
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-natural-espresso w-8 text-right font-mono">({newRatingDress}/5)</span>
                    </div>
                  </div>

                  {/* 2.2 ผ้า */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-natural-espresso/70">2. คุณภาพและการเลือกสรรเนื้อผ้า:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRatingFabric(star)}
                          className="p-0.5 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star 
                            className={`h-5 w-5 ${
                              star <= newRatingFabric 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-stone-200'
                            }`} 
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-natural-espresso w-8 text-right font-mono">({newRatingFabric}/5)</span>
                    </div>
                  </div>

                  {/* 2.3 บริการ */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-natural-espresso/70">3. บริการและคำแนะนำของทีมงาน:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRatingService(star)}
                          className="p-0.5 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star 
                            className={`h-5 w-5 ${
                              star <= newRatingService 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-stone-200'
                            }`} 
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-natural-espresso w-8 text-right font-mono">({newRatingService}/5)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Customer Comments */}
                <div>
                  <label className="block text-xs font-bold text-natural-espresso/80 mb-1">
                    ความคิดเห็นจากปากลูกค้า (Customer Comments) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                    placeholder="ป้อนความคิดเห็น คำชม หรือสิ่งที่ลูกค้าแนะนำ..."
                  />
                </div>

                {/* 4. Upload Review image */}
                <div>
                  <label className="block text-xs font-bold text-natural-espresso/80 mb-1">
                    แนบรูปภาพพรีวิวชุดจริง (Review Photo)
                  </label>
                  <div className="border border-dashed border-natural-wheat/80 rounded-xl p-3 flex flex-col items-center justify-center bg-stone-50/50">
                    {isCompressing ? (
                      <div className="flex flex-col items-center py-2 space-y-2">
                        <div className="h-6 w-6 border-2 border-natural-clay/30 border-t-natural-clay rounded-full animate-spin" />
                        <span className="text-[10px] text-natural-clay font-bold">กำลังประมวลผลรูป...</span>
                      </div>
                    ) : newReviewImage ? (
                      <div className="relative">
                        <img 
                          src={newReviewImage} 
                          alt="preview" 
                          className="h-20 w-16 object-cover rounded-lg border shadow-3xs"
                        />
                        <button
                          type="button"
                          onClick={() => setNewReviewImage(null)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-all cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative flex flex-col items-center cursor-pointer py-1">
                        <Upload className="h-5 w-5 text-natural-espresso/40 mb-1" />
                        <span className="text-[11px] font-bold text-natural-clay">คลิกอัปโหลดภาพรีวิว</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Seamstress Note */}
                <div>
                  <label className="block text-xs font-bold text-natural-espresso/80 mb-1">
                    คำแนะนำส่งต่อถึงช่างตัดเย็บ (Tailor Improvement Note)
                  </label>
                  <textarea
                    rows={2}
                    value={newTailorNote}
                    onChange={(e) => setNewTailorNote(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-natural-wheat bg-white text-xs focus:outline-none focus:ring-1 focus:ring-natural-clay text-natural-espresso"
                    placeholder="ระบุข้อแนะนำให้ช่างเพื่อแก้ไขแพทเทิร์นหรือรักษามาตรฐานดีเทลปักรอบถัดไป..."
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-natural-wheat/40">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-natural-espresso/70 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-natural-clay hover:bg-natural-clay-dark rounded-xl transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>บันทึกเข้าระบบ</span>
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
