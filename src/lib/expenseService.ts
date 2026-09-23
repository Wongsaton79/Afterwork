import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  limit, 
  query, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, PATH_EXPENSES, ensureAuth } from './firebase';
import { Expense } from '../types';

export const subscribeExpenses = (
  onExpenses: (expenses: Expense[]) => void
) => {
  const expensesRef = collection(db, ...PATH_EXPENSES);

  return onSnapshot(expensesRef, (snapshot) => {
    const expenses: Expense[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const timeMs = typeof data.timeMs === 'number' && !isNaN(data.timeMs) && data.timeMs > 0
        ? data.timeMs
        : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now()));
      return {
        id: docSnap.id,
        ...data,
        timeMs
      } as Expense;
    });

    expenses.sort((a, b) => b.timeMs - a.timeMs);
    onExpenses(expenses);
  }, (err) => {
    console.error('Expenses subscription error:', err);
  });
};

export const addExpense = async (data: {
  title: string;
  amount: number;
  category?: string;
  status: 'paid' | 'pending';
  notes?: string;
}): Promise<string> => {
  const user = await ensureAuth();
  const expensesRef = collection(db, ...PATH_EXPENSES);
  const nowMs = Date.now();

  const docSnap = await addDoc(expensesRef, {
    title: data.title.trim(),
    amount: Number(data.amount) || 0,
    category: data.category || 'ทั่วไป',
    status: data.status,
    notes: data.notes || '',
    timeMs: nowMs,
    createdAt: serverTimestamp(),
    paidAt: data.status === 'paid' ? serverTimestamp() : null,
    createdBy: user?.uid || 'admin'
  });

  return docSnap.id;
};

export const markExpensePaid = async (expenseId: string): Promise<void> => {
  await ensureAuth();
  const docRef = doc(db, ...PATH_EXPENSES, expenseId);
  await updateDoc(docRef, {
    status: 'paid',
    paidAt: serverTimestamp()
  });
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  await ensureAuth();
  await deleteDoc(doc(db, ...PATH_EXPENSES, expenseId));
};
