import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loader } from './helpers/load-ts.mjs';

const load = loader();
const { mealFamily, mealVarietyPolicy, buildMealVarietyGuidance, reviewMealVariety, recentRejections } = load('lib/meal-variety.ts');
const input = { budget: 80, diet: 'No preference', householdSize: 2, combinedPantryItems: 'Rice, Eggs, Carrots', availableEquipment: ['Stovetop'], mealSourceMode: 'pantry-and-store' };

test('protein/flavor renames share a dish family without banning rice as an ingredient', () => {
  for (const name of ['Chicken Fried Rice', 'Vegetable Fried Rice', 'Egg Fried-Rice', 'Tofu Stir-Fried Rice', 'Nasi Goreng']) assert.equal(mealFamily(name), 'fried rice', name);
  for (const name of ['Chicken Stir-Fry', 'Vegetable stir fry', 'Stir-fried Beef']) assert.equal(mealFamily(name), 'stir-fry', name);
  assert.equal(mealFamily('Chicken rice bowl'), 'rice bowls');
  assert.equal(mealFamily('Black beans and rice'), 'beans and rice');
  assert.equal(mealFamily('Homestyle Egg and Potato Hash'), 'potato hash');
  for (const name of ['Jambalaya', 'Chicken pilaf', 'Mushroom risotto', 'Fish with steamed rice']) assert.notEqual(mealFamily(name), 'fried rice', name);
});

test('within-plan counts and across-generation frequency remain distinct', () => {
  const context = { recentPlans: [['Chicken Fried Rice'], ['Egg Fried Rice']] };
  const policy = mealVarietyPolicy({ existingMeals: 'Chicken Fried Rice' }, context);
  assert.equal(policy.frequency.get('fried rice'), 2); // visible title is not a third plan
  const review = reviewMealVariety(['Vegetable Fried Rice', 'Fish soup'], {}, context);
  assert.deepEqual(review.withinPlan, []);
  assert.deepEqual(review.recentFamilyRepeats, ['fried rice']);
  assert.equal(reviewMealVariety(['Chicken Fried Rice', 'Egg Fried Rice'], {}).withinPlan[0].count, 2);
});

test('family rotation discourages nearby fallback formats and weights rejections for both tiers', () => {
  const context = { recentPlans: [['Chicken Fried Rice', 'Black Bean Quesadillas', 'Lemon Chicken']] };
  const policy = mealVarietyPolicy({ recentRejectedMeals: ['Egg Fried Rice', 'Potato Hash'] }, context);
  assert.equal(policy.coolingFamilies[0], 'fried rice');
  assert.ok(policy.coolingFamilies.includes('potato hash'));
  assert.equal(policy.rotateRiceDefaults, true);
  const prompt = buildMealVarietyGuidance({}, context);
  assert.match(prompt, /swapping fried rice for a generic stir-fry or rice bowl/);
  assert.match(prompt, /exact-title exclusion alone is insufficient/);
});

test('fried rice can return when requested, history cools off, or pantry constraints require it', () => {
  const context = { recentPlans: [['Chicken Fried Rice']] };
  assert.ok(!mealVarietyPolicy({ mustHaveIngredient: 'Vegetable fried rice' }, context).coolingFamilies.includes('fried rice'));
  assert.ok(mealVarietyPolicy({ mustHaveIngredient: 'rice, eggs' }, context).coolingFamilies.includes('fried rice'));
  assert.equal(mealVarietyPolicy({ mustHaveIngredient: 'no fried rice' }, context).requestedFamily, null);
  assert.deepEqual(mealVarietyPolicy({}).coolingFamilies, []);
  assert.match(buildMealVarietyGuidance({ mealSourceMode: 'pantry-only' }, context), /Rotation is advisory/);
  assert.match(buildMealVarietyGuidance({}, context), /budget, equipment and preparation time always outrank variety/);
});

function historyFixture(rows, failure = false) {
  const calls = [];
  const query = {};
  for (const name of ['select', 'eq', 'is', 'gte', 'lt', 'neq', 'order', 'limit']) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  query.abortSignal = async signal => { assert.ok(signal instanceof AbortSignal); return { data: rows, error: failure ? { message: 'private DB detail' } : null }; };
  const reader = loader({ './supabase-admin': { getSupabaseAdminClient: () => ({ from: table => { calls.push(['from', table]); return query; } }) } })('lib/generation-meal-history.ts').recentGenerationMeals;
  return { reader, calls };
}
const job = { id: 'new-job', owner_key: 'user:one', user_id: 'one', created_at: '2026-10-15T12:00:00.000Z' };
const row = (changes = {}) => ({ id: 'old-job', owner_key: job.owner_key, user_id: job.user_id, status: 'completed', created_at: '2026-10-14T12:00:00.000Z', dinners: [{ name: 'Egg Fried Rice', ingredients: [{ name: 'private content not sent' }] }, { name: 'Egg toast', day: 'Breakfast 1' }], ...changes });

