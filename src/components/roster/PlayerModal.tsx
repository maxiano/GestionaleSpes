import React, { useState, useEffect } from 'react';
import { Player } from '../../types';
import { savePlayer } from '../../services/playersService';
import { isValidString, isValidDate } from '../../utils/formatters';
import { X, Loader2 } from 'lucide-react';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerToEdit: Player | null;
  activeTeamId: string;
  onSaved: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  onClose,
  playerToEdit,
  activeTeamId,
  onSaved
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [jersey, setJersey] = useState('');
  const [role, setRole] = useState('');
  const [medicalExp, setMedicalExp] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerToEdit) {
      setFirstName(playerToEdit.firstName || '');
      setLastName(playerToEdit.lastName || '');
      setDob(playerToEdit.dob || '');
      setJersey(playerToEdit.jersey || '');
      setRole(playerToEdit.role || '');
      setMedicalExp(playerToEdit.medicalExp || '');
      setParentPhone(playerToEdit.parentPhone || '');
    } else {
      setFirstName('');
      setLastName('');
      setDob('');
      setJersey('');
      setRole('');
      setMedicalExp('');
      setParentPhone('');
    }
    setError(null);
  }, [playerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!isValidString(fName, 2)) {
      setError('Inserisci un Nome valido (almeno 2 caratteri).');
      return;
    }
    if (!isValidString(lName, 2)) {
      setError('Inserisci un Cognome valido (almeno 2 caratteri).');
      return;
    }
    if (dob && !isValidDate(dob)) {
      setError('Data di nascita non valida (formato AAAA-MM-GG).');
      return;
    }
    if (medicalExp && !isValidDate(medicalExp)) {
      setError('Scadenza certificato non valida (formato AAAA-MM-GG).');
      return;
    }

    setLoading(true);

    try {
      const payload: Omit<Player, 'id'> = {
        firstName: fName,
        lastName: lName,
        name: `${lName} ${fName}`.trim(),
        dob: dob || null,
        jersey: jersey ? String(parseInt(jersey, 10)) : '',
        role: role || 'Non specificato',
        medicalExp: medicalExp || null,
        parentPhone: parentPhone.trim() || '',
        teamId: activeTeamId
      };

      await savePlayer(payload, playerToEdit ? playerToEdit.id : null);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Errore salvataggio giocatore:', err);
      setError(err?.message || 'Errore durante il salvataggio del giocatore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-add-player"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden"
    >
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 id="modal-player-title" className="text-lg font-black text-slate-900 tracking-tight">
            {playerToEdit ? 'Modifica Giocatore' : 'Aggiungi Nuovo Giocatore'}
          </h3>
          <button
            id="btn-close-modal-player"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold mb-4">
            ⚠️ {error}
          </div>
        )}

        <form id="form-add-player" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cognome *
              </label>
              <input
                type="text"
                id="player-last-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="es. Rossi"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome *
              </label>
              <input
                type="text"
                id="player-first-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="es. Mario"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data Nascita
              </label>
              <input
                type="date"
                id="player-dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                N° Maglia
              </label>
              <input
                type="number"
                id="player-jersey"
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
                placeholder="es. 10"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ruolo
              </label>
              <select
                id="player-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="">N/D</option>
                <option value="Portiere">Portiere</option>
                <option value="Difensore">Difensore</option>
                <option value="Centrocampista">Centrocampista</option>
                <option value="Attaccante">Attaccante</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Scadenza Certificato Medico
              </label>
              <input
                type="date"
                id="player-medical-exp"
                value={medicalExp}
                onChange={(e) => setMedicalExp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefono Genitore
              </label>
              <input
                type="tel"
                id="player-parent-phone"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="es. 3331234567"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Collega automaticamente l'account genitore se registrato con questo numero.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2.5 rounded-xl font-bold transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              id="btn-submit-player"
              disabled={loading}
              className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider transition shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{playerToEdit ? 'Aggiorna Giocatore' : 'Salva Giocatore'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
