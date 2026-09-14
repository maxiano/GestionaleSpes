import React, { useState, useEffect } from 'react';
import { Player, AttendanceStatus, AttendanceRecord } from '../../types';
import {
  findSessionByDate,
  saveAttendanceSession,
  deleteAttendanceSession
} from '../../services/attendancesService';
import { formatDateIT } from '../../utils/formatters';
import {
  Calendar,
  RotateCcw,
  Check,
  AlertTriangle,
  Sparkles,
  Trash2,
  Loader2
} from 'lucide-react';

interface AttendanceTabProps {
  players: Player[];
  activeTeamId: string;
  onAttendanceSaved: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  players,
  activeTeamId,
  onAttendanceSaved
}) => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  // Initialize statuses when players change or date changes
  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      if (!activeTeamId || players.length === 0) return;
      setLoading(true);

      try {
        const session = await findSessionByDate(activeTeamId, date);
        if (!isMounted) return;

        const newMap: Record<string, AttendanceStatus> = {};

        if (session) {
          setExistingSessionId(session.id);
          const recs = session.records || session.record || session.presenze || [];
          recs.forEach((r) => {
            const pId = r.playerId || r.id;
            if (pId) newMap[pId] = r.status;
          });

          // Ensure any player without record defaults to present
          players.forEach((p) => {
            if (!newMap[p.id]) newMap[p.id] = 'present';
          });

          setMessage({
            text: `⚠️ Presenze per il ${formatDateIT(date)} già presenti a sistema (modifica abilitata).`,
            type: 'warn'
          });
        } else {
          setExistingSessionId(null);
          players.forEach((p) => {
            newMap[p.id] = 'present';
          });
          setMessage({
            text: `✨ Nuova seduta di allenamento per il ${formatDateIT(date)}.`,
            type: 'success'
          });
        }

        setStatuses(newMap);
      } catch (err) {
        console.error('Errore controllo presenze:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [date, activeTeamId, players]);

  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [playerId]: status }));
  };

  const handleResetAllToPresent = () => {
    const newMap: Record<string, AttendanceStatus> = {};
    players.forEach((p) => {
      newMap[p.id] = 'present';
    });
    setStatuses(newMap);
  };

  const handleDeleteSession = async () => {
    if (!existingSessionId) return;
    if (!confirm(`Eliminare definitivamente l'allenamento del ${formatDateIT(date)}?`)) {
      return;
    }

    try {
      await deleteAttendanceSession(existingSessionId);
      alert('Seduta di allenamento eliminata con successo!');
      setExistingSessionId(null);
      handleResetAllToPresent();
      onAttendanceSaved();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || players.length === 0) {
      alert('Nessun giocatore in rosa!');
      return;
    }

    if (existingSessionId) {
      if (!confirm(`Vuoi aggiornare le presenze per il ${formatDateIT(date)}?`)) {
        return;
      }
    }

    setSaving(true);

    try {
      const records: AttendanceRecord[] = players.map((p) => {
        const displayName = p.lastName ? `${p.lastName} ${p.firstName}` : p.name || 'Atleta';
        const st = statuses[p.id] || 'present';
        return {
          id: p.id,
          playerId: p.id,
          name: displayName,
          status: st,
          present: st === 'present',
          absent: st === 'absent'
        };
      });

      const savedId = await saveAttendanceSession(
        activeTeamId,
        date,
        records,
        existingSessionId
      );

      setExistingSessionId(savedId);
      alert('✅ Presenze salvate con successo!');
      onAttendanceSaved();
    } catch (err: any) {
      console.error(err);
      alert('Errore salvataggio presenze: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="tab-attendance" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 print:hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>⚽</span> Registra Allenamento e Presenze
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gruppo: <strong className="text-slate-800">{activeTeamId}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500" />
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Data:
          </label>
          <input
            type="date"
            id="attendance-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Info Banner */}
      {message && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl mb-6 text-xs font-bold border ${
            message.type === 'warn'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>

          {existingSessionId && (
            <button
              type="button"
              id="btn-delete-session"
              onClick={handleDeleteSession}
              className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shrink-0 ml-3"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina Seduta</span>
            </button>
          )}
        </div>
      )}

      {/* Roster Radio Inputs Form */}
      <form id="form-attendance" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Elenco Atleti ({players.length}):
          </p>
          <button
            type="button"
            id="btn-reset-attendance-radios"
            onClick={handleResetAllToPresent}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Tutti a Presenti (P)</span>
          </button>
        </div>

        {players.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-2xl">
            Nessun giocatore disponibile in questo gruppo.
          </p>
        ) : (
          <div
            id="attendance-players-inputs"
            className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-[460px] overflow-y-auto"
          >
            {players.map((player) => {
              const displayName = player.lastName
                ? `${player.lastName} ${player.firstName}`
                : player.name || 'Atleta';
              const curStatus = statuses[player.id] || 'present';

              return (
                <div
                  key={player.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 px-2 gap-2 hover:bg-white rounded-xl transition"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {displayName}
                  </span>

                  {/* Touch-friendly segmented status pills for mobile & desktop */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(player.id, 'present')}
                      className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        curStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                      title="Presente"
                    >
                      <span>P</span>
                      <span className="hidden md:inline font-normal text-[11px]">(Presente)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(player.id, 'absent')}
                      className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        curStatus === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title="Assente"
                    >
                      <span>A</span>
                      <span className="hidden md:inline font-normal text-[11px]">(Assente)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(player.id, 'justified')}
                      className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        curStatus === 'justified'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                      title="Giustificato"
                    >
                      <span>AG</span>
                      <span className="hidden md:inline font-normal text-[11px]">(Giustif.)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(player.id, 'injured')}
                      className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        curStatus === 'injured'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      }`}
                      title="Infortunato"
                    >
                      <span>INF</span>
                      <span className="hidden md:inline font-normal text-[11px]">(Infortunato)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(player.id, 'late')}
                      className={`px-2.5 py-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        curStatus === 'late'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                      title="Ritardo"
                    >
                      <span>R</span>
                      <span className="hidden md:inline font-normal text-[11px]">(Ritardo)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || loading || players.length === 0}
            className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvataggio...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salva Allenamento e Presenze</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