test('history is bounded, title-only and scoped to the claimed account; stale/foreign/failed jobs are discarded', async () => {
  const { reader, calls } = historyFixture([row(), row({ owner_key: 'user:two', user_id: 'two' }), row({ status: 'failed' }), row({ created_at: '2026-09-01T00:00:00Z' }), row({ id: job.id }), row({ created_at: '2026-10-16T00:00:00Z' })]);
  assert.deepEqual(await reader(job), { recentPlans: [['Egg Fried Rice']] });
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'owner_key' && c[2] === job.owner_key));
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'user_id' && c[2] === job.user_id));
  assert.ok(calls.some(c => c[0] === 'limit' && c[1] === 3));
  assert.ok(calls.some(c => c[0] === 'select' && c[1].includes('dinners:result->meals') && !c[1].includes('*') && !c[1].includes('input')));
  assert.deepEqual(await reader({ ...job, owner_key: 'user:two' }), {});
});

test('guest history never uses shared network quota or authenticated history', async () => {
  const guest = { ...job, user_id: null, owner_key: 'guest:' + 'a'.repeat(64) };
  const { reader, calls } = historyFixture([row({ owner_key: guest.owner_key, user_id: null }), row()]);
  assert.deepEqual(await reader(guest), { recentPlans: [['Egg Fried Rice']] });
  assert.ok(calls.some(c => c[0] === 'is' && c[1] === 'user_id' && c[2] === null));
  assert.ok(!JSON.stringify(calls).includes('quota'));
  assert.deepEqual(await reader({ ...guest, owner_key: 'network:' + 'a'.repeat(64) }), {});
});

test('unavailable history falls back without exposing DB errors or blocking a valid request', async () => {
  assert.deepEqual(await historyFixture([], true).reader(job), {});
});

test('rejection history survives refresh in an owner-specific store but expires and remains bounded', () => {
  const now = Date.parse('2026-10-15T12:00:00Z');
  const values = [
    { title: 'Egg Fried Rice', rejectedAt: '2026-10-14T12:00:00Z' },
    { title: 'Egg Fried Rice', rejectedAt: '2026-10-13T12:00:00Z' },
    { title: 'Old dish', rejectedAt: '2026-09-01T12:00:00Z' },
    { title: 'Future dish', rejectedAt: '2026-10-20T12:00:00Z' },
  ];
  assert.deepEqual(recentRejections(values, now), [values[0]]);
  assert.equal(recentRejections(Array.from({ length: 20 }, (_, i) => ({ title: 'Dish ' + i, rejectedAt: values[0].rejectedAt })), now).length, 12);
  const component = readFileSync('components/smart-cart-app.fixed.tsx', 'utf8');
  assert.match(component, /mealcaddie-rejected-meals:\$\{planOwner\}/);
  assert.match(component, /rejectedHistory\.owner === planOwner/);
  assert.ok(component.indexOf('setRejectedHistory(current =>') < component.indexOf('fetch("/api/replace-meal"'));
  const schema = load('lib/generation-request.ts').generationRequestSchema;
  assert.equal(schema.parse({ ...input, recentRejectedMeals: ['Egg Fried Rice'] }).recentRejectedMeals[0], 'Egg Fried Rice');
  assert.equal(schema.safeParse({ ...input, recentRejectedMeals: Array(13).fill('Dish') }).success, false);
  assert.ok(!('user_id' in schema.parse({ ...input, user_id: 'someone-else', recentPlans: [['Private meal']] })));
});

const makeAnswer = first => ({
  meals: [first, 'Turkey cutlets with potatoes', 'Beef chili', 'Pork chops with cabbage', 'Salmon with peas', 'Tofu noodle salad', 'Bean patties with slaw'].map((name, i) => ({
    day: 'Day ' + (i + 1), name, description: 'A savory, comforting dinner with a crisp vegetable finish.',
    ingredients: [{ name: ['Eggs', 'Turkey', 'Beef', 'Pork', 'Salmon', 'Tofu', 'Beans'][i], amount: '1 serving', price: 1 }],
  })), breakfasts: [], lunches: [], desserts: [], estimated_total_cost: 7, budget_summary: 'Within budget.', upgrade_available: false,
});

