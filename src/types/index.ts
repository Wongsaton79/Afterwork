export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  image: string;
  available?: boolean;
  isSpecial?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  tableNo?: string;
  orderType?: 'dine_in' | 'takeaway';
  items: CartItem[];
  total: number;
  totalCost: number;
  status: 'active' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid';
  paymentMethod?: 'cash' | 'promptpay' | 'card';
  createdAt?: any;
  timeMs: number;
  completedAt?: any;
  cancelledAt?: any;
  createdBy?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  status: 'paid' | 'pending';
  createdAt?: any;
  timeMs: number;
  paidAt?: any;
  createdBy?: string;
  notes?: string;
}

export type ViewMode = 'home' | 'pos' | 'customer' | 'kitchen' | 'admin' | 'history';
export type AdminTab = 'dashboard' | 'orders' | 'menus' | 'expenses' | 'deduplicate';
export type AdminFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';
