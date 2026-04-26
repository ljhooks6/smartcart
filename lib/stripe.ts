import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function getStripeMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_PLUS_MONTHLY;

  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID_PLUS_MONTHLY is missing.");
  }

  return priceId;
}

