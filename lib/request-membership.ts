export type MembershipResult = { plan: "free" | "plus"; userId: string | null } | { status: 401 | 503; error: string };
export type MembershipVerifier = {
  verifyUser: (token: string) => Promise<string | null>;
  loadPlan: (userId: string) => Promise<unknown>;
};

// Identity always comes from verified auth, never request JSON or user metadata.
export async function resolveRequestMembership(headers: Headers, verifier: MembershipVerifier): Promise<MembershipResult> {
  const authorization = headers.get("authorization");
  if (authorization === null) return { plan: "free", userId: null };
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) return { status: 401, error: "Please sign in again before planning meals." };
  try {
    const userId = await verifier.verifyUser(match[1]);
    if (!userId) return { status: 401, error: "Please sign in again before planning meals." };
    const plan = await verifier.loadPlan(userId);
    return { plan: plan === "plus" ? "plus" : "free", userId };
  } catch {
    return { status: 503, error: "We couldn't verify your membership. Please try again." };
  }
}
