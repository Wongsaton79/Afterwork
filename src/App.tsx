import React, { useState, useEffect } from 'react';
import { ViewMode, MenuItem, Order, Expense, AdminTab } from './types';
import { subscribeMenus, DuplicateGroup, seedDefaultMenusSafely, updateExistingMenusWithAuthenticImages } from './lib/menuService';
import { subscribeKitchenOrders, subscribeAdminOrders } from './lib/orderService';
import { subscribeExpenses } from './lib/expenseService';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PosView } from './components/PosView';
import { KitchenView } from './components/KitchenView';
import { AdminView } from './components/AdminView';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomerOrderView } from './components/CustomerOrderView';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('dashboard');
  
  // Dedicated customer self-ordering mode (When customer scans table QR code)
  const [isCustomerMode, setIsCustomerMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'customer' || params.get('customer') === 'true' || params.has('table');
  });
  const [customerTable, setCustomerTable] = useState<string>(() => {
    if (typeof window === 'undefined') return '1';
    const params = new URLSearchParams(window.location.search);
    return params.get('table') || '1';
  });

  // Data states
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [rawMenus, setRawMenus] = useState<MenuItem[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [, setIsLoadingMenus] = useState(true);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Initialize listeners
  useEffect(() => {
    // 1. Subscribe to Menus (with deduplication engine)
    const unsubMenus = subscribeMenus((unique, raw, duplicates) => {
      setMenus(unique);
      setRawMenus(raw);
      setDuplicateGroups(duplicates);
      setIsLoadingMenus(false);

      // If database is completely empty, seed starter menus safely (idempotent)
      if (raw.length === 0) {
        seedDefaultMenusSafely().catch(console.error);
      } else {
        // Auto-upgrade dish images to authentic matching photos in background
        updateExistingMenusWithAuthenticImages().catch(() => {});
      }
    });

    // 2. Subscribe to Kitchen Active Orders (Selective query: ONLY active/cooking orders!)
    const unsubKitchen = subscribeKitchenOrders((activeOrders) => {
      setKitchenOrders(activeOrders);
    });

    // 3. Subscribe to Admin Orders (with limit)
    const unsubAdminOrders = subscribeAdminOrders((orders) => {
      setAdminOrders(orders);
    });

    // 4. Subscribe to Expenses
    const unsubExpenses = subscribeExpenses((allExpenses) => {
      setExpenses(allExpenses);
    });

    return () => {
      unsubMenus();
      unsubKitchen();
      unsubAdminOrders();
      unsubExpenses();
    };
  }, []);

  const handleOpenDeduplicate = () => {
    setAdminInitialTab('deduplicate');
    setCurrentView('admin');
  };

  const handleOrderCreated = (orderId: string) => {
    const found = adminOrders.find(o => o.id === orderId);
    if (found) {
      setReceiptOrder(found);
    }
  };

  const handleOpenCustomerTest = (table: string) => {
    setCustomerTable(table);
    setIsCustomerMode(true);
  };

  // If customer scans QR code, render ONLY the dedicated Customer Self-Ordering page
  if (isCustomerMode) {
    return (
      <div className="w-full max-w-full min-h-[100dvh] overflow-x-hidden">
        <CustomerOrderView
          menus={menus}
          initialTable={customerTable}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full flex flex-col bg-slate-100 text-slate-900 font-sans overflow-x-hidden">
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        activeKitchenCount={kitchenOrders.length}
        duplicateCount={duplicateGroups.length}
      />

      {/* Main View Switcher */}
      <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
        {currentView === 'home' && (
          <HomeView
            onSelectView={(v) => {
              if (v === 'admin') setAdminInitialTab('dashboard');
              setCurrentView(v);
            }}
            menuCount={menus.length}
            kitchenActiveCount={kitchenOrders.length}
            duplicateCount={duplicateGroups.length}
            onOpenDeduplicate={handleOpenDeduplicate}
          />
        )}

        {currentView === 'pos' && (
          <PosView
            menus={menus}
            onOrderCreated={handleOrderCreated}
            onOpenReceipt={setReceiptOrder}
            onOpenCustomerView={handleOpenCustomerTest}
          />
        )}

        {currentView === 'kitchen' && (
          <KitchenView orders={kitchenOrders} />
        )}

        {currentView === 'admin' && (
          <AdminView
            menus={menus}
            rawMenus={rawMenus}
            duplicateGroups={duplicateGroups}
            orders={adminOrders}
            expenses={expenses}
            onOpenReceipt={setReceiptOrder}
            initialTab={adminInitialTab}
          />
        )}
      </main>

      {/* Receipt Printing Modal */}
      <ReceiptModal
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
