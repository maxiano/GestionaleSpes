/**
 * @file modules/tournaments.js
 * @brief Gestione tornei, inserimento risultati, filtri stato/torneo e import/export CSV
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { AppState } from '../state.js';
import { 
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadTournamentsFromDB() {
    try {
        const userProfile = AppState.getCurrentUserProfile();
        const activeTeamId = AppState.getActiveTeamId();
        let q;

        if (userProfile?.role === 'coach' && activeTeamId) {
            q = query(collection(db, 'tournaments'), where("teamId", "==", activeTeamId));
        } else {
            q = collection(db, 'tournaments');
        }

        const querySnapshot = await getDocs(q);
        const matches = [];
        querySnapshot.forEach(docSnap => matches.push({ id: docSnap.id, ...docSnap.data() }));

        AppState.setTournamentMatches(matches);
        renderTournaments();
    } catch (error) {
        console.error("Errore nel caricamento dei tornei:", error);
    }
}

export function renderTournaments() {
    const container = document.getElementById('tournament-grid');
    const filterSelect = document.getElementById('filter-tournament-select');
    const statusSelect = document.getElementById('filter-status-select');
    const activeTeamId = AppState.getActiveTeamId() || '';

    if (!container) return;

    const tournamentMatches = AppState.getTournamentMatches();
    const teamMatches = tournamentMatches.filter(m => m.teamId === activeTeamId);

    if (filterSelect) {
        const selectedValue = filterSelect.value;
        const uniqueTournaments = [...new Set(teamMatches.map(m => m.tournament).filter(Boolean))];
        filterSelect.innerHTML = `<option value="">Tutti i tornei (${teamMatches.length})</option>`;
        uniqueTournaments.forEach(tourName => {
            const isSelected = tourName === selectedValue ? 'selected' : '';
            filterSelect.innerHTML += `<option value="${tourName}" ${isSelected}>${tourName}</option>`;
        });
    }

    const selectedTourFilter = filterSelect?.value?.trim()?.toLowerCase() || '';
    let filtered = selectedTourFilter
        ? teamMatches.filter(m => m.tournament && m.tournament.trim().toLowerCase() === selectedTourFilter)
        : [...teamMatches];

    const statusFilter = statusSelect?.value || '';
    if (statusFilter === 'da_giocare') filtered = filtered.filter(m => !m.played);
    else if (statusFilter === 'giocata') filtered = filtered.filter(m => m.played);

    filtered.sort((a, b) => new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`) - new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`));

    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 py-10 w-full col-span-2">Nessuna partita trovata con i filtri selezionati.</p>`;
        return;
    }

    filtered.forEach(m => {
        container.innerHTML += `
            <div class="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${m.tournament || 'Torneo'}</span>
                    <span class="text-[9px] font-bold ${m.played ? 'text-emerald-600' : 'text-amber-600'}">
                        ${m.played ? '● GIOCATA' : '● DA GIOCARE'}
                    </span>
                </div>
                <h4 class="font-bold text-slate-800 text-sm">${m.match}</h4>
                <p class="text-[11px] font-semibold text-slate-500">📍 ${m.location} | 📅 ${m.date} - ${m.time}</p>
                <div class="flex flex-col gap-1.5 mt-2">
                    ${!m.played ? 
                        `<button data-id="${m.id}" class="btn-set-result w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[10px] py-2 rounded-xl transition">Inserisci Risultato</button>` 
                        : `<p class="mt-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 py-2 rounded-lg">Risultato: ${m.result}</p>`
                    }
                    <div class="flex gap-2">
                        <button data-id="${m.id}" class="btn-edit-match flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition">✏️ Modifica</button>
                        <button data-id="${m.id}" class="btn-delete-match flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] py-1.5 rounded-xl transition">🗑️ Elimina</button>
                    </div>
                </div>
            </div>
        `;
    });

    container.querySelectorAll('.btn-set-result').forEach(btn => btn.addEventListener('click', (e) => setResult(e.target.getAttribute('data-id'))));
    container.querySelectorAll('.btn-edit-match').forEach(btn => btn.addEventListener('click', (e) => editMatch(e.target.getAttribute('data-id'))));
    container.querySelectorAll('.btn-delete-match').forEach(btn => btn.addEventListener('click', (e) => deleteMatch(e.target.getAttribute('data-id'))));
}

export async function setResult(id) {
    const res = prompt("Inserisci il risultato (es. 3-1):");
    if (!res) return;
    try {
        await updateDoc(doc(db, 'tournaments', String(id)), { played: true, result: res });
        const match = AppState.getTournamentMatches().find(m => m.id === id);
        if (match) { match.played = true; match.result = res; }
        renderTournaments();
    } catch (err) { alert("Errore nel salvataggio: " + err.message); }
}

export async function deleteMatch(id) {
    if (!confirm("Sei sicuro di voler eliminare questa partita?")) return;
    try {
        await deleteDoc(doc(db, 'tournaments', String(id)));
        const matches = AppState.getTournamentMatches().filter(m => m.id !== id);
        AppState.setTournamentMatches(matches);
        renderTournaments();
    } catch (err) { alert("Errore: " + err.message); }
}