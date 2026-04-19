export type LandingNiche =
  | "fitness"
  | "designer"
  | "developer"
  | "coach"
  | "consultant"
  | "agency"
  | "course"
  | "local"
  | "default";

export type LandingStyle =
  | "dark-indigo"
  | "dark-purple"
  | "dark-gold"
  | "dark-amber"
  | "dark-red"
  | "dark-green"
  | "dark-pink"
  | "dark-cyan"
  | "dark-orange"
  | "pure-black"
  | "light-clean"
  | "warm-cream"
  | "bold-black";

/** Optional hero photo from Unsplash (set at generation time). */
export interface LandingHeroImage {
  url: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

export interface LandingContent {
  niche: LandingNiche;
  brand: string;
  badge: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  socialProof: string;
  stats: Array<{ number: string; label: string }>;
  problemHeadline: string;
  problems: Array<{ emoji: string; title: string; desc: string }>;
  solutionHeadline: string;
  features: Array<{ icon: string; title: string; desc: string }>;
  processHeadline: string;
  steps: Array<{ title: string; desc: string }>;
  testimonialsHeadline: string;
  testimonials: Array<{ text: string; name: string; role: string }>;
  ctaHeadline: string;
  ctaSubtext: string;
  ctaButton: string;
  formHeadline: string;
  formButton: string;
  headlineColor?: string;
  subheadlineColor?: string;
  accentColor?: string;
  badgeTextColor?: string;
  heroImage?: LandingHeroImage;
}

export interface LandingTheme {
  accent: string;
  accentLight: string;
  bgPrimary: string;
  bgSecondary: string;
  heroStyle: "gradient-blob" | "gradient-mesh" | "solid-glow";
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  navBg: string;
  isDark: boolean;
}

export const NICHE_THEMES: Record<LandingNiche, LandingTheme> = {
  fitness: {
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
    cardBorder: "#2a1515",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0F14",
    navBg: "rgba(10,10,13,0.80)",
    isDark: true,
  },
  designer: {
    accent: "#8B5CF6",
    accentLight: "#C4B5FD",
    bgPrimary: "#0A0008",
    bgSecondary: "#0F0010",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1545",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0010",
    navBg: "rgba(10,0,8,0.80)",
    isDark: true,
  },
  developer: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "gradient-blob",
    cardBorder: "#1a1a2e",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0F14",
    navBg: "rgba(10,10,13,0.80)",
    isDark: true,
  },
  coach: {
    accent: "#F59E0B",
    accentLight: "#FCD34D",
    bgPrimary: "#0A0800",
    bgSecondary: "#100E00",
    heroStyle: "solid-glow",
    cardBorder: "#2a1f00",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#100E00",
    navBg: "rgba(10,8,0,0.80)",
    isDark: true,
  },
  consultant: {
    accent: "#10B981",
    accentLight: "#6EE7B7",
    bgPrimary: "#00100A",
    bgSecondary: "#001208",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#001208",
    navBg: "rgba(0,16,10,0.80)",
    isDark: true,
  },
  agency: {
    accent: "#F97316",
    accentLight: "#FDBA74",
    bgPrimary: "#0A0500",
    bgSecondary: "#100800",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1500",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#100800",
    navBg: "rgba(10,5,0,0.80)",
    isDark: true,
  },
  course: {
    accent: "#EC4899",
    accentLight: "#F9A8D4",
    bgPrimary: "#0A0008",
    bgSecondary: "#100010",
    heroStyle: "solid-glow",
    cardBorder: "#2a0a25",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#100010",
    navBg: "rgba(10,0,8,0.80)",
    isDark: true,
  },
  local: {
    accent: "#84CC16",
    accentLight: "#BEF264",
    bgPrimary: "#030A00",
    bgSecondary: "#050F00",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#050F00",
    navBg: "rgba(3,10,0,0.80)",
    isDark: true,
  },
  default: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
    cardBorder: "#1a1a2e",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0F14",
    navBg: "rgba(10,10,13,0.80)",
    isDark: true,
  },
};

