import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem, Order } from '../types';
import { submitOrder, getOrderTimeMs, updateOrderStatus } from '../lib/orderService';
import { db, PATH_ORDERS, playNotificationSound } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Sparkles, 
  X, 
  ArrowLeft,
  UtensilsCrossed,
  Flame,
  AlertCircle,
  User,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomerOrderViewProps {
  menus: MenuItem[];
  initialTable?: string;
}

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  menus
}) => {
  // Customer name is mandatory (strictly ordering by name)
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('afterwork_customer_name') || '';
  });
  const [nameError, setNameError] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active tracking order
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    return localStorage.getItem('afterwork_customer_active_order') || null;
  });
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Derive categories
  const categories = ['ทั้งหมด', ...Array.from(new Set(menus.map(m => m.category || 'ทั่วไป')))];

  // Filter menus
  const filteredMenus = menus.filter(m => {
    const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
    const matchSearch = !searchQuery.trim() || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Track existing order live: instantly sync status with kitchen / admin
  useEffect(() => {
    if (!activeOrderId) {
      setTrackedOrder(null);
      return;
    }

    const orderDocRef = doc(db, ...PATH_ORDERS, activeOrderId);
    const unsub = onSnapshot(orderDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const currentStatus = data.status;

        // If order was cancelled or completed, inform user and allow resetting
        if (currentStatus === 'cancelled') {
          // Cleared from kitchen or cancelled
          setTrackedOrder(null);
          setActiveOrderId(null);
          localStorage.removeItem('afterwork_customer_active_order');
          return;
        }

        setTrackedOrder({
          id: snap.id,
          ...data,
          timeMs: getOrderTimeMs(data)
        } as Order);
      } else {
        // Document was deleted from database (e.g. from kitchen/admin)
        setTrackedOrder(null);
        setActiveOrderId(null);
        localStorage.removeItem('afterwork_customer_active_order');
      }
    }, (err) => {
      console.warn('Track order listener error:', err);
    });

    return () => unsub();
  }, [activeOrderId]);

  // Cart operations
  const addToCart = (menu: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.id === menu.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { ...menu, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.id === menuId);
      if (idx >= 0) {
        if (prev[idx].quantity > 1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity - 1 };
          return copy;
        }
        return prev.filter(item => item.id !== menuId);
      }
      return prev;
    });
  };

  const updateItemNotes = (menuId: string, notes: string) => {
    setCart(prev => prev.map(item => item.id === menuId ? { ...item, notes } : item));
  };

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Submit order directly to kitchen
  const handleSendOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setNameError(true);
      alert('⚠️ กรุณาระบุ "ชื่อของคุณลูกค้า" เพื่อให้ทางร้านและห้องครัวทราบออเดอร์ครับ');
      return;
    }

    setNameError(false);
    // Save customer name locally for subsequent orders
    try {
      localStorage.setItem('afterwork_customer_name', trimmedName);
    } catch (e) {}

    setIsSubmitting(true);
    try {
      const orderId = await submitOrder({
        customerName: trimmedName,
        tableNo: '',
        orderType: 'takeaway',
        items: cart,
        paymentStatus: 'unpaid',
        paymentMethod: 'cash'
      });

      // Save tracking
      setActiveOrderId(orderId);
      localStorage.setItem('afterwork_customer_active_order', orderId);

      // Play chime & celebrate
      playNotificationSound();
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}

      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error('Customer submit order error:', err);
      alert('ไม่สามารถส่งออเดอร์ได้ กรุณาลองใหม่อีกครั้ง หรือเรียกพนักงาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerCancelOrder = async () => {
    if (!activeOrderId) return;
    setIsCancelling(true);
    try {
      await updateOrderStatus(activeOrderId, 'cancelled');
      setActiveOrderId(null);
      setTrackedOrder(null);
      localStorage.removeItem('afterwork_customer_active_order');
      setIsCancelModalOpen(false);
    } catch (err) {
      console.error('Cancel order error:', err);
      alert('ไม่สามารถยกเลิกออเดอร์ได้ กรุณาแจ้งพนักงานโดยตรงครับ');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full bg-[#f8fafc] text-slate-800 flex flex-col antialiased selection:bg-orange-500 selection:text-white pb-safe">
      
      {/* Customer Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-lg tracking-tight text-slate-900 leading-tight">
                AFTER<span className="text-orange-500">WORK</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">สั่งอาหารออนไลน์ส่งตรงถึงครัว</p>
            </div>
          </div>

          {/* Customer Name Indicator */}
          <div className="flex items-center gap-2">
            {customerName.trim() ? (
              <div className="bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold text-orange-700">
                <User className="w-3.5 h-3.5 text-orange-600" />
                <span className="max-w-[120px] truncate">{customerName}</span>
              </div>
            ) : (
              <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>ยังไม่ใส่ชื่อ</span>
              </span>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">

        {/* Live Order Tracking Banner (If customer has an ongoing order) */}
        {trackedOrder && (
          <div className="bg-white rounded-2xl border-2 border-orange-400 p-4 shadow-sm animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-900">
                  ออเดอร์ของ {trackedOrder.customerName} #{trackedOrder.id.slice(-5).toUpperCase()}
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                trackedOrder.status === 'completed' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : trackedOrder.status === 'ready'
                    ? 'bg-emerald-500 text-white animate-bounce'
                    : trackedOrder.status === 'cooking'
                      ? 'bg-orange-100 text-orange-700 animate-pulse'
                      : 'bg-amber-100 text-amber-800'
              }`}>
                {trackedOrder.status === 'completed' ? 'เสร็จสิ้นเรียบร้อย' : trackedOrder.status === 'ready' ? 'เสร็จแล้ว รับอาหารได้เลย!' : trackedOrder.status === 'cooking' ? 'กำลังทำอาหาร' : 'รับคิวแล้ว'}
              </span>
            </div>

            {/* Status Steps */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className={`p-2 rounded-xl border text-xs font-bold transition ${
                trackedOrder.status === 'active' 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                <Clock className="w-4 h-4 mx-auto mb-1" />
                <span>รับคิวแล้ว</span>
              </div>

              <div className={`p-2 rounded-xl border text-xs font-bold transition ${
                trackedOrder.status === 'cooking' 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm animate-pulse' 
                  : (trackedOrder.status === 'ready' || trackedOrder.status === 'completed')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <ChefHat className="w-4 h-4 mx-auto mb-1" />
                <span>กำลังปรุง</span>
              </div>

              <div className={`p-2 rounded-xl border text-xs font-bold transition ${
                trackedOrder.status === 'ready' 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm animate-bounce' 
                  : trackedOrder.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                <span>พร้อมเสิร์ฟ</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span className="font-bold text-slate-700">{trackedOrder.items.length} รายการ (รวม {trackedOrder.total.toLocaleString()} ฿)</span>
              {trackedOrder.status === 'completed' || trackedOrder.status === 'ready' ? (
                <button
                  onClick={() => {
                    setActiveOrderId(null);
                    setTrackedOrder(null);
                    localStorage.removeItem('afterwork_customer_active_order');
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg"
                >
                  ✓ สั่งรายการใหม่
                </button>
              ) : (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ขอยกเลิกออเดอร์</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer Cancel Order Confirmation Modal */}
        {isCancelModalOpen && trackedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">ยืนยันการยกเลิกออเดอร์?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ออเดอร์ของ <strong>{trackedOrder.customerName}</strong> จะถูกยกเลิกและแจ้งเตือนไปยังห้องครัวทันที
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  ไม่ยกเลิก
                </button>
                <button
                  onClick={handleCustomerCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Identity Box (Required Customer Name) */}
        <div className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3 ${
          nameError ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/20' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-orange-500" />
              <span>ชื่อของคุณลูกค้า <span className="text-rose-500">*จำเป็น</span></span>
            </label>
            <span className="text-[11px] text-slate-400">ระบบจะใช้เรียกชื่อเมื่ออาหารเสร็จ</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              placeholder="ระบุชื่อของคุณ (เช่น คุณมัด, พี่เอ, สมชาย)..."
              className={`w-full px-4 py-2.5 text-sm rounded-xl font-bold transition focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border border-rose-300 bg-white focus:ring-rose-400 text-rose-900 placeholder:text-rose-300'
                  : 'border border-slate-200 bg-slate-50 focus:bg-white focus:ring-orange-500 text-slate-900'
              }`}
            />
            {customerName.trim() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 bg-emerald-50 p-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {nameError && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>กรุณากรอกชื่อของคุณลูกค้าก่อนสั่ง เพื่อให้แม่ครัวทราบและเรียกรับอาหารได้ถูกต้องครับ</span>
            </p>
          )}

          {/* Search & Filter bar */}
          <div className="pt-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเมนูอาหาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs: Smooth horizontal touch scroll with no overflow */}
        <div className="w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth hide-scrollbar touch-pan-x">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Food Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-24">
          {filteredMenus.map((item) => {
            const inCart = cart.find(c => c.id === item.id);
            const isAvailable = item.available !== false;

            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-row sm:flex-col transition ${
                  !isAvailable ? 'opacity-60 grayscale' : 'hover:border-orange-300'
                }`}
              >
                {/* Image */}
                <div className="relative w-28 sm:w-full aspect-square sm:aspect-16/10 bg-slate-100 shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                      สินค้าหมด
                    </div>
                  )}
                </div>

                {/* Info & Add to cart */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2 leading-snug">
                      {item.name}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-base font-black text-slate-900">
                      {item.price} <span className="text-xs font-normal text-slate-500">฿</span>
                    </div>

                    {isAvailable && (
                      <div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-1">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-white text-orange-600 font-bold flex items-center justify-center shadow-xs active:scale-95 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-xs text-orange-700 w-4 text-center">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-7 h-7 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center shadow-xs active:scale-95 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>สั่ง</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 inset-x-3 max-w-xl mx-auto z-40 animate-fadeIn">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800 active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-orange-600 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemCount}
                </span>
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">ดูตะกร้าสั่งอาหาร</div>
                <div className="text-xs text-slate-400">{cart.length} เมนู • {customerName.trim() ? `คุณ ${customerName}` : 'ระบุชื่อเพื่อส่งครัว'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-orange-400">{totalAmount.toLocaleString()} ฿</span>
              <span className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-xl font-bold">
                ตรวจเช็ค ➔
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Cart Modal / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg text-slate-900">รายการอาหารในตะกร้า</h3>
                <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                  {totalItemCount} ชิ้น
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                      <span className="text-xs text-orange-600 font-semibold">{item.price} ฿ / รายการ</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction notes */}
                  <input
                    type="text"
                    placeholder="หมายเหตุ (เช่น เผ็ดน้อย, ไม่ใส่ผักชี)..."
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
              
              {/* Customer Name inside cart for clarity */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-500" />
                    <span>ชื่อของคุณลูกค้า:</span>
                  </span>
                  <span className="text-[11px] text-rose-500 font-semibold">*จำเป็น</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (e.target.value.trim()) setNameError(false);
                  }}
                  placeholder="กรุณากรอกชื่อของคุณลูกค้า (เช่น คุณมัด)..."
                  className={`w-full px-3 py-2 text-sm rounded-lg font-bold border transition ${
                    nameError 
                      ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-200' 
                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-orange-500 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">ยอดรวมทั้งหมด:</span>
                <span className="text-xl font-black text-orange-600">{totalAmount.toLocaleString()} ฿</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
                >
                  เลือกเมนูเพิ่ม
                </button>
                <button
                  onClick={handleSendOrder}
                  disabled={isSubmitting}
                  className="flex-2 py-3 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'กำลังส่งถึงครัว...' : 'ยืนยันสั่งอาหาร'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
