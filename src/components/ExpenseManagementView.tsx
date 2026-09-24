import React, { useState } from 'react';
import { Expense, Order, MenuItem } from '../types';
import { 
  analyzeExpensesAndForecast, 
  PRESET_EXPENSE_CATEGORIES, 
  CATEGORY_COLORS,
  guessCategoryFromTitle
} from '../lib/expenseAnalysisService';
import { addExpense, markExpensePaid, deleteExpense, updateExpenseCategory } from '../lib/expenseService';
import { 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShoppingBag, 
  ArrowUpRight, 
  PiggyBank, 
  Lightbulb, 
  Check, 
  Edit3, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';

interface ExpenseManagementViewProps {
  expenses: Expense[];
  orders: Order[];
  menus: MenuItem[];
}

export const ExpenseManagementView: React.FC<ExpenseManagementViewProps> = ({
  expenses,
  orders,
  menus
}) => {
  // New Expense form state
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expCategory, setExpCategory] = useState<string>('วัตถุดิบสด (หมู/ไก่/เนื้อ)');
  const [expStatus, setExpStatus] = useState<'paid' | 'pending'>('paid');
  const [expNotes, setExpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter & Search states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-categorize uncategorized items batch state
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  // Analysis result
  const analysis = React.useMemo(() => {
    return analyzeExpensesAndForecast(expenses, orders, menus);
  }, [expenses, orders, menus]);

  // Handle title change with smart auto-category suggestion
  const handleTitleChange = (val: string) => {
    setExpTitle(val);
    if (val.trim().length >= 2) {
      const suggested = guessCategoryFromTitle(val);
      if (suggested !== 'เบ็ดเตล็ด/ทั่วไป') {
        setExpCategory(suggested);
      }
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount === '' || Number(expAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      await addExpense({
        title: expTitle.trim(),
        amount: Number(expAmount),
        category: expCategory,
        status: expStatus,
        notes: expNotes.trim()
      });
      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
      setStatusMessage('บันทึกรายจ่ายเรียบร้อยแล้ว');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกรายจ่าย');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto categorize older/uncategorized expenses with 1 click
  const handleBatchAutoCategorize = async () => {
    const uncat = expenses.filter(e => !e.category || e.category === 'ทั่วไป');
    if (uncat.length === 0) {
      setStatusMessage('รายการรายจ่ายทั้งหมดมีหมวดหมู่ที่เหมาะสมเรียบร้อยแล้ว');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsAutoCategorizing(true);
    try {
      for (const item of uncat) {
        const guessed = guessCategoryFromTitle(item.title);
        await updateExpenseCategory(item.id, guessed);
      }
      setStatusMessage(`จัดหมวดหมู่อัตโนมัติให้ ${uncat.length} รายการสำเร็จ!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการจัดหมวดหมู่');
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  // Filtered expense list
  const filteredList = expenses.filter(e => {
    const effectiveCat = (!e.category || e.category === 'ทั่วไป') ? guessCategoryFromTitle(e.title) : e.category;
    const matchCat = filterCategory === 'all' || effectiveCat === filterCategory;
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchQuery = !searchQuery.trim() || e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStatus && matchQuery;
  });

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Top Banner & AI Recommendation Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ระบบวิเคราะห์หมวดหมู่ & แนวโน้มการซื้อวัตถุดิบล่วงหน้า</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              วิเคราะห์รายจ่าย & แนะนำการสั่งซื้อวันถัดไป
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ติดตามสัดส่วนค่าใช้จ่ายร้านอาหาร เจาะลึกหมวดหมู่ที่ใช้เงินมากที่สุด พร้อมคำนวณการสั่งของสด (หมู/กุ้ง/ซีฟู้ด) ในวันพรุ่งนี้จากยอดขายจริง
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBatchAutoCategorize}
              disabled={isAutoCategorizing}
              className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAutoCategorizing ? 'กำลังวิเคราะห์...' : 'AI วิเคราะห์จัดหมวดหมู่อัตโนมัติ'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: PURCHASING FORECAST FOR TOMORROW (User Request 2) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                🥩
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                การวิเคราะห์แนวโน้มการซื้อวัตถุดิบวันพรุ่งนี้ (Stock Purchasing Forecast)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              คำนวณจากยอดออเดอร์ของวันนี้ + อัตราการใช้วัตถุดิบจริง + การสำรองเผื่อช่วงสุดสัปดาห์
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 self-start sm:self-auto">
            อัปเดตแบบเรียลไทม์
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysis.forecasts.map((fc, i) => (
            <div key={i} className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{fc.icon}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    fc.trend === 'up' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {fc.trend === 'up' ? '📈 กำลังซื้อเพิ่ม' : '⚖️ ยอดนิ่งคงที่'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">{fc.ingredient}</h4>
                <div className="text-[11px] text-slate-500 mb-2">
                  ยอดใช้วันนี้โดยประมาณ: <strong className="text-slate-700">{fc.todayUsageEst}</strong>
                </div>

                {/* Highlight tomorrow recommended box */}
                <div className="p-3 bg-white rounded-xl border border-orange-200/80 mb-2.5 shadow-2xs">
                  <span className="text-[10px] text-orange-600 font-bold block uppercase tracking-wider">
                    ควรซื้อพรุ่งนี้:
                  </span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">
                    {fc.tomorrowRecommend}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({fc.safetyBuffer})
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {fc.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: EXPENSE CATEGORY BREAKDOWN & FORM (User Request 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Add Expense Form with Smart Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">บันทึกรายจ่ายร้านอาหาร</h4>
                <p className="text-[11px] text-slate-500">พิมพ์ชื่อรายการ ระบบจะเลือกหมวดหมู่ให้ล่วงหน้า</p>
              </div>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  รายการรายจ่าย
                </label>
                <input
                  type="text"
                  placeholder="เช่น ซื้อหมูสามชั้น 5 กก., ซื้อกุ้งขาว, ค่าแก๊ส 2 ถัง"
                  value={expTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>หมวดหมู่รายจ่าย</span>
                  <span className="text-[10px] text-orange-600 font-normal">เลือกตามที่ระบบช่วยจัด</span>
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-800"
                >
                  {PRESET_EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    จำนวนเงิน (฿)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    สถานะการจ่าย
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-800"
                  >
                    <option value="paid">จ่ายแล้ว</option>
                    <option value="pending">ค้างชำระ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  หมายเหตุ / แหล่งซื้อ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตลาดสดตอนเช้า, ร้านขายส่ง"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายจ่าย'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Category Breakdown & Spending Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  <span>สัดส่วนค่าใช้จ่ายตามหมวดหมู่ (Spending by Category)</span>
                </h4>
                <p className="text-xs text-slate-500">ดูว่าร้านอาหารนี้ใช้จ่ายเงินไปกับหมวดหมู่ไหนมากที่สุด</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">รวมค่าใช้จ่ายทั้งหมด</span>
                <span className="text-lg font-black text-rose-600">{analysis.totalExpense.toLocaleString()} บาท</span>
              </div>
            </div>

            {/* Highest Spending Banner */}
            {analysis.highestSpendingAmount > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-between text-xs mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    หมวดที่จ่ายเยอะที่สุดคือ: <strong className="text-rose-900">{analysis.highestSpendingCategory}</strong>
                  </span>
                </div>
                <span className="font-black text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                  {analysis.highestSpendingAmount.toLocaleString()} ฿ ({Math.round((analysis.highestSpendingAmount / (analysis.totalExpense || 1)) * 100)}%)
                </span>
              </div>
            )}

            {/* Category Bars */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
              {analysis.breakdowns.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10">ยังไม่มีข้อมูลรายจ่ายที่บันทึกไว้</p>
              ) : (
                analysis.breakdowns.map((cat, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                        <span>{cat.category}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({cat.count} รายการ)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{cat.totalAmount.toLocaleString()} ฿</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${Math.max(2, cat.percentage)}%`, 
                          backgroundColor: cat.color 
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

      {/* SECTION 3: COST SAVINGS & BUDGET OPTIMIZATION (User Request 3) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <PiggyBank className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              กลยุทธ์การลดค่าใช้จ่าย & เซฟงบประมาณ เพื่อเพิ่มผลกำไร (Cost Saving Insights)
            </h3>
            <p className="text-xs text-slate-500">
              คำแนะนำรูปธรรมในการปรับลดต้นทุนวัตถุดิบและค่าใช้จ่ายดำเนินการ ให้ร้านเหลือกำไรเข้ากระเป๋ามากขึ้น
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {analysis.costSavings.map((saving, i) => (
            <div key={i} className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {saving.category}
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    {saving.potentialSaving}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug">{saving.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{saving.description}</p>
              </div>

              <div className="pt-2 border-t border-emerald-200/50 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">แนวทางปฏิบัติทันที:</span>
                {saving.actionableSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: INNOVATION & BUSINESS GROWTH SUGGESTIONS (User Request 4) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ข้อเสนอแนะในการพัฒนาร้านและสิ่งใหม่ๆ (Innovation & Growth Opportunities)
            </h3>
            <p className="text-xs text-slate-500">
              ไอเดียต่อยอดร้านอาหาร Afterwork เพื่อเพิ่มยอดขาย ขยายฐานลูกค้า และสร้างจุดเด่นที่แตกต่าง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysis.growthSuggestions.map((sug, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:border-slate-300 transition">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mb-2 ${sug.badgeColor}`}>
                  {sug.tag}
                </span>
                <h4 className="font-bold text-sm text-slate-900 leading-snug">{sug.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sug.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <div className="text-[11px] font-bold text-emerald-700">{sug.benefit}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ผลกระทบ: {sug.impactScore}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: DETAILED EXPENSE HISTORY TABLE */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-base text-slate-900">รายการประวัติรายจ่ายทั้งหมด</h4>
            <p className="text-xs text-slate-500">ค้นหา กรอง และตรวจสอบสถานะการชำระเงินของแต่ละรายการ</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="ค้นหาชื่อรายการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {PRESET_EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="paid">จ่ายแล้ว</option>
              <option value="pending">ค้างชำระ</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto hide-scrollbar">
          {filteredList.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-10">ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก</p>
          ) : (
            filteredList.map((exp) => {
              const effectiveCat = (!exp.category || exp.category === 'ทั่วไป') ? guessCategoryFromTitle(exp.title) : exp.category;
              return (
                <div key={exp.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900">{exp.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {effectiveCat}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        exp.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {exp.status === 'paid' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{new Date(exp.timeMs).toLocaleString('th-TH')}</span>
                      {exp.notes && <span>• โน้ต: {exp.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="font-black text-rose-600 text-base">
                      -{exp.amount.toLocaleString()} ฿
                    </span>

                    {exp.status === 'pending' && (
                      <button
                        onClick={() => markExpensePaid(exp.id)}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        ชำระแล้ว
                      </button>
                    )}

                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
