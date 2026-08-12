import { db } from './firebase-init.js';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { formatDateIT, downloadCSV, sendToWhatsApp } from './utils.js';
import { monthNamesIT } from './config.js';
import { AppCache } from './cache.js';
import { activeTeamPlayers, loadTeamData, renderCallupCheckboxes } from './attendance.js';

let loadedCallupsList = [];
let editingPlayerId = null;

export function initManagementModule(getActiveTeamId) {
    
    // --- 1. ESPORTAZIONE E CONDIVISIONE MENSILE / ROSA ---
    document.getElementById('btn-export-monthly-csv').addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return alert("Seleziona prima una squadra!");
        const selectedMonth = parseInt(document.getElementById('filter-month').value);
        const selectedYear = parseInt(document.getElementById('filter-year').value);
        const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        let csv = `Registro Presenze - ${activeTeamId} - ${monthNamesIT[selectedMonth]} ${selectedYear}\n\nGiocatore;`;
        for (let d = 1; d <= totalDaysInMonth; d++) csv += `${d};`;
        csv += "\n";

        let sessions = AppCache.getAttendances(activeTeamId, selectedYear, selectedMonth) || [];
        const sessionsByDay = {};
        sessions.forEach(s => { sessionsByDay[parseInt(s.date.split('-')[2], 10)] = s; });

        activeTeamPlayers.forEach(player => {
            const displayName = player.lastName ? `${player.lastName} ${player.firstName}` : player.name;
            csv += `"${displayName}";`;
            for (let d = 1; d <= totalDaysInMonth; d++) {
                const session = sessionsByDay[d];
                let val = "-";
                if (session && session.records) {
                    const rec = session.records.find(r => r.playerId === player.id);
                    if (rec) {
                        const map = { present: 'P', absent: 'A', justified: 'AG', injured: 'INF', late: 'R' };
                        val = map[rec.status] || '-';
                    }
                }
                csv += `${val};`;
            }
            csv += "\n";
        });

        downloadCSV(`Presenze_${activeTeamId}_${monthNamesIT[selectedMonth]}_${selectedYear}.csv`, csv);
    });

    document.getElementById('btn-export-roster-csv').addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId || activeTeamPlayers.length === 0) return alert("Nessun giocatore in rosa!");
        let csv = `Cognome;Nome;Numero Maglia;Data Nascita;Ruolo;Scadenza Certificato;Tel. Genitore\n`;
        activeTeamPlayers.forEach(p => {
            csv += `"${p.lastName || ''}";"${p.firstName || ''}";"${p.jersey || ''}";"${p.dob || ''}";"${p.role || ''}";"${p.medicalExp || ''}";"${p.parentPhone || ''}"\n`;
        });
        downloadCSV(`Rosa_${activeTeamId}.csv`, csv);
    });

    // --- 2. IMPORTAZIONE GIOCATORI DA FILE CSV ---
    const btnImportCsv = document.getElementById('btn-import-roster-csv');
    const inputImportCsv = document.getElementById('input-import-roster-csv');

    btnImportCsv.addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return alert('Seleziona prima una squadra per poter importare i giocatori!');
        inputImportCsv.click();
    });

    inputImportCsv.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const rows = results.data;
                const activeTeamId = getActiveTeamId();
                if (!rows || rows.length === 0) {
                    return alert("Il file CSV sembra vuoto o non formattato correttamente.");
                }

                if (!confirm(`Trovati ${rows.length} giocatori nel file CSV.\nConfermi l'importazione nel gruppo "${activeTeamId}"?`)) {
                    inputImportCsv.value = '';
                    return;
                }

                try {
                    let count = 0;
                    for (const row of rows) {
                        const lastName = (row['Cognome'] || row['cognome'] || '').trim();
                        const firstName = (row['Nome'] || row['nome'] || '').trim();

                        if (lastName || firstName) {
                            const playerData = {
                                lastName: lastName,
                                firstName: firstName,
                                name: `${lastName} ${firstName}`.trim(),
                                jersey: (row['Numero Maglia'] || row['Maglia'] || row['jersey'] || '').toString().trim(),
                                dob: (row['Data Nascita'] || row['dob'] || '').trim(),
                                role: (row['Ruolo'] || row['role'] || '').trim(),
                                medicalExp: (row['Scadenza Certificato'] || row['medicalExp'] || '').trim(),
                                parentPhone: (row['Tel. Genitore'] || row['parentPhone'] || '').toString().trim(),
                                teamId: activeTeamId,
                                createdAt: serverTimestamp()
                            };

                            await addDoc(collection(db, 'players'), playerData);
                            count++;
                        }
                    }

                    alert(`✅ Importazione completata! Aggiunti ${count} giocatori al gruppo ${activeTeamId}.`);
                    AppCache.clearPlayers(activeTeamId);
                    loadTeamData(activeTeamId, null, true);

                } catch (err) {
                    alert("Errore durante l'importazione dei dati: " + err.message);
                } finally {
                    inputImportCsv.value = '';
                }
            },
            error: function(err) {
                alert("Errore nella lettura del file CSV: " + err.message);
                inputImportCsv.value = '';
            }
        });
    });

    // --- 3. CONVOCAZIONI E GESTIONE ---
    document.getElementById('form-callup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return alert("Seleziona prima una squadra!");

        const opponent = document.getElementById('match-opponent').value.trim();
        const location = document.getElementById('match-location').value.trim();
        const matchDate = document.getElementById('match-date').value;
        const matchTime = document.getElementById('match-time').value;
        const gatheringTime = document.getElementById('gathering-time').value;

        const selectedPlayers = [];
        document.querySelectorAll('input[name="callup_player"]:checked').forEach(cb => selectedPlayers.push(cb.value));

        if (selectedPlayers.length === 0) return alert("Seleziona almeno un giocatore!");

        try {
            const q = query(
                collection(db, 'callups'),
                where('teamId', '==', activeTeamId),
                where('date', '==', matchDate)
            );
            const snapshot = await getDocs(q);

            let docToUpdateId = !snapshot.empty ? snapshot.docs[0].id : null;

            const callupData = {
                teamId: activeTeamId,
                opponent: opponent,
                location: location,
                date: matchDate,
                matchTime: matchTime,
                gatheringTime: gatheringTime,
                players: selectedPlayers,
                updatedAt: serverTimestamp()
            };

            if (docToUpdateId) {
                await updateDoc(doc(db, 'callups', docToUpdateId), callupData);
                alert(`Convocazione aggiornata per il ${formatDateIT(matchDate)}!`);
            } else {
                callupData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'callups'), callupData);
                alert(`Convocazione creata!`);
            }

            document.getElementById('form-callup').reset();
            renderCallupCheckboxes();
            loadCallups(getActiveTeamId);
        } catch (err) {
            alert("Errore salvataggio convocazione: " + err.message);
        }
    });

    // --- 4. MODALE E GESTIONE GIOCATORE ---
    document.getElementById('btn-open-add-player').addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return alert('Seleziona prima una squadra!');
        editingPlayerId = null;
        document.getElementById('modal-player-title').innerText = "Aggiungi Nuovo Giocatore";
        document.getElementById('btn-submit-player').innerText = "Salva Giocatore";
        
        document.getElementById('player-first-name').value = '';
        document.getElementById('player-last-name').value = '';
        document.getElementById('player-dob').value = '';
        document.getElementById('player-jersey').value = '';
        document.getElementById('player-role').value = '';
        document.getElementById('player-medical-exp').value = '';
        document.getElementById('player-parent-phone').value = '';
        document.getElementById('modal-add-player').classList.remove('hidden');
    });

    document.getElementById('btn-close-modal-player').addEventListener('click', () => {
        document.getElementById('modal-add-player').classList.add('hidden');
    });

    document.getElementById('form-add-player').addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return;

        const firstName = document.getElementById('player-first-name').value.trim();
        const lastName = document.getElementById('player-last-name').value.trim();
        const dob = document.getElementById('player-dob').value;
        const jersey = document.getElementById('player-jersey').value.trim();
        const role = document.getElementById('player-role').value;
        const medicalExp = document.getElementById('player-medical-exp').value;
        const parentPhone = document.getElementById('player-parent-phone').value.trim();

        const playerData = {
            firstName: firstName,
            lastName: lastName,
            name: `${lastName} ${firstName}`.trim(),
            dob: dob,
            jersey: jersey,
            role: role,
            medicalExp: medicalExp,
            parentPhone: parentPhone,
            teamId: activeTeamId
        };

        try {
            if (editingPlayerId) {
                await updateDoc(doc(db, 'players', editingPlayerId), playerData);
                alert("Giocatore aggiornato con successo!");
            } else {
                playerData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'players'), playerData);
                alert("Nuovo giocatore aggiunto con successo!");
            }

            document.getElementById('modal-add-player').classList.add('hidden');
            AppCache.clearPlayers(activeTeamId);
            loadTeamData(activeTeamId, null, true);
        } catch (err) {
            alert("Errore salvataggio giocatore: " + err.message);
        }
    });

    // --- 5. PULSANTI CONDIVISIONE E STAMPA ---
    document.getElementById('btn-share-monthly-wa').addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId) return;
        const m = parseInt(document.getElementById('filter-month').value);
        const y = parseInt(document.getElementById('filter-year').value);
        let text = `📊 *RIEPILOGO PRESENZE MENSILE*\n🏆 *Spes Montesacro - ${activeTeamId}*\n📅 *Mese:* ${monthNamesIT[m]} ${y}\n\n📌 *Sedute:* ${document.getElementById('stat-total-sessions').innerText}\n✅ *Presenze Totali:* ${document.getElementById('stat-total-presents').innerText}\n📈 *Media/Seduta:* ${document.getElementById('stat-avg-presents').innerText}\n\n_Report Registro Tecnico Spes Montesacro._`;
        sendToWhatsApp(text, `Report Mensile ${monthNamesIT[m]}`);
    });

    document.getElementById('btn-share-roster-wa').addEventListener('click', () => {
        const activeTeamId = getActiveTeamId();
        if (!activeTeamId || activeTeamPlayers.length === 0) return;
        let text = `👥 *ROSA UFFICIALE GIOCATORI*\n🏆 *Spes Montesacro - ${activeTeamId}*\n📊 *Totale Tesserati:* ${activeTeamPlayers.length}\n\n`;
        activeTeamPlayers.forEach((p, i) => text += `${i + 1}. ${p.lastName ? `${p.lastName} ${p.firstName}` : p.name}\n`);
        sendToWhatsApp(text, `Rosa ${activeTeamId}`);
    });

    document.getElementById('btn-print-roster').addEventListener('click', () => {
        document.body.classList.remove('print-landscape', 'print-monthly', 'print-callup');
        document.body.classList.add('print-roster');
        document.getElementById('print-report-period').innerText = 'Documento: Rosa Giocatori Ufficiale';
        window.print();
    });

    document.getElementById('btn-print-monthly').addEventListener('click', () => {
        document.body.classList.remove('print-roster', 'print-callup');
        document.body.classList.add('print-landscape', 'print-monthly');
        const m = parseInt(document.getElementById('filter-month').value);
        const y = parseInt(document.getElementById('filter-year').value);
        document.getElementById('print-report-period').innerText = `Periodo: ${monthNamesIT[m]} ${y}`;
        window.print();
    });

    document.getElementById('btn-reset-attendance-radios').addEventListener('click', () => {
        if (!activeTeamPlayers) return;
        activeTeamPlayers.forEach(player => {
            const radio = document.querySelector(`input[name="att_${player.id}"][value="present"]`);
            if (radio) radio.checked = true;
        });
    });
}

