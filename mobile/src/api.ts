import { Platform } from 'react-native';

/**
 * يحدد عنوان الـ API تلقائياً:
 *  - GitHub Codespaces:  https://<name>-8000.app.github.dev
 *  - Gitpod:             https://8000-<workspace>.gitpod.io
 *  - داخل معاينة e2b:    https://8000-<sandbox>.e2b.app
 *  - على الويب محلياً:   http://localhost:8000
 *  - على الموبايل:       عدّل LAN_IP لعنوان جهازك في الشبكة
 *
 * تقدر تتجاوز كل ده بمتغير البيئة EXPO_PUBLIC_API_URL.
 */
const LAN_IP = '192.168.1.5'; // ← غيّرها لـ IP جهازك عند التشغيل على موبايل حقيقي
const API_PORT = '8000';

function resolveBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    // GitHub Codespaces / github.dev  →  <name>-<port>.app.github.dev
    const cs = hostname.match(/^(.+)-(\d+)\.(app\.github\.dev|githubpreview\.dev)$/);
    if (cs) return `${protocol}//${cs[1]}-${API_PORT}.${cs[3]}`;

    // Gitpod  →  <port>-<workspace>.<cluster>.gitpod.io
    const gp = hostname.match(/^(\d+)-(.+\.gitpod\.io)$/);
    if (gp) return `${protocol}//${API_PORT}-${gp[2]}`;

    // e2b sandbox preview  →  <port>-<sandbox>.e2b.app
    const e2b = hostname.match(/^(\d+)-(.+\.e2b\.app)$/);
    if (e2b) return `${protocol}//${API_PORT}-${e2b[2]}`;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:${API_PORT}`;
    }
    return `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${API_PORT}` : ''}`;
  }
  return `http://${LAN_IP}:${API_PORT}`;
}

export const API_BASE = resolveBase();

let authToken: string | null = null;
export const setToken = (t: string | null) => { authToken = t; };
export const getToken = () => authToken;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم — تأكد أن الـ API يعمل', 0);
  }

  if (res.status === 204) return null as T;
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && (data.detail?.[0]?.msg || data.detail || data.message)) || `خطأ ${res.status}`;
    throw new ApiError(typeof msg === 'string' ? msg : JSON.stringify(msg), res.status);
  }
  return data as T;
}

const qs = (p: Record<string, any> = {}) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : '';
};

export const api = {
  base: API_BASE,
  get: <T,>(p: string, params?: Record<string, any>) => request<T>(`${p}${qs(params)}`),
  post: <T,>(p: string, body?: any, params?: Record<string, any>) =>
    request<T>(`${p}${qs(params)}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T,>(p: string, body?: any) =>
    request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T,>(p: string, body?: any, params?: Record<string, any>) =>
    request<T>(`${p}${qs(params)}`, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(p: string) => request<T>(p, { method: 'DELETE' }),
  fileUrl: (p: string) => (p?.startsWith('http') ? p : `${API_BASE}${p}`),
  docUrl: (p: string) => `${API_BASE}${p}${p.includes('?') ? '&' : '?'}access_token=${authToken ?? ''}`,
};

// ------------------------------------------------------------------ types
export type Role = 'admin' | 'customer';

export interface User {
  id: number; name: string; email: string; phone: string; role: Role;
  organization: string; city: string; address: string; is_active: boolean; created_at: string;
}
export interface Category {
  id: number; slug: string; name_ar: string; name_en: string;
  description_ar: string; description_en: string; icon: string;
  sort_order: number; is_active: boolean; product_count: number;
}
export interface Spec { key_ar: string; key_en: string; value_ar: string; value_en: string }
export interface Product {
  id: number; sku: string; slug: string; name_ar: string; name_en: string;
  brand: string; model: string; category_id: number;
  category_name_ar: string; category_name_en: string;
  short_ar: string; short_en: string; description_ar: string; description_en: string;
  image: string; images: string[]; specs: Spec[];
  is_for_rent: boolean; is_for_sale: boolean; is_active: boolean; is_featured: boolean;
  sale_price: number; rent_daily: number; rent_weekly: number; rent_monthly: number;
  deposit: number; late_fee_per_day: number; min_rent_days: number;
  requires_training: boolean; warranty_months: number;
  rating_avg: number; rating_count: number; units_total: number; units_available: number;
}
export interface Unit {
  id: number; product_id: number; product_name_ar: string; product_name_en: string;
  serial_number: string; asset_tag: string; status: string; condition_note: string;
  purchase_date: string | null; purchase_cost: number; location: string;
  last_service_at: string | null; next_service_due: string | null;
  total_rentals: number; is_active: boolean;
}
export interface OrderItem {
  id: number; product_id: number; product_name_ar: string; product_name_en: string;
  product_image: string; unit_id: number | null; unit_serial: string | null;
  qty: number; pricing_mode: string; pricing_breakdown: any;
  unit_price: number; deposit: number; line_total: number; returned_at: string | null;
}
export interface Order {
  id: number; code: string; user_id: number; customer_name: string; customer_phone: string;
  type: 'rent' | 'sale'; status: string;
  start_date: string | null; end_date: string | null; days: number;
  actual_return_date: string | null;
  subtotal: number; deposit_total: number; late_fee_total: number;
  discount: number; delivery_fee: number; total: number;
  payment_method: string; payment_status: string;
  contact_name: string; contact_phone: string; delivery_address: string;
  notes: string; admin_note: string; created_at: string; approved_at: string | null;
  items: OrderItem[]; invoice_number: string | null; amount_paid: number; amount_due: number;
}
export interface Ticket {
  id: number; code: string; unit_id: number; unit_serial: string;
  product_name_ar: string; product_name_en: string;
  type: string; status: string; priority: string; title: string; description: string;
  technician: string; cost: number; scheduled_at: string | null;
  completed_at: string | null; next_due_at: string | null; created_at: string;
}
export interface Review {
  id: number; product_id: number; product_name_ar: string; user_id: number;
  user_name: string; rating: number; comment: string; is_approved: boolean; created_at: string;
}
export interface Post {
  id: number; slug: string; title_ar: string; title_en: string;
  excerpt_ar: string; excerpt_en: string; body_ar: string; body_en: string;
  cover: string; author: string; tags: string[]; is_published: boolean;
  published_at: string; views: number;
}
export interface Notif {
  id: number; title_ar: string; title_en: string; body_ar: string; body_en: string;
  level: string; link: string; is_read: boolean; created_at: string;
}
export interface Quote {
  total: number; mode: string; breakdown: { months: number; weeks: number; days: number };
  days: number; effective_daily: number; list_price: number; saving: number;
  qty: number; subtotal: number; deposit: number; grand_total: number;
  late_fee_per_day: number;
  availability: { available: number; total_units: number; is_available: boolean; unit_ids: number[] };
}
export interface Dashboard {
  kpis: Record<string, number>;
  units_by_status: Record<string, number>;
  revenue_series: { month: string; revenue: number; orders: number }[];
  top_products: { product_id: number; name_ar: string; name_en: string; orders: number; revenue: number }[];
  overdue_orders: any[]; due_soon: any[];
}
