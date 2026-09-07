import Link from 'next/link';
import { Trophy, ArrowLeft, Home } from 'lucide-react';

export default function LobbyNotFound() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <Trophy className="w-8 h-8 text-slate-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Sala no encontrada</h1>
          <p className="text-slate-400 text-sm">
            Esta sala no existe, el enlace es incorrecto o fue eliminada por su creador.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/lobbies"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Ver Salas
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <Home className="w-4 h-4" /> Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
