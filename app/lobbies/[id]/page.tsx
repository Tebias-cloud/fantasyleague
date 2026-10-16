import LeaderboardTable from '@/components/LeaderboardTable';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LobbyAdminControls from '@/components/LobbyAdminControls';
import { accessLobby } from '@/lib/lobby-access';
import InviteLink from '@/components/InviteLink';

export default async function LobbyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  const access = await accessLobby(id, invite);
  if (!access) notFound();
  const { lobby, user, isOwner } = access;
  const inviteToken = invite || '';
  const isLoggedIn = Boolean(user);
  const isPrivate = lobby.visibility === 'private';

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
            isOwner={isOwner}
          />
        </div>

        <header className="text-center space-y-4 mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {isPrivate ? 'Sala privada · Acceso con invitación' : 'Sala pública · Desafío SoloQ'}
          </p>
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

        {isPrivate && isOwner && <InviteLink lobbyId={id} initialToken={inviteToken} />}
        {!isLoggedIn && (
          <p className="text-center text-sm text-amber-200 rounded-xl bg-slate-900 border border-slate-800 p-4">
            <Link className="underline font-semibold" href="/login">Inicia sesión</Link> para unirte usando tu Riot ID.
          </p>
        )}
        <LeaderboardTable lobbyId={id} isOwner={isOwner} canJoin={isLoggedIn} inviteToken={inviteToken} />
      </div>
    </main>
  );
}
