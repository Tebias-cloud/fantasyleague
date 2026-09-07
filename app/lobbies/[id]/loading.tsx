import { Loader2 } from 'lucide-react';

export default function LobbyDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-20 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Cargando sala y estadísticas...</p>
      </div>
    </main>
  );
}
