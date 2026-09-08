import React, { useState, useEffect, useRef } from 'react';
import { FieldTrainingPlan, FieldTrainingZone } from '../../types';
import {
  getFieldTrainingPlans,
  saveFieldTrainingPlans,
  DEFAULT_ZONES
} from '../../services/fieldPlannerService';
import { CATEGORIES_LIST, DAYS_ORDER } from '../../services/lockerRoomsService';
import { fetchStaffUsers } from '../../services/authService';
import { ClubLogo } from '../common/ClubLogo';
import {
  Save,
  RotateCcw,
  Printer,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  User,
  LayoutGrid,
  ChevronDown,
  Trash2,
  Plus
} from 'lucide-react';

const TIME_PRESETS = [
  '15:00 - 16:30',
  '16:30 - 18:00',
  '17:00 - 18:30',
  '18:00 - 19:30',
  '18:30 - 20:00',
  '19:30 - 21:00'
];

export const FieldDiagramTab: React.FC = () => {
  const [plans, setPlans] = useState<FieldTrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [day, setDay] = useState<string>('Lunedì');
  const [time, setTime] = useState<string>('17:00 - 18:30');
  const [notes, setNotes] = useState<string>('');
  const [zones, setZones] = useState<FieldTrainingPlan['zones']>(DEFAULT_ZONES);

  const [staffList, setStaffList] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const diagramRef = useRef<HTMLDivElement>(null);

  // Load existing plans and staff coaches
  useEffect(() => {
    async function init() {
      try {
        const loadedPlans = await getFieldTrainingPlans();
        setPlans(loadedPlans);
        if (loadedPlans.length > 0) {
          const first = loadedPlans[0];
          setSelectedPlanId(first.id);
          setDay(first.day);
          setTime(first.time);
          setNotes(first.notes || '');
          setZones(first.zones);
        }
      } catch (err) {
        console.error('Errore caricamento schemi campi:', err);
      }

      try {
        const staff = await fetchStaffUsers();
        const names = staff.map((s) => s.name).filter(Boolean);
        setStaffList(names);
      } catch (err) {
        console.warn('Errore lettura lista staff:', err);
      }
    }
    init();
  }, []);

  // When changing selected plan from dropdown
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const found = plans.find((p) => p.id === planId);
    if (found) {
      setDay(found.day);
      setTime(found.time);
      setNotes(found.notes || '');
      setZones(found.zones);
    }
  };

  // Update a single zone
  const updateZone = (zoneKey: keyof FieldTrainingPlan['zones'], field: keyof FieldTrainingZone, value: string) => {
    setZones((prev) => ({
      ...prev,
      [zoneKey]: {
        ...prev[zoneKey],
        [field]: value
      }
    }));
  };

  // Create new blank plan
  const handleNewPlan = () => {
    const newId = `plan-${Date.now()}`;
    setSelectedPlanId(newId);
    setZones({
      sideLeft: { team: '', coach: '', notes: '' },
      sideRight: { team: '', coach: '', notes: '' },
      topLeft: { team: '', coach: '', notes: '' },
      topRight: { team: '', coach: '', notes: '' },
      centerLeft: { team: '', coach: '', notes: '' },
      centerRight: { team: '', coach: '', notes: '' }
    });
    setNotes('');
  };

  // Save current plan
  const handleSavePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const planId = selectedPlanId || `plan-${day.toLowerCase().replace(/[^a-z0-9]/g, '')}-${time.replace(/[^a-z0-9]/gi, '')}-${Date.now()}`;

    const currentPlan: FieldTrainingPlan = {
      id: planId,
      day,
      time,
      notes,
      zones,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = plans.findIndex((p) => p.id === planId);
    let updatedPlans: FieldTrainingPlan[];
    if (existingIndex >= 0) {
      updatedPlans = [...plans];
      updatedPlans[existingIndex] = currentPlan;
    } else {
      updatedPlans = [currentPlan, ...plans];
    }

    try {
      await saveFieldTrainingPlans(updatedPlans);
      setPlans(updatedPlans);
      setSelectedPlanId(planId);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  // Delete current plan
  const handleDeleteCurrentPlan = async () => {
    if (!selectedPlanId) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo schema di allenamento?')) return;

    const filtered = plans.filter((p) => p.id !== selectedPlanId);
    try {
      await saveFieldTrainingPlans(filtered);
      setPlans(filtered);
      if (filtered.length > 0) {
        handleSelectPlan(filtered[0].id);
      } else {
        handleNewPlan();
      }
    } catch (err) {
      console.error(err);
      alert('Errore eliminazione schema.');
    }
  };

  // Print diagram
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="tab-field-diagram" className="tab-content space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <LayoutGrid className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Schema Campi Allenamento
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Disposizione geometrica delle zone di allenamento con porte sui lati minori, squadre e mister assegnati.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleNewPlan}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Crea nuovo schema vuoto"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Nuovo Schema</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Stampa schema campi"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Stampa / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSavePlan}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvataggio...' : 'Salva Schema'}</span>
            </button>
          </div>
        </div>

        {/* Status alerts */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 print:hidden animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Schema salvato con successo nel database del club!</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl print:hidden">
            {saveError}
          </div>
        )}

        {/* Form Controls: Giorno, Orario, Selettore Schemi */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 print:bg-white print:border-none print:p-0">
          {/* Selettore Piani Salvati (se presenti) */}
          {plans.length > 0 && (
            <div className="md:col-span-4 print:hidden">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                <span>Carica Schema Salvato</span>
              </label>
              <div className="relative">
                <select
                  value={selectedPlanId}
                  onChange={(e) => handleSelectPlan(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none pr-8 appearance-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.day} ({p.time}) {p.notes ? `- ${p.notes.substring(0, 20)}...` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Giorno */}
          <div className={plans.length > 0 ? 'md:col-span-4' : 'md:col-span-6'}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Giorno di Allenamento *</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 print:hidden">
              {DAYS_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition ${
                    day === d
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.substring(0, 3)}
                </button>
              ))}
            </div>
            <input
              type="text"
              id="field-plan-day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="es. Lunedì"
              className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Orario */}
          <div className={plans.length > 0 ? 'md:col-span-4' : 'md:col-span-6'}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Orario / Fascia Oraria *</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 print:hidden">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                    time === t
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              id="field-plan-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="es. 17:00 - 18:30"
              className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Note opzionali */}
          <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Note o Indicazioni Seduta (Opzionali)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="es. Riscaldamento a secco lato gradinata, rotazione spazi a metà seduta"
                className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {selectedPlanId && plans.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteCurrentPlan}
                className="self-end text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-rose-200 print:hidden cursor-pointer shrink-0"
                title="Elimina questo schema"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Elimina Schema</span>
              </button>
            )}
          </div>
        </div>

        {/* Print Header (Only visible when printing) */}
        <div className="hidden print:block mb-4 text-center border-b-2 border-slate-900 pb-3">
          <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
            SPES Montesacro - Disposizione Campi di Allenamento
          </h1>
          <p className="text-sm font-bold text-slate-700 mt-1">
            Giorno: <span className="underline">{day}</span> | Orario: <span className="underline">{time}</span>
            {notes && ` | Note: ${notes}`}
          </p>
        </div>

        {/* Datalists for team and mister autocomplete */}
        <datalist id="category-suggestions">
          {CATEGORIES_LIST.map((c) => (
            <option key={c} value={c} />
          ))}
          <option value="Primi Calci" />
          <option value="Piccoli Amici" />
          <option value="Esordienti" />
          <option value="Giovanissimi" />
          <option value="Allievi" />
          <option value="Settore Portieri" />
          <option value="Under 14" />
          <option value="Under 15" />
          <option value="Under 16" />
          <option value="Under 17" />
          <option value="Under 19" />
          <option value="Prima Squadra" />
        </datalist>

        <datalist id="coach-suggestions">
          {staffList.map((st) => (
            <option key={st} value={st} />
          ))}
        </datalist>

        {/* ========================================================================= */}
        {/* COMPLESSO CAMPI: STRUTTURA GEOMETRICA RICHIESTA                          */}
        {/* 1. Rettangolo più grande centrale diviso a metà da una linea verticale   */}
        {/* 2. Due rettangoli di uguale dimensione costruiti sul lato superiore       */}
        {/* 3. Due rettangoli di lato maggiore uguale al lato minore del rettangolo   */}
        {/*    più grande costruiti ognuno sul lato minore del rettangolo più grande */}
        {/* 4. Porte di calcio costruite sui lati minori di tutti i rettangoli        */}
        {/* ========================================================================= */}
        <div className="mt-8 overflow-x-auto pb-4" ref={diagramRef}>
          <div className="min-w-[780px] max-w-[980px] mx-auto p-4 sm:p-6 bg-slate-900/95 rounded-3xl border border-slate-800 shadow-2xl relative select-none">
            {/* Field Complex Header Badge */}
            <div className="flex items-center justify-between text-white/90 text-xs font-bold mb-4 px-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow">
                  <ClubLogo className="w-full h-full object-contain text-slate-900" />
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="tracking-wider uppercase text-slate-200 text-[11px] font-black">
                  SPES Montesacro - Schema Tattico Spazi
                </span>
              </div>
              <div className="text-emerald-400 font-mono text-xs">
                {day} • {time}
              </div>
            </div>

            {/* Complex Grid Layout */}
            <div className="flex flex-col items-center">
              {/* RIGA 1: SUPERIORE */}
              {/* Composta da: Spazio vuoto a SX (largo come il rettangolo laterale SX) */}
              {/* + 2 Rettangoli di uguale dimensione sul lato superiore del centrale */}
              {/* + Spazio vuoto a DX (largo come il rettangolo laterale DX) */}
              <div className="flex items-end justify-center w-full">
                {/* Spazio vuoto sopra il rettangolo laterale sinistro */}
                <div className="w-[180px] shrink-0"></div>

                {/* I DUE RETTANGOLI SUPERIORI (costruiti sul lato superiore del rettangolo grande centrale) */}
                <div className="flex w-[560px] shrink-0">
                  {/* RETTANGOLO SUPERIORE SX */}
                  <div className="w-[280px] h-[170px] relative bg-emerald-700 border-2 border-white/90 shadow-inner flex flex-col justify-between p-2.5 group overflow-hidden">
                    {/* Erba a strisce verticali sottili */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(90deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                    {/* Cerchio di centrocampo o cerchio tattico */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/60 pointer-events-none"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/60 pointer-events-none"></div>

                    {/* PORTE DI CALCIO SUI LATI MINORI (LATO SINISTRO e LATO DESTRO del rettangolo superiore) */}
                    {/* Porta Lato Sinistro (Minor Side SX) */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[11px] w-[12px] h-[48px] bg-white border border-slate-400 rounded-l shadow z-10 flex items-center justify-center"
                      title="Porta di Calcio (Lato Minore SX)"
                    >
                      <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                    </div>
                    {/* Area di porta SX */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-20 border-r border-t border-b border-white/70 pointer-events-none"></div>

                    {/* Porta Lato Destro (Minor Side DX) */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[11px] w-[12px] h-[48px] bg-white border border-slate-400 rounded-r shadow z-10 flex items-center justify-center"
                      title="Porta di Calcio (Lato Minore DX)"
                    >
                      <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                    </div>
                    {/* Area di porta DX */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-20 border-l border-t border-b border-white/70 pointer-events-none"></div>

                    {/* Etichetta Zona & Input */}
                    <div className="relative z-20 flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-wider text-emerald-100 bg-emerald-900/80 px-2 py-0.5 rounded shadow border border-emerald-500/40">
                        CAMPO SUPERIORE SX
                      </span>
                    </div>

                    <div className="relative z-20 space-y-1.5 my-auto bg-slate-900/85 backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-lg">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                          <Users className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Squadra / Categoria</span>
                        </div>
                        <input
                          type="text"
                          list="category-suggestions"
                          tabIndex={1}
                          value={zones.topLeft.team}
                          onChange={(e) => updateZone('topLeft', 'team', e.target.value)}
                          placeholder="es. 2017"
                          className="w-full bg-white text-slate-900 font-black text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                          <User className="w-2.5 h-2.5 text-amber-400" />
                          <span>Mister</span>
                        </div>
                        <input
                          type="text"
                          list="coach-suggestions"
                          tabIndex={2}
                          value={zones.topLeft.coach}
                          onChange={(e) => updateZone('topLeft', 'coach', e.target.value)}
                          placeholder="es. Mister Rossi"
                          className="w-full bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RETTANGOLO SUPERIORE DX */}
                  <div className="w-[280px] h-[170px] relative bg-emerald-700 border-2 border-l-0 border-white/90 shadow-inner flex flex-col justify-between p-2.5 group overflow-hidden">
                    {/* Erba a strisce verticali sottili */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(90deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                    {/* Cerchio o linee campo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/60 pointer-events-none"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/60 pointer-events-none"></div>

                    {/* PORTE DI CALCIO SUI LATI MINORI (LATO SINISTRO e LATO DESTRO) */}
                    {/* Porta Lato Sinistro */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[11px] w-[12px] h-[48px] bg-white border border-slate-400 rounded-l shadow z-10 flex items-center justify-center"
                      title="Porta di Calcio (Lato Minore SX)"
                    >
                      <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-20 border-r border-t border-b border-white/70 pointer-events-none"></div>

                    {/* Porta Lato Destro */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[11px] w-[12px] h-[48px] bg-white border border-slate-400 rounded-r shadow z-10 flex items-center justify-center"
                      title="Porta di Calcio (Lato Minore DX)"
                    >
                      <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-20 border-l border-t border-b border-white/70 pointer-events-none"></div>

                    {/* Etichetta Zona & Input */}
                    <div className="relative z-20 flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-wider text-emerald-100 bg-emerald-900/80 px-2 py-0.5 rounded shadow border border-emerald-500/40">
                        CAMPO SUPERIORE DX
                      </span>
                    </div>

                    <div className="relative z-20 space-y-1.5 my-auto bg-slate-900/85 backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-lg">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                          <Users className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Squadra / Categoria</span>
                        </div>
                        <input
                          type="text"
                          list="category-suggestions"
                          tabIndex={3}
                          value={zones.topRight.team}
                          onChange={(e) => updateZone('topRight', 'team', e.target.value)}
                          placeholder="es. 2018"
                          className="w-full bg-white text-slate-900 font-black text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                          <User className="w-2.5 h-2.5 text-amber-400" />
                          <span>Mister</span>
                        </div>
                        <input
                          type="text"
                          list="coach-suggestions"
                          tabIndex={4}
                          value={zones.topRight.coach}
                          onChange={(e) => updateZone('topRight', 'coach', e.target.value)}
                          placeholder="es. Mister Ferrari"
                          className="w-full bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spazio vuoto sopra il rettangolo laterale destro */}
                <div className="w-[180px] shrink-0"></div>
              </div>

              {/* RIGA 2: RETTANGOLO LATERALE SX + RETTANGOLO GRANDE CENTRALE + RETTANGOLO LATERALE DX */}
              <div className="flex items-start justify-center w-full">
                {/* 1. RETTANGOLO LATERALE SINISTRO */}
                {/* "costruito sul lato minore del rettangolo più grande, di lato maggiore uguale al lato minore del rettangolo più grande" */}
                {/* Il lato minore del rettangolo centrale è la sua altezza H = 280px. Quindi questo rettangolo ha altezza 280px e larghezza 180px (lato minore)! */}
                <div className="w-[180px] h-[280px] relative bg-emerald-800 border-2 border-white/90 shadow-inner flex flex-col justify-between p-2.5 group overflow-hidden">
                  {/* Erba a strisce orizzontali */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(0deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                  {/* Linea di metà campo orizzontale e cerchio */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/60 pointer-events-none"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/60 pointer-events-none"></div>

                  {/* PORTE DI CALCIO SUI LATI MINORI: Essendo un rettangolo verticale (lato maggiore = altezza 280px), i suoi lati minori sono LATO SUPERIORE e LATO INFERIORE! */}
                  {/* Porta Lato Superiore (Minor Side Top) */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[11px] w-[50px] h-[12px] bg-white border border-slate-400 rounded-t shadow z-10 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore Superiore)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                  </div>
                  {/* Area porta superiore */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-b border-l border-r border-white/70 pointer-events-none"></div>

                  {/* Porta Lato Inferiore (Minor Side Bottom) */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[11px] w-[50px] h-[12px] bg-white border border-slate-400 rounded-b shadow z-10 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore Inferiore)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                  </div>
                  {/* Area porta inferiore */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-t border-l border-r border-white/70 pointer-events-none"></div>

                  {/* Etichetta Zona & Input */}
                  <div className="relative z-20 flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider text-emerald-100 bg-emerald-950/80 px-2 py-0.5 rounded shadow border border-emerald-500/40">
                      CAMPO LATERALE SX
                    </span>
                  </div>

                  <div className="relative z-20 space-y-1.5 my-auto bg-slate-900/85 backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-lg">
                    <div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                        <Users className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Squadra</span>
                      </div>
                      <input
                        type="text"
                        list="category-suggestions"
                        tabIndex={5}
                        value={zones.sideLeft.team}
                        onChange={(e) => updateZone('sideLeft', 'team', e.target.value)}
                        placeholder="es. 2019"
                        className="w-full bg-white text-slate-900 font-black text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                        <User className="w-2.5 h-2.5 text-amber-400" />
                        <span>Mister</span>
                      </div>
                      <input
                        type="text"
                        list="coach-suggestions"
                        tabIndex={6}
                        value={zones.sideLeft.coach}
                        onChange={(e) => updateZone('sideLeft', 'coach', e.target.value)}
                        placeholder="es. Mister De Luca"
                        className="w-full bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. RETTANGOLO PIÙ GRANDE CENTRALE */}
                {/* Dimensioni: 560px x 280px. Diviso a metà da una linea sottile verticale */}
                <div className="w-[560px] h-[280px] relative bg-emerald-600 border-2 border-l-0 border-r-0 border-white/95 shadow-2xl flex overflow-hidden">
                  {/* Erba a strisce alternate realistiche */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(90deg,#000_0,#000_35px,transparent_35px,transparent_70px)]"></div>

                  {/* Cerchio di centrocampo del campo centrale */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/70 pointer-events-none"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white pointer-events-none"></div>

                  {/* LINEA SOTTILE VERTICALE CHE DIVIDE IL RETTANGOLO A METÀ */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white shadow pointer-events-none z-10"></div>

                  {/* PORTE DI CALCIO SUI LATI MINORI DEL RETTANGOLO PIÙ GRANDE (LATO SINISTRO e LATO DESTRO) */}
                  {/* Porta Lato Sinistro (Minor Side SX del campo centrale) */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[12px] w-[14px] h-[64px] bg-white border-2 border-slate-400 rounded-l shadow-lg z-20 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore SX del Campo Centrale)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:4px_4px] opacity-80"></div>
                  </div>
                  {/* Area di rigore SX */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-36 border-r-2 border-t-2 border-b-2 border-white/70 pointer-events-none"></div>

                  {/* Porta Lato Destro (Minor Side DX del campo centrale) */}
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[12px] w-[14px] h-[64px] bg-white border-2 border-slate-400 rounded-r shadow-lg z-20 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore DX del Campo Centrale)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:4px_4px] opacity-80"></div>
                  </div>
                  {/* Area di rigore DX */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-36 border-l-2 border-t-2 border-b-2 border-white/70 pointer-events-none"></div>

                  {/* METÀ SINISTRA DEL CAMPO CENTRALE */}
                  <div className="w-[280px] h-full relative z-20 flex flex-col justify-between p-3.5 pr-4 border-r border-dashed border-white/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-wider text-white bg-slate-900/80 px-2.5 py-0.5 rounded-md shadow border border-emerald-400/40">
                        CAMPO CENTRALE - METÀ SX
                      </span>
                    </div>

                    <div className="space-y-2 my-auto bg-slate-900/85 backdrop-blur-sm p-3 rounded-2xl border border-white/20 shadow-xl max-w-[240px] mx-auto w-full">
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>Squadra / Categoria</span>
                        </div>
                        <input
                          type="text"
                          list="category-suggestions"
                          tabIndex={7}
                          value={zones.centerLeft.team}
                          onChange={(e) => updateZone('centerLeft', 'team', e.target.value)}
                          placeholder="es. 2016"
                          className="w-full bg-white text-slate-900 font-black text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                          <User className="w-3 h-3 text-amber-400" />
                          <span>Mister</span>
                        </div>
                        <input
                          type="text"
                          list="coach-suggestions"
                          tabIndex={8}
                          value={zones.centerLeft.coach}
                          onChange={(e) => updateZone('centerLeft', 'coach', e.target.value)}
                          placeholder="es. Mister Romano"
                          className="w-full bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* METÀ DESTRA DEL CAMPO CENTRALE */}
                  <div className="w-[280px] h-full relative z-20 flex flex-col justify-between p-3.5 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-wider text-white bg-slate-900/80 px-2.5 py-0.5 rounded-md shadow border border-emerald-400/40">
                        CAMPO CENTRALE - METÀ DX
                      </span>
                    </div>

                    <div className="space-y-2 my-auto bg-slate-900/85 backdrop-blur-sm p-3 rounded-2xl border border-white/20 shadow-xl max-w-[240px] mx-auto w-full">
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>Squadra / Categoria</span>
                        </div>
                        <input
                          type="text"
                          list="category-suggestions"
                          tabIndex={9}
                          value={zones.centerRight.team}
                          onChange={(e) => updateZone('centerRight', 'team', e.target.value)}
                          placeholder="es. 2014"
                          className="w-full bg-white text-slate-900 font-black text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase">
                          <User className="w-3 h-3 text-amber-400" />
                          <span>Mister</span>
                        </div>
                        <input
                          type="text"
                          list="coach-suggestions"
                          tabIndex={10}
                          value={zones.centerRight.coach}
                          onChange={(e) => updateZone('centerRight', 'coach', e.target.value)}
                          placeholder="es. Mister Conti"
                          className="w-full bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. RETTANGOLO LATERALE DESTRO */}
                {/* "costruito sul lato minore del rettangolo più grande, di lato maggiore uguale al lato minore del rettangolo più grande" */}
                {/* Lato maggiore = 280px (uguale al lato minore del rettangolo centrale), lato minore = 180px */}
                <div className="w-[180px] h-[280px] relative bg-emerald-800 border-2 border-white/90 shadow-inner flex flex-col justify-between p-2.5 group overflow-hidden">
                  {/* Erba a strisce orizzontali */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(0deg,#000_0,#000_20px,transparent_20px,transparent_40px)]"></div>

                  {/* Linea di metà campo orizzontale e cerchio */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/60 pointer-events-none"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/60 pointer-events-none"></div>

                  {/* PORTE DI CALCIO SUI LATI MINORI: LATO SUPERIORE e LATO INFERIORE */}
                  {/* Porta Lato Superiore (Minor Side Top) */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[11px] w-[50px] h-[12px] bg-white border border-slate-400 rounded-t shadow z-10 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore Superiore)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-b border-l border-r border-white/70 pointer-events-none"></div>

                  {/* Porta Lato Inferiore (Minor Side Bottom) */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[11px] w-[50px] h-[12px] bg-white border border-slate-400 rounded-b shadow z-10 flex items-center justify-center"
                    title="Porta di Calcio (Lato Minore Inferiore)"
                  >
                    <div className="w-full h-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:3px_3px] opacity-70"></div>
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-t border-l border-r border-white/70 pointer-events-none"></div>

                  {/* Etichetta Zona & Input */}
                  <div className="relative z-20 flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider text-emerald-100 bg-emerald-950/80 px-2 py-0.5 rounded shadow border border-emerald-500/40">
                      CAMPO LATERALE DX
                    </span>
                  </div>

                  <div className="relative z-20 space-y-1.5 my-auto bg-slate-900/85 backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-lg">
                    <div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                        <Users className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Squadra</span>
                      </div>
                      <input
                        type="text"
                        list="category-suggestions"
                        tabIndex={11}
                        value={zones.sideRight.team}
                        onChange={(e) => updateZone('sideRight', 'team', e.target.value)}
                        placeholder="es. 2020/21"
                        className="w-full bg-white text-slate-900 font-black text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                        <User className="w-2.5 h-2.5 text-amber-400" />
                        <span>Mister</span>
                      </div>
                      <input
                        type="text"
                        list="coach-suggestions"
                        tabIndex={12}
                        value={zones.sideRight.coach}
                        onChange={(e) => updateZone('sideRight', 'coach', e.target.value)}
                        placeholder="es. Mister Bianchi"
                        className="w-full bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legenda Porte di Calcio */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 px-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-2 bg-white border border-slate-400 rounded-sm inline-block shadow-sm"></span>
                  <span className="font-semibold text-slate-300">Porte di calcio sui lati minori</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-white inline-block"></span>
                  <span>Linea divisoria campo centrale</span>
                </span>
              </div>
              <div className="italic text-slate-500 text-[10px]">
                💡 Premi [Tab] per passare rapidamente tra tutti i campi squadra e mister.
              </div>
            </div>
          </div>
        </div>

        {/* Tabella riassuntiva stampabile (Print summary table) */}
        <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-200 print:bg-white print:border-none print:p-0">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
            <span>Riepilogo Assegnazione Spazi ({day} - {time})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-2 border border-slate-700">Zona / Spazio Campo</th>
                  <th className="p-2 border border-slate-700">Posizione Geometrica</th>
                  <th className="p-2 border border-slate-700">Porte Presenti</th>
                  <th className="p-2 border border-slate-700">Squadra Assegnata</th>
                  <th className="p-2 border border-slate-700">Mister / Allenatore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-100">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Laterale SX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Lato minore sinistro del campo centrale</td>
                  <td className="p-2 text-slate-600 border border-slate-200">2 porte (lato superiore &amp; inferiore)</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.sideLeft.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.sideLeft.coach || '-'}</td>
                </tr>
                <tr className="hover:bg-slate-100">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Superiore SX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Lato superiore del campo centrale (metà SX)</td>
                  <td className="p-2 text-slate-600 border border-slate-200">2 porte (lato sinistro &amp; destro)</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.topLeft.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.topLeft.coach || '-'}</td>
                </tr>
                <tr className="hover:bg-slate-100">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Superiore DX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Lato superiore del campo centrale (metà DX)</td>
                  <td className="p-2 text-slate-600 border border-slate-200">2 porte (lato sinistro &amp; destro)</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.topRight.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.topRight.coach || '-'}</td>
                </tr>
                <tr className="hover:bg-slate-100 bg-emerald-50/50">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Centrale - Metà SX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Rettangolo grande centrale (sinistra)</td>
                  <td className="p-2 text-slate-600 border border-slate-200">1 porta regolamentare SX</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.centerLeft.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.centerLeft.coach || '-'}</td>
                </tr>
                <tr className="hover:bg-slate-100 bg-emerald-50/50">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Centrale - Metà DX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Rettangolo grande centrale (destra)</td>
                  <td className="p-2 text-slate-600 border border-slate-200">1 porta regolamentare DX</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.centerRight.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.centerRight.coach || '-'}</td>
                </tr>
                <tr className="hover:bg-slate-100">
                  <td className="p-2 font-bold text-emerald-900 border border-slate-200">Campo Laterale DX</td>
                  <td className="p-2 text-slate-600 border border-slate-200">Lato minore destro del campo centrale</td>
                  <td className="p-2 text-slate-600 border border-slate-200">2 porte (lato superiore &amp; inferiore)</td>
                  <td className="p-2 font-black text-slate-900 border border-slate-200">{zones.sideRight.team || '-'}</td>
                  <td className="p-2 font-semibold text-slate-800 border border-slate-200">{zones.sideRight.coach || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
