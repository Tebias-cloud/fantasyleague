"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Trash2, Calendar, Edit2, Loader2, X } from 'lucide-react';
import { updateLobby, deleteLobby } from '@/app/actions/lobby-actions';

interface LobbyAdminControlsProps {
  lobbyId: string;
  initialName: string;
  initialEndDate: string;
  isOwner?: boolean;
}

export default function LobbyAdminControls({
  lobbyId,
  initialName,
  initialEndDate,
  isOwner = false,
}: LobbyAdminControlsProps) {
  const router = useRouter();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  // Extract YYYY-MM-DD from ISO string for the input
  const [endDate, setEndDate] = useState(initialEndDate.split('T')[0]);

  const openEditModal = () => {
    setUpdateError(null);
    setName(initialName);
    setEndDate(initialEndDate.split('T')[0]);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = () => {
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    setIsSubmitting(true);
    
    try {
      const result = await updateLobby(lobbyId, { name, end_date: new Date(endDate).toISOString() });
      if (result.error) {
        setUpdateError(result.error);
      } else {
        setIsEditModalOpen(false);
        router.refresh();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Hubo un error al actualizar la sala.';
      console.error('Error updating lobby:', msg);
      setUpdateError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsSubmitting(true);
    
    try {
      const result = await deleteLobby(lobbyId);
      if (result.error) {
        setDeleteError(result.error);
        setIsSubmitting(false);
      } else {
        // Redirigir al inicio después de borrar
        router.push('/');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Hubo un error al eliminar la sala.';
      console.error('Error deleting lobby:', msg);
      setDeleteError(msg);
      setIsSubmitting(false);
    }
  };

  if (!isOwner) return null;

  return (
    <>
      <div className="flex gap-2">
        <button 
          onClick={openEditModal}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors border border-slate-700 hover:border-slate-600 shadow-sm"
        >
          <Edit2 className="w-4 h-4 text-emerald-400" />
          Editar
        </button>
        <button 
          onClick={openDeleteModal}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/30 hover:bg-red-900/40 text-red-400 text-sm font-bold rounded-xl transition-colors border border-red-900/50 hover:border-red-800/50 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Borrar
        </button>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                Editar Sala
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-5 space-y-5">
              {updateError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs font-semibold">
                  {updateError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre de la sala</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha de Fin</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    required
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar {initialName}?</h3>
            <p className="text-slate-400 mb-6">Esta acción es irreversible. Se eliminará la sala <strong>{initialName}</strong> y todo el historial de progreso de los jugadores en ella.</p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs font-semibold text-left">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
