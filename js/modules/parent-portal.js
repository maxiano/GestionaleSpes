/**
 * @file modules/parent-portal.js
 * @brief Modulo dedicato per il portale famiglie / genitori
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initParentPortal(currentUserProfile) {
    let container = document.getElementById('dynamic-parent-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'dynamic-parent-container';
        container.className = "max-w-4xl mx-auto p-4 space-y-4";
        document.querySelector('main')?.appendChild(container) || document.body.appendChild(container);
    }

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 class="text-xl font-black text-slate-800">👋 Benvenuto nel Portale Famiglie</h2>
            <p class="text-sm text-slate-500 mt-1">Gestisci la presenza alle convocazioni e consulta lo stato medico dei tuoi ragazzi.</p>
            <div id="parent-children-cards" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <p class="text-xs text-slate-400">Caricamento ragazzi in corso...</p>
            </div>
        </div>
    `;

    try {
        const childIds = currentUserProfile.childIds || [];
        const cardsContainer = document.getElementById('parent-children-cards');
        if (!cardsContainer) return;

        if (childIds.length === 0) {
            if (currentUserProfile.phone) {
                const q = query(collection(db, 'players'), where('parentPhone', '==', currentUserProfile.phone));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    cardsContainer.innerHTML = '';
                    snap.forEach(d => renderChildCard(cardsContainer, { id: d.id, ...d.data() }));
                    return;
                }
            }
            cardsContainer.innerHTML = '<p class="text-xs text-slate-400">Nessun ragazzo associato. Contatta la segreteria o il mister.</p>';
            return;
        }

        cardsContainer.innerHTML = '';
        for (const childId of childIds) {
            const childSnap = await getDoc(doc(db, 'players', childId));
            if (childSnap.exists()) renderChildCard(cardsContainer, { id: childSnap.id, ...childSnap.data() });
        }
    } catch (err) {
        console.error("Errore portale genitori:", err);
    }
}

function renderChildCard(container, child) {
    const card = document.createElement('div');
    card.className = "border rounded-xl p-4 bg-slate-50 space-y-2 text-xs shadow-sm";
    card.innerHTML = `
        <div class="flex justify-between items-center">
            <h4 class="font-bold text-sm text-slate-900">⚽ ${child.name || `${child.lastName} ${child.firstName}`}</h4>
            <span class="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold">${child.teamId || 'Spes'}</span>
        </div>
        <p class="text-slate-600">Maglia: <strong>#${child.jersey || '-'}</strong> | Ruolo: <strong>${child.role || 'N/D'}</strong></p>
        <div class="pt-2 border-t border-slate-200">
            <p class="font-semibold text-slate-700 mb-1">Stato Certificato Medico:</p>
            <span class="inline-block px-2 py-0.5 rounded text-[10px] ${child.medicalExp ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-rose-100 text-rose-800'}">
                ${child.medicalExp ? `Scadenza: ${child.medicalExp}` : 'Non inserito'}
            </span>
        </div>
    `;
    container.appendChild(card);
}