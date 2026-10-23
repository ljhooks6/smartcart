import { FoundingTestersLanding } from "./founding-testers-landing";
export function PublicBetaHome({ accepting }: { accepting: boolean }) {
  return <FoundingTestersLanding accepting={accepting} />;
}
