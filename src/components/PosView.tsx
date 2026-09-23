import React, { useState, useMemo } from 'react';
import { MenuItem, CartItem, Order } from '../types';
import { submitOrder } from '../lib/orderService';
import confetti from 'canvas-confetti';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Utensils, 
  X, 
  Sparkles,
  ArrowRight,
  Receipt,
  User,
  Coffee,
  Coins,
  QrCode,
  CreditCard,
  ChefHat
} from 'lucide-react';
import { TableQrModal } from './TableQrModal';

interface PosViewProps {
  menus: MenuItem[];
  onOrderCreated?: (orderId: string) => void;
  onOpenReceipt?: (order: Order) => void;
  onOpenCustomerView?: (table: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({ menus, onOrderCreated, onOpenReceipt, onOpenCustomerView }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNo, setTableNo] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  
  // Checkout & Payment modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<{ id: string; total: number } | null>(null);

  // Mobile cart drawer
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Note editing modal
  const [editingItemNote, setEditingItemNote] = useState<{ id: string; note: string } | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    menus.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return ['ทั้งหมด', ...Array.from(set)];
  }, [menus]);

  // Filtered menus
  const filteredMenus = useMemo(() => {
    return menus.filter(item => {
      const matchCat = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menus, selectedCategory, searchQuery]);

  // Cart totals
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null);
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('คุณต้องการล้างตะกร้าสินค้าทั้งหมดใช่หรือไม่?')) {
      setCart([]);
    }
  };

  const handleSaveNote = () => {
    if (!editingItemNote) return;
    setCart(prev => prev.map(i => i.id === editingItemNote.id ? { ...i, notes: editingItemNote.note } : i));
    setEditingItemNote(null);
  };

  // Checkout submission
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(totalAmount);
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalCustName = customerName.trim() || (tableNo ? `โต๊ะ ${tableNo}` : 'ลูกค้าหน้าร้าน');
      
      const orderId = await submitOrder({
        customerName: finalCustName,
        tableNo: tableNo.trim(),
        orderType,
        items: cart,
        paymentMethod,
        paymentStatus: 'paid'
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }

      setOrderSuccessData({ id: orderId, total: totalAmount });
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      
      if (onOrderCreated) {
        onOrderCreated(orderId);
      }
    } catch (err) {
      console.error('Submit order failed:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกออเดอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNextOrder = () => {
    setCart([]);
    setCustomerName('');
    setTableNo('');
    setOrderSuccessData(null);
  };

  const changeDue = typeof cashReceived === 'number' ? Math.max(0, cashReceived - totalAmount) : 0;

  return (
    <div className="w-full max-w-full flex-1 flex flex-col md:flex-row min-h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] overflow-x-hidden bg-slate-100">

      {/* Main Menu Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
        
        {/* Top Filter Bar */}
        <div className="w-full max-w-full p-3.5 sm:p-5 bg-white border-b border-slate-200/80 shrink-0 space-y-2.5 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่ออาหาร, หมวดหมู่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ล้าง
                </button>
              )}
            </div>

            {/* Quick table/name display and QR modal trigger */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0">
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold border border-orange-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="สร้าง QR Code ให้ลูกค้าสแกนสั่งอาหาร"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR สั่งอาหาร</span>
              </button>

              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                <span className="font-semibold text-slate-400">รายการ:</span>
                <span className="font-bold text-orange-600">
                  {filteredMenus.length} เมนู
                </span>
              </div>
            </div>
          </div>

          {/* Category Tabs: Mobile perfect responsive container with smooth horizontal swipe */}
          <div className="w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scroll-smooth hide-scrollbar touch-pan-x">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Menu Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 hide-scrollbar">
          {filteredMenus.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
              <Coffee className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-base">ไม่พบเมนูอาหาร</p>
              <p className="text-xs">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 pb-24 md:pb-6">
              {filteredMenus.map((item) => {
                const inCartItem = cart.find(c => c.id === item.id);
                const quantityInCart = inCartItem ? inCartItem.quantity : 0;
                const isAvailable = item.available !== false;

                return (
                  <div
                    key={item.id}
                    onClick={() => isAvailable && handleAddToCart(item)}
                    className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                      !isAvailable
                        ? 'opacity-60 cursor-not-allowed border-slate-200'
                        : quantityInCart > 0
                        ? 'border-orange-500 shadow-md ring-2 ring-orange-500/20'
                        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Category chip */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium">
                        {item.category}
                      </span>

                      {/* Quantity badge in image */}
                      {quantityInCart > 0 && (
                        <div className="absolute top-2 right-2 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                          {quantityInCart}
                        </div>
                      )}

                      {!isAvailable && (
                        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm">
                          สินค้าหมด (Sold Out)
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-orange-600 transition-colors">
                          {item.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-base font-black text-slate-900">{item.price}</span>
                          <span className="text-xs text-slate-500 ml-1">฿</span>
                        </div>

                        {quantityInCart > 0 ? (
                          <div 
                            className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-slate-900">{quantityInCart}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-md bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center text-xs font-bold transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!isAvailable}
                            className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Desktop Cart Sidebar */}
      <div className="hidden md:flex w-96 bg-white border-l border-slate-200 flex-col shrink-0 shadow-lg">
        {/* Order settings header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-base text-slate-800">รายการสั่งซื้อ</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {/* Dine-in vs Takeaway Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 rounded-lg transition-all ${
                orderType === 'dine_in' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🍽️ ทานที่ร้าน
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`py-1.5 rounded-lg transition-all ${
                orderType === 'takeaway' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🥡 สั่งกลับบ้าน
            </button>
          </div>

          {/* Customer Name Input (Primary) */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="ระบุชื่อลูกค้า (เช่น คุณมัด, ลูกค้าหน้าร้าน)..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-10">
              <ShoppingBag className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-sm font-semibold">ยังไม่มีรายการในตะกร้า</p>
              <p className="text-xs">คลิกที่เมนูอาหารด้านซ้ายเพื่อเพิ่มรายการ</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h5 className="font-bold text-xs text-slate-800 leading-tight">{item.name}</h5>
                    <span className="text-[11px] text-slate-500">{item.price} ฿ / ที่</span>
                  </div>
                  <span className="font-black text-xs text-slate-900">
                    {(item.price * item.quantity).toLocaleString()} ฿
                  </span>
                </div>

                {/* Notes if any */}
                {item.notes ? (
                  <div className="flex items-center justify-between text-[11px] text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                    <span>โน้ต: {item.notes}</span>
                    <button 
                      onClick={() => setEditingItemNote({ id: item.id, note: item.notes || '' })}
                      className="text-[10px] text-orange-600 underline font-semibold ml-2"
                    >
                      แก้
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingItemNote({ id: item.id, note: '' })}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium block"
                  >
                    + เพิ่มโน้ตพิเศษ (เช่น เผ็ดน้อย)
                  </button>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-500 transition p-1"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 font-bold shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Button */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>จำนวนรวม</span>
              <span className="font-bold text-slate-800">{totalItemsCount} รายการ</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
              <span>ยอดรวมทั้งสิ้น</span>
              <span className="text-xl text-orange-600">{totalAmount.toLocaleString()} ฿</span>
            </div>
          </div>

          <button
            onClick={handleProceedToCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              cart.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:brightness-105 active:scale-98 shadow-orange-500/25'
            }`}
          >
            <span>ชำระเงิน & ส่งเข้าครัว</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Mobile Sticky Floating Cart Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="bg-slate-900 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-3 active:scale-95 transition-all border border-slate-800"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-orange-400" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </div>
          <div className="text-left leading-tight">
            <div className="text-[10px] text-slate-400">ยอดรวม</div>
            <div className="text-sm font-black text-white">{totalAmount.toLocaleString()} ฿</div>
          </div>
          <ArrowRight className="w-4 h-4 text-orange-400 ml-1" />
        </button>
      </div>

      {/* Mobile Cart Drawer Modal */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="flex-1" 
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-base text-slate-800">ตะกร้าของคุณ ({totalItemsCount})</h3>
              </div>
              <button 
                onClick={() => setIsMobileCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer name input */}
            <div>
              <input
                type="text"
                placeholder="ระบุชื่อลูกค้า (เช่น คุณมัด, ลูกค้าหน้าร้าน)..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            {/* Cart Items */}
            <div className="overflow-y-auto max-h-[40vh] space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-500">{item.price} ฿ x {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-900">{(item.price * item.quantity).toLocaleString()} ฿</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 bg-white rounded-md border text-xs font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 bg-orange-500 text-white rounded-md text-xs font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total and Checkout */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-lg font-black text-slate-900">
                <span>ยอดรวม</span>
                <span className="text-orange-600">{totalAmount.toLocaleString()} ฿</span>
              </div>
              <button
                onClick={handleProceedToCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20"
              >
                ดำเนินการชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Editing Modal */}
      {editingItemNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-bold text-slate-900 text-sm">เพิ่มข้อความพิเศษสำหรับห้องครัว</h4>
            <input
              type="text"
              value={editingItemNote.note}
              onChange={(e) => setEditingItemNote({ ...editingItemNote, note: e.target.value })}
              placeholder="เช่น เผ็ดน้อย, ไม่ใส่หอม, แยกน้ำจิ้ม"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItemNote(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">Checkout</span>
                <h3 className="text-xl font-black">ชำระเงินและส่งออเดอร์</h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Summary Card */}
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200/80 flex justify-between items-center">
                <div>
                  <div className="text-xs text-orange-800 font-medium">
                    {customerName ? customerName : 'ลูกค้าหน้าร้าน'} {tableNo ? `(โต๊ะ ${tableNo})` : ''} • {orderType === 'takeaway' ? 'กลับบ้าน' : 'ทานที่ร้าน'}
                  </div>
                  <div className="text-xs text-orange-600 mt-0.5">{totalItemsCount} รายการอาหาร</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-600">{totalAmount.toLocaleString()} ฿</div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">ช่องทางการชำระเงิน</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold ring-2 ring-orange-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Coins className="w-5 h-5" />
                    <span className="text-xs">เงินสด (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('promptpay')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'promptpay'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs">สแกน QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">บัตร / อื่นๆ</span>
                  </button>
                </div>
              </div>

              {/* Cash Calculation View */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600">รับเงินสดมา (บาท)</label>
                    <span className="text-xs font-semibold text-slate-400">คลิกเลือกยอดด่วนได้:</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                      className="flex-1 px-4 py-2.5 text-lg font-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                      placeholder="0"
                    />
                  </div>

                  {/* Quick cash denomination chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[totalAmount, 100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt)}
                        className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs"
                      >
                        {amt === totalAmount ? 'พอดี' : `${amt} ฿`}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                    <span className="font-semibold text-slate-600">เงินทอน (Change):</span>
                    <span className={`text-xl font-black ${changeDue >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {changeDue.toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              )}

              {/* QR PromptPay Mock Preview */}
              {paymentMethod === 'promptpay' && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <QrCode className="w-32 h-32 text-slate-800" />
                  </div>
                  <div className="font-bold text-sm text-slate-800">สแกนชำระ {totalAmount.toLocaleString()} บาท</div>
                  <div className="text-xs text-slate-500">พร้อมเพย์ร้าน AFTERWORK (Auto Check)</div>
                </div>
              )}

            </div>

            {/* Confirm buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 text-sm"
              >
                ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="flex-2 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-105 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>กำลังส่งเข้าครัว...</span>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    <span>ยืนยันออเดอร์ (ส่งเข้าครัว)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">สั่งอาหารสำเร็จ!</h3>
              <p className="text-xs text-slate-500 mt-1">ออเดอร์ถูกส่งไปยังหน้าจอห้องครัว (KDS) เรียบร้อยแล้ว</p>
              <div className="mt-3 inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-mono font-bold">
                Order #{orderSuccessData.id.slice(-6).toUpperCase()}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleResetForNextOrder}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition"
              >
                เริ่มรับออเดอร์ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table QR Code Generator Modal */}
      <TableQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onOpenCustomerView={(table) => {
          setIsQrModalOpen(false);
          if (onOpenCustomerView) {
            onOpenCustomerView(table);
          } else {
            window.location.href = `?mode=customer&table=${encodeURIComponent(table)}`;
          }
        }}
      />

    </div>
  );
};
