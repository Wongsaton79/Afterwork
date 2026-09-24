import { Expense, Order, MenuItem } from '../types';

export interface ExpenseCategoryBreakdown {
  category: string;
  totalAmount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface IngredientForecast {
  ingredient: string; // e.g., 'หมู / หมูกรอบ / หมูสับ', 'กุ้งสด', 'ปลาหมึก / ซีฟู้ด', 'ผักสด / สมุนไพร', 'ไข่ไก่', 'เครื่องปรุง / ซอส'
  icon: string;
  todayUsageEst: string;
  tomorrowRecommend: string;
  safetyBuffer: string;
  reason: string;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export interface CostSavingInsight {
  title: string;
  category: string;
  potentialSaving: string;
  description: string;
  actionableSteps: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface BusinessGrowthSuggestion {
  title: string;
  tag: string;
  badgeColor: string;
  description: string;
  benefit: string;
  impactScore: string;
}

export interface ExpenseAnalysisReport {
  totalExpense: number;
  breakdowns: ExpenseCategoryBreakdown[];
  highestSpendingCategory: string;
  highestSpendingAmount: number;
  forecasts: IngredientForecast[];
  costSavings: CostSavingInsight[];
  growthSuggestions: BusinessGrowthSuggestion[];
}

export const PRESET_EXPENSE_CATEGORIES = [
  'วัตถุดิบสด (หมู/ไก่/เนื้อ)',
  'วัตถุดิบอาหารทะเล (กุ้ง/หมึก/ปลา)',
  'ผักสดและเครื่องปรุง',
  'เครื่องดื่มและน้ำแข็ง',
  'บรรจุภัณฑ์/กล่อง/ถุง/หลอด',
  'ค่าเช่าที่/พื้นที่ร้าน',
  'ค่าน้ำ/ค่าไฟ/แก๊สหุงต้ม',
  'ค่าจ้าง/เบี้ยเลี้ยงพนักงาน',
  'อุปกรณ์/เครื่องใช้ในร้าน',
  'การตลาด/โปรโมชั่น',
  'เบ็ดเตล็ด/ทั่วไป'
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'วัตถุดิบสด (หมู/ไก่/เนื้อ)': '#ef4444',
  'วัตถุดิบอาหารทะเล (กุ้ง/หมึก/ปลา)': '#06b6d4',
  'ผักสดและเครื่องปรุง': '#10b981',
  'เครื่องดื่มและน้ำแข็ง': '#3b82f6',
  'บรรจุภัณฑ์/กล่อง/ถุง/หลอด': '#f59e0b',
  'ค่าเช่าที่/พื้นที่ร้าน': '#8b5cf6',
  'ค่าน้ำ/ค่าไฟ/แก๊สหุงต้ม': '#ec4899',
  'ค่าจ้าง/เบี้ยเลี้ยงพนักงาน': '#6366f1',
  'อุปกรณ์/เครื่องใช้ในร้าน': '#64748b',
  'การตลาด/โปรโมชั่น': '#14b8a6',
  'เบ็ดเตล็ด/ทั่วไป': '#94a3b8'
};

/**
 * Intelligent categorization based on title keywords
 */
export const guessCategoryFromTitle = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('หมู') || t.includes('ไก่') || t.includes('เนื้อ') || t.includes('กระดูก') || t.includes('สามชั้น') || t.includes('เบคอน') || t.includes('ไส้กรอก') || t.includes('ลูกชิ้น')) {
    return 'วัตถุดิบสด (หมู/ไก่/เนื้อ)';
  }
  if (t.includes('กุ้ง') || t.includes('หมึก') || t.includes('ปลา') || t.includes('หอย') || t.includes('ปู') || t.includes('ทะเล') || t.includes('ซีฟู้ด') || t.includes('แมงกะพรุน') || t.includes('แซลมอน')) {
    return 'วัตถุดิบอาหารทะเล (กุ้ง/หมึก/ปลา)';
  }
  if (t.includes('ผัก') || t.includes('มะนาว') || t.includes('พริก') || t.includes('กระเทียม') || t.includes('ไข่') || t.includes('น้ำมัน') || t.includes('ซอส') || t.includes('น้ำปลา') || t.includes('น้ำตาล') || t.includes('ซีอิ๊ว') || t.includes('ข้าวสาร') || t.includes('เส้น') || t.includes('วุ้นเส้น') || t.includes('กะหล่ำ') || t.includes('คะน้า') || t.includes('กะเพรา') || t.includes('เห็ด') || t.includes('ต้นหอม') || t.includes('ผักชี')) {
    return 'ผักสดและเครื่องปรุง';
  }
  if (t.includes('น้ำแข็ง') || t.includes('โค้ก') || t.includes('เป๊ปซี่') || t.includes('เบียร์') || t.includes('โซดา') || t.includes('น้ำเปล่า') || t.includes('ชา') || t.includes('กาแฟ') || t.includes('นม') || t.includes('ไซรัป')) {
    return 'เครื่องดื่มและน้ำแข็ง';
  }
  if (t.includes('กล่อง') || t.includes('ถุง') || t.includes('แก้ว') || t.includes('ช้อน') || t.includes('ส้อม') || t.includes('หลอด') || t.includes('ถุงขยะ') || t.includes('กระดาษทิชชู่') || t.includes('ทิชชู่') || t.includes('ฟิล์ม') || t.includes('ถ้วย')) {
    return 'บรรจุภัณฑ์/กล่อง/ถุง/หลอด';
  }
  if (t.includes('ค่าเช่า') || t.includes('เช่าที่') || t.includes('เซ้ง') || t.includes('มัดจำ')) {
    return 'ค่าเช่าที่/พื้นที่ร้าน';
  }
  if (t.includes('ค่าไฟ') || t.includes('ค่าน้ำ') || t.includes('แก๊ส') || t.includes('ถังแก๊ส') || t.includes('เน็ต') || t.includes('wifi') || t.includes('อินเทอร์เน็ต')) {
    return 'ค่าน้ำ/ค่าไฟ/แก๊สหุงต้ม';
  }
  if (t.includes('ค่าจ้าง') || t.includes('เงินเดือน') || t.includes('พนักงาน') || t.includes('ลูกจ้าง') || t.includes('โอที') || t.includes('ot') || t.includes('เบี้ยเลี้ยง') || t.includes('ทิป')) {
    return 'ค่าจ้าง/เบี้ยเลี้ยงพนักงาน';
  }
  if (t.includes('กระทะ') || t.includes('หม้อ') || t.includes('ตะหลิว') || t.includes('มีด') || t.includes('เขียง') || t.includes('น้ำยาล้างจาน') || t.includes('ฟองน้ำ') || t.includes('จาน') || t.includes('ชาม') || t.includes('ซ่อม')) {
    return 'อุปกรณ์/เครื่องใช้ในร้าน';
  }
  if (t.includes('ยิงแอด') || t.includes('ป้าย') || t.includes('โฆษณา') || t.includes('โปรโมท') || t.includes('facebook') || t.includes('ติ๊กต๊อก') || t.includes('tiktok')) {
    return 'การตลาด/โปรโมชั่น';
  }
  return 'เบ็ดเตล็ด/ทั่วไป';
};

/**
 * Computes deep expense analytics, purchasing forecasts, cost savings, and business growth ideas
 */
export const analyzeExpensesAndForecast = (
  expenses: Expense[],
  orders: Order[],
  menus: MenuItem[]
): ExpenseAnalysisReport => {
  // 1. Group expenses by category
  const categoryTotals: Record<string, { total: number; count: number }> = {};

  let totalExpense = 0;
  expenses.forEach(exp => {
    // If expense has old 'ทั่วไป' or empty category, guess intelligently
    const cat = (!exp.category || exp.category === 'ทั่วไป') 
      ? guessCategoryFromTitle(exp.title) 
      : exp.category;
    
    totalExpense += exp.amount;
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { total: 0, count: 0 };
    }
    categoryTotals[cat].total += exp.amount;
    categoryTotals[cat].count += 1;
  });

