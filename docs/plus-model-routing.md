Plus model routing

Meal generation and meal replacement use gpt-6.1-sol for verified Plus members. Guest and Free requests continue using gpt-4.1. Membership is verified on the server on every request; request-body quality flags cannot select the Plus model.

Sol requests explicitly use reasoning_effort: low and omit temperature. Free retains its existing temperature settings. Chat Completions and JSON-object output are retained, along with existing validation, constraint retries. Plus week generation allows 90 seconds per provider request, with a 300-second function duration to accommodate constraint retries; Free keeps its 45-second provider timeout. Meal replacements retain their existing timeout. Prompts are unchanged.

Recipe generation, treat replacements and ingredient consolidation retain gpt-4o-mini pending a separate model decision.

Compatibility reference: https://developers.openai.com/api/docs/models/gpt-6.1-sol and https://developers.openai.com/api/docs/guides/deployment-checklist.

Validation: production build and all 47 regression tests passed, including actual-route request interception proving Free/Plus routing and supported sampling settings. Isolated checks use the real OpenAI provider with a mocked Plus membership and no database writes.

Real-provider validation: both actual route handlers returned 200 with Sol. The explicit Oven/Stovetop vegetarian, peanut-free Italian-vibe fixture produced seven dinners, three breakfasts and three lunches in one successful provider call (about 69 seconds). Meal replacement returned a valid alternative in about five seconds. Route schemas and ingredient checks passed; no user or database records were written. An earlier fixture omitted equipment and was rejected by existing equipment validation; full-plan requests exceeded the old 45-second limit, motivating the Plus-only timeout increase.
