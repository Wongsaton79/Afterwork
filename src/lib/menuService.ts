import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, PATH_MENUS, DEFAULT_MENU_ITEMS, ensureAuth, getAuthenticImageForDishName } from './firebase';
import { MenuItem } from '../types';

export interface DuplicateGroup {
  name: string;
  count: number;
  items: MenuItem[];
  category: string;
}

// Normalize menu name to catch subtle spacing or whitespace duplication
export const normalizeName = (name: string): string => {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

export const subscribeMenus = (
  onData: (uniqueMenus: MenuItem[], rawMenus: MenuItem[], duplicates: DuplicateGroup[]) => void,
  onError?: (err: any) => void
) => {
  const menusRef = collection(db, ...PATH_MENUS);

  return onSnapshot(menusRef, (snapshot) => {
    const rawMenus: MenuItem[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<MenuItem, 'id'>)
    }));

    // Group by normalized name to identify duplicates
    const nameMap = new Map<string, MenuItem[]>();
    rawMenus.forEach(item => {
      const key = normalizeName(item.name);
      if (!nameMap.has(key)) {
        nameMap.set(key, []);
      }
      nameMap.get(key)!.push(item);
    });

    const duplicateGroups: DuplicateGroup[] = [];
    const uniqueMenus: MenuItem[] = [];

    nameMap.forEach((items, normKey) => {
      // Pick the best one (prefer item with image and non-zero price)
      const sorted = [...items].sort((a, b) => {
        const aHasImage = a.image && a.image.length > 10 ? 1 : 0;
        const bHasImage = b.image && b.image.length > 10 ? 1 : 0;
        if (aHasImage !== bHasImage) return bHasImage - aHasImage;
        return (b.price || 0) - (a.price || 0);
      });

      const primary = sorted[0];
      uniqueMenus.push(primary);

      if (items.length > 1) {
        duplicateGroups.push({
          name: primary.name,
          count: items.length,
          items: items,
          category: primary.category
        });
      }
    });

    // Sort by category Thai collation, then by name
    uniqueMenus.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'th') || (a.name || '').localeCompare(b.name || '', 'th'));

    onData(uniqueMenus, rawMenus, duplicateGroups);
  }, (err) => {
    console.error('Menu subscription error:', err);
    if (onError) onError(err);
  });
};

// Safe seed: will NOT insert if menu with the same name already exists
export const seedDefaultMenusSafely = async (): Promise<{ inserted: number; skipped: number }> => {
  await ensureAuth();
  const menusRef = collection(db, ...PATH_MENUS);
  const snapshot = await getDocs(menusRef);
  const existingNames = new Set(
    snapshot.docs.map(d => normalizeName((d.data() as any).name))
  );

  let inserted = 0;
  let skipped = 0;

  for (const item of DEFAULT_MENU_ITEMS) {
    if (!existingNames.has(normalizeName(item.name))) {
      await addDoc(menusRef, {
        ...item,
        available: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      inserted++;
    } else {
      skipped++;
    }
  }

  return { inserted, skipped };
};

// Fix Problem 3: 1-Click clean & delete duplicate menus from Firebase
export const deduplicateMenusInDb = async (): Promise<{ removedCount: number; affectedNames: string[] }> => {
  await ensureAuth().catch(() => {});
  const menusRef = collection(db, ...PATH_MENUS);
  const snapshot = await getDocs(menusRef);

  const rawMenus: MenuItem[] = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<MenuItem, 'id'>)
  }));

  const nameMap = new Map<string, MenuItem[]>();
  rawMenus.forEach(item => {
    const key = normalizeName(item.name);
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key)!.push(item);
  });

  const idsToDelete: string[] = [];
  const affectedNames: string[] = [];

  nameMap.forEach((items) => {
    if (items.length > 1) {
      affectedNames.push(items[0].name);
      // Sort to keep the best one (index 0) and remove index 1...n
      const sorted = [...items].sort((a, b) => {
        const aHasImg = a.image && a.image.length > 10 ? 1 : 0;
        const bHasImg = b.image && b.image.length > 10 ? 1 : 0;
        if (aHasImg !== bHasImg) return bHasImg - aHasImg;
        return (b.price || 0) - (a.price || 0);
      });

      // Keep sorted[0], mark rest for deletion
      for (let i = 1; i < sorted.length; i++) {
        idsToDelete.push(sorted[i].id);
      }
    }
  });

  if (idsToDelete.length === 0) {
    return { removedCount: 0, affectedNames: [] };
  }

  // Delete using writeBatch (up to 400 docs per batch) for ultra-fast, atomic deletion
  const BATCH_SIZE = 300;
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
    chunk.forEach(id => {
      batch.delete(doc(db, ...PATH_MENUS, id));
    });
    await batch.commit();
  }

  return { removedCount: idsToDelete.length, affectedNames };
};

