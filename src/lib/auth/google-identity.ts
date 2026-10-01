interface IdentityLike {
  provider: string;
  identity_data?: Record<string, unknown>;
}

interface UserLike {
  email?: string | null;
  identities?: IdentityLike[] | null;
}

/** True when Google vouches for this exact address (its identity says email_verified). */
export function hasVerifiedGoogleEmail(user: UserLike): boolean {
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;
  return (user.identities ?? []).some(
    (identity) =>
      identity.provider === "google" &&
      identity.identity_data?.email_verified === true &&
      String(identity.identity_data?.email ?? "").trim().toLowerCase() === email
  );
}

/** True when the account also has a password login (someone may know that password). */
export function hasPasswordIdentity(user: UserLike): boolean {
  return (user.identities ?? []).some((identity) => identity.provider === "email");
}

/** True when the account has any Google login, verified or not. */
export function hasGoogleIdentity(user: UserLike | null | undefined): boolean {
  return (user?.identities ?? []).some((identity) => identity.provider === "google");
}
