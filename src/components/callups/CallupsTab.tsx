import React, { useState, useEffect } from 'react';
import { Player, Callup } from '../../types';
import {
  getCallupsByTeam,
  saveCallup,
  archiveAndDeleteCallup
} from '../../services/callupsService';
import { formatDateIT } from '../../utils/formatters';
import {
  formatCallupWhatsAppInvite,
  formatCallupWhatsAppFinal,
  sendToWhatsApp
} from '../../utils/exports';
import {
  Mail,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Share2,
  Printer,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
  UserCheck
} from 'lucide-react';

interface CallupsTabProps {
  players: Player[];
  activeTeamId: string;
}

export const CallupsTab: React.FC<CallupsTabProps> = ({ players, activeTeamId }) => {
  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [editingCallupId, setEditingCallupId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [gatheringTime, setGatheringTime] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [printingCallup, setPrintingCallup] = useState<Callup | null>(null);

  const fetchCallups = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    try {
      const list = await getCallupsByTeam(activeTeamId);
      setCallups(list);
    } catch (err) {
      console.error('Errore caricamento convocazioni:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallups();
    // Default select all players in squad
    setSelectedPlayerIds(players.map((p) => p.id));
  }, [activeTeamId, players]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPlayerIds(players.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPlayerIds([]);
  };

  const handleEdit = (c: Callup) => {
    setEditingCallupId(c.id);
    setOpponent(c.opponent || '');
    setLocation(c.location || '');
    setMatchDate(c.date || '');
    setMatchTime(c.matchTime || '');
    setGatheringTime(c.gatheringTime || '');

    // Extract player IDs
    const invitedIds = (c.players || []).map((p) => {
      if (typeof p === 'string') {
        return p.includes('|') ? p.split('|')[0] : p;
      }
      return p?.id || p?.playerId || '';
    });
    setSelectedPlayerIds(invitedIds.filter(Boolean));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCallupId(null);
    setOpponent('');
    setLocation('');
    setMatchDate('');
    setMatchTime('');
    setGatheringTime('');
    setSelectedPlayerIds(players.map((p) => p.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId) return alert('Seleziona una squadra!');
    if (selectedPlayerIds.length === 0) return alert('Seleziona almeno un giocatore!');

    setSaving(true);
    try {
      const formattedPlayers = selectedPlayerIds.map((id) => {
        const p = players.find((pl) => pl.id === id);
        const name = p ? `${p.lastName || ''} ${p.firstName || ''}`.trim() : 'Giocatore';
        return `${id}|${name}`;
      });

      await saveCallup(
        {
          teamId: activeTeamId,
          opponent: opponent.trim(),
          location: location.trim(),
          date: matchDate,
          matchTime,
          gatheringTime,
          players: formattedPlayers
        },
        editingCallupId
      );

      alert(editingCallupId ? 'Convocazione aggiornata!' : 'Convocazione generata con successo!');
      handleCancelEdit();
      fetchCallups();
    } catch (err: any) {
      console.error(err);
      alert('Errore salvataggio convocazione: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (callupId: string) => {
    if (!confirm('Vuoi archiviare questa partita nello storico ed eliminarla dalle convocazioni attive?')) {
      return;
    }
    try {
      await archiveAndDeleteCallup(callupId);
      alert('Partita archiviata con successo!');
      fetchCallups();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    }
  };

  const handlePrint = (callup: Callup) => {
    setPrintingCallup(callup);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div id="tab-callup" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
      {/* Form Section */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            <span>{editingCallupId ? 'Modifica Convocazione' : 'Nuova Convocazione Gara'}</span>
          </h3>
          {editingCallupId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-slate-100 rounded-lg"
            >
              Annulla Modifica
            </button>
          )}
        </div>

        <form id="form-callup" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Squadra Avversaria *
              </label>
              <input
                type="text"
                id="match-opponent"
                required
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="es. Romulea"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Campo / Luogo *
              </label>
              <input
                type="text"
                id="match-location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="es. Campo Roma / Via Farsalo, 21"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                📅 Giorno Partita *
              </label>
              <input
                type="date"
                id="match-date"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                🕒 Ora Inizio Partita *
              </label>
              <input
                type="time"
                id="match-time"
                required
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                ⏰ Ora Ritrovo Campo *
              </label>
              <input
                type="time"
                id="gathering-time"
                required
                value={gatheringTime}
                onChange={(e) => setGatheringTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Seleziona Convocati ({selectedPlayerIds.length} selezionati):
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Tutti
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Nessuno
                </button>
              </div>
            </div>

            <div
              id="players-list-callup"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto border border-slate-200 p-3 rounded-2xl bg-slate-50/50"
            >
              {players.map((p) => {
                const displayName = p.lastName ? `${p.lastName} ${p.firstName}` : p.name || 'Atleta';
                const isChecked = selectedPlayerIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center space-x-2 text-xs p-2 rounded-xl border cursor-pointer transition ${
                      isChecked ? 'bg-white border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePlayer(p.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800 truncate">{displayName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingCallupId ? 'Aggiorna Convocazione' : 'Genera Convocazione'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Callups List */}
      <div className="border-t border-slate-100 pt-6 print:hidden">
        <h4 className="text-md font-black text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Convocazioni Inserite ({callups.length})</span>
        </h4>

        {callups.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-2xl">
            Nessuna convocazione attiva per questa squadra.
          </p>
        ) : (
          <div id="callups-list-container" className="space-y-4">
            {callups.map((c) => {
              const responses = c.responses || {};
              const invited = (c.players || []).map((p) => {
                if (typeof p === 'string' && p.includes('|')) {
                  const parts = p.split('|');
                  return { id: parts[0], name: parts[1] };
                }
                if (typeof p === 'string') return { id: p, name: p };
                return { id: (p as any).id || (p as any).playerId, name: (p as any).name || 'Atleta' };
              });

              invited.sort((a, b) => a.name.localeCompare(b.name));

              return (
                <div
                  key={c.id}
                  className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 flex flex-col gap-4 text-xs shadow-sm hover:shadow transition"
                >
                  <div className="space-y-1">
                    <p className="font-black text-base text-slate-900">
                      ⚽ Spes Montesacro vs {c.opponent}
                    </p>
                    <p className="text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateIT(c.date)}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Inizio: {c.matchTime}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
                        Ritrovo: {c.gatheringTime}
                      </span>
                    </p>
                    <p className="text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.location}</span>
                    </p>
                  </div>

                  {/* Player responses */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200">
                    <p className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>Stato Risposte ({invited.length} convocati):</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {invited.map((player, idx) => {
                        const status = responses[player.id || ''] || 'pending';
                        let badge = (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold inline-flex items-center gap-1">
                            <Clock3 className="w-2.5 h-2.5" /> In attesa
                          </span>
                        );
                        if (status === 'confirmed' || status === 'present') {
                          badge = (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Confermato
                            </span>
                          );
                        } else if (status === 'absent') {
                          badge = (
                            <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-bold inline-flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Assente
                            </span>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 bg-slate-50 rounded-xl text-xs"
                          >
                            <span className="truncate pr-1 text-slate-800 font-medium">
                              {idx + 1}. {player.name}
                            </span>
                            <div className="shrink-0">{badge}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-200/80">
                    <button
                      onClick={() => {
                        const msg = formatCallupWhatsAppInvite(c);
                        sendToWhatsApp(msg, `Invito vs ${c.opponent}`);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>📲 Invito WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        const msg = formatCallupWhatsAppFinal(c);
                        sendToWhatsApp(msg, `Convocazione vs ${c.opponent}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>📢 Definitiva WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleEdit(c)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>✏️ Modifica</span>
                    </button>

                    <button
                      onClick={() => handlePrint(c)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>🖨️ Stampa</span>
                    </button>

                    <button
                      onClick={() => handleDelete(c.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>🗑️ Archivia/Elimina</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Sheet */}
      {printingCallup && (
        <div id="callup-print-container" className="hidden print:block">
          <div className="bg-slate-100 border border-black p-3 mb-4 rounded space-y-1 text-sm">
            <p className="text-base font-extrabold text-black">
              ⚽ PARTITA: Spes Montesacro vs {printingCallup.opponent}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
              <p>📅 <strong>Giorno:</strong> {formatDateIT(printingCallup.date)}</p>
              <p>📍 <strong>Luogo:</strong> {printingCallup.location}</p>
              <p>🕒 <strong>Inizio:</strong> {printingCallup.matchTime}</p>
              <p>⏰ <strong>Ritrovo Campo:</strong> {printingCallup.gatheringTime}</p>
            </div>
          </div>

          <h3 className="text-sm font-bold mb-2 uppercase tracking-wide border-b border-black pb-1">
            Giocatori Convocati ({printingCallup.players.length})
          </h3>

          <table className="w-full border-collapse border border-black text-left text-xs">
            <thead>
              <tr className="bg-slate-200 text-black uppercase">
                <th className="border border-black p-1.5 text-center w-10">#</th>
                <th className="border border-black p-1.5">Cognome e Nome</th>
                <th className="border border-black p-1.5 w-1/3">Note / Firma</th>
              </tr>
            </thead>
            <tbody>
              {printingCallup.players.map((p, idx) => {
                const cleanName =
                  typeof p === 'string' && p.includes('|') ? p.split('|')[1] : String(p);
                return (
                  <tr key={idx}>
                    <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-bold">{cleanName}</td>
                    <td className="border border-black p-1.5"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
