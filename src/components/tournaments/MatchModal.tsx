import React, { useState, useEffect } from 'react';
import { Tournament, TournamentMatch } from '../../types';
import { saveTournamentMatch } from '../../services/tournamentsService';
import { X, Loader2 } from 'lucide-react';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  matchToEdit: TournamentMatch | null;
  activeTeamId: string;
  onSaved: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  tournament,
  matchToEdit,
  activeTeamId,
  onSaved
}) => {
  const [matchTeams, setMatchTeams] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (matchToEdit) {
      setMatchTeams(matchToEdit.match || '');
      setDate(matchToEdit.date || '');
      setTime(matchToEdit.time || '');
      setLocation(matchToEdit.location || '');
    } else {
      setMatchTeams('');
      setDate('');
      setTime('');
      setLocation(tournament?.location || '');
    }
  }, [matchToEdit, tournament, isOpen]);

  if (!isOpen || !tournament) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchTeams.trim()) return alert('Inserisci le squadre dell incontro!');
    setLoading(true);

    try {
      await saveTournamentMatch(
        {
          teamId: activeTeamId,
          tournamentId: tournament.id,
          match: matchTeams.trim(),
          date,
          time,
          location: location.trim(),
          played: matchToEdit ? matchToEdit.played : false,
          result: matchToEdit ? matchToEdit.result : ''
        },
        matchToEdit ? matchToEdit.id : null
      );

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Errore salvataggio partita: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
      <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-900 text-lg">
            ⚽ {matchToEdit ? 'Modifica Partita' : 'Aggiungi Partita al Torneo'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Torneo di Riferimento
            </label>
            <input
              type="text"
              disabled
              value={tournament.name}
              className="w-full p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Incontro (Squadre) *
            </label>
            <input
              type="text"
              required
              value={matchTeams}
              onChange={(e) => setMatchTeams(e.target.value)}
              placeholder="es. Spes Montesacro vs Artiglio"
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Data Partita
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Ora Partita
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campo di Gioco (opzionale)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Se diverso da quello del torneo"
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
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{matchToEdit ? 'Salva Modifiche' : 'Salva Partita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
