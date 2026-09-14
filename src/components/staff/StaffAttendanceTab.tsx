import React, { useState, useEffect } from 'react';
import { StaffAttendance, StaffEquipment, UserProfile } from '../../types';
import {
  getStaffAttendances,
  saveStaffAttendance,
  deleteStaffAttendance,
  getStaffEquipmentList,
  saveStaffEquipment,
  deleteStaffEquipment
} from '../../services/staffService';
import { fetchStaffUsers } from '../../services/authService';
import { formatDateIT } from '../../utils/formatters';
import {
  CalendarCheck,
  Package,
  Printer,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const StaffAttendanceTab: React.FC = () => {
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [attendances, setAttendances] = useState<StaffAttendance[]>([]);
  const [equipmentList, setEquipmentList] = useState<StaffEquipment[]>([]);
  const [loading, setLoading] = useState(false);

  // Print mode & equipment filter
  const [printTarget, setPrintTarget] = useState<'all' | 'equipment'>('all');
  const [equipmentCoachFilter, setEquipmentCoachFilter] = useState<string>('all');

  // Form states - Attendance
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attCoachId, setAttCoachId] = useState('');
  const [attStatus, setAttStatus] = useState<'Presente' | 'Assente'>('Presente');
  const [attReplacementId, setAttReplacementId] = useState('');
  const [attNotes, setAttNotes] = useState('');
  const [submittingAtt, setSubmittingAtt] = useState(false);

  // Form states - Equipment
  const [eqCoachId, setEqCoachId] = useState('');
  const [eqItemDesc, setEqItemDesc] = useState('');
  const [eqDate, setEqDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submittingEq, setSubmittingEq] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, atts, eqs] = await Promise.all([
        fetchStaffUsers(),
        getStaffAttendances(),
        getStaffEquipmentList()
      ]);
      setStaffUsers(users);
      setAttendances(atts);
      setEquipmentList(eqs);
    } catch (err) {
      console.error('Errore caricamento dati presenze/materiale staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintTarget('all');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintAll = () => {
    setPrintTarget('all');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintEquipment = () => {
    setPrintTarget('equipment');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintTarget('all');
      }, 500);
    }, 150);
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attCoachId) return alert('Seleziona il tecnico!');
    setSubmittingAtt(true);

    try {
      await saveStaffAttendance({
        date: attDate,
        coachId: attCoachId,
        status: attStatus,
        replacementId: attStatus === 'Assente' ? attReplacementId || null : null,
        notes: attNotes.trim()
      });

      alert('Registrazione presenza staff salvata!');
      setAttCoachId('');
      setAttStatus('Presente');
      setAttReplacementId('');
      setAttNotes('');
      loadData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    } finally {
      setSubmittingAtt(false);
    }
  };

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqCoachId || !eqItemDesc.trim()) {
      return alert('Compila tutti i campi obbligatori!');
    }
    setSubmittingEq(true);

    try {
      await saveStaffEquipment({
        coachId: eqCoachId,
        itemDescription: eqItemDesc.trim(),
        date: eqDate
      });

      alert('✅ Assegnazione materiale registrata con successo!');
      setEqCoachId('');
      setEqItemDesc('');
      loadData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    } finally {
      setSubmittingEq(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Eliminare questa voce dallo storico presenze staff?')) return;
    try {
      await deleteStaffAttendance(id);
      loadData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Confermi la restituzione o cancellazione di questo materiale?')) return;
    try {
      await deleteStaffEquipment(id);
      loadData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    }
  };

  const usersMap = staffUsers.reduce((acc, u) => {
    acc[u.uid] = u.name || u.email;
    return acc;
  }, {} as Record<string, string>);

  const filteredEquipmentList = equipmentCoachFilter === 'all'
    ? equipmentList
    : equipmentList.filter((item) => item.coachId === equipmentCoachFilter);

  return (
    <div id="tab-staff-attendance" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
      {/* Header Principale */}
      <div className={`border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${printTarget === 'equipment' ? 'print:hidden' : ''}`}>
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-600" />
            <span>Presenze, Sostituzioni e Materiale Staff</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitoraggio presenze in campo degli allenatori, cambi tecnici e consegna kit materiali.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintAll}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5 self-start sm:self-auto print:hidden cursor-pointer active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Stampa Report Completo</span>
        </button>
      </div>

      {/* Sezione Presenze Staff (nascosta se si stampa solo il modulo materiale) */}
      <div className={`space-y-6 ${printTarget === 'equipment' ? 'print:hidden' : ''}`}>
        {/* Form Presenze Staff */}
        <div className="print:hidden">
          <form
            id="form-staff-attendance"
            onSubmit={handleAttendanceSubmit}
            className="bg-slate-50 p-6 border border-slate-200 rounded-3xl space-y-4"
          >
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>✍️</span>
              <span>Registra Presenza / Assenza Tecnico</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tecnico *
                </label>
                <select
                  required
                  value={attCoachId}
                  onChange={(e) => setAttCoachId(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="">Seleziona tecnico...</option>
                  {staffUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Stato *
                </label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value as 'Presente' | 'Assente')}
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Presente">Presente</option>
                  <option value="Assente">Assente</option>
                </select>
              </div>
            </div>

            {/* Replacement fields (visible when Absent) */}
            {attStatus === 'Assente' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    🔄 Sostituito da (Coach di riserva)
                  </label>
                  <select
                    value={attReplacementId}
                    onChange={(e) => setAttReplacementId(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                  >
                    <option value="">Nessun sostituto / Campo scoperto</option>
                    {staffUsers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Note / Motivo Assenza
                  </label>
                  <input
                    type="text"
                    value={attNotes}
                    onChange={(e) => setAttNotes(e.target.value)}
                    placeholder="es. Motivi personali, influenza..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submittingAtt}
                className="bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition shadow active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {submittingAtt && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Salva Registrazione</span>
              </button>
            </div>
          </form>
        </div>

        {/* Table Storico Presenze Staff */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            📋 Storico Presenze e Sostituzioni Staff ({attendances.length})
          </h4>

          {attendances.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 bg-slate-50 rounded-2xl text-center">
              Nessuna registrazione presente nello storico.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                    <th className="p-3 font-bold">Data</th>
                    <th className="p-3 font-bold">Tecnico</th>
                    <th className="p-3 font-bold">Stato</th>
                    <th className="p-3 font-bold">Sostituito da</th>
                    <th className="p-3 font-bold">Note / Motivo</th>
                    <th className="p-3 font-bold text-center print:hidden">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {attendances.map((item) => {
                    const coachName = usersMap[item.coachId] || 'Tecnico';
                    const repName = item.replacementId ? usersMap[item.replacementId] || 'Sostituto' : '-';
                    const isPresent = item.status === 'Presente';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 whitespace-nowrap font-bold text-slate-600">
                          📅 {formatDateIT(item.date)}
                        </td>
                        <td className="p-3 font-bold text-slate-900">👤 {coachName}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-amber-800">
                          {!isPresent && repName !== '-' ? `🔄 ${repName}` : '-'}
                        </td>
                        <td className="p-3 text-slate-500 italic">
                          {item.notes ? `"${item.notes}"` : '-'}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteAttendance(item.id)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2.5 py-1 bg-white border border-rose-200 rounded-lg shadow-sm transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                            <span>Elimina</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section Materiali Staff */}
      <div className={`border-t border-slate-200 pt-8 space-y-4 ${printTarget === 'equipment' ? 'border-t-0 pt-0' : ''}`}>
        {/* Intestazione Stampa Esclusiva Modulo Materiale */}
        <div className="hidden print:block mb-4 pb-3 border-b-2 border-slate-900">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                SPES MONTESACRO ROMA - REGISTRO CONSEGNA MATERIALE &amp; KIT
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                Modulo ufficiale di presa in carico dotazioni tecniche e abbigliamento sportivo - Stagione 2025/2026
              </p>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-600">
              <p>Data Stampa: {formatDateIT(new Date().toISOString().split('T')[0])}</p>
              {equipmentCoachFilter !== 'all' && (
                <p className="text-indigo-800 font-extrabold mt-0.5">
                  Filtro: {usersMap[equipmentCoachFilter] || 'Tecnico Selezionato'}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-300 text-[9.5px] text-slate-700 leading-snug">
            <strong>DICHIARAZIONE DI RICEVUTA E CUSTODIA:</strong> Ciascun tecnico/allenatore sottoscrittore attesta con la propria firma per esteso la presa in carico del materiale e delle dotazioni indicate, assumendosene la responsabilità per la corretta conservazione e l'impegno alla riconsegna alla Società.
          </div>
        </div>

        {/* Intestazione a Schermo con Controlli Filtro e Stampa Dedicata */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Materiale e Kit Consegnati allo Staff</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                {filteredEquipmentList.length} {filteredEquipmentList.length === 1 ? 'voce' : 'voci'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Traccia borse, palloni, coni, divise e kit assegnati ai singoli tecnici con spazio firma per ricevuta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filtro Tecnico */}
            <select
              value={equipmentCoachFilter}
              onChange={(e) => setEquipmentCoachFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
            >
              <option value="all">Tutti i tecnici ({equipmentList.length})</option>
              {staffUsers.map((u) => {
                const count = equipmentList.filter((eq) => eq.coachId === u.uid).length;
                return (
                  <option key={u.uid} value={u.uid}>
                    {u.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* Pulsante Stampa Modulo Firme Kit */}
            <button
              type="button"
              onClick={handlePrintEquipment}
              title="Stampa il modulo di consegna con lo spazio per la firma di ogni mister"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Modulo Firme Kit</span>
            </button>
          </div>
        </div>

        {/* Equipment Form */}
        <form
          onSubmit={handleEquipmentSubmit}
          className="bg-slate-50 p-5 rounded-3xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tecnico *</label>
            <select
              required
              value={eqCoachId}
              onChange={(e) => setEqCoachId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
            >
              <option value="">Seleziona tecnico...</option>
              {staffUsers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Materiale / Dotazione *</label>
            <input
              type="text"
              required
              value={eqItemDesc}
              onChange={(e) => setEqItemDesc(e.target.value)}
              placeholder="es. Kit Rappresentanza, 10 Palloni nr.4"
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Data Consegna *</label>
            <input
              type="date"
              required
              value={eqDate}
              onChange={(e) => setEqDate(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submittingEq}
              className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submittingEq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Plus className="w-4 h-4" />
              <span>Registra Consegna</span>
            </button>
          </div>
        </form>

        {/* Equipment Table con Spazio Firma per ogni rigo */}
        <div id="equipment-list-container">
          {filteredEquipmentList.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 bg-slate-50 rounded-2xl text-center">
              {equipmentList.length === 0
                ? 'Nessun materiale registrato.'
                : 'Nessun materiale trovato per il tecnico selezionato.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                    <th className="p-3 font-bold w-32 whitespace-nowrap">Data Consegna</th>
                    <th className="p-3 font-bold w-48">Tecnico Assegnatario</th>
                    <th className="p-3 font-bold">Materiale / Dotazione Ricevuta</th>
                    <th className="p-3 font-bold text-center w-56 min-w-[200px]">
                      Firma Mister (Ricevuta)
                    </th>
                    <th className="p-3 font-bold text-center w-36 print:hidden">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredEquipmentList.map((item) => {
                    const coachName = usersMap[item.coachId] || 'Tecnico Sconosciuto';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 whitespace-nowrap font-bold text-slate-600 align-middle">
                          📅 {formatDateIT(item.date)}
                        </td>
                        <td className="p-3 font-bold text-slate-900 align-middle">
                          <span>👤 {coachName}</span>
                        </td>
                        <td className="p-3 text-slate-800 font-medium align-middle">
                          <span className="font-bold text-slate-900">{item.itemDescription}</span>
                        </td>
                        {/* Spazio vuoto per ogni rigo per la firma del mister */}
                        <td className="p-2.5 text-center align-middle">
                          <div className="border border-dashed border-slate-300 print:border-slate-700 bg-slate-50/70 print:bg-white rounded-xl p-2 min-h-[48px] w-full min-w-[180px] flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between text-[8.5px] text-slate-400 print:text-slate-600 font-bold uppercase tracking-wider">
                              <span>Ricevuto da:</span>
                              <span className="truncate max-w-[110px] text-slate-600 print:text-slate-900">{coachName}</span>
                            </div>
                            <div className="border-b-2 border-slate-400 print:border-slate-800 w-full mt-3 mb-1"></div>
                            <div className="text-[9px] text-slate-400 print:text-slate-700 italic text-right font-medium">
                              Firma Mister: _________________
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center print:hidden align-middle">
                          <button
                            onClick={() => handleDeleteEquipment(item.id)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-3 py-1.5 bg-white border border-rose-200 rounded-lg shadow-sm transition hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            <span>Restituito / Elimina</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chiusura Firme Ufficiali per la Stampa */}
        <div className="hidden print:flex justify-between items-end pt-6 mt-6 border-t border-slate-300 text-xs text-slate-700">
          <div>
            <p className="font-bold text-[10.5px] text-slate-800 uppercase tracking-wider">
              Consegnato da (Società / Magazzino):
            </p>
            <div className="w-56 h-9 border-b-2 border-slate-800 mt-2"></div>
            <p className="text-[9px] text-slate-500 mt-1 italic">Firma incaricato Spes Montesacro</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[10.5px] text-slate-800 uppercase tracking-wider">
              Visto del Responsabile Tecnico:
            </p>
            <div className="w-56 h-9 border-b-2 border-slate-800 mt-2 ml-auto"></div>
            <p className="text-[9px] text-slate-500 mt-1 italic">Timbro o firma di convalida</p>
          </div>
        </div>
      </div>
    </div>
  );
};
