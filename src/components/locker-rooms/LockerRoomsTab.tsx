import React, { useState, useEffect } from 'react';
import { LockerAssignment, LockerSchedule } from '../../types';
import {
  getLockerSchedule,
  saveLockerSchedule,
  INITIAL_SPES_LOCKER_SCHEDULE,
  DAYS_ORDER,
  CATEGORIES_LIST,
  FIELDS_LIST,
  DEFAULT_NOTICES
} from '../../services/lockerRoomsService';
import { exportLockerRoomsToExcelFile, formatLockerRoomsWhatsApp } from '../../utils/exports';
import { ClubLogo } from '../common/ClubLogo';
import {
  FileSpreadsheet,
  Printer,
  Share2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Save,
  Plus
} from 'lucide-react';

export const LockerRoomsTab: React.FC = () => {
  const [schedule, setSchedule] = useState<LockerSchedule>(INITIAL_SPES_LOCKER_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<'clear' | 'reset' | null>(null);

  // Form states matching user's HTML inputs
  const [giorno, setGiorno] = useState<string>('Lunedì');
  const [orario, setOrario] = useState<string>('17:00');
  const [categoria, setCategoria] = useState<string>('2019');
  const [spogliatoio, setSpogliatoio] = useState<string>('3 e 4');
  const [campo, setCampo] = useState<string>('Campi C - D');
  const [nota, setNota] = useState<string>('');

  // 1. Load initial schedule from Firestore / LocalStorage
  useEffect(() => {
    async function load() {
      try {
        const data = await getLockerSchedule();
        setSchedule(data);
      } catch (err) {
        console.error('Errore caricamento schedule spogliatoi:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save changes to DB
  const handleSave = async (updated: LockerSchedule) => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveLockerSchedule(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  // Add new entry (matching user's script addEntry)
  const handleAddEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!orario || !spogliatoio.trim()) {
      setFormError('Per favore inserisci orario e spogliatoio.');
      return;
    }

    const newEntry: LockerAssignment = {
      id: `spes-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: giorno,
      time: orario,
      category: categoria,
      lockerRoom: spogliatoio.trim(),
      field: campo,
      notes: nota.trim()
    };

    const newAssignments = [...schedule.assignments, newEntry];

    // Sort schedule: first by daysOrder, then by time
    newAssignments.sort((a, b) => {
      const dayDiff = DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });

    const updatedSchedule: LockerSchedule = {
      ...schedule,
      assignments: newAssignments
    };

    setSchedule(updatedSchedule);

    // Reset spogliatoio and nota for quick entry of next group (as in user's script)
    setSpogliatoio('');
    setNota('');

    await handleSave(updatedSchedule);
  };

  // Remove single entry
  const handleRemoveEntry = async (id: string) => {
    const updatedAssignments = schedule.assignments.filter((item) => item.id !== id);
    const updatedSchedule: LockerSchedule = {
      ...schedule,
      assignments: updatedAssignments
    };
    setSchedule(updatedSchedule);
    await handleSave(updatedSchedule);
  };

  // Clear all
  const handleClearAll = async () => {
    const updatedSchedule: LockerSchedule = {
      ...schedule,
      assignments: []
    };
    setSchedule(updatedSchedule);
    setConfirmingAction(null);
    await handleSave(updatedSchedule);
  };

  // Reset to Spes standard default
  const handleResetToDefault = async () => {
    setSchedule(INITIAL_SPES_LOCKER_SCHEDULE);
    setConfirmingAction(null);
    await handleSave(INITIAL_SPES_LOCKER_SCHEDULE);
  };

  // Export Excel
  const handleExportExcel = () => {
    exportLockerRoomsToExcelFile(schedule.assignments, schedule.weekTitle);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp share
  const handleWhatsApp = async () => {
    const text = formatLockerRoomsWhatsApp(
      schedule.assignments,
      schedule.weekTitle,
      Array.isArray(schedule.generalNotes) ? schedule.generalNotes.join('\n• ') : (schedule.generalNotes || '')
    );
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedWhatsApp(true);
        setTimeout(() => setCopiedWhatsApp(false), 3000);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Group items by day according to DAYS_ORDER
  const groupedByDay: Record<string, LockerAssignment[]> = {};
  schedule.assignments.forEach((item) => {
    if (!groupedByDay[item.day]) {
      groupedByDay[item.day] = [];
    }
    groupedByDay[item.day].push(item);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-200">
        <div className="w-10 h-10 border-4 border-[#102C57] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-600 font-bold text-sm">Caricamento programmazione spogliatoi...</p>
      </div>
    );
  }

  return (
    <div id="spogliatoi-manager" className="max-w-5xl mx-auto space-y-6">
      {/* 1. PANNELLO INSERIMENTO DATI (Nascondibile in stampa) */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-md border border-slate-200 print:hidden transition-all">
        <div className="flex items-center justify-between border-b-2 border-[#102C57] pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✏️</span>
            <h2 className="text-lg sm:text-xl font-bold text-[#102C57] m-0">
              Inserimento Programmazione Spogliatoi
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess ? (
              <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Salvato online
              </span>
            ) : saving ? (
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                <Save className="w-4 h-4 animate-spin" /> Salvataggio...
              </span>
            ) : (
              <span className="text-slate-400 text-xs font-medium hidden sm:inline">
                Sincronizzato
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Giorno */}
            <div className="flex flex-col">
              <label htmlFor="input-giorno" className="font-semibold text-xs text-slate-600 mb-1.5">
                Giorno
              </label>
              <select
                id="input-giorno"
                value={giorno}
                onChange={(e) => setGiorno(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              >
                {DAYS_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Orario */}
            <div className="flex flex-col">
              <label htmlFor="input-orario" className="font-semibold text-xs text-slate-600 mb-1.5">
                Orario
              </label>
              <input
                type="time"
                id="input-orario"
                value={orario}
                onChange={(e) => setOrario(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              />
            </div>

            {/* Categoria */}
            <div className="flex flex-col">
              <label htmlFor="input-categoria" className="font-semibold text-xs text-slate-600 mb-1.5">
                Categoria / Squadra
              </label>
              <select
                id="input-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              >
                {CATEGORIES_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Spogliatoio */}
            <div className="flex flex-col">
              <label htmlFor="input-spogliatoio" className="font-semibold text-xs text-slate-600 mb-1.5">
                Spogliatoio/i
              </label>
              <input
                type="text"
                id="input-spogliatoio"
                value={spogliatoio}
                onChange={(e) => setSpogliatoio(e.target.value)}
                placeholder="es. 3 e 4 o 1"
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['1', '3 e 4', '6 e 7', '2 e 14', '8 e 10'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setSpogliatoio(chip)}
                    className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo */}
            <div className="flex flex-col">
              <label htmlFor="input-campo" className="font-semibold text-xs text-slate-600 mb-1.5">
                Campo / Campi
              </label>
              <select
                id="input-campo"
                value={campo}
                onChange={(e) => setCampo(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              >
                {FIELDS_LIST.map((grp) => (
                  <optgroup key={grp.group} label={grp.group}>
                    {grp.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Note / Avvisi */}
            <div className="flex flex-col">
              <label htmlFor="input-nota" className="font-semibold text-xs text-slate-600 mb-1.5">
                Note / Avvisi (Opzionale)
              </label>
              <input
                type="text"
                id="input-nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="es. I genitori devono passare lato bar"
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#35598F]"
              />
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setNota('I genitori devono passare lato bar')}
                  className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                >
                  + &quot;I genitori devono passare lato bar&quot;
                </button>
              </div>
            </div>
          </div>

          {/* Inline Form / Save Alerts */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center justify-between">
              <span>⚠️ {formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-red-500 hover:text-red-800 text-xs font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {saveError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-semibold flex items-center justify-between">
              <span>⚠️ {saveError} (i dati restano comunque salvati sul tuo dispositivo)</span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="text-amber-600 hover:text-amber-900 text-xs font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {copiedWhatsApp && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>📋 Testo del piano spogliatoi copiato negli appunti! Pronto da incollare su WhatsApp.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="bg-[#35598F] hover:bg-[#28446e] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi al Foglio</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
              title="Scarica foglio Excel (.xlsx) per la settimana"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Esporta Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#27AE60] hover:bg-[#1e874b] text-white px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
              title="Stampa foglio per bacheca o salva in PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa / Salva PDF</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Copia per WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Reset / Clear Confirmation UI */}
            {confirmingAction === 'reset' ? (
              <div className="flex items-center gap-2 ml-auto bg-amber-50 border border-amber-300 p-1.5 rounded-lg">
                <span className="text-xs text-amber-900 font-bold">Ripristinare esempio Spes?</span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-2.5 py-1 rounded cursor-pointer"
                >
                  Sì, ripristina
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingAction(null)}
                  className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            ) : confirmingAction === 'clear' ? (
              <div className="flex items-center gap-2 ml-auto bg-red-50 border border-red-300 p-1.5 rounded-lg">
                <span className="text-xs text-red-900 font-bold">Cancellare tutto il foglio?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1 rounded cursor-pointer"
                >
                  Sì, svuota
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingAction(null)}
                  className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmingAction('reset')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer ml-auto"
                  title="Ripristina valori standard Spes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ripristina Esempio Spes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmingAction('clear')}
                  className="bg-[#E74C3C] hover:bg-[#c0392b] text-white px-3.5 py-2.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Cancella tutte le righe del foglio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Svuota Foglio</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* 2. AREA LOCANDINA DI STAMPA & ANTEPRIMA (Stile fedele al template Spes Montesacro) */}
      <div className="bg-white p-4 sm:p-10 rounded-2xl shadow-lg border border-slate-200 min-h-[700px] print:shadow-none print:border-0 print:p-0 print:m-0">
        {/* Poster Header */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 border-b-[3px] border-[#102C57] pb-4 mb-6">
          <ClubLogo className="h-14 sm:h-20 w-14 sm:w-20 object-contain text-[#102C57] shrink-0" />
          <div className="text-center">
            <h1 className="text-xl sm:text-3xl font-black tracking-wider text-[#102C57] uppercase m-0">
              SPES MONTESACRO
            </h1>
            <h3 className="text-xs sm:text-base font-bold text-[#35598F] uppercase mt-1 tracking-wide">
              {schedule.weekTitle || 'Programmazione Spogliatoi e Campi'}
            </h3>
          </div>
        </div>

        {/* Dynamic Day Tables */}
        <div id="poster-content" className="space-y-6">
          {schedule.assignments.length === 0 ? (
            <div className="text-center text-slate-400 italic py-12">
              Nessun dato inserito. Usa il modulo in alto per aggiungere le categorie, gli spogliatoi e i campi.
            </div>
          ) : (
            DAYS_ORDER.map((giornoNome) => {
              const items = groupedByDay[giornoNome];
              if (!items || items.length === 0) return null;

              return (
                <div key={giornoNome} className="day-section mb-6">
                  {/* Day Banner */}
                  <div className="bg-[#102C57] text-white px-4 py-2 font-bold text-base sm:text-lg rounded uppercase tracking-wide mb-3 shadow-xs">
                    {giornoNome}
                  </div>

                  {/* Schedule Table */}
                  <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                    <table className="w-full min-w-[500px] border-collapse border-b border-slate-200 text-sm">
                      <thead>
                        <tr className="bg-[#35598F] text-white text-xs sm:text-sm uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-[15%]">ORARIO</th>
                          <th className="py-2.5 px-3 text-left w-[35%]">CATEGORIA</th>
                          <th className="py-2.5 px-3 text-center w-[25%]">SPOGLIATOIO</th>
                          <th className="py-2.5 px-3 text-center w-[20%]">CAMPO</th>
                          <th className="py-2.5 px-2 text-center w-[5%] print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-200 transition-colors ${
                              idx % 2 === 1 ? 'bg-[#f0f4f8]' : 'bg-white'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {item.time}
                            </td>
                            <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                              <div>Categoria {item.category}</div>
                              {item.notes && (
                                <span className="block text-xs text-[#C0392B] italic font-normal mt-0.5">
                                  ⚠️ {item.notes}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {item.lockerRoom}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {item.field}
                            </td>
                            <td className="py-2.5 px-2 text-center print:hidden">
                              <button
                                onClick={() => handleRemoveEntry(item.id)}
                                className="text-red-500 hover:text-red-700 font-bold text-base p-1 rounded transition cursor-pointer"
                                title="Rimuovi voce"
                              >
                                &#10006;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notice Box */}
        <div className="border-l-4 border-[#102C57] bg-[#faf9f6] p-4 mt-8 rounded-r-lg text-slate-800 text-xs sm:text-sm">
          <h4 className="font-bold text-[#102C57] text-sm uppercase m-0 mb-2">
            📌 AVVISI E DISPOSIZIONI GENERALI
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
            {DEFAULT_NOTICES.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
