"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Loader2, Users, CalendarDays, LockKeyhole, Globe2 } from 'lucide-react';
import { createLobby } from '@/app/actions/lobby-actions';
import { LOBBY_DURATIONS, MAX_LOBBY_PLAYERS, type LobbyDuration, type LobbyVisibility } from '@/lib/competition';

export default function CreateLobbyForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState<LobbyDuration>(7);
  const [visibility, setVisibility] = useState<LobbyVisibility>('public');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [onlyUnranked, setOnlyUnranked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createLobby({ name, durationDays, visibility, maxPlayers, onlyUnranked });
      const query = result.inviteToken ? `?invite=${encodeURIComponent(result.inviteToken)}` : '';
      router.push(`/lobbies/${result.id}${query}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la sala.';
      if (message.startsWith('UNAUTHORIZED')) {
        router.push('/login');
        return;
      }
      setError(message);
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Trophy className="text-emerald-400" /> Crear desafío SoloQ
      </h2>
      <form onSubmit={create} className="space-y-5">
        <label className="block text-sm text-slate-300">
          Nombre de la sala
          <input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}
            placeholder="Ej: Tryhards de Latinoamérica"
            className="mt-2 w-full rounded-xl p-3 bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 outline-none" />
        </label>
        <div className="space-y-2">
          <span className="flex items-center gap-2 text-sm text-slate-300"><CalendarDays size={16}/> Duración</span>
          <div className="grid grid-cols-3 gap-2">
            {LOBBY_DURATIONS.map(days => (
              <button key={days} type="button" onClick={() => setDurationDays(days)}
                aria-pressed={durationDays === days}
                className={`rounded-lg py-2.5 border text-sm font-semibold ${durationDays === days
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                {days} días
              </button>
            ))}
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-slate-300">Visibilidad</legend>
          <label className="flex items-center gap-3 rounded-xl bg-slate-950 p-3 border border-slate-800 cursor-pointer">
            <input type="radio" name="visibility" checked={visibility === 'public'} onChange={() => setVisibility('public')}/>
            <Globe2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-white">Pública <span className="block text-xs text-slate-400">Aparece en el directorio</span></span>
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-slate-950 p-3 border border-slate-800 cursor-pointer">
            <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')}/>
            <LockKeyhole className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white">Privada <span className="block text-xs text-slate-400">Solo con enlace de invitación</span></span>
          </label>
        </fieldset>
        <label className="block text-sm text-slate-300">
          <span className="flex items-center gap-2"><Users size={16}/> Máximo de jugadores: {maxPlayers}</span>
          <input type="range" min={2} max={MAX_LOBBY_PLAYERS} value={maxPlayers}
            onChange={e => setMaxPlayers(Number(e.target.value))}
            className="mt-3 w-full accent-emerald-500" />
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={onlyUnranked} onChange={e => setOnlyUnranked(e.target.checked)} className="mt-1" />
          Admitir solo jugadores sin rango inicial
        </label>
        <p className="text-xs text-slate-400 leading-relaxed">
          Gana quien más LP sume desde su incorporación. Puedes añadir jugadores después de crearla o compartir un enlace.
          Solo SoloQ, sin premios ni apuestas. Cada participante seleccionará su servidor.
        </p>
        {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-3">{error}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-60">
          {busy ? <><Loader2 className="w-5 h-5 animate-spin"/> Creando…</> : 'Crear lobby'}
        </button>
      </form>
    </section>
  );
}
