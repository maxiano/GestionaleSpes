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
        // 1. Legge i dati anagrafici del ragazzo usando il childId come ID del documento in 'players'
        const childDocRef = doc(db, 'players', childId);
        const childDoc = await getDoc(childDocRef);

        let childName = "Atleta";
        let teamName = "Non assegnata";

        if (childDoc.exists()) {
            const childData = childDoc.data();
            childName = childData.name || childData.nome || "Atleta";
            teamName = childData.teamId || childData.group || childData.gruppo || childData.squadra || 'Non assegnata';
        }

        // Mostra il nome del figlio nell'intestazione
        document.getElementById('parent-child-name').innerText = childName;

        // 2. Cerca nella collezione 'callups' le convocazioni che contengono questo childId nell'array
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

        // 3. Renderizza la schermata con nome, squadra e convocazione corretta
        document.getElementById('parent-content-area').innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full w-max">
                    Squadra: ${teamName}
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
        console.error("Errore nel caricamento dei dati:", error);
    }
}
