export const colors = {
  primary: '#FF5A1F',
  primaryDark: '#E04A12',
  primarySoft: '#FFF0E8',
  success: '#16A34A',
  successSoft: '#E8F7EE',
  bg: '#F7F6F3',
  card: '#FFFFFF',
  text: '#1A1D29',
  textSecondary: '#6B7080',
  textMuted: '#9CA0AC',
  border: '#ECEAE4',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  warning: '#D97706',
  esim: '#2563EB',
  esimSoft: '#EBF1FE',
  overlay: 'rgba(16, 18, 27, 0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textSecondary },
};

export const shadow = {
  card: {
    shadowColor: '#1A1D29',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