for (const tier of ['free', 'plus']) test(tier + ': consecutive generation carries family rotation in the first call with no extra calls', async () => {
  process.env.OPENAI_API_KEY = 'mock-only';
  const requests = [];
  class Provider { chat = { completions: { create: async request => {
    requests.push(request);
    const prompt = request.messages[0].content;
    // Deterministic provider fixture offers a balanced alternative when the
    // server supplies the missing family context. No live quality claim.
    const cooling = /Families to give a rest this time when feasible: fried rice/.test(prompt);
    return { choices: [{ message: { content: JSON.stringify(makeAnswer(cooling ? 'Egg frittata with vegetables' : 'Chicken Fried Rice')) } }] };
  } } }; }
  const generate = loader({ openai: Provider, './beta-pilot-ai': { pilotAIBudget: async () => null } })('lib/meal-generation.ts').generateMealPlan;
  const first = await generate(input, tier); assert.equal(first.status, 200);
  const firstPlan = await first.json();
  const second = await generate(input, tier, undefined, { recentPlans: [firstPlan.meals.map(m => m.name)] });
  assert.equal(second.status, 200);
  const secondPlan = await second.json();
  assert.equal(mealFamily(firstPlan.meals[0].name), 'fried rice');
  assert.notEqual(mealFamily(secondPlan.meals[0].name), 'fried rice');
  assert.equal(requests.length, 2);
  assert.match(requests[1].messages[0].content, /Chicken Fried Rice/);
  assert.match(requests[1].messages[0].content, /Do not sidestep this rotation/);
  assert.equal(requests[0].model, requests[1].model);
});

test('a provider ignoring variety does not cause an automatic paid retry or discard valid constrained meals', async () => {
  process.env.OPENAI_API_KEY = 'mock-only'; let calls = 0;
  class Provider { chat = { completions: { create: async () => { calls++; return { choices: [{ message: { content: JSON.stringify(makeAnswer('Vegetable Fried Rice')) } }] }; } } }; }
  const generate = loader({ openai: Provider, './beta-pilot-ai': { pilotAIBudget: async () => null } })('lib/meal-generation.ts').generateMealPlan;
  const context = { recentPlans: [['Chicken Fried Rice'], ['Egg Fried Rice']] };
  const response = await generate(input, 'free', undefined, context);
  assert.equal(response.status, 200); assert.equal(calls, 1);
  assert.ok((await response.json()).varietyReview.recentFamilyRepeats.includes('fried rice'));
  const constrained = await generate({ ...input, mealSourceMode: 'pantry-only', combinedPantryItems: 'Eggs, Turkey, Beef, Pork, Salmon, Tofu, Beans' }, 'free', undefined, context);
  assert.equal(constrained.status, 200); assert.equal(calls, 2);
});

test('worker enriches authorized generation without mutating the stored request/hash or exposing history in input', async () => {
  const request = structuredClone(input), finished = [], calls = [];
  const loadWorker = loader({
    './generation-jobs': { claimGenerationJob: async () => ({ job: { ...job, input: request, plan: 'free', attempts: 1 } }), finishGenerationJob: async (...args) => finished.push(args) },
    './generation-meal-history': { recentGenerationMeals: async j => { assert.equal(j.user_id, 'one'); return { recentPlans: [['Egg Fried Rice']] }; } },
    './product-access': { productAccessForUser: async () => ({ allowed: true }), productGateEnabled: () => false },
    './legal-agreements': { agreementsForUser: async () => true },
    './beta-feature-membership': { loadFeaturePlan: async () => 'free' },
    './beta-plan-engagement': { recordPlanEngagement: async () => {} },
    './meal-generation': { generateMealPlan: async (...args) => { calls.push(args); return Response.json({ meals: [] }); } },
  });
  await loadWorker('lib/generation-worker.ts').processGenerationJob(job.id);
  assert.deepEqual(request, input);
  assert.deepEqual(calls[0][3], { recentPlans: [['Egg Fried Rice']] });
  assert.equal(finished[0][1], 'completed');
});

test('Free replacements also receive rejected-family context on the first call', async () => {
  process.env.OPENAI_API_KEY = 'mock-only'; const requests = [];
  class Provider { chat = { completions: { create: async r => { requests.push(r); return { choices: [{ message: { content: JSON.stringify({ title: 'Egg frittata', description: 'A savory, tender egg dinner.', prepTime: 20, ingredients: ['Eggs'] }) } }] }; } } }; }
  const route = loader({ openai: Provider, '@/lib/product-access': { requireProductAccess: async () => null }, '@/lib/legal-agreements': { requireAgreements: async () => null }, '@/lib/server-membership': { getRequestMembership: async () => ({ plan: 'free' }) }, '@/lib/beta-pilot-ai': { pilotAIBudget: async () => null } })('app/api/replace-meal/route.ts');
  const result = await route.POST(new Request('http://local.test', { method: 'POST', body: JSON.stringify({ ...input, rejectedMealTitle: 'Vegetable Fried Rice', recentRejectedMeals: ['Chicken Fried Rice'] }) }));
  assert.equal(result.status, 200); assert.equal(requests.length, 1);
  assert.match(requests[0].messages[0].content, /Families to give a rest this time when feasible: fried rice/);
});
