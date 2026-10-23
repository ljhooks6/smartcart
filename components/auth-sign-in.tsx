import { CredentialAccess } from "./credential-access";
// Preserve the existing sign-in component contract while sharing all account screens.
export function AuthSignIn({ enabled = false }: { enabled?: boolean } = {}) {
  return <CredentialAccess mode="login" enabled={enabled} />;
}
