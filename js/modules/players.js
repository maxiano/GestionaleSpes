/**
 * @file modules/players.js
 * @brief Gestione rosa giocatori: caricamento, card, modale modifica, import/export CSV ed Excel
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { AppCache } from '../cache.js';
import { AppState } from '../state.js';
import { formatDateIT, sendToWhatsApp, downloadCSV } from '../utils.js';
import { 
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadTeamData(forceRefresh = false, callbacks = {}) {
    const activeTeamId = AppState.getActiveTeamId();
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
        AppState.setActiveTeamPlayers([]);
        renderPlayersList();
        if (callbacks.onPlayersLoaded) callbacks.onPlayersLoaded([]);
        return;
    }

    const displayTeam = document.getElementById('display-active-team');
    const printTeam = document.getElementById('print-report-team');
    if (displayTeam) displayTeam.innerText = activeTeamId;
    if (printTeam) printTeam.innerText = `Squadra / Categoria: ${activeTeamId}`;

    let players = AppCache.getPlayers(activeTeamId);

    if (!players || forceRefresh) {
        try {
            const q = query(collection(db, 'players'), where('teamId', '==', activeTeamId));
            const snapshot = await getDocs(q);
            players = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            players.sort((a, b) => {
                const surnameA = (a.lastName || '').toLowerCase();
                const surnameB = (b.lastName || '').toLowerCase();
                if (surnameA < surnameB) return -1;
                if (surnameA > surnameB) return 1;
                return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
            });

            AppCache.setPlayers(activeTeamId, players);
        } catch (err) {
            console.error("Errore caricamento giocatori:", err);
            return;
        }
    }

    AppState.setActiveTeamPlayers(players);
    renderPlayersList();
    if (callbacks.onPlayersLoaded) callbacks.onPlayersLoaded(players);
}

export function renderPlayersList() {
    const container = document.getElementById('players-list-container');
    const printContainer = document.getElementById('roster-print-table-container');
    if (!container || !printContainer) return;

    container.innerHTML = '';
    printContainer.innerHTML = '';

    const activeTeamPlayers = AppState.getActiveTeamPlayers();
    const currentUserProfile = AppState.getCurrentUserProfile();

    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 col-span-2">Nessun giocatore in rosa.</p>';
        printContainer.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        const canDelete = currentUserProfile && currentUserProfile.role === 'admin'
            ? `<button data-id="${player.id}" class="btn-delete-player text-xs text-red-500 font-bold hover:text-red-700 ml-2">Rimuovi</button>`
            : '';

        let medStatusBadge = '';
        if (player.medicalExp) {
            if (player.medicalExp < today) {
                medStatusBadge = `<span class="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Cert. Scaduto (${formatDateIT(player.medicalExp)})</span>`;
            } else {
                medStatusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-semibold">Cert. OK (${formatDateIT(player.medicalExp)})</span>`;
            }
        } else {
            medStatusBadge = `<span class="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">Cert. Mancante</span>`;
        }

        container.innerHTML += `
            <div class="p-3 border rounded bg-gray-50 flex justify-between items-start text-xs shadow-sm">
                <div class="space-y-1">
                    <p class="font-bold text-sm text-gray-900">⚽ ${displayName} ${player.jersey ? `<span class="text-gray-600">(#${player.jersey})</span>` : ''}</p>
                    <p class="text-gray-600"><strong>Ruolo:</strong> ${player.role || 'N/D'} | <strong>Nato il:</strong> ${formatDateIT(player.dob)}</p>
                    <p class="text-gray-600"><strong>Tel. Genitore:</strong> ${player.parentPhone || 'N/D'}</p>
                    <div class="pt-1">${medStatusBadge}</div>
                </div>
                <div class="flex items-center space-x-1">
                    <button data-id="${player.id}" class="btn-edit-player text-xs text-black font-bold hover:bg-gray-200 bg-gray-100 px-2 py-1 rounded border border-gray-300 transition">✏️ Modifica</button>
                    ${canDelete}
                </div>
            </div>
        `;
    });

    container.querySelectorAll('.btn-edit-player').forEach(btn => {
        btn.addEventListener('click', (e) => openEditPlayerModal(e.currentTarget.getAttribute('data-id')));
    });

    container.querySelectorAll('.btn-delete-player').forEach(btn => {
        btn.addEventListener('click', (e) => deletePlayer(e.target.getAttribute('data-id')));
    });

    let printTableHtml = `
        <table class="w-full border-collapse border border-black">
            <thead>
                <tr class="bg-gray-200 text-black">
                    <th class="border border-black p-2 text-center w-10">#</th>
                    <th class="border border-black p-2 text-left">Cognome e Nome</th>
                    <th class="border border-black p-2 text-center w-16">Maglia</th>
                    <th class="border border-black p-2 text-center w-24">Data Nascita</th>
                    <th class="border border-black p-2 text-center w-28">Certificato</th>
                </tr>
            </thead>
            <tbody>
    `;

    activeTeamPlayers.forEach((player, index) => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        printTableHtml += `
            <tr>
                <td class="border border-black p-1 text-center font-bold">${index + 1}</td>
                <td class="border border-black p-1 font-semibold">${displayName}</td>
                <td class="border border-black p-1 text-center">${player.jersey || '-'}</td>
                <td class="border border-black p-1 text-center">${formatDateIT(player.dob)}</td>
                <td class="border border-black p-1 text-center">${formatDateIT(player.medicalExp)}</td>
            </tr>
        `;
    });

    printTableHtml += `</tbody></table>`;
    printContainer.innerHTML = printTableHtml;
}

export function openEditPlayerModal(playerId) {
    const players = AppState.getActiveTeamPlayers();
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    AppState.setEditingPlayerId(playerId);
    document.getElementById('modal-player-title').innerText = "Modifica Giocatore";
    document.getElementById('btn-submit-player').innerText = "Aggiorna Giocatore";

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('player-first-name', player.firstName);
    setVal('player-last-name', player.lastName);
    setVal('player-dob', player.dob);
    setVal('player-jersey', player.jersey);
    setVal('player-role', player.role);
    setVal('player-medical-exp', player.medicalExp);
    setVal('player-parent-phone', player.parentPhone);

    document.getElementById('modal-add-player')?.classList.remove('hidden');
}

export async function deletePlayer(playerId) {
    if (!confirm("Sei sicuro di voler rimuovere questo giocatore dalla rosa?")) return;
    const activeTeamId = AppState.getActiveTeamId();
    try {
        await deleteDoc(doc(db, 'players', playerId));
        alert("Giocatore eliminato!");
        AppCache.clearPlayers(activeTeamId);
        loadTeamData(true);
    } catch (err) {
        alert("Errore eliminazione: " + err.message);
    }
}

export function initPlayerEvents(onDataChanged) {
    const btnOpenAdd = document.getElementById('btn-open-add-player');
    if (btnOpenAdd) {
        btnOpenAdd.addEventListener('click', () => {
            const activeTeamId = AppState.getActiveTeamId();
            if (!activeTeamId) return alert('Seleziona prima una squadra!');
            AppState.setEditingPlayerId(null);

            document.getElementById('modal-player-title').innerText = "Aggiungi Nuovo Giocatore";
            document.getElementById('btn-submit-player').innerText = "Salva Giocatore";

            ['player-first-name', 'player-last-name', 'player-dob', 'player-jersey', 
             'player-role', 'player-medical-exp', 'player-parent-phone'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            document.getElementById('modal-add-player')?.classList.remove('hidden');
        });
    }

    const btnCloseModal = document.getElementById('btn-close-modal-player');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            document.getElementById('modal-add-player')?.classList.add('hidden');
        });
    }

    const formPlayer = document.getElementById('form-add-player');
    if (formPlayer) {
        formPlayer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const activeTeamId = AppState.getActiveTeamId();
            const editingPlayerId = AppState.getEditingPlayerId();
            if (!activeTeamId) return;

            const getVal = id => document.getElementById(id)?.value?.trim() || '';

            const firstName = getVal('player-first-name');
            const lastName = getVal('player-last-name');
            const dob = document.getElementById('player-dob')?.value || '';
            const jersey = getVal('player-jersey');
            const role = getVal('player-role');
            const medicalExp = document.getElementById('player-medical-exp')?.value || '';
            const parentPhone = getVal('player-parent-phone');

            const playerData = {
                firstName, lastName,
                name: `${lastName} ${firstName}`.trim(),
                dob, jersey, role, medicalExp, parentPhone,
                teamId: activeTeamId
            };

            try {
                if (parentPhone) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where("phone", "==", parentPhone), where("role", "==", "parent"));
                    const querySnapshot = await getDocs(q);
                    playerData.parentId = !querySnapshot.empty ? querySnapshot.docs[0].id : null;
                } else {
                    playerData.parentId = null;
                }

                let savedPlayerId = editingPlayerId;
                if (editingPlayerId) {
                    await updateDoc(doc(db, 'players', editingPlayerId), playerData);
                    alert("Giocatore aggiornato con successo!");
                } else {
                    playerData.createdAt = serverTimestamp();
                    const docRef = await addDoc(collection(db, 'players'), playerData);
                    savedPlayerId = docRef.id;
                    alert("Nuovo giocatore aggiunto con successo!");
                }

                if (playerData.parentId && savedPlayerId) {
                    await updateDoc(doc(db, 'users', playerData.parentId), {
                        childIds: arrayUnion(savedPlayerId)
                    });
                }

                document.getElementById('modal-add-player')?.classList.add('hidden');
                AppCache.clearPlayers(activeTeamId);
                loadTeamData(true, { onPlayersLoaded: onDataChanged });
            } catch (err) {
                alert("Errore salvataggio giocatore: " + err.message);
            }
        });
    }

    document.getElementById('btn-share-roster-wa')?.addEventListener('click', () => {
        const activeTeamId = AppState.getActiveTeamId();
        const players = AppState.getActiveTeamPlayers();
        if (!activeTeamId || players.length === 0) return;

        let text = `👥 *ROSA UFFICIALE GIOCATORI*\n🏆 *Spes Montesacro - ${activeTeamId}*\n📊 *Totale Tesserati:* ${players.length}\n\n`;
        players.forEach((p, i) => text += `${i + 1}. ${p.lastName ? `${p.lastName} ${p.firstName}` : p.name}\n`);
        sendToWhatsApp(text, `Rosa ${activeTeamId}`);
    });

    document.getElementById('btn-print-roster')?.addEventListener('click', () => {
        document.body.classList.remove('print-landscape', 'print-monthly', 'print-callup');
        document.body.classList.add('print-roster');
        const reportPeriod = document.getElementById('print-report-period');
        if (reportPeriod) reportPeriod.innerText = 'Documento: Rosa Giocatori Ufficiale';
        window.print();
    });

    document.getElementById('btn-export-roster-csv')?.addEventListener('click', () => {
        const activeTeamId = AppState.getActiveTeamId();
        const players = AppState.getActiveTeamPlayers();
        if (!activeTeamId || players.length === 0) return alert("Nessun giocatore in rosa!");

        let csv = `Cognome;Nome;Numero Maglia;Data Nascita;Ruolo;Scadenza Certificato;Tel. Genitore\n`;
        players.forEach(p => {
            csv += `"${p.lastName || ''}";"${p.firstName || ''}";"${p.jersey || ''}";"${p.dob || ''}";"${p.role || ''}";"${p.medicalExp || ''}";"${p.parentPhone || ''}"\n`;
        });
        downloadCSV(`Rosa_${activeTeamId}.csv`, csv);
    });
}