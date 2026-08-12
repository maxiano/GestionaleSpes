import { db } from './firebase-init.js';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { formatDateIT } from './utils.js';
import { daysOfWeekIT, monthNamesIT } from './config.js';
import { AppCache } from './cache.js';

export let activeTeamPlayers = [];
export let currentSessionDocId = null;

export async function loadTeamData(activeTeamId, currentUserProfile, forceRefresh = false) {
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
        activeTeamPlayers = [];
        renderPlayersList(currentUserProfile);
        renderAttendanceInputs();
        renderCallupCheckboxes();
        return;
    }

    document.getElementById('display-active-team').innerText = activeTeamId;
    document.getElementById('print-report-team').innerText = `Squadra / Categoria: ${activeTeamId}`;

    let players = AppCache.getPlayers(activeTeamId);

    if (!players || forceRefresh) {
        const q = query(collection(db, 'players'), where('teamId', '==', activeTeamId));
        const snapshot = await getDocs(q);
        players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        players.sort((a, b) => {
            const surnameA = (a.lastName || '').toLowerCase();
            const surnameB = (b.lastName || '').toLowerCase();
            if (surnameA < surnameB) return -1;
            if (surnameA > surnameB) return 1;
            return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
        });

        AppCache.setPlayers(activeTeamId, players);
    }

    activeTeamPlayers = players;

    renderPlayersList(currentUserProfile);
    renderAttendanceInputs();
    renderCallupCheckboxes();
    checkAndLoadExistingAttendance(activeTeamId);
    loadMonthlyAttendances(activeTeamId, forceRefresh);
}

export function renderPlayersList(currentUserProfile) {
    const container = document.getElementById('players-list-container');
    const printContainer = document.getElementById('roster-print-table-container');
    container.innerHTML = '';
    printContainer.innerHTML = '';

    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 col-span-2">Nessun giocatore in rosa.</p>';
        printContainer.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        const canDelete = currentUserProfile && currentUserProfile.role === 'admin' ? 
            `<button data-id="${player.id}" class="btn-delete-player text-xs text-red-500 font-bold hover:text-red-700 ml-2">Rimuovi</button>` : '';

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

    // Nota: Le funzioni openEditPlayerModal e deletePlayer andranno agganciate/importate opportunamente se definite altrove.
}

export function renderAttendanceInputs() {
    const container = document.getElementById('attendance-players-inputs');
    if (!container) return;
    container.innerHTML = '';

    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
        return;
    }

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        container.innerHTML += `
            <div class="flex flex-col md:flex-row md:justify-between md:items-center py-2 gap-1">
                <span class="font-medium text-sm text-gray-800">${displayName}</span>
                <div class="flex flex-wrap items-center gap-3">
                    <label class="inline-flex items-center text-xs cursor-pointer">
                        <input type="radio" name="att_${player.id}" value="present" checked class="text-black focus:ring-black">
                        <span class="ml-1 text-emerald-700 font-bold">Presente (P)</span>
                    </label>
                    <label class="inline-flex items-center text-xs cursor-pointer">
                        <input type="radio" name="att_${player.id}" value="absent" class="text-red-600 focus:ring-black">
                        <span class="ml-1 text-red-700 font-bold">Assente (A)</span>
                    </label>
                    <label class="inline-flex items-center text-xs cursor-pointer">
                        <input type="radio" name="att_${player.id}" value="justified" class="text-amber-600 focus:ring-black">
                        <span class="ml-1 text-amber-700 font-bold">Giustificato (AG)</span>
                    </label>
                    <label class="inline-flex items-center text-xs cursor-pointer">
                        <input type="radio" name="att_${player.id}" value="injured" class="text-purple-600 focus:ring-black">
                        <span class="ml-1 text-purple-700 font-bold">Infortunato (INF)</span>
                    </label>
                    <label class="inline-flex items-center text-xs cursor-pointer">
                        <input type="radio" name="att_${player.id}" value="late" class="text-blue-600 focus:ring-black">
                        <span class="ml-1 text-blue-700 font-bold">Ritardo (R)</span>
                    </label>
                </div>
            </div>
        `;
    });
}

export function renderCallupCheckboxes() {
    const container = document.getElementById('players-list-callup');
    if (!container) return;
    container.innerHTML = '';

    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 col-span-2">Nessun giocatore disponibile.</p>';
        return;
    }

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        container.innerHTML += `
            <label class="flex items-center space-x-2 text-xs p-1 border rounded bg-gray-50 cursor-pointer">
                <input type="checkbox" name="callup_player" value="${displayName}" checked class="rounded text-black focus:ring-black">
                <span>${displayName}</span>
            </label>
        `;
    });
}

export async function checkAndLoadExistingAttendance(activeTeamId) {
    const dateInput = document.getElementById('attendance-date');
    const container = document.getElementById('attendance-status-container');
    const badge = document.getElementById('attendance-status-badge');
    const deleteBtn = document.getElementById('btn-delete-session');
    
    if (!dateInput || !dateInput.value || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
        if (container) container.classList.add('hidden');
        currentSessionDocId = null;
        return;
    }

    const date = dateInput.value;

    try {
        const q = query(collection(db, 'attendances'), where('teamId', '==', activeTeamId), where('date', '==', date));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            currentSessionDocId = docSnap.id;
            const records = docSnap.data().records || [];

            records.forEach(rec => {
                const radio = document.querySelector(`input[name="att_${rec.playerId}"][value="${rec.status}"]`);
                if (radio) radio.checked = true;
            });

            if (container) container.classList.remove('hidden');
            if (badge) {
                badge.className = "text-xs font-bold text-amber-800";
                badge.innerHTML = `⚠️ Presenze per il <strong>${formatDateIT(date)}</strong> già salvate. Salvando ora sovrascriverai i dati.`;
            }
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            currentSessionDocId = null;
            if (container) container.classList.remove('hidden');
            if (badge) {
                badge.className = "text-xs font-bold text-emerald-800";
                badge.innerHTML = `✨ Nuova giornata del <strong>${formatDateIT(date)}</strong> (nessun dato salvato).`;
            }
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }
    } catch (err) {
        console.error("Errore controllo presenze:", err);
    }
}

