import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

/**
 * Handles the Magic Link callback from Supabase Auth.
 *
 * Supabase redirects here with ?token_hash=...&type=magiclink&next=/
 * after the user clicks the email link.
 *
 * Configure this URL in:
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 *   http://localhost:3000/auth/confirm          (development)
 *   https://your-domain.com/auth/confirm        (production)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    redirect(`/auth/error?error=${encodeURIComponent(errorDescription)}`);
  }

  const supabase = await createClient();

  // Handle PKCE flow (default in modern Supabase SSR)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[Auth] exchangeCodeForSession error:', error.message);
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
    redirect(next);
  }

  // Handle OTP / Token Hash flow
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      console.error('[Auth] verifyOtp error:', error.message);
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
    redirect(next);
  }

  redirect('/auth/error?error=Enlace+inválido+o+expirado');
}
