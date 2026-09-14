import React, { useState, useEffect } from 'react';
import { UserProfile, Player, Callup, AttendanceSession } from '../../types';
import {
  getPlayerById,
  getPlayersByTeam,
  getAllPlayers
} from '../../services/playersService';
import {
  getAllActiveCallups,
  respondToCallup,
  getPermanentMatchHistory
} from '../../services/callupsService';
import {
  getAttendancesByTeam,
  submitParentCustomTraining
} from '../../services/attendancesService';
import { MONTH_NAMES_IT } from '../../config/constants';
import { formatDateIT, parseDateObj, arePhonesMatching } from '../../utils/formatters';
import { exportParentsToExcelFile, downloadCSV } from '../../utils/exports';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Calendar,
  MapPin,
  Clock,
  Download,
  Check,
  X,
  Baby,
  ChevronDown
} from 'lucide-react';

interface ParentPortalProps {
  userProfile: UserProfile;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ userProfile }) => {
  const [childIds, setChildIds] = useState<string[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [childrenMap, setChildrenMap] = useState<Record<string, Player>>({});
  const [activeTab, setActiveTab] = useState<'trainings' | 'matches'>('trainings');
  const [loading, setLoading] = useState(true);

  // Data for active child
  const [activeMatches, setActiveMatches] = useState<Callup[]>([]);
  const [pastMatches, setPastMatches] = useState<any[]>([]);
  const [trainingsHistory, setTrainingsHistory] = useState<
    Array<{ id: string; date: string; status: string; notes?: string }>
  >([]);

  // Custom training submission state
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submittingTraining, setSubmittingTraining] = useState(false);

  // 1. Determine child IDs from userProfile or fallback queries (supporting multiple children and both father & mother phone numbers)
  useEffect(() => {
    let isMounted = true;
    const resolveChildren = async () => {
      setLoading(true);
      const matchedIds = new Set<string>();

      // A. Aggiungi ID già registrati nel profilo
      if (Array.isArray(userProfile.childIds)) {
        userProfile.childIds.forEach((id) => {
          if (id) matchedIds.add(String(id).trim());
        });
      }
      if (userProfile.childId) {
        matchedIds.add(String(userProfile.childId).trim());
      }

      // B. Cerca tutti i giocatori che corrispondono al genitore per UID o per Telefono (Padre, Madre o entrambi)
      try {
        const allPlayers = await getAllPlayers();
        const parentPhone = userProfile.phone ? String(userProfile.phone).trim() : '';

        allPlayers.forEach((p) => {
          const isUidMatch =
            (p.parentId && p.parentId === userProfile.uid) ||
            (Array.isArray(p.parentIds) && p.parentIds.includes(userProfile.uid));

          const isPhoneMatch =
            Boolean(parentPhone) &&
            (arePhonesMatching(p.parentPhone, parentPhone) ||
              arePhonesMatching(p.parentPhone2, parentPhone) ||
              (Array.isArray(p.parentPhones) &&
                p.parentPhones.some((ph) => arePhonesMatching(ph, parentPhone))));

          if (isUidMatch || isPhoneMatch) {
            matchedIds.add(p.id);

            // Se il giocatore non aveva ancora l'UID del genitore tra i suoi parentIds, lo colleghiamo
            if (userProfile.uid && (!p.parentIds || !p.parentIds.includes(userProfile.uid))) {
              updateDoc(doc(db, 'players', p.id), {
                parentId: p.parentId || userProfile.uid,
                parentIds: arrayUnion(userProfile.uid)
              }).catch(() => {});
            }
          }
        });

        // Se sono stati trovati nuovi figli tramite telefono, aggiorna childIds dell'utente genitore
        const finalIds = Array.from(matchedIds);
        const existingCount = Array.isArray(userProfile.childIds) ? userProfile.childIds.length : 0;
        if (finalIds.length > existingCount && userProfile.uid) {
          updateDoc(doc(db, 'users', userProfile.uid), {
            childIds: finalIds
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Errore ricerca automatica figli per telefono/UID:', err);
      }

      if (!isMounted) return;
      const ids = Array.from(matchedIds);
      setChildIds(ids);
      if (ids.length > 0) {
        setActiveChildId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));
      }
      setLoading(false);
    };

    resolveChildren();
    return () => {
      isMounted = false;
    };
  }, [userProfile]);

  // 2. Fetch data for each child
  useEffect(() => {
    let isMounted = true;
    const fetchChildData = async () => {
      if (!childIds.length) return;

      const map: Record<string, Player> = {};
      for (const cId of childIds) {
        const p = await getPlayerById(cId);
        if (p) map[cId] = p;
      }

      if (!isMounted) return;
      setChildrenMap(map);
    };

    fetchChildData();
    return () => {
      isMounted = false;
    };
  }, [childIds]);

  // 3. Load active matches and attendances for activeChildId
  const loadChildData = async () => {
    if (!activeChildId) return;
    const activeChild = childrenMap[activeChildId];
    const teamId =
      activeChild?.categoria ||
      activeChild?.gruppoSquadra ||
      activeChild?.teamName ||
      activeChild?.team ||
      activeChild?.teamId ||
      '';

    try {
      const [allCallups, permanentHistory, attendancesSnap] = await Promise.all([
        getAllActiveCallups(),
        getPermanentMatchHistory(activeChildId),
        getDocs(collection(db, 'attendances'))
      ]);

      // Filter active callups
      const relevantCallups = allCallups.filter((m) => {
        const invited = m.players || [];
        const isExplicit = invited.some((p) => {
          if (typeof p === 'string') return p === activeChildId || p.startsWith(`${activeChildId}|`);
          return (p as any)?.id === activeChildId || (p as any)?.playerId === activeChildId;
        });
        const isTeam =
          m.teamId && teamId && m.teamId.toLowerCase() === teamId.toLowerCase();
        return isExplicit || isTeam || !m.teamId;
      });

      setActiveMatches(relevantCallups);
      setPastMatches(permanentHistory);

      // Extract attendances for this child
      const tHistory: Array<{ id: string; date: string; status: string; notes?: string }> = [];
      attendancesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const records = data.records || data.record || data.presenze || [];
        if (Array.isArray(records)) {
          const myRec = records.find(
            (r) => String(r.playerId || r.id) === String(activeChildId)
          );
          if (myRec) {
            tHistory.push({
              id: docSnap.id,
              date: data.date || 'Da definire',
              status: myRec.status,
              notes: data.notes || 'Seduta regolare'
            });
          }
        }
      });

      // Sort desc
      tHistory.sort((a, b) => parseDateObj(b.date).getTime() - parseDateObj(a.date).getTime());
      setTrainingsHistory(tHistory);
    } catch (err) {
      console.error('Errore caricamento dati figlio:', err);
    }
  };

  useEffect(() => {
    if (activeChildId && childrenMap[activeChildId]) {
      loadChildData();
    }
  }, [activeChildId, childrenMap]);

  const activeChild = activeChildId ? childrenMap[activeChildId] : null;
  const childDisplayName = activeChild
    ? `${activeChild.lastName || ''} ${activeChild.firstName || ''}`.trim() || activeChild.name || 'Atleta'
    : 'Seleziona giocatore';

  const childTeamName =
    activeChild?.categoria ||
    activeChild?.gruppoSquadra ||
    activeChild?.teamName ||
    activeChild?.team ||
    activeChild?.teamId ||
    'Squadra non assegnata';

  const handleRespondMatch = async (callupId: string, status: 'confirmed' | 'absent') => {
    if (!activeChildId) return;
    try {
      await respondToCallup(callupId, activeChildId, status);
      alert(
        status === 'confirmed'
          ? '✅ Presenza confermata con successo!'
          : '❌ Assenza comunicata al mister.'
      );
      loadChildData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    }
  };

  const handleSubmitCustomTraining = async (status: 'present' | 'absent') => {
    if (!activeChildId || !customDate) {
      alert('Seleziona una data valida per l allenamento.');
      return;
    }

    setSubmittingTraining(true);
    try {
      await submitParentCustomTraining(
        activeChildId,
        childTeamName,
        childDisplayName,
        customDate,
        status
      );

      alert(`Preferenza registrata con successo per il ${formatDateIT(customDate)}!`);
      loadChildData();
    } catch (err: any) {
      alert('Errore salvataggio: ' + err.message);
    } finally {
      setSubmittingTraining(false);
    }
  };

  const handleExportTrainingsCSV = () => {
    if (trainingsHistory.length === 0) return alert('Nessun allenamento registrato da esportare.');
    let csv = 'Data;Stato Presenza;Note\n';
    trainingsHistory.forEach((t) => {
      const statusText = t.status === 'present' ? 'Presente' : 'Assente';
      csv += `"${formatDateIT(t.date)}";"${statusText}";"${t.notes || ''}"\n`;
    });
    downloadCSV(`Presenze_${childDisplayName.replace(/\s+/g, '_')}.csv`, csv);
  };

  // Group past matches by month & year
  const groupedPastMatches = pastMatches.reduce((acc: Record<string, any[]>, p) => {
    const d = parseDateObj(p.date);
    if (!isNaN(d.getTime())) {
      const key = `${MONTH_NAMES_IT[d.getMonth()]} ${d.getFullYear()}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
    }
    return acc;
  }, {});

  // Group trainings by month & year
  const groupedTrainings = trainingsHistory.reduce((acc: Record<string, any[]>, t) => {
    const d = parseDateObj(t.date);
    if (!isNaN(d.getTime())) {
      const key = `${MONTH_NAMES_IT[d.getMonth()]} ${d.getFullYear()}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-slate-500">
        <p className="text-sm font-bold">Caricamento Portale Famiglia...</p>
      </div>
    );
  }

  if (childIds.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow border border-slate-200 text-center space-y-3 mt-8">
        <Baby className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-black text-slate-900">Nessun giocatore associato</h3>
        <p className="text-xs text-slate-500">
          Non risulta alcun atleta associato a questo profilo genitore. Contatta la segreteria o il responsabile tecnico della Spes Montesacro indicando il tuo numero di telefono ({userProfile.phone || 'non inserito'}).
        </p>
      </div>
    );
  }

  return (
    <div id="parent-portal-container" className="max-w-md mx-auto p-4 flex flex-col gap-4">
      {/* Header Portale Famiglia */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex items-center justify-between gap-4 border border-slate-800">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
            Portale Famiglia
          </span>

          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5 mt-1">
            {childIds.length === 1 ? (
              <h2 id="parent-child-name" className="text-xl font-extrabold truncate text-white">
                {childDisplayName}
              </h2>
            ) : (
              <div className="relative w-full max-w-xs mt-1">
                <select
                  id="select-active-child"
                  value={activeChildId || ''}
                  onChange={(e) => setActiveChildId(e.target.value)}
                  className="bg-slate-800 text-white text-sm font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer w-full shadow-inner"
                >
                  {childIds.map((cId) => {
                    const cData = childrenMap[cId];
                    const cName = cData
                      ? `${cData.lastName || ''} ${cData.firstName || ''}`.trim() || cData.name
                      : `Atleta ${cId}`;
                    return (
                      <option key={cId} value={cId}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <span
              id="parent-child-team"
              className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-emerald-300 border border-slate-700/60 w-fit mt-1 sm:mt-0"
            >
              {childTeamName}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1">
        <button
          id="tab-btn-trainings"
          onClick={() => setActiveTab('trainings')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'trainings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏃‍♂️</span>
          <span>Allenamenti</span>
        </button>
        <button
          id="tab-btn-matches"
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'matches'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚽</span>
          <span>Partite</span>
        </button>
      </div>

      {/* TAB ALLENAMENTI */}
      {activeTab === 'trainings' && (
        <div id="tab-content-trainings" className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-base">🏃‍♂️</span>
              <h3 className="font-bold text-slate-900 text-sm">
                Comunica Presenza / Assenza Allenamento
              </h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Seleziona la data dell'allenamento:
              </label>
              <input
                type="date"
                id="custom-training-date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-2 pt-1">
                <button
                  id="btn-submit-present"
                  disabled={submittingTraining}
                  onClick={() => handleSubmitCustomTraining('present')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Ci sarò (Presente)</span>
                </button>
                <button
                  id="btn-submit-absent"
                  disabled={submittingTraining}
                  onClick={() => handleSubmitCustomTraining('absent')}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl text-xs transition border border-rose-200 flex items-center justify-center gap-1 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Non ci sarò (Assente)</span>
                </button>
              </div>
            </div>

            {/* Storico Presenze */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📋</span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Storico Presenze Allenamenti
                  </h4>
                </div>
              </div>

              {Object.keys(groupedTrainings).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Nessun allenamento registrato.
                </p>
              ) : (
                <div className="space-y-3">
                  {(Object.entries(groupedTrainings) as [string, any[]][]).map(([monthYear, records]) => (
                    <div key={monthYear}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">
                        🗓️ {monthYear}
                      </div>
                      <div className="space-y-1.5">
                        {records.map((t) => (
                          <div
                            key={t.id + t.date}
                            className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/70"
                          >
                            <span className="font-semibold text-slate-700">
                              Allenamento del {formatDateIT(t.date)}
                            </span>
                            <div>
                              {t.status === 'present' ? (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  Presente ✅
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  Assente ❌
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200">
                <button
                  onClick={handleExportTrainingsCSV}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-2xl transition shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica Riepilogo in Excel (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB PARTITE */}
      {activeTab === 'matches' && (
        <div id="tab-content-matches" className="flex flex-col gap-4">
          {/* Prossime convocazioni */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <span>⚽</span>
              <span>Prossime Convocazioni</span>
            </h3>

            {activeMatches.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nessuna convocazione attiva per {childDisplayName}.
              </p>
            ) : (
              <div className="space-y-3">
                {activeMatches.map((ev) => {
                  const currentResponse = ev.responses?.[activeChildId!] || null;

                  let statusBadge = (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1 w-fit">
                      <Clock3 className="w-3 h-3" /> In attesa di risposta
                    </span>
                  );

                  if (currentResponse === 'confirmed' || currentResponse === 'present') {
                    statusBadge = (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Presenza Confermata ✅
                      </span>
                    );
                  } else if (currentResponse === 'absent') {
                    statusBadge = (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> Assenza Comunicata ❌
                      </span>
                    );
                  }

                  return (
                    <div
                      key={ev.id}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-sm">
                            Partita vs {ev.opponent}
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">
                            ⚽ PARTITA
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Data: {formatDateIT(ev.date)} {ev.matchTime ? `| ⏰ ${ev.matchTime}` : ''}</span>
                        </span>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Campo: {ev.location}</span>
                        </span>
                        <span className="text-xs text-emerald-700 font-bold">
                          Ritrovo Campo: {ev.gatheringTime || 'Da definire'}
                        </span>
                        <div className="mt-1">{statusBadge}</div>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          onClick={() => handleRespondMatch(ev.id, 'confirmed')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conferma Presenza</span>
                        </button>
                        <button
                          onClick={() => handleRespondMatch(ev.id, 'absent')}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-xs transition border border-rose-200 active:scale-95 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Comunica Assenza</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Storico partite passate */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3">📜 Storico Partite Giocate</h3>
            {Object.keys(groupedPastMatches).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-3">
                Nessuna partita passata registrata.
              </p>
            ) : (
              <div className="space-y-4">
                {(Object.entries(groupedPastMatches) as [string, any[]][]).map(([monthYear, records]) => (
                  <div key={monthYear}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">
                      🗓️ {monthYear}
                    </div>
                    <div className="space-y-2">
                      {records.map((p) => {
                        const isPlayed =
                          p.responses?.[activeChildId!] === 'confirmed' ||
                          p.responses?.[activeChildId!] === 'present' ||
                          p.status === 'confirmed' ||
                          p.status === 'present';

                        return (
                          <div
                            key={p.id + p.date}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex flex-col gap-1 text-xs"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">
                                {p.title || 'Partita'}
                              </span>
                              <div>
                                {isPlayed ? (
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Giocata ✅
                                  </span>
                                ) : (
                                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    Assente ❌
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>📅 Data: {formatDateIT(p.date)}</span>
                              {p.time && <span>⏰ {p.time}</span>}
                              {p.location && <span>📍 {p.location}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
