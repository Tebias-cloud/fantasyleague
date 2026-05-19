import LeaderboardTable from '@/components/LeaderboardTable';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LobbyAdminControls from '@/components/LobbyAdminControls';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Hacer fetch de los datos a Supabase
  const { data: lobby, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !lobby) {
    notFound();
  }

  // Calcular días restantes
  const endDate = new Date(lobby.end_date);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <Link 
            href="/"
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 px-4 py-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver al Inicio
          </Link>

          <LobbyAdminControls 
            lobbyId={lobby.id} 
            initialName={lobby.name} 
            initialEndDate={lobby.end_date} 
          />
        </div>

        <header className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
            {lobby.name}
          </h1>
          <p className="text-slate-400 font-medium">
            {diffDays > 0 ? (
              <>Termina en <span className="text-emerald-400">{diffDays} días</span></>
            ) : (
              <span className="text-red-400">Torneo finalizado</span>
            )}
          </p>
        </header>

        <LeaderboardTable lobbyId={id} />
      </div>
    </main>
  );
}
