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

    const childIds = getChildIds(userProfile);
    if (childIds.length === 0) {
        console.error("Nessun ID bambino trovato nel profilo utente.");
        return;
    }

    // Se l'ID attivo non è valido, prendiamo il primo disponibile
    if (!activeChildId || !childIds.includes(activeChildId)) {
        activeChildId = childIds[0];
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

        const activeChildData = childrenDataMap[activeChildId] || {};
        const activeDisplayName = `${activeChildData.lastName || ''} ${activeChildData.firstName || ''}`.trim() || userProfile?.name;
        const activeTeamId = activeChildData.teamId || activeChildData.team || activeChildData.squadra || activeChildData.group || userProfile?.teamId || '';

        // Gestione Intestazione e Selettore Figli (se > 1)
        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) {
            if (childIds.length > 1) {
                let selectHtml = `<select id="parent-child-switcher" class="bg-slate-800 text-emerald-400 font-extrabold text-lg border border-slate-700 rounded-lg p-1 focus:outline-none focus:border-emerald-500 cursor-pointer">`;
                childIds.forEach(id => {
                    const cData = childrenDataMap[id] || {};
                    const cName = `${cData.lastName || ''} ${cData.firstName || ''}`.trim() || `Figlio ${id}`;
                    const selectedAttr = (id === activeChildId) ? 'selected' : '';
                    selectHtml += `<option value="${id}" ${selectedAttr}>${cName}</option>`;
                });
                selectHtml += `</select>`;
                nameEl.innerHTML = selectHtml;

                // Event listener per il cambio figlio
                const switcher = document.getElementById('parent-child-switcher');
                if (switcher) {
                    switcher.onchange = (e) => {
                        activeChildId = e.target.value;
                        loadChildData(currentUserProfile); // ricarica i dati per il nuovo figlio selezionato
                    };
                }
            } else {
                nameEl.innerText = activeDisplayName;
            }
        }

        const [callupsSnap, attendancesSnap] = await Promise.all([
            getDocs(collection(db, 'callups')),
            getDocs(collection(db, 'attendances'))
        ]);

        let matchesList = [];
        let trainingsHistory = [];

        // A. Elaborazione Partite per il figlio attivo
        callupsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const callupTeamId = data.teamId || data.team || data.squadra || '';
            const invitedPlayers = data.players || [];
            const responses = data.responses || {};
             
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && (p === activeChildId || p.startsWith(`${activeChildId}|`)));
            const hasResponded = responses[activeChildId] !== undefined;
            const isTeamMatch = callupTeamId && activeTeamId && String(callupTeamId).toLowerCase() === String(activeTeamId).toLowerCase();

            if (isExplicitlyInvited || hasResponded || isTeamMatch || !callupTeamId) {
                matchesList.push({
                    id: docSnap.id,
                    collection: 'callups',
                    type: 'match',
                    title: `Partita vs ${data.opponent || 'Avversario'}`,
                    date: data.date || 'Da definire',
                    time: data.matchTime || '',
                    location: data.location || 'Da definire',
                    subInfo: `Ritrovo: ${data.gatheringTime || 'Da definire'}`,
                    responses: responses
                });
            }
        });

        // B. Storico Allenamenti per il figlio attivo
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

        matchesList.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        trainingsHistory.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));

        renderPortalUI(matchesList, trainingsHistory, activeChildId, activeTeamId || 'Assegnata', activeDisplayName);
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

    // --- Elaborazione Partite ---
    let matchesHTML = '';
    if (matchesList.length === 0) {
        matchesHTML = `<p class="text-xs text-slate-400 italic py-2 text-center">Nessuna convocazione attiva.</p>`;
    } else {
        matchesList.forEach((ev) => {
            const currentResponse = ev.responses?.[activeChildId] || null;
            let statusBadge = currentResponse === 'confirmed' || currentResponse === 'present'
                ? `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Presenza Confermata ✅</span>`
                : currentResponse === 'absent'
                ? `<span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Assenza Comunicata ❌</span>`
                : `<span class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">In attesa di risposta ⏳</span>`;

            matchesHTML += `
                <div class="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 mb-2.5 transition">
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
                        <button data-id="${ev.id}" data-status="confirmed" class="btn-match-confirm flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs transition shadow-sm hover:bg-emerald-700">Conferma ✅</button>
                        <button data-id="${ev.id}" data-status="absent" class="btn-match-absent flex-1 bg-rose-50 text-rose-700 font-bold py-1.5 rounded-lg text-xs transition border border-rose-200 hover:bg-rose-100">Assente ❌</button>
                    </div>
                </div>
            `;
        });
    }

    // --- Elaborazione Storico Allenamenti ---
    let historyHTML = '';
    if (trainingsHistory.length === 0) {
        historyHTML = `<p class="text-xs text-slate-400 italic py-1 text-center">Nessun allenamento comunicato di recente.</p>`;
    } else {
        const mesi = [
            "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
            "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
        ];

        const grouped = trainingsHistory.reduce((acc, t) => {
            const parts = t.date.split('/');
            if (parts.length === 3) {
                const meseIndex = parseInt(parts[1], 10) - 1;
                const nomeMese = mesi[meseIndex] || "Altro";
                const anno = parts[2];
                const key = `${nomeMese} ${anno}`;
                 
                if (!acc[key]) acc[key] = [];
                acc[key].push(t);
            }
            return acc;
        }, {});

        for (const [monthYear, records] of Object.entries(grouped)) {
            historyHTML += `<div class="mt-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">🗓️ ${monthYear}</div>`;
            records.forEach((t) => {
                let badge = t.status === 'present' 
                    ? '<span class="text-emerald-600 font-bold">Presente ✅</span>' 
                    : '<span class="text-rose-600 font-bold">Assente ❌</span>';
                historyHTML += `
                    <div class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-1.5 transition">
                        <div>
                            <span class="font-semibold text-slate-700">${t.date}</span>
                            <span class="text-slate-500 ml-2 italic">(${t.notes})</span>
                        </div>
                        <div>${badge}</div>
                    </div>
                `;
            });
        }
    }

    // --- Inserimento nei rispettivi TAB ---
    const matchesContainer = document.getElementById('tab-content-matches');
    if (matchesContainer) {
        matchesContainer.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <span class="text-base">⚽</span>
                    <h3 class="font-bold text-slate-800 text-sm">Partite e Convocazioni</h3>
                </div>
                <div class="flex flex-col">${matchesHTML}</div>
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
                    <div class="flex items-center gap-1.5 mb-2.5">
                        <span class="text-sm">📋</span>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Storico Presenze Allenamenti</h4>
                    </div>
                    <div class="flex flex-col">${historyHTML}</div>
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
};

// 4. GESTIONE RISPOSTE PARTITE
window.respondEvent = async function(collectionName, eventId, childId, status) {
    if (!db) return;
    try {
        const docRef = doc(db, collectionName, eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let responses = docSnap.data().responses || {};
            responses[childId] = status; 
            await updateDoc(docRef, { responses: responses });
        }

        alert("Risposta salvata con successo!");
        if (currentUserProfile) {
            await loadChildData(currentUserProfile);
        }
    } catch (err) {
        console.error("Errore salvataggio partita:", err);
        alert("Errore di connessione. Riprova.");
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
        const dateIso = selectedDate;                            // 2026-08-13
        const dateIt = `${day}/${month}/${year}`;                // 13/08/2026
        const dateItAlt = `${parseInt(day)}/${parseInt(month)}/${year}`; // 13/8/2026

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
