import test from "node:test";
import assert from "node:assert/strict";
import { emptyShoppingState, shoppingReducer, parseShoppingProgress } from "../lib/shopping-progress.ts";
import { deriveGroceryLists } from "../lib/grocery-list.ts";

test("undo restores the exact checked state before removing an ingredient", () => {
  let state = shoppingReducer(emptyShoppingState(), { type: "check", key: "jasmine rice", name: "Jasmine Rice" });
  state = shoppingReducer(state, { type: "remove", key: "jasmine rice", name: "Jasmine Rice" });
  assert.deepEqual(state.removed, ["jasmine rice"]);
  state = shoppingReducer(state, { type: "undo" });
  assert.deepEqual(state.removed, []);
  assert.deepEqual(state.checked, ["jasmine rice"]);
  assert.equal(state.undo, null);
});

test("rapid actions undo only the most recent action", () => {
  let state = shoppingReducer(emptyShoppingState(), { type: "check", key: "a", name: "A" });
  state = shoppingReducer(state, { type: "check", key: "b", name: "B" });
  state = shoppingReducer(state, { type: "undo" });
  assert.deepEqual(state.checked, ["a"]);
  assert.equal(shoppingReducer(state, { type: "undo" }), state);
});

test("removing an extra can recover its position and checked state", () => {
  let state = emptyShoppingState();
  for (const id of ["a", "b"]) state = shoppingReducer(state, { type: "custom-add", item: { id, name: id, isChecked: id === "a" } });
  state = shoppingReducer(state, { type: "custom-remove", id: "a" });
  state = shoppingReducer(state, { type: "undo" });
  assert.deepEqual(state.custom.map(item => item.id), ["a", "b"]);
  assert.equal(state.custom[0].isChecked, true);
});

test("reload validates progress and reset cannot undo a previous plan", () => {
  assert.deepEqual(parseShoppingProgress({ checked: ["a", 2], custom: [{ id: "a", name: "Eggs", isChecked: true }, null] }), { checked: ["a"], removed: [], restored: [], custom: [{ id: "a", name: "Eggs", isChecked: true }] });
  const state = shoppingReducer(emptyShoppingState(), { type: "check", key: "a", name: "A" });
  assert.deepEqual(shoppingReducer(state, { type: "reset" }), emptyShoppingState());
  assert.equal(shoppingReducer(state, { type: "load", progress: parseShoppingProgress(state) }).undo, null);
});

test("hydration does not erase saved marks before authoritative requirements arrive",()=>{
  const stored={checked:['potato','rice'],removed:['lime'],restored:[],custom:[{id:'extra',name:'Napkins',isChecked:true}],fingerprints:{potato:'2',rice:'1 cup',lime:'1'}};
  let state=shoppingReducer(emptyShoppingState(),{type:'load',progress:parseShoppingProgress(stored)});
  assert.equal(shoppingReducer(state,{type:'reconcile',requirements:{},ready:false}),state);
  state=shoppingReducer(state,{type:'reconcile',requirements:{potato:'2',rice:'0.5 cups'},ready:true});
  assert.deepEqual(state.checked,['potato']);
  assert.deepEqual(state.removed,[]);
  assert.deepEqual(state.custom,stored.custom);
  assert.deepEqual(parseShoppingProgress(JSON.parse(JSON.stringify(state))).checked,['potato']);
});

test("removed collected rows do not inflate active shopping progress, and undo recovers them", () => {
  const derive = state => deriveGroceryLists({
    fullyStocked: new Set(), runningLow: new Set(), restock: new Set(), savedDesserts: [],
    weeklyMenu: [{ name: "Dinner", ingredients: [{ name: "Jasmine Rice", amount: "1 cup" }, { name: "Garlic", amount: "2 cloves" }] }],
    removedGroceryItems: state.removed, restoredItems: state.restored,
  }).derivedGroceryList;
  let state = shoppingReducer(emptyShoppingState(), { type: "check", key: "jasmine rice", name: "Jasmine Rice" });
  state = shoppingReducer(state, { type: "remove", key: "jasmine rice", name: "Jasmine Rice" });
  assert.equal(derive(state).length, 1);
  assert.equal(derive(state).filter(item => state.checked.includes(item.item_key)).length, 0);
  state = shoppingReducer(state, { type: "undo" });
  assert.equal(derive(state).length, 2);
  assert.equal(derive(state).filter(item => state.checked.includes(item.item_key)).length, 1);
});
