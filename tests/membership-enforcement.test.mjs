import test from "node:test";
import assert from "node:assert/strict";
import { resolveRequestMembership } from "../lib/request-membership.ts";

const headers = token => new Headers(token === undefined ? {} : { Authorization: token });
test("guest requests stay Free without any database lookup", async () => {
  const unavailable = { verifyUser: () => { throw Error("must not run"); }, loadPlan: () => { throw Error("must not run"); } };
  assert.deepEqual(await resolveRequestMembership(headers(), unavailable), { plan: "free", userId: null });
});
test("only verified user's current database plan can grant Plus", async () => {
  let plan = "plus";
  const verifier = { verifyUser: async token => { assert.equal(token, "valid"); return "owner"; }, loadPlan: async id => { assert.equal(id, "owner"); return plan; } };
  assert.equal((await resolveRequestMembership(headers("Bearer valid"), verifier)).plan, "plus");
  for (const value of ["free", null, undefined, "PLUS", "admin"]) {
    plan = value;
    assert.equal((await resolveRequestMembership(headers("Bearer valid"), verifier)).plan, "free");
  }
});
test("malformed, expired and forged credentials cannot reach membership lookup", async () => {
  let reads = 0;
  const verifier = { verifyUser: async () => null, loadPlan: async () => { reads++; return "plus"; } };
  for (const token of ["", "Basic fake", "Bearer", "Bearer a b", "Bearer forged"])
    assert.equal((await resolveRequestMembership(headers(token), verifier)).status, 401);
  assert.equal(reads, 0);
});
test("auth and membership outages fail closed without selecting a model", async () => {
  for (const verifier of [
    { verifyUser: async () => { throw Error("secret auth error"); }, loadPlan: async () => "plus" },
    { verifyUser: async () => "owner", loadPlan: async () => { throw Error("secret database error"); } },
  ]) {
    const result = await resolveRequestMembership(headers("Bearer valid"), verifier);
    assert.equal(result.status, 503);
    assert.equal("plan" in result, false);
    assert.equal(result.error.includes("secret"), false);
  }
});
