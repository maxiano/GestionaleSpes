// components/AttendanceManager.js
import { DatabaseService } from '../services/DatabaseService.js';
import { store } from '../core/AppStore.js';
import { monthNamesIT } from '../core/config.js';

export class AttendanceManager {
    constructor() {
        this.loadedCallupsList = [];
        this.initListeners();
        window.addEventListener('teamChanged', () => this.loadCallups());
    }

    async loadCallups() {
        if (!store.activeTeamId) return;
        try {
            this.loadedCallupsList = await DatabaseService.getCallups(store.activeTeamId);
            store.setCallups(this.loadedCallupsList);
        } catch (err) {
            console.error("Errore caricamento convocazioni:", err);
        }
    }

    initListeners() {
        // Reset radio presenze
        document.getElementById('btn-reset-attendance-radios')?.addEventListener('click', () => {
            if (!store.players) return;
            store.players.forEach(player => {
                const radio = document.querySelector(`input[name="att_${player.id}"][value="present"]`);
                if (radio) radio.checked = true;
            });
        });

        // Stampa report mensile
        document.getElementById('btn-print-monthly')?.addEventListener('click', () => {
            document.body.classList.remove('print-roster', 'print-callup');
            document.body.classList.add('print-landscape', 'print-monthly');
            const m = parseInt(document.getElementById('filter-month').value);
            const y = parseInt(document.getElementById('filter-year').value);
            const monthName = monthNamesIT[m] || "Mese";
            document.getElementById('print-report-period').innerText = `Periodo: ${monthName} ${y}`;
            window.print();
        });
    }

    shareCallupWhatsApp(callupId) {
        const callup = this.loadedCallupsList.find(c => c.id === callupId);
        if (!callup) return;
        
        const sortedPlayers = [...(callup.players || [])].sort((a, b) => {
            const nameA = a.includes('|') ? a.split('|')[1] : a;
            const nameB = b.includes('|') ? b.split('|')[1] : b;
            return nameA.localeCompare(nameB);
        });

        let text = `📢 *CONVOCAZIONE GARA UFFICIALE*\n⚽ *Spes Montesacro vs ${callup.opponent}*\n\n📅 *Giorno:* ${DatabaseService.formatDateIT(callup.date)}\n🕒 *Inizio Partita:* ${callup.matchTime}\n⏰ *Ora Ritrovo:* ${callup.gatheringTime}\n📍 *Luogo:* ${callup.location}\n\n👥 *ELENCO CONVOCATI (${sortedPlayers.length}):*\n`;
        
        sortedPlayers.forEach((p, i) => {
            const cleanName = p.includes('|') ? p.split('|')[1] : p;
            text += `${i + 1}. ${cleanName}\n`;
        });
        
        text += `\n⚠️ *Massima puntualità!*`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }

    printCallupReport(callupId) {
        const callup = this.loadedCallupsList.find(c => c.id === callupId);
        if (!callup) return;
        const printContainer = document.getElementById('callup-print-container');
        document.getElementById('print-report-period').innerText = 'Modulo Convocazione Gara Ufficiale';

        const sortedPlayers = [...(callup.players || [])].sort((a, b) => {
            const nameA = a.includes('|') ? a.split('|')[1] : a;
            const nameB = b.includes('|') ? b.split('|')[1] : b;
            return nameA.localeCompare(nameB);
        });

        let rows = '';
        sortedPlayers.forEach((p, index) => {
            const cleanName = p.includes('|') ? p.split('|')[1] : p;
            rows += `<tr><td class="border border-black p-2 text-center font-bold" style="width: 40px;">${index + 1}</td><td class="border border-black p-2 font-bold text-sm">${cleanName}</td><td class="border border-black p-2"></td></tr>`;
        });

        printContainer.innerHTML = `
            <div class="bg-gray-100 border border-black p-3 mb-4 rounded space-y-1 text-sm">
                <p class="text-base font-extrabold text-black">⚽ PARTITA: Spes Montesacro vs ${callup.opponent}</p>
                <div class="grid grid-cols-2 gap-2 pt-1 font-semibold">
                    <p>📅 <strong>Giorno:</strong> ${DatabaseService.formatDateIT(callup.date)}</p>
                    <p>📍 <strong>Luogo:</strong> ${callup.location || 'Da definire'}</p>
                    <p>🕒 <strong>Inizio:</strong> ${callup.matchTime}</p>
                    <p>⏰ <strong>Ritrovo Campo:</strong> ${callup.gatheringTime || 'Da definire'}</p>
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

    async deleteCallup(callupId) {
        if (!confirm("Vuoi archiviare questa partita nello storico ed eliminarla dalle convocazioni attive?")) return;
        try {
            await DatabaseService.archiveAndRemoveCallup(callupId);
            alert("Partita archiviata nello storico con successo!");
            this.loadCallups();
        } catch (err) {
            alert("Errore: " + err.message);
        }
    }

    sendFinalCallupWhatsApp(id) {
        const callup = this.loadedCallupsList.find(c => c.id === id);
        if (!callup) return;
        const siren = "\uD83D\uDEA8"; 
        const msg = `${siren} CONVOCAZIONE DEFINITIVA - Spes Montesacro ${siren}\n\nPartita: *${callup.opponent}*\nRitrovo: *${callup.gatheringTime}*\n\nLa lista è stata finalizzata. Controllate il portale per i dettagli definitivi!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
}