export const STYLE_THEMES: Record<LandingStyle, LandingTheme> = {
  "dark-indigo": {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F16",
    heroStyle: "gradient-blob",
    cardBorder: "#1a1a2e",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0F16",
    navBg: "rgba(10,10,13,0.80)",
    isDark: true,
  },
  "dark-purple": {
    accent: "#A855F7",
    accentLight: "#D8B4FE",
    bgPrimary: "#07040F",
    bgSecondary: "#0E0818",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1545",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0E0818",
    navBg: "rgba(7,4,15,0.80)",
    isDark: true,
  },
  "dark-gold": {
    accent: "#D4AF37",
    accentLight: "#F0D060",
    bgPrimary: "#080808",
    bgSecondary: "#0F0F0A",
    heroStyle: "solid-glow",
    cardBorder: "#2a2510",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#0F0F0A",
    navBg: "rgba(8,8,8,0.80)",
    isDark: true,
  },
  "dark-amber": {
    accent: "#F59E0B",
    accentLight: "#FCD34D",
    bgPrimary: "#0A0800",
    bgSecondary: "#130F00",
    heroStyle: "solid-glow",
    cardBorder: "#2a1f00",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#130F00",
    navBg: "rgba(10,8,0,0.80)",
    isDark: true,
  },
  "dark-red": {
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    bgPrimary: "#080808",
    bgSecondary: "#111111",
    heroStyle: "solid-glow",
    cardBorder: "#2a1515",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#111111",
    navBg: "rgba(8,8,8,0.80)",
    isDark: true,
  },
  "dark-green": {
    accent: "#10B981",
    accentLight: "#6EE7B7",
    bgPrimary: "#030A05",
    bgSecondary: "#050F08",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#050F08",
    navBg: "rgba(3,10,5,0.80)",
    isDark: true,
  },
  "dark-pink": {
    accent: "#EC4899",
    accentLight: "#F9A8D4",
    bgPrimary: "#09040F",
    bgSecondary: "#110818",
    heroStyle: "solid-glow",
    cardBorder: "#2a0a25",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#110818",
    navBg: "rgba(9,4,15,0.80)",
    isDark: true,
  },
  "dark-cyan": {
    accent: "#06B6D4",
    accentLight: "#67E8F9",
    bgPrimary: "#030A0F",
    bgSecondary: "#050F18",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2030",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#050F18",
    navBg: "rgba(3,10,15,0.80)",
    isDark: true,
  },
  "dark-orange": {
    accent: "#F97316",
    accentLight: "#FDBA74",
    bgPrimary: "#080500",
    bgSecondary: "#100C00",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1500",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#52525B",
    cardBg: "#100C00",
    navBg: "rgba(8,5,0,0.80)",
    isDark: true,
  },
  "pure-black": {
    accent: "#FFFFFF",
    accentLight: "#E5E5E5",
    bgPrimary: "#000000",
    bgSecondary: "#0A0A0A",
    heroStyle: "solid-glow",
    cardBorder: "#222222",
    textPrimary: "#FFFFFF",
    textSecondary: "#888888",
    textMuted: "#444444",
    cardBg: "#0A0A0A",
    navBg: "rgba(0,0,0,0.90)",
    isDark: true,
  },
  "light-clean": {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F4F4F8",
    heroStyle: "gradient-mesh",
    cardBorder: "#E4E4E7",
    textPrimary: "#09090B",
    textSecondary: "#52525B",
    textMuted: "#A1A1AA",
    cardBg: "#FFFFFF",
    navBg: "rgba(255,255,255,0.90)",
    isDark: false,
  },
  "warm-cream": {
    accent: "#D97706",
    accentLight: "#F59E0B",
    bgPrimary: "#FDFAF5",
    bgSecondary: "#F5F0E8",
    heroStyle: "gradient-mesh",
    cardBorder: "#E8DDD0",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    textMuted: "#A8A29E",
    cardBg: "#FFFFFF",
    navBg: "rgba(253,250,245,0.92)",
    isDark: false,
  },
  "bold-black": {
    accent: "#FFFFFF",
    accentLight: "#E5E5E5",
    bgPrimary: "#000000",
    bgSecondary: "#0A0A0A",
    heroStyle: "solid-glow",
    cardBorder: "#1A1A1A",
    textPrimary: "#FFFFFF",
    textSecondary: "#999999",
    textMuted: "#555555",
    cardBg: "#0D0D0D",
    navBg: "rgba(0,0,0,0.95)",
    isDark: true,
  },
};
