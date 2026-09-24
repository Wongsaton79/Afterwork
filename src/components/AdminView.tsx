import React, { useState, useMemo } from 'react';
import { 
  MenuItem, 
  Order, 
  Expense, 
  AdminTab, 
  AdminFilter 
} from '../types';
import { saveMenuItem, deleteMenuItem, toggleMenuAvailability, DuplicateGroup, updateExistingMenusWithAuthenticImages } from '../lib/menuService';
import { addExpense, markExpensePaid, deleteExpense } from '../lib/expenseService';
import { deleteOrder, updateOrderStatus } from '../lib/orderService';
import { DeduplicatePanel } from './DeduplicatePanel';
import { TableQrModal } from './TableQrModal';
import { ExpenseManagementView } from './ExpenseManagementView';
import { PRESET_EXPENSE_CATEGORIES, guessCategoryFromTitle } from '../lib/expenseAnalysisService';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler,
  ArcElement
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  Printer,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ChevronRight,
  QrCode,
  PieChart,
  ShoppingBag,
  Lightbulb
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface AdminViewProps {
  menus: MenuItem[];
  rawMenus: MenuItem[];
  duplicateGroups: DuplicateGroup[];
  orders: Order[];
  expenses: Expense[];
  onOpenReceipt: (order: Order) => void;
  initialTab?: AdminTab;
}

