'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Sends a Magic Link email to the provided address.
 * Returns an error string if something goes wrong, or null on success.
 */
export async function sendMagicLink(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = formData.get('email');

  if (typeof email !== 'string' || !email.trim()) {
    return 'Por favor ingresa un email válido.';
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic format check before hitting Supabase.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return 'El formato del email no es válido.';
  }

  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000');
  
  if (!siteUrl) {
    console.error('[Auth] NEXT_PUBLIC_SITE_URL is not defined in production environment.');
    return 'Error de configuración del servidor. Contacta al administrador.';
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      // The Magic Link will redirect to this URL after verification.
      // Supabase appends token_hash and type query params automatically.
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    console.error('[Auth] sendMagicLink error:', error.message);
    return 'No se pudo enviar el enlace. Intenta nuevamente.';
  }

  return null; // null = success
}

/**
 * Signs the current user out and redirects to the home page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
