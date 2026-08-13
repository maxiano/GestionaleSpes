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

// 1. FUNZIONE PRINCIPALE DI AVVIO
export async function initParentPortal(userProfile) {
    console.log("Inizializzazione portale genitori per:", userProfile?.name);
    currentUserProfile = userProfile; // Salviamo il profilo globale
     
    const dashboard = document.getElementById('app-dashboard');
    if (dashboard) dashboard.classList.add('hidden');
     
    let portalWrapper = document.getElementById('dynamic-parent-container');
    if (!portalWrapper) {
        portalWrapper = document.createElement('div');
        portalWrapper.id = 'dynamic-parent-container';
        document.body.appendChild(portalWrapper);
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

        await loadChildData(currentUserProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

// 2. CARICAMENTO DATI (Partite + Storico Presenze Allenamenti)
async function loadChildData(userProfile) {
    if (!db) {
        console.error("❌ ERRORE CRITICO: L'oggetto 'db' è UNDEFINED.");
        return;
    }

    const childId = userProfile?.childId; 
    if (!childId) {
        console.error("ID del bambino non trovato nel profilo utente.");
        return;
    }

    try {
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);
        if (!childDoc.exists()) {
            console.error("Scheda giocatore non trovata su Firestore.");
            return;
        }

        const childData = childDoc.data();
        const displayName = `${childData.lastName || ''} ${childData.firstName || ''}`.trim() || userProfile?.name;
        const childTeamId = childData.teamId || childData.team || childData.squadra || childData.group || userProfile?.teamId || '';

        const nameEl = document.getElementById('parent-child-name');
        if (nameEl) nameEl.innerText = displayName;

        const [callupsSnap, attendancesSnap] = await Promise.all([
            getDocs(collection(db, 'callups')),
            getDocs(collection(db, 'attendances'))
        ]);

        let matchesList = [];
        let trainingsHistory = [];

        // A. Elaborazione Partite
        callupsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const callupTeamId = data.teamId || data.team || data.squadra || '';
            const invitedPlayers = data.players || [];
            const responses = data.responses || {};
             
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && (p === childId || p.startsWith(`${childId}|`)));
            const hasResponded = responses[childId] !== undefined;
            const isTeamMatch = callupTeamId && childTeamId && String(callupTeamId).toLowerCase() === String(childTeamId).toLowerCase();

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

        // B. Storico Allenamenti
        attendancesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const recordList = data.record || data.records || [];
             
            if (Array.isArray(recordList)) {
                const myRecord = recordList.find(r => String(r.playerId || r.id) === String(childId));
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

        // Funzione di supporto per convertire qualsiasi formato data in un timestamp ordinabile
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

        renderPortalUI(matchesList, trainingsHistory, childId, childTeamId || 'Assegnata', displayName);
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}

// 3. RENDER GRAFICO DEL PORTALE GENITORI
function renderPortalUI(matchesList, trainingsHistory, childId, teamName, childName) {
    const container = document.getElementById('parent-content-area');
    if (!container) return;

    let matchesHTML = '';
    if (matchesList.length === 0) {
        matchesHTML = `<p class="text-xs text-slate-400 italic py-2">Nessuna convocazione attiva.</p>`;
    } else {
        matchesList.forEach((ev) => {
            const currentResponse = ev.responses?.[childId] || null;
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

    let historyHTML = '';
    if (trainingsHistory.length === 0) {
        historyHTML = `<p class="text-xs text-slate-400 italic py-1">Nessuna preferenza inviata di recente.</p>`;
    } else {
        trainingsHistory.forEach((t) => {
            let badge = t.status === 'present' 
                ? '<span class="text-emerald-600 font-bold">Presente ✅</span>' 
                : '<span class="text-rose-600 font-bold">Assente ❌</span>';
            historyHTML += `
                <div class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-1.5">
                    <div>
                        <span class="font-semibold text-slate-700">📅 ${t.date}</span>
                        <span class="text-slate-500 ml-2">(${t.notes})</span>
                    </div>
                    <div>${badge}</div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <span class="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
                <span class="text-[11px] text-slate-400 font-medium">Portale Famiglia</span>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <span class="text-base">⚽</span>
                    <h3 class="font-bold text-slate-800 text-sm">Partite e Convocazioni</h3>
                </div>
                <div class="flex flex-col">${matchesHTML}</div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
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

                <div class="mt-4">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">I tuoi ultimi invii:</span>
                    <div class="flex flex-col">${historyHTML}</div>
                </div>
            </div>
        </div>
    `;

    // Event Listeners per i pulsanti Allenamento
    const btnPresent = document.getElementById('btn-submit-present');
    const btnAbsent = document.getElementById('btn-submit-absent');

    if (btnPresent) {
        btnPresent.onclick = () => window.submitCustomTraining(childId, teamName, childName, 'present');
    }
    if (btnAbsent) {
        btnAbsent.onclick = () => window.submitCustomTraining(childId, teamName, childName, 'absent');
    }

    // Event Listeners per i pulsanti Partite (Callups)
    container.querySelectorAll('.btn-match-confirm').forEach(btn => {
        btn.onclick = () => window.respondEvent('callups', btn.dataset.id, childId, 'confirmed');
    });
    container.querySelectorAll('.btn-match-absent').forEach(btn => {
        btn.onclick = () => window.respondEvent('callups', btn.dataset.id, childId, 'absent');
    });
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

// 5. GESTIONE INVIO ALLENAMENTO PERSONALIZZATO (SINCRONIZZATA CON IL REGISTRO DEL MISTER)
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
        const dateIso = selectedDate;                           // 2026-08-13
        const dateIt = `${day}/${month}/${year}`;               // 13/08/2026
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
            console.log("✅ Trovato documento esistente ID:", targetDoc.id, data);
             
            recordList = data.records || data.record || data.presenze || [];
        } else {
            console.log("⚠️ Nessun documento trovato per la data. Ne creo uno nuovo.");
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

        console.log("🎉 Salvataggio sincronizzato con il registro mister completato!");
        alert(`Preferenza registrata con successo per il ${dateIt}!`);
         
        if (currentUserProfile) {
            await loadChildData(currentUserProfile);
        }

    } catch (err) {
        console.error("❌ ERRORE DURANTE IL SALVATAGGIO:", err);
        alert("Impossibile salvare: controlla la console.");
    }
};

window.debugCheckAttendances = async function() {
    const querySnapshot = await getDocs(collection(db, 'attendances'));
    console.log("📊 --- ELENCO COMPLETO DOCUMENTI ATTENDANCES NEL DB ---");
    querySnapshot.forEach(docSnap => {
        console.log(`ID: ${docSnap.id}`, docSnap.data());
    });
};
