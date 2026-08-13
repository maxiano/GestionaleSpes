/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori - Gestionale Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { db } from './firebase-init.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

        // Tasto Logout
        document.getElementById('btn-parent-logout').addEventListener('click', () => {
            import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js").then(({ signOut }) => {
                signOut(auth);
            });
        });

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
        // Visto che non ci serve più leggere il documento del player per anagrafica 
        // (a meno che tu non voglia mostrare anche la foto o altri dati), 
        // impostiamo intanto il nome del genitore o un titolo generico, oppure 
        // se vuoi puoi comunque recuperare il nome del player se ti serve.
        
        document.getElementById('parent-child-name').innerText = `Atleta ID: ${childId}`;

        // Cerca direttamente nella collezione 'callups' usando il childId del genitore
        const callupsRef = collection(db, 'callups');
        const q = query(callupsRef, where("players", "array-contains", childId));
        const querySnapshot = await getDocs(q);

        let callupHTML = '<p class="text-xs text-slate-500">Nessuna convocazione attiva al momento.</p>';

        if (!querySnapshot.empty) {
            const callupDoc = querySnapshot.docs[0].data();
            
            callupHTML = `
                <div class="flex flex-col gap-1">
                    <span class="font-bold text-slate-800 text-sm">📅 ${callupDoc.match || callupDoc.title || 'Partita di Campionato'}</span>
                    <span class="text-xs text-slate-600">Data/Ora: ${callupDoc.date || callupDoc.orario || 'Da definire'}</span>
                    <span class="text-xs text-slate-600">Campo: ${callupDoc.location || callupDoc.campo || 'Da definire'}</span>
                </div>
            `;
        }

        // Renderizza la schermata
        document.getElementById('parent-content-area').innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full w-max">
                    Codice Atleta: ${childId}
                </span>
                
                <h4 class="font-bold text-sm text-slate-800 mt-2">📩 Prossima Convocazione</h4>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    ${callupHTML}
                </div>

                <div class="flex gap-2 mt-2">
                    <button onclick="alert('Presenza confermata!')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition">
                        Conferma ✅
                    </button>
                    <button onclick="alert('Assenza comunicata.')" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs transition">
                        Assente ❌
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Errore nel caricamento della convocazione:", error);
    }
}
