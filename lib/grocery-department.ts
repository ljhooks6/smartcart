const safeTrim = (v: unknown) => typeof v === "string" ? v.trim() : "";
const normalizeIngredientName = (v: string) => safeTrim(v).toLowerCase();
export function inferIngredientUsage(itemName: string, mealName: string, mealNotes: string) {
    const ingredient = normalizeIngredientName(itemName);
    const title = safeTrim(mealName);
    const notes = safeTrim(mealNotes);
    const lowerNotes = notes.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const usageMatch = notes
        .split(/[.!?]/)
        .map((sentence) => safeTrim(sentence))
        .find((sentence) => sentence.toLowerCase().includes(ingredient));
    if (usageMatch) {
        return usageMatch.length > 120 ? `${usageMatch.slice(0, 117)}...` : usageMatch;
    }
    if (lowerTitle.includes(ingredient)) {
        return `Featured in ${title}.`;
    }
    if (/\bgarlic|onion|ginger|pepper|salt|paprika|cumin|seasoning|spice|herb\b/.test(ingredient)) {
        return "Used to season or build the flavor base.";
    }
    if (/\bcheese|sauce|salsa|cream|yogurt|dressing\b/.test(ingredient)) {
        return "Used as a sauce, topping, or creamy finishing ingredient.";
    }
    if (/\brice|pasta|tortilla|wrap|bread|bun|potato\b/.test(ingredient)) {
        return "Used as the base, side, or serving component.";
    }
    if (/\bchicken|beef|pork|turkey|shrimp|salmon|fish|tofu|beans\b/.test(ingredient)) {
        return "Used as a main protein in the meal.";
    }
    if (lowerNotes || lowerTitle) {
        return "Used in this meal's prep or plating.";
    }
    return "Used in this selected meal.";
}
export function getGroceryDepartment(itemName: string) {
    const normalizedName = normalizeIngredientName(itemName);
    if (normalizedName.includes("[restock]")) {
        return "Restock";
    }
    if (/\bfrozen\b|\bice cream\b/.test(normalizedName))
        return "Frozen";
    if (/\b(?:garlic|onion|chili) powder\b|\b(?:black|white|ground) pepper\b|\bpepper flakes\b/.test(normalizedName))
        return "Spices & Seasonings";
    if (/\b(?:bread|buns?|rolls?|tortillas?|wraps?|pita|naan)\b/.test(normalizedName))
        return "Bakery & Bread";
    if (/\b(?:sauce|salsa|dressing)\b/.test(normalizedName))
        return "Condiments & Sauces";
    if (/\b(?:dried|ground) (?:basil|oregano|thyme|rosemary|cinnamon|cumin|nutmeg)\b/.test(normalizedName))
        return "Spices & Seasonings";
    if (/\b(?:canned|dried|dry)\b|\b(?:broth|stock)\b|\bcoconut milk\b/.test(normalizedName))
        return "Pantry & Dry Goods";
    if (/\b(?:tomato|tomatoes)\b/.test(normalizedName) && /\b(?:diced|crushed|paste|puree)\b/.test(normalizedName))
        return "Pantry & Dry Goods";
    if (/\b(zucchini|celery|carrots?|onions?|potatoes?|tomatoes?|bell peppers?|red peppers?|green peppers?|yellow peppers?|orange peppers?|garlic|ginger|lettuce|spinach|broccoli|kale|cucumbers?|avocados?|apples?|bananas?|lemons?|limes?|cilantro|parsley|basil|green beans?|corn|mushrooms?|scallions?|snap peas?)\b/.test(normalizedName)) {
        return "Produce";
    }
    if (/\b(chicken|beef|steak|pork|sausage|bacon|turkey|shrimp|salmon|tilapia|fish|seafood)\b/.test(normalizedName)) {
        return "Meat & Seafood";
    }
    if (/\b(milk|cream|cheese|eggs?|butter|yogurt|sour cream|cream cheese|half-and-half)\b/.test(normalizedName)) {
        return "Dairy & Eggs";
    }
    if (/\b(bread|buns?|rolls?|tortillas?|wraps?|pita|naan)\b/.test(normalizedName)) {
        return "Bakery & Bread";
    }
    if (/\b(oil|vinegar|sauce|mustard|ketchup|mayo|dressing|salsa|honey|syrup|soy sauce|worcestershire|hot sauce)\b/.test(normalizedName)) {
        return "Condiments & Sauces";
    }
    if (/\b(salt|pepper|paprika|cumin|chili powder|seasoning|spice|oregano|thyme|cinnamon|nutmeg|garlic powder|onion powder)\b/.test(normalizedName)) {
        return "Spices & Seasonings";
    }
    if (/\b(rice|pasta|spaghetti|penne|rigatoni|rotini|fettuccine|linguine|macaroni|farfalle|angel hair|lasagna noodles?|flour|sugar|beans|chickpea|tomatoes|broth|stock|oats|quinoa|cereal|cornmeal|breadcrumbs)\b/.test(normalizedName)) {
        return "Pantry & Dry Goods";
    }
    if (/\b(frozen|ice cream)\b/.test(normalizedName)) {
        return "Frozen";
    }
    return "Other";
}
