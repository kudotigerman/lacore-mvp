/** sessionStorage key: dashboard quick actions navigate to /p/[slug]?edit=true with prefill */
export const LANDING_EDITOR_QUICK_STORAGE_KEY = "lacore_landing_editor_prefill";

export const LANDING_EDITOR_QUICK_ACTIONS = [
  {
    label: "🎨 Change colors",
    text: "Change the background color to dark navy, make buttons cyan"
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
