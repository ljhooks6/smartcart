import { AuthHome } from "@/components/auth-home";
import { PublicBetaHome } from "@/components/public-beta-home";
import { productGateEnabled } from "@/lib/product-access";
import { betaSubmissionsEnabled } from "@/lib/beta-domain";
export const dynamic = "force-dynamic";

export default function HomePage() {
  return productGateEnabled() ? <AuthHome publicContent={<PublicBetaHome accepting={betaSubmissionsEnabled()} />} /> : <AuthHome />;
}
