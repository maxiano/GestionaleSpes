/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori - Gestionale Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db, auth } from './firebase-init.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"; // <--- Importa signOut direttamente

/**
 * Inizializza e carica l'HTML del portale genitori
 */
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

        // Tasto Logout corretto
        const logoutBtn = document.getElementById('btn-parent-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    console.log("Logout effettuato con successo");
                } catch (error) {
                    console.error("Errore durante il logout:", error);
                }
            });
        }

        // Carica dati figlio e convocazioni
        await loadChildData(userProfile);

    } catch (error) {
        console.error("Errore nel caricamento del portale genitori:", error);
    }
}

async function loadChildData(userProfile) {
    const childId = userProfile.childId; 
    if (!childId) {
        document.getElementById('parent-child-name').innerText = "Nessun atleta associato";
        document.getElementById('parent-content-area').innerHTML = `
            <div class="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-semibold border border-amber-200">
                Account non collegato a nessun atleta. Contatta la segreteria della Spes Montesacro.
            </div>`;
        return;
    }

    try {
        // 1. Legge il documento del ragazzo in 'players'
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);

        if (!childDoc.exists()) {
            document.getElementById('parent-child-name').innerText = "Atleta non trovato";
            return;
        }

        const childData = childDoc.data();
        const displayName = childData.lastName ? `${childData.lastName} ${childData.firstName}` : (childData.name || `${childData.cognome || ''} ${childData.nome || ''}`.trim());
        const teamName = childData.team || childData.group || childData.gruppo || childData.squadra || 'Non assegnata';

        document.getElementById('parent-child-name').innerText = displayName;

        // 2. Cerca la convocazione attiva per questo figlio
        const callupsRef = collection(db, 'callups');
        const querySnapshot = await getDocs(callupsRef);

        let activeCallup = null;
        let activeCallupId = null;

        querySnapshot.forEach((docSnap) => {
            const callupData = docSnap.data();
            const invitedPlayers = callupData.players || callupData.convocati || [];

            // Controlla se il figlio è tra i convocati
            const isFound = invitedPlayers.some(p => typeof p === 'string' && p.startsWith(`${childId}|`));

            if (isFound) {
                activeCallup = callupData;
                activeCallupId = docSnap.id; // Salviamo l'ID del documento della convocazione
            }
        });

        let callupHTML = '<p class="text-xs text-slate-500">Nessuna convocazione attiva al momento.</p>';
        let actionButtonsHTML = '';

        if (activeCallup && activeCallupId) {
            // Controlla se il genitore ha già risposto in passato
            const currentResponse = activeCallup.responses ? activeCallup.responses[childId] : null;
            
            let statusBadge = '';
            if (currentResponse === 'confirmed') {
                statusBadge = '<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>';
            } else if (currentResponse === 'absent') {
                statusBadge = '<span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>';
            } else {
                statusBadge = '<span class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>';
            }

            callupHTML = `
                <div class="flex flex-col gap-2">
                    <span class="font-bold text-slate-800 text-sm">📅 Partita vs ${activeCallup.opponent || 'Avversario'}</span>
                    <span class="text-xs text-slate-600">Data: ${activeCallup.date || 'Da definire'} - Ore: ${activeCallup.matchTime || ''}</span>
                    <span class="text-xs text-slate-600">Campo: ${activeCallup.location || 'Da definire'}</span>
                    <span class="text-xs text-slate-500">🕒 Ritrovo: ${activeCallup.gatheringTime || 'Da definire'}</span>
                    <div class="mt-1">${statusBadge}</div>
                </div>
            `;

            actionButtonsHTML = `
                <div class="flex gap-2 mt-2">
                    <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'confirmed')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm">
                        Conferma ✅
                    </button>
                    <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'absent')" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-rose-200">
                        Assente ❌
                    </button>
                </div>
            `;
        }

        // 3. Renderizza la schermata
        document.getElementById('parent-content-area').innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full w-max">
                    Squadra: ${teamName}
                </span>
                
                <h4 class="font-bold text-sm text-slate-800 mt-2">📩 Prossima Convocazione</h4>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    ${callupHTML}
                </div>

                ${actionButtonsHTML}
            </div>
        `;

    } catch (error) {
        console.error("Errore nel caricamento dei dati convocazione:", error);
    }
}

// Funzione globale agganciata ai bottoni per scrivere la risposta su Firestore
window.respondCallup = async function(callupId, childId, status) {
    try {
        const callupRef = doc(db, 'callups', callupId);
        
        // Aggiorna o inserisce lo stato nella mappa 'responses' del documento Firestore
        await updateDoc(callupRef, {
            [`responses.${childId}`]: status
        });

        // Ricarica i dati per aggiornare la grafica con il nuovo stato
        const userProfileStr = sessionStorage.getItem('userProfile') || localStorage.getItem('userProfile');
        if (userProfileStr) {
            loadChildData(JSON.parse(userProfileStr));
        }

        alert(status === 'confirmed' ? "Presenza confermata con successo! ✅" : "Assenza comunicata al Mister. ❌");
    } catch (error) {
        console.error("Errore durante il salvataggio della risposta:", error);
        alert("Errore di connessione. Riprova.");
    }
};