// Delete duplicate copies for a specific single group
export const deleteDuplicatesForGroup = async (group: DuplicateGroup): Promise<number> => {
  await ensureAuth().catch(() => {});
  if (!group || group.items.length <= 1) return 0;

  const sorted = [...group.items].sort((a, b) => {
    const aHasImg = a.image && a.image.length > 10 ? 1 : 0;
    const bHasImg = b.image && b.image.length > 10 ? 1 : 0;
    if (aHasImg !== bHasImg) return bHasImg - aHasImg;
    return (b.price || 0) - (a.price || 0);
  });

  const idsToDelete = sorted.slice(1).map(item => item.id);
  const batch = writeBatch(db);
  idsToDelete.forEach(id => {
    batch.delete(doc(db, ...PATH_MENUS, id));
  });
  await batch.commit();
  return idsToDelete.length;
};

// Delete a single menu document
export const deleteSingleMenuItem = async (id: string): Promise<void> => {
  await ensureAuth().catch(() => {});
  await deleteDoc(doc(db, ...PATH_MENUS, id));
};

// Save menu with duplicate check
export const saveMenuItem = async (
  data: Omit<MenuItem, 'id'>, 
  existingId?: string
): Promise<{ success: boolean; error?: string }> => {
  await ensureAuth();
  const menusRef = collection(db, ...PATH_MENUS);

  // Check if another menu with same name exists
  const snapshot = await getDocs(menusRef);
  const normalizedNew = normalizeName(data.name);
  const duplicate = snapshot.docs.find(d => {
    if (existingId && d.id === existingId) return false;
    return normalizeName((d.data() as any).name) === normalizedNew;
  });

  if (duplicate) {
    return { 
      success: false, 
      error: `มีเมนูชื่อ "${data.name}" อยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น หรือแก้ไขเมนูเดิม` 
    };
  }

  if (existingId) {
    const docRef = doc(db, ...PATH_MENUS, existingId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } else {
    await addDoc(menusRef, {
      ...data,
      available: data.available ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return { success: true };
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  await ensureAuth();
  await deleteDoc(doc(db, ...PATH_MENUS, id));
};

export const toggleMenuAvailability = async (id: string, currentAvailable: boolean): Promise<void> => {
  await ensureAuth();
  const docRef = doc(db, ...PATH_MENUS, id);
  await updateDoc(docRef, {
    available: !currentAvailable,
    updatedAt: serverTimestamp()
  });
};

// Update all existing menus in Firebase to use realistic, authentic Thai food images
export const updateExistingMenusWithAuthenticImages = async (): Promise<{ updatedCount: number }> => {
  await ensureAuth().catch(() => {});
  const menusRef = collection(db, ...PATH_MENUS);
  const snapshot = await getDocs(menusRef);
  
  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as MenuItem;
    const matchedImage = getAuthenticImageForDishName(data.name);
    if (data.image !== matchedImage) {
      batch.update(doc(db, ...PATH_MENUS, docSnap.id), {
        image: matchedImage,
        updatedAt: serverTimestamp()
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
  }

  return { updatedCount };
};