export async function loadMonthlyAttendances(activeTeamId, forceRefresh = false) {
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') return;

    const selectedMonth = parseInt(document.getElementById('filter-month').value);
    const selectedYear = parseInt(document.getElementById('filter-year').value);
    const container = document.getElementById('monthly-sessions-container');

    document.getElementById('print-report-period').innerText = `Periodo: ${monthNamesIT[selectedMonth]} ${selectedYear}`;

    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const startOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

    try {
        let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth);

        if (!sessions || forceRefresh) {
            container.innerHTML = '<p class="text-sm text-gray-500 py-4">Caricamento registro allenamenti...</p>';
            const q = query(
                collection(db, 'attendances'),
                where('teamId', '==', activeTeamId),
                where('date', '>=', startOfMonth),
                where('date', '<=', endOfMonth)
            );
            const snapshot = await getDocs(q);

            sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            AppCache.setAttendances(activeTeamId, selectedYear, selectedMonth, sessions);
        }

        const sessionsByDay = {};
        let totalPresentsCount = 0;

        sessions.forEach(s => {
            const dayNum = parseInt(s.date.split('-')[2], 10);
            sessionsByDay[dayNum] = s;
            if (s.records) {
                totalPresentsCount += s.records.filter(r => r.status === 'present' || r.status === 'late').length;
            }
        });

        document.getElementById('stat-total-sessions').innerText = sessions.length;
        document.getElementById('stat-total-presents').innerText = totalPresentsCount;
        document.getElementById('stat-avg-presents').innerText = sessions.length > 0 ? (totalPresentsCount / sessions.length).toFixed(1) : '0';

        let tableHtml = `
            <table class="w-full text-xs border-collapse border border-gray-400 bg-white">
                <thead>
                    <tr class="bg-gray-100 text-gray-700">
                        <th class="border border-gray-400 p-1 text-left">Giocatore</th>
        `;

        for (let d = 1; d <= totalDaysInMonth; d++) {
            const dateObj = new Date(selectedYear, selectedMonth, d);
            const dayName = daysOfWeekIT[dateObj.getDay()];
            const isSession = !!sessionsByDay[d];
            const bgClass = isSession ? 'bg-gray-200 text-black font-bold' : '';
            tableHtml += `<th class="border border-gray-400 p-1 text-center capitalize ${bgClass}">${dayName}</th>`;
        }

        tableHtml += `</tr><tr class="bg-gray-200 text-gray-800"><th class="border border-gray-400 p-1 text-left">Cognome e Nome</th>`;

        for (let d = 1; d <= totalDaysInMonth; d++) {
            const isSession = !!sessionsByDay[d];
            const bgClass = isSession ? 'bg-gray-300 text-black font-bold' : '';
            tableHtml += `<th class="border border-gray-400 p-1 text-center ${bgClass}">${d}</th>`;
        }

        tableHtml += `</tr></thead><tbody>`;

        if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
            tableHtml += `<tr><td colspan="${totalDaysInMonth + 1}" class="text-center p-4 text-gray-400">Nessun giocatore in rosa.</td></tr>`;
        } else {
            activeTeamPlayers.forEach(player => {
                const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                tableHtml += `<tr class="hover:bg-gray-50"><td class="border border-gray-400 p-1.5 font-bold text-gray-800 whitespace-nowrap">${displayName}</td>`;

                for (let d = 1; d <= totalDaysInMonth; d++) {
                    const session = sessionsByDay[d];
                    let statusSymbol = '-';
                    let statusColor = 'text-gray-300';

                    if (session && session.records) {
                        const rec = session.records.find(r => r.playerId === player.id);
                        if (rec) {
                            switch(rec.status) {
                                case 'present': statusSymbol = 'P'; statusColor = 'text-emerald-700 font-bold bg-emerald-50'; break;
                                case 'absent': statusSymbol = 'A'; statusColor = 'text-red-600 font-bold bg-red-50'; break;
                                case 'justified': statusSymbol = 'AG'; statusColor = 'text-amber-600 font-bold bg-amber-50'; break;
                                case 'injured': statusSymbol = 'INF'; statusColor = 'text-purple-600 font-bold bg-purple-50'; break;
                                case 'late': statusSymbol = 'R'; statusColor = 'text-blue-600 font-bold bg-blue-50'; break;
                            }
                        }
                    }
                    tableHtml += `<td class="border border-gray-400 p-1 text-center ${statusColor}">${statusSymbol}</td>`;
                }
                tableHtml += `</tr>`;
            });
        }
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

    } catch (err) {
        console.error("Errore caricamento allenamenti:", err);
        container.innerHTML = `<p class="text-sm text-red-500 py-4 font-semibold">Errore durante il caricamento dei dati.</p>`;
    }
}
