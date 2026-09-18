import React, { useState, useEffect } from 'react';
import { Player, Callup, Tournament, UserProfile } from '../../types';
import {
  getCallupsByTeam,
  saveCallup,
  archiveAndDeleteCallup
} from '../../services/callupsService';
import { getTournaments } from '../../services/tournamentsService';
import { formatDateIT } from '../../utils/formatters';
import {
  formatCallupWhatsAppInvite,
  formatCallupWhatsAppFinal,
  sendToWhatsApp
} from '../../utils/exports';
import { CallupGraphicModal } from './CallupGraphicModal';
import { ClubLogo } from '../common/ClubLogo';
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
  User,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface CallupsTabProps {
  players: Player[];
  activeTeamId: string;
  userProfile?: UserProfile | null;
}

export const CallupsTab: React.FC<CallupsTabProps> = ({
  players,
  activeTeamId,
  userProfile
}) => {
  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tournaments for active team
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // Form states
  const [editingCallupId, setEditingCallupId] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<'Campionato' | 'Amichevole' | 'Torneo'>('Campionato');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournamentName, setTournamentName] = useState<string>('');
  const [coachName, setCoachName] = useState<string>('');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [gatheringTime, setGatheringTime] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Print & Graphic modal states
  const [printingCallup, setPrintingCallup] = useState<Callup | null>(null);
  const [graphicModalCallup, setGraphicModalCallup] = useState<Callup | null>(null);

  // 1. Fetch Callups
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

  // 2. Fetch Tournaments for this group
  const fetchTournaments = async () => {
    if (!activeTeamId) return;
    setLoadingTournaments(true);
    try {
      const list = await getTournaments(activeTeamId);
      setTournaments(list);
    } catch (err) {
      console.error('Errore caricamento tornei del gruppo:', err);
    } finally {
      setLoadingTournaments(false);
    }
  };

  useEffect(() => {
    fetchCallups();
    fetchTournaments();
    // Default select all players in squad
    setSelectedPlayerIds(players.map((p) => p.id));
    // Default coach name from user profile
    if (userProfile?.name && !coachName) {
      setCoachName(userProfile.name);
    }
  }, [activeTeamId, players]);

  useEffect(() => {
    if (userProfile?.name && !coachName) {
      setCoachName(userProfile.name);
    }
  }, [userProfile]);

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

  const handleTournamentSelect = (tId: string) => {
    setSelectedTournamentId(tId);
    if (tId === 'custom') {
      setTournamentName('');
      return;
    }
    const found = tournaments.find((t) => t.id === tId);
    if (found) {
      setTournamentName(found.name);
      if (found.location && !location) {
        setLocation(found.location);
      }
    } else {
      setTournamentName('');
    }
  };

  const handleEdit = (c: Callup) => {
    setEditingCallupId(c.id);
    const mType = (c.matchType as any) || 'Campionato';
    setMatchType(mType);
    setSelectedTournamentId(c.tournamentId || '');
    setTournamentName(c.tournamentName || '');
    setCoachName(c.coachName || userProfile?.name || '');
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
    setMatchType('Campionato');
    setSelectedTournamentId('');
    setTournamentName('');
    setCoachName(userProfile?.name || '');
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
    if (selectedPlayerIds.length === 0) return alert('Seleziona almeno un giocatore da convocare!');

    if (matchType === 'Torneo' && !tournamentName.trim()) {
      return alert('Seleziona o specifica il nome del torneo!');
    }

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
          matchType,
          tournamentId: matchType === 'Torneo' ? selectedTournamentId : '',
          tournamentName: matchType === 'Torneo' ? tournamentName.trim() : '',
          coachName: coachName.trim() || userProfile?.name || 'Mister',
          opponent: opponent.trim(),
          location: location.trim(),
          date: matchDate,
          matchTime,
          gatheringTime,
          players: formattedPlayers
        },
        editingCallupId
      );

      alert(editingCallupId ? 'Convocazione aggiornata con successo!' : 'Convocazione generata con successo!');
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
    }, 250);
  };

  const renderMatchTypeBadge = (c: Callup) => {
    if (c.matchType === 'Torneo') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
          <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
          <span>TORNEO: {c.tournamentName || 'Ufficiale'}</span>
        </span>
      );
    }
    if (c.matchType === 'Amichevole') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-900 border border-sky-300">
          <span>⚽ GARA AMICHEVOLE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
        <span>🏆 CAMPIONATO</span>
      </span>
    );
  };

  return (
    <div id="tab-callup" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
      {/* Form Section */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
              <Mail className="w-5 h-5" />
            </div>
            <span>{editingCallupId ? 'Modifica Convocazione Gara' : 'Nuova Convocazione Gara'}</span>
          </h3>
          {editingCallupId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 bg-slate-100 rounded-xl transition cursor-pointer hover:bg-slate-200"
            >
              Annulla Modifica
            </button>
          )}
        </div>

        <form id="form-callup" onSubmit={handleSubmit} className="space-y-5">
          {/* 1. CAMPO INIZIALE: Tipo Gara & Se Torneo elenco a discesa */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Tipo Gara *
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Seleziona la tipologia di incontro
              </span>
            </div>

            {/* Segmented Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMatchType('Campionato')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  matchType === 'Campionato'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Gara di Campionato</span>
              </button>

              <button
                type="button"
                onClick={() => setMatchType('Amichevole')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  matchType === 'Amichevole'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>⚽ Gara Amichevole</span>
              </button>

              <button
                type="button"
                onClick={() => setMatchType('Torneo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  matchType === 'Torneo'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Torneo</span>
              </button>
            </div>

            {/* If Torneo: Elenco a discesa dei tornei definiti nel gruppo del mister */}
            {matchType === 'Torneo' && (
              <div className="mt-3 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2.5 animate-fade-in">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                  🏆 Seleziona Torneo del Gruppo *
                </label>

                {tournaments.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedTournamentId}
                      onChange={(e) => handleTournamentSelect(e.target.value)}
                      className="w-full bg-white border border-amber-300 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      <option value="">-- Scegli tra i tornei registrati per questo gruppo --</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.startDate ? `(dal ${formatDateIT(t.startDate)})` : ''} {t.location ? `- ${t.location}` : ''}
                        </option>
                      ))}
                      <option value="custom">➕ Altro / Inserisci nome manualmente...</option>
                    </select>

                    {(selectedTournamentId === 'custom' || !selectedTournamentId) && (
                      <input
                        type="text"
                        value={tournamentName}
                        onChange={(e) => setTournamentName(e.target.value)}
                        placeholder="Digita il nome del torneo (es. Torneo Beppe Viola)..."
                        className="w-full bg-white border border-amber-300 p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-800 font-medium">
                      Nessun torneo ancora registrato per questo gruppo. Puoi inserire il nome del torneo direttamente qui sotto (oppure configurarlo nella scheda Tornei):
                    </p>
                    <input
                      type="text"
                      required
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      placeholder="Nome del torneo (es. Memorial Mario Montesacro)..."
                      className="w-full bg-white border border-amber-300 p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Dettagli Mister, Avversario e Campo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Mister / Responsabile *</span>
              </label>
              <input
                type="text"
                id="match-coach"
                required
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                placeholder="es. Mister Nanni"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

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

          {/* 3. Date e Orari */}
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

          {/* 4. Selezione Convocati */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Seleziona Convocati ({selectedPlayerIds.length} selezionati):
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Tutti
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
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
                      isChecked ? 'bg-white border-emerald-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
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

          {/* 5. Box Regole e Disposizioni Obbligatorie (Informativa per il mister) */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-amber-900 text-[11px]">
                Note di condotta incluse automaticamente nella stampa e nella grafica WhatsApp:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 font-medium text-[11px]">
                <li><strong>Venire al campo in tuta di rappresentanza e parastinchi obbligatori.</strong></li>
                <li><strong>Non venire al campo con gli scarpini già indossati.</strong></li>
                <li><strong>Avvisare sempre prima di eventuali assenze o ritardi.</strong></li>
              </ul>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                  className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 flex flex-col gap-4 text-xs shadow-xs hover:shadow-sm transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-base text-slate-900">
                        ⚽ Spes Montesacro vs {c.opponent}
                      </p>
                      {renderMatchTypeBadge(c)}
                    </div>

                    <p className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      {c.coachName && (
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          Mister: {c.coachName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateIT(c.date)}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Inizio: {c.matchTime}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
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
                    {/* Pulsante Grafica WhatsApp (Richiesto dall'utente) */}
                    <button
                      type="button"
                      onClick={() => setGraphicModalCallup(c)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Apri, visualizza e invia la locandina grafica su WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>🎨 Grafica WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const msg = formatCallupWhatsAppFinal(c);
                        sendToWhatsApp(msg, `Convocazione vs ${c.opponent}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Invia convocazione definitiva in testo su WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>📢 Definitiva Testo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const msg = formatCallupWhatsAppInvite(c);
                        sendToWhatsApp(msg, `Invito vs ${c.opponent}`);
                      }}
                      className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Invia invito preliminare su WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>📲 Invito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Modifica dati convocazione"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>✏️ Modifica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrint(c)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Stampa foglio convocazione"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>🖨️ Stampa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Archivia partita nello storico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>🗑️ Archivia</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Grafica WhatsApp */}
      <CallupGraphicModal
        isOpen={!!graphicModalCallup}
        onClose={() => setGraphicModalCallup(null)}
        callup={graphicModalCallup}
        activeTeamId={activeTeamId}
        onPrint={graphicModalCallup ? () => handlePrint(graphicModalCallup) : undefined}
      />

      {/* Printable Sheet (Grafica per la Stampa con Nome Mister e Regole Tassative) */}
      {printingCallup && (
        <div id="callup-print-container" className="hidden print:block font-sans text-black">
          {/* Header Societario */}
          <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <ClubLogo className="w-12 h-12 shrink-0" color="#000000" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black leading-none">
                  SPES MONTESACRO
                </h1>
                <p className="text-xs font-bold uppercase text-slate-700 tracking-wider mt-1">
                  Foglio Ufficiale di Convocazione Gara • Gruppo: {activeTeamId}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider">
                {printingCallup.matchType === 'Torneo'
                  ? `TORNEO: ${printingCallup.tournamentName || 'Ufficiale'}`
                  : printingCallup.matchType === 'Amichevole'
                  ? 'GARA AMICHEVOLE'
                  : 'GARA DI CAMPIONATO'}
              </span>
            </div>
          </div>

          {/* Scheda Partita e Dettagli Tecnico */}
          <div className="border-2 border-black p-3 mb-4 rounded-lg bg-slate-50 space-y-2 text-xs">
            <p className="text-base font-black text-black uppercase border-b border-black/30 pb-1">
              ⚽ Spes Montesacro vs {printingCallup.opponent}
            </p>
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <p>📅 <strong>Giorno Gara:</strong> {formatDateIT(printingCallup.date)}</p>
              <p>🕒 <strong>Inizio Gara:</strong> {printingCallup.matchTime || '-'}</p>
              <p>⏰ <strong>Ritrovo al Campo:</strong> {printingCallup.gatheringTime || '-'}</p>
              <p>📍 <strong>Campo / Luogo:</strong> {printingCallup.location || '-'}</p>
            </div>
            <div className="pt-1 border-t border-black/20 flex items-center justify-between">
              <p className="text-xs font-bold">
                👔 <strong>Mister / Responsabile Tecnico:</strong>{' '}
                <span className="text-sm font-black underline">
                  {printingCallup.coachName || coachName || userProfile?.name || 'Mister'}
                </span>
              </p>
              <p className="text-[11px] italic">Documento generato il {new Date().toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          {/* Elenco Convocati */}
          <h3 className="text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>👥 Giocatori Convocati ({printingCallup.players.length})</span>
            <span className="text-[10px] font-normal text-slate-600 italic">Si raccomanda la massima puntualità</span>
          </h3>

          <table className="w-full border-collapse border border-black text-left text-xs mb-4">
            <thead>
              <tr className="bg-slate-200 text-black uppercase text-[11px]">
                <th className="border border-black p-1.5 text-center w-10 font-bold">#</th>
                <th className="border border-black p-1.5 font-bold">Cognome e Nome</th>
                <th className="border border-black p-1.5 w-1/4 font-bold">Firma per Presenza</th>
                <th className="border border-black p-1.5 w-1/4 font-bold">Note Tecniche</th>
              </tr>
            </thead>
            <tbody>
              {printingCallup.players.map((p, idx) => {
                const cleanName =
                  typeof p === 'string' && p.includes('|') ? p.split('|')[1] : String(p);
                return (
                  <tr key={idx} className="border-b border-black">
                    <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-bold text-xs">{cleanName}</td>
                    <td className="border border-black p-1.5"></td>
                    <td className="border border-black p-1.5"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Avvisi e Disposizioni Obbligatorie per la Gara (Richiesto espressamente dall'utente) */}
          <div className="border-2 border-black p-3.5 rounded-lg bg-slate-100 text-xs space-y-1.5 mb-5">
            <p className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
              <span>⚠️</span>
              <span>AVVISI E DISPOSIZIONI OBBLIGATORIE PER LA GARA:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-900 font-semibold text-[11px]">
              <li>Venire al campo in tuta di rappresentanza e parastinchi obbligatori.</li>
              <li>Non venire al campo con gli scarpini già indossati.</li>
              <li>Avvisare sempre prima di eventuali assenze o ritardi.</li>
            </ul>
          </div>

          {/* Firme */}
          <div className="grid grid-cols-2 gap-8 pt-4 text-xs font-bold">
            <div>
              <p className="border-t border-black pt-1">Firma Dirigente Accompagnatore</p>
            </div>
            <div className="text-right">
              <p className="border-t border-black pt-1">Firma Mister ({printingCallup.coachName || coachName || 'Tecnico'})</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
