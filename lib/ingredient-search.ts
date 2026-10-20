import { ingredientKey } from "./ingredient-quantity.ts";
import { INGREDIENT_CATALOG, type IngredientSuggestion } from "./ingredient-catalog.ts";

// Discovery normalization only. Identity, quantities and safety still use the
// existing ingredientKey and their existing validators, never search scores.
function text(value: string) {
  return value.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
type SearchName = { name: string; key: string; label: string; aliases: string[]; owned: boolean };
const catalogByKey = new Map<string, IngredientSuggestion>();
const catalogByAlias = new Map<string, IngredientSuggestion | null>();
const catalogNames = new Set(INGREDIENT_CATALOG.map(item => item.name));
for (const item of INGREDIENT_CATALOG) catalogByKey.set(ingredientKey(item.name), item);
for (const item of INGREDIENT_CATALOG) for (const alias of item.aliases) {
  const key = ingredientKey(alias), old = catalogByAlias.get(key);
  // An ambiguous alias may retrieve multiple suggestions, but never coalesce
  // existing inventory under an arbitrarily chosen suggestion.
  catalogByAlias.set(key, old === undefined || old === item ? item : null);
}
export function catalogSuggestion(name: string) {
  const key = ingredientKey(name);
  return catalogByKey.get(key) ?? catalogByAlias.get(key) ?? undefined;
}
function compile(name: string, owned = false): SearchName {
  const item = catalogSuggestion(name);
  return { name, key: ingredientKey(name), label: text(name), owned,
    aliases: item ? [...new Set([item.name, ...item.aliases].flatMap(alias => [text(alias), ingredientKey(alias)]))] : [] };
}
const compiledCatalog = new Map(INGREDIENT_CATALOG.map(item => {
  const record = compile(item.name); return [record.key, record] as const;
}));
function wordPrefix(name: string, query: string) {
  const words = name.split(" "), tokens = query.split(" ");
  return words.some((_, start) => tokens.every((token, offset) => words[start + offset]?.startsWith(token)));
}
function rank(item: SearchName, query: string, key: string) {
  if (!query || item.key === key || item.label === query) return 0;
  if (item.label.startsWith(query) || item.key.startsWith(key)) return 1;
  if (wordPrefix(item.label, query) || wordPrefix(item.key, key)) return 2;
  if (item.aliases.some(alias => alias === query || alias === key || alias.startsWith(query) || wordPrefix(alias, query))) return 3;
  if (item.label.includes(query) || item.key.includes(key) || item.aliases.some(alias => alias.includes(query))) return 4;
  return Infinity;
}

export function isExactIngredientMatch(name: string, query: string) {
  const item = compile(name), q = text(query), key = ingredientKey(query);
  return !!q && (item.label === q || item.key === key || item.aliases.some(alias => alias === q || alias === key));
}

export function searchIngredientNames(options: readonly string[], inventory: readonly { name: string }[], query: string) {
  const q = text(query), key = ingredientKey(query);
  if (query.trim() && (!q || !key)) return [];
  const candidates = new Map(compiledCatalog);
  for (const name of options) {
    if (catalogNames.has(name)) continue;
    const item = compile(name); if (item.key && !candidates.has(item.key)) candidates.set(item.key, item);
  }
  const inventoryKeys = new Set(inventory.map(item => ingredientKey(item.name)));
  for (const { name } of inventory) {
    const item = compile(name, true), suggestion = catalogSuggestion(name);
    if (!item.key) continue;
    // Offer Edit for an explicit catalog spelling/alias already on hand. Keep
    // its original stored name/key and preserve separately stored legacy rows.
    const suggestedKey = suggestion ? ingredientKey(suggestion.name) : item.key;
    if (!inventoryKeys.has(suggestedKey)) candidates.delete(suggestedKey);
    candidates.set(item.key, item);
  }
  return [...candidates.values()].map(item => ({ item, rank: rank(item, q, key) }))
    .filter(match => Number.isFinite(match.rank))
    .sort((a, b) => a.rank - b.rank || Number(b.item.owned) - Number(a.item.owned)
      || a.item.label.localeCompare(b.item.label, "en") || a.item.key.localeCompare(b.item.key, "en"))
    .map(match => match.item.name);
}
