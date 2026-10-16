"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Trophy, RefreshCw, UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';
import { LOBBY_DURATIONS, PLATFORM_OPTIONS, MAX_LOBBY_PLAYERS, type LobbyDuration, type RiotPlatform } from '@/lib/competition';

type DemoPlayer = {
  id: number;
  gameName: string;
  platform: RiotPlatform;
  tier: string;
  startingLP: number;
  currentLP: number;
  wins: number;
  losses: number;
};

const SAMPLE: DemoPlayer[] = [
  { id: 1, gameName: 'LunaTop', platform: 'la2', tier: 'ESMERALDA II', startingLP: 1900, currentLP: 2048, wins: 13, losses: 6 },
  { id: 2, gameName: 'ArcaneMid', platform: 'euw1', tier: 'DIAMANTE IV', startingLP: 2420, currentLP: 2505, wins: 12, losses: 8 },
  { id: 3, gameName: 'RiftCarry', platform: 'na1', tier: 'PLATINO I', startingLP: 1715, currentLP: 1760, wins: 9, losses: 7 },
  { id: 4, gameName: 'PoroSupport', platform: 'br1', tier: 'ORO I', startingLP: 1480, currentLP: 1471, wins: 6, losses: 8 },
];

export default function DemoCompetition() {
  const [players, setPlayers] = useState(SAMPLE);
  const [duration, setDuration] = useState<LobbyDuration>(7);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [day, setDay] = useState(1);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<RiotPlatform>('la2');
  const [notice, setNotice] = useState('');

  const ranking = useMemo(() => [...players].sort(
    (a, b) => (b.currentLP - b.startingLP) - (a.currentLP - a.startingLP)
  ), [players]);

  function simulateDay() {
    if (day >= duration) return;
    setDay(d => d + 1);
    setPlayers(before => before.map((p, i) => {
      const changes = [24, 12, -18, 31];
      const diff = changes[(day + i) % changes.length];
      return {
        ...p,
        currentLP: p.currentLP + diff,
        wins: p.wins + (diff > 0 ? 1 : 0),
        losses: p.losses + (diff < 0 ? 1 : 0),
      };
    }));
    setNotice('Jornada simulada. Ninguna cuenta real fue consultada.');
  }

  function joinDemo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2 || name.length > 24) {
      setNotice('El nombre debe tener entre 2 y 24 caracteres.');
      return;
    }
    if (players.length >= MAX_LOBBY_PLAYERS) {
      setNotice('La sala está llena.');
      return;
    }
    if (day >= duration) {
      setNotice('La competición de demostración ha finalizado.');
      return;
    }
    if (players.some(p => p.gameName.toLowerCase() === name.toLowerCase() && p.platform === newPlatform)) {
      setNotice('Ese jugador ya está en la demo.');
      return;
    }
    setPlayers(before => [...before, {
      id: Math.max(...before.map(p => p.id), 0) + 1,
      gameName: name, platform: newPlatform,
      tier: 'SIN CLASIFICAR', startingLP: 0, currentLP: 0, wins: 0, losses: 0,
    }]);
    setNewName('');
    setNotice('Participante ficticio añadido. Su LP inicial queda fijado en 0.');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={16}/> Volver</Link>
        <header className="space-y-3">
          <p className="text-emerald-300 uppercase text-xs tracking-widest font-semibold">FantasyLeague · Prototipo para Riot Games</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">SoloQ Challenge mundial</h1>
          <p className="text-slate-400 max-w-2xl">Crea un lobby, invita jugadores de diferentes servidores y descubre quién gana más LP desde su entrada.</p>
          <p role="status" className="border border-amber-500/30 rounded-xl p-4 bg-amber-950/20 text-amber-200 text-sm">
            <strong>DEMO CON DATOS FICTICIOS.</strong> No representa clasificaciones oficiales, no accede a cuentas Riot y no utiliza ninguna API Key.
            Los datos no se guardan; al recargar se restaura la demo.
          </p>
        </header>

        <section className="grid sm:grid-cols-3 gap-4" aria-label="Reglas de la competición">
          <div className="border border-slate-800 bg-slate-900 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-3">Duración</p>
            <div className="flex gap-2 flex-wrap">
              {LOBBY_DURATIONS.map(d => <button type="button" key={d} onClick={() => { setDuration(d); setDay(1); setPlayers(SAMPLE); }}
                aria-pressed={duration === d}
                className={`rounded-lg px-3 py-2 text-xs border ${duration === d ? 'border-emerald-400 text-emerald-200' : 'border-slate-700 text-slate-400'}`}>{d}d</button>)}
            </div>
          </div>
          <div className="border border-slate-800 bg-slate-900 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-2">Visibilidad de sala</p>
            <select className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-sm"
              value={visibility} onChange={e=>setVisibility(e.target.value as 'public'|'private')}>
              <option value="public">Pública · Directorio</option>
              <option value="private">Privada · Invitación</option>
            </select>
          </div>
          <div className="border border-slate-800 bg-slate-900 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-2">Participantes</p>
            <p className="font-bold text-2xl">{players.length} <span className="text-slate-500 text-base">/ 20</span></p>
          </div>
        </section>

        <section className="border border-slate-800 bg-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex gap-2 items-center"><Trophy className="text-emerald-400"/> Ranking por LP ganados</h2>
              <p className="text-sm text-slate-400 mt-2">Jornada {day} de {duration} · Puntaje = LP actual − LP al entrar</p>
            </div>
            <button type="button" onClick={simulateDay} disabled={day >= duration}
              className="rounded-lg bg-emerald-600 text-white font-semibold px-4 py-3 disabled:opacity-40 flex gap-2 items-center">
              <RefreshCw size={16}/> Simular jornada
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead><tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="py-3 pr-2">#</th><th className="py-3">Jugador / Servidor</th><th>Rango</th>
                <th className="text-right">Δ LP</th><th className="text-right">V / D</th><th className="text-right">Partidas</th>
              </tr></thead>
              <tbody>{ranking.map((player, i) => <tr key={player.id} className="border-b border-slate-800/70">
                <td className="py-4 pr-2 font-bold text-emerald-300">{i + 1}</td>
                <td className="py-4 font-medium">{player.gameName}<span className="block text-xs text-slate-400">{PLATFORM_OPTIONS.find(x=>x.value===player.platform)?.label}</span></td>
                <td className="text-xs text-slate-300">{player.tier}</td>
                <td className={`text-right font-bold ${player.currentLP - player.startingLP >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {player.currentLP - player.startingLP > 0 ? '+' : ''}{player.currentLP - player.startingLP}
                </td>
                <td className="text-right">{player.wins} / {player.losses}</td>
                <td className="text-right">{player.wins + player.losses}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="border border-slate-800 bg-slate-900 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-xl flex gap-2 items-center"><UserPlus size={19} className="text-emerald-400"/> Simular ingreso de un jugador</h2>
          <form onSubmit={joinDemo} className="grid sm:grid-cols-[1fr_180px_auto] gap-3">
            <input required minLength={2} maxLength={24} value={newName} onChange={e=>setNewName(e.target.value)}
              placeholder="Riot ID ficticio" aria-label="Nombre ficticio" className="rounded-lg p-3 bg-slate-950 border border-slate-700"/>
            <select aria-label="Servidor" className="rounded-lg p-3 bg-slate-950 border border-slate-700" value={newPlatform}
              onChange={e=>setNewPlatform(e.target.value as RiotPlatform)}>
              {PLATFORM_OPTIONS.map(p=><option value={p.value} key={p.value}>{p.label}</option>)}
            </select>
            <button type="submit" disabled={players.length>=MAX_LOBBY_PLAYERS || day>=duration}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold px-4 disabled:opacity-40">Añadir a demo</button>
          </form>
          {notice && <p role="status" className="text-emerald-200 text-sm">{notice}</p>}
          <p className="text-xs text-slate-500">En el producto real, una sala privada exige enlace de invitación y el usuario debe iniciar sesión. Verificar identidad con Riot Sign On se evaluará tras la aprobación de Riot.</p>
        </section>
        <footer className="flex flex-wrap gap-5 text-sm text-slate-400">
          <Link href="/legal/privacy" className="hover:underline">Privacidad</Link>
          <Link href="/legal/terms" className="hover:underline">Términos</Link>
          <span className="flex items-center gap-1"><ShieldCheck size={15}/> No afiliado a Riot Games</span>
        </footer>
      </div>
    </main>
  );
}
