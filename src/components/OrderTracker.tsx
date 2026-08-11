/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, STATUS_MAP, StatusConfig, CatalogueItem } from '../types';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Instagram, 
  Calendar, 
  DollarSign, 
  Tag, 
  Ruler, 
  Scissors, 
  Compass, 
  Trash2,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  History,
  Printer,
  Camera,
  Pencil,
  Globe,
  Send,
  ExternalLink,
  Link as LinkIcon,
  Image as ImageIcon,
  PenTool,
  ShieldCheck,
  Lock,
  Bell,
  AlertTriangle,
  Star
} from 'lucide-react';
import PrintOrderModal from './PrintOrderModal';
import EditOrderModal from './EditOrderModal';
import FeedbackSection from './FeedbackSection';
import SignatureModal from './SignatureModal';

interface OrderTrackerProps {
  orders: Order[];
  catalogue?: CatalogueItem[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onEditOrder?: (updatedOrder: Order) => void;
  onConfirmPickupSignature?: (orderId: string, signatureDataUrl: string, signeeName: string, signedAt: string) => void;
}

export default function OrderTracker({ orders, catalogue = [], onUpdateOrderStatus, onDeleteOrder, onEditOrder, onConfirmPickupSignature }: OrderTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL_ACTIVE'); // ALL, ALL_ACTIVE, or specific status
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [signatureModalOrder, setSignatureModalOrder] = useState<Order | null>(null);

  const [publicUrl, setPublicUrl] = useState(() => {
    return localStorage.getItem('nunuh_public_url') || window.location.origin;
  });
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const [lineOaId, setLineOaId] = useState(() => {
    return localStorage.getItem('nunuh_line_oa_id') || '@237aynfq';
  });

  const [lineOaChatUrl, setLineOaChatUrl] = useState(() => {
    return localStorage.getItem('nunuh_line_oa_chat_url') || 'https://chat.line.biz/';
  });

  const [ownerLineUserId, setOwnerLineUserId] = useState(() => {
    return localStorage.getItem('nunuh_owner_line_user_id') || '';
  });
  const [isSendingOverdueAlert, setIsSendingOverdueAlert] = useState(false);
  const [overdueAlertResult, setOverdueAlertResult] = useState<{ status: 'idle' | 'success' | 'error'; msg: string } | null>(null);

  const handleSendOverdueLineAlert = async () => {
    setIsSendingOverdueAlert(true);
    setOverdueAlertResult(null);

    try {
      const res = await fetch('/api/send-overdue-line-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLineUserId: ownerLineUserId.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.simulated) {
          setOverdueAlertResult({
            status: 'success',
            msg: `🎉 แจ้งเตือนสำเร็จ! (โหมดจำลอง) พบออเดอร์เกินกำหนด ${data.overdueCount} รายการ\nข้อความสั้นที่สร้างขึ้นส่งเข้า LINE:\n${data.messageText}`
          });
        } else {
          setOverdueAlertResult({
            status: 'success',
            msg: `🎉 ส่งการแจ้งเตือนออเดอร์เกินกำหนด ${data.overdueCount} รายการ เข้า LINE เจ้าของร้านเรียบร้อยแล้วค่ะ!`
          });
        }
      } else {
        setOverdueAlertResult({
          status: 'error',
          msg: data.error || 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบการตั้งค่า LINE User ID เจ้าของร้าน'
        });
      }
    } catch (err: any) {
      setOverdueAlertResult({
        status: 'error',
        msg: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + (err.message || err)
      });
    } finally {
      setIsSendingOverdueAlert(false);
    }
  };

