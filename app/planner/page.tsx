import { ProductShell } from "@/components/product-shell";
import { productGateEnabled } from "@/lib/product-access";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your planner | MealCaddie", robots: { index: false, follow: false } };
export default function Page() { return <ProductShell gated={productGateEnabled()} />; }
