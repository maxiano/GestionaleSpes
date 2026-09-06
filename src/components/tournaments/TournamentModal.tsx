import React, { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { saveTournament, deleteTournament } from '../../services/tournamentsService';
import { X, Loader2, Trash2 } from 'lucide-react';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentToEdit: Tournament | null;
  activeTeamId: string;
  onSaved: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  tournamentToEdit,
  activeTeamId,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tournamentToEdit) {
      setName(tournamentToEdit.name || '');
      setStartDate(tournamentToEdit.startDate || '');
      setEndDate(tournamentToEdit.endDate || '');
      setLocation(tournamentToEdit.location || '');
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
      setLocation('');
    }
  }, [tournamentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Inserisci il nome del torneo!');
    setLoading(true);

    try {
      await saveTournament(
        {
          teamId: activeTeamId,
          name: name.trim(),
          startDate,
          endDate,
          location: location.trim()
        },
        tournamentToEdit ? tournamentToEdit.id : null
      );

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Errore salvataggio torneo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tournamentToEdit) return;
    if (
      !confirm(
        `Sei sicuro di voler eliminare "${tournamentToEdit.name}"? Verranno eliminate anche tutte le partite collegate!`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await deleteTournament(tournamentToEdit.id);
      onSaved();
      onClose();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
      <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-900 text-lg">
            🏆 {tournamentToEdit ? 'Modifica Torneo' : 'Nuovo Torneo'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Torneo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Torneo NIKI 2026"
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Inizio Torneo *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Fine Torneo *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campo di Gioco / Località Principale
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="es. Centro Sportivo Spes Montesacro"
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              Annulla
            </button>

            {tournamentToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{tournamentToEdit ? 'Salva Modifiche' : 'Crea Torneo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
