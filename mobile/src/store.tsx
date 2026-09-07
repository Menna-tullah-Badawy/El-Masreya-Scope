import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken, User, Notif, Product } from './api';
import { Lang } from './i18n';

// ---------------------------------------------------------------- routing
export type Route =
  | { name: 'home' }
  | { name: 'catalog'; category?: string; mode?: 'rent' | 'sale'; q?: string }
  | { name: 'product'; id: number }
  | { name: 'compare' }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'orders' }
  | { name: 'order'; id: number }
  | { name: 'blog' }
  | { name: 'post'; id: number }
  | { name: 'profile' }
  | { name: 'auth'; mode?: 'login' | 'register' }
  | { name: 'notifications' }
  | { name: 'admin.dashboard' }
  | { name: 'admin.products' }
  | { name: 'admin.units' }
  | { name: 'admin.orders' }
  | { name: 'admin.order'; id: number }
  | { name: 'admin.customers' }
  | { name: 'admin.maintenance' }
  | { name: 'admin.reviews' }
  | { name: 'admin.posts' }
  | { name: 'admin.reports' }
  | { name: 'admin.settings' };

export interface CartLine {
  product: Product;
  qty: number;
  type: 'rent' | 'sale';
}

interface Toast { id: number; msg: string; level: 'success' | 'error' | 'info' }

interface Store {
  lang: Lang;
  setLang: (l: Lang) => void;
  rtl: boolean;

  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  route: Route;
  go: (r: Route) => void;
  back: () => void;
  canGoBack: boolean;

  cart: CartLine[];
  cartDates: { start: string; end: string };
  setCartDates: (d: { start: string; end: string }) => void;
  addToCart: (p: Product, qty: number, type: 'rent' | 'sale') => void;
  removeFromCart: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clearCart: () => void;
  cartCount: number;

  compare: Product[];
  toggleCompare: (p: Product) => void;
  clearCompare: () => void;

  notifications: Notif[];
  unread: number;
  loadNotifications: () => Promise<void>;

  settings: Record<string, any>;
  toasts: Toast[];
  toast: (msg: string, level?: 'success' | 'error' | 'info') => void;
}

const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

const TOKEN_KEY = 'scope.token';
const LANG_KEY = 'scope.lang';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [compare, setCompare] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const today = new Date();
  const [cartDates, setCartDates] = useState({
    start: new Date(today.getTime() + 86400000).toISOString().slice(0, 10),
    end: new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const toast = useCallback((msg: string, level: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, level }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const list = await api.get<Notif[]>('/api/notifications');
      setNotifications(list);
    } catch { /* silent */ }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get<User>('/api/auth/me');
      setUser(u);
      loadNotifications();
    } catch {
      setUser(null);
      setToken(null);
      AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    }
  }, [loadNotifications]);

  useEffect(() => {
    (async () => {
      try {
        const [tk, lg] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(LANG_KEY),
        ]);
        if (lg === 'ar' || lg === 'en') setLangState(lg);
        if (tk) { setToken(tk); await refreshUser(); }
      } finally { setBooting(false); }
      try { setSettings(await api.get('/api/settings')); } catch { /* silent */ }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/api/auth/login', { email, password });
    setToken(res.access_token);
    await AsyncStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    loadNotifications();
    return res.user;
  }, [loadNotifications]);

  const register = useCallback(async (payload: any) => {
    const res = await api.post<{ access_token: string; user: User }>('/api/auth/register', payload);
    setToken(res.access_token);
    await AsyncStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
    loadNotifications();
    return res.user;
  }, [loadNotifications]);

  const logout = useCallback(async () => {
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setNotifications([]);
    setStack([{ name: 'home' }]);
  }, []);

  const go = useCallback((r: Route) => {
    setStack((s) => (s[s.length - 1]?.name === r.name && JSON.stringify(s[s.length - 1]) === JSON.stringify(r)
      ? s : [...s, r]));
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const addToCart = useCallback((p: Product, qty: number, type: 'rent' | 'sale') => {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id && l.type === type);
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], qty: copy[i].qty + qty };
        return copy;
      }
      return [...c, { product: p, qty, type }];
    });
  }, []);
  const removeFromCart = useCallback((id: number) =>
    setCart((c) => c.filter((l) => l.product.id !== id)), []);
  const setQty = useCallback((id: number, qty: number) =>
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: Math.max(1, qty) } : l))), []);
  const clearCart = useCallback(() => setCart([]), []);

  const toggleCompare = useCallback((p: Product) => {
    setCompare((c) => {
      if (c.find((x) => x.id === p.id)) return c.filter((x) => x.id !== p.id);
      if (c.length >= 4) return c;
      return [...c, p];
    });
  }, []);

  const value = useMemo<Store>(() => ({
    lang, setLang, rtl: lang === 'ar',
    user, booting, login, register, logout, refreshUser,
    route: stack[stack.length - 1], go, back, canGoBack: stack.length > 1,
    cart, cartDates, setCartDates, addToCart, removeFromCart, setQty, clearCart,
    cartCount: cart.reduce((s, l) => s + l.qty, 0),
    compare, toggleCompare, clearCompare: () => setCompare([]),
    notifications, unread: notifications.filter((n) => !n.is_read).length, loadNotifications,
    settings, toasts, toast,
  }), [lang, setLang, user, booting, login, register, logout, refreshUser, stack, go, back,
    cart, cartDates, addToCart, removeFromCart, setQty, clearCart, compare, toggleCompare,
    notifications, loadNotifications, settings, toasts, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
