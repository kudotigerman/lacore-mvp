/** sessionStorage key: dashboard landing editor reads prefill on mount (see LandingEditorSplitView) */
export const LANDING_EDITOR_QUICK_STORAGE_KEY = "lacore_landing_editor_prefill";

export const LANDING_EDITOR_QUICK_ACTIONS = [
  {
    label: "🎨 Change colors",
    text: "Change the background color to dark navy, make buttons indigo (#6366F1)"
  },
  {
    label: "➕ Add section",
    text: "Add a FAQ section with 4 common questions about my service"
  },
  {
    label: "📅 Add Calendly",
    text: "Add a Calendly booking button. My link: calendly.com/"
  },
  {
    label: "💬 Add WhatsApp",
    text: "Add a WhatsApp floating button. My number: +"
  }
] as const;
