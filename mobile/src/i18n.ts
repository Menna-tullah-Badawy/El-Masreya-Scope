export type Lang = 'ar' | 'en';

const dict = {
  // ---------------------------------------------------------------- common
  appName: { ar: 'سكوب', en: 'SCOPE' },
  appTagline: { ar: 'الشركة المصرية للأجهزة الطبية', en: 'Egypt Medical Equipment' },
  home: { ar: 'الرئيسية', en: 'Home' },
  catalog: { ar: 'الأجهزة', en: 'Catalog' },
  cart: { ar: 'السلة', en: 'Cart' },
  orders: { ar: 'طلباتي', en: 'My Orders' },
  blog: { ar: 'مقالات', en: 'Articles' },
  profile: { ar: 'حسابي', en: 'Profile' },
  more: { ar: 'المزيد', en: 'More' },
  search: { ar: 'ابحث عن جهاز…', en: 'Search devices…' },
  loading: { ar: 'جارٍ التحميل…', en: 'Loading…' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  delete: { ar: 'حذف', en: 'Delete' },
  edit: { ar: 'تعديل', en: 'Edit' },
  add: { ar: 'إضافة', en: 'Add' },
  close: { ar: 'إغلاق', en: 'Close' },
  confirm: { ar: 'تأكيد', en: 'Confirm' },
  back: { ar: 'رجوع', en: 'Back' },
  next: { ar: 'التالي', en: 'Next' },
  all: { ar: 'الكل', en: 'All' },
  none: { ar: 'لا يوجد', en: 'None' },
  from: { ar: 'من', en: 'From' },
  to: { ar: 'إلى', en: 'To' },
  day: { ar: 'يوم', en: 'day' },
  days: { ar: 'يوم', en: 'days' },
  week: { ar: 'أسبوع', en: 'week' },
  month: { ar: 'شهر', en: 'month' },
  currency: { ar: 'ج.م', en: 'EGP' },
  qty: { ar: 'الكمية', en: 'Qty' },
  total: { ar: 'الإجمالي', en: 'Total' },
  subtotal: { ar: 'الإجمالي الفرعي', en: 'Subtotal' },
  deposit: { ar: 'التأمين', en: 'Deposit' },
  refundable: { ar: 'مسترد', en: 'refundable' },
  status: { ar: 'الحالة', en: 'Status' },
  date: { ar: 'التاريخ', en: 'Date' },
  notes: { ar: 'ملاحظات', en: 'Notes' },
  phone: { ar: 'الهاتف', en: 'Phone' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  name: { ar: 'الاسم', en: 'Name' },
  address: { ar: 'العنوان', en: 'Address' },
  city: { ar: 'المدينة', en: 'City' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  organization: { ar: 'الجهة / المستشفى', en: 'Organization' },
  customer: { ar: 'عميل', en: 'Customer' },
  admin: { ar: 'مدير', en: 'Admin' },
  filters: { ar: 'فلاتر', en: 'Filters' },
  apply: { ar: 'تطبيق', en: 'Apply' },
  reset: { ar: 'مسح', en: 'Reset' },
  results: { ar: 'نتيجة', en: 'results' },
  noResults: { ar: 'لا توجد نتائج', en: 'No results found' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  error: { ar: 'حدث خطأ', en: 'Something went wrong' },
  yes: { ar: 'نعم', en: 'Yes' },
  no: { ar: 'لا', en: 'No' },
  optional: { ar: 'اختياري', en: 'optional' },
  required: { ar: 'مطلوب', en: 'required' },

  // ------------------------------------------------------------------ home
  heroTitle: { ar: 'تأجير وبيع المناظير والأجهزة الطبية', en: 'Medical Endoscopes & Equipment' },
  heroSub: {
    ar: 'أجهزة معتمدة · تعقيم موثّق بعد كل استخدام · تركيب وتدريب مجاني · تسليم لباب عيادتك',
    en: 'Certified devices · Validated sterilization · Free setup & training · Delivered to you',
  },
  browseNow: { ar: 'تصفح الأجهزة', en: 'Browse devices' },
  callUs: { ar: 'اتصل بنا', en: 'Call us' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  categories: { ar: 'الأقسام', en: 'Categories' },
  featured: { ar: 'أجهزة مميزة', en: 'Featured devices' },
  latestPosts: { ar: 'أحدث المقالات', en: 'Latest articles' },
  seeAll: { ar: 'عرض الكل', en: 'See all' },
  whyUs: { ar: 'ليه سكوب؟', en: 'Why SCOPE?' },
  why1t: { ar: 'تعقيم موثّق', en: 'Validated sterilization' },
  why1d: { ar: 'كل جهاز يخرج بشهادة تعقيم بتاريخ ورقم دورة.', en: 'Every device ships with a dated sterilization certificate.' },
  why2t: { ar: 'تسليم في نفس اليوم', en: 'Same-day delivery' },
  why2d: { ar: 'داخل القاهرة والجيزة خلال 6 ساعات.', en: 'Within Cairo & Giza in 6 hours.' },
  why3t: { ar: 'دعم فني 24/7', en: '24/7 technical support' },
  why3d: { ar: 'استبدال الجهاز خلال 24 ساعة عند أي عطل.', en: 'Device replacement within 24 hours.' },
  why4t: { ar: 'أسعار متدرجة', en: 'Tiered pricing' },
  why4d: { ar: 'النظام يحسب لك أرخص تركيبة تلقائياً.', en: 'We auto-calculate your cheapest combination.' },

  // --------------------------------------------------------------- catalog
  forRent: { ar: 'للإيجار', en: 'For rent' },
  forSale: { ar: 'للبيع', en: 'For sale' },
  rentAndSale: { ar: 'إيجار وبيع', en: 'Rent & sale' },
  perDay: { ar: '/ يوم', en: '/ day' },
  perWeek: { ar: '/ أسبوع', en: '/ week' },
  perMonth: { ar: '/ شهر', en: '/ month' },
  sortBy: { ar: 'ترتيب', en: 'Sort' },
  newest: { ar: 'الأحدث', en: 'Newest' },
  priceAsc: { ar: 'الأرخص', en: 'Price: low' },
  priceDesc: { ar: 'الأغلى', en: 'Price: high' },
  topRated: { ar: 'الأعلى تقييماً', en: 'Top rated' },
  popular: { ar: 'الأكثر طلباً', en: 'Most popular' },
  brand: { ar: 'الماركة', en: 'Brand' },
  available: { ar: 'متاح', en: 'available' },
  unavailable: { ar: 'غير متاح', en: 'Unavailable' },
  outOfStock: { ar: 'نفد المخزون', en: 'Out of stock' },
  compare: { ar: 'مقارنة', en: 'Compare' },
  compareTitle: { ar: 'مقارنة الأجهزة', en: 'Compare devices' },
  addToCompare: { ar: 'أضف للمقارنة', en: 'Add to compare' },
  inCompare: { ar: 'في المقارنة', en: 'In compare' },

  // --------------------------------------------------------------- product
  specs: { ar: 'المواصفات', en: 'Specifications' },
  description: { ar: 'الوصف', en: 'Description' },
  reviews: { ar: 'التقييمات', en: 'Reviews' },
  writeReview: { ar: 'اكتب تقييمك', en: 'Write a review' },
  yourRating: { ar: 'تقييمك', en: 'Your rating' },
  sendReview: { ar: 'إرسال التقييم', en: 'Submit review' },
  reviewPending: { ar: 'تقييمك في انتظار الاعتماد — شكراً لك!', en: 'Your review is awaiting approval — thank you!' },
  noReviews: { ar: 'لا توجد تقييمات بعد. كن أول من يقيّم!', en: 'No reviews yet. Be the first!' },
  pickDates: { ar: 'اختر فترة الإيجار', en: 'Pick your rental period' },
  checkAvailability: { ar: 'تحقق من التوافر', en: 'Check availability' },
  bestPrice: { ar: 'أفضل سعر لك', en: 'Your best price' },
  youSave: { ar: 'وفّرت', en: 'You save' },
  insteadOf: { ar: 'بدلاً من', en: 'instead of' },
  addToCart: { ar: 'أضف للسلة', en: 'Add to cart' },
  buyNow: { ar: 'اشترِ الآن', en: 'Buy now' },
  lateFee: { ar: 'غرامة التأخير', en: 'Late fee' },
  perDayShort: { ar: '/يوم', en: '/day' },
  minRent: { ar: 'الحد الأدنى للإيجار', en: 'Minimum rental' },
  warranty: { ar: 'الضمان', en: 'Warranty' },
  months: { ar: 'شهر', en: 'months' },
  needsTraining: { ar: 'يحتاج تدريب (مشمول مجاناً)', en: 'Training required (included free)' },
  serialTracked: { ar: 'متتبع بالرقم التسلسلي', en: 'Serial-tracked' },
  busyDates: { ar: 'الأيام المحجوزة', en: 'Booked dates' },
  addedToCart: { ar: 'تمت الإضافة للسلة ✓', en: 'Added to cart ✓' },

  // ------------------------------------------------------------------ cart
  emptyCart: { ar: 'السلة فارغة', en: 'Your cart is empty' },
  emptyCartSub: { ar: 'تصفح الأجهزة وأضف اللي محتاجه.', en: 'Browse devices and add what you need.' },
  rentalPeriod: { ar: 'فترة الإيجار', en: 'Rental period' },
  checkout: { ar: 'إتمام الطلب', en: 'Checkout' },
  deliveryDetails: { ar: 'بيانات التوصيل', en: 'Delivery details' },
  paymentMethod: { ar: 'طريقة الدفع', en: 'Payment method' },
  cashOnDelivery: { ar: 'كاش عند الاستلام', en: 'Cash on delivery' },
  cardStripe: { ar: 'بطاقة ائتمان (Stripe)', en: 'Credit card (Stripe)' },
  demoMode: { ar: 'وضع تجريبي', en: 'Demo mode' },
  placeOrder: { ar: 'تأكيد الطلب', en: 'Place order' },
  orderPlaced: { ar: 'تم إرسال طلبك بنجاح 🎉', en: 'Your order has been placed 🎉' },
  orderPlacedSub: { ar: 'هنراجع الطلب ونتواصل معاك خلال وقت قصير.', en: 'We will review it and contact you shortly.' },
  payNow: { ar: 'ادفع الآن', en: 'Pay now' },
  paySuccess: { ar: 'تم الدفع بنجاح ✓', en: 'Payment successful ✓' },
  removeItem: { ar: 'حذف من السلة', en: 'Remove' },

  // ---------------------------------------------------------------- orders
  noOrders: { ar: 'لا توجد طلبات بعد', en: 'No orders yet' },
  orderNo: { ar: 'طلب رقم', en: 'Order' },
  orderDetails: { ar: 'تفاصيل الطلب', en: 'Order details' },
  timeline: { ar: 'مسار الطلب', en: 'Timeline' },
  downloadInvoice: { ar: 'تحميل الفاتورة PDF', en: 'Download invoice PDF' },
  downloadContract: { ar: 'تحميل العقد PDF', en: 'Download contract PDF' },
  cancelOrder: { ar: 'إلغاء الطلب', en: 'Cancel order' },
  paid: { ar: 'المدفوع', en: 'Paid' },
  due: { ar: 'المتبقي', en: 'Due' },
  contactWhatsapp: { ar: 'تواصل عبر واتساب', en: 'Chat on WhatsApp' },

  st_pending: { ar: 'قيد المراجعة', en: 'Pending review' },
  st_approved: { ar: 'تمت الموافقة', en: 'Approved' },
  st_rejected: { ar: 'مرفوض', en: 'Rejected' },
  st_active: { ar: 'جارٍ الآن', en: 'Active' },
  st_returned: { ar: 'تم الاسترجاع', en: 'Returned' },
  st_completed: { ar: 'مكتمل', en: 'Completed' },
  st_cancelled: { ar: 'ملغي', en: 'Cancelled' },

  // ------------------------------------------------------------------ auth
  login: { ar: 'تسجيل الدخول', en: 'Sign in' },
  logout: { ar: 'تسجيل الخروج', en: 'Sign out' },
  register: { ar: 'إنشاء حساب', en: 'Create account' },
  noAccount: { ar: 'ليس لديك حساب؟', en: "Don't have an account?" },
  haveAccount: { ar: 'لديك حساب بالفعل؟', en: 'Already have an account?' },
  loginRequired: { ar: 'سجل الدخول للمتابعة', en: 'Sign in to continue' },
  welcomeBack: { ar: 'أهلاً بعودتك 👋', en: 'Welcome back 👋' },
  demoAccounts: { ar: 'حسابات تجريبية', en: 'Demo accounts' },
  updateProfile: { ar: 'تحديث البيانات', en: 'Update profile' },
  profileUpdated: { ar: 'تم تحديث بياناتك ✓', en: 'Profile updated ✓' },
  newPassword: { ar: 'كلمة مرور جديدة (اتركها فارغة للإبقاء)', en: 'New password (leave blank to keep)' },

  // --------------------------------------------------------- notifications
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  markAllRead: { ar: 'تعليم الكل كمقروء', en: 'Mark all read' },
  noNotifications: { ar: 'لا توجد إشعارات', en: 'No notifications' },

  // ----------------------------------------------------------------- admin
  adminPanel: { ar: 'لوحة الإدارة', en: 'Admin panel' },
  dashboard: { ar: 'لوحة المعلومات', en: 'Dashboard' },
  products: { ar: 'المنتجات', en: 'Products' },
  units: { ar: 'الوحدات', en: 'Units' },
  allOrders: { ar: 'الطلبات', en: 'Orders' },
  customers: { ar: 'العملاء', en: 'Customers' },
  maintenance: { ar: 'الصيانة', en: 'Maintenance' },
  reports: { ar: 'التقارير', en: 'Reports' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  posts: { ar: 'المقالات', en: 'Posts' },
  exitAdmin: { ar: 'الخروج لواجهة العميل', en: 'Back to storefront' },

  revenueTotal: { ar: 'إجمالي الإيرادات', en: 'Total revenue' },
  revenueMonth: { ar: 'إيرادات الشهر', en: 'This month' },
  collected: { ar: 'المحصّل', en: 'Collected' },
  outstanding: { ar: 'مستحقات', en: 'Outstanding' },
  ordersPending: { ar: 'طلبات معلقة', en: 'Pending orders' },
  ordersActive: { ar: 'إيجارات جارية', en: 'Active rentals' },
  overdue: { ar: 'متأخرة', en: 'Overdue' },
  unitsAvailable: { ar: 'وحدات متاحة', en: 'Units available' },
  openTickets: { ar: 'تذاكر مفتوحة', en: 'Open tickets' },
  revenueTrend: { ar: 'الإيرادات — آخر 6 شهور', en: 'Revenue — last 6 months' },
  topProducts: { ar: 'أعلى الأجهزة إيراداً', en: 'Top devices by revenue' },
  fleetStatus: { ar: 'حالة الأسطول', en: 'Fleet status' },
  dueSoon: { ar: 'إرجاع قريب (3 أيام)', en: 'Returns due soon' },

  newProduct: { ar: 'منتج جديد', en: 'New product' },
  newUnit: { ar: 'وحدة جديدة', en: 'New unit' },
  newTicket: { ar: 'تذكرة صيانة', en: 'New ticket' },
  newPost: { ar: 'مقال جديد', en: 'New post' },
  serial: { ar: 'الرقم التسلسلي', en: 'Serial number' },
  location: { ar: 'الموقع', en: 'Location' },
  assignUnit: { ar: 'تخصيص وحدة', en: 'Assign unit' },
  approve: { ar: 'موافقة', en: 'Approve' },
  reject: { ar: 'رفض', en: 'Reject' },
  markDelivered: { ar: 'تم التسليم', en: 'Mark delivered' },
  markReturned: { ar: 'تسجيل الاسترجاع', en: 'Record return' },
  markCompleted: { ar: 'إنهاء الطلب', en: 'Complete order' },
  recordPayment: { ar: 'تسجيل دفعة', en: 'Record payment' },
  amount: { ar: 'المبلغ', en: 'Amount' },
  discount: { ar: 'خصم', en: 'Discount' },
  deliveryFee: { ar: 'رسوم التوصيل', en: 'Delivery fee' },
  adminNote: { ar: 'ملاحظة إدارية', en: 'Admin note' },
  returnDate: { ar: 'تاريخ الاسترجاع الفعلي', en: 'Actual return date' },
  conditionNote: { ar: 'حالة الجهاز عند الاسترجاع', en: 'Condition on return' },
  sendToSterilization: { ar: 'إرسال للتعقيم تلقائياً', en: 'Send to sterilization' },
  printLabel: { ar: 'طباعة ملصق QR', en: 'Print QR label' },
  pendingReviews: { ar: 'تقييمات بانتظار الاعتماد', en: 'Reviews awaiting approval' },
  approveReview: { ar: 'اعتماد', en: 'Approve' },
  serviceDue: { ar: 'صيانة مستحقة', en: 'Service due' },
  technician: { ar: 'الفني', en: 'Technician' },
  cost: { ar: 'التكلفة', en: 'Cost' },
  priority: { ar: 'الأولوية', en: 'Priority' },
  ticketType: { ar: 'نوع التذكرة', en: 'Type' },
  utilization: { ar: 'نسبة التشغيل', en: 'Utilization' },
  assetValue: { ar: 'قيمة الأصول', en: 'Asset value' },
  inventoryReport: { ar: 'تقرير المخزون', en: 'Inventory report' },
  revenueReport: { ar: 'تقرير الإيرادات', en: 'Revenue report' },
  exportCsv: { ar: 'تصدير CSV', en: 'Export CSV' },
  saved: { ar: 'تم الحفظ ✓', en: 'Saved ✓' },
  deleted: { ar: 'تم الحذف ✓', en: 'Deleted ✓' },
  confirmDelete: { ar: 'متأكد من الحذف؟', en: 'Confirm delete?' },

  tt_maintenance: { ar: 'صيانة', en: 'Maintenance' },
  tt_sterilization: { ar: 'تعقيم', en: 'Sterilization' },
  tt_calibration: { ar: 'معايرة', en: 'Calibration' },
  tt_inspection: { ar: 'فحص دوري', en: 'Inspection' },
  us_available: { ar: 'متاح', en: 'Available' },
  us_reserved: { ar: 'محجوز', en: 'Reserved' },
  us_rented: { ar: 'مؤجر', en: 'Rented' },
  us_maintenance: { ar: 'صيانة', en: 'Maintenance' },
  us_sterilizing: { ar: 'تعقيم', en: 'Sterilizing' },
  us_retired: { ar: 'خارج الخدمة', en: 'Retired' },
  ts_open: { ar: 'مفتوحة', en: 'Open' },
  ts_in_progress: { ar: 'جارية', en: 'In progress' },
  ts_done: { ar: 'منتهية', en: 'Done' },
  ts_cancelled: { ar: 'ملغاة', en: 'Cancelled' },
  pr_low: { ar: 'منخفضة', en: 'Low' },
  pr_normal: { ar: 'عادية', en: 'Normal' },
  pr_high: { ar: 'مرتفعة', en: 'High' },
  pr_urgent: { ar: 'عاجلة', en: 'Urgent' },
} as const;

export type Key = keyof typeof dict;

export function t(key: Key, lang: Lang): string {
  const e = dict[key] as any;
  return (e && e[lang]) || (e && e.ar) || String(key);
}

export const pickLang = <T extends Record<string, any>>(obj: T, base: string, lang: Lang) =>
  (obj?.[`${base}_${lang}`] ?? obj?.[`${base}_ar`] ?? '') as string;

export function money(v: number, lang: Lang) {
  const n = Number(v || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
  return lang === 'ar' ? `${n} ج.م` : `EGP ${n}`;
}

export function fmtDate(d?: string | null, lang: Lang = 'ar') {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(d?: string | null, lang: Lang = 'ar') {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
