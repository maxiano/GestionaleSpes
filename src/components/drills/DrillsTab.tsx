import React, { useState, useEffect, useMemo } from 'react';
import {
  TacticalDrill,
  DrillElement,
  DrillLine,
  DrillPitchType,
  UserProfile
} from '../../types';
import {
  getTacticalDrills,
  saveTacticalDrill,
  deleteTacticalDrill,
  duplicateTacticalDrill,
  DRILL_CATEGORIES,
  DRILL_PHASES,
  DRILL_TACTICAL_ZONES,
  normalizeDrillCategory
} from '../../services/drillsService';
import { TacticalBoard } from './TacticalBoard';
import { DrillPrintModal } from './DrillPrintModal';
import {
  Plus,
  Search,
  Filter,
  Printer,
  Copy,
  Trash2,
  Edit3,
  Clock,
  Users,
  Shield,
  Share2,
  ChevronLeft,
  Save,
  CheckCircle,
  Eye,
  BookOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface DrillsTabProps {
  userProfile: UserProfile;
}

export const DrillsTab: React.FC<DrillsTabProps> = ({ userProfile }) => {
  const [drills, setDrills] = useState<TacticalDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modalità: 'list' (libreria) oppure 'edit' (creazione/modifica)
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');

  // Filtri libreria
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Tutte');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('Tutte');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('Tutte');
  const [onlyMyDrills, setOnlyMyDrills] = useState(false);

  // Esercizio in modifica o creazione
  const [currentDrill, setCurrentDrill] = useState<TacticalDrill | null>(null);

  // Modale di stampa
  const [printModalDrill, setPrintModalDrill] = useState<TacticalDrill | null>(null);

  const isAdmin = userProfile.role === 'admin';

  // Carica tutti gli esercizi
  const loadDrills = async () => {
    setLoading(true);
    try {
      const data = await getTacticalDrills();
      setDrills(data);
    } catch (err) {
      console.error('Errore caricamento esercizi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrills();
  }, []);

  // Crea un nuovo esercizio vuoto
  const handleNewDrill = () => {
    const emptyDrill: TacticalDrill = {
      id: `drill-${Date.now()}`,
      title: 'Nuova Esercitazione',
      category: 'Pulcini (2016 e 2017)',
      phase: 'Possesso Palla & Rondo',
      tacticalZone: 'Zona di costruzione bassa',
      intensity: 'Media',
      durationMinutes: 15,
      playerCount: '8-10 giocatori',
      pitchDimensions: 'Metà campo',
      equipmentNeeded: 'Cinesini, casacche, palloni',
      objectivesPrimary: 'Mantenimento del possesso e trasmissione palla',
      objectivesSecondary: 'Smarcamento e transizione rapida',
      description: 'Descrivi qui lo svolgimento dell\'esercitazione e le regole di gioco...',
      variants: 'Progressione 1: Limite a due tocchi\nProgressione 2: Inserire un jolly centrale',
      coachingPoints: 'Attenzione alla postura di ricezione e alla precisione dei passaggi rasoterra.',
      pitchType: 'half',
      elements: [
        { id: 'b1', type: 'player_blue', x: 30, y: 50, label: 'B1' },
        { id: 'b2', type: 'player_blue', x: 70, y: 50, label: 'B2' },
        { id: 'r1', type: 'player_red', x: 50, y: 40, label: 'R1' },
        { id: 'ball1', type: 'ball', x: 35, y: 50 }
      ],
      lines: [],
      authorId: userProfile.uid,
      authorName: userProfile.name || 'Mister SPES',
      authorRole: isAdmin ? 'Responsabile Tecnico' : 'Allenatore',
      isShared: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCurrentDrill(emptyDrill);
    setViewMode('edit');
  };

  // Modifica esercizio esistente
  const handleEditDrill = (drill: TacticalDrill) => {
    setCurrentDrill({ ...drill });
    setViewMode('edit');
  };

  // Duplica esercizio
  const handleDuplicateDrill = async (drill: TacticalDrill) => {
    try {
      const cloned = await duplicateTacticalDrill(
        drill,
        userProfile.uid,
        userProfile.name || 'Mister SPES',
        isAdmin ? 'Responsabile Tecnico' : 'Allenatore'
      );
      setDrills((prev) => [cloned, ...prev]);
      alert(`Esercizio "${drill.title}" duplicato con successo nella tua cartella!`);
    } catch (err: any) {
      alert('Errore duplicazione esercizio: ' + (err.message || err));
    }
  };

  // Elimina esercizio
  const handleDeleteDrill = async (drill: TacticalDrill) => {
    const canDelete = isAdmin || drill.authorId === userProfile.uid;
    if (!canDelete) {
      alert('Solo l\'autore dell\'esercizio o un amministratore possono eliminare questa scheda.');
      return;
    }

    if (!window.confirm(`Sei sicuro di voler eliminare definitivamente "${drill.title}"?`)) {
      return;
    }

    try {
      await deleteTacticalDrill(drill.id);
      setDrills((prev) => prev.filter((d) => d.id !== drill.id));
      if (currentDrill?.id === drill.id) {
        setViewMode('list');
        setCurrentDrill(null);
      }
    } catch (err: any) {
      alert('Errore eliminazione esercizio: ' + (err.message || err));
    }
  };

  // Salva esercizio corrente
  const handleSaveCurrentDrill = async () => {
    if (!currentDrill) return;
    if (!currentDrill.title.trim()) {
      alert('Inserisci un titolo per l\'esercitazione.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      const saved = await saveTacticalDrill(currentDrill);
      setCurrentDrill(saved);
      setDrills((prev) => {
        const idx = prev.findIndex((d) => d.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Errore durante il salvataggio: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Condivisione rapida WhatsApp da card
  const handleShareWhatsApp = (drill: TacticalDrill) => {
    const text = `⚽ *ESERCIZIO SPES MONTESACRO*\n\n` +
      `📋 *${drill.title}*\n` +
      `🏷️ Categoria: ${drill.category} | Fase: ${drill.phase}\n` +
      `⏱️ Durata: ${drill.durationMinutes || 15} min | 👥 Giocatori: ${drill.playerCount || 'N/D'}\n` +
      `🎯 Obiettivo: ${drill.objectivesPrimary}\n\n` +
      `📝 *Svolgimento:* ${drill.description.substring(0, 160)}...\n\n` +
      `👤 Creato da Mister ${drill.authorName}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtra la libreria in base ai parametri
  const filteredDrills = useMemo(() => {
    return drills.filter((drill) => {
      // Ricerca testo
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = drill.title.toLowerCase().includes(q);
        const matchDesc = drill.description.toLowerCase().includes(q);
        const matchObj = drill.objectivesPrimary.toLowerCase().includes(q);
        const matchAuthor = drill.authorName.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchObj && !matchAuthor) {
          return false;
        }
      }

      // Filtro categoria
      if (selectedCategoryFilter !== 'Tutte' && selectedCategoryFilter !== 'Tutte le Categorie') {
        if (
          drill.category !== selectedCategoryFilter &&
          normalizeDrillCategory(drill.category) !== normalizeDrillCategory(selectedCategoryFilter)
        ) {
          return false;
        }
      }

      // Filtro fase
      if (selectedPhaseFilter !== 'Tutte') {
        if (drill.phase !== selectedPhaseFilter) {
          return false;
        }
      }

      // Filtro zona del campo
      if (selectedZoneFilter !== 'Tutte') {
        if (drill.tacticalZone !== selectedZoneFilter) {
          return false;
        }
      }

      // Filtro "I miei esercizi"
      if (onlyMyDrills) {
        if (drill.authorId !== userProfile.uid) {
          return false;
        }
      }

      return true;
    });
  }, [
    drills,
    searchQuery,
    selectedCategoryFilter,
    selectedPhaseFilter,
    selectedZoneFilter,
    onlyMyDrills,
    userProfile.uid
  ]);

  return (
    <div id="drills-tab-container" className="space-y-6">
      {/* HEADER DELLA SCHEDA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/60 print:hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-wider">
              Area Tecnica &amp; Mister
            </span>
            <span className="text-slate-400 text-xs font-semibold">• SPES Montesacro</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Lavagna Tattica &amp; Esercitazioni
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-emerald-300 mt-1.5 max-w-3xl leading-relaxed">
            Tutte le esercitazioni devono implementare questi 4 principi: gioco e mi muovo, gestione del pallone, riaggressione e contrattacco
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-bold text-slate-200">
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              1. Gioco e mi muovo
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              2. Gestione del pallone
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              3. Riaggressione
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              4. Contrattacco
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          {viewMode === 'edit' ? (
            <>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Torna alla Libreria</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintModalDrill(currentDrill)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold transition shadow-sm"
                title="Anteprima e Stampa Scheda A4"
              >
                <Printer className="w-4 h-4" />
                <span>Stampa / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentDrill}
                disabled={saving}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black transition shadow-lg shadow-emerald-950/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvataggio...' : 'Salva Scheda'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNewDrill}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition shadow-lg shadow-emerald-950/30"
            >
              <Plus className="w-5 h-5" />
              <span>Nuova Esercitazione</span>
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICA SALVATAGGIO RIUSCITO */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Esercitazione salvata con successo nel database condiviso del club!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALITÀ 1: LIBRERIA ESERCIZI CONDIVISI */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* BARRA FILTRI E RICERCA */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Ricerca per parola chiave */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per titolo, obiettivo, regola o mister..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Filtri categoria, fase e autore */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Categoria */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Tutte">Tutte le Categorie</option>
                {DRILL_CATEGORIES.filter((c) => c !== 'Tutte le Categorie').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Zona del campo */}
              <select
                value={selectedZoneFilter}
                onChange={(e) => setSelectedZoneFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Tutte">Tutte le Zone</option>
                {DRILL_TACTICAL_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>

              {/* Fase */}
              <select
                value={selectedPhaseFilter}
                onChange={(e) => setSelectedPhaseFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Tutte">Tutte le Fasi</option>
                {DRILL_PHASES.map((ph) => (
                  <option key={ph} value={ph}>
                    {ph}
                  </option>
                ))}
              </select>

              {/* Toggle Solo i miei esercizi */}
              <button
                type="button"
                onClick={() => setOnlyMyDrills(!onlyMyDrills)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  onlyMyDrills
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                I Miei Esercizi
              </button>
            </div>
          </div>

          {/* STATISTICHE CONTEGGIO */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-semibold">
            <span>
              Mostrando <strong className="text-slate-900 font-bold">{filteredDrills.length}</strong> esercitazioni disponibili
            </span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Libreria condivisa dello staff
            </span>
          </div>

          {/* GRIGLIA CARDS ESERCIZI */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-sm bg-white rounded-3xl border border-slate-200">
              Caricamento esercitazioni tattiche...
            </div>
          ) : filteredDrills.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-black text-slate-800 text-base">Nessuna esercitazione trovata</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nessun esercizio corrisponde ai filtri selezionati. Prova a modificare i criteri di ricerca o crea una nuova scheda.
              </p>
              <button
                type="button"
                onClick={handleNewDrill}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Crea Nuova Scheda</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrills.map((drill) => (
                <div
                  key={drill.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  {/* ANTEPRIMA GRAFICA MINIATURA */}
                  <div className="relative bg-slate-950 p-2 border-b border-slate-100 overflow-hidden">
                    <div className="w-full max-w-[280px] mx-auto scale-95 origin-center pointer-events-none opacity-90 group-hover:opacity-100 transition">
                      <TacticalBoard
                        pitchType={drill.pitchType}
                        onChangePitchType={() => {}}
                        elements={drill.elements}
                        onChangeElements={() => {}}
                        lines={drill.lines}
                        onChangeLines={() => {}}
                        readOnly={true}
                      />
                    </div>

                    {/* Badge sovrapposti in miniatura */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-black uppercase rounded-lg border border-slate-700">
                        {drill.category}
                      </span>
                      {drill.tacticalZone && (
                        <span className="px-2 py-0.5 bg-sky-950/90 backdrop-blur-xs text-sky-300 text-[10px] font-bold rounded-lg border border-sky-800/80">
                          {drill.tacticalZone}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-800/80">
                        {drill.durationMinutes || 15} min
                      </span>
                    </div>
                  </div>

                  {/* CONTENUTO INFORMATIVO */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mb-1 flex-wrap">
                        <span>{drill.phase}</span>
                        {drill.tacticalZone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-sky-800">{drill.tacticalZone}</span>
                          </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{drill.intensity || 'Media'} intensità</span>
                      </div>

                      <h3 className="font-black text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition">
                        {drill.title}
                      </h3>

                      {/* Obiettivo Primario */}
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 font-medium">
                        <strong className="text-slate-800 font-bold">Obiettivo: </strong>
                        {drill.objectivesPrimary}
                      </p>
                    </div>

                    {/* Dati Autore & Data */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-black text-[9px] text-slate-700">
                          {drill.authorName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700 truncate max-w-[120px]">
                          {drill.authorName}
                        </span>
                      </div>
                      <span>{new Date(drill.updatedAt || drill.createdAt).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>

                  {/* BARRA AZIONI CARD */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {/* Apri / Modifica */}
                      <button
                        type="button"
                        onClick={() => handleEditDrill(drill)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
                        title="Apri nella lavagna grafica per modificare"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Apri</span>
                      </button>

                      {/* Stampa / PDF */}
                      <button
                        type="button"
                        onClick={() => setPrintModalDrill(drill)}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition"
                        title="Stampa Scheda o Salva in PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Condividi WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(drill)}
                        className="p-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-600 transition"
                        title="Condividi su WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Duplica per me */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateDrill(drill)}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition"
                        title="Duplica e crea una copia personale"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Elimina (se consentito) */}
                    {(isAdmin || drill.authorId === userProfile.uid) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDrill(drill)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Elimina questa esercitazione"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALITÀ 2: EDITOR GRAFICO & COMPILAZIONE SCHEDA TECNICA */}
      {/* ========================================================================= */}
      {viewMode === 'edit' && currentDrill && (
        <div className="space-y-6">
          {/* BARRA SUPERIORE TITOLO SCHEDA */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:flex-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Titolo dell'Esercitazione:
              </label>
              <input
                type="text"
                value={currentDrill.title}
                onChange={(e) => setCurrentDrill({ ...currentDrill, title: e.target.value })}
                placeholder="Es. Rondo 4v2 con ricerca del terzo uomo e transizione..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-lg font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs text-slate-500 font-medium">
                Autore: <strong className="text-slate-800">{currentDrill.authorName}</strong>
              </span>
            </div>
          </div>

          {/* LAYOUT A 2 COLONNE: LAVAGNA GRAFICA + SCHEDA TECNICA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLONNA SINISTRA: LAVAGNA TATTICA (7 Colonne su Desktop) */}
            <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                    🎨
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Lavagna Grafica Interattiva</h3>
                    <p className="text-[11px] text-slate-500">Disponi i giocatori, gli attrezzi e traccia i movimenti</p>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                  {currentDrill.elements.length} elementi • {currentDrill.lines.length} frecce
                </div>
              </div>

              {/* COMPONENTE LAVAGNA TATTICA */}
              <TacticalBoard
                pitchType={currentDrill.pitchType}
                onChangePitchType={(type) => setCurrentDrill({ ...currentDrill, pitchType: type })}
                elements={currentDrill.elements}
                onChangeElements={(els) => setCurrentDrill({ ...currentDrill, elements: els })}
                lines={currentDrill.lines}
                onChangeLines={(lns) => setCurrentDrill({ ...currentDrill, lines: lns })}
                onCaptureSnapshot={(snap) =>
                  setCurrentDrill((prev) => (prev ? { ...prev, previewImageDataUrl: snap } : null))
                }
                readOnly={false}
              />
            </div>

            {/* COLONNA DESTRA: SCHEDA METODOLOGICA & PARAMETRI (5 Colonne su Desktop) */}
            <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">
                  📋
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Parametri &amp; Scheda Metodologica</h3>
                  <p className="text-[11px] text-slate-500">Compila gli obiettivi e le regole dell'allenamento</p>
                </div>
              </div>

              {/* Form campi */}
              <div className="space-y-3.5 text-xs">
                {/* Categoria e Fase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-black text-[11px] uppercase text-slate-600 block mb-1">
                      Categoria:
                    </label>
                    <select
                      value={currentDrill.category}
                      onChange={(e) => setCurrentDrill({ ...currentDrill, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      {DRILL_CATEGORIES.filter((c) => c !== 'Tutte le Categorie').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-black text-[11px] uppercase text-slate-600 block mb-1">
                      Fase di Gioco:
                    </label>
                    <select
                      value={currentDrill.phase}
                      onChange={(e) => setCurrentDrill({ ...currentDrill, phase: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      {DRILL_PHASES.map((ph) => (
                        <option key={ph} value={ph}>
                          {ph}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Zona di Costruzione / Finalizzazione */}
                <div>
                  <label className="font-black text-[11px] uppercase text-slate-600 block mb-1">
                    Zona del Campo:
                  </label>
                  <select
                    value={currentDrill.tacticalZone || 'Zona di costruzione bassa'}
                    onChange={(e) => setCurrentDrill({ ...currentDrill, tacticalZone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {DRILL_TACTICAL_ZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Banner 4 Principi Metodologici */}
                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 font-black text-emerald-950 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Principi Fondamentali dell'Esercitazione</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-snug font-medium">
                    Tutte le esercitazioni devono implementare questi 4 principi: <strong>gioco e mi muovo</strong>, <strong>gestione del pallone</strong>, <strong>riaggressione</strong> e <strong>contrattacco</strong>.
                  </p>
                </div>

                {/* Durata, Giocatori, Intensità */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-[10px] uppercase text-slate-500 block mb-1">
                      Durata (min):
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      step={5}
                      value={currentDrill.durationMinutes || 15}
                      onChange={(e) =>
                        setCurrentDrill({
                          ...currentDrill,
                          durationMinutes: parseInt(e.target.value) || 15
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 text-center"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[10px] uppercase text-slate-500 block mb-1">
                      Giocatori:
                    </label>
                    <input
                      type="text"
                      placeholder="es. 8-10"
                      value={currentDrill.playerCount || ''}
                      onChange={(e) =>
                        setCurrentDrill({ ...currentDrill, playerCount: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-center"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[10px] uppercase text-slate-500 block mb-1">
                      Intensità:
                    </label>
                    <select
                      value={currentDrill.intensity || 'Media'}
                      onChange={(e) =>
                        setCurrentDrill({
                          ...currentDrill,
                          intensity: e.target.value as any
                        })
                      }
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-center"
                    >
                      <option value="Bassa">Bassa</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Dimensioni spazio e materiale */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[11px] text-slate-600 block mb-1">
                      Dimensioni Spazio:
                    </label>
                    <input
                      type="text"
                      placeholder="es. 20 x 25 metri, Metà campo..."
                      value={currentDrill.pitchDimensions || ''}
                      onChange={(e) =>
                        setCurrentDrill({ ...currentDrill, pitchDimensions: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[11px] text-slate-600 block mb-1">
                      Materiale Occorrente:
                    </label>
                    <input
                      type="text"
                      placeholder="es. 8 cinesini, 2 porticine, 6 palloni"
                      value={currentDrill.equipmentNeeded || ''}
                      onChange={(e) =>
                        setCurrentDrill({ ...currentDrill, equipmentNeeded: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                </div>

                {/* Obiettivo Primario */}
                <div>
                  <label className="font-black text-[11px] uppercase text-emerald-800 block mb-1">
                    🎯 Obiettivo Tecnico / Tattico Primario:
                  </label>
                  <input
                    type="text"
                    placeholder="es. Smarcamento, trasmissione forte rasoterra e terzo uomo..."
                    value={currentDrill.objectivesPrimary}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, objectivesPrimary: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Obiettivo Secondario */}
                <div>
                  <label className="font-black text-[11px] uppercase text-blue-800 block mb-1">
                    🔍 Obiettivo Secondario &amp; Transizione:
                  </label>
                  <input
                    type="text"
                    placeholder="es. Transizione negativa immediata, comunicazione, orientamento del corpo..."
                    value={currentDrill.objectivesSecondary || ''}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, objectivesSecondary: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-xl font-medium text-slate-900 focus:bg-white"
                  />
                </div>

                {/* Svolgimento e Regole */}
                <div>
                  <label className="font-black text-[11px] uppercase text-slate-700 block mb-1">
                    📖 Svolgimento dell'Esercitazione &amp; Regole:
                  </label>
                  <textarea
                    rows={4}
                    value={currentDrill.description}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, description: e.target.value })
                    }
                    placeholder="Spiega nei dettagli le regole di gioco, punteggio, come parte l'azione e le rotazioni dei giocatori..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                {/* Progressioni e Varianti */}
                <div>
                  <label className="font-black text-[11px] uppercase text-amber-800 block mb-1">
                    ⚡ Varianti &amp; Progressioni Didattiche:
                  </label>
                  <textarea
                    rows={2}
                    value={currentDrill.variants || ''}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, variants: e.target.value })
                    }
                    placeholder="Es. Variante 1: massimo due tocchi obbligatori. Variante 2: gol vale doppio se fatto dopo passaggio filtrante..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white leading-relaxed"
                  />
                </div>

                {/* Coaching points */}
                <div>
                  <label className="font-black text-[11px] uppercase text-purple-800 block mb-1">
                    💡 Punti Chiave per il Mister (Cosa correggere):
                  </label>
                  <textarea
                    rows={2}
                    value={currentDrill.coachingPoints || ''}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, coachingPoints: e.target.value })
                    }
                    placeholder="Es. Postura in ricezione, piede di appoggio, non voltare le spalle al compagno..."
                    className="w-full px-3 py-2 bg-purple-50/40 border border-purple-200 rounded-xl font-medium text-slate-900 focus:bg-white leading-relaxed"
                  />
                </div>

                {/* Condivisione con gli altri mister */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-share-drill"
                    checked={currentDrill.isShared}
                    onChange={(e) =>
                      setCurrentDrill({ ...currentDrill, isShared: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="chk-share-drill" className="font-bold text-slate-700 cursor-pointer">
                    Condividi nella Libreria del Club (visibile a tutti i mister dello staff)
                  </label>
                </div>
              </div>

              {/* Pulsante di salvataggio a fondo form */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalDrill(currentDrill)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Stampa Scheda A4</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentDrill}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvataggio...' : 'Salva Scheda'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DI STAMPA A4 / PDF */}
      {/* ========================================================================= */}
      <DrillPrintModal
        drill={printModalDrill}
        isOpen={!!printModalDrill}
        onClose={() => setPrintModalDrill(null)}
      />
    </div>
  );
};
