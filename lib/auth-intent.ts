import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { authDestination } from "./auth-destination";
export const intentCookie = "mealcaddie_return";
const ttl = 1800;
function key(secret: string) { if (secret.length < 32) throw Error("Return context unavailable"); return createHash("sha256").update(`mealcaddie-auth-return-v1:${secret}`).digest(); }
export function sealIntent(destination: string, invitation: string | undefined, secret: string, now = Date.now()) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const token = destination === "/beta/accept" && /^[A-Za-z0-9_-]{43}$/.test(invitation ?? "") ? invitation : undefined;
  const body = Buffer.concat([cipher.update(JSON.stringify({ destination: authDestination(destination), invitation: token, at: now })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function openIntent(value: string, secret: string, now = Date.now()): { destination: string; invitation?: string } | null {
  try {
    if (value.length > 1000) return null;
    const bytes = Buffer.from(value, "base64url"), decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    if (typeof data.at !== "number" || now < data.at || now - data.at > ttl * 1000 || authDestination(data.destination) !== data.destination) return null;
    return { destination: data.destination, ...(data.destination === "/beta/accept" && /^[A-Za-z0-9_-]{43}$/.test(data.invitation ?? "") ? { invitation: data.invitation } : {}) };
  } catch { return null; }
}
export function intentHeader(value: string, request: Request, clear = false) {
  return `${intentCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : ttl}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
