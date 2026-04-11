import {
  CheckoutEventNames,
  type CheckoutOpenOptions,
  type InitializePaddleOptions,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";

const CHECKOUT_DISPLAY = {
  displayMode: "overlay" as const,
  theme: "dark" as const,
  locale: "en",
};

/** Token-based init only — never pass `seller` alongside `token` (Paddle.js forbids mixing; wrong seller causes checkout errors). */
export function paddleInitOptions(token: string, environment: "production" | "sandbox"): InitializePaddleOptions {
  return {
    environment,
    token,
    eventCallback: (event: PaddleEventData) => {
      if (
        event.name === CheckoutEventNames.CHECKOUT_ERROR ||
        event.name === CheckoutEventNames.CHECKOUT_FAILED
      ) {
        console.warn("Paddle checkout:", event.name, event);
      }
    },
  };
}

export function openPaddleCheckout(paddle: Paddle, options: CheckoutOpenOptions): void {
  const priceId = options.items?.[0]?.priceId;
  console.log("Opening paddle checkout with:", { priceId });
  try {
    paddle.Checkout.open({
      ...options,
      settings: { ...CHECKOUT_DISPLAY, ...options.settings },
    });
  } catch (err) {
    console.error("Paddle Checkout.open failed:", err);
    alert(
      "Payment checkout could not open. Please refresh the page and try again. If it keeps failing, contact support."
    );
  }
}