  const breakdowns: ExpenseCategoryBreakdown[] = Object.keys(categoryTotals).map(cat => {
    const total = categoryTotals[cat].total;
    const count = categoryTotals[cat].count;
    const percentage = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
    return {
      category: cat,
      totalAmount: total,
      percentage,
      count,
      color: CATEGORY_COLORS[cat] || '#94a3b8'
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  const highestSpending = breakdowns[0] || { category: 'ยังไม่มีข้อมูล', totalAmount: 0 };

  // 2. Analyze Today's sales to recommend Tomorrow's stock purchases (Pork, Shrimp, Seafood, Veggies)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayOrders = orders.filter(o => o.timeMs >= startOfToday && o.status !== 'cancelled');
  
  // Calculate item sales breakdown for today
  let porkDishCount = 0;
  let shrimpDishCount = 0;
  let squidSeafoodDishCount = 0;
  let chickenBeefCount = 0;
  let soupVeggieDishCount = 0;
  let eggDishCount = 0;

  todayOrders.forEach(o => {
    o.items.forEach(item => {
      const name = item.name.toLowerCase();
      const q = item.quantity;
      if (name.includes('หมู') || name.includes('สามชั้น') || name.includes('หมูกรอบ') || name.includes('เบคอน')) {
        porkDishCount += q;
      }
      if (name.includes('กุ้ง')) {
        shrimpDishCount += q;
      }
      if (name.includes('หมึก') || name.includes('ปลา') || name.includes('ทะเล') || name.includes('ซีฟู้ด')) {
        squidSeafoodDishCount += q;
      }
      if (name.includes('ไก่') || name.includes('เนื้อ')) {
        chickenBeefCount += q;
      }
      if (name.includes('ผัก') || name.includes('ต้ม') || name.includes('สุกี้') || name.includes('ยำ') || name.includes('กะเพรา')) {
        soupVeggieDishCount += q;
      }
      if (name.includes('ไข่') || name.includes('เจียว') || name.includes('ดาว')) {
        eggDishCount += q;
      }
    });
  });

  // Calculate day-of-week factor: e.g. Friday/Saturday/Sunday sales surge by 25-40%
  const tomorrowDay = (now.getDay() + 1) % 7;
  const isWeekendTomorrow = tomorrowDay === 5 || tomorrowDay === 6 || tomorrowDay === 0; // Fri/Sat/Sun
  const weekendMultiplier = isWeekendTomorrow ? 1.3 : 1.1; // +10% to +30% safety

  // Pork forecast estimation: avg ~120g - 150g per dish
  const estPorkKgToday = Math.max(1.5, Number((porkDishCount * 0.14).toFixed(1)));
  const recPorkKg = Math.max(2.5, Number((estPorkKgToday * weekendMultiplier + 0.5).toFixed(1)));

  // Shrimp forecast estimation: avg ~100g - 130g per dish (4-6 pcs)
  const estShrimpKgToday = Math.max(1.0, Number((shrimpDishCount * 0.12).toFixed(1)));
  const recShrimpKg = Math.max(2.0, Number((estShrimpKgToday * weekendMultiplier + 0.5).toFixed(1)));

  // Squid & Seafood forecast
  const estSeafoodKgToday = Math.max(1.0, Number((squidSeafoodDishCount * 0.12).toFixed(1)));
  const recSeafoodKg = Math.max(1.5, Number((estSeafoodKgToday * weekendMultiplier + 0.3).toFixed(1)));

  // Eggs forecast: avg 1-1.5 eggs per dish
  const estEggsToday = Math.max(10, Math.round(eggDishCount * 1.2));
  const recEggs = Math.max(30, Math.round(estEggsToday * weekendMultiplier + 10));

  const forecasts: IngredientForecast[] = [
    {
      ingredient: 'เนื้อหมูสด / หมูกรอบ / สันคอ',
      icon: '🥩',
      todayUsageEst: `${estPorkKgToday} กิโลกรัม (${porkDishCount} จานที่ขายวันนี้)`,
      tomorrowRecommend: `${recPorkKg} กก.`,
      safetyBuffer: isWeekendTomorrow ? '+30% (รับลูกค้ารอบสุดสัปดาห์)' : '+10% สำรองของสด',
      reason: isWeekendTomorrow
        ? `วันพรุ่งนี้เป็นช่วงสุดสัปดาห์ เมนูหมูขายดีต่อเนื่อง แนะนำสั่งสต็อกเพิ่มช่วงเช้าตรู่`
        : `ยอดขายวันนี้ออกสม่ำเสมอ แนะนำเตรียมหมักไว้ล่วงหน้าช่วงเปิดร้าน`,
      trend: isWeekendTomorrow ? 'up' : 'stable',
      unit: 'กก.'
    },
    {
      ingredient: 'กุ้งสด / กุ้งขาวแช่น้ำปลา',
      icon: '🦐',
      todayUsageEst: `${estShrimpKgToday} กิโลกรัม (${shrimpDishCount} จานที่สั่งวันนี้)`,
      tomorrowRecommend: `${recShrimpKg} กก.`,
      safetyBuffer: '+15% สดใหม่วันต่อวัน',
      reason: `กุ้งสดเป็นสินค้าเน่าเสียง่าย แนะนำซื้อไซส์ประจำและแช่น้ำแข็งคุมอุณหภูมิทันที ไม่ควรแช่แข็งซ้ำ`,
      trend: shrimpDishCount > 5 ? 'up' : 'stable',
      unit: 'กก.'
    },
    {
      ingredient: 'ปลาหมึกสด / อาหารทะเลรวม',
      icon: '🦑',
      todayUsageEst: `${estSeafoodKgToday} กิโลกรัม (${squidSeafoodDishCount} จาน)`,
      tomorrowRecommend: `${recSeafoodKg} กก.`,
      safetyBuffer: '+10% ลวกสุกพร้อมเสิร์ฟ',
      reason: `เมนูยำและซีฟู้ดเป็นเมนูเรียกน้ำย่อยหลัก เตรียมหั่นบั้งและล้างน้ำส้มสายชูดับคาวไว้`,
      trend: 'stable',
      unit: 'กก.'
    },
    {
      ingredient: 'ไข่ไก่ (เบอร์ 2 หรือ 3)',
      icon: '🥚',
      todayUsageEst: `${estEggsToday} ฟอง`,
      tomorrowRecommend: `${recEggs} ฟอง (ประมาณ ${Math.ceil(recEggs / 30)} แผง)`,
      safetyBuffer: '+1 แผง สำรองไข่ดาว/ไข่เจียว',
      reason: `ไข่ไก่มีอายุการเก็บนาน คุ้มค่ากว่าเมื่อซื้อยกแผง ประหยัดต้นทุนเฉลี่ยต่อฟอง 15-20%`,
      trend: 'up',
      unit: 'ฟอง'
    }
  ];

  // 3. Cost-saving recommendations based on actual expenses
  const costSavings: CostSavingInsight[] = [];

  // Check seafood & meat cost proportion
  const freshMeatTotal = (categoryTotals['วัตถุดิบสด (หมู/ไก่/เนื้อ)']?.total || 0) + (categoryTotals['วัตถุดิบอาหารทะเล (กุ้ง/หมึก/ปลา)']?.total || 0);
  if (freshMeatTotal > 0) {
    costSavings.push({
      title: 'เจรจาซื้อวัตถุดิบเนื้อสัตว์และกุ้งจากตลาดค้าส่งแบบผูกสัญญา',
      category: 'วัตถุดิบหลัก',
      potentialSaving: 'ประหยัดได้ 10% - 15% (ประมาณ 1,500 - 3,500 ฿/เดือน)',
      description: 'ค่าวัตถุดิบสดเป็นสัดส่วนใหญ่ที่สุดของร้าน หากสั่งตรงจากเขียงหมูหรือแพกุ้งประจำพร้อมให้มาส่งที่ร้าน จะได้ราคาหน้าเขียงที่ถูกกว่าซื้อปลีกทีละวัน',
      actionableSteps: [
        'รวบรวมปริมาณการใช้ต่อสัปดาห์ (เช่น หมู 20 กก., กุ้ง 15 กก.) ไปต่อรองขอราคาส่ง',
        'ขอเงื่อนไขชำระเงินแบบรอบสัปดาห์ หรือขอของแถมเป็นกระดูกหมูต้มซุป'
      ],
      priority: 'high'
    });
  }

  // Check packaging cost
  const packagingTotal = categoryTotals['บรรจุภัณฑ์/กล่อง/ถุง/หลอด']?.total || 0;
  costSavings.push({
    title: 'เปลี่ยนแหล่งซื้อบรรจุภัณฑ์ Delivery เป็นแบบยกลัง / ขายส่ง',
    category: 'บรรจุภัณฑ์',
    potentialSaving: 'ลดต้นทุนได้ 20% - 30% ต่อชิ้น',
    description: 'การซื้อกล่องอาหาร ถุงหิ้ว หรือถ้วยน้ำจิ้มจากร้านสะดวกซื้อหรือร้านค้าปลีกมีส่วนต่างราคาแพงกว่าร้านขายส่งบรรจุภัณฑ์ 0.5 - 1.5 บาทต่อชุด',
    actionableSteps: [
      'สั่งซื้อยกลังผ่าน Shopee/Lazada ในช่วงแคมเปญส่งฟรี หรือร้านขายส่งพลาสติกใกล้บ้าน',
      'ใช้ถ้วยน้ำจิ้มแบบฝาล็อคในตัว ลดการสูญหายของฝาและทำงานได้เร็วกว่า'
    ],
    priority: packagingTotal > 1000 ? 'high' : 'medium'
  });

  // Energy & Utilities
  costSavings.push({
    title: 'บริหารเวลาเตาแก๊สและการต้มน้ำซุปแบบ Batching',
    category: 'พลังงาน & แก๊ส',
    potentialSaving: 'ลดค่าแก๊สหุงต้มได้ 10% - 15%',
    description: 'การเปิดไฟอ่อนเคี่ยวน้ำซุปหรือสต็อกกระดูกหมูต่อเนื่องทั้งวันสิ้นเปลืองแก๊สสูง ควรใช้หม้อกักเก็บความร้อนหรือตุ๋นรอบใหญ่ช่วงเช้าครั้งเดียวแล้วถ่ายใส่หม้ออุ่นไฟฟ้า',
    actionableSteps: [
      'ปิดวาล์วเตาแก๊สหัวเร่งทันทีหลังผัดหรือทอดเสร็จ ไม่เปิดเปลวไฟทิ้งไว้',
      'เช็กยางขอบตู้เย็นและตู้แช่ ไม่ให้ความเย็นรั่วไหล ช่วยประหยัดค่าไฟได้เดือนละหลายร้อยบาท'
    ],
    priority: 'medium'
  });

  // 4. Business Growth & Revenue Expansion Suggestions
  const growthSuggestions: BusinessGrowthSuggestion[] = [
    {
      title: 'จัดชุดเซ็ตคู่สุดคุ้ม "กุ้งแช่น้ำปลา + เครื่องดื่มเย็น"',
      tag: 'เพิ่มยอดบิล (Upselling)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'ลูกค้าส่วนใหญ่มักสั่งอาหารจานหลักแต่ไม่ได้สั่งเครื่องดื่มพร้อมกัน การจัดเซ็ต Bundle โดยเพิ่มเงินเพียงเล็กน้อยจะช่วยดันยอดขายต่อหัว (Average Ticket Size) ให้สูงขึ้นทันที 25-35%',
      benefit: 'เพิ่มกำไรสุทธิต่อโต๊ะทันที 30 - 60 บาท',
      impactScore: '⭐⭐⭐⭐⭐ สูงมาก'
    },
    {
      title: 'เปิดโปรโมชั่น "แชร์รูปอาหาร รับน้ำฟรี/ส่วนลด 5%"',
      tag: 'การตลาดปากต่อปาก (Viral)',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: 'เนื่องจากหน้าร้านมี QR สั่งอาหารและรูปอาหารแท้ที่น่ารับประทานมาก เชิญชวนให้ลูกค้าถ่ายรูปเช็คอินแท็กชื่อร้าน Afterwork เพื่อสร้างรีวิวฟรีในโซเชียล',
      benefit: 'ดึงดูดลูกค้าใหม่ในพื้นที่โดยแทบไม่ต้องเสียค่ายิงแอด',
      impactScore: '⭐⭐⭐⭐ ดีเยี่ยม'
    },
    {
      title: 'เพิ่มเมนูทานเล่นเคี้ยวเพลิน (High-Margin Appetizers)',
      tag: 'เมนูกำไรสูง (High Margin)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'เช่น เอ็นไก่ทอด, เกี๊ยวกรอบทอด, หรือหมูแดดเดียว ซึ่งใช้วัตถุดิบที่เก็บได้นาน ต้นทุนต่ำ (<35%) แต่ขายได้เร็วในกลุ่มลูกค้านั่งสังสรรค์หลังเลิกงาน',
      benefit: 'ลดเวลารออาหารจานหลัก และเพิ่มอัตรากำไรเฉลี่ยของร้าน',
      impactScore: '⭐⭐⭐⭐ ดีเยี่ยม'
    },
    {
      title: 'ระบบสะสมแต้มผ่านเบอร์โทรหรือชื่อลูกค้า',
      tag: 'ลูกค้าประจำ (Retention)',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'ระบบรองรับการกรอกชื่อลูกค้าตอนสั่งอาหารอยู่แล้ว สามารถจัดแคมเปญ "ทานครบ 10 ครั้ง รับฟรีเมนูพิเศษ 1 จาน" เพื่อกระตุ้นให้ลูกค้ากลับมาทานซ้ำทุกสัปดาห์',
      benefit: 'เพิ่มอัตราการกลับมาทานซ้ำ (Repeat Rate) สูงขึ้น 40%',
      impactScore: '⭐⭐⭐⭐⭐ สูงมาก'
    }
  ];

  return {
    totalExpense,
    breakdowns,
    highestSpendingCategory: highestSpending.category,
    highestSpendingAmount: highestSpending.totalAmount,
    forecasts,
    costSavings,
    growthSuggestions
  };
};
