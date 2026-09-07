import LoginForm from './LoginForm';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Iniciar sesión — LoL Fantasy League',
};

export default async function LoginPage() {
  // If already authenticated, send to home.
  const user = await getAuthUser();
  if (user) redirect('/');

  return (
    <main className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/30 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo / header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mx-auto">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Fantasy League
          </h1>
          <p className="text-slate-400 text-sm">
            Ingresa tu email y te enviamos un enlace mágico para acceder.
          </p>
        </div>

        {/* Login form (Client Component) */}
        <LoginForm />

        {/* Back link */}
        <p className="text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
            Volver al inicio sin sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
