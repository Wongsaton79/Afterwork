import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { MenuItem, Order, Expense } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyCcF_GpHAEwvn0TMXns2w5eym2EqfJ_No8",
  authDomain: "afterwork-pos.firebaseapp.com",
  projectId: "afterwork-pos",
  storageBucket: "afterwork-pos.firebasestorage.app",
  messagingSenderId: "423772441953",
  appId: "1:423772441953:web:e46e065da264b9323bc920",
  measurementId: "G-H89M5VH6RG"
};

export const APP_ID = 'afterwork-pos';

// Collection paths
export const PATH_MENUS = ['artifacts', APP_ID, 'public', 'data', 'menus'] as const;
export const PATH_ORDERS = ['artifacts', APP_ID, 'public', 'data', 'orders'] as const;
export const PATH_EXPENSES = ['artifacts', APP_ID, 'public', 'data', 'expenses'] as const;

// Curated authentic food images matching each Thai dish name
export const getAuthenticImageForDishName = (name: string): string => {
  const norm = (name || '').toLowerCase();
  
  // กุ้งแช่น้ำปลา
  if (norm.includes('กุ้งแช่') || (norm.includes('กุ้ง') && norm.includes('น้ำปลา'))) {
    if (norm.includes('ใหญ่')) {
      return 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80'; // Jumbo shrimp with spicy chili lime
    }
    return 'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80'; // Fresh shrimp salad
  }

  // หมูมะนาว
  if (norm.includes('หมูมะนาว') || (norm.includes('หมู') && norm.includes('มะนาว'))) {
    if (norm.includes('ใหญ่')) {
      return 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'; // Large spicy pork salad
    }
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'; // Sliced tender pork with lime chili
  }

  // ชุดรวมหมู+กุ้ง
  if ((norm.includes('รวม') || norm.includes('ชุด')) && (norm.includes('หมู') || norm.includes('กุ้ง'))) {
    return 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?auto=format&fit=crop&w=800&q=80'; // Combo spicy meat and seafood plate
  }

  // สุกี้แห้ง
  if (norm.includes('สุกี้')) {
    if (norm.includes('กุ้ง')) {
      return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80'; // Suki prawns stir-fry
    }
    if (norm.includes('หมู')) {
      return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'; // Suki pork stir-fry
    }
    return 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=800&q=80'; // Combo wok suki
  }

  // Fallback delicious Thai food photo
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
};

// Default starter menus from original code with authentic Thai food photography
export const DEFAULT_MENU_ITEMS: Omit<MenuItem, 'id'>[] = [
  { 
    name: 'กุ้งแช่น้ำปลา (ชุดเล็ก)', 
    price: 59, 
    cost: 25, 
    category: 'เมนูกุ้งแช่น้ำปลา', 
    image: 'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'กุ้งแช่น้ำปลา (ชุดใหญ่)', 
    price: 100, 
    cost: 45, 
    category: 'เมนูกุ้งแช่น้ำปลา', 
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'หมูมะนาว (ชุดเล็ก)', 
    price: 59, 
    cost: 25, 
    category: 'เมนูหมูมะนาว', 
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'หมูมะนาว (ชุดใหญ่)', 
    price: 100, 
    cost: 45, 
    category: 'เมนูหมูมะนาว', 
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'ชุดรวมหมู+กุ้ง (ชุดใหญ่)', 
    price: 100, 
    cost: 50, 
    category: 'เมนูชุดรวม', 
    image: 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'สุกี้แห้งหมู', 
    price: 40, 
    cost: 18, 
    category: 'เมนูสุกี้คั่วกระทะ', 
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'สุกี้แห้งกุ้ง', 
    price: 50, 
    cost: 22, 
    category: 'เมนูสุกี้คั่วกระทะ', 
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80', 
    available: true 
  },
  { 
    name: 'สุกี้แห้งรวม', 
    price: 60, 
    cost: 28, 
    category: 'เมนูสุกี้คั่วกระทะ', 
    image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=800&q=80', 
    available: true 
  }
];

// Initialize App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Auth helper
let currentUserPromise: Promise<User | null> | null = null;
export const ensureAuth = (): Promise<User | null> => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (currentUserPromise) return currentUserPromise;

  currentUserPromise = new Promise((resolve) => {
    // Safety timeout to prevent any indefinite wait
    const timer = setTimeout(() => {
      resolve(auth.currentUser || null);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        clearTimeout(timer);
        unsubscribe();
        currentUserPromise = null;
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          clearTimeout(timer);
          unsubscribe();
          currentUserPromise = null;
          resolve(cred.user);
        } catch (err) {
          clearTimeout(timer);
          console.warn('Anonymous signin failed, continuing in guest mode:', err);
          unsubscribe();
          currentUserPromise = null;
          resolve(null);
        }
      }
    });
  });

  return currentUserPromise;
};

// Sound notification generator using Web Audio API (Reliable, no external file)
export const playNotificationSound = (type: 'order' | 'complete' | 'alert' = 'order') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'order') {
      // Pleasant double chime: C5 -> G5
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } else if (type === 'complete') {
      // Success chord
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4 + i * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.4 + i * 0.08);
      });
    }
  } catch (err) {
    console.debug('Audio context not permitted yet or not supported:', err);
  }
};
