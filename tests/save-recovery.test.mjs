import test from "node:test";
import assert from "node:assert/strict";
import { recoverWeekDraft, weekDraftKey, weekSnapshot, saveErrorMessage } from "../lib/save-recovery.ts";

test("a dirty draft restores dinners, full Sweet Treat recipes and pantry only for its owner", () => {
  const draft = { userId: "one", dinners: [{ name: "Soup" }], desserts: [{ name: "Cake", servings: 4, instructions: ["Bake"] }], pantry: ["Rice"], dirty: true };
  assert.deepEqual(recoverWeekDraft(JSON.parse(JSON.stringify(draft)), "one"), draft);
  assert.equal(recoverWeekDraft(draft, "two"), null);
  assert.notEqual(weekDraftKey("one"), weekDraftKey("two"));
});

test("empty dirty drafts stay recoverable and invalid drafts are rejected", () => {
  const empty = { userId: "one", dinners: [], desserts: [], pantry: [], dirty: true };
  assert.deepEqual(recoverWeekDraft(empty, "one"), empty);
  assert.equal(recoverWeekDraft({ ...empty, pantry: [null] }, "one"), null);
  assert.equal(recoverWeekDraft({ ...empty, dinners: null }, "one"), null);
});

test("save snapshots detect edits during a save without treating pantry order as a change", () => {
  const before = weekSnapshot([{ name: "Soup" }], [], ["Rice", "Beans"]);
  assert.equal(before, weekSnapshot([{ name: "Soup" }], [], ["Beans", "Rice"]));
  assert.notEqual(before, weekSnapshot([{ name: "Soup" }, { name: "Tacos" }], [], ["Rice", "Beans"]));
  assert.notEqual(before, weekSnapshot([{ name: "Soup" }], [{ name: "Cake" }], ["Rice", "Beans"]));
  assert.notEqual(before, weekSnapshot([{ name: "Soup" }], [], []));
});

test("Supabase plain-object errors produce a useful retry message", () => {
  assert.equal(saveErrorMessage({ message: "Network unavailable" }), "Network unavailable");
  assert.equal(saveErrorMessage(null), "Please check your connection and retry.");
});
