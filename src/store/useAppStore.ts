import { create } from 'zustand';
import {
  Account,
  AppSettings,
  AuditLog,
  CashOperation,
  CashShift,
  Category,
  Customer,
  DatabaseSnapshot,
  Debt,
  Employee,
  Expense,
  HeldCart,
  OnlineOrder,
  Payment,
  PaymentMethod,
  Permission,
  Product,
  PromoCode,
  PurchaseOrder,
  PurchaseReceipt,
  Return,
  Role,
  RoleId,
  Sale,
  SaleItem,
  StockItem,
  StockMovement,
  StockMovementType,
  Stocktake,
  Store,
  Supplier,
  Target,
  Transfer,
  User,
  Warehouse,
  WriteOff,
} from '../types/models';
import { repository } from '../data/repository';
import { getMensClothingCategories } from '../data/seed';
import { Language } from '../i18n';

const SESSION_KEY = 'shu_brend_session_v1';
const THEME_KEY = 'shu_brend_theme_v1';
const LANG_KEY = 'shu_brend_lang_v1';
const HELD_CARTS_KEY = 'shu_brend_held_carts_v1';

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  db: DatabaseSnapshot | null;
  initialized: boolean;
  currentUserId: string | null;
  activeStoreId: string; // 'all' or specific storeId
  language: Language;
  theme: 'light' | 'dark';
  isOnline: boolean;
  heldCarts: HeldCart[];
  toasts: ToastMessage[];
  showOnboarding: boolean;

  // Shared Savatcha Cart state
  cartItems: SaleItem[];
  cartCustomerId: string;
  cartDiscountPercent: number;
  cartDiscountFixed: number;
  cartPromoCode: string;
  cartLoyaltySpent: number;
  savatchaMenuOpen: boolean;

  setCartItems: (items: SaleItem[] | ((prev: SaleItem[]) => SaleItem[])) => void;
  setCartCustomerId: (id: string) => void;
  setCartDiscountPercent: (pct: number) => void;
  setCartDiscountFixed: (amt: number) => void;
  setCartPromoCode: (code: string) => void;
  setCartLoyaltySpent: (pts: number) => void;
  setSavatchaMenuOpen: (open: boolean) => void;
  clearCart: () => void;

  init: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveStoreId: (storeId: string) => void;
  setOnline: (online: boolean) => void;
  setShowOnboarding: (open: boolean) => void;
  notify: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;

  // Auth & Permissions
  getCurrentUser: () => User | null;
  can: (perm: Permission) => boolean;
  loginWithPhone: (phone: string, password: string) => boolean;
  loginAsDemoUser: (userId: string) => void;
  switchUserByPin: (pin: string) => User | null;
  verifyManagerPin: (pin: string) => User | null;
  logout: () => void;

  // Held Carts
  addHeldCart: (cart: HeldCart) => void;
  removeHeldCart: (id: string) => void;

  // Stock Helper
  getVariantStock: (variantId: string, warehouseId?: string) => number;
  getWarehouseForStore: (storeId?: string) => string;

  // Mutations
  upsertProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkUpdatePrices: (productIds: string[], percentChange: number, field: 'retailPrice' | 'purchasePrice' | 'wholesalePrice') => Promise<void>;
  quickAddStock: (productId: string, variantId: string, warehouseId: string, qty: number, note?: string) => Promise<void>;
  importProducts: (products: Product[], initialStocks: { productId: string; variantId: string; warehouseId: string; qty: number; unitCost: number }[]) => Promise<void>;

  // POS & Cash Shifts
  openShift: (startingCash: number, storeId: string) => Promise<CashShift>;
  recordCashOp: (shiftId: string, type: 'in' | 'out', amount: number, reason: string) => Promise<void>;
  closeShift: (shiftId: string, actualCash: number, notes?: string) => Promise<void>;
  createDeferredTransaction: (input: {
    storeId: string;
    warehouseId: string;
    items: SaleItem[];
    customerId?: string;
    checkDiscountAmount: number;
    checkDiscountPercent: number;
    loyaltyPointsSpent: number;
    promoCode?: string;
    note?: string;
  }) => Promise<Sale>;
  payDeferredTransaction: (
    saleId: string,
    input: {
      payments: { method: PaymentMethod; amount: number }[];
      cashGiven?: number;
      changeAmount?: number;
      customerId?: string;
      loyaltyPointsSpent?: number;
    }
  ) => Promise<Sale>;
  deleteDeferredTransaction: (saleId: string) => Promise<void>;
  completeSale: (input: {
    storeId: string;
    warehouseId: string;
    items: SaleItem[];
    customerId?: string;
    checkDiscountAmount: number;
    checkDiscountPercent: number;
    loyaltyPointsSpent: number;
    promoCode?: string;
    payments: { method: PaymentMethod; amount: number }[];
    note?: string;
  }) => Promise<Sale>;
  processReturn: (input: {
    saleId: string;
    items: { saleItemId: string; qty: number }[];
    refundMethod: PaymentMethod;
    reason: string;
    isExchange?: boolean;
  }) => Promise<Return>;
  syncOfflineQueue: () => Promise<number>;

  // Inventory
  createPurchaseReceipt: (receipt: Omit<PurchaseReceipt, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status']) => Promise<void>;
  createTransfer: (transfer: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>) => Promise<void>;
  receiveTransfer: (transferId: string, receivedItems: { variantId: string; receivedQty: number }[]) => Promise<void>;
  createWriteOff: (wo: Omit<WriteOff, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  saveStocktake: (st: Omit<Stocktake, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string }) => Promise<Stocktake>;
  applyStocktake: (stocktakeId: string) => Promise<void>;
  upsertSupplier: (supplier: Supplier) => Promise<void>;
  paySupplierDebt: (supplierId: string, amount: number, accountId: string) => Promise<void>;

  // CRM & Loyalty & Debts
  upsertCustomer: (customer: Customer) => Promise<Customer>;
  repayDebt: (debtId: string, amount: number, method: PaymentMethod, note?: string) => Promise<void>;
  upsertPromoCode: (promo: PromoCode) => Promise<void>;

  // Finance
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, note: string) => Promise<void>;
  upsertAccount: (acc: Account) => Promise<void>;

  // Employees & Targets
  upsertEmployee: (
    emp: Employee,
    userUpdates?: Partial<User>,
    options?: { clearCustomPermissions?: boolean }
  ) => Promise<void>;
  deleteEmployee: (empId: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserCredentials: (
    userId: string,
    input: { currentPassword?: string; newPassword?: string; newPin?: string; name?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  upsertTarget: (target: Target) => Promise<void>;

  // Online Orders
  createOnlineOrder: (order: Omit<OnlineOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>) => Promise<OnlineOrder>;
  updateOnlineOrderStatus: (orderId: string, status: OnlineOrder['status']) => Promise<void>;

  // Categories CRUD
  upsertCategory: (cat: Category) => Promise<void>;
  deleteCategory: (catId: string) => Promise<{ ok: boolean; error?: string }>;
  resetCategoriesToMensClothing: () => Promise<void>;

  // Settings & Stores & Roles & Backup
  upsertStore: (store: Store) => Promise<void>;
  deleteStore: (storeId: string) => Promise<{ ok: boolean; error?: string }>;
  upsertWarehouse: (wh: Warehouse) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  updateRolePermissions: (roleId: RoleId, permissions: Permission[]) => Promise<void>;
  upsertRole: (role: Role) => Promise<void>;
  deleteRole: (roleId: RoleId) => Promise<{ ok: boolean; error?: string }>;
  resetDemoData: () => Promise<void>;
  clearAllTestData: () => Promise<void>;
  importBackupJson: (json: string) => Promise<void>;
}

function applyThemeToDOM(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function mutateStock(
  db: DatabaseSnapshot,
  params: {
    productId: string;
    variantId: string;
    warehouseId: string;
    storeId: string;
    qtyDelta: number;
    type: StockMovementType;
    unitCost: number;
    userId: string;
    referenceId?: string;
    referenceType?: string;
    note?: string;
  }
) {
  const nowIso = new Date().toISOString();
  let item = db.stockItems.find(
    (s) => s.variantId === params.variantId && s.warehouseId === params.warehouseId
  );
  if (!item) {
    item = {
      id: uid('stk'),
      productId: params.productId,
      variantId: params.variantId,
      warehouseId: params.warehouseId,
      qty: 0,
      storeId: params.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: params.userId,
    };
    db.stockItems.push(item);
  }
  item.qty = Number((item.qty + params.qtyDelta).toFixed(3));
  item.updatedAt = nowIso;

  const movement: StockMovement = {
    id: uid('mov'),
    productId: params.productId,
    variantId: params.variantId,
    warehouseId: params.warehouseId,
    type: params.type,
    qtyDelta: params.qtyDelta,
    qtyAfter: item.qty,
    unitCost: params.unitCost,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    note: params.note,
    storeId: params.storeId,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: params.userId,
  };
  db.stockMovements.unshift(movement);
}

function appendAudit(
  db: DatabaseSnapshot,
  user: User | null,
  action: AuditLog['action'],
  entityType: string,
  entityId: string,
  summary: string,
  storeId: string
) {
  const nowIso = new Date().toISOString();
  db.auditLogs.unshift({
    id: uid('aud'),
    userId: user?.id ?? 'system',
    userName: user?.name ?? 'Tizim',
    action,
    entityType,
    entityId,
    summary,
    storeId,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: user?.id ?? 'system',
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  db: null,
  initialized: false,
  currentUserId: typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null,
  activeStoreId: 'all',
  language: (typeof localStorage !== 'undefined' && (localStorage.getItem(LANG_KEY) as Language)) || 'uz',
  theme: (typeof localStorage !== 'undefined' && (localStorage.getItem(THEME_KEY) as 'light' | 'dark')) || 'light',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  heldCarts: (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(HELD_CARTS_KEY) : null;
      return raw ? (JSON.parse(raw) as HeldCart[]) : [];
    } catch {
      return [];
    }
  })(),
  toasts: [],
  showOnboarding: false,

  cartItems: [],
  cartCustomerId: '',
  cartDiscountPercent: 0,
  cartDiscountFixed: 0,
  cartPromoCode: '',
  cartLoyaltySpent: 0,
  savatchaMenuOpen: false,

  setCartItems: (itemsOrUpdater) =>
    set((s) => ({
      cartItems: typeof itemsOrUpdater === 'function' ? itemsOrUpdater(s.cartItems) : itemsOrUpdater,
    })),
  setCartCustomerId: (cartCustomerId) => set({ cartCustomerId }),
  setCartDiscountPercent: (cartDiscountPercent) => set({ cartDiscountPercent }),
  setCartDiscountFixed: (cartDiscountFixed) => set({ cartDiscountFixed }),
  setCartPromoCode: (cartPromoCode) => set({ cartPromoCode }),
  setCartLoyaltySpent: (cartLoyaltySpent) => set({ cartLoyaltySpent }),
  setSavatchaMenuOpen: (savatchaMenuOpen) => set({ savatchaMenuOpen }),
  clearCart: () =>
    set({
      cartItems: [],
      cartCustomerId: '',
      cartDiscountPercent: 0,
      cartDiscountFixed: 0,
      cartPromoCode: '',
      cartLoyaltySpent: 0,
    }),

  init: async () => {
    const theme = get().theme;
    applyThemeToDOM(theme);
    const db = await repository.load();
    // Migrate older snapshots seamlessly without discarding user data
    let changed = false;
    const storeColors = ['#2563EB', '#16A34A', '#9333EA', '#EA580C'];
    db.stores.forEach((st, idx) => {
      if (!st.storeCode) {
        st.storeCode = String(idx + 1).padStart(2, '0');
        changed = true;
      }
      if (!st.color) {
        st.color = storeColors[idx % storeColors.length];
        changed = true;
      }
    });
    if ((db.version ?? 1) < 2) {
      const m = db.settings.enabledPaymentMethods;
      if (!m.includes('card')) m.splice(1, 0, 'card');
      if (!m.includes('unionpay')) {
        const mcIdx = m.indexOf('mastercard');
        if (mcIdx >= 0) m.splice(mcIdx + 1, 0, 'unionpay');
        else m.push('unionpay');
      }
      db.version = 2;
      changed = true;
    }
    if ((db.version ?? 1) < 3) {
      const removedIds = new Set(['cat-clothing', 'cat-cosmetics', 'cat-electronics', 'cat-home', 'cat-stationery', 'cat-grocery']);
      const customCats = db.categories.filter(
        (c) => !removedIds.has(c.id) && c.id !== 'cat-shoes' && c.id !== 'cat-accessories'
      );
      const mensCats = getMensClothingCategories(db.stores[0]?.id ?? 'store-chilonzor');
      // Merge: men's clothing categories + any user-added custom categories
      const seen = new Set(mensCats.map((c) => c.id));
      const merged = [...mensCats, ...customCats.filter((c) => !seen.has(c.id))];
      db.categories = merged;
      const validIds = new Set(merged.map((c) => c.id));
      db.products.forEach((p) => {
        if (!validIds.has(p.categoryId)) {
          p.categoryId = p.categoryId === 'cat-clothing' ? 'cat-shirts' : merged[0]?.id ?? 'cat-shirts';
        }
      });
      db.version = 3;
      changed = true;
    }
    if (changed) {
      await repository.save(db);
    }
    set({ db, initialized: true });
  },

  setLanguage: (language) => {
    localStorage.setItem(LANG_KEY, language);
    set({ language });
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  setActiveStoreId: (activeStoreId) => set({ activeStoreId }),

  setOnline: (isOnline) => set({ isOnline }),

  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),

  notify: (text, type = 'info') => {
    const id = uid('toast');
    set((s) => ({ toasts: [...s.toasts, { id, text, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  getCurrentUser: () => {
    const { db, currentUserId } = get();
    if (!db || !currentUserId) return null;
    return db.users.find((u) => u.id === currentUserId && u.isActive) ?? null;
  },

  can: (perm) => {
    const { db } = get();
    const user = get().getCurrentUser();
    if (!db || !user) return false;
    if (Array.isArray(user.customPermissions)) {
      return user.customPermissions.includes(perm);
    }
    const role = db.roles.find((r) => r.id === user.roleId);
    return role ? role.permissions.includes(perm) : false;
  },

  loginWithPhone: (phone, password) => {
    const { db } = get();
    if (!db) return false;
    const clean = phone.replace(/\s+/g, '');
    const user = db.users.find(
      (u) => u.isActive && u.phone.replace(/\s+/g, '') === clean && u.password === password
    );
    if (!user) return false;
    localStorage.setItem(SESSION_KEY, user.id);
    set({
      currentUserId: user.id,
      activeStoreId: user.assignedStoreIds.length === 1 ? user.assignedStoreIds[0] : 'all',
    });
    return true;
  },

  loginAsDemoUser: (userId) => {
    const { db } = get();
    if (!db) return;
    const user = db.users.find((u) => u.id === userId && u.isActive);
    if (!user) return;
    localStorage.setItem(SESSION_KEY, user.id);
    set({
      currentUserId: user.id,
      activeStoreId: user.assignedStoreIds.length === 1 ? user.assignedStoreIds[0] : 'all',
    });
  },

  switchUserByPin: (pin) => {
    const { db } = get();
    if (!db) return null;
    const user = db.users.find((u) => u.isActive && u.pin === pin);
    if (!user) return null;
    localStorage.setItem(SESSION_KEY, user.id);
    set({ currentUserId: user.id });
    return user;
  },

  verifyManagerPin: (pin) => {
    const { db } = get();
    if (!db) return null;
    return (
      db.users.find(
        (u) =>
          u.isActive &&
          u.pin === pin &&
          (u.roleId === 'owner' || u.roleId === 'admin' || u.roleId === 'manager')
      ) ?? null
    );
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ currentUserId: null });
  },

  addHeldCart: (cart) => {
    const next = [cart, ...get().heldCarts];
    localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(next));
    set({ heldCarts: next });
  },

  removeHeldCart: (id) => {
    const next = get().heldCarts.filter((c) => c.id !== id);
    localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(next));
    set({ heldCarts: next });
  },

  getVariantStock: (variantId, warehouseId) => {
    const { db, activeStoreId } = get();
    if (!db) return 0;
    if (warehouseId) {
      return db.stockItems.find((s) => s.variantId === variantId && s.warehouseId === warehouseId)?.qty ?? 0;
    }
    if (activeStoreId !== 'all') {
      const store = db.stores.find((st) => st.id === activeStoreId);
      if (store) {
        return db.stockItems.find((s) => s.variantId === variantId && s.warehouseId === store.defaultWarehouseId)?.qty ?? 0;
      }
    }
    return db.stockItems
      .filter((s) => s.variantId === variantId)
      .reduce((sum, s) => sum + s.qty, 0);
  },

  getWarehouseForStore: (storeId) => {
    const { db, activeStoreId } = get();
    if (!db) return 'wh-chilonzor';
    const targetStoreId = storeId && storeId !== 'all' ? storeId : activeStoreId !== 'all' ? activeStoreId : db.stores[0]?.id;
    const store = db.stores.find((s) => s.id === targetStoreId) ?? db.stores[0];
    return store?.defaultWarehouseId ?? db.warehouses[0]?.id ?? 'wh-chilonzor';
  },

  upsertProduct: async (product) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      const prev = nextDb.products[idx];
      const prevPrice = prev.variants[0]?.retailPrice;
      const newPrice = product.variants[0]?.retailPrice;
      if (prevPrice !== undefined && newPrice !== undefined && prevPrice !== newPrice) {
        appendAudit(
          nextDb,
          user,
          'price_change',
          'Product',
          product.id,
          `${product.name} narxi o'zgartirildi: ${prevPrice} -> ${newPrice}`,
          product.storeId
        );
      }
      nextDb.products[idx] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      nextDb.products.unshift(product);
    }
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  deleteProduct: async (productId) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const target = nextDb.products.find((p) => p.id === productId);
    if (target) {
      appendAudit(
        nextDb,
        user,
        'product_delete',
        'Product',
        productId,
        `Mahsulot o'chirildi: ${target.name}`,
        target.storeId
      );
    }
    nextDb.products = nextDb.products.filter((p) => p.id !== productId);
    nextDb.stockItems = nextDb.stockItems.filter((s) => s.productId !== productId);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  bulkUpdatePrices: async (productIds, percentChange, field) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const factor = 1 + percentChange / 100;
    const step = nextDb.settings.roundingStep || 100;
    nextDb.products.forEach((p) => {
      if (productIds.includes(p.id)) {
        p.variants.forEach((v) => {
          const raw = v[field] * factor;
          v[field] = Math.max(0, Math.round(raw / step) * step);
          v.updatedAt = new Date().toISOString();
        });
        p.updatedAt = new Date().toISOString();
      }
    });
    appendAudit(
      nextDb,
      user,
      'price_change',
      'Product',
      productIds.join(','),
      `${productIds.length} ta mahsulot (${field}) narxi ${percentChange > 0 ? '+' : ''}${percentChange}% ga o'zgartirildi`,
      nextDb.stores[0]?.id ?? 'store-chilonzor'
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  quickAddStock: async (productId, variantId, warehouseId, qty, note) => {
    const { db } = get();
    if (!db || qty <= 0) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const prod = nextDb.products.find((p) => p.id === productId);
    const variant = prod?.variants.find((v) => v.id === variantId);
    const wh = nextDb.warehouses.find((w) => w.id === warehouseId);
    mutateStock(nextDb, {
      productId,
      variantId,
      warehouseId,
      storeId: wh?.storeId ?? nextDb.stores[0]?.id ?? 'store-chilonzor',
      qtyDelta: qty,
      type: 'kirim',
      unitCost: variant?.purchasePrice ?? 0,
      userId: user?.id ?? 'usr-owner',
      note: note ?? "Mahsulot kartasidan tezkor kirim",
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  importProducts: async (products, initialStocks) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.products.unshift(...products);
    initialStocks.forEach((st) => {
      if (st.qty > 0) {
        const wh = nextDb.warehouses.find((w) => w.id === st.warehouseId);
        mutateStock(nextDb, {
          productId: st.productId,
          variantId: st.variantId,
          warehouseId: st.warehouseId,
          storeId: wh?.storeId ?? nextDb.stores[0]?.id ?? 'store-chilonzor',
          qtyDelta: st.qty,
          type: 'kirim',
          unitCost: st.unitCost,
          userId: user?.id ?? 'usr-owner',
          note: 'Excel/CSV import qoldig\'i',
        });
      }
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  openShift: async (startingCash, storeId) => {
    const { db } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const shift: CashShift = {
      id: uid('shift'),
      number: `SM-${String(nextDb.cashShifts.length + 43).padStart(3, '0')}`,
      cashierId: user?.id ?? 'usr-cashier',
      cashierName: user?.name ?? 'Kassir',
      openedAt: nowIso,
      startingCash,
      cashSalesTotal: 0,
      cardSalesTotal: 0,
      otherSalesTotal: 0,
      cashRefundsTotal: 0,
      cashInTotal: 0,
      cashOutTotal: 0,
      expectedCash: startingCash,
      status: 'open',
      storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-cashier',
    };
    nextDb.cashShifts.unshift(shift);
    await repository.save(nextDb);
    set({ db: nextDb });
    return shift;
  },

  recordCashOp: async (shiftId, type, amount, reason) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const shift = nextDb.cashShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    const nowIso = new Date().toISOString();
    const op: CashOperation = {
      id: uid('cop'),
      shiftId,
      type,
      amount,
      reason,
      storeId: shift.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-cashier',
    };
    nextDb.cashOperations.unshift(op);
    if (type === 'in') {
      shift.cashInTotal += amount;
      shift.expectedCash += amount;
    } else {
      shift.cashOutTotal += amount;
      shift.expectedCash -= amount;
    }
    shift.updatedAt = nowIso;
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  closeShift: async (shiftId, actualCash, notes) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const shift = nextDb.cashShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    const nowIso = new Date().toISOString();
    shift.closedAt = nowIso;
    shift.actualCash = actualCash;
    shift.discrepancy = actualCash - shift.expectedCash;
    shift.status = 'closed';
    shift.notes = notes;
    shift.updatedAt = nowIso;
    appendAudit(
      nextDb,
      user,
      'shift_close',
      'CashShift',
      shift.id,
      `Smena ${shift.number} yopildi. Kutilgan: ${shift.expectedCash}, Haqiqiy: ${actualCash}`,
      shift.storeId
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  createDeferredTransaction: async (input) => {
    const { db, isOnline } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const saleId = uid('sale');

    const storeIdx = Math.max(0, nextDb.stores.findIndex((s) => s.id === input.storeId));
    const store = nextDb.stores[storeIdx];
    const storeCode = store?.storeCode || String(storeIdx + 1).padStart(2, '0');
    const seqNum = 286 + nextDb.sales.length;
    const receiptNumber = `#${storeCode}010104${String(seqNum).padStart(4, '0')}`;

    const subtotal = input.items.reduce((s, it) => s + it.lineTotal, 0);
    const costTotal = input.items.reduce((s, it) => s + it.purchasePrice * it.qty, 0);
    const afterDiscount = Math.max(0, subtotal - input.checkDiscountAmount - input.loyaltyPointsSpent);
    const vatAmount = nextDb.settings.vatEnabled
      ? Math.round((afterDiscount * nextDb.settings.vatRate) / (100 + nextDb.settings.vatRate))
      : 0;
    const totalAmount = afterDiscount;
    const customer = input.customerId ? nextDb.customers.find((c) => c.id === input.customerId) : undefined;

    const sale: Sale = {
      id: saleId,
      receiptNumber,
      warehouseId: input.warehouseId,
      cashierId: user?.id ?? 'usr-cashier',
      cashierName: user?.name ?? 'Kassir',
      customerId: customer?.id,
      customerName: customer?.name,
      items: input.items,
      subtotal,
      checkDiscountAmount: input.checkDiscountAmount,
      checkDiscountPercent: input.checkDiscountPercent,
      loyaltyPointsSpent: input.loyaltyPointsSpent,
      loyaltyPointsEarned: 0,
      promoCode: input.promoCode,
      vatAmount,
      totalAmount,
      costTotal,
      payments: [],
      paidAmount: 0,
      debtAmount: 0,
      status: 'deferred',
      offlineCreated: !isOnline,
      fiscalStatus: 'not_configured',
      note: input.note,
      storeId: input.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-cashier',
    };

    nextDb.sales.unshift(sale);
    await repository.save(nextDb);
    set({ db: nextDb });
    return sale;
  },

  payDeferredTransaction: async (saleId, input) => {
    const { db, isOnline } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const sale = nextDb.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Transaction not found');
    if (sale.status !== 'deferred') return sale;

    const nowIso = new Date().toISOString();
    if (input.customerId !== undefined) {
      const custOverride = input.customerId
        ? nextDb.customers.find((c) => c.id === input.customerId)
        : undefined;
      sale.customerId = custOverride?.id;
      sale.customerName = custOverride?.name;
    }
    if (input.loyaltyPointsSpent !== undefined) {
      sale.loyaltyPointsSpent = input.loyaltyPointsSpent;
      sale.totalAmount = Math.max(0, sale.subtotal - sale.checkDiscountAmount - sale.loyaltyPointsSpent);
    }

    const totalAmount = sale.totalAmount;
    const payments: Payment[] = input.payments
      .filter((p) => p.amount > 0)
      .map((p) => ({
        id: uid('pay'),
        saleId: sale.id,
        method: p.method,
        amount: p.amount,
        storeId: sale.storeId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user?.id ?? 'usr-cashier',
      }));

    const debtAmount = payments
      .filter((p) => p.method === 'debt')
      .reduce((s, p) => s + p.amount, 0);
    const paidAmount = Math.max(0, totalAmount - debtAmount);

    const customer = sale.customerId ? nextDb.customers.find((c) => c.id === sale.customerId) : undefined;
    const loyaltyAcc = customer ? nextDb.loyaltyAccounts.find((l) => l.customerId === customer.id) : undefined;

    let earnedPoints = 0;
    if (customer && loyaltyAcc) {
      if (sale.loyaltyPointsSpent > 0) {
        loyaltyAcc.pointsBalance = Math.max(0, loyaltyAcc.pointsBalance - sale.loyaltyPointsSpent);
        nextDb.loyaltyTransactions.unshift({
          id: uid('ltx'),
          customerId: customer.id,
          loyaltyAccountId: loyaltyAcc.id,
          type: 'spend',
          points: -sale.loyaltyPointsSpent,
          saleId: sale.id,
          note: `Chek ${sale.receiptNumber} da ishlatildi`,
          storeId: sale.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }

      earnedPoints = Math.round((paidAmount * loyaltyAcc.cashbackPercent) / 100);
      if (earnedPoints > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (nextDb.settings.cashbackExpiryDays || 180));
        loyaltyAcc.pointsBalance += earnedPoints;
        loyaltyAcc.expiresAt = expDate.toISOString();
        nextDb.loyaltyTransactions.unshift({
          id: uid('ltx'),
          customerId: customer.id,
          loyaltyAccountId: loyaltyAcc.id,
          type: 'earn',
          points: earnedPoints,
          saleId: sale.id,
          expiresAt: expDate.toISOString(),
          note: `Chek ${sale.receiptNumber} keshbek`,
          storeId: sale.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }

      customer.totalSpent += totalAmount;
      customer.ordersCount += 1;
      customer.lastPurchaseAt = nowIso;
      if (customer.totalSpent >= 3000000) customer.segment = 'vip';
      else if (customer.ordersCount >= 3) customer.segment = 'regular';

      const tiers = [...nextDb.settings.loyaltyTiers].sort((a, b) => b.minSpend - a.minSpend);
      const matched = tiers.find((t) => customer.totalSpent >= t.minSpend);
      if (matched) {
        loyaltyAcc.tier = matched.tier;
        loyaltyAcc.cashbackPercent = matched.cashbackPercent;
      }

      if (debtAmount > 0) {
        customer.debtBalance += debtAmount;
        const due = new Date();
        due.setDate(due.getDate() + 14);
        nextDb.debts.unshift({
          id: uid('debt'),
          customerId: customer.id,
          customerName: customer.name,
          saleId: sale.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          dueDate: due.toISOString(),
          status: 'open',
          payments: [],
          storeId: sale.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }
    }

    if (sale.promoCode) {
      const promo = nextDb.promoCodes.find((pr) => pr.code.toUpperCase() === sale.promoCode?.toUpperCase());
      if (promo) promo.usedCount += 1;
    }

    // Deduct stock via StockMovement
    sale.items.forEach((it) => {
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: sale.warehouseId,
        storeId: sale.storeId,
        qtyDelta: -it.qty,
        type: 'sotuv',
        unitCost: it.purchasePrice,
        userId: user?.id ?? 'usr-cashier',
        referenceId: sale.id,
        referenceType: 'Sale',
        note: `Sotuv ${sale.receiptNumber}`,
      });
    });

    // Update active cash shift & accounts
    const activeShift =
      nextDb.cashShifts.find((s) => s.status === 'open' && s.storeId === sale.storeId) ??
      nextDb.cashShifts.find((s) => s.status === 'open');
    const cashPaid = payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const cardPaid = payments
      .filter((p) => ['card', 'uzcard', 'humo', 'visa', 'mastercard', 'unionpay'].includes(p.method))
      .reduce((s, p) => s + p.amount, 0);
    const otherPaid = payments
      .filter((p) => ['transfer', 'click', 'payme', 'uzum'].includes(p.method))
      .reduce((s, p) => s + p.amount, 0);

    if (activeShift) {
      activeShift.cashSalesTotal += cashPaid;
      activeShift.cardSalesTotal += cardPaid;
      activeShift.otherSalesTotal += otherPaid;
      activeShift.expectedCash += cashPaid;
      activeShift.updatedAt = nowIso;
    }

    const cashAcc = nextDb.accounts.find((a) => a.type === 'cash');
    const cardAcc = nextDb.accounts.find((a) => a.type === 'card_terminal');
    const bankAcc = nextDb.accounts.find((a) => a.type === 'bank');
    if (cashAcc && cashPaid > 0) cashAcc.balance += cashPaid;
    if (cardAcc && cardPaid > 0) cardAcc.balance += cardPaid;
    if (bankAcc && otherPaid > 0) bankAcc.balance += otherPaid;

    if (sale.checkDiscountPercent >= nextDb.settings.discountApprovalThresholdPercent) {
      appendAudit(
        nextDb,
        user,
        'big_discount',
        'Sale',
        sale.id,
        `Chek ${sale.receiptNumber} da ${sale.checkDiscountPercent}% chegirma qo'llanildi`,
        sale.storeId
      );
    }

    sale.shiftId = activeShift?.id;
    sale.cashierId = user?.id ?? sale.cashierId;
    sale.cashierName = user?.name ?? sale.cashierName;
    sale.loyaltyPointsEarned = earnedPoints;
    sale.payments = payments;
    sale.paidAmount = paidAmount;
    sale.debtAmount = debtAmount;
    sale.cashGiven = input.cashGiven;
    sale.changeAmount = input.changeAmount;
    sale.paidAt = nowIso;
    sale.status = 'completed';
    sale.offlineCreated = !isOnline;
    sale.syncedAt = isOnline ? nowIso : undefined;
    sale.updatedAt = nowIso;

    if (!isOnline) {
      nextDb.offlineQueue.push({
        id: uid('sync'),
        type: 'sale',
        payload: { saleId: sale.id, receiptNumber: sale.receiptNumber },
        createdAt: nowIso,
        attempts: 0,
      });
    }

    await repository.save(nextDb);
    set({ db: nextDb });
    return sale;
  },

  deleteDeferredTransaction: async (saleId) => {
    const { db } = get();
    if (!db) return;
    const target = db.sales.find((s) => s.id === saleId);
    if (!target || target.status !== 'deferred') return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.sales = nextDb.sales.filter((s) => s.id !== saleId);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  completeSale: async (input) => {
    const { db, isOnline } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const saleId = uid('sale');

    const storeIdx = Math.max(0, nextDb.stores.findIndex((s) => s.id === input.storeId));
    const store = nextDb.stores[storeIdx];
    const storeCode = store?.storeCode || String(storeIdx + 1).padStart(2, '0');
    const seqNum = 286 + nextDb.sales.length;
    const receiptNumber = `#${storeCode}010104${String(seqNum).padStart(4, '0')}`;

    const subtotal = input.items.reduce((s, it) => s + it.lineTotal, 0);
    const costTotal = input.items.reduce((s, it) => s + it.purchasePrice * it.qty, 0);
    const afterDiscount = Math.max(0, subtotal - input.checkDiscountAmount - input.loyaltyPointsSpent);
    const vatAmount = nextDb.settings.vatEnabled
      ? Math.round((afterDiscount * nextDb.settings.vatRate) / (100 + nextDb.settings.vatRate))
      : 0;
    const totalAmount = afterDiscount;

    const payments: Payment[] = input.payments
      .filter((p) => p.amount > 0)
      .map((p) => ({
        id: uid('pay'),
        saleId,
        method: p.method,
        amount: p.amount,
        storeId: input.storeId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user?.id ?? 'usr-cashier',
      }));

    const debtAmount = payments
      .filter((p) => p.method === 'debt')
      .reduce((s, p) => s + p.amount, 0);
    const paidAmount = totalAmount - debtAmount;

    const customer = input.customerId ? nextDb.customers.find((c) => c.id === input.customerId) : undefined;
    const loyaltyAcc = customer ? nextDb.loyaltyAccounts.find((l) => l.customerId === customer.id) : undefined;

    let earnedPoints = 0;
    if (customer && loyaltyAcc) {
      if (input.loyaltyPointsSpent > 0) {
        loyaltyAcc.pointsBalance = Math.max(0, loyaltyAcc.pointsBalance - input.loyaltyPointsSpent);
        nextDb.loyaltyTransactions.unshift({
          id: uid('ltx'),
          customerId: customer.id,
          loyaltyAccountId: loyaltyAcc.id,
          type: 'spend',
          points: -input.loyaltyPointsSpent,
          saleId,
          note: `Chek ${receiptNumber} da ishlatildi`,
          storeId: input.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }

      earnedPoints = Math.round((paidAmount * loyaltyAcc.cashbackPercent) / 100);
      if (earnedPoints > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (nextDb.settings.cashbackExpiryDays || 180));
        loyaltyAcc.pointsBalance += earnedPoints;
        loyaltyAcc.expiresAt = expDate.toISOString();
        nextDb.loyaltyTransactions.unshift({
          id: uid('ltx'),
          customerId: customer.id,
          loyaltyAccountId: loyaltyAcc.id,
          type: 'earn',
          points: earnedPoints,
          saleId,
          expiresAt: expDate.toISOString(),
          note: `Chek ${receiptNumber} keshbek`,
          storeId: input.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }

      customer.totalSpent += totalAmount;
      customer.ordersCount += 1;
      customer.lastPurchaseAt = nowIso;
      if (customer.totalSpent >= 3000000) customer.segment = 'vip';
      else if (customer.ordersCount >= 3) customer.segment = 'regular';

      // Recompute tier
      const tiers = [...nextDb.settings.loyaltyTiers].sort((a, b) => b.minSpend - a.minSpend);
      const matched = tiers.find((t) => customer.totalSpent >= t.minSpend);
      if (matched) {
        loyaltyAcc.tier = matched.tier;
        loyaltyAcc.cashbackPercent = matched.cashbackPercent;
      }

      if (debtAmount > 0) {
        customer.debtBalance += debtAmount;
        const due = new Date();
        due.setDate(due.getDate() + 14);
        nextDb.debts.unshift({
          id: uid('debt'),
          customerId: customer.id,
          customerName: customer.name,
          saleId,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          dueDate: due.toISOString(),
          status: 'open',
          payments: [],
          storeId: input.storeId,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: user?.id ?? 'usr-cashier',
        });
      }
    }

    if (input.promoCode) {
      const promo = nextDb.promoCodes.find((pr) => pr.code.toUpperCase() === input.promoCode?.toUpperCase());
      if (promo) promo.usedCount += 1;
    }

    // Deduct stock via StockMovement
    input.items.forEach((it) => {
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: input.warehouseId,
        storeId: input.storeId,
        qtyDelta: -it.qty,
        type: 'sotuv',
        unitCost: it.purchasePrice,
        userId: user?.id ?? 'usr-cashier',
        referenceId: saleId,
        referenceType: 'Sale',
        note: `Chek ${receiptNumber}`,
      });
    });

    // Update active cash shift & accounts
    const activeShift = nextDb.cashShifts.find((s) => s.status === 'open' && s.storeId === input.storeId)
      ?? nextDb.cashShifts.find((s) => s.status === 'open');
    const cashPaid = payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const cardPaid = payments
      .filter((p) => ['card', 'uzcard', 'humo', 'visa', 'mastercard', 'unionpay'].includes(p.method))
      .reduce((s, p) => s + p.amount, 0);
    const otherPaid = payments
      .filter((p) => ['transfer', 'click', 'payme', 'uzum'].includes(p.method))
      .reduce((s, p) => s + p.amount, 0);

    if (activeShift) {
      activeShift.cashSalesTotal += cashPaid;
      activeShift.cardSalesTotal += cardPaid;
      activeShift.otherSalesTotal += otherPaid;
      activeShift.expectedCash += cashPaid;
      activeShift.updatedAt = nowIso;
    }

    const cashAcc = nextDb.accounts.find((a) => a.type === 'cash');
    const cardAcc = nextDb.accounts.find((a) => a.type === 'card_terminal');
    const bankAcc = nextDb.accounts.find((a) => a.type === 'bank');
    if (cashAcc && cashPaid > 0) cashAcc.balance += cashPaid;
    if (cardAcc && cardPaid > 0) cardAcc.balance += cardPaid;
    if (bankAcc && otherPaid > 0) bankAcc.balance += otherPaid;

    if (input.checkDiscountPercent >= nextDb.settings.discountApprovalThresholdPercent) {
      appendAudit(
        nextDb,
        user,
        'big_discount',
        'Sale',
        saleId,
        `Chek ${receiptNumber} da ${input.checkDiscountPercent}% chegirma qo'llanildi`,
        input.storeId
      );
    }

    const sale: Sale = {
      id: saleId,
      receiptNumber,
      warehouseId: input.warehouseId,
      shiftId: activeShift?.id,
      cashierId: user?.id ?? 'usr-cashier',
      cashierName: user?.name ?? 'Kassir',
      customerId: customer?.id,
      customerName: customer?.name,
      items: input.items,
      subtotal,
      checkDiscountAmount: input.checkDiscountAmount,
      checkDiscountPercent: input.checkDiscountPercent,
      loyaltyPointsSpent: input.loyaltyPointsSpent,
      loyaltyPointsEarned: earnedPoints,
      promoCode: input.promoCode,
      vatAmount,
      totalAmount,
      costTotal,
      payments,
      paidAmount,
      debtAmount,
      paidAt: nowIso,
      status: 'completed',
      offlineCreated: !isOnline,
      syncedAt: isOnline ? nowIso : undefined,
      fiscalStatus: 'not_configured',
      note: input.note,
      storeId: input.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-cashier',
    };

    nextDb.sales.unshift(sale);
    if (!isOnline) {
      nextDb.offlineQueue.push({
        id: uid('sync'),
        type: 'sale',
        payload: { saleId, receiptNumber },
        createdAt: nowIso,
        attempts: 0,
      });
    }

    await repository.save(nextDb);
    set({ db: nextDb });
    return sale;
  },

  processReturn: async (input) => {
    const { db } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const sale = nextDb.sales.find((s) => s.id === input.saleId);
    if (!sale) throw new Error('Sale not found');

    const nowIso = new Date().toISOString();
    const retId = uid('ret');
    const retNum = `QAY-${101 + nextDb.returns.length}`;

    const returnItems = input.items
      .filter((it) => it.qty > 0)
      .map((it) => {
        const sItem = sale.items.find((si) => si.id === it.saleItemId)!;
        const perUnit = sItem.lineTotal / sItem.qty;
        const refundAmount = Math.round(perUnit * it.qty);
        mutateStock(nextDb, {
          productId: sItem.productId,
          variantId: sItem.variantId,
          warehouseId: sale.warehouseId,
          storeId: sale.storeId,
          qtyDelta: it.qty,
          type: 'qaytarish',
          unitCost: sItem.purchasePrice,
          userId: user?.id ?? 'usr-cashier',
          referenceId: retId,
          referenceType: 'Return',
          note: `Qaytarish ${retNum} (Chek ${sale.receiptNumber})`,
        });
        return {
          saleItemId: sItem.id,
          productId: sItem.productId,
          variantId: sItem.variantId,
          productName: sItem.productName,
          variantLabel: sItem.variantLabel,
          qty: it.qty,
          refundAmount,
          purchasePrice: sItem.purchasePrice,
        };
      });

    const totalRefund = returnItems.reduce((s, it) => s + it.refundAmount, 0);
    const totalSoldQty = sale.items.reduce((s, it) => s + it.qty, 0);
    const totalReturnedQty = returnItems.reduce((s, it) => s + it.qty, 0);
    sale.status = totalReturnedQty >= totalSoldQty ? 'returned' : 'partial_return';
    sale.updatedAt = nowIso;

    if (input.refundMethod === 'cash') {
      const shift = nextDb.cashShifts.find((s) => s.status === 'open');
      if (shift) {
        shift.cashRefundsTotal += totalRefund;
        shift.expectedCash -= totalRefund;
      }
      const cashAcc = nextDb.accounts.find((a) => a.type === 'cash');
      if (cashAcc) cashAcc.balance -= totalRefund;
    }

    const ret: Return = {
      id: retId,
      number: retNum,
      saleId: sale.id,
      receiptNumber: sale.receiptNumber,
      warehouseId: sale.warehouseId,
      items: returnItems,
      totalRefund,
      refundMethod: input.refundMethod,
      reason: input.reason,
      isExchange: input.isExchange,
      storeId: sale.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-cashier',
    };

    nextDb.returns.unshift(ret);
    appendAudit(
      nextDb,
      user,
      'sale_return',
      'Return',
      retId,
      `Qaytarish ${retNum}: Chek ${sale.receiptNumber}, summa ${totalRefund}`,
      sale.storeId
    );
    await repository.save(nextDb);
    set({ db: nextDb });
    return ret;
  },

  syncOfflineQueue: async () => {
    const { db } = get();
    if (!db || db.offlineQueue.length === 0) return 0;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const count = nextDb.offlineQueue.length;
    const nowIso = new Date().toISOString();
    nextDb.sales.forEach((s) => {
      if (s.offlineCreated && !s.syncedAt) {
        s.syncedAt = nowIso;
      }
    });
    nextDb.offlineQueue = [];
    await repository.save(nextDb);
    set({ db: nextDb });
    return count;
  },

  createPurchaseReceipt: async (receipt) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const id = uid('pr');
    const fullReceipt: PurchaseReceipt = {
      ...receipt,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-warehouse',
    };
    nextDb.purchaseReceipts.unshift(fullReceipt);

    receipt.items.forEach((it) => {
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: receipt.warehouseId,
        storeId: receipt.storeId,
        qtyDelta: it.qty,
        type: 'kirim',
        unitCost: it.purchasePrice,
        userId: user?.id ?? 'usr-warehouse',
        referenceId: id,
        referenceType: 'PurchaseReceipt',
        note: `Kirim ${receipt.number}`,
      });
      // update variant purchase price to latest
      const prod = nextDb.products.find((p) => p.id === it.productId);
      const variant = prod?.variants.find((v) => v.id === it.variantId);
      if (variant && it.purchasePrice > 0) variant.purchasePrice = it.purchasePrice;
    });

    const debt = receipt.totalAmount - receipt.paidAmount;
    if (debt > 0) {
      const sup = nextDb.suppliers.find((s) => s.id === receipt.supplierId);
      if (sup) sup.debtBalance += debt;
    }
    if (receipt.paidAmount > 0) {
      const cashAcc = nextDb.accounts.find((a) => a.type === 'cash') ?? nextDb.accounts[0];
      if (cashAcc) cashAcc.balance -= receipt.paidAmount;
    }

    await repository.save(nextDb);
    set({ db: nextDb });
  },

  createPurchaseOrder: async (po) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    nextDb.purchaseOrders.unshift({
      ...po,
      id: uid('po'),
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-manager',
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  updatePurchaseOrderStatus: async (poId, status) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const po = nextDb.purchaseOrders.find((p) => p.id === poId);
    if (po) {
      po.status = status;
      po.updatedAt = new Date().toISOString();
    }
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  createTransfer: async (transfer) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const id = uid('trf');
    const full: Transfer = {
      ...transfer,
      id,
      status: 'sent',
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-warehouse',
    };
    nextDb.transfers.unshift(full);

    transfer.items.forEach((it) => {
      const prod = nextDb.products.find((p) => p.id === it.productId);
      const variant = prod?.variants.find((v) => v.id === it.variantId);
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: transfer.fromWarehouseId,
        storeId: transfer.storeId,
        qtyDelta: -it.sentQty,
        type: 'kochirish_out',
        unitCost: variant?.purchasePrice ?? 0,
        userId: user?.id ?? 'usr-warehouse',
        referenceId: id,
        referenceType: 'Transfer',
        note: `Ko'chirish ${transfer.number} (chiqish)`,
      });
    });

    await repository.save(nextDb);
    set({ db: nextDb });
  },

  receiveTransfer: async (transferId, receivedItems) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const trf = nextDb.transfers.find((t) => t.id === transferId);
    if (!trf || trf.status !== 'sent') return;

    let hasDiscrepancy = false;
    trf.items.forEach((it) => {
      const rec = receivedItems.find((r) => r.variantId === it.variantId);
      const recQty = rec ? rec.receivedQty : it.sentQty;
      it.receivedQty = recQty;
      if (recQty !== it.sentQty) hasDiscrepancy = true;
      const prod = nextDb.products.find((p) => p.id === it.productId);
      const variant = prod?.variants.find((v) => v.id === it.variantId);
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: trf.toWarehouseId,
        storeId: trf.storeId,
        qtyDelta: recQty,
        type: 'kochirish_in',
        unitCost: variant?.purchasePrice ?? 0,
        userId: user?.id ?? 'usr-warehouse',
        referenceId: trf.id,
        referenceType: 'Transfer',
        note: `Ko'chirish ${trf.number} (qabul)`,
      });
    });
    trf.status = hasDiscrepancy ? 'discrepancy' : 'received';
    trf.updatedAt = new Date().toISOString();
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  createWriteOff: async (wo) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const id = uid('wo');
    nextDb.writeOffs.unshift({
      ...wo,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-warehouse',
    });
    wo.items.forEach((it) => {
      mutateStock(nextDb, {
        productId: it.productId,
        variantId: it.variantId,
        warehouseId: wo.warehouseId,
        storeId: wo.storeId,
        qtyDelta: -it.qty,
        type: 'chiqim',
        unitCost: it.unitCost,
        userId: user?.id ?? 'usr-warehouse',
        referenceId: id,
        referenceType: 'WriteOff',
        note: `Hisobdan chiqarish ${wo.number}: ${wo.reason}`,
      });
    });
    appendAudit(
      nextDb,
      user,
      'stock_writeoff',
      'WriteOff',
      id,
      `Hisobdan chiqarish ${wo.number} (${wo.reason}), tannarx: ${wo.totalCost}`,
      wo.storeId
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  saveStocktake: async (st) => {
    const { db } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const id = st.id || uid('inv');
    const full: Stocktake = {
      ...st,
      id,
      createdAt: st.id ? nextDb.stocktakes.find((x) => x.id === st.id)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-warehouse',
    };
    const idx = nextDb.stocktakes.findIndex((x) => x.id === id);
    if (idx >= 0) nextDb.stocktakes[idx] = full;
    else nextDb.stocktakes.unshift(full);
    await repository.save(nextDb);
    set({ db: nextDb });
    return full;
  },

  applyStocktake: async (stocktakeId) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const st = nextDb.stocktakes.find((x) => x.id === stocktakeId);
    if (!st || st.status === 'completed') return;

    st.items.forEach((it) => {
      const currentSys =
        nextDb.stockItems.find((s) => s.variantId === it.variantId && s.warehouseId === st.warehouseId)?.qty ?? 0;
      const diff = it.countedQty - currentSys;
      if (diff !== 0) {
        mutateStock(nextDb, {
          productId: it.productId,
          variantId: it.variantId,
          warehouseId: st.warehouseId,
          storeId: st.storeId,
          qtyDelta: diff,
          type: 'inventarizatsiya',
          unitCost: it.unitCost,
          userId: user?.id ?? 'usr-warehouse',
          referenceId: st.id,
          referenceType: 'Stocktake',
          note: `Inventarizatsiya ${st.number}`,
        });
      }
    });
    st.status = 'completed';
    st.updatedAt = new Date().toISOString();
    appendAudit(
      nextDb,
      user,
      'stocktake_apply',
      'Stocktake',
      st.id,
      `Inventarizatsiya ${st.number} tasdiqlandi va qoldiqlar tuzatildi`,
      st.storeId
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertSupplier: async (supplier) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.suppliers.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) nextDb.suppliers[idx] = supplier;
    else nextDb.suppliers.unshift(supplier);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  paySupplierDebt: async (supplierId, amount, accountId) => {
    const { db } = get();
    if (!db || amount <= 0) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const sup = nextDb.suppliers.find((s) => s.id === supplierId);
    const acc = nextDb.accounts.find((a) => a.id === accountId);
    if (!sup || !acc) return;
    sup.debtBalance = Math.max(0, sup.debtBalance - amount);
    acc.balance -= amount;
    const nowIso = new Date().toISOString();
    nextDb.transactions.unshift({
      id: uid('trx'),
      accountId: acc.id,
      type: 'expense',
      category: 'supplier_payment',
      amount,
      description: `Ta'minotchiga to'lov: ${sup.name}`,
      referenceId: sup.id,
      storeId: acc.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-owner',
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertCustomer: async (customer) => {
    const { db } = get();
    if (!db) throw new Error('DB not loaded');
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.customers.findIndex((c) => c.id === customer.id);
    const nowIso = new Date().toISOString();
    if (idx >= 0) {
      nextDb.customers[idx] = { ...customer, updatedAt: nowIso };
    } else {
      nextDb.customers.unshift(customer);
      const exp = new Date();
      exp.setDate(exp.getDate() + (nextDb.settings.cashbackExpiryDays || 180));
      nextDb.loyaltyAccounts.unshift({
        id: uid('loy'),
        customerId: customer.id,
        tier: 'bronze',
        cashbackPercent: nextDb.settings.loyaltyTiers[0]?.cashbackPercent ?? 2,
        pointsBalance: 0,
        cardNumber: `SHU-${1001 + nextDb.loyaltyAccounts.length}`,
        expiresAt: exp.toISOString(),
        storeId: customer.storeId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user?.id ?? 'usr-cashier',
      });
    }
    await repository.save(nextDb);
    set({ db: nextDb });
    return customer;
  },

  repayDebt: async (debtId, amount, method, note) => {
    const { db } = get();
    if (!db || amount <= 0) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const debt = nextDb.debts.find((d) => d.id === debtId);
    if (!debt) return;
    const applied = Math.min(amount, debt.remainingAmount);
    const nowIso = new Date().toISOString();
    debt.remainingAmount -= applied;
    debt.status = debt.remainingAmount <= 0 ? 'paid' : 'partial';
    debt.payments.push({ id: uid('dp'), amount: applied, method, paidAt: nowIso, note });
    debt.updatedAt = nowIso;

    const cust = nextDb.customers.find((c) => c.id === debt.customerId);
    if (cust) cust.debtBalance = Math.max(0, cust.debtBalance - applied);

    const acc = nextDb.accounts.find((a) => (method === 'cash' ? a.type === 'cash' : a.type === 'card_terminal')) ?? nextDb.accounts[0];
    if (acc) {
      acc.balance += applied;
      nextDb.transactions.unshift({
        id: uid('trx'),
        accountId: acc.id,
        type: 'income',
        category: 'debt_repayment',
        amount: applied,
        description: `Nasiya to'lovi: ${debt.customerName}`,
        referenceId: debt.id,
        storeId: debt.storeId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user?.id ?? 'usr-cashier',
      });
    }
    appendAudit(
      nextDb,
      user,
      'debt_repay',
      'Debt',
      debt.id,
      `${debt.customerName} qarzidan ${applied} so'm to'landi`,
      debt.storeId
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertPromoCode: async (promo) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.promoCodes.findIndex((p) => p.id === promo.id);
    if (idx >= 0) nextDb.promoCodes[idx] = promo;
    else nextDb.promoCodes.unshift(promo);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  addExpense: async (exp) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const id = uid('exp');
    nextDb.expenses.unshift({
      ...exp,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-owner',
    });
    const acc = nextDb.accounts.find((a) => a.id === exp.accountId);
    if (acc) acc.balance -= exp.amount;
    nextDb.transactions.unshift({
      id: uid('trx'),
      accountId: exp.accountId,
      type: 'expense',
      category: exp.category,
      amount: exp.amount,
      description: exp.description,
      referenceId: id,
      storeId: exp.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-owner',
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  transferFunds: async (fromAccountId, toAccountId, amount, note) => {
    const { db } = get();
    if (!db || amount <= 0 || fromAccountId === toAccountId) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const from = nextDb.accounts.find((a) => a.id === fromAccountId);
    const to = nextDb.accounts.find((a) => a.id === toAccountId);
    if (!from || !to) return;
    from.balance -= amount;
    to.balance += amount;
    const nowIso = new Date().toISOString();
    nextDb.transactions.unshift({
      id: uid('trx'),
      accountId: from.id,
      toAccountId: to.id,
      type: 'transfer',
      category: 'transfer',
      amount,
      description: note || `${from.name} -> ${to.name}`,
      storeId: from.storeId,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user?.id ?? 'usr-owner',
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertAccount: async (acc) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.accounts.findIndex((a) => a.id === acc.id);
    if (idx >= 0) nextDb.accounts[idx] = acc;
    else nextDb.accounts.push(acc);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertEmployee: async (emp, userUpdates, options) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.employees.findIndex((e) => e.id === emp.id);
    if (idx >= 0) nextDb.employees[idx] = emp;
    else nextDb.employees.unshift(emp);

    const uIdx = nextDb.users.findIndex((u) => u.id === emp.userId);
    if (uIdx >= 0) {
      const updatedUser: User = {
        ...nextDb.users[uIdx],
        name: emp.name,
        phone: emp.phone,
        roleId: emp.roleId,
        ...userUpdates,
        updatedAt: new Date().toISOString(),
      };
      if (options?.clearCustomPermissions) {
        delete updatedUser.customPermissions;
      }
      nextDb.users[uIdx] = updatedUser;
    } else {
      const nowIso = new Date().toISOString();
      const newUser: User = {
        id: emp.userId,
        name: emp.name,
        phone: emp.phone,
        password: userUpdates?.password || '123456',
        pin: userUpdates?.pin || String(Math.floor(1000 + Math.random() * 8999)),
        roleId: emp.roleId,
        assignedStoreIds: userUpdates?.assignedStoreIds?.length ? userUpdates.assignedStoreIds : [emp.storeId],
        isActive: userUpdates?.isActive ?? true,
        storeId: emp.storeId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'usr-owner',
      };
      if (!options?.clearCustomPermissions && userUpdates?.customPermissions) {
        newUser.customPermissions = userUpdates.customPermissions;
      }
      nextDb.users.push(newUser);
    }
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  deleteEmployee: async (empId) => {
    const { db, currentUserId } = get();
    if (!db) return { ok: false, error: 'DB not loaded' };
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) return { ok: false, error: 'Xodim topilmadi' };
    if (emp.userId === 'usr-owner') {
      return { ok: false, error: "Asosiy do'kon egasini o'chirib bo'lmaydi" };
    }
    if (emp.userId === currentUserId) {
      return { ok: false, error: "Joriy tizimga kirgan o'z hisobingizni o'chira olmaysiz" };
    }
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.employees = nextDb.employees.filter((e) => e.id !== empId);
    nextDb.users = nextDb.users.filter((u) => u.id !== emp.userId);
    nextDb.targets = nextDb.targets.filter((tg) => tg.employeeId !== empId);
    await repository.save(nextDb);
    set({ db: nextDb });
    return { ok: true };
  },

  updateUserCredentials: async (userId, input) => {
    const { db } = get();
    if (!db) return { ok: false, error: 'DB not loaded' };
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const user = nextDb.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'Foydalanuvchi topilmadi' };

    if (input.currentPassword !== undefined && input.currentPassword !== user.password) {
      return { ok: false, error: "Joriy parol noto'g'ri" };
    }
    if (input.newPin !== undefined) {
      const cleanPin = input.newPin.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        return { ok: false, error: 'PIN-kod aniq 4 ta raqamdan iborat bo\'lishi kerak' };
      }
      const duplicate = nextDb.users.find((u) => u.id !== userId && u.pin === cleanPin && u.isActive);
      if (duplicate) {
        return { ok: false, error: `Bu PIN-kod (${cleanPin}) boshqa xodimda band` };
      }
      user.pin = cleanPin;
    }
    if (input.newPassword !== undefined) {
      const cleanPass = input.newPassword.trim();
      if (cleanPass.length < 4) {
        return { ok: false, error: "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak" };
      }
      user.password = cleanPass;
    }
    if (input.name !== undefined && input.name.trim()) {
      user.name = input.name.trim();
      const emp = nextDb.employees.find((e) => e.userId === userId);
      if (emp) emp.name = user.name;
    }
    user.updatedAt = new Date().toISOString();
    await repository.save(nextDb);
    set({ db: nextDb });
    return { ok: true };
  },

  upsertTarget: async (target) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.targets.findIndex((t) => t.id === target.id);
    if (idx >= 0) nextDb.targets[idx] = target;
    else nextDb.targets.unshift(target);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  createOnlineOrder: async (orderInput) => {
    const { db } = get();
    if (!db) throw new Error('DB not loaded');
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const nowIso = new Date().toISOString();
    const order: OnlineOrder = {
      ...orderInput,
      id: uid('ord'),
      orderNumber: `WEB-${205 + nextDb.onlineOrders.length}`,
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: 'web-guest',
    };
    nextDb.onlineOrders.unshift(order);
    await repository.save(nextDb);
    set({ db: nextDb });
    return order;
  },

  updateOnlineOrderStatus: async (orderId, status) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const ord = nextDb.onlineOrders.find((o) => o.id === orderId);
    if (!ord) return;
    const prevStatus = ord.status;
    ord.status = status;
    ord.updatedAt = new Date().toISOString();

    if (prevStatus === 'new' && status === 'confirmed') {
      const whId = get().getWarehouseForStore(ord.storeId);
      ord.items.forEach((it) => {
        const prod = nextDb.products.find((p) => p.id === it.productId);
        const variant = prod?.variants.find((v) => v.id === it.variantId);
        mutateStock(nextDb, {
          productId: it.productId,
          variantId: it.variantId,
          warehouseId: whId,
          storeId: ord.storeId,
          qtyDelta: -it.qty,
          type: 'online_sotuv',
          unitCost: variant?.purchasePrice ?? 0,
          userId: user?.id ?? 'usr-manager',
          referenceId: ord.id,
          referenceType: 'OnlineOrder',
          note: `Onlayn buyurtma ${ord.orderNumber}`,
        });
      });
    } else if (prevStatus === 'confirmed' && status === 'canceled') {
      const whId = get().getWarehouseForStore(ord.storeId);
      ord.items.forEach((it) => {
        const prod = nextDb.products.find((p) => p.id === it.productId);
        const variant = prod?.variants.find((v) => v.id === it.variantId);
        mutateStock(nextDb, {
          productId: it.productId,
          variantId: it.variantId,
          warehouseId: whId,
          storeId: ord.storeId,
          qtyDelta: it.qty,
          type: 'qaytarish',
          unitCost: variant?.purchasePrice ?? 0,
          userId: user?.id ?? 'usr-manager',
          referenceId: ord.id,
          referenceType: 'OnlineOrder',
          note: `Bekor qilingan buyurtma ${ord.orderNumber}`,
        });
      });
    }

    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertStore: async (store) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.stores.findIndex((s) => s.id === store.id);
    if (idx >= 0) nextDb.stores[idx] = store;
    else nextDb.stores.push(store);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  deleteStore: async (storeId) => {
    const { db, activeStoreId } = get();
    if (!db) return { ok: false, error: 'DB not loaded' };
    if (db.stores.length <= 1) {
      return { ok: false, error: "Kamida 1 ta filial qolishi shart" };
    }
    const store = db.stores.find((s) => s.id === storeId);
    if (!store) return { ok: false, error: 'Filial topilmadi' };

    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.stores = nextDb.stores.filter((s) => s.id !== storeId);
    if (nextDb.warehouses.length > 1) {
      nextDb.warehouses = nextDb.warehouses.filter((w) => w.id !== store.defaultWarehouseId);
    }
    const fallbackStoreId = nextDb.stores[0].id;
    nextDb.users.forEach((u) => {
      u.assignedStoreIds = u.assignedStoreIds.filter((id) => id !== storeId);
      if (u.assignedStoreIds.length === 0) {
        u.assignedStoreIds = [fallbackStoreId];
      }
      if (u.storeId === storeId) u.storeId = fallbackStoreId;
    });
    nextDb.employees.forEach((e) => {
      if (e.storeId === storeId) e.storeId = fallbackStoreId;
    });

    await repository.save(nextDb);
    set({
      db: nextDb,
      activeStoreId: activeStoreId === storeId ? 'all' : activeStoreId,
    });
    return { ok: true };
  },

  upsertWarehouse: async (wh) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.warehouses.findIndex((w) => w.id === wh.id);
    if (idx >= 0) nextDb.warehouses[idx] = wh;
    else nextDb.warehouses.push(wh);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  updateSettings: async (partial) => {
    const { db } = get();
    if (!db) return;
    const user = get().getCurrentUser();
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.settings = { ...nextDb.settings, ...partial };
    appendAudit(
      nextDb,
      user,
      'settings_change',
      'AppSettings',
      'settings',
      'Tizim sozlamalari yangilandi',
      nextDb.stores[0]?.id ?? 'store-chilonzor'
    );
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertCategory: async (cat) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.categories.findIndex((c) => c.id === cat.id);
    if (idx >= 0) nextDb.categories[idx] = { ...cat, updatedAt: new Date().toISOString() };
    else nextDb.categories.push(cat);
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  deleteCategory: async (catId) => {
    const { db } = get();
    if (!db) return { ok: false, error: 'DB not loaded' };
    if (db.categories.length <= 1) {
      return { ok: false, error: "Kamida 1 ta kategoriya qolishi shart" };
    }
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.categories = nextDb.categories.filter((c) => c.id !== catId);
    const fallbackCatId = nextDb.categories[0].id;
    nextDb.products.forEach((p) => {
      if (p.categoryId === catId) {
        p.categoryId = fallbackCatId;
      }
    });
    await repository.save(nextDb);
    set({ db: nextDb });
    return { ok: true };
  },

  resetCategoriesToMensClothing: async () => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const mensCats = getMensClothingCategories(nextDb.stores[0]?.id ?? 'store-chilonzor');
    nextDb.categories = mensCats;
    const validIds = new Set(mensCats.map((c) => c.id));
    nextDb.products.forEach((p) => {
      if (!validIds.has(p.categoryId)) {
        p.categoryId = mensCats[0].id;
      }
    });
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  updateRolePermissions: async (roleId, permissions) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const role = nextDb.roles.find((r) => r.id === roleId);
    if (role) role.permissions = permissions;
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  upsertRole: async (role) => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    const idx = nextDb.roles.findIndex((r) => r.id === role.id);
    if (idx >= 0) {
      nextDb.roles[idx] = role;
    } else {
      nextDb.roles.push(role);
    }
    await repository.save(nextDb);
    set({ db: nextDb });
  },

  deleteRole: async (roleId) => {
    const { db } = get();
    if (!db) return { ok: false, error: 'DB not loaded' };
    if (roleId === 'owner') {
      return { ok: false, error: "Egasi (Owner) rolini o'chirib bo'lmaydi" };
    }
    if (db.roles.length <= 2) {
      return { ok: false, error: "Kamida 2 ta rol qolishi kerak" };
    }
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.roles = nextDb.roles.filter((r) => r.id !== roleId);
    const fallbackRole =
      nextDb.roles.find((r) => r.id === 'cashier')?.id ??
      nextDb.roles.find((r) => r.id !== 'owner')?.id ??
      nextDb.roles[0].id;
    nextDb.users.forEach((u) => {
      if (u.roleId === roleId) u.roleId = fallbackRole;
    });
    nextDb.employees.forEach((e) => {
      if (e.roleId === roleId) e.roleId = fallbackRole;
    });
    await repository.save(nextDb);
    set({ db: nextDb });
    return { ok: true };
  },

  resetDemoData: async () => {
    const fresh = await repository.resetToDemo();
    set({ db: fresh });
  },

  clearAllTestData: async () => {
    const { db } = get();
    if (!db) return;
    const nextDb: DatabaseSnapshot = structuredClone(db);
    nextDb.products = [];
    nextDb.stockItems = [];
    nextDb.stockMovements = [];
    nextDb.purchaseReceipts = [];
    nextDb.purchaseOrders = [];
    nextDb.transfers = [];
    nextDb.writeOffs = [];
    nextDb.stocktakes = [];
    nextDb.sales = [];
    nextDb.returns = [];
    nextDb.cashShifts = [];
    nextDb.cashOperations = [];
    nextDb.transactions = [];
    nextDb.expenses = [];
    nextDb.customers = [];
    nextDb.loyaltyAccounts = [];
    nextDb.loyaltyTransactions = [];
    nextDb.debts = [];
    nextDb.promoCodes = [];
    nextDb.onlineOrders = [];
    nextDb.auditLogs = [];
    nextDb.offlineQueue = [];
    nextDb.targets = [];
    nextDb.accounts = nextDb.accounts.map((a) => ({ ...a, balance: 0 }));
    nextDb.suppliers = nextDb.suppliers.map((s) => ({ ...s, debtBalance: 0 }));
    localStorage.removeItem(HELD_CARTS_KEY);
    await repository.save(nextDb);
    set({
      db: nextDb,
      heldCarts: [],
      cartItems: [],
      cartCustomerId: '',
      cartDiscountPercent: 0,
      cartDiscountFixed: 0,
      cartPromoCode: '',
      cartLoyaltySpent: 0,
    });
  },

  importBackupJson: async (json) => {
    const imported = await repository.importJson(json);
    set({ db: imported });
  },
}));
