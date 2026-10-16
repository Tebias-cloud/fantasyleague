"use client";

import { useState } from 'react';
import { Link2, Copy, RotateCcw } from 'lucide-react';
import { rotateLobbyInvite } from '@/app/actions/lobby-actions';

export default function InviteLink({ lobbyId, initialToken }: { lobbyId: string; initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const inviteUrl = token && typeof window !== 'undefined'
    ? `${window.location.origin}/lobbies/${lobbyId}?invite=${encodeURIComponent(token)}` : '';

  const rotate = async () => {
    setBusy(true);
    setNotice('');
    try {
      const result = await rotateLobbyInvite(lobbyId);
      if ('inviteToken' in result && result.inviteToken) {
        setToken(result.inviteToken);
        setNotice('Nuevo enlace generado. Los anteriores dejaron de funcionar.');
      } else {
        setNotice(result.error || 'No se pudo regenerar.');
      }
    } catch {
      setNotice('No se pudo regenerar.');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice('Enlace copiado. Compártelo solo con tus participantes.');
    } catch {
      setNotice('No se pudo copiar. Selecciona el enlace manualmente.');
    }
  };

  return (
    <section className="rounded-2xl p-5 bg-slate-900 border border-amber-500/20 space-y-3">
      <h2 className="font-semibold text-amber-200 flex items-center gap-2"><Link2 size={18} /> Invitación privada</h2>
      <p className="text-sm text-slate-400">Comparte este enlace con jugadores invitados. Requerirán una cuenta para inscribirse. No lo publiques.</p>
      {inviteUrl && <input readOnly aria-label="Enlace privado para compartir" className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200" value={inviteUrl}/>}
      <div className="flex flex-wrap gap-2">
        {inviteUrl && <button type="button" onClick={copy} className="px-4 py-2 bg-emerald-700 rounded-lg text-sm text-white flex gap-2 items-center"><Copy size={16}/> Copiar enlace</button>}
        <button type="button" onClick={rotate} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 flex gap-2 items-center disabled:opacity-50">
          <RotateCcw size={16}/> {inviteUrl ? 'Regenerar enlace' : 'Generar invitación'}
        </button>
      </div>
      {notice && <p role="status" className="text-xs text-amber-200">{notice}</p>}
    </section>
  );
}
