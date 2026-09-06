/**
 * @file modules/attendance.js
 * @brief Gestione registro presenze: salvataggio giornaliero, matrice mensile e report WhatsApp
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { AppCache } from '../cache.js';
import { AppState } from '../state.js';
import { daysOfWeekIT, monthNamesIT } from '../config.js';
import { formatDateIT, sendToWhatsApp, downloadCSV } from '../utils.js';
import { 
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function renderAttendanceInputs() {
    const container = document.getElementById('attendance-players-inputs');
    if (!container) return;
    container.innerHTML = '';

    const activeTeamPlayers = AppState.getActiveTeamPlayers();
    if (!activeTeamPlayers || activeTeamPlayers.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400">Nessun giocatore in rosa.</p>';
        return;
    }

    activeTeamPlayers.forEach(player => {
        const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
        container.innerHTML += `
            <div class="flex flex-col md:flex-row md:justify-between md:items-center py-2 gap-1 border-b border-gray-100">
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

export async function checkAndLoadExistingAttendance() {
    const dateInput = document.getElementById('attendance-date');
    const container = document.getElementById('attendance-status-container');
    const badge = document.getElementById('attendance-status-badge');
    const deleteBtn = document.getElementById('btn-delete-session');
    const activeTeamId = AppState.getActiveTeamId();

    if (!dateInput?.value || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM') {
        if (container) container.classList.add('hidden');
        AppState.setCurrentSessionDocId(null);
        return;
    }

    const date = dateInput.value;
    const [year, month, day] = date.split('-');
    const dateIt = `${day}/${month}/${year}`;
    const dateItAlt = `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;

    try {
        const q = query(collection(db, 'attendances'), where('teamId', '==', activeTeamId));
        const snapshot = await getDocs(q);

        let targetDocSnap = null;
        snapshot.forEach(docSnap => {
            const dbDate = String(docSnap.data().date || '').trim();
            if (dbDate === date || dbDate === dateIt || dbDate === dateItAlt) targetDocSnap = docSnap;
        });

        if (targetDocSnap) {
            AppState.setCurrentSessionDocId(targetDocSnap.id);
            const records = targetDocSnap.data().records || targetDocSnap.data().record || [];

            records.forEach(rec => {
                const pId = rec.playerId || rec.id;
                const radio = document.querySelector(`input[name="att_${pId}"][value="${rec.status}"]`);
                if (radio) radio.checked = true;
            });

            if (container) container.classList.remove('hidden');
            if (badge) {
                badge.className = "text-xs font-bold text-amber-800";
                badge.innerHTML = `⚠️ Presenze per il <strong>${formatDateIT(date)}</strong> già salvate.`;
            }
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            AppState.setCurrentSessionDocId(null);
            resetAttendanceRadios();
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

export function resetAttendanceRadios() {
    const activeTeamPlayers = AppState.getActiveTeamPlayers();
    if (!activeTeamPlayers) return;
    activeTeamPlayers.forEach(player => {
        const radio = document.querySelector(`input[name="att_${player.id}"][value="present"]`);
        if (radio) radio.checked = true;
    });
}

export async function loadMonthlyAttendances(forceRefresh = false) {
    const activeTeamId = AppState.getActiveTeamId();
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') return;

    const monthEl = document.getElementById('filter-month');
    const yearEl = document.getElementById('filter-year');
    const container = document.getElementById('monthly-sessions-container');
    if (!monthEl || !yearEl || !container) return;

    const selectedMonth = parseInt(monthEl.value, 10);
    const selectedYear = parseInt(yearEl.value, 10);
    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    try {
        let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth);

        if (!sessions || forceRefresh) {
            container.innerHTML = '<p class="text-sm text-gray-500 py-4">Caricamento registro allenamenti...</p>';
            const q = query(collection(db, 'attendances'), where('teamId', '==', activeTeamId));
            const snapshot = await getDocs(q);
            const allSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            sessions = allSessions.filter(s => {
                const dbDateStr = String(s.date || '').trim();
                let sYear, sMonth;
                if (dbDateStr.includes('-')) {
                    const parts = dbDateStr.split('-');
                    if (parts.length === 3) {
                        sYear = parseInt(parts[0], 10);
                        sMonth = parseInt(parts[1], 10) - 1;
                    }
                } else if (dbDateStr.includes('/')) {
                    const parts = dbDateStr.split('/');
                    if (parts.length === 3) {
                        sMonth = parseInt(parts[1], 10) - 1;
                        sYear = parseInt(parts[2], 10);
                    }
                }
                return sYear === selectedYear && sMonth === selectedMonth;
            });

            AppCache.setAttendances(activeTeamId, selectedYear, selectedMonth, sessions);
        }

        const sessionsByDay = {};
        let totalPresentsCount = 0;

        sessions.forEach(s => {
            const dbDateStr = String(s.date || '').trim();
            let dayNum;
            if (dbDateStr.includes('-')) dayNum = parseInt(dbDateStr.split('-')[2], 10);
            else if (dbDateStr.includes('/')) dayNum = parseInt(dbDateStr.split('/')[0], 10);

            if (dayNum && !isNaN(dayNum)) {
                sessionsByDay[dayNum] = s;
                const records = s.records || s.record || [];
                totalPresentsCount += records.filter(r => r.status === 'present' || r.status === 'late').length;
            }
        });

        const setStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setStat('stat-total-sessions', sessions.length);
        setStat('stat-total-presents', totalPresentsCount);
        setStat('stat-avg-presents', sessions.length > 0 ? (totalPresentsCount / sessions.length).toFixed(1) : '0');

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

        const activeTeamPlayers = AppState.getActiveTeamPlayers();
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

                    if (session) {
                        const records = session.records || session.record || [];
                        const rec = records.find(r => (r.playerId === player.id || r.id === player.id));
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
    }
}

export function getMonthlyTableAsText() {
    const table = document.querySelector('#monthly-sessions-container table');
    if (!table) return "Nessun dato disponibile.";

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return "Tabella vuota.";

    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    const activeColumns = [];

    for (let i = 1; i < headerCells.length; i++) {
        let hasData = false;
        for (let j = 1; j < rows.length; j++) {
            const cells = rows[j].querySelectorAll('td');
            if (cells[i] && cells[i].innerText.trim() !== '-' && cells[i].innerText.trim() !== '') {
                hasData = true;
                break;
            }
        }
        if (hasData) activeColumns.push(i);
    }

    let output = "📋 *Registro Presenze Mensile*\n```\n";

    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        let rowText = "";

        if (rowIndex === 0) {
            rowText += "".padEnd(10, ' ') + "|";
            activeColumns.forEach(colIndex => {
                const cellText = cells[colIndex] ? cells[colIndex].innerText.trim() : "";
                const dayNum = cellText.replace('Giorno', '').trim();
                rowText += dayNum.substring(0, 3).padStart(3, ' ') + " ";
            });
        } else {
            const fullName = cells[0].innerText.trim();
            const lastName = fullName.split(' ')[0];
            rowText += lastName.substring(0, 10).padEnd(10, ' ') + "|";

            activeColumns.forEach(colIndex => {
                const cell = cells[colIndex];
                const content = cell ? cell.innerText.trim() : "-";
                const val = (content === '-' || content === '') ? " . " : content.substring(0, 3).padEnd(3, ' ');
                rowText += val + " ";
            });
        }
        output += rowText + "\n";
    });

    output += "```";
    return output;
}

export function initAttendanceEvents() {
    document.getElementById('attendance-date')?.addEventListener('change', checkAndLoadExistingAttendance);
    document.getElementById('filter-month')?.addEventListener('change', () => loadMonthlyAttendances());
    document.getElementById('filter-year')?.addEventListener('change', () => loadMonthlyAttendances());
    document.getElementById('btn-reset-attendance-radios')?.addEventListener('click', resetAttendanceRadios);

    document.getElementById('form-attendance')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeTeamId = AppState.getActiveTeamId();
        const activeTeamPlayers = AppState.getActiveTeamPlayers();
        if (!activeTeamId || activeTeamPlayers.length === 0) return alert('Nessuna squadra o giocatore presente!');

        const date = document.getElementById('attendance-date')?.value;
        if (!date) return alert('Seleziona una data valida!');

        const [year, month, day] = date.split('-');
        const dateIt = `${day}/${month}/${year}`;

        try {
            const snapshot = await getDocs(query(collection(db, 'attendances'), where('teamId', '==', activeTeamId)));
            let existingDocId = null;
            snapshot.forEach(docSnap => {
                const dbDate = String(docSnap.data().date || '').trim();
                if (dbDate === date || dbDate === dateIt) existingDocId = docSnap.id;
            });

            if (existingDocId) {
                if (!confirm(`⚠️ Hai già salvato le presenze per il ${formatDateIT(date)}.\nVuoi sovrascriverle?`)) return;
            }

            const records = [];
            activeTeamPlayers.forEach(player => {
                const radio = document.querySelector(`input[name="att_${player.id}"]:checked`);
                if (radio) {
                    const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
                    records.push({
                        id: player.id, playerId: player.id, name: displayName,
                        status: radio.value, present: radio.value === 'present', absent: radio.value === 'absent'
                    });
                }
            });

            if (existingDocId) {
                await updateDoc(doc(db, 'attendances', existingDocId), { records, record: records, updatedAt: serverTimestamp() });
                alert('Presenze aggiornate con successo!');
            } else {
                await addDoc(collection(db, 'attendances'), { teamId: activeTeamId, date, records, record: records, createdAt: serverTimestamp() });
                alert('Presenze salvate con successo!');
            }

            AppCache.clearAttendances(activeTeamId);
            checkAndLoadExistingAttendance();
            loadMonthlyAttendances(true);
        } catch (err) {
            alert("Errore salvataggio presenze: " + err.message);
        }
    });

    document.getElementById('btn-delete-session')?.addEventListener('click', async () => {
        const currentSessionDocId = AppState.getCurrentSessionDocId();
        if (!currentSessionDocId) return;
        const dateStr = document.getElementById('attendance-date')?.value;
        if (!confirm(`Eliminare definitivamente l'allenamento del ${formatDateIT(dateStr)}?`)) return;

        const activeTeamId = AppState.getActiveTeamId();
        try {
            await deleteDoc(doc(db, 'attendances', currentSessionDocId));
            alert('Giornata eliminata con successo!');
            AppCache.clearAttendances(activeTeamId);
            AppState.setCurrentSessionDocId(null);
            checkAndLoadExistingAttendance();
            loadMonthlyAttendances(true);
        } catch (err) {
            alert("Errore eliminazione: " + err.message);
        }
    });

    document.getElementById('btn-share-monthly-wa')?.addEventListener('click', () => {
        const activeTeamId = AppState.getActiveTeamId();
        if (!activeTeamId) return;

        const m = parseInt(document.getElementById('filter-month')?.value, 10);
        const y = parseInt(document.getElementById('filter-year')?.value, 10);
        let text = `📊 *RIEPILOGO PRESENZE - ${activeTeamId}*\n📅 *${y}*\n\n`;
        text += getMonthlyTableAsText();
        sendToWhatsApp(text, `Registro`);
    });
}