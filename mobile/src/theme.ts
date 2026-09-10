// SCOPE — Modern Minimal (Apple / Linear inspired)
// حافظنا على التيل كـ accent لكن خليناه هادئ ومينيمال
export const colors = {
  brand: '#0F766E',        // تيل أهدأ (emerald/teal 700) — أقل تشبع من #0E7C86
  brandDark: '#0B4F4A',
  brandLight: '#E6F3F1',
  brandSoft: '#F0F8F7',
  accent: '#0F766E',
  bg: '#FCFCFD',           // خلفية مينيمال مثل Linear/Apple
  card: '#FFFFFF',
  text: '#0B0B0C',         // أسود ناعم (ink)
  sub: '#6B7280',          // رمادي متوسط
  muted: '#9CA3AF',
  border: '#E8EAED',       // حدود فاتحة جداً
  borderStrong: '#E2E4E7',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  info: '#2563EB',
  infoBg: '#EFF6FF',
  dark: '#111113',
  surface: '#F7F7F8',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const space = (n: number) => n * 4;

export const shadow = {
  sm: {
    shadowColor: '#0B0B0C',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0B0B0C',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0B0B0C',
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

export const font = {
  display: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -1.2, color: colors.text, lineHeight: 42 },
  h1: { fontSize: 28, fontWeight: '750' as const, letterSpacing: -0.7, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 15, fontWeight: '650' as const, color: colors.text },
  body: { fontSize: 14.5, color: colors.text, lineHeight: 22 },
  sub: { fontSize: 13.5, color: colors.sub, lineHeight: 20 },
  tiny: { fontSize: 11.5, color: colors.muted, letterSpacing: 0.2 },
  mono: { fontSize: 11, color: colors.muted, fontFamily: 'monospace' as const, letterSpacing: 0.6 },
};

export const statusColor: Record<string, { bg: string; fg: string }> = {
  pending: { bg: colors.warningBg, fg: colors.warning },
  approved: { bg: colors.infoBg, fg: colors.info },
  active: { bg: colors.successBg, fg: colors.success },
  returned: { bg: colors.brandLight, fg: colors.brandDark },
  completed: { bg: colors.successBg, fg: colors.success },
  rejected: { bg: colors.dangerBg, fg: colors.danger },
  cancelled: { bg: colors.surface, fg: colors.sub },
  available: { bg: colors.successBg, fg: colors.success },
  reserved: { bg: colors.infoBg, fg: colors.info },
  rented: { bg: colors.warningBg, fg: colors.warning },
  maintenance: { bg: colors.dangerBg, fg: colors.danger },
  sterilizing: { bg: colors.brandLight, fg: colors.brandDark },
  retired: { bg: colors.surface, fg: colors.muted },
  open: { bg: colors.warningBg, fg: colors.warning },
  in_progress: { bg: colors.infoBg, fg: colors.info },
  done: { bg: colors.successBg, fg: colors.success },
  paid: { bg: colors.successBg, fg: colors.success },
  unpaid: { bg: colors.dangerBg, fg: colors.danger },
  failed: { bg: colors.dangerBg, fg: colors.danger },
  refunded: { bg: colors.surface, fg: colors.sub },
  urgent: { bg: colors.dangerBg, fg: colors.danger },
  high: { bg: colors.warningBg, fg: colors.warning },
  normal: { bg: colors.infoBg, fg: colors.info },
  low: { bg: colors.surface, fg: colors.sub },
};
