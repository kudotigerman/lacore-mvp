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
  | "pure-black";

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
}

export interface LandingTheme {
  accent: string;
  accentLight: string;
  bgPrimary: string;
  bgSecondary: string;
  heroStyle: "gradient-blob" | "gradient-mesh" | "solid-glow";
  cardBorder: string;
}

export const NICHE_THEMES: Record<LandingNiche, LandingTheme> = {
  fitness: {
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
    cardBorder: "#2a1515",
  },
  designer: {
    accent: "#8B5CF6",
    accentLight: "#C4B5FD",
    bgPrimary: "#0A0008",
    bgSecondary: "#0F0010",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1545",
  },
  developer: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "gradient-blob",
    cardBorder: "#1a1a2e",
  },
  coach: {
    accent: "#F59E0B",
    accentLight: "#FCD34D",
    bgPrimary: "#0A0800",
    bgSecondary: "#100E00",
    heroStyle: "solid-glow",
    cardBorder: "#2a1f00",
  },
  consultant: {
    accent: "#10B981",
    accentLight: "#6EE7B7",
    bgPrimary: "#00100A",
    bgSecondary: "#001208",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
  },
  agency: {
    accent: "#F97316",
    accentLight: "#FDBA74",
    bgPrimary: "#0A0500",
    bgSecondary: "#100800",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1500",
  },
  course: {
    accent: "#EC4899",
    accentLight: "#F9A8D4",
    bgPrimary: "#0A0008",
    bgSecondary: "#100010",
    heroStyle: "solid-glow",
    cardBorder: "#2a0a25",
  },
  local: {
    accent: "#84CC16",
    accentLight: "#BEF264",
    bgPrimary: "#030A00",
    bgSecondary: "#050F00",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
  },
  default: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
    cardBorder: "#1a1a2e",
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
  },
  "dark-purple": {
    accent: "#A855F7",
    accentLight: "#D8B4FE",
    bgPrimary: "#07040F",
    bgSecondary: "#0E0818",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1545",
  },
  "dark-gold": {
    accent: "#D4AF37",
    accentLight: "#F0D060",
    bgPrimary: "#080808",
    bgSecondary: "#0F0F0A",
    heroStyle: "solid-glow",
    cardBorder: "#2a2510",
  },
  "dark-amber": {
    accent: "#F59E0B",
    accentLight: "#FCD34D",
    bgPrimary: "#0A0800",
    bgSecondary: "#130F00",
    heroStyle: "solid-glow",
    cardBorder: "#2a1f00",
  },
  "dark-red": {
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    bgPrimary: "#080808",
    bgSecondary: "#111111",
    heroStyle: "solid-glow",
    cardBorder: "#2a1515",
  },
  "dark-green": {
    accent: "#10B981",
    accentLight: "#6EE7B7",
    bgPrimary: "#030A05",
    bgSecondary: "#050F08",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2a15",
  },
  "dark-pink": {
    accent: "#EC4899",
    accentLight: "#F9A8D4",
    bgPrimary: "#09040F",
    bgSecondary: "#110818",
    heroStyle: "solid-glow",
    cardBorder: "#2a0a25",
  },
  "dark-cyan": {
    accent: "#06B6D4",
    accentLight: "#67E8F9",
    bgPrimary: "#030A0F",
    bgSecondary: "#050F18",
    heroStyle: "gradient-blob",
    cardBorder: "#0a2030",
  },
  "dark-orange": {
    accent: "#F97316",
    accentLight: "#FDBA74",
    bgPrimary: "#080500",
    bgSecondary: "#100C00",
    heroStyle: "gradient-mesh",
    cardBorder: "#2a1500",
  },
  "pure-black": {
    accent: "#FFFFFF",
    accentLight: "#E5E5E5",
    bgPrimary: "#000000",
    bgSecondary: "#0A0A0A",
    heroStyle: "solid-glow",
    cardBorder: "#222222",
  },
};
