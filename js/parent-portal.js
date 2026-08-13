/**
 * @file parent-portal.js
 * @brief Gestione Portale Genitori - Gestionale Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

// Importa 'db' dal tuo file di inizializzazione centrale
import { db } from './firebase-init.js';

// Importa solo le funzioni di Firestore necessarie, usando la stessa versione (10.8.0)
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Inizializza e carica l'HTML del portale genitori
 */
export async function initParentPortal(userProfile) {
    console.log("Inizializzazione portale genitori per:", userProfile.name);
    
    // Nasconde la dashboard dei mister
    document.getElementById('app-dashboard').classList.add('hidden');
    
    // Controlla se il contenitore esiste già, altrimenti lo crea
    let portalWrapper = document.getElementById('dynamic-parent-container');
    if (!portalWrapper) {
        portalWrapper = document.createElement('div');
        portalWrapper.id = 'dynamic-parent-container';
        document.body.appendChild(portalWrapper);
    }

    try {
        // Scarica il file HTML separato
        const response = await fetch('parent-view.html');
        if (!response.ok) throw new Error("Impossibile caricare la vista genitori.");
        
        const htmlContent = await response.text();
        portalWrapper.innerHTML = htmlContent;

        // Aggiorna il tasto di logout nel portale genitori
        document.getElementById('btn-parent-logout').addEventListener('click', () => {
            import("https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js").then(({ signOut }) => {
                signOut(auth);
            });
        });

        // Carica i dati dell'atleta associato
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

    const childDocRef = doc(db, 'players', childId);
    const childDoc = await getDoc(childDocRef);

    if (childDoc.exists()) {
        const childData = childDoc.data();
        document.getElementById('parent-child-name').innerText = childData.name;
        
        // Riempie l'area con i dati di partite e allenamenti
        document.getElementById('parent-content-area').innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full w-max">
                    Squadra: ${childData.teamId}
                </span>
                <h4 class="font-bold text-sm text-slate-800 mt-2">📩 Prossima Convocazione</h4>
                <p class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    ${childData.nextCallup || 'Nessuna convocazione attiva.'}
                </p>
                <div class="flex gap-2">
                    <button onclick="alert('Presenza confermata!')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition">
                        Conferma ✅
                    </button>
                    <button onclick="alert('Assenza comunicata.')" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs transition">
                        Assente ❌
                    </button>
                </div>
            </div>
        `;
    }
}
