'use client';

import { useActionState } from 'react';
import { sendMagicLink } from '@/app/actions/auth-actions';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

type ActionState = {
  status: 'idle' | 'success' | 'error';
  error?: string;
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const error = await sendMagicLink(null, formData);
      if (error) {
        return { status: 'error', error };
      }
      return { status: 'success' };
    },
    { status: 'idle' },
  );

  const wasSubmitted = !isPending && state.status === 'success';

  if (wasSubmitted) {
    return (
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">¡Enlace enviado!</h2>
          <p className="text-slate-400 text-sm">
            Revisa tu bandeja de entrada y haz click en el enlace para acceder.
            El enlace expira en 1 hora.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          ¿No lo ves? Revisa la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-5">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              disabled={isPending}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {state.status === 'error' && state.error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/10 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando enlace...
            </>
          ) : (
            'Enviar enlace mágico'
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Recibirás un email con un enlace para acceder sin contraseña.
      </p>
    </div>
  );
}
