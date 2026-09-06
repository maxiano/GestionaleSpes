/**
 * @file modules/callups.js
 * @brief Gestione convocazioni gare ufficiali, invio avvisi WhatsApp e archiviazione storico
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { AppState } from '../state.js';
import { formatDateIT, sendToWhatsApp } from '../utils.js';
import { 
    collection, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function renderCallupCheckboxes() {
    const container = document.getElementById('players-list-callup');
    if (!container) return;
    container.innerHTML = '';

    const activeTeamPlayers = AppState.getActiveTeamPlayers();
    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 col-span-2">Nessun giocatore disponibile.</p>';
        return;
    }

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        container.innerHTML += `
            <label class="flex items-center space-x-2 text-xs p-1 border rounded bg-gray-50 cursor-pointer">
                <input type="checkbox" name="callup_player" value="${player.id}|${displayName}" checked class="rounded text-black focus:ring-black">
                <span>${displayName}</span>
            </label>
        `;
    });
}

export async function loadCallups() {
    const container = document.getElementById('callups-list-container');
    const activeTeamId = AppState.getActiveTeamId();
    if (!container || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM') return;

    try {
        const q = query(collection(db, 'callups'), where('teamId', '==', activeTeamId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-xs text-gray-400">Nessuna convocazione presente.</p>';
            AppState.setLoadedCallupsList([]);
            return;
        }

        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => new Date(`${b.date}T${b.matchTime}`) - new Date(`${a.date}T${a.matchTime}`));
        AppState.setLoadedCallupsList(docs);

        container.innerHTML = '';

        docs.forEach(data => {
            const callupResponses = data.responses || {};
            const invitedPlayers = data.players || [];

            const parsedPlayers = invitedPlayers.map(p => {
                if (typeof p === 'string' && p.includes('|')) {
                    const parts = p.split('|');
                    return { id: parts[0], name: parts[1] };
                }
                return { id: p?.id || null, name: p?.name || String(p) };
            }).sort((a, b) => a.name.localeCompare(b.name));

            let playersListHTML = '';
            parsedPlayers.forEach((player, index) => {
                const status = (player.id && callupResponses[player.id]) ? callupResponses[player.id] : 'pending';
                let statusBadge = '<span class="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">In attesa ⏳</span>';
                if (status === 'confirmed') statusBadge = '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Confermato ✅</span>';
                else if (status === 'absent') statusBadge = '<span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Assente ❌</span>';

                playersListHTML += `
                    <div class="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-100 text-xs mb-1">
                        <span class="text-slate-700">${index + 1}. ${player.name}</span>
                        <div>${statusBadge}</div>
                    </div>
                `;
            });

            container.innerHTML += `
                <div class="border rounded-xl p-4 bg-gray-50 flex flex-col gap-3 text-xs mb-3 shadow-sm">
                    <div class="space-y-1">
                        <p class="font-bold text-sm text-black">⚽ Spes Montesacro vs ${data.opponent}</p>
                        <p class="text-gray-700">
                            📅 <strong>Giorno:</strong> ${formatDateIT(data.date)} |
                            🕒 <strong>Inizio:</strong> ${data.matchTime} |
                            ⏰ <strong>Ritrovo:</strong> ${data.gatheringTime}
                        </p>
                        <p class="text-gray-600">📍 <strong>Campo:</strong> ${data.location}</p>
                    </div>

                    <div class="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                        <p class="font-bold text-slate-800 mb-2">📊 Stato Risposta (${parsedPlayers.length}):</p>
                        <div class="flex flex-col max-h-40 overflow-y-auto pr-1">
                            ${playersListHTML || '<p class="text-gray-400">Nessun giocatore inserito.</p>'}
                        </div>
                    </div>

                    <div class="flex flex-wrap justify-end gap-2 pt-1">
                        <button data-id="${data.id}" class="btn-share-invite bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">📲 Invito</button>
                        <button data-id="${data.id}" class="btn-edit-callup bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">✏️ Modifica</button>
                        <button data-id="${data.id}" class="btn-final-callup bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">📢 Definitiva</button>
                        <button data-id="${data.id}" class="btn-print-callup bg-black hover:bg-gray-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">🖨️ Stampa</button>
                        <button data-id="${data.id}" class="btn-delete-callup bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm">🗑️ Elimina</button>
                    </div>
                </div>
            `;
        });

        container.querySelectorAll('.btn-share-invite').forEach(b => {
            b.addEventListener('click', (e) => sendInviteWhatsApp(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-final-callup').forEach(b => {
            b.addEventListener('click', (e) => sendFinalCallupWhatsApp(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-edit-callup').forEach(b => {
            b.addEventListener('click', (e) => prepareEditCallup(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-print-callup').forEach(b => {
            b.addEventListener('click', (e) => printCallupReport(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-delete-callup').forEach(b => {
            b.addEventListener('click', (e) => deleteCallup(e.target.getAttribute('data-id')));
        });
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-500">Errore: ${err.message}</p>`;
    }
}

export function sendInviteWhatsApp(id) {
    const list = AppState.getLoadedCallupsList();
    const callup = list.find(c => c.id === id);
    if (!callup) return;
    const msg = `Ciao! È online la convocazione per la partita contro ${callup.opponent} del ${formatDateIT(callup.date)}. Entrate nel portale Spes Montesacro per gestire la presenza!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export function sendFinalCallupWhatsApp(id) {
    const list = AppState.getLoadedCallupsList();
    const callup = list.find(c => c.id === id);
    if (!callup) return;
    const msg = `🚨 CONVOCAZIONE DEFINITIVA - Spes Montesacro 🚨\n\nPartita: *${callup.opponent}*\nRitrovo: *${callup.gatheringTime}*\n\nLa lista è stata finalizzata!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export async function deleteCallup(callupId) {
    if (!confirm("Vuoi archiviare questa partita nello storico ed eliminarla dalle convocazioni attive?")) return;

    try {
        const callupRef = doc(db, 'callups', callupId);
        const callupSnap = await getDoc(callupRef);

        if (callupSnap.exists()) {
            await addDoc(collection(db, 'match_history'), {
                ...callupSnap.data(),
                archivedAt: new Date().toISOString()
            });
        }

        await deleteDoc(callupRef);
        alert("Partita archiviata nello storico con successo!");
        loadCallups();
    } catch (err) {
        alert("Errore: " + err.message);
    }
}