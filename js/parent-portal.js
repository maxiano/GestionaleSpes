/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori Unificata (Partite e Allenamenti) - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db, auth } from './firebase-init.js';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. FUNZIONE PRINCIPALE DI AVVIO
export async function initParentPortal(userProfile) {
    console.log("Inizializzazione portale genitori per:", userProfile.name);
    
    document.getElementById('app-dashboard').classList.add('hidden');
    
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

        await loadChildData(userProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

// 2. CARICAMENTO E DIVISIONE DATI (Partite e Allenamenti Separati)
async function loadChildData(userProfile) {
    const childId = userProfile.childId; 
    if (!childId) return;

    try {
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);
        if (!childDoc.exists()) return;

        const childData = childDoc.data();
        const displayName = `${childData.lastName || ''} ${childData.firstName || ''}`.trim();
        const childTeamId = childData.teamId || childData.team || childData.squadra || childData.group || '';

        document.getElementById('parent-child-name').innerText = displayName;

        // Scarichiamo callups (partite) e attendances (allenamenti) in parallelo
        const [callupsSnap, attendancesSnap] = await Promise.all([
            getDocs(collection(db, 'callups')),
            getDocs(collection(db, 'attendances'))
        ]);

        let matchesList = [];
        let trainingsList = [];

        // A. Elaborazione Partite (Callups)
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

        // B. Elaborazione Allenamenti (Attendances - leggendo l'array 'record')
        attendancesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const trainingTeamId = data.teamId || data.team || data.squadra || '';
            
            // Mappiamo l'array 'record' o 'records'
            let responses = {};
            const recordList = data.record || data.records || [];
            if (Array.isArray(recordList)) {
                recordList.forEach(r => {
                    if (r.playerId) {
                        responses[r.playerId] = r.status;
                    }
                });
            }
            
            const hasResponded = responses[childId] !== undefined;
            const isTeamMatch = !trainingTeamId || !childTeamId || 
                String(trainingTeamId).toLowerCase().trim() === String(childTeamId).toLowerCase().trim();

            if (isTeamMatch || hasResponded) {
                trainingsList.push({
                    id: docSnap.id,
                    collection: 'attendances',
                    type: 'training',
                    title: `Allenamento (${data.notes || 'Seduta regolare'})`,
                    date: data.date || 'Da definire',
                    time: data.time || '',
                    location: data.location || 'Da definire',
                    subInfo: data.notes ? `Note: ${data.notes}` : 'Campo principale',
                    responses: responses
                });
            }
        });

        // Ordinamento cronologico per entrambe le liste
        matchesList.sort((a, b) => (new Date(a.date || 0)).getTime() - (new Date(b.date || 0)).getTime());
        trainingsList.sort((a, b) => (new Date(a.date || 0)).getTime() - (new Date(b.date || 0)).getTime());

        renderSeparatedPortalUI(matchesList, trainingsList, childId, childTeamId || 'Assegnata');
    } catch (error) {
        console.error("Errore caricamento dati separati:", error);
    }
}

