import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function loadComponent(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
      return loadComponent(/\.tsx?$/.test(base)?base:existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts');
    }
    return require(name);
  }, module, module.exports);
  return module.exports;
}

test('the full application layout keeps the planning form inside Plan on mobile, with no global allergy paragraph', () => {
  const source = readFileSync('components/smart-cart-app.fixed.tsx', 'utf8');
  const file = ts.createSourceFile('app.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const forms = [];
  function visit(node, ancestors = []) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'SmartCartContextForm') forms.push(ancestors);
    ts.forEachChild(node, child => visit(child, [...ancestors, node]));
  }
  visit(file);
  assert.equal(forms.length, 2); // mobile and desktop implementations
  assert.ok(forms.some(parents => parents.some(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(file) === 'section' && n.openingElement.getText(file).includes('activeMobileTab === "plan"'))));
  assert.ok(forms.some(parents => parents.some(n => ts.isJsxElement(n) && n.openingElement.getText(file).includes('className="hidden md:block"'))));
  assert.doesNotMatch(source, /Saved recipes and grocery lists are not verified for allergies/);
  assert.doesNotMatch(source, /<p[^>]*role="note"[^>]*>Allergy-dependent/);
});

test('the actual planning form renders the restriction, saved-content warning and complete safety link together', () => {
  const noop = () => {};
  const props = new Proxy({
    userPlan: 'free', combinedPantryItems: [], fullyStocked: new Set(),
    adventureLevelOptions: [], equipmentOptions: [], prepTimeOptions: [], pantryCategoryStyles: {}, pantryQuickSelectOptions: {},
    formState: { budget: '60', householdSize: '2', diet: 'No preference', cuisinePreference: '', mealSourceMode: 'pantry-and-store', pantryItems: '', mustHaveIngredient: '', avoidIngredients: '', includeDessert: false, includeBreakfast: false, includeLunch: false, prepTime: '', adventureLevel: '', availableEquipment: ['Stovetop'] },
  }, { get: (target, key) => typeof key === 'string' && key.startsWith('on') ? noop : target[key] });
  const { SmartCartContextForm } = loadComponent(path.resolve('components/smart-cart-context-form.tsx'));
  const html = renderToStaticMarkup(React.createElement(SmartCartContextForm, props));
  const note = html.match(/<p[^>]*aria-label="Planning allergy safety"[^>]*>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(note);
  assert.match(note, /generation is temporarily restricted/);
  assert.match(note, /do not remove them to obtain a plan/);
  assert.match(note, /Saved recipes and grocery lists are not verified for allergies/);
  assert.match(note, /href="\/legal\/safety"/);
  assert.match(note, /Read the complete dietary safety notice/);
});
