export const theme = {
  // ── DESIGN TOKENS (matches HTML template CSS vars) ──
  colors: {
    primary: '#1E1460',       // --navy
    primaryDeep: '#120e45',   // --navy-deep
    accent: '#F5A623',        // --gold
    accentDark: '#d48f1a',    // --gold-dark
    background: '#FFFFFF',    // --white
    bg: '#F8F8FC',            // --bg (screen body background)
    textPrimary: '#0D0928',   // --text
    textSecondary: '#9999AA', // --muted
    textMuted: '#C8C8D8',     // lighter muted
    success: '#22C55E',       // --green
    error: '#EF4444',         // --red
    border: '#EAEAF0',        // --border
    surface: '#FFFFFF',       // card surface
    disabled: 'rgba(200,200,216,0.6)',
  },

  typography: {
    headingLarge: { fontSize: 26, fontWeight: '800' as const, color: '#0D0928', lineHeight: 32 },
    headingMedium: { fontSize: 21, fontWeight: '700' as const, color: '#0D0928', lineHeight: 28 },
    body: { fontSize: 13, fontWeight: '400' as const, color: '#9999AA', lineHeight: 21 },
    label: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const, color: '#1E1460' },
    caption: { fontSize: 11, color: '#9999AA' },
  },

  spacing: {
    screenPadding: 24,
    cardRadius: 16,
    inputRadius: 13,
    buttonRadius: 14,
    buttonHeight: 54,
  },

  font: {
    regular: 'Sora_400Regular',
    medium: 'Sora_500Medium',
    semibold: 'Sora_600SemiBold',
    bold: 'Sora_700Bold',
    extrabold: 'Sora_800ExtraBold',
    heading: 'Sora_700Bold',
    button: 'Sora_700Bold',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    serif: 'DMSerifDisplay_400Regular',
  },

  // ── LEGACY (kept for backwards compat with existing screens) ──
  primary: '#1E1460',
  primaryLight: '#EEEDF8',
  onPrimary: '#ffffff',
  accent: '#F5A623',
  accentLight: '#FFF0EC',
  gold: '#F5A623',
  goldLight: '#FFF8E6',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FC',
  surfaceContainer: '#F8F8FC',
  text: '#0D0928',
  onSurface: '#0D0928',
  textSub: '#9999AA',
  onSurfaceVariant: '#9999AA',
  textMuted: '#C8C8D8',
  muted: '#C8C8D8',
  border: '#EAEAF0',
  borderLight: '#F0EDE8',
  outline: '#EAEAF0',
  outlineVariant: '#F0EDE8',
  success: '#22C55E',
  successLight: '#dcfce7',
  warning: '#F5A623',
  warningLight: 'rgba(245,166,35,0.12)',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  gradA: '#1E1460',
  gradB: '#F5A623',
};
