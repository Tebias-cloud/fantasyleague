"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft, Trophy, Calendar, Settings, Gamepad2, Loader2 } from 'lucide-react';
import { createLobby } from '@/app/actions/lobby-actions';

export default function CreateLobbyForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    onlyUnranked: false,
    maxPlayers: 10,
    players: '',
  });

  const nextStep = () => setStep(2);
  const prevStep = () => setStep(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const lobbyId = await createLobby(formData);
      router.push(`/lobbies/${lobbyId}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Hubo un error al crear la sala.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          {step === 1 ? <Trophy className="text-emerald-500" /> : <Settings className="text-emerald-500" />}
          {step === 1 ? 'Crear Sala' : 'Reglas'}
        </h2>
        <span className="text-xs font-semibold bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
          Paso {step} de 2
        </span>
      </div>

      <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre de la sala</label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="Ej: Tryhards del finde"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Inicio</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    required
                    type="date" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fin</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    required
                    type="date" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
              Continuar <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <label className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <p className="font-medium text-white">Solo cuentas Unranked</p>
                <p className="text-xs text-slate-400 mt-0.5">Los jugadores deben empezar sin rango.</p>
              </div>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.onlyUnranked}
                  onChange={e => setFormData({...formData, onlyUnranked: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex justify-between">
                Riot IDs de Jugadores
              </label>
              <textarea 
                required
                rows={4}
                value={formData.players}
                onChange={e => setFormData({...formData, players: e.target.value})}
                placeholder="Hide on bush#KR1&#10;Agurin#EUW&#10;..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">Ingresa un Riot ID por línea (ej: Nombre#TAG)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex justify-between">
                Límite de Jugadores <span>{formData.maxPlayers}</span>
              </label>
              <input 
                type="range" 
                min="2" 
                max="50" 
                value={formData.maxPlayers}
                onChange={e => setFormData({...formData, maxPlayers: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="flex gap-3 mt-8">
              <button type="button" onClick={prevStep} disabled={isSubmitting} className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando...</> : 'Crear Lobby'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
