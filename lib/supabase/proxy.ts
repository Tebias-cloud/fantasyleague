import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request so that the access token
 * stored in the cookie stays valid. Must be called from proxy.ts.
 *
 * Rules (from Supabase SSR docs):
 * - Do NOT put logic between createServerClient and getClaims().
 * - Always return supabaseResponse unchanged (or propagate its cookies).
 * - Use getClaims() (JWT-local, no network) not getUser() (network call).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip session refresh when env vars are absent (e.g. during build).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not add anything between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes.
  // /login and /auth/* are always public.
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth');

  if (!isAuthenticated && !isAuthRoute) {
    // Only protect mutation-heavy paths at the proxy level.
    // All Server Actions enforce auth independently (defence in depth).
    // Here we do NOT block read-only pages (lobbies are public to view).
  }

  // IMPORTANT: return supabaseResponse as-is so cookies are forwarded.
  return supabaseResponse;
}
