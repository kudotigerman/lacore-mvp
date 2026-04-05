/** sessionStorage key: dashboard quick actions navigate to /p/[slug]?edit=true with prefill */
export const LANDING_EDITOR_QUICK_STORAGE_KEY = "lacore_landing_editor_prefill";

export const LANDING_EDITOR_QUICK_ACTIONS = [
  {
    label: "🎨 Change colors",
    text: 'Change colors only (minimal edit): update page background, button colors, and main heading color to match this brief — I want: background #______ , primary buttons ______ , accent / links ______ . Edit existing <style> rules and inline style attributes only; do not change copy, section order, or HTML structure.'
  },
  {
    label: "🖼 Add image",
    text: 'Add an image in the hero: insert <img src="PASTE_YOUR_IMAGE_URL_HERE" alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:16px auto"> in the hero, below the headline or where it fits best. If I did not provide a URL, add a polished placeholder block (border-radius 8px, dashed border, padding) with short description text and a note: replace src with your image URL.'
  },
  {
    label: "➕ Add section",
    text: 'Add a new section that matches this landing’s existing fonts, colors, and spacing (reuse the same palette and button styles). Content: add an FAQ block with 4 realistic Q&A pairs for this offer. Insert it above the contact form / footer, without removing anything unless it would duplicate the same section.'
  },
  {
    label: "📅 Add Calendly",
    text: 'Embed Calendly: add a section titled for booking, then the official inline widget: <div class="calendly-inline-widget" data-url="https://calendly.com/YOUR_USERNAME/30min" style="min-width:320px;height:700px;"></div> plus <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script> before </body>. Replace YOUR_USERNAME/30min with the URL I specify in chat if I add one.'
  },
  {
    label: "💬 Add WhatsApp",
    text: 'Add a fixed floating WhatsApp button at the bottom-right (z-index high): green circular style, link href="https://wa.me/COUNTRYCODE_AND_PHONE" (use placeholder digits until I replace), target="_blank" rel="noopener noreferrer", aria-label "WhatsApp". Match the page visually (subtle shadow, hover state).'
  }
] as const;