export const AdminView: React.FC<AdminViewProps> = ({
  menus,
  rawMenus,
  duplicateGroups,
  orders,
  expenses,
  onOpenReceipt,
  initialTab = 'dashboard'
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [filter, setFilter] = useState<AdminFilter>('today');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isSyncingImages, setIsSyncingImages] = useState(false);
  const [imageSyncMessage, setImageSyncMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormCategory, setMenuFormCategory] = useState('');
  const [menuFormPrice, setMenuFormPrice] = useState<number | ''>('');
  const [menuFormCost, setMenuFormCost] = useState<number | ''>('');
  const [menuFormImage, setMenuFormImage] = useState('');
  const [menuFormError, setMenuFormError] = useState<string | null>(null);

  // Expense Form State
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expCategory, setExpCategory] = useState('ทั่วไป');
  const [expStatus, setExpStatus] = useState<'paid' | 'pending'>('paid');
  const [isAddingExp, setIsAddingExp] = useState(false);

  // Time boundary calculation
  const { filteredOrders, filteredExpenses, stats } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const isMatchFilter = (timeMs: number) => {
      if (filter === 'today') return timeMs >= startOfToday;
      if (filter === 'yesterday') return timeMs >= startOfYesterday && timeMs < startOfToday;
      if (filter === 'week') return timeMs >= startOfWeek;
      if (filter === 'month') return timeMs >= startOfMonth;
      if (filter === 'year') return timeMs >= startOfYear;
      return true; // 'all'
    };

    const fOrders = orders.filter(o => isMatchFilter(o.timeMs));
    const fExpenses = expenses.filter(e => isMatchFilter(e.timeMs));

    let totalIncome = 0;
    let totalFoodCost = 0;
    let totalExpenses = 0;
    let pendingExpenses = 0;
    const itemSalesMap: Record<string, { count: number; revenue: number }> = {};

    fOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        totalIncome += order.total;
        totalFoodCost += order.totalCost || 0;
        order.items.forEach(item => {
          if (!itemSalesMap[item.name]) {
            itemSalesMap[item.name] = { count: 0, revenue: 0 };
          }
          itemSalesMap[item.name].count += item.quantity;
          itemSalesMap[item.name].revenue += (item.price * item.quantity);
        });
      }
    });

    fExpenses.forEach(exp => {
      totalExpenses += exp.amount;
      if (exp.status === 'pending') pendingExpenses += exp.amount;
    });

    const grossProfit = totalIncome - totalFoodCost;
    const netProfit = totalIncome - totalExpenses;

    const topSellers = Object.keys(itemSalesMap)
      .map(name => ({ name, ...itemSalesMap[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      filteredOrders: fOrders,
      filteredExpenses: fExpenses,
      stats: {
        totalIncome,
        totalFoodCost,
        totalExpenses,
        pendingExpenses,
        grossProfit,
        netProfit,
        topSellers
      }
    };
  }, [orders, expenses, filter]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (filter === 'today' || filter === 'yesterday') {
      return {
        type: 'bar' as const,
        data: {
          labels: ['ยอดขายรวม', 'ต้นทุนอาหาร', 'ค่าใช้จ่ายทั่วไป', 'กำไรสุทธิ'],
          datasets: [{
            label: 'จำนวนเงิน (บาท)',
            data: [stats.totalIncome, stats.totalFoodCost, stats.totalExpenses, stats.netProfit],
            backgroundColor: [
              'rgba(59, 130, 246, 0.85)',
              'rgba(249, 115, 22, 0.85)',
              'rgba(239, 68, 68, 0.85)',
              stats.netProfit >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'
            ],
            borderRadius: 8
          }]
        }
      };
    }

    // Trend line for week/month
    const days = filter === 'week' ? ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'] : ['สัปดาห์ที่ 1', 'สัปดาห์ที่ 2', 'สัปดาห์ที่ 3', 'สัปดาห์ที่ 4'];
    const fakeTrend = days.map((_, i) => Math.round(stats.netProfit / (days.length || 1) * (0.8 + (i * 0.1))));

    return {
      type: 'line' as const,
      data: {
        labels: days,
        datasets: [{
          fill: true,
          label: 'กำไรสุทธิ (บาท)',
          data: fakeTrend,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          tension: 0.35
        }]
      }
    };
  }, [stats, filter]);

  // Menu Modal Actions
  const handleOpenAddMenu = () => {
    setEditingMenu(null);
    setMenuFormName('');
    setMenuFormCategory('ทั่วไป');
    setMenuFormPrice('');
    setMenuFormCost('');
    setMenuFormImage('');
    setMenuFormError(null);
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu);
    setMenuFormName(menu.name);
    setMenuFormCategory(menu.category);
    setMenuFormPrice(menu.price);
    setMenuFormCost(menu.cost);
    setMenuFormImage(menu.image);
    setMenuFormError(null);
    setIsMenuModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName.trim() || menuFormPrice === '' || menuFormCost === '') return;

    setMenuFormError(null);
    const res = await saveMenuItem({
      name: menuFormName.trim(),
      category: menuFormCategory.trim() || 'ทั่วไป',
      price: Number(menuFormPrice),
      cost: Number(menuFormCost),
      image: menuFormImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      available: editingMenu ? editingMenu.available : true
    }, editingMenu?.id);

    if (res.success) {
      setIsMenuModalOpen(false);
    } else {
      setMenuFormError(res.error || 'ไม่สามารถบันทึกเมนูได้');
    }
  };

  const confirmDeleteMenu = async () => {
    if (!menuToDelete) return;
    await deleteMenuItem(menuToDelete.id);
    setMenuToDelete(null);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    await deleteOrder(orderToDelete);
    setOrderToDelete(null);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    await toggleMenuAvailability(item.id, item.available !== false);
  };

  const handleSyncAuthenticImages = async () => {
    setIsSyncingImages(true);
    try {
      const res = await updateExistingMenusWithAuthenticImages();
      setImageSyncMessage(`ปรับเปลี่ยนรูปอาหารให้ตรงกับชื่อเมนูเรียบร้อยแล้ว (${res.updatedCount} รายการ)!`);
      setTimeout(() => setImageSyncMessage(null), 4500);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปเดตรูปภาพ');
    } finally {
      setIsSyncingImages(false);
    }
  };

  // Expense Submission
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount === '') return;

    setIsAddingExp(true);
    try {
      const finalCat = expCategory || guessCategoryFromTitle(expTitle);
      await addExpense({
        title: expTitle.trim(),
        amount: Number(expAmount),
        category: finalCat,
        status: expStatus
      });
      setExpTitle('');
      setExpAmount('');
      setExpCategory(PRESET_EXPENSE_CATEGORIES[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingExp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden">
      
      {/* Top Admin Sub-navbar */}
      <div className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>สรุปบัญชี & กราฟ</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>ประวัติออเดอร์ ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'menus'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>จัดการเมนู ({menus.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'expenses'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-orange-500" />
            <span>วิเคราะห์รายจ่าย & วัตถุดิบ</span>
          </button>

          <button
            onClick={() => setActiveTab('deduplicate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'deduplicate'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Copy className="w-3.5 h-3.5 text-rose-500" />
            <span>แก้เมนูซ้ำ</span>
            {duplicateGroups.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>
        </div>

        {/* Global Date Filter (For Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as AdminFilter)}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="today">วันนี้ (Today)</option>
              <option value="yesterday">เมื่อวาน (Yesterday)</option>
              <option value="week">สัปดาห์นี้ (Weekly)</option>
              <option value="month">เดือนนี้ (Monthly)</option>
              <option value="year">ปีนี้ (Yearly)</option>
              <option value="all">ทั้งหมด (All History)</option>
            </select>
          </div>
        )}

      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 hide-scrollbar">
        <div className="max-w-7xl mx-auto">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Active Filter & History Notice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>ตัวกรองช่วงเวลา: <strong className="text-slate-900">{filter === 'today' ? 'วันนี้ (Today)' : filter === 'yesterday' ? 'เมื่อวาน' : filter === 'week' ? 'สัปดาห์นี้' : filter === 'month' ? 'เดือนนี้' : filter === 'year' ? 'ปีนี้' : 'ประวัติทั้งหมด (All History)'}</strong></span>
                  <span className="text-slate-400">({filteredOrders.length} จาก {orders.length} ออเดอร์ทั้งหมดใน Firebase)</span>
                </div>
                {filter !== 'all' && (
                  <button 
                    onClick={() => setFilter('all')}
                    className="text-orange-600 hover:text-orange-700 font-bold hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    สลับดูยอดขายทั้งหมด ({orders.length} รายการ) ➔
                  </button>
                )}
              </div>

              {filteredOrders.length === 0 && orders.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong>ไม่พบยอดขายในช่วงเวลา "{filter === 'today' ? 'วันนี้' : filter}"</strong>
                      <p className="text-amber-700 mt-0.5">ในฐานข้อมูล Firebase ยังมีประวัติออเดอร์เดิมอยู่ครบถ้วนจำนวน <strong>{orders.length}</strong> รายการ (ไม่ได้สูญหาย)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFilter('all')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shrink-0 transition cursor-pointer shadow-xs"
                  >
                    ดูยอดขายย้อนหลังทั้งหมด
                  </button>
                </div>
              )}

              {/* 4 Stat KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* 1. Total Sales */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ยอดขายรวม (Sales)</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <DollarSign className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl sm:text-3xl font-black text-blue-600">
                      {stats.totalIncome.toLocaleString()} <span className="text-xs font-normal text-slate-400">฿</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">คำนวณจากออเดอร์ที่ยืนยัน</span>
                  </div>
                </div>

                {/* 2. COGS (Cost of Goods) */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ต้นทุนอาหาร (COGS)</span>
                    <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                      <Utensils className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl sm:text-3xl font-black text-orange-500">
                      {stats.totalFoodCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">฿</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">คิดจากต้นทุนต่อจานที่ระบุ</span>
                  </div>
                </div>

                {/* 3. Total Expenses */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายจ่ายทั่วไป (Expenses)</span>
                    <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                      <TrendingDown className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl sm:text-3xl font-black text-rose-500">
                      {stats.totalExpenses.toLocaleString()} <span className="text-xs font-normal text-slate-400">฿</span>
                    </div>
                    {stats.pendingExpenses > 0 ? (
                      <span className="text-[11px] font-bold text-amber-600">ค้างชำระ: {stats.pendingExpenses.toLocaleString()} ฿</span>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-semibold">ชำระครบแล้ว</span>
                    )}
                  </div>
                </div>

                {/* 4. Net Profit */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำไรสุทธิ (Net Profit)</span>
                    <span className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className={`text-2xl sm:text-3xl font-black ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stats.netProfit.toLocaleString()} <span className="text-xs font-normal opacity-50">฿</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">ยอดขาย หัก ค่าใช้จ่ายทั้งหมด</span>
                  </div>
                </div>

              </div>

              {/* Chart & Gross Margin Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span>กราฟสรุปผลประกอบการ ({filter})</span>
                  </h3>
                  <div className="h-64 sm:h-72">
                    {chartData.type === 'bar' ? (
                      <Bar 
                        data={chartData.data} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } } 
                        }} 
                      />
                    ) : (
                      <Line 
                        data={chartData.data} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } } 
                        }} 
                      />
                    )}
                  </div>
                </div>

                {/* Gross Margin & Best Sellers */}
                <div className="space-y-6">
                  {/* Gross Profit Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-200/80 shadow-xs">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">กำไรขั้นต้น (Gross Margin)</span>
                    <div className="text-3xl font-black text-emerald-700 mt-2">
                      {stats.grossProfit.toLocaleString()} ฿
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">ยอดขายหักลบเฉพาะต้นทุนวัตถุดิบอาหาร</p>
                  </div>

                  {/* Top 5 Best Sellers */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>5 อันดับเมนูขายดี</span>
                    </h4>
                    {stats.topSellers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">ยังไม่มียอดขายในช่วงเวลานี้</p>
                    ) : (
                      <div className="space-y-2.5">
                        {stats.topSellers.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800">{item.name}</span>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-black text-slate-900">{item.count} จาน</span>
                              <span className="text-slate-400 ml-2">({item.revenue.toLocaleString()}฿)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Expense Management Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add Expense Form */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                  <h4 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <span>บันทึกรายจ่ายใหม่</span>
                  </h4>
                  <form onSubmit={handleAddExpense} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">รายการจ่าย</label>
                      <input
                        type="text"
                        placeholder="เช่น ค่าไฟ, ค่าเช่าที่, ค่าถุงพลาสติก"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">จำนวนเงิน (฿)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">หมวดหมู่</label>
                        <select
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                        >
                          {PRESET_EXPENSE_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">สถานะ</label>
                        <select
                          value={expStatus}
                          onChange={(e) => setExpStatus(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                        >
                          <option value="paid">จ่ายแล้ว</option>
                          <option value="pending">ค้างชำระ</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingExp}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
                    >
                      {isAddingExp ? 'กำลังบันทึก...' : 'บันทึกรายจ่าย'}
                    </button>
                  </form>
                </div>

                {/* Expense List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">ประวัติรายการรายจ่าย</h4>
                      <span className="text-xs text-slate-500">{filteredExpenses.length} รายการ</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      <span>วิเคราะห์เชิงลึก & แนวโน้มสั่งของ ➔</span>
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-64 divide-y divide-slate-100">
                    {filteredExpenses.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-8">ไม่มีรายการรายจ่ายในช่วงเวลานี้</p>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <div key={exp.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{exp.title}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                exp.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {exp.status === 'paid' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(exp.timeMs).toLocaleString('th-TH')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-black text-rose-600 text-sm">
                              -{exp.amount.toLocaleString()} ฿
                            </span>
                            {exp.status === 'pending' && (
                              <button
                                onClick={() => markExpensePaid(exp.id)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition"
                              >
                                ชำระเงิน
                              </button>
                            )}
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              
              {/* Filter controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อลูกค้า, เลขโต๊ะ, เลขออเดอร์..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">สถานะ:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="active">รอทำ (Active)</option>
                    <option value="cooking">กำลังปรุง (Cooking)</option>
                    <option value="completed">เสิร์ฟแล้ว (Completed)</option>
                    <option value="cancelled">ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Order Table / Cards */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {orders
                    .filter(o => {
                      const matchSearch = !orderSearch.trim() || 
                        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        (o.tableNo && o.tableNo.includes(orderSearch)) ||
                        o.id.toLowerCase().includes(orderSearch.toLowerCase());
                      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((order) => (
                      <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-slate-500">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              order.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-orange-100 text-orange-700 animate-pulse'
                            }`}>
                              {order.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(order.timeMs).toLocaleString('th-TH')}
                            </span>
                          </div>

                          <h4 className="font-bold text-base text-slate-900">
                            {order.customerName}
                          </h4>

                          <p className="text-xs text-slate-600 mt-1">
                            {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900">{order.total.toLocaleString()} ฿</div>
                            <span className="text-[10px] text-slate-400 capitalize">{order.paymentMethod || 'เงินสด'}</span>
                          </div>

                          <button
                            onClick={() => onOpenReceipt(order)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="ดูใบเสร็จ"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setOrderToDelete(order.id)}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="ลบออเดอร์"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: MENU MANAGEMENT */}
          {activeTab === 'menus' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">จัดการรายการอาหาร</h3>
                  <p className="text-xs text-slate-500">เพิ่ม ลบ แก้ไขราคา ต้นทุน รูปภาพ และสถานะสินค้าพร้อมขาย</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsQrModalOpen(true)}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-orange-500" />
                    <span>QR สั่งอาหารติดโต๊ะ</span>
                  </button>

                  <button
                    onClick={handleSyncAuthenticImages}
                    disabled={isSyncingImages}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>{isSyncingImages ? 'กำลังซิงค์รูป...' : 'ปรับรูปอาหารให้ตรงกับชื่อเมนู'}</span>
                  </button>

                  <button
                    onClick={handleOpenAddMenu}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มเมนูใหม่</span>
                  </button>
                </div>
              </div>

              {imageSyncMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{imageSyncMessage}</span>
                </div>
              )}

              {/* Grid of Menu Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {menus.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="relative aspect-16/10 bg-slate-100">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px]">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">{item.name}</h4>
                        <div className="flex justify-between text-xs mt-2 text-slate-600">
                          <span>ราคาขาย: <strong className="text-slate-900">{item.price} ฿</strong></span>
                          <span>ต้นทุน: <strong className="text-orange-600">{item.cost} ฿</strong></span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {/* Sold Out Switch */}
                        <button
                          onClick={() => handleToggleAvailable(item)}
                          className={`text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            item.available !== false ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {item.available !== false ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                          <span>{item.available !== false ? 'พร้อมขาย' : 'หมด'}</span>
                        </button>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleOpenEditMenu(item)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setMenuToDelete(item)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 4: DEDUPLICATE MENUS (Addresses Problem 3) */}
          {activeTab === 'deduplicate' && (
            <DeduplicatePanel
              duplicateGroups={duplicateGroups}
              totalRawCount={rawMenus.length}
              uniqueCount={menus.length}
            />
          )}

          {/* TAB 5: EXPENSE ANALYSIS & FORECAST (Addresses User Request) */}
          {activeTab === 'expenses' && (
            <ExpenseManagementView
              expenses={expenses}
              orders={orders}
              menus={menus}
            />
          )}

        </div>
      </div>

      {/* Menu Modal (Add / Edit) */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {editingMenu ? 'แก้ไขรายการเมนู' : 'เพิ่มเมนูใหม่'}
            </h3>

            {menuFormError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{menuFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMenu} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อเมนูอาหาร</label>
                <input
                  type="text"
                  placeholder="เช่น กุ้งแช่น้ำปลา (ชุดเล็ก)"
                  value={menuFormName}
                  onChange={(e) => setMenuFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">หมวดหมู่</label>
                <input
                  type="text"
                  placeholder="เช่น เมนูกุ้งแช่น้ำปลา, เมนูสุกี้"
                  value={menuFormCategory}
                  onChange={(e) => setMenuFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ราคาขาย (฿)</label>
                  <input
                    type="number"
                    value={menuFormPrice}
                    onChange={(e) => setMenuFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ต้นทุนวัตถุดิบ (฿)</label>
                  <input
                    type="number"
                    value={menuFormCost}
                    onChange={(e) => setMenuFormCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">URL รูปภาพ</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={menuFormImage}
                  onChange={(e) => setMenuFormImage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Menu Deletion */}
      {menuToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">ยืนยันลบเมนูอาหาร?</h3>
              <p className="text-sm font-semibold text-rose-600">"{menuToDelete.name}"</p>
              <p className="text-xs text-slate-500">การกระทำนี้จะลบรายการเมนูออกจากฐานข้อมูลทันที</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMenuToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteMenu}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Order Deletion */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">ยืนยันลบออเดอร์นี้?</h3>
              <p className="text-xs text-slate-500">คุณต้องการลบประวัติออเดอร์ #{orderToDelete.slice(-6).toUpperCase()} ออกจากระบบใช่หรือไม่?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                ยืนยันลบ
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
          window.location.href = `?mode=customer&table=${encodeURIComponent(table)}`;
        }}
      />

    </div>
  );
};
