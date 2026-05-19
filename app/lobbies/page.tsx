import RecentLobbies from "@/components/RecentLobbies";
import { getAllLobbies } from "@/app/actions/lobby-actions";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AllLobbiesPage() {
  const allLobbies = await getAllLobbies();

  return (
    <main className="min-h-screen bg-slate-950 relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/30 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Navigation header */}
        <div className="flex justify-start">
          <Link 
            href="/"
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 px-4 py-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver al Inicio
          </Link>
        </div>

        <header className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
            Todas las Salas
          </h1>
          <p className="text-slate-400 font-medium">
            Explora todas las competencias creadas en la plataforma.
          </p>
        </header>

        <RecentLobbies lobbies={allLobbies} title="Directorio de Salas" />
      </div>
    </main>
  );
}
