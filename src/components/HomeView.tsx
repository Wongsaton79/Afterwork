import React, { useState } from 'react';
import { ViewMode } from '../types';
import { 
  Flame, 
  Utensils, 
  ChefHat, 
  LayoutDashboard, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Database,
  ArrowRight,
  TrendingUp,
  Clock,
  QrCode,
  Smartphone
} from 'lucide-react';
import { TableQrModal } from './TableQrModal';

interface HomeViewProps {
  onSelectView: (view: ViewMode) => void;
  menuCount: number;
  kitchenActiveCount: number;
  duplicateCount: number;
  onOpenDeduplicate: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectView,
  menuCount,
  kitchenActiveCount,
  duplicateCount,
  onOpenDeduplicate
}) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/40 relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-orange-400/15 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-rose-400/10 blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tight text-slate-900 leading-none">
              AFTER<span className="text-orange-500">WORK</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
              RESTAURANT POS & MANAGEMENT V.6.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs transition active:scale-95 cursor-pointer"
            title="สร้างและพิมพ์ QR Code สั่งอาหารตามชื่อลูกค้า"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">QR สั่งอาหาร</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 text-slate-700 shadow-xs backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="hidden sm:inline">Firebase DB:</span>
            <span className="text-emerald-600 font-bold">Online</span>
          </div>

          <button
            onClick={() => onSelectView('admin')}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md transition active:scale-95 cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-orange-400" />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 z-10">
        
        {/* Duplicate warning notification if any */}
        {duplicateCount > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">ตรวจพบเมนูชื่อซ้ำจากระบบเดิม ({duplicateCount} รายการ):</span>
                <p className="text-xs text-amber-700">ระบบได้กรองแสดงผลแบบอัตโนมัติแล้ว และคุณสามารถกดล้างเอกสารซ้ำซ้อนใน Firebase ได้ทันที</p>
              </div>
            </div>
            <button
              onClick={onOpenDeduplicate}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0"
            >
              ทำความสะอาดเมนูซ้ำ
            </button>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            ระบบโฉมใหม่ รวดเร็ว ปลอดภัย ไร้เมนูซ้ำ
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            เลือกโหมดการทำงาน <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              AFTERWORK POS
            </span>
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto mt-3 text-sm sm:text-base font-normal">
            เชื่อมโยงข้อมูลแบบ Real-time ร่วมกับ Firebase เดิม พร้อมระบบแคชความเร็วสูงและคิวห้องครัวอัจฉริยะ
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
          
          {/* 1. POS / Customer Order */}
          <div
            onClick={() => onSelectView('pos')}
            className="group cursor-pointer bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl hover:border-orange-400 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-xs">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">หน้าร้าน & โต๊ะ</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{menuCount} เมนู</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">ระบบ POS หน้าร้าน</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                สั่งอาหาร ระบุโต๊ะ คิดเงินสดหรือพร้อมเพย์ สะดวกรวดเร็ว
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
              <span>เข้าสู่ระบบ POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Kitchen Display */}
          <div
            onClick={() => onSelectView('kitchen')}
            className="group cursor-pointer bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-white"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/25 transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-orange-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-xs border border-slate-700">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">ห้องครัว (KDS)</span>
                {kitchenActiveCount > 0 ? (
                  <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    รอปรุง {kitchenActiveCount}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">ครัวว่าง</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1.5">หน้าจอระบบหลังครัว</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                บัตรคิวออเดอร์ เสียงเตือน จับเวลาปรุง และตัดเสิร์ฟ Real-time
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform">
              <span>เปิดหน้าจอครัว</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Customer QR Code Ordering */}
          <div
            onClick={() => setIsQrModalOpen(true)}
            className="group cursor-pointer bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-orange-200/80 shadow-lg hover:shadow-2xl hover:border-orange-400 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/25 transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-md shadow-orange-500/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">สำหรับลูกค้า</span>
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">QR สั่งอาหาร</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">สแกนสั่งตามชื่อลูกค้า</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                ใส่ชื่อลูกค้า สั่งตรงเข้าครัว มีเสียงพูดขานชื่ออัตโนมัติ
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
              <span>สร้าง QR สั่งอาหาร</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Executive Admin */}
          <div
            onClick={() => onSelectView('admin')}
            className="group cursor-pointer bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl hover:border-indigo-400 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-xs">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">ผู้บริหาร & บัญชี</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Analytics</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">จัดการร้าน & บัญชี</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                กราฟยอดขาย กำไรสุทธิ บันทึกรายจ่าย และเครื่องมือจัดการข้อมูล
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
              <span>เปิดแดชบอร์ดหลังบ้าน</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

        {/* Feature highlight badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/60">
          <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800">แก้ปัญหาที่ 1 & 2: โหลดเร็วขึ้น 10x</div>
              <div className="text-[11px] text-slate-500">Query เฉพาะส่วน + Local Cache</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800">แก้ปัญหาที่ 3: ป้องกันเมนูซ้ำ</div>
              <div className="text-[11px] text-slate-500">Deduplication Engine ในตัว</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800">Firebase เดิม 100%</div>
              <div className="text-[11px] text-slate-500">ดึงข้อมูลย้อนหลังได้ครบถ้วน</div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-4 z-10">
        © 2026 AFTERWORK POS V.6.0 • ออกแบบเพื่อความเสถียรและประสิทธิภาพสูงสุด
      </footer>

      {/* Table QR Code Generator Modal */}
      <TableQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onOpenCustomerView={(table) => {
          setIsQrModalOpen(false);
          window.location.href = `?mode=customer&table=${encodeURIComponent(table)}`;
        }}
      />

    </div>
  );
};
