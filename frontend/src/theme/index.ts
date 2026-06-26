import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#0F766E',
  primaryLight: '#14B8A6',
  primaryDark: '#0D5C55',
  primaryPastel: '#CCFBF1',
  accent: '#F97316',
  accentLight: '#FB923C',
  accentDark: '#EA580C',
  accentPastel: '#FFF7ED',
  background: '#F7F8F5',        // warm organic off-white
  surface: '#FFFFFF',
  surfaceWarm: '#FFFDF9',       // warm card surface
  surfaceElevated: '#FFFFFF',
  imageBg: '#ECFDF5',           // light green for image placeholders
  textPrimary: '#1A1F1E',       // slightly warmer black
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  divider: '#F0F2EE',           // warm divider
  success: '#059669',
  successLight: '#D1FAE5',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  overlay: 'rgba(0,0,0,0.5)',
  shimmer: '#E5E7EB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
};

const nativeShadow = (color: string, h: number, opacity: number, radius: number, elevation: number): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: h },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export const shadows = {
  none: {} as ViewStyle,
  xs: Platform.select({
    web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as any,
    default: nativeShadow('#000', 1, 0.06, 3, 1),
  }) as ViewStyle,
  sm: Platform.select({
    web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } as any,
    default: nativeShadow('#000', 2, 0.08, 6, 2),
  }) as ViewStyle,
  md: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(0,0,0,0.10)' } as any,
    default: nativeShadow('#000', 4, 0.10, 12, 4),
  }) as ViewStyle,
  lg: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(0,0,0,0.13)' } as any,
    default: nativeShadow('#000', 8, 0.13, 24, 8),
  }) as ViewStyle,
  card: Platform.select({
    web: { boxShadow: '0 2px 10px rgba(15,118,110,0.08), 0 1px 3px rgba(0,0,0,0.04)' } as any,
    default: nativeShadow('#0F766E', 2, 0.08, 10, 3),
  }) as ViewStyle,
};

export const typography = {
  displayLg: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  displayMd: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.1 },
  h3: { fontSize: 16, fontWeight: '600' as const },
  h4: { fontSize: 14, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 17 },
  captionBold: { fontSize: 12, fontWeight: '600' as const },
  button: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.3 },
  buttonSm: { fontSize: 13, fontWeight: '600' as const },
  price: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  priceSm: { fontSize: 15, fontWeight: '700' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.0, textTransform: 'uppercase' as const },
};

export const webStyles = {
  clickable: { cursor: 'pointer' } as any,
  noSelect: { userSelect: 'none' } as any,
  hoverCard: { transition: 'box-shadow 0.2s, transform 0.15s' } as any,
};
