import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, PATH_ORDERS, ensureAuth, playNotificationSound } from './firebase';
import { Order, CartItem } from '../types';

// Safe helper to extract milliseconds from any Firestore timestamp format
export const getOrderTimeMs = (data: any): number => {
  if (typeof data.timeMs === 'number' && !isNaN(data.timeMs) && data.timeMs > 0) {
    return data.timeMs;
  }
  if (data.createdAt?.seconds) {
    return data.createdAt.seconds * 1000;
  }
  if (typeof data.createdAt?.toMillis === 'function') {
    return data.createdAt.toMillis();
  }
  if (typeof data.createdAt?.toDate === 'function') {
    return data.createdAt.toDate().getTime();
  }
  if (typeof data.createdAt === 'string') {
    const parsed = Date.parse(data.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof data.createdAt === 'number') {
    return data.createdAt;
  }
  return Date.now();
};

// Kitchen view: ONLY listens to active / cooking / ready orders!
// This solves Problem 2: no longer downloading thousands of past orders!
export const subscribeKitchenOrders = (
  onOrders: (orders: Order[]) => void,
  onNewOrderArrived?: (order: Order) => void
) => {
  const ordersRef = collection(db, ...PATH_ORDERS);
  // Statuses that need kitchen attention (including recently cancelled for awareness)
  const q = query(
    ordersRef, 
    where('status', 'in', ['active', 'cooking', 'ready', 'cancelled'])
  );

  let initialLoadDone = false;
  let prevOrderIds = new Set<string>();

  return onSnapshot(q, (snapshot) => {
    const activeOrders: Order[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const timeMs = getOrderTimeMs(data);
      return {
        id: docSnap.id,
        ...data,
        timeMs
      } as Order;
    });

    // Sort by oldest first (FIFO - First In First Out)
    activeOrders.sort((a, b) => a.timeMs - b.timeMs);

    // Check for newly arrived orders to trigger sound/alert
    if (initialLoadDone) {
      activeOrders.forEach(order => {
        if (!prevOrderIds.has(order.id) && order.status === 'active') {
          playNotificationSound('order');
          if (onNewOrderArrived) {
            onNewOrderArrived(order);
          }
        }
      });
    }

    prevOrderIds = new Set(activeOrders.map(o => o.id));
    initialLoadDone = true;

    onOrders(activeOrders);
  }, (err) => {
    console.error('Kitchen orders subscription error:', err);
  });
};

// Admin orders subscription: loads all historical orders from Firebase without truncation
export const subscribeAdminOrders = (
  onOrders: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, ...PATH_ORDERS);

  return onSnapshot(ordersRef, (snapshot) => {
    const orders: Order[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const timeMs = getOrderTimeMs(data);
      return {
        id: docSnap.id,
        ...data,
        timeMs
      } as Order;
    });

    // Sort by newest first
    orders.sort((a, b) => b.timeMs - a.timeMs);
    onOrders(orders);
  }, (err) => {
    console.error('Admin orders subscription error:', err);
  });
};

// Submit a new order
export const submitOrder = async (params: {
  customerName: string;
  tableNo?: string;
  orderType?: 'dine_in' | 'takeaway';
  items: CartItem[];
  paymentMethod?: 'cash' | 'promptpay' | 'card';
  paymentStatus?: 'unpaid' | 'paid';
}): Promise<string> => {
  const user = await ensureAuth();
  const ordersRef = collection(db, ...PATH_ORDERS);

  const total = params.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCost = params.items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
  const nowMs = Date.now();

  const newOrderDoc = await addDoc(ordersRef, {
    customerName: params.customerName.trim() || 'ลูกค้าทั่วไป',
    tableNo: params.tableNo?.trim() || '',
    orderType: params.orderType || 'dine_in',
    items: params.items,
    total,
    totalCost,
    status: 'active',
    paymentStatus: params.paymentStatus || 'unpaid',
    paymentMethod: params.paymentMethod || 'cash',
    timeMs: nowMs,
    createdAt: serverTimestamp(),
    createdBy: user?.uid || 'guest'
  });

  return newOrderDoc.id;
};

// Update order status (active -> cooking -> ready -> completed -> cancelled)
export const updateOrderStatus = async (
  orderId: string, 
  status: Order['status']
): Promise<void> => {
  await ensureAuth();
  const docRef = doc(db, ...PATH_ORDERS, orderId);
  const updatePayload: any = {
    status,
    updatedAt: serverTimestamp()
  };

  if (status === 'completed') {
    updatePayload.completedAt = serverTimestamp();
    updatePayload.paymentStatus = 'paid';
    playNotificationSound('complete');
  } else if (status === 'cancelled') {
    updatePayload.cancelledAt = serverTimestamp();
  }

  await updateDoc(docRef, updatePayload);
};

// Delete order completely (Admin only)
export const deleteOrder = async (orderId: string): Promise<void> => {
  await ensureAuth();
  await deleteDoc(doc(db, ...PATH_ORDERS, orderId));
};
