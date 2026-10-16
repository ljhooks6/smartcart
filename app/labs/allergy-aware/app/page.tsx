import {notFound} from "next/navigation";
import {localLibraryEnabled,localLibraryBrowserConfigured} from "@/lib/allergy-library-local";
import {SmartCartApp} from "@/components/smart-cart-app.fixed";
export const dynamic="force-dynamic";
export default function LibraryApplicationPage(){
  if(!localLibraryEnabled())notFound();
  if(!localLibraryBrowserConfigured())notFound();
  return <SmartCartApp runtime="local-library"/>;
}
