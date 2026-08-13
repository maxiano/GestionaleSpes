/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori - Gestionale Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db, auth } from './firebase-init.js';
import { doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. FUNZIONE PRINCIPALE DI AVVIO (quella che app.js chiama)
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
                window.location.reload(); // Ricarica per tornare al login
            });
        }

        // Avvia il caricamento dati
        await loadChildData(userProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

// 2. FUNZIONE DI CARICAMENTO DATI (Raccoglie tutte le convocazioni in modo sicuro)
async function loadChildData(userProfile) {
    const childId = userProfile.childId; 
    if (!childId) return;

    try {
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);
        if (!childDoc.exists()) return;

        const childData = childDoc.data();
        const displayName = `${childData.lastName || ''} ${childData.firstName || ''}`.trim();
        
        // Recupera la squadra del ragazzo da qualsiasi campo possibile
        const childTeamId = childData.teamId || childData.team || childData.squadra || childData.group || '';

        document.getElementById('parent-child-name').innerText = displayName;

        // Cerca tutte le convocazioni
        const callupsRef = collection(db, 'callups');
        const querySnapshot = await getDocs(callupsRef);

        let userCallups = [];

        querySnapshot.forEach((docSnap) => {
            const callup = docSnap.data();
            const callupTeamId = callup.teamId || callup.team || callup.squadra || '';
            const invitedPlayers = callup.players || [];
            
            // Verifica se il ragazzo è invitato esplicitamente o fa parte della squadra
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && (p === childId || p.startsWith(`${childId}|`)));
            const isTeamMatch = callupTeamId && childTeamId && String(callupTeamId).toLowerCase() === String(childTeamId).toLowerCase();

            if (isTeamMatch || isExplicitlyInvited) {
                userCallups.push({
                    id: docSnap.id,
                    ...callup
                });
            }
        });

        // Ordinamento sicuro: gestisce senza errori date vuote o "da definire"
        userCallups.sort((a, b) => {
            const timeA = (a.date && a.date !== 'da definire') ? new Date(a.date).getTime() : 0;
            const timeB = (b.date && b.date !== 'da definire') ? new Date(b.date).getTime() : 0;
            return timeA - timeB;
        });

        renderPortalUI(userCallups, childId, childTeamId || 'Assegnata');
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}

// 3. FUNZIONE GRAFICA (Render UI per la lista completa)
function renderPortalUI(callupsList, childId, teamName) {
    const container = document.getElementById('parent-content-area');
    if (!container) return;

    if (!callupsList || callupsList.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
                <p class="text-xs text-slate-500 mt-3">Nessuna partita programmata al momento.</p>
            </div>
        `;
        return;
    }

    let callupsHTML = '';

    callupsList.forEach((callup) => {
        const currentResponse = callup.responses?.[childId] || null;
        
        let statusBadge = currentResponse === 'confirmed' 
            ? `<span id="status-badge-${callup.id}" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>`
            : currentResponse === 'absent'
            ? `<span id="status-badge-${callup.id}" class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>`
            : `<span id="status-badge-${callup.id}" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>`;

        // Gestione pulita se i campi sono "da definire" o vuoti
        const matchDate = callup.date ? callup.date : 'Da definire';
        const matchTime = callup.matchTime ? callup.matchTime : '';
        const matchLocation = callup.location ? callup.location : 'Da definire';
        const gatheringTime = callup.gatheringTime ? callup.gatheringTime : 'Da definire';

        callupsHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3 last:mb-0">
                <div class="flex flex-col gap-1.5">
                    <span class="font-bold text-slate-800 text-sm">📅 Partita vs ${callup.opponent || 'Avversario'}</span>
                    <span class="text-xs text-slate-600">Data: ${matchDate} ${matchTime ? '| ' + matchTime : ''}</span>
                    <span class="text-xs text-slate-600">📍 Campo: ${matchLocation} | ⏰ Ritrovo: ${gatheringTime}</span>
                    <div class="mt-1">${statusBadge}</div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button onclick="window.respondCallup('${callup.id}', '${childId}', 'confirmed')" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition">Conferma ✅</button>
                    <button onclick="window.respondCallup('${callup.id}', '${childId}', 'absent')" class="flex-1 bg-rose-50 text-rose-700 font-bold py-2 rounded-xl text-xs transition border border-rose-200">Assente ❌</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
            <div class="mt-3 flex flex-col">${callupsHTML}</div>
        </div>
    `;
}

// 4. RISPOSTA (Aggiornato per gestire singoli badge con ID dinamico)
window.respondCallup = async function(callupId, childId, status) {
    const badge = document.getElementById(`status-badge-${callupId}`);
    if (badge) {
        badge.className = status === 'confirmed' 
            ? "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"
            : "text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200";
        badge.innerText = status === 'confirmed' ? "Stato: Presenza Confermata ✅" : "Stato: Assenza Comunicata ❌";
    }

    await updateDoc(doc(db, 'callups', callupId), { [`responses.${childId}`]: status });
};
