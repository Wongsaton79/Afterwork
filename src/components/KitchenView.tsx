import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { updateOrderStatus } from '../lib/orderService';
import { playNotificationSound } from '../lib/firebase';
import { 
  speakOrderAnnouncement, 
  formatOrderSpeechText, 
  unlockAudio,
  playChime,
  playSuccessChime 
} from '../lib/speechService';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Trash2, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  Utensils,
  CookingPot,
  BellRing,
  Mic,
  Sparkles,
  UserCheck,
  Banknote,
  DollarSign,
  ArrowRight,
  X,
  CreditCard,
  QrCode
} from 'lucide-react';

interface KitchenViewProps {
  orders: Order[];
}

export const KitchenView: React.FC<KitchenViewProps> = ({ orders }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [announcedBanner, setAnnouncedBanner] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cooking' | 'cancelled'>('all');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Payment / Change calculation modal state
  const [servingOrder, setServingOrder] = useState<Order | null>(null);
  const [receivedCash, setReceivedCash] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash');
  const [isFinishingOrder, setIsFinishingOrder] = useState(false);
  
  // Track known order IDs to announce ONLY genuinely newly arriving orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set(orders.map(o => o.id)));
  const isInitialMount = useRef(true);

  // Auto unlock audio on any click in KitchenView
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleUserInteraction, { once: false });
    window.addEventListener('touchstart', handleUserInteraction, { once: false });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Update timer every 10 seconds to keep minutes elapsed accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen to new arriving orders and announce by customer name
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      knownOrderIdsRef.current = new Set(orders.map(o => o.id));
      return;
    }

    const newOrders = orders.filter(
      o => !knownOrderIdsRef.current.has(o.id) && o.status === 'active'
    );

    if (newOrders.length > 0) {
      newOrders.forEach(order => {
        knownOrderIdsRef.current.add(order.id);

        if (soundEnabled) {
          playChime();
        }

        if (voiceEnabled) {
          const speechText = formatOrderSpeechText(order.customerName);
          setAnnouncedBanner(speechText);
          setLastAnnouncedId(order.id);
          
          // Small delay so chime finishes before speech starts
          setTimeout(() => {
            speakOrderAnnouncement(speechText);
          }, 350);

          setTimeout(() => {
            setAnnouncedBanner(prev => (prev === speechText ? null : prev));
          }, 6000);
        }
      });
    } else {
      // Sync known IDs
      orders.forEach(o => knownOrderIdsRef.current.add(o.id));
    }
  }, [orders, soundEnabled, voiceEnabled]);

  const handleTestVoice = (sampleName: string = 'คุณ มัด') => {
    unlockAudio();
    playChime();
    const text = formatOrderSpeechText(sampleName);
    setAnnouncedBanner(text);
    setTimeout(() => {
      speakOrderAnnouncement(text);
    }, 350);
    setTimeout(() => setAnnouncedBanner(null), 5000);
  };

  const handleStartCooking = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'cooking');
    } catch (e) {
      console.error(e);
    }
  };

  // Open Checkout / Change calculation modal
  const handleOpenServeModal = (order: Order) => {
    unlockAudio();
    setServingOrder(order);
    setReceivedCash(String(order.total)); // default exact amount
    setPaymentMethod('cash');
  };

  const handleConfirmServeAndPayment = async () => {
    if (!servingOrder) return;
    setIsFinishingOrder(true);
    try {
      await updateOrderStatus(servingOrder.id, 'completed');
      playSuccessChime();
      setServingOrder(null);
      setReceivedCash('');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsFinishingOrder(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return;
    try {
      await updateOrderStatus(cancellingOrderId, 'cancelled');
      setCancellingOrderId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const activeOrCookingOrders = orders.filter(o => o.status === 'active' || o.status === 'cooking');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'all') return o.status === 'active' || o.status === 'cooking';
    return o.status === filterStatus;
  });

  const getElapsedTimeText = (timeMs: number) => {
    const elapsedMinutes = Math.max(0, Math.floor((currentTime - timeMs) / 60000));
    if (elapsedMinutes === 0) return 'เพิ่งสั่งเข้ามา';
    if (elapsedMinutes < 60) return `${elapsedMinutes} นาทีที่แล้ว`;
    const hrs = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    return `${hrs} ชม. ${mins} นาที`;
  };

  const getElapsedBadgeColor = (timeMs: number) => {
    const elapsedMinutes = Math.floor((currentTime - timeMs) / 60000);
    if (elapsedMinutes >= 20) return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
    if (elapsedMinutes >= 10) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  // Quick cash buttons
  const cashNum = parseFloat(receivedCash) || 0;
  const changeAmount = servingOrder ? Math.max(0, cashNum - servingOrder.total) : 0;
  const isInsufficient = servingOrder ? cashNum < servingOrder.total && paymentMethod === 'cash' : false;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0f172a] text-slate-100 overflow-hidden">
      
      {/* KDS Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">จอแสดงผลครัว (Kitchen KDS)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
                {activeOrCookingOrders.length} คิวรอทำ
              </span>
              {cancelledOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ยกเลิก {cancelledOrders.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">ระบบอัปเดตแบบเรียลไทม์พร้อมคำนวณเงินทอน</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Filter buttons */}
          <div className="bg-slate-800 p-1 rounded-xl flex gap-1 text-xs font-bold border border-slate-700">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterStatus === 'all' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              คิวทั้งหมด ({activeOrCookingOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterStatus === 'active' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              รอเริ่ม ({orders.filter(o => o.status === 'active').length})
            </button>
            <button
              onClick={() => setFilterStatus('cooking')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterStatus === 'cooking' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              กำลังปรุง ({orders.filter(o => o.status === 'cooking').length})
            </button>
            {cancelledOrders.length > 0 && (
              <button
                onClick={() => setFilterStatus('cancelled')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterStatus === 'cancelled' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-200'
                }`}
              >
                ยกเลิก ({cancelledOrders.length})
              </button>
            )}
          </div>

          {/* Voice announcement toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled 
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30' 
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-400'
            }`}
            title="เสียงอ่านชื่อลูกค้าตามออเดอร์"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden md:inline">{voiceEnabled ? 'อ่านชื่อ: เปิด' : 'อ่านชื่อ: ปิด'}</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-400'
            }`}
            title="เสียงกระดิ่งเตือนออเดอร์"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'กระดิ่ง' : 'ปิดกระดิ่ง'}</span>
          </button>

          <button
            onClick={() => handleTestVoice('คุณ มัด')}
            className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition cursor-pointer"
            title="ทดสอบฟังเสียงอ่านชื่อลูกค้าตัวอย่าง: คุณ มัด"
          >
            <BellRing className="w-4 h-4" />
            <span>ทดสอบเสียงอ่านชื่อ</span>
          </button>
        </div>
      </div>

      {/* Floating Announcement Banner */}
      {announcedBanner && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between text-sm font-bold shadow-lg animate-pulse shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span>📢 กำลังประกาศ: "{announcedBanner}"</span>
          </div>
          <button
            onClick={() => setAnnouncedBanner(null)}
            className="text-xs bg-black/30 hover:bg-black/50 text-white px-2.5 py-1 rounded-lg cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 hide-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
            <CheckCircle2 className="w-16 h-16 text-emerald-500/40 mb-4" />
            <h3 className="text-2xl font-bold text-slate-300">
              {filterStatus === 'cancelled' ? 'ไม่มีออเดอร์ที่ถูกยกเลิก' : 'ไม่มีออเดอร์ค้างในห้องครัว'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {filterStatus === 'cancelled' ? 'ทุกออเดอร์ดำเนินไปด้วยความเรียบร้อย' : 'ยอดเยี่ยมมาก! ออเดอร์ทั้งหมดถูกปรุงและเสิร์ฟเรียบร้อยแล้ว'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredOrders.map((order, idx) => {
              const isCooking = order.status === 'cooking';
              const isCancelled = order.status === 'cancelled';
              const orderTimeText = getElapsedTimeText(order.timeMs);
              const badgeColor = isCancelled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : getElapsedBadgeColor(order.timeMs);

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                    isCancelled 
                      ? 'bg-rose-950/30 border-rose-800/80 opacity-80'
                      : isCooking
                        ? 'bg-slate-850 border-orange-500/50 ring-1 ring-orange-500/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Top Header */}
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase ${
                          isCancelled ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {isCancelled ? '✕ ยกเลิก' : `คิว #${idx + 1}`}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          #{order.id.slice(-5).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white leading-tight flex items-center gap-1.5">
                        <UserCheck className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-rose-400' : 'text-orange-400'}`} />
                        <span className={isCancelled ? 'line-through text-slate-400' : ''}>{order.customerName}</span>
                      </h3>
                    </div>

                    {/* Elapsed Timer Badge */}
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${badgeColor}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isCancelled ? 'ยกเลิกแล้ว' : orderTimeText}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-72 hide-scrollbar">
                    {order.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className={`flex items-start justify-between p-2.5 rounded-xl border text-sm ${
                          isCancelled ? 'bg-rose-900/10 border-rose-900/30' : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 pr-2">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border ${
                            isCancelled 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}>
                            {item.quantity}
                          </span>
                          <div>
                            <span className={`font-semibold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                              {item.name}
                            </span>
                            {item.notes && (
                              <div className="text-xs text-amber-400 font-medium italic mt-0.5">
                                โน้ต: {item.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                          {(item.price * item.quantity).toLocaleString()} ฿
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Price Summary Banner in Card */}
                  <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">ยอดรวมทั้งหมด:</span>
                    <span className="text-base font-black text-orange-400">
                      {order.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
                    </span>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex gap-2">
                    {!isCancelled && (
                      <button
                        onClick={() => setCancellingOrderId(order.id)}
                        className="p-3 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition text-xs border border-slate-700 cursor-pointer"
                        title="ยกเลิกออเดอร์"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {!isCancelled ? (
                      !isCooking ? (
                        <button
                          onClick={() => handleStartCooking(order.id)}
                          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition active:scale-98 cursor-pointer"
                        >
                          <CookingPot className="w-4 h-4 text-orange-400" />
                          <span>เริ่มปรุงอาหาร</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenServeModal(order)}
                          className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>เสิร์ฟ & คิดเงิน ({order.total.toLocaleString()} ฿)</span>
                        </button>
                      )
                    ) : (
                      <div className="w-full py-2.5 text-center text-xs font-bold text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        ลูกค้ายกเลิกรายการนี้แล้ว
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Serving & Cash Change Calculation Modal */}
      {servingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">เสิร์ฟอาหาร & คิดเงิน</h4>
                  <p className="text-xs text-slate-400">ออเดอร์ของ <strong className="text-orange-400">{servingOrder.customerName}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setServingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Payment Method Switch */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                  paymentMethod === 'cash' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>เงินสด (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('promptpay')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                  paymentMethod === 'promptpay' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>สแกนจ่าย / โอน</span>
              </button>
            </div>

            {/* Total Price Display */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">ยอดรวมที่ต้องชำระ</span>
                <span className="text-2xl font-black text-white">{servingOrder.total.toLocaleString()} <span className="text-sm font-normal text-slate-400">บาท</span></span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">จำนวนรายการ</span>
                <span className="text-xs font-bold text-orange-400">{servingOrder.items.length} รายการ</span>
              </div>
            </div>

            {/* Cash & Change Calculator */}
            {paymentMethod === 'cash' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    💵 รับเงินจากลูกค้ามา (บาท):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={receivedCash}
                      onChange={(e) => setReceivedCash(e.target.value)}
                      placeholder="0"
                      className="w-full pl-4 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-black text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">บาท</span>
                  </div>
                </div>

                {/* Quick Cash Presets */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  {[servingOrder.total, 50, 100, 500, 1000].filter((val, i, arr) => arr.indexOf(val) === i && val >= servingOrder.total).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReceivedCash(String(preset))}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 shrink-0 cursor-pointer"
                    >
                      {preset === servingOrder.total ? `พอดี (${preset})` : `${preset} ฿`}
                    </button>
                  ))}
                </div>

                {/* Calculated Change Box */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isInsufficient 
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block">
                        {isInsufficient ? '⚠️ ยอดเงินยังไม่พอ (ขาดอีก)' : '💰 เงินทอนลูกค้า:'}
                      </span>
                      <span className="text-2xl font-black">
                        {isInsufficient 
                          ? `${(servingOrder.total - cashNum).toLocaleString()} บาท` 
                          : `${changeAmount.toLocaleString()} บาท`}
                      </span>
                    </div>
                    {changeAmount === 0 && !isInsufficient && (
                      <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                        รับเงินพอดี ไม่ต้องทอน
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                <span className="text-xs text-slate-400 block">ลูกค้าชำระผ่าน QR Code พร้อมเพย์ หรือ โอนเงิน</span>
                <span className="text-xl font-black text-emerald-400 block">{servingOrder.total.toLocaleString()} บาท</span>
                <span className="text-[11px] text-slate-500 block">ตรวจสอบยอดเงินเข้าบัญชีเรียบร้อยแล้วกดปุ่มด้านล่างเพื่อตัดเสิร์ฟ</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServingOrder(null)}
                disabled={isFinishingOrder}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleConfirmServeAndPayment}
                disabled={isFinishingOrder || isInsufficient}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFinishingOrder ? 'กำลังบันทึก...' : 'ยืนยันเสิร์ฟ & จบออเดอร์'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">ยืนยันการยกเลิกออเดอร์</h4>
              <p className="text-xs text-slate-400 mt-1">ออเดอร์นี้จะถูกเปลี่ยนสถานะเป็น Cancelled และออกจากคิวครัว</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer"
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
