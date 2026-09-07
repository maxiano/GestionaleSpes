import React, { useState, useEffect } from 'react';
import { Tournament, UserProfile } from '../../types';
import { saveTournament, deleteTournament } from '../../services/tournamentsService';
import { fetchStaffUsers } from '../../services/authService';
import { createPushNotification } from '../../services/notificationService';
import {
  formatNewTournamentCoachWhatsApp,
  sendWhatsAppToPhoneOrShare
} from '../../utils/exports';
import { formatDateIT } from '../../utils/formatters';
import { X, Loader2, Trash2, MessageCircle, Smartphone, BellRing } from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Notifications
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyCoach, setNotifyCoach] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [selectedCoachUid, setSelectedCoachUid] = useState<string>('custom');
  const [coachPhone, setCoachPhone] = useState<string>('');
  const [coachName, setCoachName] = useState<string>('');

  useEffect(() => {
    setErrorMessage(null);
    setConfirmDelete(false);
    if (tournamentToEdit) {
      setName(tournamentToEdit.name || '');
      setStartDate(tournamentToEdit.startDate || '');
      setEndDate(tournamentToEdit.endDate || '');
      setLocation(tournamentToEdit.location || '');
      setNotifyPush(false);
      setNotifyCoach(false);
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setNotifyPush(true);
      setNotifyCoach(false);
    }
  }, [tournamentToEdit, isOpen]);

  // Load coaches for this category
  useEffect(() => {
    if (!isOpen) return;

    async function loadCoaches() {
      try {
        const staffList = await fetchStaffUsers();
        // Filter coaches for active team or all
        const teamCoaches = staffList.filter(
          (u) =>
            u.role === 'coach' &&
            (u.teams?.includes(activeTeamId) ||
              u.teamId === activeTeamId ||
              u.teams?.includes('ALL') ||
              u.teams?.length === 0)
        );

        if (teamCoaches.length > 0) {
          setCoaches(teamCoaches);
          setSelectedCoachUid(teamCoaches[0].uid);
          setCoachPhone(teamCoaches[0].phone || '');
          setCoachName(teamCoaches[0].name || '');
        } else {
          const allCoaches = staffList.filter((u) => u.role === 'coach');
          setCoaches(allCoaches);
          if (allCoaches.length > 0) {
            setSelectedCoachUid(allCoaches[0].uid);
            setCoachPhone(allCoaches[0].phone || '');
            setCoachName(allCoaches[0].name || '');
          }
        }
      } catch (err) {
        console.warn('Impossibile caricare lista staff per notifica WhatsApp:', err);
      }
    }

    loadCoaches();
  }, [isOpen, activeTeamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Inserisci il nome del torneo!');
      return;
    }
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

      // 1. Invio Notifica Push PWA automatica al Mister (anche a schermo bloccato)
      if (notifyPush && !tournamentToEdit) {
        try {
          await createPushNotification({
            title: `🏆 Nuovo Torneo: ${name.trim()}`,
            body: `È stato inserito il torneo per la Cat. ${activeTeamId} (${formatDateIT(startDate)} - ${formatDateIT(endDate)}) presso ${location.trim() || 'Spes Montesacro'}.`,
            type: 'tournament',
            targetTeamId: activeTeamId,
            targetRole: 'coach',
            data: {
              tournamentName: name.trim(),
              teamId: activeTeamId,
              startDate,
              endDate,
              location: location.trim()
            }
          });
        } catch (pushErr) {
          console.warn('Errore invio push PWA:', pushErr);
        }
      }

      // 2. Notifica opzionale via WhatsApp
      if (notifyCoach && !tournamentToEdit) {
        const msg = formatNewTournamentCoachWhatsApp(
          {
            name: name.trim(),
            startDate,
            endDate,
            location: location.trim()
          },
          activeTeamId,
          coachName
        );
        sendWhatsAppToPhoneOrShare(msg, coachPhone, `Nuovo Torneo ${name.trim()}`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Errore salvataggio torneo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tournamentToEdit) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await deleteTournament(tournamentToEdit.id);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage('Errore eliminazione: ' + err.message);
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

          {/* Opzioni Notifiche per il Mister */}
          {!tournamentToEdit && (
            <div className="space-y-2 pt-1">
              {/* Notifica Push PWA (Automatica su smartphone) */}
              <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyPush}
                      onChange={(e) => setNotifyPush(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                      Notifica Push PWA sul telefono del Mister
                    </span>
                  </label>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Automatica
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                  Invia istantaneamente un avviso a comparsa sullo smartphone del mister (anche a schermo bloccato).
                </p>
              </div>

              {/* Notifica WhatsApp (Opzionale con testo preimpostato) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyCoach}
                      onChange={(e) => setNotifyCoach(e.target.checked)}
                      className="w-4 h-4 text-slate-700 rounded border-slate-300 focus:ring-slate-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Apri anche messaggio WhatsApp
                    </span>
                  </label>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    Opzionale
                  </span>
                </div>

                {notifyCoach && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Destinatario Mister
                        </label>
                        <select
                          value={selectedCoachUid}
                          onChange={(e) => {
                            const uid = e.target.value;
                            setSelectedCoachUid(uid);
                            const coach = coaches.find((c) => c.uid === uid);
                            if (coach) {
                              setCoachName(coach.name);
                              setCoachPhone(coach.phone || '');
                            } else {
                              setCoachName('');
                            }
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {coaches.map((c) => (
                            <option key={c.uid} value={c.uid}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </option>
                          ))}
                          <option value="custom">Altro numero / Manuale</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Telefono (WhatsApp)
                        </label>
                        <input
                          type="tel"
                          value={coachPhone}
                          onChange={(e) => setCoachPhone(e.target.value)}
                          placeholder="es. 3401234567"
                          className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center justify-between">
              <span>⚠️ {errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-800 text-xs font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {confirmDelete ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <p className="text-xs text-rose-800 font-bold">
                Confermi l&apos;eliminazione di questo torneo e di tutte le partite associate?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {loading ? 'Eliminazione...' : 'Sì, elimina definitivamente'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Annulla
              </button>

              {tournamentToEdit && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Elimina</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{tournamentToEdit ? 'Salva Modifiche' : 'Crea Torneo'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

