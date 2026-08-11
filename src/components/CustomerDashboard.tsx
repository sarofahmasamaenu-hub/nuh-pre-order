/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, CustomerReview } from '../types';
import ReviewDashboard from './ReviewDashboard';
import { 
  User, 
  Phone, 
  Search, 
  Filter, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  X, 
  Clipboard, 
  Sparkles, 
  Star, 
  Crown, 
  ArrowUpDown, 
  Check,
  MessageCircle,
  FileText,
  BadgeAlert,
  ChevronRight,
  Layers,
  MapPin,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerDashboardProps {
  orders: Order[];
  reviews: CustomerReview[];
  onSelectTab?: (tab: string) => void;
  onAddReview?: (review: CustomerReview) => void;
  onUpdateReview?: (review: CustomerReview) => void;
  onDeleteReview?: (id: string) => void;
}

interface CustomerProfile {
  name: string;
  phone: string;
  social?: string;
  categories: string[];      // ['IDD', 'IDH'] etc.
  latestCategory: string;
  membershipTier?: 'PRIME' | 'PRIVILEGE' | 'TRADER' | 'MEMBER';
  orders: Order[];
  totalOrdersCount: number;
  totalSpent: number;
  totalPaid: number;
  totalUnpaid: number;
  latestOrderDate: string;
  reviews: CustomerReview[];
}

export default function CustomerDashboard({ 
  orders, 
  reviews, 
  onSelectTab,
  onAddReview,
  onUpdateReview,
  onDeleteReview
}: CustomerDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'reviews'>('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latestOrder' | 'totalOrders' | 'totalSpent' | 'name'>('latestOrder');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [copiedMeasurements, setCopiedMeasurements] = useState<boolean>(false);

  // Group orders into unique customer profiles
  const customerProfiles = useMemo(() => {
    const profilesMap: { [key: string]: CustomerProfile } = {};

    orders.forEach(order => {
      // Normalize customer name (remove leading 'คุณ' and handle spacing/casing)
      const nameClean = (order.customerName || '').trim();
      const normalizedKey = nameClean
        .replace(/^คุณ\s*/, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();

      if (!normalizedKey) return; // Skip if empty name

      const orderCategory = order.customerCategory || 'ทั่วไป';

      if (!profilesMap[normalizedKey]) {
        profilesMap[normalizedKey] = {
          name: order.customerName, // Default to original name
          phone: (order.customerPhone || '').trim(),
          social: (order.customerSocial || '').trim(),
          categories: [orderCategory],
          latestCategory: orderCategory,
          membershipTier: order.membershipTier,
          orders: [],
          totalOrdersCount: 0,
          totalSpent: 0,
          totalPaid: 0,
          totalUnpaid: 0,
          latestOrderDate: order.orderDate,
          reviews: []
        };
      }

      const profile = profilesMap[normalizedKey];

      // Merge phone numbers uniquely
      const phoneClean = (order.customerPhone || '').trim();
      if (phoneClean) {
        const existingPhones = profile.phone ? profile.phone.split(',').map(p => p.trim()) : [];
        if (!existingPhones.includes(phoneClean)) {
          existingPhones.push(phoneClean);
          profile.phone = existingPhones.filter(Boolean).join(', ');
        }
      }

      // Merge social accounts uniquely
      const socialClean = (order.customerSocial || '').trim();
      if (socialClean) {
        const existingSocials = profile.social ? profile.social.split(',').map(s => s.trim()) : [];
        if (!existingSocials.includes(socialClean)) {
          existingSocials.push(socialClean);
          profile.social = existingSocials.filter(Boolean).join(', ');
        }
      }

      // Add category if not exists
      if (!profile.categories.includes(orderCategory)) {
        profile.categories.push(orderCategory);
      }

      // Keep latest category and membership tier (based on latest order date)
      if (new Date(order.orderDate) >= new Date(profile.latestOrderDate)) {
        profile.latestOrderDate = order.orderDate;
        profile.latestCategory = orderCategory;
        // Keep the latest name representation if it doesn't have "คุณ" prefix, or is simply newer
        profile.name = order.customerName;
        if (order.membershipTier) {
          profile.membershipTier = order.membershipTier;
        }
      }

      // Add order
      profile.orders.push(order);
      profile.totalOrdersCount += 1;
      profile.totalSpent += order.price || 0;
      
      const deposit = order.deposit || 0;
      const discount = order.discount || 0;
      const finalPayment = order.finalPaymentAmount || 0;
      const finalPrice = Math.max(0, (order.price || 0) - discount);
      
      if (order.status === OrderStatus.COMPLETED) {
        profile.totalPaid += finalPrice;
      } else {
        const totalPaidSoFar = Math.min(finalPrice, deposit + finalPayment);
        profile.totalPaid += totalPaidSoFar;
        profile.totalUnpaid += Math.max(0, finalPrice - totalPaidSoFar);
      }
    });

    // Map customer reviews to profiles
    const profiles = Object.values(profilesMap);
    profiles.forEach(profile => {
      // Find reviews corresponding to any of the customer's orders
      const customerReviews = reviews.filter(rev => 
        profile.orders.some(o => o.id === rev.orderId || o.orderNumber === rev.orderNumber)
      );
      profile.reviews = customerReviews;
    });

    return profiles;
  }, [orders, reviews]);

  // Keep open customer modal in sync when orders are deleted or updated
  React.useEffect(() => {
    if (selectedCustomer) {
      const nameKey = selectedCustomer.name.replace(/^คุณ\s*/, '').replace(/\s+/g, ' ').toLowerCase();
      const updated = customerProfiles.find(p => p.name.replace(/^คุณ\s*/, '').replace(/\s+/g, ' ').toLowerCase() === nameKey);
      if (updated && updated.orders.length > 0) {
        setSelectedCustomer(updated);
      } else {
        setSelectedCustomer(null);
      }
    }
  }, [customerProfiles]);

  // Aggregate statistics for dashboard
  const stats = useMemo(() => {
    let totalUniqueCustomers = customerProfiles.length;
    let iddCount = 0;
    let idhCount = 0;
    let generalCount = 0;

    customerProfiles.forEach(p => {
      if (p.categories.includes('IDD')) iddCount++;
      if (p.categories.includes('IDH')) idhCount++;
      if (p.categories.includes('ทั่วไป') || (!p.categories.includes('IDD') && !p.categories.includes('IDH'))) {
        generalCount++;
      }
    });

    return {
      totalUniqueCustomers,
      iddCount,
      idhCount,
      generalCount
    };
  }, [customerProfiles]);

  // Filters & Sorting logic
  const filteredAndSortedCustomers = useMemo(() => {
    return customerProfiles
      .filter(profile => {
        // Search query filter (matches name, phone, social)
        const matchSearch = 
          profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          profile.phone.includes(searchQuery) ||
          (profile.social && profile.social.toLowerCase().includes(searchQuery.toLowerCase()));

        // Category filter
        const matchCategory = 
          selectedCategoryFilter === 'ALL' ||
          profile.categories.includes(selectedCategoryFilter);

        // Membership Tier filter
        const matchTier = 
          selectedTierFilter === 'ALL' ||
          profile.membershipTier === selectedTierFilter;

        return matchSearch && matchCategory && matchTier;
      })
      .sort((a, b) => {
        if (sortBy === 'latestOrder') {
          return new Date(b.latestOrderDate).getTime() - new Date(a.latestOrderDate).getTime();
        }
        if (sortBy === 'totalOrders') {
          return b.totalOrdersCount - a.totalOrdersCount;
        }
        if (sortBy === 'totalSpent') {
          return b.totalSpent - a.totalSpent;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'th');
        }
        return 0;
      });
  }, [customerProfiles, searchQuery, selectedCategoryFilter, selectedTierFilter, sortBy]);

  // Copy sizing measurements helper
  const handleCopyMeasurements = (measurements: any, name: string) => {
    if (!measurements) return;
    const txt = `📐 ข้อมูลสัดส่วนลูกค้า คุณ ${name}:
- รอบอก: ${measurements.chest || '-'} ซม.
- รอบเอว: ${measurements.waist || '-'} ซม.
- รอบสะโพก: ${measurements.hips || '-'} ซม.
- ไหล่กว้าง: ${measurements.shoulder || '-'} ซม.
- ความยาวแขน: ${measurements.sleeveLength || '-'} ซม.
- รอบวงแขน: ${measurements.armhole || '-'} ซม.
- ความยาวชุด: ${measurements.length || '-'} ซม.
- ส่วนสูง: ${measurements.height || '-'} ซม.
- น้ำหนัก: ${measurements.weight || '-'} กก.
- บันทึกย่อ: ${measurements.otherNotes || 'ไม่มี'}`;

    navigator.clipboard.writeText(txt);
    setCopiedMeasurements(true);
    setTimeout(() => setCopiedMeasurements(false), 2000);
  };

  const getMembershipBadgeClass = (tier?: string) => {
    switch (tier) {
      case 'PRIME':
        return 'bg-amber-500/10 text-amber-700 border-amber-300';
      case 'PRIVILEGE':
        return 'bg-purple-500/10 text-purple-700 border-purple-300';
      case 'TRADER':
        return 'bg-blue-500/10 text-blue-700 border-blue-300';
      case 'MEMBER':
        return 'bg-stone-500/10 text-stone-700 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-500 border-stone-200';
    }
  };

  const getMembershipTierTh = (tier?: string) => {
    switch (tier) {
      case 'PRIME': return 'บัตรทอง PRIME 👑';
      case 'PRIVILEGE': return 'บัตรม่วง PRIVILEGE ⭐';
      case 'TRADER': return 'กลุ่มตัวแทน TRADER 💼';
      case 'MEMBER': return 'สมาชิกทั่วไป MEMBER';
      default: return 'ลูกค้าทั่วไป';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 🧭 NAVIGATION PILLS TO UNIFY CUSTOMERS & REVIEWS IN ONE SYSTEM */}
      <div className="flex bg-white p-1 rounded-2xl border border-natural-wheat/80 shadow-3xs max-w-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('profiles')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'profiles'
              ? 'bg-natural-clay text-white shadow-xs'
              : 'text-natural-espresso/60 hover:text-natural-espresso hover:bg-stone-50'
          }`}
        >
          <User className="h-4 w-4" />
          <span>👤 ประวัติและสัดส่วนลูกค้า (IDD/IDH)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('reviews')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'reviews'
              ? 'bg-natural-clay text-white shadow-xs'
              : 'text-natural-espresso/60 hover:text-natural-espresso hover:bg-stone-50'
          }`}
        >
          <Star className={`h-4 w-4 ${activeSubTab === 'reviews' ? 'text-amber-300 fill-amber-300' : 'text-amber-500 fill-amber-500'}`} />
          <span>⭐ คลังรีวิว & Feedback</span>
        </button>
      </div>

      {activeSubTab === 'profiles' ? (
        <div className="space-y-6">
          {/* 1. CUSTOM STATS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unique Customers */}
        <div className="bg-white rounded-2xl border border-natural-wheat/80 p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-stone-50 text-stone-400 rounded-xl group-hover:text-natural-clay transition-all shrink-0">
            <User className="h-5 w-5" />
          </div>
          <span className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
            จำนวนลูกค้าสะสม (Unique Customers)
          </span>
          <h3 className="font-serif font-black text-2xl text-natural-espresso mt-1.5 flex items-baseline gap-1">
            {stats.totalUniqueCustomers} <span className="text-xs font-sans font-normal text-natural-espresso/50">ราย</span>
          </h3>
          <p className="text-[10px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
            <span>✓ ข้อมูลซิงค์อัตโนมัติจากใบออเดอร์ทั้งหมด</span>
          </p>
        </div>

        {/* IDD Count */}
        <div className="bg-white rounded-2xl border border-natural-wheat/80 p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0">
            <Crown className="h-5 w-5" />
          </div>
          <span className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
            ลูกค้าตัดเฉพาะตัว (IDD PREMIUM)
          </span>
          <h3 className="font-serif font-black text-2xl text-amber-800 mt-1.5 flex items-baseline gap-1">
            {stats.iddCount} <span className="text-xs font-sans font-normal text-natural-espresso/50">ราย</span>
          </h3>
          <p className="text-[10px] text-natural-espresso/50 mt-2">
            งานพรีเมียมตัดเย็บวัดตัวรายบุคคล
          </p>
        </div>

        {/* IDH Count */}
        <div className="bg-white rounded-2xl border border-natural-wheat/80 p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-purple-50 text-purple-500 rounded-xl shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <span className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
            ลูกค้าตัดชุดสำเร็จ (IDH STYLE)
          </span>
          <h3 className="font-serif font-black text-2xl text-purple-800 mt-1.5 flex items-baseline gap-1">
            {stats.idhCount} <span className="text-xs font-sans font-normal text-natural-espresso/50">ราย</span>
          </h3>
          <p className="text-[10px] text-natural-espresso/50 mt-2">
            งานปรับขนาดมาตรฐานและดีไซน์เฉพาะ
          </p>
        </div>

        {/* General/Other Count */}
        <div className="bg-white rounded-2xl border border-natural-wheat/80 p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2 bg-stone-50 text-stone-500 rounded-xl shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <span className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
            ออเดอร์ตัดเย็บทั่วไป
          </span>
          <h3 className="font-serif font-black text-2xl text-stone-800 mt-1.5 flex items-baseline gap-1">
            {stats.generalCount} <span className="text-xs font-sans font-normal text-natural-espresso/50">ราย</span>
          </h3>
          <p className="text-[10px] text-natural-espresso/50 mt-2">
            ลูกค้าสั่งตัดแบบอเนกประสงค์อื่นๆ
          </p>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white rounded-2xl border border-natural-wheat p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-natural-espresso/40">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์ หรือ LINE/Social..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50/70 border border-natural-wheat/70 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-natural-espresso placeholder:text-natural-espresso/45 focus:outline-none focus:ring-1 focus:ring-natural-clay focus:bg-white transition-all font-medium"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-natural-espresso/30 hover:text-natural-espresso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-stone-50 border border-natural-wheat/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-natural-espresso text-natural-cream'
                  : 'text-natural-espresso/60 hover:text-natural-espresso hover:bg-stone-100'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('IDD')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'IDD'
                  ? 'bg-amber-600 text-white'
                  : 'text-natural-espresso/60 hover:text-amber-600 hover:bg-amber-50/50'
              }`}
            >
              IDD
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('IDH')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'IDH'
                  ? 'bg-purple-700 text-white'
                  : 'text-natural-espresso/60 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              IDH
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('ทั่วไป')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'ทั่วไป'
                  ? 'bg-stone-500 text-white'
                  : 'text-natural-espresso/60 hover:text-stone-700 hover:bg-stone-100'
              }`}
            >
              ทั่วไป
            </button>
          </div>

          {/* Membership Tier Filter */}
          <div className="relative">
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="bg-stone-50 border border-natural-wheat/60 rounded-xl px-3 py-2 text-[11px] font-bold text-natural-espresso/80 focus:outline-none focus:ring-1 focus:ring-natural-clay cursor-pointer"
            >
              <option value="ALL">ระดับสมาชิก: ทั้งหมด</option>
              <option value="PRIME">PRIME 👑</option>
              <option value="PRIVILEGE">PRIVILEGE ⭐</option>
              <option value="TRADER">TRADER 💼</option>
              <option value="MEMBER">MEMBER</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-1 bg-stone-50 border border-natural-wheat/60 rounded-xl px-2 py-1 shrink-0">
            <ArrowUpDown className="h-3 w-3 text-natural-espresso/50" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-[11px] font-bold text-natural-espresso/80 focus:outline-none cursor-pointer py-1 pr-1.5"
            >
              <option value="latestOrder">เรียงตาม: ล่าสุด</option>
              <option value="totalOrders">เรียงตาม: จำนวนสั่งซื้อ</option>
              <option value="totalSpent">เรียงตาม: ยอดซื้อสะสม</option>
              <option value="name">เรียงตาม: ชื่อลูกค้า</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. CUSTOMER LIST GRID */}
      {filteredAndSortedCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedCustomers.map((profile, idx) => {
            const latestOrder = profile.orders[0];
            const hasIdd = profile.categories.includes('IDD');
            const hasIdh = profile.categories.includes('IDH');

            return (
              <motion.div
                key={profile.name + profile.phone}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.03, 0.3) }}
                className="bg-white rounded-2xl border border-natural-wheat/80 hover:border-natural-clay/50 p-5 shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between space-y-4"
              >
                
                {/* Profile Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-natural-sand text-natural-espresso border border-natural-wheat flex items-center justify-center font-serif font-bold text-sm shrink-0 uppercase">
                        {profile.name ? profile.name.replace('คุณ', '').trim().substring(0, 2) : 'LC'}
                      </div>
                      
                      {/* Name / Phone */}
                      <div className="min-w-0">
                        <h4 className="font-serif font-black text-sm text-natural-espresso truncate">
                          {profile.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[11px] text-natural-espresso/60 mt-0.5">
                          <Phone className="h-3 w-3 text-natural-espresso/40" />
                          <span>{profile.phone || 'ไม่ระบุโทรศัพท์'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Classifications Badges */}
                    <div className="flex flex-col items-end space-y-1 shrink-0">
                      {profile.membershipTier && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getMembershipBadgeClass(profile.membershipTier)}`}>
                          {profile.membershipTier}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer categories indicators */}
                  <div className="flex flex-wrap gap-1">
                    {hasIdd && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-md font-bold">
                        👑 IDD (ตัดเย็บเฉพาะตัว)
                      </span>
                    )}
                    {hasIdh && (
                      <span className="text-[9px] bg-purple-500/10 text-purple-700 border border-purple-300 px-2 py-0.5 rounded-md font-bold">
                        🔮 IDH (ชุดสำเร็จพรีเมียม)
                      </span>
                    )}
                    {!hasIdd && !hasIdh && (
                      <span className="text-[9px] bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-md font-bold">
                        ⚙️ ทั่วไป
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Summary Card */}
                <div className="bg-stone-50/70 rounded-xl p-3 border border-stone-200/30 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider">
                      จำนวนสั่งตัดทั้งหมด
                    </span>
                    <span className="font-serif font-black text-sm text-natural-espresso">
                      {profile.totalOrdersCount} ชุด
                    </span>
                  </div>
                  <div className="border-l border-stone-200/40">
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider">
                      ยอดชำระสะสมรวม
                    </span>
                    <span className="font-serif font-black text-sm text-natural-clay">
                      {profile.totalSpent.toLocaleString()} ฿
                    </span>
                  </div>
                </div>

                {/* Info and button */}
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-[10px] text-natural-espresso/50">
                    <span>ออเดอร์ล่าสุด: {new Date(profile.latestOrderDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {profile.reviews.length > 0 && (
                      <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5">
                        ⭐ {profile.reviews.length} รีวิว
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(profile)}
                    className="w-full bg-stone-100 hover:bg-natural-espresso hover:text-white text-natural-espresso/80 border border-stone-200 py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>🔍 ดูข้อมูลการสั่งซื้อและสัดส่วนตัว</span>
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-stone-50 border border-natural-wheat/60 rounded-2xl p-10 text-center text-natural-espresso/50">
          <BadgeAlert className="h-10 w-10 mx-auto text-natural-espresso/30 mb-2" />
          <p className="font-serif font-bold text-sm">ไม่พบรายชื่อลูกค้าที่ค้นหาหรือเข้าเกณฑ์เงื่อนไขค่ะ</p>
          <p className="text-xs mt-1">ลองล้างตัวกรองและข้อความค้นหาใหม่อีกครั้งค่ะ</p>
        </div>
      )}

      {/* 4. CUSTOMER DETAILS MODAL DIALOG */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 overflow-y-auto no-print flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-natural-espresso/50 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#FAF6F0] rounded-3xl border border-natural-wheat w-full max-w-4xl max-h-[88vh] overflow-y-auto shadow-2xl relative z-10 flex flex-col"
            >
              
              {/* Sticky Modal Header */}
              <div className="bg-white px-6 py-4 border-b border-natural-wheat flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-natural-clay/10 text-natural-clay border border-natural-clay/20 flex items-center justify-center font-serif font-extrabold text-base">
                    {selectedCustomer.name ? selectedCustomer.name.replace('คุณ', '').trim().substring(0, 2) : 'LC'}
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-base text-natural-espresso">
                      ประวัติการสั่งตัดเสื้อผ้าของคุณ {selectedCustomer.name.replace('คุณ', '').trim()}
                    </h3>
                    <p className="text-xs text-natural-espresso/60 flex items-center gap-1.5 mt-0.5">
                      <span>📱 {selectedCustomer.phone || 'ไม่ระบุโทรศัพท์'}</span>
                      {selectedCustomer.social && <span>| 💬 {selectedCustomer.social}</span>}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* 1. TOP STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-natural-wheat/80 p-4 text-center">
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider">ออเดอร์ทั้งหมด</span>
                    <span className="font-serif font-black text-lg text-natural-espresso mt-0.5 block">{selectedCustomer.totalOrdersCount} ชุด</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-natural-wheat/80 p-4 text-center">
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider">ยอดสะสมรวม</span>
                    <span className="font-serif font-black text-lg text-natural-clay mt-0.5 block">{selectedCustomer.totalSpent.toLocaleString()} ฿</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-natural-wheat/80 p-4 text-center bg-emerald-50/20 border-emerald-200/50">
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider text-emerald-800">ชำระแล้ว (รวมมัดจำ)</span>
                    <span className="font-serif font-black text-lg text-emerald-700 mt-0.5 block">{selectedCustomer.totalPaid.toLocaleString()} ฿</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-natural-wheat/80 p-4 text-center bg-amber-50/20 border-amber-200/50">
                    <span className="block text-[9px] font-extrabold text-natural-espresso/40 uppercase tracking-wider text-amber-800">ยอดค้างจ่ายรวม</span>
                    <span className="font-serif font-black text-lg text-amber-700 mt-0.5 block">{selectedCustomer.totalUnpaid.toLocaleString()} ฿</span>
                  </div>
                </div>

                {/* 2. TABBED METRICS OR DOUBLE COLUMNS FOR MEASUREMENTS AND REVIEWS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  
                  {/* Left: Latest Sizing Profile */}
                  <div className="lg:col-span-6 bg-white rounded-2xl border border-natural-wheat p-5 space-y-4 shadow-3xs">
                    <div className="flex justify-between items-center pb-2 border-b border-natural-wheat/45">
                      <span className="font-serif font-extrabold text-xs text-natural-espresso flex items-center gap-1.5">
                        📐 สัดส่วนตัวลูกค้าล่าสุด (Latest Measurements)
                      </span>
                      {selectedCustomer.orders[0]?.measurements && (
                        <button
                          type="button"
                          onClick={() => handleCopyMeasurements(selectedCustomer.orders[0].measurements, selectedCustomer.name)}
                          className="text-[10px] bg-natural-sand hover:bg-natural-clay hover:text-white px-2.5 py-1.5 rounded-lg text-natural-espresso font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMeasurements ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                          <span>{copiedMeasurements ? 'คัดลอกแล้ว!' : 'คัดลอกไซส์'}</span>
                        </button>
                      )}
                    </div>

                    {selectedCustomer.orders[0]?.measurements ? (
                      (() => {
                        const m = selectedCustomer.orders[0].measurements;
                        return (
                          <div className="space-y-3.5">
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">รอบอก</span>
                                <span className="font-black text-xs text-natural-espresso">{m.chest || '-'} ซม.</span>
                              </div>
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">รอบเอว</span>
                                <span className="font-black text-xs text-natural-espresso">{m.waist || '-'} ซม.</span>
                              </div>
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">สะโพก</span>
                                <span className="font-black text-xs text-natural-espresso">{m.hips || '-'} ซม.</span>
                              </div>
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">ไหล่กว้าง</span>
                                <span className="font-black text-xs text-natural-espresso">{m.shoulder || '-'} ซม.</span>
                              </div>
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">ความยาวแขน</span>
                                <span className="font-black text-xs text-natural-espresso">{m.sleeveLength || '-'} ซม.</span>
                              </div>
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/40">
                                <span className="block text-[9px] text-natural-espresso/40">รอบวงแขน</span>
                                <span className="font-black text-xs text-natural-espresso">{m.armhole || '-'} ซม.</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-[11px] text-natural-espresso/80">
                              <div><span className="font-bold">ความยาวชุด:</span> {m.length || '-'} ซม.</div>
                              <div><span className="font-bold">รอบคอ:</span> {m.neck || '-'} ซม.</div>
                              <div><span className="font-bold">ไซส์หลัก:</span> <span className="bg-stone-100 px-1.5 py-0.5 rounded-sm font-black text-stone-700">{m.standardSize || 'Custom'}</span></div>
                              <div><span className="font-bold">ส่วนสูง:</span> {m.height || '-'} ซม.</div>
                              <div><span className="font-bold">น้ำหนัก:</span> {m.weight || '-'} กก.</div>
                            </div>

                            {m.otherNotes && (
                              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/30 text-[10px] text-natural-espresso/75 leading-relaxed">
                                <span className="font-bold block text-natural-espresso/60 text-[9px] mb-0.5 uppercase tracking-wide">⚠️ หมายเหตุเพิ่มเติมด้านสรีระ:</span>
                                {m.otherNotes}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-natural-espresso/40 text-center py-4">ไม่มีข้อมูลสัดส่วนที่ระบุ</p>
                    )}
                  </div>

                  {/* Right: Reviews and Customer Level Info */}
                  <div className="lg:col-span-6 bg-white rounded-2xl border border-natural-wheat p-5 space-y-4 shadow-3xs flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="pb-2 border-b border-natural-wheat/45">
                        <span className="font-serif font-extrabold text-xs text-natural-espresso flex items-center gap-1.5">
                          ✨ ระดับชั้นและคลาสบริการ (Service Classifications)
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-natural-espresso/60 font-bold">ระดับบัตรสมาชิก:</span>
                          <span className="font-extrabold text-natural-espresso bg-stone-100 border px-3 py-1 rounded-xl">
                            {getMembershipTierTh(selectedCustomer.membershipTier)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-natural-espresso/60 font-bold">ประเภทงานตัดที่ต้องการ:</span>
                          <div className="flex gap-1">
                            {selectedCustomer.categories.map(c => (
                              <span key={c} className="text-[10px] font-black bg-stone-100 px-2 py-0.5 rounded-md text-natural-espresso">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Review Feedback in Details */}
                    <div className="border-t border-stone-100 pt-3.5 space-y-3">
                      <span className="block text-[10px] font-extrabold text-natural-espresso/50 uppercase tracking-wider">
                        ประวัติรีวิวคำติชมสะสม ({selectedCustomer.reviews.length} รายการ)
                      </span>

                      {selectedCustomer.reviews.length > 0 ? (
                        <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                          {selectedCustomer.reviews.map(rev => (
                            <div key={rev.id} className="bg-emerald-50/20 border border-emerald-100 p-2.5 rounded-xl text-[11px] leading-relaxed">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-emerald-800 flex items-center gap-0.5">
                                  {[...Array(rev.rating)].map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  ))}
                                </span>
                                <span className="text-[9px] text-stone-400">ออเดอร์ {rev.orderNumber}</span>
                              </div>
                              <p className="text-natural-espresso/85 italic font-medium">"{rev.comment}"</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-stone-50 border border-dashed rounded-xl text-center text-[10px] text-natural-espresso/40">
                          ยังไม่มีข้อมูลบันทึกรีวิวความพึงพอใจสำหรับลูกค้ารายนี้ค่ะ
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FULL DETAILED ORDER HISTORY */}
                <div className="space-y-3.5">
                  <span className="block text-[10px] font-extrabold text-natural-espresso/60 uppercase tracking-wider">
                    📋 รายการออเดอร์ตัดเย็บทั้งหมดของคุณ {selectedCustomer.name.replace('คุณ', '').trim()} ({selectedCustomer.orders.length} ออเดอร์)
                  </span>

                  <div className="space-y-2.5">
                    {selectedCustomer.orders.map((order) => (
                      <div 
                        key={order.id} 
                        className="bg-white rounded-xl border border-natural-wheat/60 p-4 hover:border-natural-clay/30 transition-all space-y-3 shadow-3xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="flex items-center space-x-2.5">
                            <span className="font-mono font-black text-xs text-natural-espresso bg-stone-100 px-2 py-1 rounded-lg border border-stone-200">
                              {order.orderNumber}
                            </span>
                            <span className="text-xs font-serif font-extrabold text-natural-espresso">
                              {order.dressType} — {order.fabricColor} ({order.fabricType})
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Category Badge */}
                            <span className="text-[10px] bg-stone-100 text-natural-espresso px-2 py-0.5 rounded-md font-bold">
                              ประเภทงาน: {order.customerCategory || 'ทั่วไป'}
                            </span>

                            {/* Status Pill */}
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                              order.status === OrderStatus.COMPLETED 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : order.status === OrderStatus.READY 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {order.status === OrderStatus.COMPLETED 
                                ? 'ส่งมอบแล้ว ✓' 
                                : order.status === OrderStatus.READY 
                                ? 'พร้อมรับชุด ✓'
                                : 'กำลังเย็บ 🧵'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Order Sub-details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] border-t border-dashed border-stone-100 pt-2 text-natural-espresso/70">
                          <div><span className="font-bold">วันที่จองออเดอร์:</span> {order.orderDate}</div>
                          <div><span className="font-bold">กำหนดวันส่งมอบชุด:</span> {order.deliveryDate}</div>
                          <div><span className="font-bold">ราคาชุดตัด:</span> <span className="font-black text-natural-clay">{order.price.toLocaleString()} ฿</span></div>
                          <div>
                            <span className="font-bold">มัดจำไว้:</span> {order.deposit.toLocaleString()} ฿ 
                            {order.finalPaymentAmount ? <span className="text-emerald-700 font-bold ml-1">(ชำระส่วนต่าง: {order.finalPaymentAmount.toLocaleString()} ฿)</span> : null}
                            <span className="ml-1 text-natural-clay font-bold">
                              (ค้างจ่าย: {Math.max(0, order.price - order.deposit - (order.discount || 0) - (order.finalPaymentAmount || 0)).toLocaleString()} ฿)
                            </span>
                          </div>
                        </div>

                        {order.notes && (
                          <div className="text-[10px] bg-amber-50/20 text-natural-espresso/80 p-2 rounded-lg border border-amber-200/20 leading-relaxed italic">
                            <b>📌 ดีไซน์/ความต้องการ:</b> {order.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="bg-white p-4 border-t border-natural-wheat flex justify-end gap-2 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-5 py-2 bg-natural-espresso hover:bg-natural-clay text-natural-cream hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      ) : (
        <ReviewDashboard 
          reviews={reviews}
          orders={orders}
          onAddReview={onAddReview}
          onUpdateReview={onUpdateReview}
          onDeleteReview={onDeleteReview}
        />
      )}

    </div>
  );
}