  const [lineConfig, setLineConfig] = useState<{ tokenSet: boolean; secretSet: boolean } | null>(null);
  const [testLineUserId, setTestLineUserId] = useState('');
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'sending' | 'success' | 'error'; errorMsg: string }>({
    status: 'idle',
    errorMsg: ''
  });

  useEffect(() => {
    fetch('/api/line-config-status')
      .then(res => res.json())
      .then(data => setLineConfig(data))
      .catch(err => console.error('Error fetching LINE config status:', err));
  }, [showUrlSettings]);

  const handleSavePublicUrl = (url: string) => {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    setPublicUrl(cleanUrl);
    localStorage.setItem('nunuh_public_url', cleanUrl);
  };

  const handleSaveLineOaId = (id: string) => {
    const clean = id.trim();
    setLineOaId(clean);
    localStorage.setItem('nunuh_line_oa_id', clean);
  };

  const handleSaveLineOaChatUrl = (url: string) => {
    const clean = url.trim();
    setLineOaChatUrl(clean);
    localStorage.setItem('nunuh_line_oa_chat_url', clean);
  };

  const handleAdminAddFeedback = (orderId: string, content: string, sender: 'customer' | 'tailor') => {
    if (!onEditOrder) return;
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender,
        content,
        timestamp: new Date().toISOString()
      };
      const updatedOrder = {
        ...orderToUpdate,
        feedbacks: [...(orderToUpdate.feedbacks || []), newMsg]
      };
      onEditOrder(updatedOrder);
    }
  };

  const handleAdminDeleteFeedback = (orderId: string, messageId: string) => {
    if (!onEditOrder) return;
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      const updatedOrder = {
        ...orderToUpdate,
        feedbacks: (orderToUpdate.feedbacks || []).filter(msg => msg.id !== messageId)
      };
      onEditOrder(updatedOrder);
    }
  };

  const getCustomerOtherOrders = (currentOrder: Order) => {
    const cleanPhone = currentOrder.customerPhone.replace(/[\s-()]/g, '');
    if (!cleanPhone) return [];
    return orders.filter(o => o.id !== currentOrder.id && o.customerPhone.replace(/[\s-()]/g, '') === cleanPhone);
  };

  const getSocialInfo = (socialStr?: string) => {
    if (!socialStr) return null;
    const lower = socialStr.toLowerCase();
    
    if (lower.includes('ig:') || lower.includes('instagram') || lower.includes('@') || lower.includes('ig ')) {
      return {
        type: 'instagram',
        label: socialStr,
        cleanId: socialStr.replace(/^(ig\s*[:：-]\s*|instagram\s*[:：-]\s*|@)/i, '').trim(),
        icon: <Instagram className="h-3.5 w-3.5 text-pink-600 shrink-0" />
      };
    }
    
    if (lower.includes('fb:') || lower.includes('facebook') || lower.includes('เฟส') || lower.includes('fb ')) {
      return {
        type: 'facebook',
        label: socialStr,
        cleanId: socialStr.replace(/^(fb\s*[:：-]\s*|facebook\s*[:：-]\s*|เฟสบุ๊ค\s*[:：-]\s*|เฟส\s*[:：-]\s*)/i, '').trim(),
        icon: <MessageSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      };
    }
    
    // Default to LINE
    const cleanId = socialStr.replace(/^(line\s*id|line|ไลน์\s*ไอดี|ไลน์|id)\s*[:：-]\s*/i, '').replace(/^@/, '').trim();
    return {
      type: 'line',
      label: socialStr,
      cleanId,
      icon: <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
    };
  };

  const getLineDetails = (order: Order) => {
    const rawUserId = order.lineUserId?.trim() || '';
    const socialInfo = getSocialInfo(order.customerSocial);
    
    // Check if rawUserId is a URL or contains a real LINE User ID (starts with U and followed by 32 alphanumeric chars)
    let extractedUserId = '';
    const matches = rawUserId.match(/U[0-9a-zA-Z]{32}/g);
    if (matches && matches.length > 0) {
      // The customer's User ID is always the last U[0-9a-zA-Z]{32} in the URL or string
      extractedUserId = matches[matches.length - 1];
    }
    
    const isRealUserId = !!extractedUserId && /^U[0-9a-zA-Z]{32}$/.test(extractedUserId);
    
    let hasLineUserId = false;
    let lineUserId = '';
    
    let hasPersonalLineId = false;
    let personalLineId = '';
    
    if (isRealUserId) {
      hasLineUserId = true;
      lineUserId = extractedUserId;
    } else if (rawUserId && rawUserId.length > 0) {
      // If the field is filled but is not a real LINE User ID, it is a personal LINE ID!
      hasPersonalLineId = true;
      personalLineId = rawUserId.replace(/^@/, '');
    }
    
    if (socialInfo && socialInfo.type === 'line' && socialInfo.cleanId) {
      let socialExtracted = '';
      const socialMatches = socialInfo.cleanId.match(/U[0-9a-zA-Z]{32}/g);
      if (socialMatches && socialMatches.length > 0) {
        socialExtracted = socialMatches[socialMatches.length - 1];
      }
      
      const isSocialRealUserId = !!socialExtracted && /^U[0-9a-zA-Z]{32}$/.test(socialExtracted);
      if (isSocialRealUserId) {
        if (!hasLineUserId) {
          hasLineUserId = true;
          lineUserId = socialExtracted;
          hasPersonalLineId = false; // cleanId is actually a LINE User ID, not a personal ID
        }
      } else if (!hasLineUserId && !hasPersonalLineId) {
        hasPersonalLineId = true;
        personalLineId = socialInfo.cleanId;
      }
    }
    
    return {
      hasLineUserId,
      lineUserId,
      hasPersonalLineId,
      personalLineId
    };
  };

  const parseLineError = (errMsgStr: string) => {
    try {
      const errorObj = typeof errMsgStr === 'string' ? JSON.parse(errMsgStr) : errMsgStr;
      const message = errorObj.message || '';
      const details = errorObj.details || [];
      const detailsStr = details.map((d: any) => `${d.property || ''}: ${d.message || ''}`).join(', ');

      if (message.includes('Failed to send messages')) {
        return '❌ LINE ปฏิเสธการส่งข้อความ: "ผู้ใช้งานรายนี้อาจจะยังไม่ได้แอดไลน์ร้านค้าเป็นเพื่อน หรือผู้ใช้งานได้บล็อกไลน์ร้านค้าไว้" (Failed to send messages)';
      }
      if (message.includes("The property 'to' is invalid") || detailsStr.includes('Invalid user ID') || message.includes('Invalid user ID')) {
        return '❌ รหัสผู้ใช้ผิดรูปแบบ หรือผู้ใช้นี้อยู่คนละผู้ให้บริการ (Invalid User ID): "โปรดตรวจสอบว่ารหัส LINE User ID ขึ้นต้นด้วยตัว U และตามด้วยตัวอักษร 32 ตัว เช่น Uf150dba359d90..."';
      }
      if (message.includes('Authentication failed') || message.includes('Invalid client credential') || message.includes('invalid client_id or client_secret')) {
        return '❌ ไม่สามารถยืนยันตัวตนกับ LINE: "รหัส Channel Access Token ของทางร้านไม่ถูกต้อง หรือหมดอายุแล้ว" (Authentication Failed)';
      }
      if (message.includes('Access to this API is not authorized')) {
        return '❌ สิทธิ์ใช้งาน API ถูกปฏิเสธ: "ช่องทางไลน์ (Channel) ของท่านยังไม่ได้เปิดใช้งานสิทธิ์ Messaging API หรือฟังก์ชัน Push Message" (403 Forbidden)';
      }
      return `❌ ข้อผิดพลาดจาก LINE API: "${message}" ${detailsStr ? `(${detailsStr})` : ''}`;
    } catch (e) {
      if (errMsgStr.includes('Failed to send messages')) {
        return '❌ LINE ปฏิเสธการส่งข้อความ: "ผู้ใช้งานรายนี้อาจจะยังไม่ได้แอดไลน์ร้านค้าเป็นเพื่อน หรือผู้ใช้งานได้บล็อกไลน์ร้านค้าไว้" (Failed to send messages)';
      }
      if (errMsgStr.includes('to is invalid') || errMsgStr.includes('Invalid user ID')) {
        return '❌ รหัสผู้ใช้ผิดรูปแบบ หรือผู้ใช้นี้อยู่คนละผู้ให้บริการ (Invalid User ID): "โปรดตรวจสอบว่ารหัส LINE User ID ขึ้นต้นด้วยตัว U และตามด้วยตัวอักษร 32 ตัว เช่น Uf150dba359d90..."';
      }
      if (errMsgStr.includes('Authentication failed') || errMsgStr.includes('Invalid client credential')) {
        return '❌ ไม่สามารถยืนยันตัวตนกับ LINE: "รหัส Channel Access Token ของทางร้านไม่ถูกต้อง หรือหมดอายุแล้ว" (Authentication Failed)';
      }
      return `❌ ข้อผิดพลาดจากระบบ: "${errMsgStr}"`;
    }
  };

  const handleTestSendLineMessage = async () => {
    if (!testLineUserId.trim()) {
      setTestStatus({ status: 'error', errorMsg: 'กรุณากรอก LINE User ID ที่ต้องการทดสอบก่อนค่ะ (รหัสขึ้นต้นด้วย U...)' });
      return;
    }
    
    const matches = testLineUserId.match(/U[0-9a-zA-Z]{32}/g);
    let extractedId = '';
    if (matches && matches.length > 0) {
      extractedId = matches[matches.length - 1];
    } else {
      setTestStatus({ status: 'error', errorMsg: 'รหัส LINE User ID ไม่ถูกต้อง จะต้องขึ้นต้นด้วย U และตามด้วยตัวอักษร/ตัวเลข 32 ตัวค่ะ' });
      return;
    }

    setTestStatus({ status: 'sending', errorMsg: '' });
    try {
      const testMsg = `🌸 [ข้อความทดสอบจากระบบ NUNUH Boutique] 🌸\n\nสวัสดีค่ะ! นี่คือข้อความส่งทดสอบความถูกต้องของระบบเชื่อมต่อ LINE Messaging API อัตโนมัติค่ะ หากคุณได้รับข้อความนี้ แสดงว่าการเชื่อมต่อระบบเสร็จสมบูรณ์ 100% แล้วค่ะ! 🎉`;
      const response = await fetch('/api/send-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: extractedId,
          message: testMsg
        })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.simulated) {
          setTestStatus({ 
            status: 'error', 
            errorMsg: '⚠️ ระบบทำงานในโหมดจำลองเนื่องจากยังไม่ได้ตั้งค่า Channel Access Token ใน Environment Variables ค่ะ' 
          });
        } else {
          setTestStatus({ status: 'success', errorMsg: '' });
        }
      } else {
        const rawErr = data.error || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
        setTestStatus({ status: 'error', errorMsg: parseLineError(rawErr) });
      }
    } catch (err: any) {
      setTestStatus({ status: 'error', errorMsg: `เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ${err.message || err}` });
    }
  };

  const getDirectOaUrl = (order: Order, lineUserId: string) => {
    const rawUserId = order.lineUserId?.trim() || '';
    if (rawUserId.startsWith('http://') || rawUserId.startsWith('https://')) {
      return rawUserId;
    }
    const shopMatches = lineOaChatUrl.match(/U[0-9a-zA-Z]{32}/g);
    if (shopMatches && shopMatches.length > 0) {
      const shopId = shopMatches[0];
      return `https://chat.line.biz/${shopId}/chat/${lineUserId}`;
    }
    const cleanId = lineOaId.startsWith('@') ? lineOaId : `@${lineOaId}`;
    return `https://manager.line.biz/account/${cleanId}/chat/user/${lineUserId}`;
  };

  const handleDirectLineChat = (order: Order) => {
    const currentStatusCfg = STATUS_MAP[order.status];
    const formattedDelivery = new Date(order.deliveryDate).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const portalUrl = `${publicUrl}?tab=customer&search=${encodeURIComponent(order.customerPhone)}&mode=customer`;
    const message = `⚜️ อัปเดตสถานะชุดสั่งตัด NUNUH Boutique ⚜️\n\nเรียนคุณ: ${order.customerName}\nรหัสออเดอร์: ${order.orderNumber}\nประเภทชุด: ${order.dressType}\n\n📍 สถานะปัจจุบัน: [${currentStatusCfg.label}]\n➡️ "${currentStatusCfg.description}"\n\n📅 กำหนดส่งมอบ: ${formattedDelivery}\n\nท่านสามารถตรวจสอบข้อมูลสัดส่วนและติดตามความคืบหน้าแบบละเอียดด้วยตนเองได้ที่นี่:\n🔗 ${portalUrl}\n\nขอขอบพระคุณที่เลือกใช้บริการค่ะ ✨`;

    // 1. คัดลอกข้อความลง Clipboard อัตโนมัติ เพื่อให้แอดมินนำไปวางกดส่งได้ทันที
    try {
      navigator.clipboard.writeText(message);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }

    const { hasLineUserId, lineUserId } = getLineDetails(order);

    if (hasLineUserId) {
      // ถ้ามี LINE User ID ของระบบ LINE OA ให้เปิดห้องแชทลูกค้ารายนั้นโดยตรงบน LINE OA Manager ทันที
      const directOaUrl = getDirectOaUrl(order, lineUserId);
      
      alert(
        `📋 คัดลอกข้อความและสถานะอัปเดตของ คุณ ${order.customerName} เรียบร้อยแล้วค่ะ!\n\n` +
        `ระบบจะนำคุณไปยังห้องแชทของลูกค้ารายนี้โดยตรงในระบบ LINE OA Manager ทราบแล้วกดตกลงเพื่อเปิดแชทและนำข้อความไปวาง (Paste) ส่งคุยได้เลยค่ะ 💬`
      );
      window.open(directOaUrl, '_blank');
    } else {
      // ถ้าไม่มี LINE User ID หรือเป็นกรณีอื่นๆ ให้เปิดแผงควบคุมหลัก LINE OA แล้วแนะนำให้แอดมินค้นหาชื่อ
      const cleanId = lineOaId.startsWith('@') ? lineOaId : `@${lineOaId}`;
      const generalOaUrl = lineOaChatUrl || `https://manager.line.biz/account/${cleanId}/chat/`;
      
      alert(
        `📋 คัดลอกข้อความและสถานะอัปเดตของ คุณ ${order.customerName} เรียบร้อยแล้วค่ะ!\n\n` +
        `เนื่องจากออเดอร์นี้ยังไม่ได้รับเชื่อมโยงข้อมูล LINE User ID ล่าสุดของลูกค้า (รหัสขึ้นต้นด้วย U...) ทำให้ระบบไม่สามารถนำทางไปยังหน้าห้องแชทของลูกค้ารายนี้โดยตรงได้\n\n` +
        `💡 วิธีเชื่อมลิงก์ไปห้องแชทของลูกค้าโดยตรงทันทีในครั้งหน้า:\n` +
        `1. ค้นหาชื่อแชท คุณ "${order.customerName}" ในหน้าแผงควบคุมหลัก LINE OA ของร้านคุณที่กำลังจะเปิดขึ้นนี้\n` +
        `2. สังเกตแถบลิงก์ (URL Address) ของเบราว์เซอร์ขณะคุยกับลูกค้าคนนี้ จะมีรหัสผู้ใช้แสดงอยู่หลังคำว่า /user/ (เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)\n` +
        `3. คัดลอกรหัสนั้นมาใส่ในช่อง "LINE User ID" ในหน้าแก้ไขออเดอร์นี้ได้เลยค่ะ! (หรือรอให้ลูกค้าทักเข้ามาสอบถามสถานะด้วยเบอร์โทร/เลขที่ออเดอร์ผ่านแชทก่อน ระบบบอทจะบันทึกให้อัตโนมัติค่ะ)\n\n` +
        `กรุณากดตกลงเพื่อเปิดแผงแชทของร้านคุณ และกดค้นหาชื่อลูกค้าเพื่อนำข้อความที่คัดลอกไว้ไปวางส่งต่อได้ทันทีค่ะ 💬`
      );
      window.open(generalOaUrl, '_blank');
    }
  };

  const handleOpenLineOaChat = (order: Order) => {
    const { hasLineUserId, lineUserId } = getLineDetails(order);

    if (hasLineUserId) {
      const url = getDirectOaUrl(order, lineUserId);
      window.open(url, '_blank');
    } else {
      const cleanId = lineOaId.startsWith('@') ? lineOaId : `@${lineOaId}`;
      const generalOaUrl = lineOaChatUrl || `https://manager.line.biz/account/${cleanId}/chat/`;
      window.open(generalOaUrl, '_blank');
    }
  };

  const handleSendStatusDirectly = async (order: Order) => {
    const currentStatusCfg = STATUS_MAP[order.status];
    const discountVal = order.discount || 0;
    const formattedDelivery = new Date(order.deliveryDate).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const portalUrl = `${publicUrl}?tab=customer&search=${encodeURIComponent(order.customerPhone)}&mode=customer`;
    const message = `⚜️ อัปเดตสถานะชุดสั่งตัด NUNUH Boutique ⚜️\n\nเรียนคุณ: ${order.customerName}\nรหัสออเดอร์: ${order.orderNumber}\nประเภทชุด: ${order.dressType}\n\n📍 สถานะปัจจุบัน: [${currentStatusCfg.label}]\n➡️ "${currentStatusCfg.description}"\n\n📅 กำหนดส่งมอบ: ${formattedDelivery}\n\nท่านสามารถตรวจสอบข้อมูลสัดส่วนและติดตามความคืบหน้าแบบละเอียดด้วยตนเองได้ที่นี่:\n🔗 ${portalUrl}\n\nขอขอบพระคุณที่เลือกใช้บริการค่ะ ✨`;

    // คัดลอกลงคลิปบอร์ดก่อนเสมอ เพื่อกันข้อผิดพลาดและอำนวยความสะดวก
    try {
      navigator.clipboard.writeText(message);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }

    const { hasLineUserId, lineUserId } = getLineDetails(order);

    if (hasLineUserId) {
      // 1. กรณีเป็น LINE User ID จริง: พยายามส่งอัตโนมัติผ่าน API บอทก่อน
      try {
        const response = await fetch('/api/send-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: lineUserId,
            message
          })
        });

        const directOaUrl = getDirectOaUrl(order, lineUserId);

        if (response.ok) {
          const resData = await response.json();
          if (resData.simulated) {
            alert(
              `📲 [โหมดจำลอง] คัดลอกข้อความสถานะแล้ว!\n` +
              `เนื่องจากยังไม่ได้เปิดระบบเชื่อมต่อบอท API สมบูรณ์ ระบบได้คัดลอกข้อความแจ้งสถานะเรียบร้อยแล้วค่ะ\n` +
              `เมื่อกดตกลง ระบบจะเปิดหน้าห้องแชทของลูกค้ารายนี้ในระบบ LINE OA Manager ให้คุณกดวาง (Paste) ส่งข้อความได้ทันทีเลยค่ะ 💬`
            );
            window.open(directOaUrl, '_blank');
          } else {
            alert(`✅ ส่งข้อความแจ้งสถานะอัตโนมัติไปยัง LINE ของคุณ ${order.customerName} เรียบร้อยแล้วค่ะ!`);
          }
        } else {
          // หาก API เกิดความผิดพลาด ให้คัดลอกและเปิดหน้าแชทของลูกค้ารายนั้นโดยตรงเพื่อให้แอดมินกดวางส่งเอง
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error || "ไม่ได้เปิดระบบเชื่อมต่อบอท API";
          const userFriendlyError = parseLineError(errMsg);
          alert(
            `📋 ระบบได้คัดลอกข้อความสถานะลงคลิปบอร์ดให้แล้วค่ะ!\n\n` +
            `⚠️ ระบบการส่งแชทอัตโนมัติแจ้งว่า:\n` +
            `${userFriendlyError}\n\n` +
            `ระบบจะนำท่านไปยังห้องแชทของ คุณ ${order.customerName} บนระบบ LINE OA Manager ทันที เพื่อให้คุณกดวาง (Paste/Ctrl+V) และส่งข้อความคุยต่อได้โดยไม่ต้องเสียเวลาคีย์ใหม่ค่ะ 💬`
          );
          window.open(directOaUrl, '_blank');
        }
      } catch (err: any) {
        // หากมี error ใดๆ เช่น เชื่อมต่อไม่ได้ ให้พาไปหน้าแชทตรงพร้อมสถานะที่ก๊อปปี้แล้ว
        const directOaUrl = getDirectOaUrl(order, lineUserId);
        alert(
          `📋 คัดลอกข้อความสถานะแล้ว!\n` +
          `(ระบบการแจ้งเตือนอัตโนมัติติดขัดชั่วคราว: ${err.message || err})\n` +
          `กดตกลงเพื่อเปิดหน้าห้องแชทลูกค้าใน LINE OA Manager แล้วกดวางข้อความส่งคุยต่อได้ทันทีเลยค่ะ 💬`
        );
        window.open(directOaUrl, '_blank');
      }
    } else {
      // 2. กรณีไม่มี LINE User ID: คัดลอกข้อความและเปิดหน้าแชทหลัก LINE OA เพื่อให้แอดมินใช้ช่องค้นหาชื่อหาแชทและกดวางส่ง
      const cleanId = lineOaId.startsWith('@') ? lineOaId : `@${lineOaId}`;
      const generalOaUrl = lineOaChatUrl || `https://manager.line.biz/account/${cleanId}/chat/`;

      alert(
        `📋 คัดลอกข้อความสถานะอัปเดตของ คุณ ${order.customerName} เรียบร้อยแล้วค่ะ!\n\n` +
        `เนื่องจากออเดอร์นี้ยังไม่ได้เชื่อมต่อข้อมูล LINE User ID ในฐานข้อมูล (รหัสขึ้นต้นด้วย U...)\n` +
        `ระบบจึงคัดลอกข้อความสถานะเก็บลงคลิปบอร์ดไว้ให้แล้ว และนำท่านไปยังหน้าแชทหลักของ LINE OA เพื่อความสะดวกในการทำงานค่ะ\n\n` +
        `💡 แนะนำวิธีเปิดลิงก์ห้องแชทของลูกค้าโดยตรงทันทีในครั้งหน้า:\n` +
        `1. ค้นหาชื่อ คุณ "${order.customerName}" ในแผงแชทของทางร้านเพื่อเปิดห้องแชทบนเบราว์เซอร์\n` +
        `2. สังเกตแถบลิงก์ (URL Address) ด้านบน จะมีรหัสผู้ใช้ขึ้นต้นด้วย U ปรากฏอยู่ เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n` +
        `3. นำรหัสดังกล่าวมาป้อนใส่ในช่อง "LINE User ID" ในหน้าแก้ไขออเดอร์นี้ค่ะ และกดบันทึกเพื่อใช้ลิงก์ตรงและระบบแจ้งเตือนแชทได้ทันทีค่ะ!\n\n` +
        `กรุณากดตกลงเพื่อเปิดแผงแชท และวาง (Paste) ส่งข้อความแจ้งสถานะได้ทันทีค่ะ 💬`
      );
      window.open(generalOaUrl, '_blank');
    }
  };

  // การกรองข้อมูล
  const filteredOrders = orders.filter((order) => {
    // กรองด้วยคำค้นหา (ชื่อ เบอร์ หรือเลขที่ออเดอร์ หรือ SKU)
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.dressType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.sku && order.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.idhNumber && order.idhNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    // กรองด้วยสาขา
    const matchesBranch = branchFilter === 'ALL' || order.branch === branchFilter;

    // กรองด้วยสถานะ
    let matchesStatus = true;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (statusFilter === 'ALL_ACTIVE') {
      matchesStatus = order.status !== OrderStatus.COMPLETED;
    } else {
      matchesStatus = order.status === statusFilter;
    }

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getUnpaidBalance = (order: Order) => {
    return Math.max(0, order.price - order.deposit - (order.discount || 0) - (order.finalPaymentAmount || 0));
  };

  const statusList = Object.values(OrderStatus);

  const generateTSV = () => {
    const headers = [
      'หมายเลขออเดอร์',
      'สาขา',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'ช่องทางติดต่อ',
      'ประเภทงาน',
      'ประเภทบัตรสมาชิก',
      'รหัสออเดอร์จากกัน',
      'ประเภทชุด',
      'เนื้อผ้า',
      'เฉดสี',
      'สถานะ',
      'วันที่สั่งซื้อ',
      'กำหนดส่ง',
      'ราคา',
      'ส่วนลด',
      'มัดจำ',
      'ช่องทางการรับเงิน',
      'ยอดคงเหลือ',
      'อก',
      'เอว',
      'สะโพก',
      'ไหล่กว้าง',
      'ความยาวแขน',
      'รอบวงแขน',
      'ความยาวชุด',
      'ส่วนสูง',
      'น้ำหนัก',
      'บ่าหน้า',
      'บ่าหลัง',
      'ยาวหน้า',
      'ยาวหลัง',
      'ข้อมือ',
      'บันทึกเพิ่มเติม'
    ];

    const rows = orders.map(o => [
      o.orderNumber,
      o.branch || 'สาขานราธิวาส',
      o.customerName,
      o.customerPhone,
      o.customerSocial || '-',
      o.customerCategory || '-',
      o.membershipTier || '-',
      o.externalOrderId || '-',
      o.dressType,
      o.fabricType,
      o.fabricColor || '-',
      STATUS_MAP[o.status]?.label || o.status,
      o.orderDate,
      o.deliveryDate,
      o.price,
      o.discount || 0,
      o.deposit,
      o.finalPaymentAmount || 0,
      o.finalPaymentDate || '-',
      o.paymentMethod || 'เงินโอน',
      Math.max(0, o.price - o.deposit - (o.discount || 0) - (o.finalPaymentAmount || 0)),
      o.measurements.chest,
      o.measurements.waist,
      o.measurements.hips,
      o.measurements.shoulder,
      o.measurements.sleeveLength,
      o.measurements.armhole,
      o.measurements.length,
      o.measurements.height || '-',
      o.measurements.weight || '-',
      o.measurements.frontChest || '-',
      o.measurements.backChest || '-',
      o.measurements.frontLength || '-',
      o.measurements.backLength || '-',
      o.measurements.wrist || '-',
      o.measurements.otherNotes || '-'
    ]);

    return [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
  };

  const downloadCSV = () => {
    const headers = [
      'Order Number', 'Customer Name', 'Phone', 'Social Contact', 'Job Type', 'Membership Card Type', 'External Order ID', 'Dress Type', 
      'Fabric Type', 'Fabric Color', 'Status', 'Order Date', 'Delivery Date', 
      'Price', 'Discount', 'Deposit', 'Payment Method', 'Unpaid Balance', 'Chest', 'Waist', 'Hips', 
      'Shoulder', 'Sleeve Length', 'Armhole', 'Dress Length', 'Height', 'Weight', 'Front Chest', 'Back Chest', 'Front Length', 'Back Length', 'Wrist', 'Other Notes'
    ];

    const rows = orders.map(o => [
      `"${o.orderNumber}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone}"`,
      `"${(o.customerSocial || '-').replace(/"/g, '""')}"`,
      `"${o.customerCategory || '-'}"`,
      `"${o.membershipTier || '-'}"`,
      `"${o.externalOrderId || '-'}"`,
      `"${o.dressType.replace(/"/g, '""')}"`,
      `"${o.fabricType.replace(/"/g, '""')}"`,
      `"${(o.fabricColor || '-').replace(/"/g, '""')}"`,
      `"${STATUS_MAP[o.status]?.label || o.status}"`,
      `"${o.orderDate}"`,
      `"${o.deliveryDate}"`,
      o.price,
      o.discount || 0,
      o.deposit,
      `"${o.paymentMethod || 'เงินโอน'}"`,
      Math.max(0, o.price - o.deposit - (o.discount || 0)),
      `"${o.measurements.chest}"`,
      `"${o.measurements.waist}"`,
      `"${o.measurements.hips}"`,
      `"${o.measurements.shoulder}"`,
      `"${o.measurements.sleeveLength}"`,
      `"${o.measurements.armhole}"`,
      `"${o.measurements.length}"`,
      o.measurements.height || 0,
      o.measurements.weight || 0,
      `"${o.measurements.frontChest || '-'}"`,
      `"${o.measurements.backChest || '-'}"`,
      `"${o.measurements.frontLength || '-'}"`,
      `"${o.measurements.backLength || '-'}"`,
      `"${o.measurements.wrist || '-'}"`,
      `"${(o.measurements.otherNotes || '-').replace(/"/g, '""')}"`
    ]);

    const content = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NUNUH_Orders_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStartBanner = new Date();
  todayStartBanner.setHours(0, 0, 0, 0);

  const overdueOrdersList = orders.filter((o) => {
    if (!o.deliveryDate || o.status === OrderStatus.COMPLETED) return false;
    const delDate = new Date(o.deliveryDate);
    delDate.setHours(0, 0, 0, 0);
    return delDate.getTime() < todayStartBanner.getTime();
  });

  return (
    <div className="space-y-6">

      {/* 🚨 Overdue Orders Alert Banner for LINE Owner Notification */}
      {overdueOrdersList.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-300 p-4 rounded-2xl space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 shadow-xs">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <span>🚨 มีออเดอร์เกินกำหนดส่งมอบทั้งหมด {overdueOrdersList.length} รายการ!</span>
                </h4>
                <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                  คุณสามารถกดส่งการแจ้งเตือนรายชื่อออเดอร์ที่เกินกำหนดทั้งหมดเข้า LINE ของเจ้าของร้านได้ทันทีค่ะ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendOverdueLineAlert}
              disabled={isSendingOverdueAlert}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSendingOverdueAlert ? 'กำลังส่งแจ้งเตือน...' : '📲 แจ้งเตือนเข้า LINE เจ้าของร้าน'}</span>
            </button>
          </div>

          {/* Owner LINE ID Input prompt if missing */}
          {!ownerLineUserId && (
            <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <span className="text-rose-900 font-bold shrink-0">📍 ระบุ LINE User ID เจ้าของร้าน/แอป:</span>
              <input
                type="text"
                value={ownerLineUserId}
                onChange={(e) => {
                  const val = e.target.value;
                  setOwnerLineUserId(val);
                  localStorage.setItem('nunuh_owner_line_user_id', val);
                  fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerLineUserId: val })
                  }).catch(() => {});
                }}
                placeholder="วางรหัส LINE User ID (เช่น U1234567890abcdef...)"
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-rose-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-950 font-bold"
              />
            </div>
          )}

          {overdueAlertResult && (
            <div className={`p-3 rounded-xl text-xs font-medium whitespace-pre-wrap leading-relaxed ${
              overdueAlertResult.status === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}>
              {overdueAlertResult.msg}
            </div>
          )}
        </div>
      )}

      {/* Public Render URL & LINE OA Config Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 border border-amber-200/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <Globe className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-natural-espresso flex items-center gap-1.5">
              <span>🔗 ลิงก์สาธารณะ & การเชื่อมโยง LINE ร้าน</span>
            </h4>
            <p className="text-[10px] text-natural-espresso/60 font-medium">
              เว็บไซต์ลูกค้า: <strong className="text-amber-800 font-mono break-all">{publicUrl}</strong> | LINE OA: <strong className="text-emerald-800 font-mono">{lineOaId}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowUrlSettings(!showUrlSettings)}
          className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-white hover:bg-amber-100/50 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
        >
          <span>{showUrlSettings ? '✕ ปิดตั้งค่า' : '⚙️ ตั้งค่าระบบเว็บ & LINE'}</span>
        </button>
      </div>

      {showUrlSettings && (
        <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-md space-y-5 animate-fadeIn">
          
          {/* Section 1: Render.com URL */}
          <div className="space-y-2.5">
            <div className="space-y-1">
              <h5 className="text-xs font-black text-natural-espresso flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>1. ลิงก์หลักของร้านคุณ (Render App URL)</span>
              </h5>
              <p className="text-[11px] text-natural-espresso/60 leading-relaxed pl-3">
                กรอกลิงก์เว็บไซต์ของร้านคุณที่ได้มาจาก Render.com (เช่น <code className="bg-natural-sand/50 px-1 py-0.5 rounded text-[10px] font-mono">https://nunuh.onrender.com</code>) เพื่อให้ระบบสร้างลิงก์เช็คสถานะออเดอร์ให้ลูกค้าคัดลอกไปส่งในแชท LINE ได้ถูกต้องค่ะ
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pl-3">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-natural-espresso/40" />
                <input
                  type="url"
                  value={publicUrl}
                  onChange={(e) => handleSavePublicUrl(e.target.value)}
                  placeholder="เช่น https://nunuh.onrender.com"
                  className="w-full text-xs pl-8.5 pr-4 py-2.5 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 bg-natural-cream/10 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSavePublicUrl(window.location.origin);
                  alert('รีเซ็ตลิงก์หลักกลับมาใช้ URL ปัจจุบันเรียบร้อยแล้วค่ะ');
                }}
                className="px-4 py-2 bg-natural-sand hover:bg-natural-wheat text-natural-espresso font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                🔄 ใช้ลิงก์ปัจจุบัน
              </button>
            </div>
            <p className="text-[10px] text-amber-600 font-bold pl-3">
              💡 ลิงก์อัพเดตที่จะถูกแชร์: <span className="break-all font-mono text-[9px] bg-amber-50 px-1 py-0.5 rounded">{publicUrl}?tab=customer&search=เบอร์โทรศัพท์ลูกค้า&lineUserId=ไอดีไลน์ลูกค้า&mode=customer</span>
            </p>
          </div>

          <hr className="border-natural-sand/60" />

          {/* Section 2: LINE OA settings */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h5 className="text-xs font-black text-natural-espresso flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>2. ตั้งค่า LINE Official Account (LINE OA) ของร้าน</span>
              </h5>
              <p className="text-[11px] text-natural-espresso/60 leading-relaxed pl-3">
                ระบุข้อมูล ID และลิงก์แผงควบคุมแชทของร้านคุณ เพื่อช่วยให้ปุ่มเชื่อมต่อ LINE สามารถเปิดห้องแชทของลูกค้าเพื่อส่งสถานะให้แอดมินคุยกับลูกค้าได้ถูกต้องโดยไม่ผิดพลาดค่ะ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3">
              
              {/* LINE OA ID Field */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-natural-espresso/70 block">
                  🟢 LINE OA ID ของร้าน (เช่น @237aynfq)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-natural-espresso/45">ID</span>
                  <input
                    type="text"
                    value={lineOaId}
                    onChange={(e) => handleSaveLineOaId(e.target.value)}
                    placeholder="เช่น @237aynfq"
                    className="w-full text-xs pl-8 pr-4 py-2.5 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 bg-natural-cream/5 font-mono"
                  />
                </div>
                <span className="text-[9px] text-natural-espresso/45 block">
                  * ใช้สำหรับปุ่ม แชท LINE OA (ใช้เปิดหน้าแชท LINE Official Account Manager ของลูกค้ารายนั้นตาม User ID)
                </span>
              </div>

              {/* LINE OA Admin Chat URL Field */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-natural-espresso/70 block">
                  💬 ลิงก์หน้าแชทหลักของแอดมิน (LINE Chat Admin URL)
                </label>
                <input
                  type="text"
                  value={lineOaChatUrl}
                  onChange={(e) => handleSaveLineOaChatUrl(e.target.value)}
                  placeholder="เช่น https://chat.line.biz/"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 bg-natural-cream/5 font-mono"
                />
                <span className="text-[9px] text-natural-espresso/45 block leading-relaxed">
                  * โดยทั่วไปคือ <code className="bg-natural-sand px-1 rounded font-mono">https://chat.line.biz/</code> หรือลิงก์เฉพาะแชทของร้านคุณ เช่น <code className="bg-natural-sand px-1 rounded font-mono">https://chat.line.biz/Uxxxxxxxxxxxxxx/chat</code>
                </span>
              </div>

              {/* Owner LINE User ID Field */}
              <div className="space-y-1.5 md:col-span-2 bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                <label className="text-[10.5px] font-black text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>👑 LINE User ID ของเจ้าของร้าน/แอป (สำหรับรับการแจ้งเตือนออเดอร์เกินกำหนดส่ง)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ownerLineUserId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOwnerLineUserId(val);
                      localStorage.setItem('nunuh_owner_line_user_id', val);
                      fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ownerLineUserId: val })
                      }).catch(() => {});
                    }}
                    placeholder="วางรหัส User ID ของเจ้าของร้าน เช่น U1234567890abcdef..."
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-rose-950 font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleSendOverdueLineAlert}
                    disabled={isSendingOverdueAlert}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingOverdueAlert ? 'กำลังส่ง...' : 'ทดสอบส่งแจ้งเตือน 📲'}
                  </button>
                </div>
                <p className="text-[9.5px] text-rose-800/80 font-medium leading-relaxed">
                  * เมื่อตั้งค่ารหัสนี้แล้ว หากมีออเดอร์ในระบบที่เกินกำหนดวันส่งมอบ ระบบจะสามารถส่งการแจ้งเตือนสรุปรายชื่อออเดอร์เข้าห้องแชท LINE ของเจ้าของร้านได้โดยตรง
                </p>
              </div>

            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl ml-3">
              <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                💡 <strong>เคล็ดลับการคุย LINE ลูกค้าได้ทันที:</strong> <br />
                - <strong>กรณีใช้ LINE ส่วนตัว:</strong> ให้ใส่ไอดีลูกค้าไว้ใน "ช่องทางติดต่อ" (เช่น <code className="bg-emerald-100/50 px-1 rounded">line: somchai_id</code>) ระบบจะสร้างปุ่ม <strong>"เปิด LINE ลูกค้าโดยตรง"</strong> ให้เปิดคุยได้ทันที <br />
                - <strong>กรณีใช้ LINE OA:</strong> กดปุ่ม <strong>"คุย LINE (แอดมิน)"</strong> เพื่อคัดลอกข้อความแจ้งสถานะและเปิดระบบแชท LINE OA ของร้านท่าน แล้วใช้ปุ่มค้นหาด้วยชื่อลูกค้าเพื่อวางข้อความพูดคุยได้ทันทีเลยค่ะ!
              </p>
            </div>

            {/* LINE Messaging API Diagnostics */}
            <div className="border border-teal-200/60 bg-teal-50/20 p-4 rounded-xl ml-3 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-100/50 pb-2">
                <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lineConfig?.tokenSet ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${lineConfig?.tokenSet ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  </span>
                  <span>ระบบส่งสถานะ LINE อัตโนมัติ (LINE Messaging API)</span>
                </span>
                <span className="text-[9.5px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                  ระบบแชทอัตโนมัติ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-teal-100/30 flex items-center justify-between">
                  <span className="text-natural-espresso/70 font-medium">LINE Channel Access Token:</span>
                  {lineConfig === null ? (
                    <span className="text-[10px] text-natural-espresso/40">กำลังโหลด...</span>
                  ) : lineConfig.tokenSet ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      🟢 ตั้งค่าแล้ว
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      🔴 ยังไม่ได้ตั้งค่า
                    </span>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-teal-100/30 flex items-center justify-between">
                  <span className="text-natural-espresso/70 font-medium">LINE Channel Secret:</span>
                  {lineConfig === null ? (
                    <span className="text-[10px] text-natural-espresso/40">กำลังโหลด...</span>
                  ) : lineConfig.secretSet ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      🟢 ตั้งค่าแล้ว
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      🔴 ยังไม่ได้ตั้งค่า
                    </span>
                  )}
                </div>
              </div>

              {!lineConfig?.tokenSet && (
                <div className="text-[10.5px] text-natural-espresso/70 leading-relaxed bg-white/60 p-3 rounded-lg border border-natural-wheat/40 space-y-1.5">
                  <p className="font-bold text-rose-600">💡 ปุ่ม "ส่งสถานะเข้า LINE 🚀" จะทำงานแบบก๊อปปี้ข้อความอัตโนมัติ (โหมดจำลอง) จนกว่าจะทำการตั้งค่า!</p>
                  <p className="font-medium text-[10px] text-natural-espresso/60">
                    หากต้องการเปิดระบบให้สามารถกดปุ่มแล้วส่งข้อความเข้าห้องแชทของลูกค้าโดยตรงแบบ <strong>อัตโนมัติ 100%</strong> รบกวนตั้งค่าดังนี้ค่ะ:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] text-natural-espresso/60">
                    <li>เข้าสู่เว็บไซต์ <a href="https://developer.line.biz" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline font-semibold">LINE Developers Console</a> แล้วเลือก Channel ของร้านคุณ</li>
                    <li>ไปที่เมนู <strong>Messaging API</strong> แล้วเลื่อนลงไปล่างสุด กดสร้าง (Issue) <strong>Channel Access Token</strong></li>
                    <li>นำ Token ยาวๆ ที่ได้ และ Channel Secret (จากแถบ Basic Settings) ไปใส่ในช่อง <strong>Environment Variables (ตัวแปรสภาพแวดล้อม)</strong> ในหน้าตั้งค่าหลังบ้านของระบบ AI Studio</li>
                    <li>เมื่อตั้งค่าเรียบร้อยแล้ว สถานะด้านบนจะเปลี่ยนเป็นสีเขียว 🟢 และระบบจะส่งแชทอัตโนมัติทันทีเมื่อกดปุ่มค่ะ!</li>
                  </ol>
                </div>
              )}

              {/* Test Message Sending Section */}
              <div className="bg-white p-3.5 rounded-xl border border-teal-100/50 mt-2 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800">
                  <span>🧪 ทดสอบระบบส่งข้อความเข้า LINE (Test API)</span>
                </div>
                <p className="text-[10px] text-natural-espresso/60 leading-relaxed">
                  คุณสามารถนำรหัส LINE User ID ของคุณเอง (รหัส U...) หรือของลูกค้ามาวางเพื่อกดส่งทดสอบ เพื่อเช็กว่า LINE Messaging API ของคุณทำงานได้ถูกต้องหรือไม่ค่ะ
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testLineUserId}
                    onChange={(e) => setTestLineUserId(e.target.value)}
                    placeholder="วางรหัสผู้ใช้ เช่น Uf150dba359d90219f8d5ff1826f470df"
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-natural-wheat bg-natural-cream/5 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleTestSendLineMessage}
                    disabled={testStatus.status === 'sending'}
                    className={`text-xs px-4 py-2 font-bold rounded-lg text-white shrink-0 transition-colors ${
                      testStatus.status === 'sending'
                        ? 'bg-natural-espresso/40 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {testStatus.status === 'sending' ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบ 🚀'}
                  </button>
                </div>
                {testStatus.status === 'success' && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-[10.5px] rounded-lg border border-emerald-200 font-medium">
                    🎉 สำเร็จ! ข้อความทดสอบถูกส่งเข้า LINE เรียบร้อยแล้วค่ะ! ระบบการส่งข้อความอัตโนมัติทำงาน 100% แล้วค่ะ
                  </div>
                )}
                {testStatus.status === 'error' && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-rose-50 text-rose-700 text-[10.5px] rounded-lg border border-rose-200 font-medium whitespace-pre-wrap leading-relaxed">
                      {testStatus.errorMsg}
                    </div>

                    {/* Troubleshooting Guide for Failed to send messages */}
                    {testStatus.errorMsg.includes('Failed to send messages') && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-[10px] text-natural-espresso/80 space-y-2 leading-relaxed">
                        <p className="font-black text-amber-800 flex items-center gap-1">
                          <span>💡 แนะนำวิธีแก้ไขปัญหา "ส่งข้อความไม่สำเร็จ (Failed to send messages)" :</span>
                        </p>
                        <p className="font-medium">
                          หากลูกค้าเป็นเพื่อนของร้านคุณแล้วและไม่ได้บล็อก แต่ LINE API ยังตอบกลับปฏิเสธการส่งข้อความ สาเหตุที่แท้จริงเกิดจาก <span className="font-black text-rose-600">"รหัส LINE User ID ที่นำมาทดสอบนั้นเป็นของต่าง Provider กัน"</span> ค่ะ (LINE กำหนดให้รหัสลูกค้า U... เปลี่ยนแปลงไปตามบัญชีผู้พัฒนา หากใช้รหัสจากระบบอื่นหรือ URL แชทที่ไม่ได้เชื่อมต่อตรงกับ Channel ID นี้ บอทจะไม่รู้จักลูกค้ารายนี้ทันทีค่ะ)
                        </p>
                        
                        <div className="space-y-1.5 pl-1">
                          <p className="font-bold text-amber-900">🛠️ วิธีการที่แนะนำให้ลองเช็กและทดสอบดูใหม่ดังนี้ค่ะ:</p>
                          <ul className="list-disc list-inside space-y-1 text-natural-espresso/70 font-medium pl-1">
                            <li>
                              <strong className="text-teal-800">ทดสอบผ่านระบบ Webhook (แม่นยำ 100%):</strong><br/>
                              ให้แอดมินหรือตัวคุณเองเปิดโปรแกรม LINE บนมือถือของคุณ แอดไลน์ร้านค้า (LINE OA) แล้วลอง <strong className="text-rose-600">"พิมพ์ส่งเลขที่ออเดอร์ หรือพิมพ์เบอร์โทรศัพท์"</strong> เข้าไปในห้องแชทร้านค้าค่ะ 
                            </li>
                            <li>
                              ระบบจะทำการประมวลผล Webhook และจะตอบกลับรายละเอียดออเดอร์ให้โดยอัตโนมัติ พร้อมทั้ง <strong className="text-emerald-700">"จับคู่และเซฟรหัส LINE User ID จริงที่ถูกต้อง 100% ของบอทตัวนี้"</strong> เข้าไปในออเดอร์ของลูกค้ารายนั้นให้ในระบบทันทีค่ะ!
                            </li>
                            <li>
                              หลังจากนั้น ในหน้าแดชบอร์ดจัดการออเดอร์ คุณจะเห็นไอคอนและปุ่มแชทเป็นสีเขียว 🟢 และคุณจะสามารถกดส่งข้อความอัปเดตสถานะแบบอัตโนมัติได้อย่างสมบูรณ์แบบทันทีค่ะ
                            </li>
                          </ul>
                        </div>

                        <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/40 text-[9.5px] space-y-1">
                          <p className="font-bold text-natural-espresso">🔗 การเปิดใช้งาน Webhook ใน LINE Developers Console:</p>
                          <ol className="list-decimal list-inside space-y-0.5 text-natural-espresso/60 pl-1">
                            <li>เข้าสู่หน้า <a href="https://developer.line.biz" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline font-semibold">LINE Developers Console</a> ไปยัง Channel ของคุณ</li>
                            <li>เข้าแท็บ <strong>Messaging API</strong> แล้วตรวจสอบในหัวข้อ <strong>Webhook URL</strong></li>
                            <li>ใส่ลิงก์นี้เข้าไป: <code className="bg-teal-50 text-teal-800 px-1 py-0.5 rounded font-mono font-bold break-all">https://{window.location.host}/api/webhook/line</code> แล้วกด <strong>Update</strong> จากนั้นเปิดสวิตช์ <strong>Use webhook</strong> ให้เป็น <strong className="text-emerald-600">Enabled</strong></li>
                            <li>ในหน้านั้น ให้กดปุ่ม <strong>Verify</strong> เพื่อทดสอบ หากขึ้นคำว่า <strong className="text-emerald-600">Success</strong> แสดงว่าระบบแชทออโตเมติกพร้อมทำงานแล้วค่ะ!</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
      
      {/* Search and Filters Controls */}
      <div className="bg-white p-5 rounded-2xl border border-natural-wheat shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-natural-espresso/40" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์, หมายเลขสั่งซื้อ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-natural-wheat focus:outline-none focus:ring-2 focus:ring-natural-clay/20 focus:border-natural-clay bg-natural-cream/20"
          />
        </div>

        {/* Filter Toggle Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 text-xs text-natural-espresso/60 font-medium mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>ตัวกรอง:</span>
          </div>

          <button
            onClick={() => setStatusFilter('ALL_ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'ALL_ACTIVE'
                ? 'bg-natural-clay text-white border-natural-clay'
                : 'bg-natural-sand hover:bg-natural-wheat/60 text-natural-espresso border-transparent'
            }`}
          >
            📋 เฉพาะงานที่ดำเนินการอยู่
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-natural-clay text-white border-natural-clay'
                : 'bg-natural-sand hover:bg-natural-wheat/60 text-natural-espresso border-transparent'
            }`}
          >
            📂 ทั้งหมด ({orders.length})
          </button>

          <div className="relative inline-block text-left">
            <select
              value={statusList.includes(statusFilter as OrderStatus) ? statusFilter : "SELECT"}
              onChange={(e) => {
                if (e.target.value !== "SELECT") {
                  setStatusFilter(e.target.value);
                }
              }}
              className="text-xs bg-natural-sand border-transparent font-semibold px-3 py-2 rounded-xl text-natural-espresso focus:outline-none focus:ring-2 focus:ring-natural-clay/20 cursor-pointer"
            >
              <option value="SELECT">📍 กรองเฉพาะสถานะ...</option>
              {statusList.map((status) => (
                <option key={status} value={status}>
                  {STATUS_MAP[status].label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative inline-block text-left">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="text-xs bg-purple-50 text-purple-900 border border-purple-200 font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">🏪 ทุกสาขา</option>
              <option value="สาขานราธิวาส">สาขานราธิวาส</option>
              <option value="สาขายะลา">สาขายะลา</option>
              <option value="สาขาปัตตานี">สาขาปัตตานี</option>
              <option value="สาขาหาดใหญ่">สาขาหาดใหญ่</option>
            </select>
          </div>

          {/* Google Sheets Sync & Export Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          >
            <span>📊 ส่งออก Google Sheets</span>
          </button>
        </div>

      </div>

      {/* Orders List Container */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-natural-sand/20 border border-dashed border-natural-wheat rounded-2xl py-12 px-6 text-center text-natural-espresso/60">
            <Compass className="h-8 w-8 mx-auto text-natural-espresso/30 mb-3" />
            <p className="font-medium">ไม่พบรายการออเดอร์ตัดเย็บตามที่เลือก</p>
            <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกสลับแท็บเพื่อดูรายการงานทั้งหมด</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const currentStatusCfg = STATUS_MAP[order.status];
            const isExpanded = expandedOrderId === order.id;
            const unpaid = getUnpaidBalance(order);
            const orderImage = order.customImage || (order.selectedDesignId ? catalogue.find(item => item.id === order.selectedDesignId)?.image : null);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const delDate = new Date(order.deliveryDate);
            delDate.setHours(0, 0, 0, 0);
            const diff = Math.round((delDate.getTime() - todayStart.getTime()) / (1000 * 3600 * 24));

            let cardBg = "bg-white border-natural-wheat";
            if (order.status !== OrderStatus.COMPLETED) {
              if (diff < 0) cardBg = "bg-rose-50/70 border-rose-300 ring-1 ring-rose-200";
              else if (diff === 0) cardBg = "bg-red-50/80 border-red-400 ring-2 ring-red-300 animate-pulse";
              else if (diff === 1) cardBg = "bg-orange-50/70 border-orange-300 ring-1 ring-orange-200";
              else if (diff <= 3) cardBg = "bg-amber-50/70 border-amber-300";
            }

            return (
              <div 
                key={order.id}
                id={order.id}
                className={`rounded-2xl border transition-all duration-300 shadow-sm ${cardBg} ${
                  isExpanded ? 'ring-2 ring-natural-clay/20' : 'hover:border-natural-ochre/40'
                }`}
              >
                
                {/* Main Card Header Area */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                >
                  
                  {/* Left Side: Image Thumbnail (if exists) & Order Number & Customer Name */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {orderImage && (
                      <div className="h-16 w-12 rounded-xl overflow-hidden bg-natural-sand/15 border border-natural-wheat shrink-0 shadow-xs">
                        <img 
                          src={orderImage} 
                          alt="Design Thumbnail" 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-extrabold bg-natural-espresso text-natural-cream px-2 py-0.5 rounded">
                          {order.orderNumber}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${currentStatusCfg.colorClass}`}>
                          {currentStatusCfg.label}
                        </span>
                        {(order.isLocked || order.pickupSignature) && (
                          <span className="bg-amber-100 text-amber-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-3xs">
                            <Lock className="h-3 w-3 text-amber-700" />
                            <span>ลูกค้าเซ็นรับมอบแล้ว (ล็อกออเดอร์)</span>
                          </span>
                        )}
                        {order.customerCategory && (
                          <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-200">
                            ประเภทงาน: {order.customerCategory}
                          </span>
                        )}
                        {order.membershipTier && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            order.membershipTier === 'PRIME' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                            order.membershipTier === 'PRIVILEGE' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            order.membershipTier === 'TRADER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            'bg-stone-50 text-stone-800 border-stone-200'
                          }`}>
                            บัตร: {order.membershipTier}
                          </span>
                        )}
                        {order.externalOrderId && (
                          <span className="bg-sky-50 text-sky-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-200">
                            รหัสอ้างอิง: {order.externalOrderId}
                          </span>
                        )}
                        {order.branch && (
                          <span className="bg-purple-50 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-purple-200">
                            🏪 {order.branch}
                          </span>
                        )}
                        {order.staffName && (
                          <span className="bg-amber-50 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-200">
                            👤 พนักงาน: {order.staffName}
                          </span>
                        )}
                        {order.isMatchingSet && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 animate-pulse">
                            ✨ งานเข้าชุด {order.idhNumber ? `(IDH: ${order.idhNumber})` : ''}
                          </span>
                        )}
                        {order.sku && (
                          <span className="bg-natural-clay/15 text-natural-clay text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-natural-clay/20 uppercase tracking-wide">
                            SKU: {order.sku}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <h4 className="font-serif font-bold text-natural-espresso text-lg leading-tight">
                          {order.customerName}
                        </h4>
                        <p className="text-xs text-natural-espresso/60 flex items-center">
                          <Phone className="h-3 w-3 mr-1 inline" /> {order.customerPhone}
                        </p>
                      </div>
                      <p className="text-xs text-natural-espresso/80 font-medium">
                        ชุด: <span className="text-natural-espresso font-semibold">{order.dressType}</span> | ผ้า: <span className="text-natural-espresso">{order.fabricType} ({order.fabricColor})</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Delivery Target & Price / Expand button */}
                  <div className="flex items-center justify-between w-full md:w-auto md:space-x-6 border-t md:border-0 border-natural-sand pt-3 md:pt-0">
                    
                    <div className="text-left md:text-right space-y-0.5">
                      <p className="text-[10px] text-natural-espresso/40 font-bold uppercase tracking-wider flex items-center md:justify-end">
                        <Calendar className="h-3 w-3 mr-1" /> ส่งมอบวันที่
                      </p>
                      <p className="text-sm font-bold text-natural-espresso">
                        {new Date(order.deliveryDate).toLocaleDateString('th-TH', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                      <div className="text-[10px] font-medium pt-0.5">
                        {(() => {
                          const todayStart = new Date();
                          todayStart.setHours(0, 0, 0, 0);
                          const delDate = new Date(order.deliveryDate);
                          delDate.setHours(0, 0, 0, 0);
                          const diff = Math.round((delDate.getTime() - todayStart.getTime()) / (1000 * 3600 * 24));

                          if (order.status === OrderStatus.COMPLETED) {
                            return <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">✨ ส่งมอบสำเร็จแล้ว</span>;
                          }
                          if (diff < 0) {
                            return <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-300 font-bold animate-pulse">⚠️ เกินกำหนด ${Math.abs(diff)} วัน</span>;
                          }
                          if (diff === 0) {
                            return <span className="inline-block px-2 py-0.5 rounded-md bg-red-600 text-white border border-red-700 font-bold animate-pulse">🚨 ส่งมอบวันนี้!</span>;
                          }
                          if (diff === 1) {
                            return <span className="inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-300 font-bold">⚠️ พรุ่งนี้ (อีก 1 วัน)</span>;
                          }
                          if (diff <= 3) {
                            return <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-semibold">⏳ อีก ${diff} วันส่งชุด</span>;
                          }
                          return <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 อีก ${diff} วันส่งชุด</span>;
                        })()}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5 pl-4 border-l border-natural-sand">
                      <p className="text-[10px] text-natural-espresso/40 font-bold uppercase tracking-wider flex items-center justify-end">
                        <DollarSign className="h-3 w-3" /> ยอดค้างชำระ
                      </p>
                      <p className={`text-sm font-extrabold ${unpaid > 0 ? 'text-natural-clay' : 'text-natural-sage font-semibold'}`}>
                        {unpaid > 0 ? `${unpaid.toLocaleString()} ฿` : 'ครบถ้วนแล้ว ✓'}
                      </p>
                      <p className="text-[10px] text-natural-espresso/50">
                        รวม {order.price.toLocaleString()} ฿
                      </p>
                    </div>

                    <div className="pl-3">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-natural-espresso/40" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-natural-espresso/40" />
                      )}
                    </div>
                  </div>

                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-natural-sand bg-natural-sand/20 p-5 rounded-b-2xl space-y-6">
                    
                    {/* Visual Progress Stepper */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-natural-espresso/60 uppercase tracking-wider flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5" /> ขั้นตอนติดตามงานตัดเย็บ (Update Status Pipeline)
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                        {statusList.map((status, index) => {
                          const isActive = order.status === status;
                          const isPast = statusList.indexOf(order.status) > index;
                          const cfg = STATUS_MAP[status];

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateOrderStatus(order.id, status);
                              }}
                              className={`p-2.5 rounded-xl text-center border text-xs transition-all relative flex flex-col justify-between h-20 group cursor-pointer ${
                                isActive 
                                  ? 'bg-natural-espresso border-natural-espresso text-natural-cream shadow-sm scale-[1.02]' 
                                  : isPast 
                                    ? 'bg-natural-sand/70 border-natural-wheat text-natural-espresso/60 hover:bg-natural-sand/90' 
                                    : 'bg-white border-natural-wheat text-natural-espresso/40 hover:border-natural-ochre/35'
                              }`}
                            >
                              <div className="font-bold block tracking-tight text-[11px]">
                                {index + 1}. {cfg.label}
                              </div>
                              <span className={`text-[9px] block text-left mt-1 font-normal leading-tight opacity-90 line-clamp-2 ${isActive ? 'text-natural-sand/80' : 'text-natural-espresso/50'}`}>
                                {cfg.description}
                              </span>
                              
                              {/* Hover tooltip hint */}
                              <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-all text-[8px] font-bold text-natural-clay">
                                คลิกเพื่อปรับ &rarr;
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Customer Pickup Signature Block / Trigger Button */}
                    {order.pickupSignature ? (
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                          <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span>🔒 หลักฐานการเซ็นรับมอบชุดสมบูรณ์ (Customer Pickup Verified)</span>
                          </div>
                          <span className="text-[10px] bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-full shadow-3xs flex items-center gap-1">
                            <Lock className="h-3 w-3" /> ล็อกออเดอร์ถาวร
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="space-y-1 text-xs text-emerald-950">
                            <p><strong>ผู้เซ็นรับมอบ:</strong> {order.pickupSigneeName || order.customerName}</p>
                            <p><strong>วันเวลาที่รับมอบ:</strong> {order.pickupSignedAt}</p>
                            <p className="text-[10px] text-emerald-800/90 italic">"ข้าพเจ้าได้ตรวจสอบความสมบูรณ์เรียบร้อยของชุดสั่งตัดและได้รับมอบชุดแล้ว"</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col items-center shrink-0">
                            <img
                              src={order.pickupSignature}
                              alt="ลายเซ็นลูกค้ารับมอบชุด"
                              className="h-16 max-w-[180px] object-contain"
                            />
                            <span className="text-[8px] text-emerald-800/60 font-mono mt-1">ลายเซ็นดิจิทัลรับมอบชุด</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-natural-espresso to-natural-clay/90 p-4 rounded-2xl text-natural-cream flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                        <div className="space-y-0.5 text-center sm:text-left">
                          <p className="font-serif font-bold text-sm text-natural-cream flex items-center justify-center sm:justify-start gap-1.5">
                            <PenTool className="h-4 w-4 text-natural-ochre" />
                            <span>เซ็นรับทราบ & รับมอบชุดสั่งตัด (Customer Signature Sign-off)</span>
                          </p>
                          <p className="text-[11px] text-natural-cream/80">
                            เมื่อตัดเย็บเสร็จเรียบร้อย สามารถให้ลูกค้าเซ็นรับทราบผ่านหน้าจอเพื่อล็อกออเดอร์ถาวรและออกหลักฐานรับมอบ
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSignatureModalOrder(order);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-natural-ochre hover:bg-white text-natural-espresso font-extrabold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap border border-natural-ochre/40"
                        >
                          ✍️ ให้ลูกค้าเซ็นรับมอบชุด
                        </button>
                      </div>
                    )}

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Sub-Card A: Measurements Table */}
                      <div className="bg-white p-4 rounded-xl border border-natural-wheat shadow-xs space-y-3 col-span-2">
                        <div className="flex items-center justify-between border-b border-natural-sand pb-2">
                          <h5 className="font-serif font-bold text-natural-espresso text-xs flex items-center">
                            <Ruler className="h-3.5 w-3.5 mr-1.5 text-natural-espresso/60" /> ตารางการวัดตัว (Customer Measurements)
                          </h5>
                          <div className="flex items-center space-x-1.5">
                            {order.measurements.standardSize && (
                              <span className="text-[10px] bg-natural-clay text-white px-2.5 py-0.5 rounded-full font-bold">
                                👗 ไซส์มาตรฐาน: {order.measurements.standardSize}
                              </span>
                            )}
                            {order.customDesign && (
                              <span className="text-[10px] bg-natural-sand border border-natural-wheat text-natural-clay px-2 py-0.5 rounded font-bold">
                                📐 ทรง: {order.customDesign.silhouette} | คอ: {order.customDesign.neckline} | แขน: {order.customDesign.sleeves}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">อก (Chest)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.chest} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">เอว (Waist)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.waist} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">สะโพก (Hips)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.hips} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">ไหล่ (Shoulder)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.shoulder} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">ยาวแขน (Sleeve)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.sleeveLength} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">วงแขน (Armhole)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.armhole} ซม.</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">ยาวชุด (Length)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.length} ซม.</p>
                          </div>

                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">ส่วนสูง (Height)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.height} cm</p>
                          </div>
                          <div className="p-1.5 bg-natural-cream/30 rounded-lg">
                            <p className="text-[10px] text-natural-espresso/45 font-bold">น้ำหนัก (Weight)</p>
                            <p className="text-sm font-mono font-bold text-natural-espresso">{order.measurements.weight || '-'} kg</p>
                          </div>
                          <div className="p-1.5 bg-natural-sand rounded-lg flex items-center justify-center">
                            <span className="text-[9px] text-natural-espresso/50 font-bold uppercase">หน่วย ซม.</span>
                          </div>
                        </div>

                        {order.measurements.otherNotes && (
                          <div className="mt-2 text-xs bg-natural-sand/30 p-2.5 rounded-lg border border-natural-wheat/40">
                            <span className="font-bold text-natural-espresso">📌 บันทึกสัดส่วนเพิ่มเติม:</span> {order.measurements.otherNotes}
                          </div>
                        )}
                      </div>

                      {/* Sub-Card B: Order Details & Contacts */}
                      <div className="bg-white p-4 rounded-xl border border-natural-wheat shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <h5 className="font-serif font-bold text-natural-espresso text-xs border-b border-natural-sand pb-2">
                            📝 รายละเอียดเพิ่มเติมของชิ้นงาน
                          </h5>
                          <div className="space-y-1.5 text-xs text-natural-espresso/80">
                            {order.sku && (
                              <div className="pb-1">
                                <span className="bg-natural-clay/10 text-natural-clay text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-natural-clay/20 uppercase">
                                  SKU: {order.sku}
                                </span>
                              </div>
                            )}
                            {order.customerSocial && (() => {
                              const socialInfo = getSocialInfo(order.customerSocial);
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                                  <span className="font-semibold text-natural-espresso/60 flex items-center gap-1 shrink-0">
                                    {socialInfo?.icon || <Instagram className="h-3.5 w-3.5 text-natural-clay" />}
                                    <span>ช่องทางติดต่อ:</span>
                                  </span>
                                  <span className="font-bold text-natural-espresso bg-natural-sand/50 px-1.5 py-0.5 rounded border border-natural-wheat/50 text-[11px]">
                                    {order.customerSocial}
                                  </span>
                                  {socialInfo?.type === 'line' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const personalUrl = `https://line.me/ti/p/~${socialInfo.cleanId}`;
                                          window.open(personalUrl, '_blank');
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs transition-all cursor-pointer inline-flex shrink-0 ml-1.5"
                                        title="เปิดหน้าแชทไลน์ส่วนตัวของลูกค้าคนนี้โดยตรง"
                                      >
                                        <span>ไลน์ส่วนตัวคนนี้ 🟢</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDirectLineChat(order);
                                        }}
                                        className="bg-[#06C755] hover:bg-[#05b34c] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs transition-all cursor-pointer inline-flex shrink-0 ml-1"
                                        title="คัดลอกข้อความแจ้งสถานะและเปิดหน้าแผงแชท LINE OA ของร้านคุณ"
                                      >
                                        <span>ส่งสถานะเข้า LINE OA 💬</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDirectLineChat(order);
                                      }}
                                      className="bg-[#06C755] hover:bg-[#05b34c] text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-xs transition-all cursor-pointer inline-flex shrink-0 ml-1.5"
                                      title="คลิกเพื่อเปิดแชท LINE ของร้าน"
                                    >
                                      <span>คุย LINE 💬</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                            {order.customerCategory && (
                              <p className="flex items-center">
                                <span className="font-semibold text-natural-espresso/60 mr-1.5">🏷️ ประเภทงาน:</span>
                                <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">{order.customerCategory}</span>
                              </p>
                            )}
                            {order.membershipTier && (
                              <p className="flex items-center">
                                <span className="font-semibold text-natural-espresso/60 mr-1.5">💳 ประเภทบัตรสมาชิก:</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded border text-[10px] ${
                                  order.membershipTier === 'PRIME' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                  order.membershipTier === 'PRIVILEGE' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                  order.membershipTier === 'TRADER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  'bg-stone-50 text-stone-800 border-stone-200'
                                }`}>{order.membershipTier}</span>
                              </p>
                            )}

                            {order.externalOrderId && (
                              <p className="flex items-center">
                                <span className="font-semibold text-natural-espresso/60 mr-1.5">🔗 รหัสออเดอร์จากกัน:</span>
                                <span className="font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 text-[10px] font-mono">{order.externalOrderId}</span>
                              </p>
                            )}
                            <p>
                              📅 <span className="font-semibold text-natural-espresso/50">วันที่สั่งซื้อ:</span> {order.orderDate}
                            </p>
                            <p>
                              💵 <span className="font-semibold text-natural-espresso/50">ราคาชุดทั้งหมด:</span> {order.price.toLocaleString()} บาท
                            </p>
                            {order.discount ? (
                              <p>
                                🏷️ <span className="font-semibold text-natural-espresso/50 text-amber-700">ส่วนลดพิเศษ:</span> <span className="text-amber-700 font-bold">-{order.discount.toLocaleString()} บาท</span>
                              </p>
                            ) : null}
                            <p>
                              💰 <span className="font-semibold text-natural-espresso/50">มัดจำโอนมา:</span> {order.deposit.toLocaleString()} บาท
                              {order.paymentMethod && (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md inline-block">
                                  ช่องทาง: {order.paymentMethod}
                                </span>
                              )}
                            </p>
                            {order.finalPaymentAmount && order.finalPaymentAmount > 0 ? (
                              <p className="text-emerald-800 font-medium">
                                💵 <span className="font-semibold text-emerald-900/70">จ่ายส่วนต่างเพิ่ม:</span> {order.finalPaymentAmount.toLocaleString()} บาท
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold rounded-md inline-block">
                                  ช่องทาง: {order.finalPaymentMethod || order.paymentMethod || 'เงินโอน'}
                                </span>
                                {order.finalPaymentDate ? ` (${order.finalPaymentDate})` : ''}
                              </p>
                            ) : null}
                            {(() => {
                              const unpaid = Math.max(0, order.price - order.deposit - (order.discount || 0) - (order.finalPaymentAmount || 0));
                              return unpaid === 0 ? (
                                <p className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-1 text-xs">
                                  ✓ ชำระเงินครบถ้วนแล้ว
                                </p>
                              ) : (
                                <p className="font-bold text-natural-clay bg-natural-sand/30 px-2 py-1 rounded-lg border border-natural-wheat/40 inline-block mt-1">
                                  📊 ยอดคงเหลือสุทธิวันรับชุด: {unpaid.toLocaleString()} บาท
                                </p>
                              );
                            })()}
                            {order.fabricType && (
                              <p className="mt-1">
                                🧥 <span className="font-semibold text-natural-espresso/50">ประเภทเนื้อผ้า:</span> {order.fabricType}
                              </p>
                            )}
                          </div>

                          {order.notes && (
                            <div className="text-xs bg-natural-sand/30 p-2.5 rounded-lg border border-natural-wheat/40 text-natural-espresso/80 italic">
                              "{order.notes}"
                            </div>
                          )}

                          {(() => {
                            const resolvedImg = order.customImage || (order.selectedDesignId ? catalogue.find(c => c.id === order.selectedDesignId)?.image : null);
                            const hasImages = resolvedImg || order.customImage2;
                            if (!hasImages) return null;

                            return (
                              <div className="pt-2 border-t border-natural-sand/50">
                                <p className="text-[10px] text-natural-espresso/45 font-bold mb-1.5 flex items-center">
                                  <MessageSquare className="h-3 w-3 mr-1 text-natural-clay" />
                                  <span>รูปภาพแบบชุดสั่งตัดที่เลือก (Selected Design / Reference Photos)</span>
                                </p>
                                <div className={`grid ${resolvedImg && order.customImage2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                  {resolvedImg && (
                                    <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group">
                                      <img 
                                        src={resolvedImg} 
                                        alt="Design Reference 1" 
                                        className="w-full object-contain max-h-48 rounded-lg cursor-zoom-in mx-auto"
                                        referrerPolicy="no-referrer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const imgWindow = window.open();
                                          if (imgWindow) {
                                            imgWindow.document.write(`<img src="${resolvedImg}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                  {order.customImage2 && (
                                    <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group">
                                      <img 
                                        src={order.customImage2} 
                                        alt="Custom Reference 2" 
                                        className="w-full object-contain max-h-48 rounded-lg cursor-zoom-in mx-auto"
                                        referrerPolicy="no-referrer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const imgWindow = window.open();
                                          if (imgWindow) {
                                            imgWindow.document.write(`<img src="${order.customImage2}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {order.slipImage && (
                            <div className="pt-2 border-t border-natural-sand/50">
                              <p className="text-[10px] text-natural-espresso/45 font-bold mb-1.5 flex items-center">
                                <ImageIcon className="h-3 w-3 mr-1 text-natural-clay" />
                                <span>หลักฐานการชำระเงิน (Payment Slip Reference)</span>
                              </p>
                              <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group flex justify-start">
                                <img 
                                  src={order.slipImage} 
                                  alt="Payment Slip" 
                                  className="h-40 w-auto object-contain rounded-lg cursor-zoom-in border border-natural-wheat"
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const imgWindow = window.open();
                                    if (imgWindow) {
                                      imgWindow.document.write(`<img src="${order.slipImage}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Historical Orders & Feedbacks of this customer */}
                          {(() => {
                            const otherOrders = getCustomerOtherOrders(order);
                            if (otherOrders.length === 0) return null;
                            return (
                              <div className="pt-2 border-t border-natural-sand/50 space-y-2">
                                <details className="group bg-natural-sand/10 border border-natural-wheat/40 rounded-xl p-3">
                                  <summary className="text-xs font-bold font-serif text-natural-espresso flex items-center justify-between cursor-pointer list-none">
                                    <span className="flex items-center gap-1.5">
                                      <History className="h-3.5 w-3.5 text-natural-clay animate-pulse" />
                                      <span>📜 ประวัติสั่งตัด & FEEDBACK ย้อนหลัง ({otherOrders.length} ออเดอร์ก่อนหน้า)</span>
                                    </span>
                                    <span className="transition-transform duration-200 group-open:rotate-180 text-[10px]">▼</span>
                                  </summary>
                                  <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                                    {otherOrders.map((prev) => {
                                      const m = prev.measurements;
                                      const prevFeedbacks = prev.feedbacks || [];
                                      return (
                                        <div key={prev.id} className="bg-white p-2.5 rounded-lg border border-natural-sand text-[11px] space-y-1.5">
                                          <div className="flex justify-between items-center text-[10px] text-natural-espresso/60 font-bold border-b border-natural-sand/50 pb-1">
                                            <span>ออเดอร์: {prev.orderNumber} ({prev.dressType})</span>
                                            <span className="font-mono">{prev.orderDate}</span>
                                          </div>
                                          
                                          {/* Mini Measurements */}
                                          <div className="text-[10px] grid grid-cols-4 gap-1 bg-natural-sand/5 p-1 rounded font-mono text-natural-espresso/80">
                                            <div>อก: {m.chest}</div>
                                            <div>เอว: {m.waist}</div>
                                            <div>สพ: {m.hips}</div>
                                            <div>ยาว: {m.length}</div>
                                          </div>

                                          {/* Previous Feedbacks */}
                                          {prevFeedbacks.length > 0 ? (
                                            <div className="space-y-1 pt-1 border-t border-dashed border-natural-sand/30">
                                              <p className="text-[9px] font-bold text-natural-clay/85 uppercase">ประวัติการพูดคุย/ฟีดแบ็ก:</p>
                                              <div className="bg-natural-sand/5 p-1.5 rounded space-y-1 text-[10px] max-h-24 overflow-y-auto">
                                                {prevFeedbacks.map((f) => (
                                                  <div key={f.id} className="leading-relaxed">
                                                    <strong className={f.sender === 'customer' ? 'text-amber-800' : 'text-natural-clay'}>
                                                      {f.sender === 'customer' ? 'ลูกค้า: ' : 'ร้านค้า: '}
                                                    </strong>
                                                    <span>{f.content}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : (
                                            prev.notes && (
                                              <p className="text-[10px] text-natural-espresso/60 italic bg-natural-sand/5 p-1 rounded">
                                                📌 โน้ต: {prev.notes}
                                              </p>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              </div>
                            );
                          })()}

                          <div className="pt-2 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintingOrder(order);
                              }}
                              className="bg-natural-clay hover:bg-natural-clay-dark text-white text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs flex-1"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>พิมพ์ใบออเดอร์ 🖨️</span>
                            </button>
                            {order.status === OrderStatus.COMPLETED ? (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const directLink = `${window.location.origin}/?mode=customer&search=${order.orderNumber}&action=review`;
                                  const reviewInvitationText = `🌟 ห้องเสื้อ NUNUH - ขอรบกวนประเมินความพึงพอใจและเขียนรีวิวสำหรับชุด ${order.dressType} (${order.orderNumber})\n\nเรียนคุณ ${order.customerName}\nท่านสามารถกดเปิดลิงก์ด้านล่างเพื่อเขียนรีวิวและให้คะแนนความพึงพอใจได้ทันทีโดยไม่ต้องค้นหาเองค่ะ 👇\n🔗 ${directLink}\n\nขอขอบพระคุณล่วงหน้าค่ะ 🙏✨`;
                                  
                                  // 1. Copy to clipboard
                                  try {
                                    await navigator.clipboard.writeText(reviewInvitationText);
                                  } catch (err) {}

                                  // 2. LINE Push API if lineUserId exists
                                  let pushed = false;
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
                                        pushed = true;
                                      }
                                    } catch (err) {}
                                  }

                                  // 3. Open LINE app chat / message scheme
                                  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(reviewInvitationText)}`;
                                  window.open(lineShareUrl, '_blank');

                                  // 4. Alert
                                  if (pushed) {
                                    alert(`📲 ส่งลิงก์เขียนรีวิวให้ คุณ${order.customerName.replace('คุณ', '').trim()} เข้า LINE เรียบร้อยแล้วค่ะ! ✨`);
                                  } else {
                                    alert(`📲 ส่งลิงก์เขียนรีวิวให้ คุณ${order.customerName.replace('คุณ', '').trim()} เรียบร้อยแล้วค่ะ!\n(เปิดแอป LINE พร้อมคัดลอกข้อความลง Clipboard ให้อัตโนมัติค่ะ) ✨`);
                                  }
                                }}
                                className="bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-extrabold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-pink-600 shadow-xs active:scale-95 flex-1"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>ส่งลิงก์เขียนรีวิวให้ลูกค้า 📲</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentStatusCfg = STATUS_MAP[order.status];
                                  const discountVal = order.discount || 0;
                                  const unpaid = Math.max(0, order.price - order.deposit - discountVal);
                                  const formattedDelivery = new Date(order.deliveryDate).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  });
                                  const portalUrl = `${publicUrl}?tab=customer&search=${encodeURIComponent(order.customerPhone)}&mode=customer`;
                                  const message = `⚜️ อัปเดตสถานะชุดสั่งตัด NUNUH Boutique ⚜️\n\nเรียนคุณ: ${order.customerName}\nรหัสออเดอร์: ${order.orderNumber}\nประเภทชุด: ${order.dressType}\n\n📍 สถานะปัจจุบัน: [${currentStatusCfg.label}]\n➡️ "${currentStatusCfg.description}"\n\n📅 กำหนดส่งมอบ: ${formattedDelivery}\n\nท่านสามารถตรวจสอบข้อมูลสัดส่วนและติดตามความคืบหน้าแบบละเอียดด้วยตนเองได้ที่นี่:\n🔗 ${portalUrl}\n\nขอขอบพระคุณที่เลือกใช้บริการค่ะ ✨`;
                                  
                                  navigator.clipboard.writeText(message);
                                  alert(`คัดลอกข้อความสถานะอัปเดตของ ${order.customerName} เรียบร้อยแล้ว! สามารถนำไปส่งให้ลูกค้าได้ทันทีค่ะ 📋`);
                                }}
                                className="bg-natural-sand hover:bg-natural-wheat/80 text-natural-espresso text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-natural-wheat/50 flex-1"
                              >
                                <span>คัดลอกข้อความ 📋</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLineOaChat(order);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs flex-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>แชท LINE OA 🟢</span>
                            </button>
                          </div>
                        </div>

                        {/* Action buttons (Delete & Edit) */}
                        <div className="pt-3 border-t border-natural-sand flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOrder(order);
                              }}
                              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>แก้ไขออเดอร์นี้</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`คุณต้องการยกเลิกและลบออเดอร์ของ ${order.customerName} ใช่หรือไม่?`)) {
                                  onDeleteOrder(order.id);
                                }
                              }}
                              className="text-xs text-rose-700 hover:text-rose-800 font-semibold flex items-center space-x-1 px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-rose-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>ลบออเดอร์นี้</span>
                            </button>

                            {(order.isLocked || order.pickupSignature) && (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>ลูกค้าเซ็นแล้ว (เจ้าของแก้ไขได้)</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(order.id)}
                            className="text-[11px] text-natural-espresso/60 hover:text-natural-espresso font-bold uppercase tracking-wider cursor-pointer"
                          >
                            ปิดรายละเอียด &uarr;
                          </button>
                        </div>

                      </div>

                    </div>

                    {/* Customer Body Photos Section */}
                    <div className="bg-white p-5 rounded-xl border border-natural-wheat shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-natural-sand pb-2">
                        <h5 className="font-serif font-bold text-natural-espresso text-xs flex items-center space-x-1.5">
                          <Camera className="h-3.5 w-3.5 text-natural-clay" />
                          <span>📸 รูปถ่ายลูกค้าสำหรับตัดเย็บ (Customer Body Proportions)</span>
                        </h5>
                        <span className="text-[10px] text-natural-espresso/50 font-medium">ภาพสัดส่วนเพื่อความแม่นยำในการทำแพทเทิร์น</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Front View */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-natural-espresso/70 text-center">ภาพถ่ายด้านหน้า (Front View)</p>
                          {order.customerPhotoFront ? (
                            <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group flex items-center justify-center">
                              <img 
                                src={order.customerPhotoFront} 
                                alt="Front proportion" 
                                className="w-full object-contain max-h-48 rounded-lg cursor-zoom-in"
                                referrerPolicy="no-referrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const imgWindow = window.open();
                                  if (imgWindow) {
                                    imgWindow.document.write(`<img src="${order.customerPhotoFront}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="border border-dashed border-natural-sand rounded-xl p-6 text-center text-natural-espresso/45 bg-natural-cream/10 text-xs italic flex flex-col items-center justify-center h-32">
                              <span>ไม่มีรูปถ่ายด้านหน้า</span>
                            </div>
                          )}
                        </div>

                        {/* Side View */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-natural-espresso/70 text-center">ภาพถ่ายด้านข้าง (Side View)</p>
                          {order.customerPhotoSide ? (
                            <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group flex items-center justify-center">
                              <img 
                                src={order.customerPhotoSide} 
                                alt="Side proportion" 
                                className="w-full object-contain max-h-48 rounded-lg cursor-zoom-in"
                                referrerPolicy="no-referrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const imgWindow = window.open();
                                  if (imgWindow) {
                                    imgWindow.document.write(`<img src="${order.customerPhotoSide}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="border border-dashed border-natural-sand rounded-xl p-6 text-center text-natural-espresso/45 bg-natural-cream/10 text-xs italic flex flex-col items-center justify-center h-32">
                              <span>ไม่มีรูปถ่ายด้านข้าง</span>
                            </div>
                          )}
                        </div>

                        {/* Back View */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-natural-espresso/70 text-center">ภาพถ่ายด้านหลัง (Back View)</p>
                          {order.customerPhotoBack ? (
                            <div className="relative rounded-xl overflow-hidden border border-natural-wheat bg-natural-sand/5 max-h-48 group flex items-center justify-center">
                              <img 
                                src={order.customerPhotoBack} 
                                alt="Back proportion" 
                                className="w-full object-contain max-h-48 rounded-lg cursor-zoom-in"
                                referrerPolicy="no-referrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const imgWindow = window.open();
                                  if (imgWindow) {
                                    imgWindow.document.write(`<img src="${order.customerPhotoBack}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="border border-dashed border-natural-sand rounded-xl p-6 text-center text-natural-espresso/45 bg-natural-cream/10 text-xs italic flex flex-col items-center justify-center h-32">
                              <span>ไม่มีรูปถ่ายด้านหลัง</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      <PrintOrderModal 
        order={printingOrder} 
        isOpen={printingOrder !== null} 
        onClose={() => setPrintingOrder(null)} 
      />

      {/* Google Sheets Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-natural-espresso/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-natural-wheat relative space-y-6">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-natural-espresso/40 hover:text-natural-espresso p-1.5 rounded-lg hover:bg-natural-sand transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Google Sheets Integration
              </span>
              <h3 className="text-xl font-serif font-extrabold text-natural-espresso">
                ส่งออกข้อมูลออเดอร์ไปยัง Google Sheets 📊
              </h3>
              <p className="text-xs text-natural-espresso/60">
                เลือกรูปแบบที่ต้องการเพื่อนำข้อมูลออเดอร์ตัดเย็บทั้งหมดไปใส่ใน Google Sheets หรือแชร์กับทีมงาน
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Copy-Paste TSV */}
              <div className="border border-natural-wheat hover:border-emerald-500/50 p-5 rounded-xl bg-natural-cream/10 space-y-3 transition-all flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm text-emerald-800 flex items-center space-x-1.5">
                    <span>📋 วิธีคัดลอก-วาง (แนะนำ)</span>
                  </h4>
                  <p className="text-xs text-natural-espresso/70 leading-relaxed">
                    คัดลอกข้อมูลทั้งหมดในรูปแบบตารางเว้นวรรค (TSV) แล้วนำไปกด <strong>Ctrl + V</strong> หรือ <strong>Cmd + V</strong> ใน Google Sheets ได้ทันที ไม่ต้องเซฟไฟล์!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const tsv = generateTSV();
                    await navigator.clipboard.writeText(tsv);
                    alert('คัดลอกข้อมูลตารางเรียบร้อยแล้ว! สามารถเปิด Google Sheets แล้วกดปุ่มวาง (Ctrl+V) ได้เลยค่ะ');
                  }}
                  className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  คัดลอกข้อมูลตาราง (Copy TSV)
                </button>
              </div>

              {/* Option 2: Download CSV */}
              <div className="border border-natural-wheat hover:border-emerald-500/50 p-5 rounded-xl bg-natural-cream/10 space-y-3 transition-all flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm text-emerald-800 flex items-center space-x-1.5">
                    <span>💾 ดาวน์โหลดไฟล์ CSV</span>
                  </h4>
                  <p className="text-xs text-natural-espresso/70 leading-relaxed">
                    ดาวน์โหลดเป็นไฟล์ CSV (เข้ารหัสภาษาไทย) เพื่อนำไปกดนำเข้า (Import) ใน Google Sheets, Microsoft Excel หรือโปรแกรมอื่นๆ ได้อย่างสมบูรณ์แบบ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV();
                    alert('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้วค่ะ! ท่านสามารถอัปโหลดไฟล์นี้เข้า Google Sheets ได้เลย');
                  }}
                  className="w-full py-2 bg-neutral-800 text-white font-bold text-xs rounded-lg hover:bg-neutral-900 transition-colors shadow-xs cursor-pointer"
                >
                  ดาวน์โหลดไฟล์ CSV
                </button>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 space-y-3">
              <h5 className="font-bold text-xs text-emerald-800 uppercase tracking-wider">
                💡 ขั้นตอนการนำเข้า Google Sheets อย่างง่าย:
              </h5>
              <ol className="text-xs text-natural-espresso/80 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>เปิดเว็บ <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold">sheets.google.com</a> และสร้างสเปรดชีตใหม่</li>
                <li>คลิกที่ปุ่ม <strong>"คัดลอกข้อมูลตาราง (Copy TSV)"</strong> ด้านบน</li>
                <li>คลิกเลือกช่อง <strong>A1</strong> (ช่องแรกซ้ายบนสุด) ใน Google Sheets ของท่าน</li>
                <li>กดปุ่ม <strong>Ctrl + V</strong> (สำหรับ Windows) หรือ <strong>Cmd + V</strong> (สำหรับ Mac) บนคีย์บอร์ด ข้อมูลทั้งหมดจะแยกเป็นคอลัมน์ให้อย่างสวยงามทันที!</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-natural-sand hover:bg-natural-wheat text-natural-espresso font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={(updated) => {
            if (onEditOrder) {
              onEditOrder(updated);
            }
            setEditingOrder(null);
          }}
        />
      )}

      {signatureModalOrder && (
        <SignatureModal
          order={signatureModalOrder}
          isOpen={!!signatureModalOrder}
          onClose={() => setSignatureModalOrder(null)}
          onConfirmSignature={(orderId, sigUrl, signeeName, signedAt) => {
            if (onConfirmPickupSignature) {
              onConfirmPickupSignature(orderId, sigUrl, signeeName, signedAt);
            }
            setSignatureModalOrder(null);
          }}
        />
      )}


    </div>
  );
}
