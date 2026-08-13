/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori - Gestionale Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db, auth } from './firebase-init.js';
import { doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Funzione principale che carica i dati del figlio e la partita attiva per la sua squadra
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
        // 1. Legge il profilo del ragazzo
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);

        if (!childDoc.exists()) {
            document.getElementById('parent-child-name').innerText = "Atleta non trovato";
            return;
        }

        const childData = childDoc.data();
        const displayName = childData.lastName ? `${childData.lastName} ${childData.firstName}` : (childData.name || `${childData.cognome || ''} ${childData.nome || ''}`.trim());
        
        // Estrae la squadra/gruppo del ragazzo (supporta vari nomi di campi nel DB)
        const teamName = childData.team || childData.group || childData.gruppo || childData.squadra || '';

        document.getElementById('parent-child-name').innerText = displayName;

        // 2. Cerca le partite pubblicate nella collezione 'callups' abbinate alla squadra
        const callupsRef = collection(db, 'callups');
        const querySnapshot = await getDocs(callupsRef);

        let activeCallup = null;
        let activeCallupId = null;

        querySnapshot.forEach((docSnap) => {
            const callupData = docSnap.data();
            
            // Cerca la partita associata alla squadra del ragazzo (o se il ragazzo è esplicitamente nell'array players)
            const matchTeam = callupData.teamId || callupData.squadra || '';
            const invitedPlayers = callupData.players || callupData.convocati || [];
            const isExplicitlyInvited = invitedPlayers.some(p => typeof p === 'string' && p.startsWith(`${childId}|`));

            if ((matchTeam && teamName && matchTeam.toLowerCase() === teamName.toLowerCase()) || isExplicitlyInvited) {
                activeCallup = callupData;
                activeCallupId = docSnap.id;
            }
        });

        // 3. Renderizza la schermata per il genitore
        renderPortalUI(activeCallup, activeCallupId, childId, teamName);

    } catch (error) {
        console.error("Errore nel caricamento dei dati convocazione:", error);
    }
}

// Funzione grafica per disegnare il portale
function renderPortalUI(activeCallup, activeCallupId, childId, teamName) {
    let callupHTML = '<p class="text-xs text-slate-500">Nessuna partita o convocazione attiva al momento.</p>';
    let actionButtonsHTML = '';

    if (activeCallup && activeCallupId) {
        // Legge lo stato attuale della risposta per questo ragazzo
        const currentResponse = activeCallup.responses && activeCallup.responses[childId] ? activeCallup.responses[childId] : null;
        
        let statusBadge = '';
        if (currentResponse === 'confirmed') {
            statusBadge = '<span id="status-badge" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Stato: Presenza Confermata ✅</span>';
        } else if (currentResponse === 'absent') {
            statusBadge = '<span id="status-badge" class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">Stato: Assenza Comunicata ❌</span>';
        } else {
            statusBadge = '<span id="status-badge" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Stato: In attesa di risposta ⏳</span>';
        }

        // Informazioni visibili fin dal mercoledì
        callupHTML = `
            <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-800 text-sm">📅 Partita vs ${activeCallup.opponent || 'Avversario'}</span>
                <span class="text-xs text-slate-600">Data: ${activeCallup.date || 'Da definire'} - Ore: ${activeCallup.matchTime || ''}</span>
                <span class="text-xs text-slate-600">Campo: ${activeCallup.location || 'Da definire'}</span>
                <span class="text-xs text-slate-500">🕒 Ritrovo: ${activeCallup.gatheringTime || 'Da definire'}</span>
                <div class="mt-1">${statusBadge}</div>
                <div class="mt-1 p-2 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100">
                    ℹ️ Puoi comunicare fin da ora la tua presenza o eventuale assenza in anticipo. La convocazione ufficiale e definitiva verrà confermata dopo l'ultimo allenamento.
                </div>
            </div>
        `;

        // Bottoni interattivi sempre attivi per il genitore
        actionButtonsHTML = `
            <div class="flex gap-2 mt-2">
                <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'confirmed')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm cursor-pointer">
                    Conferma ✅
                </button>
                <button onclick="window.respondCallup('${activeCallupId}', '${childId}', 'absent')" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-rose-200 cursor-pointer">
                    Assente ❌
                </button>
            </div>
        `;
    }

    document.getElementById('parent-content-area').innerHTML = `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
            <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full w-max">
                Squadra: ${teamName || 'Non assegnata'}
            </span>
            
            <h4 class="font-bold text-sm text-slate-800 mt-2">📩 Programma Gara & Convocazione</h4>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                ${callupHTML}
            </div>

            ${actionButtonsHTML}
        </div>
    `;
}

// Funzione globale per registrare il click del genitore con aggiornamento grafico istantaneo
window.respondCallup = async function(callupId, childId, status) {
    // 1. Aggiornamento visivo immediato sulla pagina del genitore
    const badge = document.getElementById('status-badge');
    if (badge) {
        if (status === 'confirmed') {
            badge.className = "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200";
            badge.innerText = "Stato: Presenza Confermata ✅";
        } else {
            badge.className = "text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200";
            badge.innerText = "Stato: Assenza Comunicata ❌";
        }
    }

    try {
        // 2. Salvataggio in tempo reale su Firebase (collezione 'callups')
        const callupRef = doc(db, 'callups', callupId);
        await updateDoc(callupRef, {
            [`responses.${childId}`]: status
        });
        console.log("Risposta anticipata registrata con successo su Firestore!");

    } catch (error) {
        console.error("Errore durante il salvataggio della risposta:", error);
        alert("Errore di connessione durante il salvataggio. Riprova.");
    }
};

// Esempio di avvio al caricamento della pagina (mantieni la tua logica di autenticazione esistente)
document.addEventListener('DOMContentLoaded', () => {
    const userProfileStr = sessionStorage.getItem('userProfile') || localStorage.getItem('userProfile');
    if (userProfileStr) {
        loadChildData(JSON.parse(userProfileStr));
    }
});
