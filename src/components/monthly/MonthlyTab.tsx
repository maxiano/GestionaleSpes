import React, { useState, useEffect, useMemo } from 'react';
import { Player, AttendanceSession } from '../../types';
import { getMonthlyAttendances } from '../../services/attendancesService';
import { MONTH_NAMES_IT, DAYS_OF_WEEK_IT } from '../../config/constants';
import { downloadCSV, sendToWhatsApp } from '../../utils/exports';
import { parseDateObj } from '../../utils/formatters';
import {
  BarChart3,
  Calendar,
  FileDown,
  Share2,
  Printer,
  TrendingUp,
  Award
} from 'lucide-react';

interface MonthlyTabProps {
  players: Player[];
  activeTeamId: string;
}

export const MonthlyTab: React.FC<MonthlyTabProps> = ({ players, activeTeamId }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMonthly = async () => {
      if (!activeTeamId) return;
      setLoading(true);
      try {
        const list = await getMonthlyAttendances(activeTeamId, selectedYear, selectedMonth);
        if (isMounted) setSessions(list);
      } catch (err) {
        console.error('Errore caricamento registro mensile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMonthly();
    return () => {
      isMounted = false;
    };
  }, [activeTeamId, selectedMonth, selectedYear]);

  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Map sessions by day number
  const sessionsByDay = useMemo(() => {
    const map: Record<number, AttendanceSession> = {};
    sessions.forEach((s) => {
      const dObj = parseDateObj(s.date);
      if (dObj.getMonth() === selectedMonth && dObj.getFullYear() === selectedYear) {
        map[dObj.getDate()] = s;
      }
    });
    return map;
  }, [sessions, selectedMonth, selectedYear]);

  // Statistics
  const { totalPresents, avgPresents } = useMemo(() => {
    let presents = 0;
    sessions.forEach((s) => {
      const recs = s.records || s.record || s.presenze || [];
      presents += recs.filter((r) => r.status === 'present' || r.status === 'late').length;
    });
    const avg = sessions.length > 0 ? (presents / sessions.length).toFixed(1) : '0';
    return { totalPresents: presents, avgPresents: avg };
  }, [sessions]);

  // Export CSV
  const handleExportCSV = () => {
    if (!activeTeamId) return alert('Seleziona prima una squadra!');
    let csv = `Registro Presenze - ${activeTeamId} - ${MONTH_NAMES_IT[selectedMonth]} ${selectedYear}\n\nGiocatore;`;
    for (let d = 1; d <= totalDaysInMonth; d++) csv += `${d};`;
    csv += '\n';

    players.forEach((player) => {
      const displayName = player.lastName
        ? `${player.lastName} ${player.firstName}`
        : player.name || 'Atleta';
      csv += `"${displayName}";`;

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const session = sessionsByDay[d];
        let val = '-';
        if (session) {
          const recs = session.records || session.record || session.presenze || [];
          const rec = recs.find((r) => r.playerId === player.id || r.id === player.id);
          if (rec) {
            const map: Record<string, string> = {
              present: 'P',
              absent: 'A',
              justified: 'AG',
              injured: 'INF',
              late: 'R'
            };
            val = map[rec.status] || '-';
          }
        }
        csv += `${val};`;
      }
      csv += '\n';
    });

    downloadCSV(
      `Presenze_${activeTeamId}_${MONTH_NAMES_IT[selectedMonth]}_${selectedYear}.csv`,
      csv
    );
  };

  // WhatsApp formatted table summary
  const handleShareWhatsApp = () => {
    if (!activeTeamId) return;

    let text = `📊 *RIEPILOGO PRESENZE - ${activeTeamId}*\n📅 *${MONTH_NAMES_IT[selectedMonth]} ${selectedYear}*\n\n`;

    // Filter active days with training
    const activeDays: number[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      if (sessionsByDay[d]) activeDays.push(d);
    }

    if (activeDays.length === 0) {
      text += 'Nessun allenamento registrato in questo mese.';
      sendToWhatsApp(text, `Registro ${MONTH_NAMES_IT[selectedMonth]}`);
      return;
    }

    text += '```\n';
    text += ''.padEnd(10, ' ') + '|';
    activeDays.forEach((d) => {
      text += String(d).padStart(3, ' ') + ' ';
    });
    text += '\n';

    players.forEach((p) => {
      const lastName = (p.lastName || p.name || 'Atleta').split(' ')[0];
      text += lastName.substring(0, 10).padEnd(10, ' ') + '|';

      activeDays.forEach((d) => {
        const session = sessionsByDay[d];
        let val = ' . ';
        if (session) {
          const recs = session.records || session.record || session.presenze || [];
          const rec = recs.find((r) => r.playerId === p.id || r.id === p.id);
          if (rec) {
            const map: Record<string, string> = {
              present: ' P ',
              absent: ' A ',
              justified: 'AG ',
              injured: 'INF',
              late: ' R '
            };
            val = map[rec.status] || ' . ';
          }
        }
        text += val + ' ';
      });
      text += '\n';
    });
    text += '```';

    sendToWhatsApp(text, `Registro ${MONTH_NAMES_IT[selectedMonth]}`);
  };

  const handlePrint = () => {
    document.body.classList.add('print-landscape');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-landscape');
    }, 500);
  };

  return (
    <div id="tab-monthly" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-6 border-b border-slate-100 pb-5 print:hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Registro Mensile Allenamenti
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Legenda: P = Presente | A = Assente | AG = Giustificato | INF = Infortunato | R = Ritardo
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month / Year Select */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            <select
              id="filter-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold shadow-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {MONTH_NAMES_IT.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              id="filter-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold shadow-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="hover:bg-slate-100 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-bold transition border border-slate-200 shadow-sm flex items-center gap-1.5"
            title="Esporta foglio mensile in CSV"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Stampa</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        id="monthly-stats-bar"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 text-center text-xs print:hidden"
      >
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Sedute Mese</span>
          </div>
          <p id="stat-total-sessions" className="text-2xl font-black text-slate-900 mt-1">
            {sessions.length}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Presenze Totali</span>
          </div>
          <p id="stat-total-presents" className="text-2xl font-black text-emerald-700 mt-1">
            {totalPresents}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Media Presenze / Seduta</span>
          </div>
          <p id="stat-avg-presents" className="text-2xl font-black text-blue-700 mt-1">
            {avgPresents}
          </p>
        </div>
      </div>

      {/* Grid Attendance Table */}
      <div id="monthly-sessions-container" className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border border-slate-300 bg-white">
          <thead>
            {/* Days of week header */}
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-300 p-1.5 text-left sticky left-0 bg-slate-100 z-10 min-w-[140px]">
                Giocatore
              </th>
              {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((d) => {
                const dateObj = new Date(selectedYear, selectedMonth, d);
                const dayName = DAYS_OF_WEEK_IT[dateObj.getDay()];
                const isSession = !!sessionsByDay[d];
                return (
                  <th
                    key={`dayname-${d}`}
                    className={`border border-slate-300 p-1 text-center capitalize text-[10px] ${
                      isSession ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'
                    }`}
                  >
                    {dayName}
                  </th>
                );
              })}
            </tr>

            {/* Day numbers header */}
            <tr className="bg-slate-200 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-left sticky left-0 bg-slate-200 z-10 font-black">
                Cognome e Nome
              </th>
              {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((d) => {
                const isSession = !!sessionsByDay[d];
                return (
                  <th
                    key={`daynum-${d}`}
                    className={`border border-slate-300 p-1 text-center font-bold ${
                      isSession ? 'bg-slate-300 text-black' : 'text-slate-600'
                    }`}
                  >
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td
                  colSpan={totalDaysInMonth + 1}
                  className="text-center p-6 text-slate-400 italic"
                >
                  Nessun giocatore in rosa.
                </td>
              </tr>
            ) : (
              players.map((player) => {
                const displayName = player.lastName
                  ? `${player.lastName} ${player.firstName}`
                  : player.name || 'Atleta';

                return (
                  <tr key={player.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 p-1.5 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-white z-10">
                      {displayName}
                    </td>

                    {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((d) => {
                      const session = sessionsByDay[d];
                      let symbol = '-';
                      let colorClass = 'text-slate-300';

                      if (session) {
                        const recs = session.records || session.record || session.presenze || [];
                        const rec = recs.find(
                          (r) => r.playerId === player.id || r.id === player.id
                        );

                        if (rec) {
                          switch (rec.status) {
                            case 'present':
                              symbol = 'P';
                              colorClass = 'text-emerald-700 font-bold bg-emerald-50';
                              break;
                            case 'absent':
                              symbol = 'A';
                              colorClass = 'text-rose-600 font-bold bg-rose-50';
                              break;
                            case 'justified':
                              symbol = 'AG';
                              colorClass = 'text-amber-600 font-bold bg-amber-50';
                              break;
                            case 'injured':
                              symbol = 'INF';
                              colorClass = 'text-purple-600 font-bold bg-purple-50';
                              break;
                            case 'late':
                              symbol = 'R';
                              colorClass = 'text-blue-600 font-bold bg-blue-50';
                              break;
                          }
                        }
                      }

                      return (
                        <td
                          key={`cell-${player.id}-${d}`}
                          className={`border border-slate-300 p-1 text-center ${colorClass}`}
                        >
                          {symbol}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
