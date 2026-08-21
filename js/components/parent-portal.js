// components/parent-portal.js

import { db, auth } from '../firebase-init.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
import { exportToExcel } from './utils.js';

let currentUserProfile = null;
let activeChildId = null;

// Funzione di supporto multi-figlio
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

// 1. INIZIALIZZAZIONE PORTALE
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
         
        portalWrapper.innerHTML = await response.text();

        const logoutBtn = document.getElementById('btn-parent-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut(auth);
                window.location.reload();
            });
        }

        const childIds = getChildIds(currentUserProfile);
        activeChildId = childIds.length > 0 ? childIds[0] : null;

        await loadChildData(currentUserProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

// 2. CARICAMENTO DATI
async function loadChildData(userProfile) {
    if (!db) {
        console.error("❌ ERRORE CRITICO: L'oggetto 'db' è UNDEFINED.");
        return;
    }

    let childIds = getChildIds(userProfile);

    // Fallback automatico tramite Firestore se i collegamenti nel profilo mancano
    if (!childIds || childIds.length === 0) {
        try {
            const playersRef = collection(db, 'players');
            let querySnapshot = null;

            if (userProfile && userProfile.uid) {
                querySnapshot = await getDocs(query(playersRef, where("parentId", "==", userProfile.uid)));
            }
            if ((!querySnapshot || querySnapshot.empty) && userProfile && userProfile.phone) {
                querySnapshot = await getDocs(query(playersRef, where("parentPhone", "==", String(userProfile.phone).trim())));
            }

            if (querySnapshot && !querySnapshot.empty) {
                childIds = querySnapshot.docs.map(d => d.id);
            }
        } catch (searchErr) {
            console.error("Errore durante la ricerca dinamica dei figli:", searchErr);
        }
    }

    if (!childIds || childIds.length === 0) {
        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) nameEl.innerHTML = `<span class="text-xs text-red-400 font-semibold">Nessun giocatore associato al tuo profilo</span>`;
        return;
    }

    if (!activeChildId || !childIds.includes(activeChildId)) {
        activeChildId = childIds[0];
    }

    try {
        const childrenDataMap = {};
        for (const cId of childIds) {
            const childDoc = await getDoc(doc(db, 'players', cId));
            if (childDoc.exists()) {
                childrenDataMap[cId] = childDoc.data();
            }
        }

        const activeChildData = childrenDataMap[activeChildId] || {};
        const activeDisplayName = `${activeChildData.lastName || ''} ${activeChildData.firstName || ''}`.trim() || userProfile?.name;
        const activeTeamId = activeChildData.teamId || activeChildData.team || activeChildData.squadra || userProfile?.teamId || '';

        // Sfruttiamo DatabaseService per le convocazioni
        const matchesList = await DatabaseService.getCallups();
        const attendancesSnap = await getDocs(collection(db, 'attendances'));
        const matchHistorySnap = await getDocs(collection(db, 'match_history'));

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
                    responses: { [activeChildId]: data.status }
                };
            }
        });

        // Gestione Selettore Figli Multipli
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
                        const isExplicit = (m.players || []).some(p => typeof p === 'string' && (p === id || p.startsWith(`${id}|`)));
                        const isTeam = m.teamId && cTeam && String(m.teamId).toLowerCase() === String(cTeam).toLowerCase();
                        const isResponded = m.responses?.[id] !== undefined;
                        return (isExplicit || isTeam || !m.teamId) && !isResponded;
                    });
         
                    const hasPending = pendingMatches.length > 0;
                    const indicator = hasPending ? ' ⚠️' : ' ✅';
                     
                    if (id === activeChildId && hasPending) {
                        alertMessage = `<div class="text-[9px] text-amber-400 font-bold mt-1 text-center">⚠️ ${pendingMatches.length} convocazione/i in attesa di conferma</div>`;
                    }
         
                    selectHtml += `<option value="${id}" ${id === activeChildId ? 'selected' : ''}>${cName}${indicator}</option>`;
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

        // Mappatura Partite Attive
        let activeMatchesMap = {};
        matchesList.forEach((m) => {
            const invited = m.players || m.invitedPlayers || [];
            const isExplicitlyInvited = invited.some(p => typeof p === 'string' && (p === activeChildId || p.startsWith(`${activeChildId}|`)));
            const hasResponded = m.responses?.[activeChildId] !== undefined;
            const isTeamMatch = m.teamId && activeTeamId && String(m.teamId).toLowerCase() === String(activeTeamId).toLowerCase();

            if (isExplicitlyInvited || hasResponded || isTeamMatch || !m.teamId) {
                activeMatchesMap[m.id] = {
                    id: m.id,
                    collection: 'callups',
                    type: 'match',
                    title: `Partita vs ${m.opponent || 'Avversario'}`,
                    date: m.date || 'Da definire',
                    time: m.matchTime || '',
                    location: m.location || 'Da definire',
                    responses: m.responses || {}
                };
            }
        });

        Object.keys(permanentMatchHistoryMap).forEach(matchId => {
            if (!activeMatchesMap[matchId]) {
                activeMatchesMap[matchId] = permanentMatchHistoryMap[matchId];
            }
        });

        let activeMatchesList = Object.values(activeMatchesMap);

        // Storico Allenamenti
        let trainingsHistory = [];
        attendancesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const recordList = data.record || data.records || [];
            if (Array.isArray(recordList)) {
                const myRecord = recordList.find(r => String(r.playerId || r.id) === String(activeChildId));
                if (myRecord) {
                    trainingsHistory.push({
                        id: docSnap.id,
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
                [year, month, day] = str.split('-').map(Number);
                month -= 1;
            } else if (str.includes('/')) {
                [day, month, year] = str.split('/').map(Number);
                month -= 1;
            }
            return !isNaN(year) ? new Date(year, month, day).getTime() : new Date(str).getTime() || 0;
        };

        activeMatchesList.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        trainingsHistory.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
         
        renderPortalUI(activeMatchesList, trainingsHistory, activeChildId, activeTeamId || 'Assegnata', activeDisplayName);
    } catch (error) {
        console.error("❌ ERRORE NEL CARICAMENTO DATI:", error);
    }
}

