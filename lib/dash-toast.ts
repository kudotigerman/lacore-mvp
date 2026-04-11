export const DASH_TOAST_EVENT = "lacore-dash-toast";

export function dashToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASH_TOAST_EVENT, { detail: { message } }));
}
