import { requireProductAccess, productGateEnabled } from "@/lib/product-access";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await requireProductAccess(request); if (denied) return denied;
  return Response.json({ allowed: true, gated: productGateEnabled() }, { headers: { "Cache-Control": "private, no-store" } });
}
