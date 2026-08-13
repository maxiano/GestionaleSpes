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

// 2. FUNZIONE DI CARICAMENTO DATI (Logica della partita/convocazione)
async function loadChildData(userProfile) {
    const childId = userProfile.childId; 
    if (!childId) return;

    try {
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);
        if (!childDoc.exists()) return;

        const childData = childDoc.data();
        const displayName = `${childData.lastName || ''} ${childData.firstName || ''}`.trim();
        const teamName = childData.teamId || childData.group || childData.gruppo || childData.squadra || '';

        document.getElementById('parent-child-name').innerText = displayName;

        // Cerca la partita per la squadra
        const callupsRef = collection(db, 'callups');
        const querySnapshot = await getDocs(callupsRef);

        let activeCallup = null;
        let activeCallupId = null;

        querySnapshot.forEach((docSnap) => {
            const callupData = docSnap.data();
            const matchTeam = callupData.team || callupData.squadra || '';
            const invitedPlayers = callupData.players || [];
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && p.startsWith(`${childId}|`));

            if ((matchTeam && teamName && matchTeam.toLowerCase() === teamName.toLowerCase()) || isExplicitlyInvited) {
                activeCallup = callupData;
                activeCallupId = docSnap.id;
            }
        });

        renderPortalUI(activeCallup, activeCallupId, childId, teamName);
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}

// 3. FUNZIONE GRAFICA (Render UI)
function renderPortalUI(activeCallup, activeCallupId, childId, teamName) {
    const container = document.getElementById('parent-content-area');
    if (!container) return;

    let callupHTML = '<p class="text-xs text-slate-500">Nessuna partita programmata al momento.</p>';
    let actionButtonsHTML = '';

    if (activeCallup && activeCallupId) {
        const currentResponse = activeCallup.responses?.[childId] || null;
        
        let statusBadge = currentResponse === 'confirmed' 
            ? '<span id="status-badge" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>'
            : currentResponse === 'absent'
            ? '<span id="status-badge" class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>'
            : '<span id="status-badge" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>';

        callupHTML = `
            <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-800 text-sm">📅 Partita vs ${activeCallup.opponent || 'Avversario'}</span>
                <span class="text-xs text-slate-600">Data: ${activeCallup.date || 'Da definire'} | ${activeCallup.matchTime || ''}</span>
                <span class="text-xs text-slate-600">📍 Campo: ${activeCallup.location || 'Da definire'}</span>
                <div class="mt-1">${statusBadge}</div>
            </div>
        `;

        actionButtonsHTML = `
            <div class="flex gap-2 mt-2">
                <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'confirmed')" class="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition">Conferma ✅</button>
                <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'absent')" class="flex-1 bg-rose-50 text-rose-700 font-bold py-2.5 rounded-xl text-xs transition border border-rose-200">Assente ❌</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">Squadra: ${teamName}</span>
            <div class="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">${callupHTML}</div>
            ${actionButtonsHTML}
        </div>
    `;
}

// 4. RISPOSTA (Globale per il click HTML)
window.respondCallup = async function(callupId, childId, status) {
    const badge = document.getElementById('status-badge');
    if (badge) {
        badge.className = status === 'confirmed' 
            ? "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"
            : "text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200";
        badge.innerText = status === 'confirmed' ? "Stato: Presenza Confermata ✅" : "Stato: Assenza Comunicata ❌";
    }

    await updateDoc(doc(db, 'callups', callupId), { [`responses.${childId}`]: status });
};
