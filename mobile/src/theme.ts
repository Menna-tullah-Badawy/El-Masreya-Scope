export const colors = {
  brand: '#0E7C86',
  brandDark: '#075E67',
  brandLight: '#E6F3F4',
  brandSoft: '#F1F8F9',
  accent: '#F2994A',
  bg: '#F6F8F9',
  card: '#FFFFFF',
  text: '#12262A',
  sub: '#5A6B70',
  muted: '#8FA0A5',
  border: '#DDE7E9',
  success: '#1B9E5A',
  successBg: '#E6F6EE',
  warning: '#C98A11',
  warningBg: '#FDF4E1',
  danger: '#D64545',
  dangerBg: '#FCEDED',
  info: '#2D7FF9',
  infoBg: '#EAF2FE',
  dark: '#0B1E22',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const space = (n: number) => n * 4;

export const shadow = {
  sm: {
    shadowColor: '#0B1E22', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  md: {
    shadowColor: '#0B1E22', shadowOpacity: 0.1, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
};

export const font = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '800' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  sub: { fontSize: 13, color: colors.sub },
  tiny: { fontSize: 11, color: colors.muted },
};

export const statusColor: Record<string, { bg: string; fg: string }> = {
  pending: { bg: colors.warningBg, fg: colors.warning },
  approved: { bg: colors.infoBg, fg: colors.info },
  active: { bg: colors.successBg, fg: colors.success },
  returned: { bg: colors.brandLight, fg: colors.brandDark },
  completed: { bg: colors.successBg, fg: colors.success },
  rejected: { bg: colors.dangerBg, fg: colors.danger },
  cancelled: { bg: '#EEF1F2', fg: colors.sub },
  available: { bg: colors.successBg, fg: colors.success },
  reserved: { bg: colors.infoBg, fg: colors.info },
  rented: { bg: colors.warningBg, fg: colors.warning },
  maintenance: { bg: colors.dangerBg, fg: colors.danger },
  sterilizing: { bg: colors.brandLight, fg: colors.brandDark },
  retired: { bg: '#EEF1F2', fg: colors.muted },
  open: { bg: colors.warningBg, fg: colors.warning },
  in_progress: { bg: colors.infoBg, fg: colors.info },
  done: { bg: colors.successBg, fg: colors.success },
  paid: { bg: colors.successBg, fg: colors.success },
  unpaid: { bg: colors.dangerBg, fg: colors.danger },
  failed: { bg: colors.dangerBg, fg: colors.danger },
  refunded: { bg: '#EEF1F2', fg: colors.sub },
  urgent: { bg: colors.dangerBg, fg: colors.danger },
  high: { bg: colors.warningBg, fg: colors.warning },
  normal: { bg: colors.infoBg, fg: colors.info },
  low: { bg: '#EEF1F2', fg: colors.sub },
};
