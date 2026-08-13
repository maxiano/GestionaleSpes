/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori Unificata (Partite e Allenamenti) - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db, auth } from './firebase-init.js';
import { doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. FUNZIONE PRINCIPALE DI AVVIO
export async function initParentPortal(userProfile) {
    console.log("Inizializzazione portale genitori unificato per:", userProfile.name);
    
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

// 2. CARICAMENTO UNIFICATO DATI (Partite + Allenamenti in parallelo)
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

        // Scarichiamo entrambe le collezioni (partite e allenamenti) contemporaneamente
        const [callupsSnap, trainingsSnap] = await Promise.all([
            getDocs(collection(db, 'callups')),
            getDocs(collection(db, 'trainings'))
        ]);

        let unifiedEvents = [];

        // A. Elaborazione Partite (Callups)
        callupsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const callupTeamId = data.teamId || data.team || data.squadra || '';
            const invitedPlayers = data.players || [];
            const responses = data.responses || {};
            
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && (p === childId || p.startsWith(`${childId}|`)));
            const hasResponded = responses[childId] !== undefined;
            const isTeamMatch = callupTeamId && childTeamId && String(callupTeamId).toLowerCase() === String(childTeamId).toLowerCase();

            if (isExplicitlyInvited || hasResponded || isTeamMatch) {
                unifiedEvents.push({
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

        // B. Elaborazione Allenamenti (Trainings)
        trainingsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const trainingTeamId = data.teamId || data.team || '';
            const responses = data.responses || {};
            
            const hasResponded = responses[childId] !== undefined;
            const isTeamMatch = trainingTeamId && childTeamId && String(trainingTeamId).toLowerCase() === String(trainingTeamId).toLowerCase();

            if (hasResponded || isTeamMatch) {
                unifiedEvents.push({
                    id: docSnap.id,
                    collection: 'trainings',
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

        // Ordinamento cronologico unificato (dalla data più vicina alla più lontana)
        unifiedEvents.sort((a, b) => {
            const timeA = (a.date && a.date !== 'da definire') ? new Date(a.date).getTime() : 0;
            const timeB = (b.date && b.date !== 'da definire') ? new Date(b.date).getTime() : 0;
            return timeA - timeB;
        });

        renderPortalUI(unifiedEvents, childId, childTeamId || 'Assegnata');
    } catch (error) {
        console.error("Errore caricamento dati unificati:", error);
    }
}

// 3. RENDER GRAFICO DELLA TIMELINE UNIFICATA
function renderPortalUI(eventsList, childId, teamName) {
    const container = document.getElementById('parent-content-area');
    if (!container) return;

    if (!eventsList || eventsList.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
                <p class="text-xs text-slate-500 mt-4">Nessun impegno programmato al momento.</p>
            </div>
        `;
        return;
    }

    let eventsHTML = '';

    eventsList.forEach((ev) => {
        const currentResponse = ev.responses?.[childId] || null;
        
        // Badge di stato dinamico
        let statusBadge = currentResponse === 'confirmed' 
            ? `<span id="status-badge-${ev.id}" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>`
            : currentResponse === 'absent'
            ? `<span id="status-badge-${ev.id}" class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>`
            : `<span id="status-badge-${ev.id}" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>`;

        // Distintivo visivo se è Partita o Allenamento
        let badgeType = ev.type === 'match' 
            ? '<span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">⚽ PARTITA</span>'
            : '<span class="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-100">🏃‍♂️ ALLENAMENTO</span>';

        eventsHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3 last:mb-0 transition hover:shadow-md">
                <div class="flex flex-col gap-1.5">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-800 text-sm">${ev.title}</span>
                        ${badgeType}
                    </div>
                    <span class="text-xs text-slate-600">📅 Data: ${ev.date} ${ev.time ? '| ⏰ ' + ev.time : ''}</span>
                    <span class="text-xs text-slate-600">📍 Campo: ${ev.location} | ${ev.subInfo}</span>
                    <div class="mt-1">${statusBadge}</div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button onclick="window.respondEvent('${ev.collection}', '${ev.id}', '${childId}', 'confirmed')" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm hover:bg-emerald-700">Conferma ✅</button>
                    <button onclick="window.respondEvent('${ev.collection}', '${ev.id}', '${childId}', 'absent')" class="flex-1 bg-rose-50 text-rose-700 font-bold py-2 rounded-xl text-xs transition border border-rose-200 hover:bg-rose-100">Assente ❌</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
                <span class="text-[11px] text-slate-400 font-medium">Prossimi Impegni</span>
            </div>
            <div class="flex flex-col">${eventsHTML}</div>
        </div>
    `;
}

// 4. GESTIONE UNIFICATA DELLE RISPOSTE (Funziona sia per callups che trainings)
window.respondEvent = async function(collectionName, eventId, childId, status) {
    const badge = document.getElementById(`status-badge-${eventId}`);
    if (badge) {
        badge.className = status === 'confirmed' 
            ? "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"
            : "text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200";
        badge.innerText = status === 'confirmed' ? "Stato: Presenza Confermata ✅" : "Stato: Assenza Comunicata ❌";
    }

    await updateDoc(doc(db, collectionName, eventId), { [`responses.${childId}`]: status });
};