// 3. RENDER GRAFICO
function renderPortalUI(matchesList, trainingsHistory, activeChildId, teamName, childName) {
    const teamBadgeEl = document.getElementById('parent-team-badge');
    if (teamBadgeEl) teamBadgeEl.innerText = `Squadra: ${teamName}`;

    let matchesHTML = '';
    let matchesHistoryHTML = ''; 
    let historyHTML = '';
    
    const activeMatches = matchesList.filter(m => m.collection === 'callups');
    const pastMatches = matchesList.filter(m => m.collection === 'match_history');

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
                        <span class="text-xs text-slate-600">📅 Data: ${DatabaseService.formatDateIT(ev.date)} ${ev.time ? '| ⏰ ' + ev.time : ''}</span>
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

    if (pastMatches && pastMatches.length > 0) {
        pastMatches.forEach((p) => {
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
                        <span>📅 Data: ${DatabaseService.formatDateIT(p.date)}</span>
                    </div>
                </div>`;
        });
    }

    if (trainingsHistory && trainingsHistory.length > 0) {
        trainingsHistory.forEach((t) => {
            const statusBadge = t.status === 'present' ? '<span class="text-emerald-600 font-bold">Presente ✅</span>' : '<span class="text-rose-600 font-bold">Assente ❌</span>';
            historyHTML += `
                <div class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-1.5">
                    <span class="font-semibold text-slate-700">Allenamento del ${DatabaseService.formatDateIT(t.date)}</span>
                    <div>${statusBadge}</div>
                </div>`;
        });
    } else {
        historyHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Nessun allenamento registrato.</p>`;
    }

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
                        <button id="btn-submit-present" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-emerald-700">Ci sarò (Presente) ✅</button>
                        <button id="btn-submit-absent" class="flex-1 bg-rose-50 text-rose-700 font-bold py-2 rounded-lg text-xs border border-rose-200 hover:bg-rose-100">Non ci sarò (Assente) ❌</button>
                    </div>
                </div>

                <div class="mt-5 pt-3 border-t border-slate-100">
                    <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">📋 Storico Presenze Allenamenti</h4>
                    <div class="flex flex-col">${historyHTML}</div>
                    
                    <div class="mt-4 pt-3 border-t border-slate-200">
                        <button onclick="window.exportTrainingsHistory()" class="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm">
                            📊 Scarica Riepilogo in Excel (.csv)
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-submit-present').onclick = () => window.submitCustomTraining(activeChildId, teamName, childName, 'present');
        document.getElementById('btn-submit-absent').onclick = () => window.submitCustomTraining(activeChildId, teamName, childName, 'absent');
    }

    matchesContainer?.querySelectorAll('.btn-match-confirm').forEach(btn => {
        btn.onclick = () => window.respondEvent('callups', btn.dataset.id, activeChildId, 'confirmed');
    });
    matchesContainer?.querySelectorAll('.btn-match-absent').forEach(btn => {
        btn.onclick = () => window.respondEvent('callups', btn.dataset.id, activeChildId, 'absent');
    });
}

// 4. RISPOSTA CONVOCAZIONE
window.respondEvent = async function(collectionName, docId, activeChildId, status) {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
         
        if (!docSnap.exists()) {
            alert("⚠️ Questa convocazione non è più attiva.");
            loadChildData(currentUserProfile);
            return;
        }

        const data = docSnap.data();
        const responses = data.responses || {};
        responses[activeChildId] = status;
         
        await updateDoc(docRef, { responses });

        await setDoc(doc(db, 'match_history', `${docId}_${activeChildId}`), {
            playerId: activeChildId,
            matchId: docId,
            title: `Partita vs ${data.opponent || 'Avversario'}`,
            date: data.date || 'Da definire',
            time: data.matchTime || '',
            location: data.location || 'Da definire',
            status: status,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        loadChildData(currentUserProfile);
    } catch (error) {
        console.error("Errore salvataggio risposta:", error);
    }
};

// 5. INVIO ALLENAMENTO
window.submitCustomTraining = async function(childId, teamName, childName, status) {
    const selectedDate = document.getElementById('custom-training-date')?.value;
    if (!selectedDate) {
        alert("Seleziona una data valida per l'allenamento.");
        return;
    }

    try {
        const [year, month, day] = selectedDate.split('-');
        const dateIt = `${day}/${month}/${year}`;

        const querySnapshot = await getDocs(collection(db, 'attendances'));
        let targetDoc = null;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (String(data.date || '').trim() === selectedDate || String(data.date || '').trim() === dateIt) {
                targetDoc = docSnap;
            }
        });

        let docRef;
        let recordList = [];

        if (targetDoc) {
            docRef = doc(db, 'attendances', targetDoc.id);
            recordList = targetDoc.data().records || targetDoc.data().record || [];
        } else {
            docRef = doc(collection(db, 'attendances'));
            await setDoc(docRef, {
                date: dateIt,
                teamId: teamName,
                notes: 'Seduta scelta da portale famiglia',
                records: [],
                record: []
            });
        }

        const cleanList = recordList.filter(r => String(r.playerId || r.id || '') !== String(childId));
        cleanList.push({
            id: String(childId),
            playerId: String(childId),
            name: childName,
            status: status,
            present: status === 'present'
        });

        await updateDoc(docRef, { records: cleanList, record: cleanList });
        alert(`Preferenza registrata con successo per il ${dateIt}!`);
        loadChildData(currentUserProfile);
    } catch (err) {
        console.error("Errore salvataggio allenamento:", err);
    }
};

