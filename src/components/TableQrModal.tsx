import React, { useState } from 'react';
import { QrCode, Printer, Copy, Check, ExternalLink, X, Utensils, Flame } from 'lucide-react';

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomerView: (table: string) => void;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomerView
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Build the customer URL strictly for name ordering
  const baseUrl = window.location.origin + window.location.pathname;
  const customerUrl = `${baseUrl}?mode=customer`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(customerUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">QR Code สั่งอาหาร (รับตามชื่อลูกค้า)</h3>
              <p className="text-[11px] text-slate-500">สแกนสั่งจากมือถือ กรอกชื่อ สั่งตรงเข้าครัว</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 bg-gradient-to-b from-orange-50/50 to-white rounded-2xl border-2 border-dashed border-orange-200 text-center space-y-3 print:border-solid">
          <div className="flex items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-sm tracking-tight">AFTER<span className="text-orange-500">WORK</span></span>
          </div>

          <div className="inline-block px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
            สแกนสั่งอาหาร (รับตามชื่อลูกค้า)
          </div>

          {/* QR Code Image */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 inline-block">
            <img 
              src={qrApiUrl} 
              alt="QR สั่งอาหารรับตามชื่อลูกค้า" 
              className="w-48 h-48 mx-auto"
            />
          </div>

          <p className="text-xs text-slate-800 font-bold">
            📱 สแกน QR Code แล้วพิมพ์ชื่อของคุณเพื่อสั่งอาหาร
          </p>
          <p className="text-[11px] text-slate-500">
            ระบบจะส่งตรงเข้าครัวและอ่านออกเสียงชื่อคุณลูกค้าทันที
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}</span>
            </button>

            <button
              onClick={() => onOpenCustomerView('')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดหน้าลูกค้า</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ QR Code (Print)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
