import Stripe from "stripe";

let stripeSingleton = null;

export function isStripeConfigured() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

export function getStripe() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    const err = new Error("STRIPE_SECRET_KEY não configurada");
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function getStripeWebhookSecret() {
  return String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
}

export function getFrontendBaseUrl() {
  return (
    String(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "")
      .trim()
      .replace(/\/+$/, "") || "http://localhost:5173"
  );
}

export function getApiBaseUrl() {
  return (
    String(process.env.API_PUBLIC_URL || process.env.BACKEND_URL || "")
      .trim()
      .replace(/\/+$/, "") || `http://localhost:${process.env.PORT || 3011}`
  );
}