// --- Funzioni ausiliarie per le convocazioni ---
export async function loadCallups(getActiveTeamId) {
    const activeTeamId = getActiveTeamId();
    const container = document.getElementById('callups-list-container');
    if (!container || !activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') return;

    try {
        const q = query(collection(db, 'callups'), where('teamId', '==', activeTeamId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-xs text-gray-400">Nessuna convocazione presente.</p>';
            loadedCallupsList = [];
            return;
        }

        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => new Date(`${b.date}T${b.matchTime}`) - new Date(`${a.date}T${a.matchTime}`));

        loadedCallupsList = docs;
        container.innerHTML = '';
        
        docs.forEach(data => {
            const playersList = (data.players || []).join(', ');
            container.innerHTML += `
                <div class="border rounded p-3 bg-gray-50 flex justify-between items-start text-xs mb-2 shadow-sm">
                    <div class="space-y-1">
                        <p class="font-bold text-sm text-black">⚽ Spes Montesacro vs ${data.opponent}</p>
                        <p class="text-gray-700">
                            📅 <strong>Giorno:</strong> ${formatDateIT(data.date)} | 
                            🕒 <strong>Inizio:</strong> ${data.matchTime} | 
                            ⏰ <strong>Ritrovo:</strong> ${data.gatheringTime}
                        </p>
                        <p class="text-gray-600">📍 <strong>Campo:</strong> ${data.location}</p>
                        <p class="text-gray-500 pt-1">👥 <strong>Convocati (${data.players ? data.players.length : 0}):</strong> ${playersList}</p>
                    </div>
                    <div class="flex flex-col space-y-1">
                        <button data-id="${data.id}" class="btn-share-callup-wa bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] transition">📲 WhatsApp</button>
                        <button data-id="${data.id}" class="btn-print-callup bg-black hover:bg-gray-800 text-white font-bold px-2 py-1 rounded text-[10px] transition">🖨️ Stampa</button>
                        <button data-id="${data.id}" class="btn-delete-callup bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] transition">🗑️ Elimina</button>
                    </div>
                </div>
            `;
        });

        container.querySelectorAll('.btn-share-callup-wa').forEach(b => {
            b.addEventListener('click', (e) => shareCallupWhatsApp(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-print-callup').forEach(b => {
            b.addEventListener('click', (e) => printCallupReport(e.target.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-delete-callup').forEach(b => {
            b.addEventListener('click', (e) => deleteCallup(e.target.getAttribute('data-id'), getActiveTeamId));
        });

    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-500">Errore: ${err.message}</p>`;
    }
}

function shareCallupWhatsApp(callupId) {
    const callup = loadedCallupsList.find(c => c.id === callupId);
    if (!callup) return;
    const sortedPlayers = [...(callup.players || [])].sort((a, b) => a.localeCompare(b));
    let text = `📢 *CONVOCAZIONE GARA UFFICIALE*\n⚽ *Spes Montesacro vs ${callup.opponent}*\n\n📅 *Giorno:* ${formatDateIT(callup.date)}\n🕒 *Inizio Partita:* ${callup.matchTime}\n⏰ *Ora Ritrovo:* ${callup.gatheringTime}\n📍 *Luogo:* ${callup.location}\n\n👥 *ELENCO CONVOCATI (${sortedPlayers.length}):*\n`;
    sortedPlayers.forEach((p, i) => text += `${i + 1}. ${p}\n`);
    text += `\n⚠️ *Massima puntualità!*`;
    sendToWhatsApp(text, `Convocazione vs ${callup.opponent}`);
}

function printCallupReport(callupId) {
    const callup = loadedCallupsList.find(c => c.id === callupId);
    if (!callup) return;
    const printContainer = document.getElementById('callup-print-container');
    document.getElementById('print-report-period').innerText = 'Modulo Convocazione Gara Ufficiale';
    const sortedPlayers = [...(callup.players || [])].sort((a, b) => a.localeCompare(b));

    let rows = '';
    sortedPlayers.forEach((p, index) => {
        rows += `<tr><td class="border border-black p-2 text-center font-bold" style="width: 40px;">${index + 1}</td><td class="border border-black p-2 font-bold text-sm">${p}</td><td class="border border-black p-2"></td></tr>`;
    });

    printContainer.innerHTML = `
        <div class="bg-gray-100 border border-black p-3 mb-4 rounded space-y-1 text-sm">
            <p class="text-base font-extrabold text-black">⚽ PARTITA: Spes Montesacro vs ${callup.opponent}</p>
            <div class="grid grid-cols-2 gap-2 pt-1 font-semibold">
                <p>📅 <strong>Giorno:</strong> ${formatDateIT(callup.date)}</p>
                <p>📍 <strong>Luogo:</strong> ${callup.location}</p>
                <p>🕒 <strong>Inizio:</strong> ${callup.matchTime}</p>
                <p>⏰ <strong>Ritrovo Campo:</strong> ${callup.gatheringTime}</p>
            </div>
        </div>
        <h3 class="text-md font-bold mb-2 uppercase tracking-wide border-b border-black pb-1">Giocatori Convocati (${sortedPlayers.length})</h3>
        <table class="w-full border-collapse border border-black text-left">
            <thead><tr class="bg-gray-200 text-black uppercase text-xs"><th class="border border-black p-2 text-center">#</th><th class="border border-black p-2">Cognome e Nome</th><th class="border border-black p-2 w-1/3">Note / Firma</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    document.body.classList.remove('print-landscape', 'print-monthly', 'print-roster');
    document.body.classList.add('print-callup');
    window.print();
}

async function deleteCallup(callupId, getActiveTeamId) {
    if (!confirm("Eliminare questa convocazione?")) return;
    try {
        await deleteDoc(doc(db, 'callups', callupId));
        alert("Convocazione eliminata!");
        loadCallups(getActiveTeamId);
    } catch (err) { alert("Errore: " + err.message); }
}
