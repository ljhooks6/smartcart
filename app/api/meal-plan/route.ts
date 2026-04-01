import { NextResponse } from "next/server";

import {
  mealPlanRequestSchema,
  mealPlanResponseSchema,
} from "@/lib/meal-plan-schema";

const mockMealPlan = {
  meal_plan: [
    {
      day: "Monday",
      meal_name: "Creamy Chickpea Tomato Skillet",
      prep_time_minutes: 25,
      quick_instructions:
        "Saute onion and garlic, simmer chickpeas with canned tomatoes and spinach, then finish with a splash of cream or yogurt and serve over rice.",
    },
    {
      day: "Tuesday",
      meal_name: "Roasted Veggie Tacos with Black Beans",
      prep_time_minutes: 30,
      quick_instructions:
        "Roast bell peppers and onions, warm black beans with cumin, then stuff everything into tortillas with shredded lettuce and lime.",
    },
    {
      day: "Wednesday",
      meal_name: "One-Pot Lentil Coconut Curry",
      prep_time_minutes: 35,
      quick_instructions:
        "Simmer lentils with curry powder, coconut milk, diced tomatoes, and carrots until tender, then serve with leftover rice.",
    },
    {
      day: "Thursday",
      meal_name: "Garlic Sesame Tofu Noodle Bowls",
      prep_time_minutes: 25,
      quick_instructions:
        "Pan-sear tofu, toss with cooked noodles, broccoli, garlic, soy sauce, and sesame oil, then top with green onions.",
    },
    {
      day: "Friday",
      meal_name: "Loaded Baked Sweet Potatoes with Chili Beans",
      prep_time_minutes: 40,
      quick_instructions:
        "Bake sweet potatoes, heat black bean and tomato chili with corn and spices, then spoon over the potatoes with yogurt and cilantro.",
    },
  ],
  grocery_list: {
    produce: [
      "2 yellow onions",
      "1 bulb garlic",
      "1 bag spinach",
      "3 bell peppers",
      "1 head broccoli",
      "2 carrots",
      "1 lime",
      "1 bunch green onions",
      "2 large sweet potatoes",
      "1 bunch cilantro",
      "1 head lettuce",
    ],
    meat_and_dairy: [
      "1 block extra-firm tofu",
      "1 small tub plain Greek yogurt",
      "1 carton heavy cream or half-and-half",
    ],
    pantry_staples: [
      "2 cans chickpeas",
      "2 cans black beans",
      "1 bag lentils",
      "1 can coconut milk",
      "1 pack tortillas",
      "1 pack noodles",
      "1 bag rice",
      "1 can corn",
      "Curry powder",
      "Ground cumin",
      "Sesame oil",
    ],
  },
  estimated_total_cost: 58.75,
  savings_tip:
    "Use Instacart pickup and sort by store-brand items before checkout to cut delivery fees and lower staple costs in one pass.",
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsedRequest = mealPlanRequestSchema.safeParse(payload);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Please review the form inputs and try again.",
        details: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  const parsedResponse = mealPlanResponseSchema.safeParse(mockMealPlan);

  if (!parsedResponse.success) {
    return NextResponse.json(
      {
        error: "Mock meal plan data is invalid.",
        details: parsedResponse.error.flatten(),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(parsedResponse.data);
}