// 3. RENDER GRAFICO CON SEZIONI SEPARATE (Partite vs Allenamenti)
function renderSeparatedPortalUI(matchesList, trainingsList, childId, teamName) {
    const container = document.getElementById('parent-content-area');
    if (!container) return;

    // Helper per generare l'HTML di una lista di eventi
    function generateEventsHTML(eventsList) {
        if (!eventsList || eventsList.length === 0) {
            return `<p class="text-xs text-slate-400 italic py-2">Nessun impegno programmato.</p>`;
        }

        let html = '';
        eventsList.forEach((ev) => {
            const currentResponse = ev.responses?.[childId] || null;
            
            let statusBadge = currentResponse === 'confirmed' || currentResponse === 'present'
                ? `<span id="status-badge-${ev.id}" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>`
                : currentResponse === 'absent'
                ? `<span id="status-badge-${ev.id}" class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>`
                : `<span id="status-badge-${ev.id}" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>`;

            let badgeType = ev.type === 'match' 
                ? '<span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">⚽ PARTITA</span>'
                : '<span class="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-100">🏃‍♂️ ALLENAMENTO</span>';

            const confirmVal = ev.type === 'match' ? 'confirmed' : 'present';

            html += `
                <div class="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 mb-2.5 last:mb-0 transition hover:bg-white hover:shadow-sm">
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-800 text-sm">${ev.title}</span>
                            ${badgeType}
                        </div>
                        <span class="text-xs text-slate-600">📅 Data: ${ev.date} ${ev.time ? '| ⏰ ' + ev.time : ''}</span>
                        <span class="text-xs text-slate-600">📍 Campo: ${ev.location} | ${ev.subInfo}</span>
                        <div class="mt-1">${statusBadge}</div>
                    </div>
                    <div class="flex gap-2 mt-2.5">
                        <button onclick="window.respondEvent('${ev.collection}', '${ev.id}', '${childId}', '${confirmVal}')" class="flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs transition shadow-sm hover:bg-emerald-700">Conferma ✅</button>
                        <button onclick="window.respondEvent('${ev.collection}', '${ev.id}', '${childId}', 'absent')" class="flex-1 bg-rose-50 text-rose-700 font-bold py-1.5 rounded-lg text-xs transition border border-rose-200 hover:bg-rose-100">Assente ❌</button>
                    </div>
                </div>
            `;
        });
        return html;
    }

    container.innerHTML = `
        <div class="space-y-4">
            <!-- HEADER SQUADRA -->
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <span class="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
                <span class="text-[11px] text-slate-400 font-medium">Portale Famiglia</span>
            </div>

            <!-- BOX PARTITE -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <span class="text-base">⚽</span>
                    <h3 class="font-bold text-slate-800 text-sm">Partite e Convocazioni</h3>
                </div>
                <div class="flex flex-col">${generateEventsHTML(matchesList)}</div>
            </div>

            <!-- BOX ALLENAMENTI -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <span class="text-base">🏃‍♂️</span>
                    <h3 class="font-bold text-slate-800 text-sm">Sedute di Allenamento</h3>
                </div>
                <div class="flex flex-col">${generateEventsHTML(trainingsList)}</div>
            </div>
        </div>
    `;
};

// 4. GESTIONE UNIFICATA DELLE RISPOSTE (Aggiorna array 'record' per attendances e mappa per callups)
window.respondEvent = async function(collectionName, eventId, childId, status) {
    const statusBadge = document.getElementById(`status-badge-${eventId}`);

    try {
        const docRef = doc(db, collectionName, eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            if (collectionName === 'attendances') {
                // Aggiornamento array 'record' (o 'records') per gli allenamenti
                let data = docSnap.data();
                let recordList = data.record || data.records || [];
                const index = recordList.findIndex(r => r.playerId === childId);
                
                if (index > -1) {
                    recordList[index].status = status;
                } else {
                    recordList.push({ playerId: childId, status: status, name: '' });
                }

                // Salviamo sul campo corretto in base a quale dei due esiste nel doc
                const updateField = data.record ? { record: recordList } : { records: recordList };
                await updateDoc(docRef, updateField);
            } else {
                // Salvataggio standard su mappa 'responses' per le partite
                let responses = docSnap.data().responses || {};
                responses[childId] = status; 
                await updateDoc(docRef, { responses: responses });
            }
        }

        if (statusBadge) {
            if (status === 'confirmed' || status === 'present') {
                statusBadge.className = "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200";
                statusBadge.innerText = "Stato: Presenza Confermata ✅";
            } else {
                statusBadge.className = "text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200";
                statusBadge.innerText = "Stato: Assenza Comunicata ❌";
            }
        }

    } catch (err) {
        console.error("Errore durante l'invio della risposta:", err);
        alert("Errore di connessione. Riprova.");
    }
};
