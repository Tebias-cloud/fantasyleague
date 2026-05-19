import Link from 'next/link';
import { Trophy, Calendar, ArrowRight, Swords } from 'lucide-react';

interface Lobby {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

interface RecentLobbiesProps {
  lobbies: Lobby[];
  title?: string;
}

export default function RecentLobbies({ lobbies, title = "Salas Activas Recientes" }: RecentLobbiesProps) {
  if (!lobbies || lobbies.length === 0) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 text-center backdrop-blur-sm">
        <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
          <Swords className="w-6 h-6 text-slate-500" />
        </div>
        <h4 className="text-lg font-bold text-slate-400">No hay salas activas todavía</h4>
        <p className="text-slate-500 text-sm mt-1">¡Sé el primero en crear una sala usando el formulario!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <Trophy className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight uppercase">{title}</h3>
      </div>

      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {lobbies.map((lobby) => {
          const endDate = new Date(lobby.end_date);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

          return (
            <div 
              key={lobby.id} 
              className="group bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-300 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {lobby.name}
                  </h4>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Termina en: <span className={diffDays > 0 ? "text-emerald-400" : "text-red-400"}>{diffDays} días</span>
                  </span>
                </div>
              </div>

              <Link 
                href={`/lobbies/${lobby.id}`}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-slate-700/50 hover:border-emerald-500/50 group/btn"
              >
                Entrar a la Sala
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