// 6. ESPORTAZIONE
window.exportTrainingsHistory = function() {
    const records = document.querySelectorAll('#tab-content-trainings .bg-slate-50');
    if (records.length === 0) {
        alert("Nessun dato da esportare.");
        return;
    }

    let csvData = [["Data", "Stato Presenza", "Note"]];
    records.forEach(r => {
        const textParts = r.innerText.split('\n');
        const dataStr = textParts[0] ? textParts[0].trim() : '';
        const isPresent = r.innerText.includes('Presente ✅');
        csvData.push([dataStr, isPresent ? 'Presente' : 'Assente', '']);
    });

    exportToExcel(`Presenze_Allenamenti_${new Date().getTime()}.csv`, csvData);
};

// 7. GESTIONE TAB
window.switchParentTab = function(tabName) {
    const trainingsTab = document.getElementById('tab-content-trainings');
    const matchesTab = document.getElementById('tab-content-matches');
    const btnTrainings = document.getElementById('tab-btn-trainings');
    const btnMatches = document.getElementById('tab-btn-matches');

    if (!trainingsTab || !matchesTab) return;

    if (tabName === 'trainings') {
        trainingsTab.classList.remove('hidden');
        matchesTab.classList.add('hidden');
        btnTrainings.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition bg-white text-slate-900 shadow-sm";
        btnMatches.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900";
    } else {
        matchesTab.classList.remove('hidden');
        trainingsTab.classList.add('hidden');
        btnMatches.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition bg-white text-slate-900 shadow-sm";
        btnTrainings.className = "flex-1 py-2.5 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900";
    }
};
