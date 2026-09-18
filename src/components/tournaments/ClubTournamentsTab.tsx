import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, TournamentMatch, UserProfile } from '../../types';
import { getTournaments, getTournamentMatches } from '../../services/tournamentsService';
import { fetchStaffUsers } from '../../services/authService';
import { TEAM_GROUPS } from '../../config/constants';
import { formatDateIT } from '../../utils/formatters';
import { exportClubTournamentsToExcel, ClubTournamentExportItem } from '../../utils/exports';
import {
  Trophy,
  Filter,
  FileSpreadsheet,
  Printer,
  RotateCw,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  FileText,
  AlertCircle
} from 'lucide-react';
import { PdfViewerModal } from '../common/PdfViewerModal';
import { openOrDownloadPdf } from '../../utils/pdfHelpers';

type StatusFilter = 'all' | 'in_corso' | 'passati';

export const ClubTournamentsTab: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTourIds, setExpandedTourIds] = useState<Record<string, boolean>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // PDF Preview modal
  const [previewPdfModal, setPreviewPdfModal] = useState<{
    isOpen: boolean;
    title: string;
    fileName: string;
    dataUrl: string;
  }>({
    isOpen: false,
    title: '',
    fileName: '',
    dataUrl: ''
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tList, mList, staffList] = await Promise.all([
        getTournaments(),
        getTournamentMatches(),
        fetchStaffUsers()
      ]);
      setTournaments(tList);
      setMatches(mList);
      setStaffUsers(staffList);

      // Expand all tournaments by default
      const initialExpanded: Record<string, boolean> = {};
      tList.forEach((t) => {
        initialExpanded[t.id] = true;
      });
      setExpandedTourIds(initialExpanded);
    } catch (err) {
      console.error('Errore caricamento dati tornei club:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Mappatura specifica per singoli gruppi del club Spes Montesacro
  // (priorità autorevole e garanzia di correttezza per i singoli gruppi)
  const KNOWN_GROUP_COACH_MAP: Record<string, string> = {
    '2014nero': 'Mister Andrea Porzio',
    '2014-grupponero': 'Mister Andrea Porzio',
    '2014grupponero': 'Mister Andrea Porzio'
  };

  const normalizeTeamKey = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace('gruppo', '');
  };

  const formatCoachDisplayName = (name: string): string => {
    const clean = name.trim();
    if (!clean) return 'Staff Tecnico';
    if (clean.toLowerCase().includes('porzio')) {
      return 'Mister Andrea Porzio';
    }
    if (clean.toLowerCase().startsWith('mister ')) {
      return clean;
    }
    return `Mister ${clean}`;
  };

  // Helper: trova SOLO il mister responsabile dello specifico gruppo della categoria
  // (es. Categoria "2014 - Gruppo Nero" -> SOLO Mister Andrea Porzio)
  const getCoachNameForTeam = (teamId: string): string => {
    if (!teamId || !teamId.trim()) return 'Staff Tecnico';

    const normalizedTeam = normalizeTeamKey(teamId);

    // 1. Controllo mappatura specifica del club per il gruppo (es. 2014 Gruppo Nero)
    if (KNOWN_GROUP_COACH_MAP[normalizedTeam]) {
      const staffMatch = staffUsers.find((u) => {
        const uName = u.name.toLowerCase();
        return (
          uName.includes('porzio') ||
          uName.includes('andrea porzio') ||
          uName.includes('porzio andrea')
        );
      });
      if (staffMatch) {
        return formatCoachDisplayName(staffMatch.name);
      }
      return KNOWN_GROUP_COACH_MAP[normalizedTeam];
    }

    // Estrazione anno (es. 2014) e colore del gruppo (es. nero, verde, giallo, blu, rosso...)
    const colorKeywords = ['nero', 'verde', 'giallo', 'blu', 'rosso', 'arancio', 'bianco'];
    const teamLower = teamId.toLowerCase();
    const matchedColor = colorKeywords.find((c) => teamLower.includes(c));
    const yearMatch = teamId.match(/20\d{2}/);
    const matchedYear = yearMatch ? yearMatch[0] : null;

    // 2. Cerca nello staff utenti con ruolo 'coach' o admin con squadra assegnata
    const candidateCoaches = staffUsers.filter((user) => {
      if (user.role !== 'coach' && user.role !== 'admin') return false;

      const userTeams = [...(user.teams || []), ...(user.teamId ? [user.teamId] : [])];
      if (userTeams.length === 0) return false;

      return userTeams.some((ut) => {
        const utNorm = normalizeTeamKey(ut);

        // Corrispondenza esatta di chiave normalizzata (es. 2014nero === 2014nero)
        if (utNorm === normalizedTeam) return true;

        // Se la categoria specifica un colore di gruppo (es. Nero):
        if (matchedColor && matchedYear) {
          const utLower = ut.toLowerCase();
          const utYear = ut.match(/20\d{2}/);
          const utColor = colorKeywords.find((c) => utLower.includes(c));

          // Deve corrispondere SIA l'anno SIA il colore esatto del gruppo!
          // Esclude categoricamente colori differenti (se cerco Nero, scarta Verde o Giallo)
          return utYear && utYear[0] === matchedYear && utColor === matchedColor;
        }

        // Se la categoria non specifica un colore, accetta match per anno
        if (matchedYear && !matchedColor) {
          return utNorm.includes(matchedYear);
        }

        return false;
      });
    });

    if (candidateCoaches.length > 0) {
      return candidateCoaches.map((c) => formatCoachDisplayName(c.name)).join(', ');
    }

    // 3. Fallback per gruppi 2014 Nero
    if (normalizedTeam.includes('2014') && normalizedTeam.includes('nero')) {
      return 'Mister Andrea Porzio';
    }

    return 'Staff Tecnico';
  };

  // Helper: calcola lo stato del torneo
  const getTournamentStatus = (
    tour: Tournament,
    tourMatches: TournamentMatch[]
  ): { status: 'in_corso' | 'passato'; label: string } => {
    const today = new Date().toISOString().slice(0, 10);

    // Se c'è una data di fine passata
    if (tour.endDate && tour.endDate < today) {
      return { status: 'passato', label: 'Passato' };
    }

    // Se ci sono partite: se tutte sono giocate e l'ultima data di partita è passata
    if (tourMatches.length > 0) {
      const allPlayed = tourMatches.every((m) => m.played);
      const maxDate = tourMatches.reduce((max, m) => (m.date > max ? m.date : max), '');
      if (allPlayed && (!maxDate || maxDate < today)) {
        return { status: 'passato', label: 'Passato' };
      }
    }

    return { status: 'in_corso', label: 'In corso' };
  };

  // Mappatura aggregata tornei con partite, mister e stato
  const enrichedTournaments = useMemo(() => {
    return tournaments.map((t) => {
      const tourMatches = matches
        .filter((m) => m.tournamentId === t.id)
        .sort((a, b) => {
          const dComp = (a.date || '').localeCompare(b.date || '');
          if (dComp !== 0) return dComp;
          return (a.time || '').localeCompare(b.time || '');
        });

      const coachName = getCoachNameForTeam(t.teamId);
      const { status, label: statusLabel } = getTournamentStatus(t, tourMatches);

      return {
        ...t,
        matches: tourMatches,
        coachName,
        status,
        statusLabel
      };
    });
  }, [tournaments, matches, staffUsers]);

  // Lista categorie uniche disponibili
  const availableCategories = useMemo(() => {
    const setCat = new Set<string>();
    tournaments.forEach((t) => {
      if (t.teamId) setCat.add(t.teamId);
    });
    // Aggiungi anche categorie predefinite da TEAM_GROUPS se non vuote
    TEAM_GROUPS.forEach((g) => {
      g.teams.forEach((tm) => setCat.add(tm));
    });
    return Array.from(setCat).sort();
  }, [tournaments]);

  // Lista mister unici disponibili dai tornei arricchiti
  const availableCoaches = useMemo(() => {
    const setCoach = new Set<string>();
    enrichedTournaments.forEach((t) => {
      if (t.coachName && t.coachName !== 'Staff Tecnico') {
        t.coachName.split(',').forEach((c) => setCoach.add(c.trim()));
      }
    });
    return Array.from(setCoach).sort();
  }, [enrichedTournaments]);

  // Tornei filtrati
  const filteredTournaments = useMemo(() => {
    return enrichedTournaments.filter((t) => {
      // Filtro stato
      if (statusFilter === 'in_corso' && t.status !== 'in_corso') return false;
      if (statusFilter === 'passati' && t.status !== 'passato') return false;

      // Filtro categoria
      if (categoryFilter !== 'all' && t.teamId !== categoryFilter) {
        // match parziale per anno (es. 2014)
        if (!t.teamId.includes(categoryFilter) && !categoryFilter.includes(t.teamId)) {
          return false;
        }
      }

      // Filtro mister
      if (coachFilter !== 'all' && !t.coachName.includes(coachFilter)) {
        return false;
      }

      // Ricerca testo (nome torneo, luogo, partite)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesTeam = t.teamId.toLowerCase().includes(q);
        const matchesCoach = t.coachName.toLowerCase().includes(q);
        const matchesLoc = (t.location || '').toLowerCase().includes(q);
        const matchesMatch = t.matches.some(
          (m) =>
            m.match.toLowerCase().includes(q) ||
            (m.location || '').toLowerCase().includes(q)
        );

        if (!matchesName && !matchesTeam && !matchesCoach && !matchesLoc && !matchesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedTournaments, statusFilter, categoryFilter, coachFilter, searchQuery]);

  // Conteggi per statistiche
  const stats = useMemo(() => {
    const total = enrichedTournaments.length;
    const inCorso = enrichedTournaments.filter((t) => t.status === 'in_corso').length;
    const passati = enrichedTournaments.filter((t) => t.status === 'passato').length;
    const totalMatches = matches.length;
    const playedMatches = matches.filter((m) => m.played).length;
    const pendingMatches = totalMatches - playedMatches;

    return { total, inCorso, passati, totalMatches, playedMatches, pendingMatches };
  }, [enrichedTournaments, matches]);

  const toggleExpand = (tourId: string) => {
    setExpandedTourIds((prev) => ({ ...prev, [tourId]: !prev[tourId] }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    filteredTournaments.forEach((t) => {
      allExp[t.id] = true;
    });
    setExpandedTourIds(allExp);
  };

  const collapseAll = () => {
    setExpandedTourIds({});
  };

  // Esportazione Excel
  const handleExportExcel = () => {
    if (filteredTournaments.length === 0) {
      alert('Nessun torneo visualizzato da esportare con i filtri attuali.');
      return;
    }

    const exportItems: ClubTournamentExportItem[] = filteredTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      teamId: t.teamId,
      coachName: t.coachName,
      statusText: t.status === 'in_corso' ? 'In corso' : 'Passato',
      startDate: t.startDate,
      endDate: t.endDate,
      location: t.location,
      matches: t.matches
    }));

    let filterLabel = 'Tutti';
    if (statusFilter === 'in_corso') filterLabel = 'In_Corso';
    else if (statusFilter === 'passati') filterLabel = 'Passati';
    if (categoryFilter !== 'all') filterLabel += `_${categoryFilter.replace(/\s+/g, '_')}`;

    exportClubTournamentsToExcel(exportItems, filterLabel);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="tab-club-tournaments" className="tab-content space-y-6">
      {/* Contenitore Interattivo a Schermo (Nascosto in fase di stampa cartacea / PDF) */}
      <div className="print:hidden space-y-6">
        {/* Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Trophy className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Panoramica Tornei del Club
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg">
                    Solo Admin / Gestione Club
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Elenco centralizzato di tutti i tornei del club Spes Montesacro con calendario gare, categorie e mister incaricati.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Ricarica tutti i tornei e le partite"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Aggiorna</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-xs shadow-emerald-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Esporta tutti i tornei e il calendario completo delle partite in un file Excel (.xlsx) formattato"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Stampa in Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Stampa documento ufficiale o salva in PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Stampa / PDF</span>
            </button>
          </div>
        </div>

        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Totale Tornei
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Iscritti nel gestionale</div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              In Corso / Attivi
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">{stats.inCorso}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Con gare o data futura</div>
          </div>

          <div className="bg-slate-100/90 p-3.5 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Passati / Conclusi
            </div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.passati}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tornei già disputati</div>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/80">
            <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Partite Complessive
            </div>
            <div className="text-2xl font-black text-blue-900 mt-0.5">{stats.totalMatches}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              {stats.playedMatches} giocate • {stats.pendingMatches} da fare
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Tabs/Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-xl font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tutti ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('in_corso')}
                className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  statusFilter === 'in_corso'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${statusFilter === 'in_corso' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                In Corso ({stats.inCorso})
              </button>
              <button
                onClick={() => setStatusFilter('passati')}
                className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-xl font-bold transition ${
                  statusFilter === 'passati'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Passati ({stats.passati})
              </button>
            </div>

            {/* Expand / Collapse buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Espandi tutte
              </button>
              <button
                onClick={collapseAll}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Comprimi tutte
              </button>
            </div>
          </div>

          {/* Detailed Dropdowns and Search Input */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Category selector */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Categoria / Squadra
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">Tutte le Categorie ({availableCategories.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Coach selector */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Mister Incaricato
              </label>
              <select
                value={coachFilter}
                onChange={(e) => setCoachFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">Tutti i Mister ({availableCoaches.length})</option>
                {availableCoaches.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cerca Torneo, Luogo o Avversario
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="es. Torneo di Primavera, Savio..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs pl-9 pr-3 py-2.5 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournaments List View */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600">Caricamento registro tornei in corso...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">Nessun torneo trovato</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Nessun torneo corrisponde ai criteri di filtro selezionati. Prova a reimpostare i filtri per visualizzare tutti i tornei registrati.
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
              setCoachFilter('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition"
          >
            Reimposta Filtri
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
            <span>Visualizzati {filteredTournaments.length} tornei</span>
            <span>
              Filtro attivo:{' '}
              <strong className="text-slate-800">
                {statusFilter === 'all'
                  ? 'Tutti'
                  : statusFilter === 'in_corso'
                  ? 'In Corso'
                  : 'Passati'}
              </strong>
            </span>
          </div>

          {filteredTournaments.map((tour) => {
            const isExpanded = !!expandedTourIds[tour.id];
            const hasMatches = tour.matches.length > 0;
            const playedCount = tour.matches.filter((m) => m.played).length;
            const pendingCount = tour.matches.length - playedCount;

            return (
              <div
                key={tour.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition hover:border-slate-300"
              >
                {/* Header del Torneo */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Badge di stato e categoria */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {tour.status === 'in_corso' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            In Corso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            Passato
                          </span>
                        )}

                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          Categoria: {tour.teamId || 'Non specificata'}
                        </span>

                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          Mister: {tour.coachName}
                        </span>
                      </div>

                      {/* Nome del Torneo */}
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                        <h4 className="text-base sm:text-lg font-black text-slate-900">
                          {tour.name}
                        </h4>
                      </div>

                      {/* Dati ausiliari: Date, Luogo, Partite */}
                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600 font-medium">
                        {(tour.startDate || tour.endDate) && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {tour.startDate ? formatDateIT(tour.startDate) : 'Inizio non def.'}
                              {tour.endDate ? ` - ${formatDateIT(tour.endDate)}` : ''}
                            </span>
                          </div>
                        )}

                        {tour.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{tour.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {hasMatches
                              ? `${tour.matches.length} partite (${playedCount} giocate, ${pendingCount} da disputare)`
                              : 'Nessuna partita a calendario'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions & Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      {tour.calendarPdf && (
                        <button
                          onClick={() => openOrDownloadPdf(tour.calendarPdf!.dataUrl, tour.calendarPdf!.name)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-bold flex items-center gap-1"
                          title="Visualizza o scarica il Calendario PDF ufficiale del torneo"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Calendario PDF</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(tour.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Nascondi Partite' : 'Visualizza Partite'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sezione Partite (Accordion Espandibile) */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-slate-50/40">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Clock3 className="w-3.5 h-3.5 text-slate-500" />
                        Partite & Calendario del Torneo ({tour.matches.length})
                      </h5>
                    </div>

                    {!hasMatches ? (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 font-medium">
                        Nessuna partita registrata nel calendario di questo torneo.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                              <th className="p-3 w-10 text-center">#</th>
                              <th className="p-3 w-28">Data</th>
                              <th className="p-3 w-20">Ora</th>
                              <th className="p-3">Partita / Incontro</th>
                              <th className="p-3 w-40">Campo / Sede</th>
                              <th className="p-3 w-28 text-center">Risultato</th>
                              <th className="p-3 w-28 text-center">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tour.matches.map((m, idx) => {
                              return (
                                <tr
                                  key={m.id}
                                  className="hover:bg-slate-50/80 transition font-medium text-slate-800"
                                >
                                  <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-900">
                                    {m.date ? formatDateIT(m.date) : '-'}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {m.time ? `${m.time}` : '-'}
                                  </td>
                                  <td className="p-3 font-bold text-slate-900">
                                    ⚽ {m.match}
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {m.location || tour.location || '-'}
                                  </td>
                                  <td className="p-3 text-center">
                                    {m.result ? (
                                      <span className="font-mono font-black text-xs px-2.5 py-1 bg-slate-900 text-emerald-400 rounded-lg">
                                        {m.result}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {m.played ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Disputata
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        Da disputare
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Stampa Ufficiale Nascosta (visibile SOLO durante @media print) - OGNI RIGA UNA PARTITA */}
      <div className="hidden print:block space-y-4">
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Spes Montesacro - Calendario Gare Tornei del Club
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Programma Ufficiale Incontri • Report direttivo generato il {new Date().toLocaleDateString('it-IT')}
              </p>
            </div>
            <div className="text-right text-xs text-slate-700 space-y-0.5 font-bold">
              <div>Filtro Stato: {statusFilter === 'all' ? 'TUTTI I TORNEI' : statusFilter === 'in_corso' ? 'IN CORSO' : 'PASSATI'}</div>
              {categoryFilter !== 'all' && <div>Categoria: {categoryFilter}</div>}
              {coachFilter !== 'all' && <div>Mister: {coachFilter}</div>}
            </div>
          </div>
        </div>

        {/* Tabella Ufficiale: Ogni Riga è una Partita del Torneo */}
        <table className="w-full border-collapse border border-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold">
              <th className="border border-slate-800 p-2 text-center w-8">#</th>
              <th className="border border-slate-800 p-2 text-left w-36">Torneo</th>
              <th className="border border-slate-800 p-2 text-left w-32">Categoria</th>
              <th className="border border-slate-800 p-2 text-left w-36">Mister Incaricato</th>
              <th className="border border-slate-800 p-2 text-center w-20">Data</th>
              <th className="border border-slate-800 p-2 text-center w-14">Ora</th>
              <th className="border border-slate-800 p-2 text-left">Partita / Incontro</th>
              <th className="border border-slate-800 p-2 text-left w-32">Campo / Impianto</th>
              <th className="border border-slate-800 p-2 text-center w-20">Risultato</th>
              <th className="border border-slate-800 p-2 text-center w-24">Stato Gara</th>
            </tr>
          </thead>
          <tbody>
            {filteredTournaments.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                  Nessun torneo o partita trovata per i criteri selezionati.
                </td>
              </tr>
            ) : (
              (() => {
                let matchCounter = 1;
                return filteredTournaments.flatMap((t) => {
                  if (t.matches.length === 0) {
                    return (
                      <tr key={`print-tour-${t.id}-empty`} className="align-middle">
                        <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono text-[10px]">-</td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{t.name}</td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">{t.teamId || '-'}</td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">{t.coachName}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-medium">{t.startDate ? formatDateIT(t.startDate) : '-'}</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-400">-</td>
                        <td className="border border-slate-300 p-1.5 italic text-slate-500">Nessuna gara registrata a calendario</td>
                        <td className="border border-slate-300 p-1.5 text-slate-700">{t.location || '-'}</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-400">-</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-700">
                          {t.status === 'in_corso' ? 'In corso' : 'Passato'}
                        </td>
                      </tr>
                    );
                  }

                  return t.matches.map((m) => {
                    const currentIdx = matchCounter++;
                    return (
                      <tr key={`print-match-${m.id}`} className="align-middle">
                        <td className="border border-slate-300 p-1.5 text-center text-slate-500 font-mono text-[10px]">
                          {currentIdx}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{t.name}</td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-800">{t.teamId || '-'}</td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">{t.coachName}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-900">
                          {m.date ? formatDateIT(m.date) : '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-medium text-slate-700">
                          {m.time || '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                          ⚽ {m.match}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-700">
                          {m.location || t.location || '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-slate-900">
                          {m.result || '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-semibold">
                          {m.played ? (
                            <span className="text-emerald-800 font-bold">Disputata</span>
                          ) : (
                            <span className="text-amber-800">Da disputare</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={previewPdfModal.isOpen}
        onClose={() => setPreviewPdfModal((prev) => ({ ...prev, isOpen: false }))}
        title={previewPdfModal.title}
        fileName={previewPdfModal.fileName}
        dataUrl={previewPdfModal.dataUrl}
      />
    </div>
  );
};
