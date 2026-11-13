export function cookingTimeLimitMinutes(preference?: string): number | null {
  // Unqualified numbers retain their existing interpretation as minutes.
  const limits = Array.from(preference?.matchAll(/(\d+)\s*(hours?\b|hrs?\b)?/gi) ?? [], match =>
    Number(match[1]) * (match[2] ? 60 : 1));
  const maximum = Math.max(0, ...limits);
  return Number.isFinite(maximum) && maximum > 0 ? maximum : null;
}
