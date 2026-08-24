import { db, auth } from './firebase-init.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { exportToExcel} from './utils.js';

// Variabile globale per mantenere in memoria il profilo utente completo
let currentUserProfile = null;
let activeChildId = null; // ID del figlio attualmente visualizzato nel portale

// FUNZIONE DI SUPPORTO MULTI-FIGLIO (Retrocompatibile)
function getChildIds(userProfile) {
    if (!userProfile) return [];
    if (Array.isArray(userProfile.childIds) && userProfile.childIds.length > 0) {
        return userProfile.childIds.map(id => String(id).trim()).filter(Boolean);
    }
    if (userProfile.childId) {
        return [String(userProfile.childId).trim()];
    }
    return [];
}

// 1. FUNZIONE PRINCIPALE DI AVVIO (VERSIONE BLINDATA)
export async function initParentPortal(userProfile) {
    console.log("Inizializzazione portale genitori per:", userProfile?.name);
    currentUserProfile = userProfile; 
     
    const dashboard = document.getElementById('app-dashboard');
    if (dashboard) dashboard.classList.add('hidden');
     
    let portalWrapper = document.getElementById('dynamic-parent-container');
    if (!portalWrapper) {
        portalWrapper = document.createElement('div');
        portalWrapper.id = 'dynamic-parent-container';
         
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.appendChild(portalWrapper);
        } else {
            const footer = document.querySelector('footer');
            if (footer) {
                footer.parentNode.insertBefore(portalWrapper, footer);
            } else {
                document.body.appendChild(portalWrapper);
            }
        }
    }

    try {
        const response = await fetch('parent-view.html');
        if (!response.ok) throw new Error("Impossibile caricare la vista genitori.");
         
        const htmlContent = await response.text();
        portalWrapper.innerHTML = htmlContent;

        const logoutBtn = document.getElementById('btn-parent-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut(auth);
                window.location.reload();
            });
        }

        // Imposta il primo figlio come attivo di default
        const childIds = getChildIds(currentUserProfile);
        activeChildId = childIds.length > 0 ? childIds[0] : null;

        await loadChildData(currentUserProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

// 2. CARICAMENTO DATI (Partite + Storico Presenze Allenamenti per TUTTI i figli)
async function loadChildData(userProfile) {
if (!db) {
        console.error("❌ ERRORE CRITICO: L'oggetto 'db' è UNDEFINED.");
        return;
    }

    // 1. Cerchiamo gli ID tramite la funzione standard esistente
    let childIds = getChildIds(userProfile);

    // 2. FALLBACK AUTOMATICO: Se la funzione non trova nulla, cerchiamo direttamente su Firestore per UID o Telefono
    if (!childIds || childIds.length === 0) {
        console.warn("⚠️ Nessun ID trovato tramite getChildIds. Tentativo di recupero tramite Firestore...");
        try {
            const playersRef = collection(db, 'players');
            let querySnapshot = null;

            // Tentativo per parentId == userProfile.uid
            if (userProfile && userProfile.uid) {
                const qByUid = query(playersRef, where("parentId", "==", userProfile.uid));
                querySnapshot = await getDocs(qByUid);
            }

            // Se non trovato per UID, tentiamo per numero di telefono
            if ((!querySnapshot || querySnapshot.empty) && userProfile && userProfile.phone) {
                const cleanPhone = String(userProfile.phone).trim();
                const qByPhone = query(playersRef, where("parentPhone", "==", cleanPhone));
                querySnapshot = await getDocs(qByPhone);
            }

            if (querySnapshot && !querySnapshot.empty) {
                childIds = [];
                querySnapshot.forEach(docSnap => {
                    childIds.push(docSnap.id);
                });
                console.log("✅ Giocatori recuperati dinamicamente:", childIds);
            }
        } catch (searchErr) {
            console.error("Errore durante la ricerca dinamica dei figli:", searchErr);
        }
    }

    // 3. Controllo finale: se dopo il fallback siamo ancora a zero, allora ci fermiamo
    if (!childIds || childIds.length === 0) {
        console.error("Nessun ID bambino trovato nel profilo utente o tramite associazioni.");
        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) nameEl.innerHTML = `<span class="text-xs text-red-400 font-semibold">Nessun giocatore associato al tuo profilo</span>`;
        return;
    }

    try {
        // Recuperiamo i dati di TUTTI i figli del genitore per mapparli correttamente
        const childrenDataMap = {};
        for (const cId of childIds) {
            const childDocRef = doc(db, 'players', cId);
            const childDoc = await getDoc(childDocRef);
            if (childDoc.exists()) {
                childrenDataMap[cId] = childDoc.data();
            }
        }

        // Aggiorna il badge del Gruppo Squadra per il figlio attivo
        const activeChildData = childrenDataMap[activeChildId] || {};
        // <-- AGGIUNGI QUESTA RIGA PER DEFINIRE LA VARIABILE MANCANTE -->
        const activeDisplayName = `${activeChildData.lastName || ''} ${activeChildData.firstName || ''}`.trim() || userProfile?.name || 'Genitore';
        const activeTeamName = activeChildData.categoria || activeChildData.gruppoSquadra || activeChildData.team || 'Squadra non assegnata';

        // Se l'ID attivo non è valido, prendiamo il primo disponibile
        if (!activeChildId || !childIds.includes(activeChildId)) {
            activeChildId = childIds[0];
        }

        // --- GESTIONE GRAFICA: NOME + SELECT FIGLI + GRUPPO SQUADRA ---
        const nameContainer = document.getElementById('parent-child-name');
        const teamBadgeEl = document.getElementById('parent-child-team');

        if (nameContainer) {
            if (childIds.length === 1) {
                // Un solo figlio: mostra il nome semplice
                const singleChildData = childrenDataMap[activeChildId] || {};
                const displayName = `${singleChildData.lastName || ''} ${singleChildData.firstName || ''}`.trim() || 'Nome non disponibile';
                nameContainer.textContent = displayName;
            } else {
                // Più figli: crea una <select> pulita ed elegante
                let selectHtml = `<select id="select-active-child" class="bg-slate-800/90 text-white text-sm sm:text-base font-bold px-3 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer w-full max-w-xs shadow-inner">`;
                
                for (const cId of childIds) {
                    const cData = childrenDataMap[cId];
                    if (cData) {
                        const cName = `${cData.lastName || ''} ${cData.firstName || ''}`.trim();
                        const selected = (cId === activeChildId) ? 'selected' : '';
                        selectHtml += `<option value="${cId}" ${selected}>${cName}</option>`;
                    }
                }
                selectHtml += `</select>`;
                nameContainer.innerHTML = selectHtml;

                // Ascoltatore per il cambio figlio dal menu a tendina
                const selectEl = document.getElementById('select-active-child');
                if (selectEl) {
                    selectEl.addEventListener('change', (e) => {
                        activeChildId = e.target.value;
                        loadChildData(userProfile); // Ricarica i dati per il nuovo figlio selezionato
                    });
                }
            }
        }

        
        if (teamBadgeEl) {
            teamBadgeEl.textContent = activeTeamName;
        }

        const activeTeamId = activeChildData.teamId || activeChildData.team || activeChildData.squadra || activeChildData.group || userProfile?.teamId || '';

        const [callupsSnap, attendancesSnap, matchHistorySnap] = await Promise.all([
            getDocs(collection(db, 'callups')),
            getDocs(collection(db, 'attendances')),
            getDocs(collection(db, 'match_history'))
        ]);

        let matchesList = [];
        let trainingsHistory = [];

        // A. Elaborazione Partite attive (dalla bacheca del mister)
        callupsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const callupTeamId = data.teamId || data.team || data.squadra || '';
            const invitedPlayers = data.players || [];
            const responses = data.responses || {};
             
            matchesList.push({
                id: docSnap.id,
                invitedPlayers,
                callupTeamId,
                responses
            });
        });

        // B. Raccogliamo anche lo storico permanente da 'match_history' per il figlio attivo
        let permanentMatchHistoryMap = {};
        matchHistorySnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (String(data.playerId) === String(activeChildId)) {
                permanentMatchHistoryMap[data.matchId] = {
                    id: data.matchId,
                    collection: 'match_history',
                    type: 'match',
                    title: data.title || 'Partita',
                    date: data.date || 'Da definire',
                    time: data.time || '',
                    location: data.location || 'Da definire',
                    subInfo: 'Storico registrato',
                    responses: { [activeChildId]: data.status }
                };
            }
        });

        // Gestione Intestazione e Selettore Figli
        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) {
            if (childIds.length > 1) {
                let selectHtml = `<select id="parent-child-switcher" class="bg-slate-800 text-emerald-400 font-extrabold text-sm md:text-lg border border-slate-700 rounded-lg p-1.5 w-full focus:outline-none focus:border-emerald-500 cursor-pointer">`;
                let alertMessage = ""; 
         
                childIds.forEach(id => {
                    const cData = childrenDataMap[id] || {};
                    const cName = `${cData.lastName || ''} ${cData.firstName || ''}`.trim() || `Figlio ${id}`;
                     
                    const pendingMatches = matchesList.filter(m => {
                        const cTeam = cData.teamId || cData.team || cData.squadra || userProfile?.teamId || '';
                        const isExplicit = m.invitedPlayers.some(p => typeof p === 'string' && (p === id || p.startsWith(`${id}|`)));
                        const isTeam = m.callupTeamId && cTeam && String(m.callupTeamId).toLowerCase() === String(cTeam).toLowerCase();
                        const isResponded = m.responses?.[id] !== undefined;
                        return (isExplicit || isTeam || !m.callupTeamId) && !isResponded;
                    });
         
                    const hasPending = pendingMatches.length > 0;
                    const indicator = hasPending ? ' ⚠️' : ' ✅';
                     
                    if (id === activeChildId && hasPending) {
                        alertMessage = `
                            <div class="text-[9px] text-amber-400 font-bold mt-1 text-center leading-tight break-words px-1">
                                ⚠️ ${pendingMatches.length} convocazione/i in attesa di conferma
                            </div>`;
                    }
         
                    const selectedAttr = (id === activeChildId) ? 'selected' : '';
                    selectHtml += `<option value="${id}" ${selectedAttr}>${cName}${indicator}</option>`;
                });
                 
                selectHtml += `</select>`;
                nameEl.innerHTML = selectHtml + alertMessage;
         
                const switcher = document.getElementById('parent-child-switcher');
                if (switcher) {
                    switcher.onchange = (e) => {
                        activeChildId = e.target.value;
                        loadChildData(currentUserProfile); 
                    };
                }
            } else {
                nameEl.innerText = activeDisplayName;
            }
        }

        // C. Uniamo le partite attive e lo storico permanente in un'unica lista per il genitore
        let activeMatchesMap = {};

        matchesList.forEach((m) => {
            const isExplicitlyInvited = m.invitedPlayers.some(p => typeof p === 'string' && (p === activeChildId || p.startsWith(`${activeChildId}|`)));
            const hasResponded = m.responses?.[activeChildId] !== undefined;
            const isTeamMatch = m.callupTeamId && activeTeamId && String(m.callupTeamId).toLowerCase() === String(activeTeamId).toLowerCase();

            if (isExplicitlyInvited || hasResponded || isTeamMatch || !m.callupTeamId) {
                const docSnapRef = callupsSnap.docs.find(d => d.id === m.id);
                const data = docSnapRef ? docSnapRef.data() : {};
                activeMatchesMap[m.id] = {
                    id: m.id,
                    collection: 'callups',
                    type: 'match',
                    title: `Partita vs ${data.opponent || 'Avversario'}`,
                    date: data.date || 'Da definire',
                    time: data.matchTime || '',
                    location: data.location || 'Da definire',
                    subInfo: `Ritrovo: ${data.gatheringTime || 'Da definire'}`,
                    responses: m.responses
                };
            }
        });

        Object.keys(permanentMatchHistoryMap).forEach(matchId => {
            if (!activeMatchesMap[matchId]) {
                activeMatchesMap[matchId] = permanentMatchHistoryMap[matchId];
            }
        });

        let activeMatchesList = Object.values(activeMatchesMap);

        // D. Storico Allenamenti per il figlio attivo
        attendancesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const recordList = data.record || data.records || [];
             
            if (Array.isArray(recordList)) {
                const myRecord = recordList.find(r => String(r.playerId || r.id) === String(activeChildId));
                if (myRecord) {
                    trainingsHistory.push({
                        id: docSnap.id,
                        collection: 'attendances',
                        date: data.date || 'Da definire',
                        notes: data.notes || 'Seduta regolare',
                        status: myRecord.status
                    });
                }
            }
        });

        const parseDateToTimestamp = (dateStr) => {
            if (!dateStr || dateStr === 'Da definire') return 0;
            const str = String(dateStr).trim();
            let year, month, day;

            if (str.includes('-')) {
                const parts = str.split('-');
                if (parts.length === 3) {
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1;
                    day = parseInt(parts[2], 10);
                }
            } else if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    day = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1;
                    year = parseInt(parts[2], 10);
                }
            }

            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                return new Date(year, month, day).getTime();
            }
            return new Date(str).getTime() || 0;
        };

        activeMatchesList.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        trainingsHistory.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
         
        renderPortalUI(activeMatchesList, trainingsHistory, activeChildId, activeTeamId || 'Assegnata', activeDisplayName);
    } catch (error) {
        console.error("❌ ERRORE CRITICO CATTURATO:", error);
        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) nameEl.innerText = "Errore di caricamento dati";
    }
}

