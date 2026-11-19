import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('submission failures are retained when a background poll returns no job', () => {
  const source = readFileSync('hooks/use-generation-job.ts', 'utf8');
  assert.match(source, /if \(data\.job\) \{[\s\S]*?apply\(data\.job, owner\)/);
  assert.match(source, /else \{[\s\S]*?apply\(null, owner\)/);
  assert.doesNotMatch(source, /setMessage\(null\); apply\(data\.job \?\? null, owner\)/);
});

test('generation feedback appears beside Review and the Meals area', () => {
  const source = readFileSync('components/smart-cart-app.fixed.tsx', 'utf8');
  assert.equal((source.match(/featureError=\{validationError \|\| requestError \|\| generation\.message\}/g) || []).length, 2);
  assert.equal((source.match(/\{generationFailureNotice\}/g) || []).length, 2);
  assert.match(source, /const generationFailureNotice = generation\.message && !isLoading/);
  assert.match(source, /role="alert"[\s\S]*?Meal planning did not finish/);
});
