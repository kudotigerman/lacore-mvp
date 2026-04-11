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
}

export const NICHE_THEMES: Record<LandingNiche, LandingTheme> = {
  fitness: {
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
  },
  designer: {
    accent: "#8B5CF6",
    accentLight: "#C4B5FD",
    bgPrimary: "#0A0008",
    bgSecondary: "#0F0010",
    heroStyle: "gradient-mesh",
  },
  developer: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "gradient-blob",
  },
  coach: {
    accent: "#F59E0B",
    accentLight: "#FCD34D",
    bgPrimary: "#0A0800",
    bgSecondary: "#100E00",
    heroStyle: "solid-glow",
  },
  consultant: {
    accent: "#10B981",
    accentLight: "#6EE7B7",
    bgPrimary: "#00100A",
    bgSecondary: "#001208",
    heroStyle: "gradient-blob",
  },
  agency: {
    accent: "#F97316",
    accentLight: "#FDBA74",
    bgPrimary: "#0A0500",
    bgSecondary: "#100800",
    heroStyle: "gradient-mesh",
  },
  course: {
    accent: "#EC4899",
    accentLight: "#F9A8D4",
    bgPrimary: "#0A0008",
    bgSecondary: "#100010",
    heroStyle: "solid-glow",
  },
  local: {
    accent: "#84CC16",
    accentLight: "#BEF264",
    bgPrimary: "#030A00",
    bgSecondary: "#050F00",
    heroStyle: "gradient-blob",
  },
  default: {
    accent: "#6366F1",
    accentLight: "#818CF8",
    bgPrimary: "#0A0A0D",
    bgSecondary: "#0F0F14",
    heroStyle: "solid-glow",
  },
};
