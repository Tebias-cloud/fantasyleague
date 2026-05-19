import CreateLobbyForm from "@/components/CreateLobbyForm";
import RecentLobbies from "@/components/RecentLobbies";
import { Trophy, Swords, TrendingUp, ArrowRight, ArrowDown } from "lucide-react";
import Link from 'next/link';
import { getRecentLobbies } from "@/app/actions/lobby-actions";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const recentLobbies = await getRecentLobbies();

  return (
    <main className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/30 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 space-y-24">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
            League of Legends <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Fantasy League
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Crea salas privadas, compite con tus amigos y descubre quién es el verdadero tryhard. El que suba más LPs se lleva la gloria.
          </p>
          
          {/* Navegación rápida (Elimina la adivinanza de hacer scroll) */}
          <div className="pt-4 flex justify-center gap-4">
            <a 
              href="#recent-lobbies"
              className="inline-flex items-center gap-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 text-emerald-400 hover:text-emerald-300 font-bold px-6 py-3 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-sm"
            >
              Ver Salas Activas <ArrowDown className="w-4 h-4 animate-bounce" />
            </a>
            <Link 
              href="/lobbies"
              className="inline-flex items-center gap-2 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-800/50 hover:border-slate-800 text-slate-400 hover:text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all duration-300"
            >
              Directorio Completo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dos columnas principales (Original layout) */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Features */}
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Swords className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Compite en Privado</h3>
                <p className="text-slate-400">Invita solo a tus amigos, establece reglas personalizadas y define el tiempo de la competencia.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Tracking Automático</h3>
                <p className="text-slate-400">Nos conectamos con la API de Riot Games para actualizar los LPs de todos los participantes en tiempo real.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Leaderboard Dinámico</h3>
                <p className="text-slate-400">Visualiza quién va ganando con gráficos detallados de progreso, winrate y diferencias de LP.</p>
              </div>
            </div>
          </div>

          {/* Form Component */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 blur-3xl -z-10 rounded-[3rem]" />
            <CreateLobbyForm />
          </div>
        </div>

        {/* Recent Lobbies Section (Abajo con ID de ancla para scroll suave) */}
        <div id="recent-lobbies" className="max-w-4xl mx-auto pt-16 border-t border-slate-900 scroll-mt-20">
          <RecentLobbies lobbies={recentLobbies} />
          
          <div className="mt-8 text-center">
            <Link 
              href="/lobbies"
              className="inline-flex items-center gap-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Ver todas las salas <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
