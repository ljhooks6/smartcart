export const betaSourceChoices = ["direct", "facebook", "instagram", "friends", "community", "other"];

// Attribution is bounded, unverified campaign metadata, never identity or eligibility.
export function betaAttribution(search: string, foundingTesters = false) {
  const params = new URLSearchParams(search);
  const value = params.get("source") ?? params.get("utm_source") ?? "direct";
  const name = params.get("utm_campaign");
  return {
    source: betaSourceChoices.includes(value) ? value : "other",
    campaign: name === null ? (foundingTesters ? "founding-testers" : "") : /^[a-zA-Z0-9 _.-]{0,80}$/.test(name) ? name : "",
  };
}
