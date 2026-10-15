# Local grocery pricing feasibility — research only

Reviewed October 15, 2026. No signup, paid service, credentials, scraping or integration was provisioned. ZIP 75043 is a location hint, not a local-price database.

| Source | Fit | Verified limitations / unresolved prerequisites |
|---|---|---|
| Kroger official Products + Locations APIs | First candidate for a limited Kroger-family store pilot | Official developer pages require interactive access; the public Kroger Postman workspace lists the APIs. A current authenticated review is still required to verify location-specific price fields, coverage around 75043, exact daily/per-second quotas, commercial terms, attribution and caching/display rights. Do not treat widely repeated third-party quota numbers as verified. Cannot cover all chains. |
| Instacart Developer Platform | Shopping-list/recipe handoff first; potentially broader retailer matching | Official documentation describes nearby-retailer matching, inventory/pricing and shoppable pages. A hosted shopping-list page does not establish a license for MealCaddie to export/cache store prices or calculate cross-store averages. Product-search availability, commercial approval, numeric quotas and applicable account costs need confirmation. Handle documented 429 responses; do not assume unlimited access. |
| BLS / USDA public statistics | Clearly labeled national/regional fallback or historical calibration | BLS publishes selected food averages nationally and, where sufficient, regionally. USDA research datasets are statistical benchmarks. Neither establishes fresh package-level price quotes for every item in a ZIP code. Do not label these as local store prices. |

Recommendation: verify Kroger location/product permission and coverage first, retaining a general estimate fallback; use Instacart primarily as a user-directed shopping handoff until actual price-data rights and endpoints are confirmed. Seek directly licensed retailer/data partnerships if broader coverage is needed. No speculative third-party scraping provider is recommended.

## Proposed architecture and stages

1. Commercial/access review and small permitted coverage experiment; no subscription or credential provisioning under this assignment.
2. Server-side provider adapter: optional ZIP → selected store ID, ingredient → reviewed product/UPC match, package size and unit normalization, currency, regular/promo/loyalty conditions, timestamp and provenance. Do not silently equate fresh garlic with garlic powder or pounds with volume.
3. Cache only when permitted, with provider-specific TTL, bounded requests, per-user caps, backoff and expiry. Missing/ambiguous items remain unmatched or use a labeled general estimate. ZIP optional; minimize location retention and never require a street address.
4. Separate ingredient-use value from package-purchase cost. Two tablespoons of oil use a fraction of a bottle; a pantry-empty cart may require buying the full bottle. Deduplicate compatible packages across recipes, account for owned stock and leftovers, and separately disclose taxes, fees, delivery and loyalty assumptions.
5. Confidence UI: store-specific quote with age, matched-item coverage and estimate range. A local average requires several comparable, timestamped, permitted observations across a documented geographic radius and store sample; normalize unit sizes, separate promotions and outliers, and show sample count. Do not average incomparable products or imply ZIP-wide coverage from one store.
6. Only after reliability and unit economics: proposed Free basic localized estimates; Plus preferred-store comparisons/optimization. Neither is currently available.

## Costs and capacity

Current provider account pricing/contract costs could not be verified; there is no defensible dollar operating quote yet. Do not describe either API as free or infer storage/display permission from technical access. Budget model: users × plans/month × unmatched ingredients × stores searched, reduced only by permitted cache hits. Example workload (not a vendor quote): 1,000 users × 4 plans × 25 ingredient searches × 1 store = 100,000 monthly product lookups before caching, plus location/search retries. Comparing three stores can triple that demand. Price `lookup_count × contracted_rate`, plus cache, matching review, hosting and support. Set a provider-specific spending ceiling before any rollout.

## Primary sources

- [Kroger developer portal](https://developer.kroger.com/reference) and [Kroger public Postman workspace](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/documentation/ki6utqb/kroger-public-apis). Detailed current terms/quotas remain an access prerequisite.
- [Instacart platform introduction](https://docs.instacart.com/developer_platform_api/), [shopping-list endpoint](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/), [API errors/rate limits](https://docs.instacart.com/developer_platform_api/api/overview/), [developer terms](https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_terms/).
- [BLS average-price methodology](https://www.bls.gov/cpi/factsheets/average-prices.htm), [USDA food-price research](https://ers.usda.gov/topics/food-markets-prices/food-prices-expenditures-and-establishments).
