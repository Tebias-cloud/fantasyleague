import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase client for use in Client Components ("use client").
 * Safe to call multiple times — @supabase/ssr de-duplicates the instance
 * internally when called with the same config.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw in browser runtime or production to avoid breaking simple static analysis, 
    // but ensure we don't silently fail in production.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos en producción.');
    }
    console.warn('⚠️ Supabase environment variables missing. Using placeholders.');
  }

  return createBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
  );
}
