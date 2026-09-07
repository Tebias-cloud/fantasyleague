import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const message = error ?? 'Ocurrió un error de autenticación.';

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Error de autenticación</h1>
          <p className="text-slate-400 text-sm">{decodeURIComponent(message)}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors w-full"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
