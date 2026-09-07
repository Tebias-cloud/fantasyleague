import { getAuthUser } from '@/lib/auth';
import { signOut } from '@/app/actions/auth-actions';
import Link from 'next/link';
import { LogIn, LogOut, User } from 'lucide-react';

/**
 * Server Component: reads the session server-side, renders auth controls.
 * Placed in the root layout so every page has access to auth state.
 */
export default async function AuthHeader() {
  const user = await getAuthUser();

  return (
    <header className="fixed top-0 right-0 z-50 p-3 flex justify-end">
      {user ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl px-3 py-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300 max-w-[160px] truncate">
              {user.email}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-1.5 transition-colors text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 rounded-xl px-3 py-1.5 transition-colors text-xs font-medium"
        >
          <LogIn className="w-3.5 h-3.5" />
          Iniciar sesión
        </Link>
      )}
    </header>
  );
}
