import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loader, root } from './helpers/load-ts.mjs';

// Render the real components; replace only framework/resource boundaries for isolated SSR.
const require = createRequire(import.meta.url);
function componentLoader(states) {
  let stateIndex = 0;
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    function resolve(name) {
      if (name === 'react' && states) return { ...React, useState: initial => [states[stateIndex++] ?? initial, () => {}] };
      if (name === 'next/link') return { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true };
      if (name === 'next/image') return { default: ({ priority, ...props }) => React.createElement('img', props), __esModule: true };
      if (name === 'next/script') return { default: () => null, __esModule: true };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
        return load(['.tsx', '.ts'].map(ext => base + ext).find(existsSync));
      }
      return require(name);
    }
    new Function('require', 'module', 'exports', output)(resolve, module, module.exports);
    cache.set(file, module.exports); return module.exports;
  }
  return name => load(path.join(root, name));
}
const load = componentLoader();
const { FoundingTestersLanding } = load('components/founding-testers-landing.tsx');
const { BetaApplication } = load('components/beta-application.tsx');
const render = (accepting = false) => renderToStaticMarkup(React.createElement(FoundingTestersLanding, { accepting }, React.createElement(BetaApplication, { accepting, siteKey: '', embedded: true })));

test('shared campaign uses a single main, one intake and in-page CTA without a second backend', () => {
  const html = render();
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.equal((html.match(/<form\b[^>]*aria-busy/g) ?? []).length, 1);
  assert.match(html, /href="#apply"/);
  assert.match(html, /id="apply"/);
  assert.match(html, /Apply to Be a Founding Tester/);
  assert.match(html, /What&#x27;s for dinner\?/);
  const component = readFileSync(path.join(root, 'components/beta-application.tsx'), 'utf8');
  assert.match(component, /pilotEmail \? "\/api\/beta\/pilot-application" : "\/api\/beta\/applications"/);
});
test('consent is separate, marketing optional, submit fails closed without a challenge or launch permission', () => {
  for (const accepting of [false, true]) {
    const html = render(accepting);
    const beta = html.match(/<input[^>]*name="betaConsent"[^>]*>/)?.[0];
    const marketing = html.match(/<input[^>]*name="marketingConsent"[^>]*>/)?.[0];
    assert.match(beta, /required/); assert.doesNotMatch(marketing, /required|checked/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>Submit Founding Tester Application/);
    assert.match(html.match(/<input[^>]*name="website"[^>]*>/)?.[0], /tabindex="-1"/i);
  }
});
test('copy describes selection, limited dates and restrictions without activating or promising benefits', () => {
  const html = render();
  for (const copy of ['does not guarantee selection', 'No payment information', 'December 31, 2026', '11:59 PM Central Time', 'temporarily restricted', 'not certified allergy-safe', 'general product updates are optional', 'submission is disabled']) assert.ok(html.includes(copy), copy);
  assert.match(html, /href="\/auth\/sign-in"/);
  assert.match(html, /href="\/legal\/safety"/);
  assert.match(html, /href="\/beta\/privacy"/);
  assert.doesNotMatch(html, /<input[^>]*(password|cardNumber)/);
});
test('existing pilot remains standalone and read-only email binding is preserved', () => {
  const html = renderToStaticMarkup(React.createElement(BetaApplication, { accepting: false, siteKey: '', pilotEmail: 'synthetic@example.invalid' }));
  assert.match(html, /Controlled pilot application/);
  assert.match(html, /readOnly=""/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
});
test('all three screenshot assets are local and attributed to disposable preview fixtures', () => {
  const html = render();
  for (const name of ['shop.jpg', 'pantry.png', 'cook.jpg']) assert.ok(existsSync(path.join(root, 'public/founding-testers', name)));
  assert.match(html, /not customer information/);
  assert.equal((html.match(/<img[^>]*alt="[^"]+"/g) ?? []).length, 3);
});
test('bounded campaign attribution preserves sources and rejects arbitrary or oversized values', () => {
  const { betaAttribution } = loader()('lib/beta-attribution.ts');
  assert.deepEqual(betaAttribution('', true), { source: 'direct', campaign: 'founding-testers' });
  assert.deepEqual(betaAttribution('', false), { source: 'direct', campaign: '' });
  assert.deepEqual(betaAttribution('?utm_source=facebook&utm_campaign=wave-1', true), { source: 'facebook', campaign: 'wave-1' });
  assert.deepEqual(betaAttribution('?source=friends&utm_source=instagram&utm_campaign=', true), { source: 'friends', campaign: '' });
  for (const campaign of ['https://private.invalid', 'x'.repeat(81), '<script>']) assert.deepEqual(betaAttribution('?source=untrusted&utm_campaign=' + encodeURIComponent(campaign), true), { source: 'other', campaign: '' });
});
test('rendered success is generic for new or duplicate applicants and never claims activation', () => {
  const { BetaApplication: Completed } = componentLoader(['', false, '', true, 'friends', 'founding-testers'])('components/beta-application.tsx');
  const html = renderToStaticMarkup(React.createElement(Completed, { accepting: true, embedded: true, siteKey: '' }));
  assert.match(html, /Thanks for raising your hand/);
  assert.match(html, /does not create another place or change an existing review decision/);
  assert.match(html, /does not create an account or activate beta access/);
  assert.doesNotMatch(html, /<form\b|existing application remains in review/);
});
test('rendered retryable error is an alert and leaves form answers available', () => {
  const { BetaApplication: Failed } = componentLoader(['', false, 'We couldn’t connect. Your answers are still here; please retry.', false, 'direct', 'founding-testers'])('components/beta-application.tsx');
  const html = renderToStaticMarkup(React.createElement(Failed, { accepting: true, embedded: true, siteKey: '' }));
  assert.match(html, /role="alert"[^>]*>We couldn’t connect/);
  assert.match(html, /<form\b/);
  assert.match(html, /name="email"/);
  assert.doesNotMatch(html, /Thanks for raising your hand/);
});
test('each product screenshot has a keyboard trigger and a closed named native dialog', () => {
  const html = render();
  for (const title of ['Shop', 'Pantry', 'Cook']) assert.match(html, new RegExp(`aria-label="Enlarge ${title} screenshot" aria-haspopup="dialog"`));
  assert.equal((html.match(/<dialog\b/g) ?? []).length, 3);
  assert.equal((html.match(/<dialog[^>]*\bopen(?:=|\s|>)/g) ?? []).length, 0);
  assert.equal((html.match(/aria-labelledby="[^"]+" aria-describedby="[^"]+"/g) ?? []).length, 3);
  // Full-resolution copies are mounted only on opening; the closed page keeps three thumbnails.
  assert.equal((html.match(/<img[^>]*alt="[^"]+"/g) ?? []).length, 3);
});
test('hero and post-FAQ CTA share the existing form and keep closed applications disabled', () => {
  for (const accepting of [true, false]) {
    const html = render(accepting);
    const links = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>Apply to Be a Founding Tester<\/a>/g)];
    assert.deepEqual(links.map(link => link[1]), ['#apply', '#apply']);
    assert.ok(html.indexOf('Apply after reading the FAQ') > html.indexOf('id="faq-heading"'));
    assert.ok(html.indexOf('Apply after reading the FAQ') < html.indexOf('id="apply"'));
    if (!accepting) assert.match(html, /Applications are currently closed; submission remains disabled/);
    assert.equal((html.match(/id="apply"/g) ?? []).length, 1);
  }
});
