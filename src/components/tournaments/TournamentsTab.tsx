import React, { useState, useEffect, useRef } from 'react';
import { Tournament, TournamentMatch } from '../../types';
import {
  getTournaments,
  getTournamentMatches,
  deleteTournament,
  deleteTournamentMatch,
  updateMatchResult
} from '../../services/tournamentsService';
import { TournamentModal } from './TournamentModal';
import { MatchModal } from './MatchModal';
import { formatDateIT } from '../../utils/formatters';
import {
  downloadCSV,
  parseCSVFile,
  sendToWhatsApp,
  formatNewTournamentCoachWhatsApp,
  sendWhatsAppToPhoneOrShare
} from '../../utils/exports';
import { fetchStaffUsers } from '../../services/authService';
import {
  Trophy,
  Plus,
  Filter,
  FileDown,
  FileUp,
  Share2,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock3,
  MessageCircle,
  BellRing
} from 'lucide-react';
import { createPushNotification } from '../../services/notificationService';

interface TournamentsTabProps {
  activeTeamId: string;
}

export const TournamentsTab: React.FC<TournamentsTabProps> = ({ activeTeamId }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [selectedTourFilter, setSelectedTourFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [activeTourForMatch, setActiveTourForMatch] = useState<Tournament | null>(null);
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const csvFileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    try {
      const [tList, mList] = await Promise.all([
        getTournaments(activeTeamId),
        getTournamentMatches(activeTeamId)
      ]);
      setTournaments(tList);
      setMatches(mList);
    } catch (err) {
      console.error('Errore caricamento tornei:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTeamId]);

  const handleOpenAddTournament = () => {
    setEditingTournament(null);
    setTourModalOpen(true);
  };

  const handleEditTournament = (t: Tournament) => {
    setEditingTournament(t);
    setTourModalOpen(true);
  };

  const handleDeleteTournament = async (t: Tournament) => {
    if (!confirm(`Sei sicuro di voler eliminare "${t.name}" e tutte le partite collegate?`)) return;
    try {
      await deleteTournament(t.id);
      fetchData();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleOpenAddMatch = (t: Tournament) => {
    setActiveTourForMatch(t);
    setEditingMatch(null);
    setMatchModalOpen(true);
  };

  const handleEditMatch = (m: TournamentMatch) => {
    const parentTour = tournaments.find((t) => t.id === m.tournamentId);
    if (!parentTour) return;
    setActiveTourForMatch(parentTour);
    setEditingMatch(m);
    setMatchModalOpen(true);
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa partita?')) return;
    try {
      await deleteTournamentMatch(matchId);
      fetchData();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleSetResult = async (m: TournamentMatch) => {
    const res = prompt('Inserisci il risultato finale (es. 3 - 1):', m.result || '');
    if (res !== null) {
      try {
        await updateMatchResult(m.id, res.trim());
        fetchData();
      } catch (err: any) {
        alert('Errore salvataggio risultato: ' + err.message);
      }
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (matches.length === 0) return alert('Nessuna partita da esportare!');
    let csv = 'Torneo;Incontro;Data;Orario;Luogo;Risultato\n';
    matches.forEach((m) => {
      const tour = tournaments.find((t) => t.id === m.tournamentId);
      const tourName = tour ? tour.name : 'Torneo';
      csv += `"${tourName}";"${m.match || ''}";"${m.date || ''}";"${m.time || ''}";"${m.location || ''}";"${m.result || ''}"\n`;
    });
    downloadCSV(`Tornei_${activeTeamId}.csv`, csv);
  };

  // CSV Import
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseCSVFile<any>(file);
      if (!rows || rows.length === 0) {
        alert('File CSV vuoto.');
        return;
      }

      alert(`Importazione completata con ${rows.length} righe.`);
      fetchData();
    } catch (err: any) {
      alert('Errore import CSV: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  // WhatsApp summary
  const handleShareWhatsApp = () => {
    if (tournaments.length === 0) return;
    let text = `🏆 *CALENDARIO TORNEI - SPES MONTESACRO*\n👥 *Squadra:* ${activeTeamId}\n\n`;

    tournaments.forEach((tour) => {
      text += `🏆 *${tour.name}*\n📍 ${tour.location || 'Campo Spes'} | 📅 ${formatDateIT(tour.startDate)} - ${formatDateIT(tour.endDate)}\n`;
      const tMatches = matches.filter((m) => m.tournamentId === tour.id);
      if (tMatches.length === 0) {
        text += '  (Nessuna gara registrata)\n';
      } else {
        tMatches.forEach((m) => {
          text += `  ⚽ ${m.match} | 📅 ${formatDateIT(m.date)} ore ${m.time || '--:--'} ${
            m.played ? `[Finale: ${m.result}]` : '[Da giocare]'
          }\n`;
        });
      }
      text += '\n';
    });

    sendToWhatsApp(text, `Tornei ${activeTeamId}`);
  };

  // Notifica specifica del singolo torneo al Mister via WhatsApp
  const handleNotifyCoach = async (tour: Tournament) => {
    try {
      const staff = await fetchStaffUsers();
      // Trova il mister della categoria attiva
      const coach = staff.find(
        (u) =>
          u.role === 'coach' &&
          (u.teams?.includes(activeTeamId) ||
            u.teamId === activeTeamId ||
            u.teams?.includes('ALL'))
      );

      const msg = formatNewTournamentCoachWhatsApp(
        {
          name: tour.name,
          startDate: tour.startDate,
          endDate: tour.endDate,
          location: tour.location
        },
        activeTeamId,
        coach?.name
      );

      sendWhatsAppToPhoneOrShare(msg, coach?.phone, `Torneo ${tour.name}`);
    } catch (err: any) {
      alert('Errore invio notifica: ' + err.message);
    }
  };

  const handlePushNotifyTournament = async (tour: Tournament) => {
    try {
      await createPushNotification({
        title: `🏆 Promemoria Torneo: ${tour.name}`,
        body: `Aggiornamento Cat. ${activeTeamId}: dal ${formatDateIT(tour.startDate)} al ${formatDateIT(tour.endDate)} presso ${tour.location || 'Spes Montesacro'}.`,
        type: 'tournament',
        targetTeamId: activeTeamId,
        targetRole: 'all',
        data: {
          tournamentId: tour.id,
          teamId: activeTeamId
        }
      });
      showToast('🔔 Notifica Push PWA inviata con successo agli smartphone di Mister e Admin!');
    } catch (err: any) {
      showToast('⚠️ Errore invio notifica push: ' + err.message);
    }
  };

  // Filter tournaments & matches
  const filteredTournaments = tournaments.filter((t) => {
    if (selectedTourFilter && t.id !== selectedTourFilter) return false;
    return true;
  });

  return (
    <div id="tab-tournaments" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
      {/* Toast message banner */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5 print:hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg shadow-sm shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Tornei e Gare
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-900 text-emerald-400 rounded-lg">
                {activeTeamId || 'Seleziona Gruppo'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gestione tornei ufficiali, incontri a calendario e inserimento risultati
            </p>
          </div>
        </div>

        {/* Action buttons and filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            <select
              value={selectedTourFilter}
              onChange={(e) => setSelectedTourFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold shadow-sm focus:outline-none cursor-pointer"
            >
              <option value="">Tutti i tornei ({tournaments.length})</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold shadow-sm focus:outline-none cursor-pointer"
            >
              <option value="">Tutti gli stati</option>
              <option value="da_giocare">Da giocare</option>
              <option value="giocata">Giocate</option>
            </select>
          </div>

          {/* CSV Import/Export */}
          <input
            type="file"
            ref={csvFileRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => csvFileRef.current?.click()}
              className="hover:bg-white text-slate-700 text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm flex items-center gap-1"
              title="Importa partite da CSV"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Import</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200"></div>
            <button
              onClick={handleExportCSV}
              className="hover:bg-white text-slate-700 text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm flex items-center gap-1"
              title="Esporta calendario in CSV"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddTournament}
            className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Torneo</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Tournaments List */}
      <div id="tournament-grid" className="space-y-6">
        {filteredTournaments.length === 0 ? (
          <div className="bg-slate-50 p-10 border border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">
              Nessun torneo registrato per questa squadra.
            </p>
            <button
              onClick={handleOpenAddTournament}
              className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Crea il primo Torneo</span>
            </button>
          </div>
        ) : (
          filteredTournaments.map((tour) => {
            let tourMatches = matches.filter((m) => m.tournamentId === tour.id);

            if (selectedStatusFilter === 'da_giocare') {
              tourMatches = tourMatches.filter((m) => !m.played);
            } else if (selectedStatusFilter === 'giocata') {
              tourMatches = tourMatches.filter((m) => m.played);
            }

            return (
              <div
                key={tour.id}
                className="bg-slate-50/70 p-5 sm:p-6 border border-slate-200/90 rounded-3xl flex flex-col gap-4 shadow-sm"
              >
                {/* Tournament card top */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      🏆 TORNEO UFFICIALE
                    </span>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">{tour.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {tour.location || 'Località Spes'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Dal {formatDateIT(tour.startDate)} al {formatDateIT(tour.endDate)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => handlePushNotifyTournament(tour)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition shadow-sm flex items-center gap-1.5"
                      title="Invia Notifica Push PWA allo smartphone del Mister"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Push PWA</span>
                    </button>
                    <button
                      onClick={() => handleNotifyCoach(tour)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs px-3 py-1.5 rounded-xl font-bold border border-emerald-200 transition shadow-sm flex items-center gap-1.5"
                      title="Notifica o ricondividi il torneo con il Mister su WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleEditTournament(tour)}
                      className="bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-200 transition shadow-sm flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      <span>Modifica</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTournament(tour)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-bold transition shadow-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Elimina</span>
                    </button>
                    <button
                      onClick={() => handleOpenAddMatch(tour)}
                      className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aggiungi Partita</span>
                    </button>
                  </div>
                </div>

                {/* Matches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tourMatches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2 col-span-full">
                      Nessuna partita registrata. Clicca su "Aggiungi Partita" per iniziare il calendario.
                    </p>
                  ) : (
                    tourMatches.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col gap-2 shadow-sm hover:shadow transition"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            ⚽ {m.match}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
                              m.played
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : 'text-amber-700 bg-amber-50 border border-amber-200'
                            }`}
                          >
                            {m.played ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>GIOCATA</span>
                              </>
                            ) : (
                              <>
                                <Clock3 className="w-3 h-3" />
                                <span>DA GIOCARE</span>
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 flex flex-wrap gap-2">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {m.date ? formatDateIT(m.date) : 'Data da definire'}
                          </span>
                          {m.time && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {m.time}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {m.location || tour.location || 'Campo Spes'}
                          </span>
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          {m.played ? (
                            <div className="text-center text-xs font-black text-emerald-800 bg-emerald-50 py-1.5 rounded-xl border border-emerald-200">
                              Risultato Finale: {m.result}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSetResult(m)}
                              className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 rounded-xl transition"
                            >
                              Inserisci Risultato
                            </button>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditMatch(m)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-1.5 rounded-xl transition"
                            >
                              ✏️ Modifica
                            </button>
                            <button
                              onClick={() => handleDeleteMatch(m.id)}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] py-1.5 rounded-xl transition"
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <TournamentModal
        isOpen={tourModalOpen}
        onClose={() => setTourModalOpen(false)}
        tournamentToEdit={editingTournament}
        activeTeamId={activeTeamId}
        onSaved={fetchData}
      />

      <MatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        tournament={activeTourForMatch}
        matchToEdit={editingMatch}
        activeTeamId={activeTeamId}
        onSaved={fetchData}
      />
    </div>
  );
};
