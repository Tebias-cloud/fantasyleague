import { createClient } from '@/lib/supabase/server';

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Returns the authenticated user from the current server-side session.
 * Returns null if the user is not authenticated.
 *
 * Use this in Server Components to read the current user without throwing.
 * Use requireAuth() in Server Actions that need a guaranteed identity.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: data.claims.email as string | undefined,
  };
}

/**
 * Asserts that the current request is authenticated.
 * Throws a descriptive error if the user is not logged in.
 *
 * Call this at the top of every Server Action that performs mutations.
 * This is the primary security gate — do not rely solely on UI or proxy.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('UNAUTHORIZED: You must be logged in to perform this action.');
  }

  return user;
}
