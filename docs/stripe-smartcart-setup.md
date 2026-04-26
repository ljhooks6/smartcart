# Stripe Setup For SmartCart

## Stripe dashboard

Create:

1. Product: `SmartCart Plus`
2. Price: monthly recurring subscription
3. Save the monthly price id

## Environment variables

Add these to your app environment:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PLUS_MONTHLY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Webhook events

In Stripe, add a webhook endpoint pointing to:

`https://your-domain.com/api/stripe/webhook`

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## What the app does

- `POST /api/create-checkout-session`
  creates a Stripe Checkout subscription session

- `POST /api/stripe/webhook`
  receives Stripe events and updates:
  - `smartcart_profiles.plan`
  - `smartcart_subscriptions`
