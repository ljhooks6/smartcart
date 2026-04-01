# SmartCart

SmartCart is a Next.js meal and grocery planning app that uses the OpenAI API to generate a 5-day dinner plan, a categorized grocery list, an estimated total cost, and a single delivery-app savings tip.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- OpenAI Node SDK with structured outputs
- Zod for request and response validation

## Getting Started

1. Install Node.js 22 LTS.
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```powershell
Copy-Item .env.example .env.local
```

4. Add your OpenAI API key to `OPENAI_API_KEY`.
5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Recommended Node Version

SmartCart is currently most reliable on Node.js 22 LTS, especially on Windows when using the Next.js WASM compiler fallback.

- Recommended: Node.js 22.x LTS
- Not recommended for local development here: Node.js 24.x

## Environment Variables

- `OPENAI_API_KEY`: required for the `/api/meal-plan` route
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`

## API Contract

`POST /api/meal-plan`

Request body:

```json
{
  "weeklyBudget": 75,
  "householdSize": 2,
  "dietaryRestrictions": "Vegetarian",
  "prepTimeAvailable": "Under 30 mins",
  "adventureLevel": "Mix it up",
  "pantryCheck": "Rice, black beans, garlic, canned tomatoes",
  "strictStretchMode": true
}
```

Response body:

```json
{
  "meal_plan": [
    {
      "day": "Monday",
      "meal_name": "Tomato Bean Skillet",
      "prep_time_minutes": 25,
      "quick_instructions": "Saute aromatics, simmer beans and tomatoes, and serve over rice."
    }
  ],
  "grocery_list": {
    "produce": ["Onion"],
    "meat_and_dairy": ["Greek yogurt"],
    "pantry_staples": ["Cumin"]
  },
  "estimated_total_cost": 54.5,
  "savings_tip": "Use your Instacart pickup filter to avoid delivery fees on pantry-heavy orders."
}
```

The production response always contains five `meal_plan` entries.