// 3. RENDER GRAFICO DEL PORTALE GENITORI (SEZIONI NEI TAB DEDICATI)
function renderPortalUI(matchesList, trainingsHistory, activeChildId, teamName, childName) {
    const teamBadgeEl = document.getElementById('parent-team-badge');
    if (teamBadgeEl) teamBadgeEl.innerText = `Squadra: ${teamName}`;

    // --- 1. Elaborazione Partite Attive e Storico ---
    let matchesHTML = '';
    let matchesHistoryHTML = ''; 
    let historyHTML = '';
    
    const activeMatches = matchesList.filter(m => m.collection === 'callups');
    const pastMatches = matchesList.filter(m => m.collection === 'match_history');

    // RENDER PARTITE ATTIVE
    if (activeMatches.length === 0) {
        matchesHTML = `<p class="text-xs text-slate-400 italic py-2 text-center">Nessuna convocazione attiva.</p>`;
    } else {
        activeMatches.forEach((ev) => {
            const currentResponse = ev.responses?.[activeChildId] || null;
            let statusBadge = currentResponse === 'confirmed' || currentResponse === 'present'
                ? `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Presenza Confermata ✅</span>`
                : currentResponse === 'absent'
                ? `<span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Assenza Comunicata ❌</span>`
                : `<span class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">In attesa di risposta ⏳</span>`;

            matchesHTML += `
                <div class="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 mb-2.5">
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-800 text-sm">${ev.title}</span>
                            <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">⚽ PARTITA</span>
                        </div>
                        <span class="text-xs text-slate-600">📅 Data: ${ev.date} ${ev.time ? '| ⏰ ' + ev.time : ''}</span>
                        <span class="text-xs text-slate-600">📍 Campo: ${ev.location}</span>
                        <div class="mt-1">${statusBadge}</div>
                    </div>
                    <div class="flex gap-2 mt-2.5">
                        <button data-id="${ev.id}" data-status="confirmed" class="btn-match-confirm flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs hover:bg-emerald-700">Conferma ✅</button>
                        <button data-id="${ev.id}" data-status="absent" class="btn-match-absent flex-1 bg-rose-50 text-rose-700 font-bold py-1.5 rounded-lg text-xs border border-rose-200 hover:bg-rose-100">Assente ❌</button>
                    </div>
                </div>`;
        });
    }

 // RENDER STORICO PARTITE (Con normalizzazione date, ordinamento e dettagli)
    if (pastMatches && pastMatches.length > 0) {
        const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        
        // Funzione di supporto per convertire qualsiasi formato di data in oggetto Date
        const parseDateObj = (dateStr) => {
            if (!dateStr) return new Date(0);
            let parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parts[0], parts[1] - 1, parts[2]); // YYYY-MM-DD
                } else {
                    return new Date(parts[2], parts[1] - 1, parts[0]); // DD/MM/YYYY
                }
            }
            return new Date(0);
        };

        // Ordina dal più recente al meno recente
        const sortedPastMatches = [...pastMatches].sort((a, b) => parseDateObj(b.date) - parseDateObj(a.date));

        const grouped = sortedPastMatches.reduce((acc, p) => {
            const dObj = parseDateObj(p.date);
            if (!isNaN(dObj.getTime())) {
                const key = `${mesi[dObj.getMonth()]} ${dObj.getFullYear()}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(p);
            }
            return acc;
        }, {});

        for (const [monthYear, records] of Object.entries(grouped)) {
            matchesHistoryHTML += `<div class="mt-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">🗓️ ${monthYear}</div>`;
            records.forEach((p) => {
                const status = p.responses?.[activeChildId] === 'confirmed' || p.responses?.[activeChildId] === 'present' 
                    ? '<span class="text-emerald-600 font-bold">Giocata ✅</span>' 
                    : '<span class="text-rose-600 font-bold">Assente ❌</span>';
                
                matchesHistoryHTML += `
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2 flex flex-col gap-1 text-xs">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-800 text-sm">${p.title || 'Partita'}</span>
                            <div>${status}</div>
                        </div>
                        <div class="text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span>📅 Data: ${p.date} ${p.time ? '| ⏰ ' + p.time : ''}</span>
                            ${p.location ? `<span>📍 Campo: ${p.location}</span>` : ''}
                        </div>
                    </div>`;
            });
        }
    }

    // --- 2. Elaborazione Storico Allenamenti (Con normalizzazione e ordinamento) ---
    if (trainingsHistory && trainingsHistory.length > 0) {
        const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        
        // Funzione di supporto per convertire qualsiasi data in oggetto Date per il confronto
        const parseDateObj = (dateStr) => {
            let parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parts[0], parts[1] - 1, parts[2]); // YYYY-MM-DD
                } else {
                    return new Date(parts[2], parts[1] - 1, parts[0]); // DD/MM/YYYY
                }
            }
            return new Date(0);
        };

        // Ordina dal più recente al meno recente
        const sortedTrainings = [...trainingsHistory].sort((a, b) => parseDateObj(b.date) - parseDateObj(a.date));

        const groupedTrainings = sortedTrainings.reduce((acc, t) => {
            let dObj = parseDateObj(t.date);
            if (!isNaN(dObj.getTime())) {
                const key = `${mesi[dObj.getMonth()]} ${dObj.getFullYear()}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(t);
            }
            return acc;
        }, {});

        for (const [monthYear, records] of Object.entries(groupedTrainings)) {
            historyHTML += `<div class="mt-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">🗓️ ${monthYear}</div>`;
            records.forEach((t) => {
                const statusBadge = t.status === 'present' 
                    ? '<span class="text-emerald-600 font-bold">Presente ✅</span>' 
                    : '<span class="text-rose-600 font-bold">Assente ❌</span>';
                historyHTML += `
                    <div class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-1.5">
                        <span class="font-semibold text-slate-700">Allenamento del ${t.date}</span>
                        <div>${statusBadge}</div>
                    </div>`;
            });
        }
    } else {
        historyHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Nessun allenamento registrato.</p>`;
    }

    // --- Inserimento nei rispettivi TAB ---
    const matchesContainer = document.getElementById('tab-content-matches');
    if (matchesContainer) {
        matchesContainer.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <h3 class="font-bold text-slate-800 text-sm mb-3">⚽ Prossime Convocazioni</h3>
                ${matchesHTML}
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 class="font-bold text-slate-800 text-sm mb-3">📜 Storico Partite</h3>
                ${matchesHistoryHTML || '<p class="text-xs text-slate-400 italic text-center">Nessuna partita passata.</p>'}
            </div>
        `;
    }

    const trainingsContainer = document.getElementById('tab-content-trainings');
    if (trainingsContainer) {
        trainingsContainer.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div class="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span class="text-base">🏃‍♂️</span>
                    <h3 class="font-bold text-slate-800 text-sm">Comunica Presenza / Assenza Allenamento</h3>
                </div>
                 
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <label class="block text-xs font-bold text-slate-700">Seleziona la data dell'allenamento:</label>
                    <input type="date" id="custom-training-date" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500">
                     
                    <div class="flex gap-2 pt-1">
                        <button id="btn-submit-present" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm hover:bg-emerald-700">Ci sarò (Presente) ✅</button>
                        <button id="btn-submit-absent" class="flex-1 bg-rose-50 text-rose-700 font-bold py-2 rounded-lg text-xs transition border border-rose-200 hover:bg-rose-100">Non ci sarò (Assente) ❌</button>
                    </div>
                </div>

                <div class="mt-5 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between mb-2.5">
                        <div class="flex items-center gap-1.5">
                            <span class="text-sm">📋</span>
                            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Storico Presenze Allenamenti</h4>
                        </div>
                    </div>
                    <div class="flex flex-col">${historyHTML}</div>
                    
                    <div class="mt-4 pt-3 border-t border-slate-200">
                        <button onclick="window.exportTrainingsHistory()" class="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm">
                            📊 Scarica Riepilogo in Excel (.csv)
                        </button>
                    </div>
                </div>
            </div>
        `;

        const btnPresent = document.getElementById('btn-submit-present');
        const btnAbsent = document.getElementById('btn-submit-absent');

        if (btnPresent) btnPresent.onclick = () => window.submitCustomTraining(activeChildId, teamName, childName, 'present');
        if (btnAbsent) btnAbsent.onclick = () => window.submitCustomTraining(activeChildId, teamName, childName, 'absent');
    }

    if (matchesContainer) {
        matchesContainer.querySelectorAll('.btn-match-confirm').forEach(btn => {
            btn.onclick = () => window.respondEvent('callups', btn.dataset.id, activeChildId, 'confirmed');
        });
        matchesContainer.querySelectorAll('.btn-match-absent').forEach(btn => {
            btn.onclick = () => window.respondEvent('callups', btn.dataset.id, activeChildId, 'absent');
        });
    }
}

// 4. GESTIONE RISPOSTA CONVOCAZIONE (Con salvataggio nello Storico Permanente)
window.respondEvent = async function(collectionName, docId, activeChildId, status) {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
         
        if (!docSnap.exists()) {
            alert("⚠️ Questa convocazione non è più attiva o è stata rimossa dal mister.");
            if (typeof loadChildData === 'function' && typeof currentUserProfile !== 'undefined') {
                loadChildData(currentUserProfile);
            }
            return;
        }

        const data = docSnap.data();
        const responses = data.responses || {};
        responses[activeChildId] = status;
         
        await updateDoc(docRef, { responses: responses });

        const historyId = `${docId}_${activeChildId}`;
        const historyRef = doc(db, 'match_history', historyId);
         
        await setDoc(historyRef, {
            playerId: activeChildId,
            matchId: docId,
            title: `Partita vs ${data.opponent || 'Avversario'}`,
            date: data.date || 'Da definire',
            time: data.matchTime || '',
            location: data.location || 'Da definire',
            status: status,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        const actionText = (status === 'confirmed' || status === 'present') ? 'confermata ✅' : 'segnata come assente ❌';
        console.log(`Risposta salvata con successo: ${actionText}`);

        if (typeof loadChildData === 'function' && typeof currentUserProfile !== 'undefined') {
            loadChildData(currentUserProfile);
        }

    } catch (error) {
        console.error("❌ ERRORE durante il salvataggio della risposta:", error);
        alert("Errore durante il salvataggio della risposta. Riprova.");
    }
};

// 5. GESTIONE INVIO ALLENAMENTO PERSONALIZZATO
window.submitCustomTraining = async function(childId, teamName, childName, status) {
    console.log("🚀 submitCustomTraining avviata", { childId, teamName, childName, status });

    if (!db) {
        alert("Errore: Connessione al database non disponibile.");
        return;
    }

    const dateInput = document.getElementById('custom-training-date');
    const selectedDate = dateInput ? dateInput.value : '';

    if (!selectedDate) {
        alert("Seleziona una data valida per l'allenamento.");
        return;
    }

    try {
        const [year, month, day] = selectedDate.split('-');
        const dateIso = selectedDate;                                    
        const dateIt = `${day}/${month}/${year}`;                
        const dateItAlt = `${parseInt(day)}/${parseInt(month)}/${year}`; 

        const querySnapshot = await getDocs(collection(db, 'attendances'));
         
        let targetDoc = null;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dbDate = String(data.date || '').trim();
            const dbTeam = String(data.teamId || data.team || '').trim();
             
            const matchDate = (dbDate === dateIso || dbDate === dateIt || dbDate === dateItAlt);
            const matchTeam = !dbTeam || !teamName || dbTeam.toLowerCase() === teamName.toLowerCase();

            if (matchDate && matchTeam) {
                targetDoc = docSnap;
            }
        });

        let docRef;
        let recordList = [];

        if (targetDoc) {
            docRef = doc(db, 'attendances', targetDoc.id);
            const data = targetDoc.data();
            recordList = data.records || data.record || data.presenze || [];
        } else {
            docRef = doc(collection(db, 'attendances'));
            await setDoc(docRef, {
                date: dateIt,
                teamId: teamName,
                notes: 'Seduta scelta da portale famiglia',
                records: [],
                record: []
            });
            recordList = [];
        }

        const cleanList = recordList.filter(r => {
            const rId = String(r.playerId || r.id || '');
            return rId !== String(childId);
        });

        cleanList.push({
            id: String(childId),
            playerId: String(childId),
            name: childName,
            status: status,
            present: status === 'present'
        });

        await updateDoc(docRef, {
            records: cleanList,
            record: cleanList
        });

        alert(`Preferenza registrata con successo per il ${dateIt}!`);
         
        if (currentUserProfile) {
            await loadChildData(currentUserProfile);
        }

    } catch (err) {
        console.error("❌ ERRORE DURANTE IL SALVATAGGIO:", err);
        alert("Impossibile salvare: controlla la console.");
    }
};

// 6. ESPORTAZIONE RIEPILOGO ALLENAMENTI
window.exportTrainingsHistory = function() {
    const records = document.querySelectorAll('#tab-content-trainings .bg-slate-50');
    if (records.length === 0) {
        alert("Nessun dato da esportare.");
        return;
    }

    let csvData = [
        ["Data", "Stato Presenza", "Note / Dettagli"]
    ];

    records.forEach(r => {
        const textParts = r.innerText.split('\n');
        const dataStr = textParts[0] ? textParts[0].trim() : '';
        const isPresent = r.innerText.includes('Presente ✅');
        const stato = isPresent ? 'Presente' : 'Assente';
         
        let noteStr = r.innerText.replace(dataStr, '').replace('Presente ✅', '').replace('Assente ❌', '').trim();
        noteStr = noteStr.replace(/[()]/g, '').trim();

        csvData.push([dataStr, stato, noteStr]);
    });

    exportToExcel(`Presenze_Allenamenti_${new Date().getTime()}.csv`, csvData);
};

// 7. GESTIONE DEI TAB
window.switchParentTab = function(tabName) {
    const trainingsTab = document.getElementById('tab-content-trainings');
    const matchesTab = document.getElementById('tab-content-matches');
    const btnTrainings = document.getElementById('tab-btn-trainings');
    const btnMatches = document.getElementById('tab-btn-matches');

    if (!trainingsTab || !matchesTab) return;

    if (tabName === 'trainings') {
        trainingsTab.classList.remove('hidden');
        matchesTab.classList.add('hidden');
        if (btnTrainings) btnTrainings.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition bg-white text-slate-900 shadow-sm";
        if (btnMatches) btnMatches.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900";
    } else {
        matchesTab.classList.remove('hidden');
        trainingsTab.classList.add('hidden');
        if (btnMatches) btnMatches.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition bg-white text-slate-900 shadow-sm";
        if (btnTrainings) btnTrainings.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900";
    }
};

window.debugCheckAttendances = async function() {
    const querySnapshot = await getDocs(collection(db, 'attendances'));
    console.log("📊 --- ELENCO COMPLETO DOCUMENTI ATTENDANCES NEL DB ---");
    querySnapshot.forEach(docSnap => {
        console.log(`ID: ${docSnap.id}`, docSnap.data());
    });
};
