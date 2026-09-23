import React from 'react';
import { Order } from '../types';
import { Printer, X, CheckCircle2, UtensilsCrossed } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const orderDate = new Date(order.timeMs).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base">ใบเสร็จรับเงิน / ใบสั่งรายการ</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body (Paper style) */}
        <div className="p-6 overflow-y-auto font-mono text-sm bg-slate-50 border-b border-dashed border-slate-300 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black font-sans tracking-tight text-slate-900">AFTERWORK</h2>
            <p className="text-xs text-slate-500 font-sans">ระบบจัดการร้านอาหาร & จุดจำหน่าย</p>
            <p className="text-xs text-slate-400">----------------------------------------</p>
          </div>

          <div className="space-y-1 text-xs text-slate-600 font-sans">
            <div className="flex justify-between">
              <span>เลขออเดอร์:</span>
              <span className="font-bold text-slate-800">#{order.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>ชื่อลูกค้า:</span>
              <span className="font-bold text-slate-800">
                {order.customerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span>ประเภท:</span>
              <span>{order.orderType === 'takeaway' ? '🥡 สั่งกลับบ้าน (Takeaway)' : '🍽️ ทานที่ร้าน (Dine-in)'}</span>
            </div>
            <div className="flex justify-between">
              <span>วัน-เวลา:</span>
              <span>{orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span>สถานะ:</span>
              <span className="font-bold text-emerald-600 uppercase">{order.status}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">----------------------------------------</p>

          {/* Item List */}
          <div className="space-y-2 font-sans">
            <div className="flex justify-between text-xs font-bold text-slate-500 border-b pb-1">
              <span>รายการ</span>
              <span>จำนวน</span>
              <span className="text-right">ราคา</span>
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-800">
                <div className="flex-1 pr-2">
                  <div className="font-semibold">{item.name}</div>
                  {item.notes && <div className="text-[10px] text-orange-600 italic">*{item.notes}</div>}
                </div>
                <div className="w-12 text-center text-slate-500">x{item.quantity}</div>
                <div className="w-16 text-right font-bold">{(item.price * item.quantity).toLocaleString()} ฿</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center">----------------------------------------</p>

          {/* Totals */}
          <div className="space-y-1 font-sans text-sm">
            <div className="flex justify-between text-base font-black text-slate-900">
              <span>ยอดรวมทั้งสิ้น</span>
              <span className="text-orange-600">{order.total.toLocaleString()} บาท</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>การชำระเงิน</span>
              <span className="capitalize">{order.paymentMethod || 'เงินสด (Cash)'}</span>
            </div>
          </div>

          <div className="text-center pt-2 text-xs text-slate-400 font-sans">
            <p>🙏 ขอบพระคุณที่ใช้บริการ AFTERWORK</p>
            <p className="text-[10px] text-slate-400 mt-0.5">V.6.0 Fast & Reliable Cloud Edition</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>
    </div>
  );
};
