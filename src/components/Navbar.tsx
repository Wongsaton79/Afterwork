import React from 'react';
import { ViewMode } from '../types';
import { 
  Flame, 
  Utensils, 
  ChefHat, 
  LayoutDashboard, 
  Home, 
  History,
  ShieldCheck,
  Wifi,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  activeKitchenCount: number;
  duplicateCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  activeKitchenCount,
  duplicateCount
}) => {
  if (currentView === 'home') return null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectView('home')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-xl tracking-tight text-slate-900">
                AFTER<span className="text-orange-500">WORK</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">V.6.0</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-1 hidden sm:block">Restaurant POS & Kitchen System</p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectView('home')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              title="หน้าแรก"
            >
              <Home className="w-4 h-4" />
              <span className="hidden md:inline">หน้าแรก</span>
            </button>

            <button
              onClick={() => onSelectView('pos')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'pos'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>สั่งอาหาร (POS)</span>
            </button>

            <button
              onClick={() => onSelectView('kitchen')}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'kitchen'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>ครัว (KDS)</span>
              {activeKitchenCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full animate-pulse">
                  {activeKitchenCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('admin')}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>จัดการร้าน (Admin)</span>
              {duplicateCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full" title={`ตรวจพบเมนูซ้ำ ${duplicateCount} กลุ่ม`}>
                  !
                </span>
              )}
            </button>
          </nav>

          {/* Database indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Firebase Connected</span>
          </div>

        </div>
      </div>
    </header>
  );
};
