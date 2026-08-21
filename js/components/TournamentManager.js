// components/TournamentManager.js
import { DatabaseService } from '../services/DatabaseService.js';
import { store } from '../core/AppStore.js';

export class TournamentManager {
    constructor() {
        this.container = document.getElementById('tournament-grid');
        this.initListeners();
        window.addEventListener('teamChanged', () => this.loadData());
    }

    async loadData() {
        if (!store.activeTeamId) return;
        try {
            const data = await DatabaseService.getTournaments(store.activeTeamId);
            store.setTournaments(data);
            this.render(data);
        } catch (err) {
            console.error("Errore caricamento tornei:", err);
        }
    }

    initListeners() {
        // Form Nuovo Torneo
        const form = document.getElementById('form-tournament');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCreate(e.target);
            });
        }

        // Filtri
        document.getElementById('filter-tournament-select')?.addEventListener('change', () => this.render(store.tournaments));
        document.getElementById('filter-status-select')?.addEventListener('change', () => this.render(store.tournaments));

        // Pulsanti modale
        document.getElementById('btn-open-modal-tournament')?.addEventListener('click', () => {
            if (!store.activeTeamId) return alert('Seleziona prima una squadra!');
            document.getElementById('modal-tournament')?.classList.remove('hidden');
        });

        // Export/Import CSV
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('input-import-csv')?.addEventListener('change', (e) => this.importCSV(e.target));
    }

    async handleCreate(formElement) {
        const newMatch = {
            teamId: store.activeTeamId,
            team: store.activeTeamId,
            tournament: document.getElementById('tour-name').value,
            match: document.getElementById('tour-match').value,
            date: document.getElementById('tour-date').value,
            time: document.getElementById('tour-time').value,
            location: document.getElementById('tour-location').value,
            played: false,
            result: ""
        };

        try {
            const id = await DatabaseService.saveTournament(newMatch);
            newMatch.id = id;
            store.tournaments.push(newMatch);
            this.render(store.tournaments);
            document.getElementById('modal-tournament')?.classList.add('hidden');
            formElement.reset();
        } catch (err) {
            alert("Errore salvataggio torneo: " + err.message);
        }
    }

    async setResult(id) {
        const res = prompt("Inserisci il risultato (es. 3-1):");
        if (res) {
            try {
                await DatabaseService.updateTournament(id, { played: true, result: res });
                const match = store.tournaments.find(m => m.id === id);
                if (match) { match.played = true; match.result = res; }
                this.render(store.tournaments);
            } catch (error) {
                console.error("Errore aggiornamento risultato:", error);
            }
        }
    }

    async editMatch(id) {
        const match = store.tournaments.find(m => m.id === id);
        if (!match) return;

        const newMatchName = prompt("Modifica Incontro:", match.match);
        if (newMatchName === null) return;
        const newLocation = prompt("Modifica Luogo:", match.location);
        if (newLocation === null) return;
        const newDate = prompt("Modifica Data:", match.date);
        if (newDate === null) return;
        const newTime = prompt("Modifica Orario:", match.time);
        if (newTime === null) return;

        const updatedData = {
            match: newMatchName.trim() || match.match,
            location: newLocation.trim() || match.location,
            date: newDate.trim() || match.date,
            time: newTime.trim() || match.time
        };

        try {
            await DatabaseService.updateTournament(id, updatedData);
            Object.assign(match, updatedData);
            this.render(store.tournaments);
        } catch (error) {
            console.error("Errore modifica partita:", error);
        }
    }

    async deleteMatch(id) {
        if (confirm("Sei sicuro di voler eliminare questa partita?")) {
            try {
                await DatabaseService.deleteTournament(id);
                store.setTournaments(store.tournaments.filter(m => m.id !== id));
                this.render(store.tournaments);
            } catch (error) {
                console.error("Errore eliminazione partita:", error);
            }
        }
    }

    exportToCSV() {
        if (store.tournaments.length === 0) {
            alert("Nessuna partita da esportare!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Torneo,Partita,Data,Orario,Luogo,Risultato\n";
        store.tournaments.forEach(m => {
            let row = [
                `"${m.tournament || ''}"`,
                `"${m.match || ''}"`,
                `"${m.date || ''}"`,
                `"${m.time || ''}"`,
                `"${m.location || ''}"`,
                `"${m.result || ''}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "partite_torneo.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async importCSV(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split("\n").slice(1);
            let importedCount = 0;

            for (let row of rows) {
                if (!row.trim()) continue;
                const cols = row.split(",");
                if (cols.length < 5) continue;

                const clean = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : '';
                const newMatch = {
                    teamId: store.activeTeamId,
                    tournament: clean(cols[0]),
                    match: clean(cols[1]),
                    date: clean(cols[2]),
                    time: clean(cols[3]),
                    location: clean(cols[4]),
                    played: false,
                    result: ""
                };

                try {
                    await DatabaseService.saveTournament(newMatch);
                    importedCount++;
                } catch (error) {
                    console.error("Errore importazione riga:", error);
                }
            }

            alert(`Importazione completata! Aggiunte ${importedCount} partite.`);
            input.value = "";
            this.loadData();
        };
        reader.readAsText(file);
    }

    render(matches) {
        if (!this.container) return;
        const teamSpan = document.getElementById('display-active-team-tour');
        const filterSelect = document.getElementById('filter-tournament-select');
        const statusSelect = document.getElementById('filter-status-select'); 
        
        if (teamSpan) teamSpan.innerText = store.activeTeamId || '';

        const teamMatches = matches.filter(m => m.teamId === store.activeTeamId);

        if (filterSelect) {
            const selectedValue = filterSelect.value;
            const uniqueTournaments = [...new Set(teamMatches.map(m => m.tournament).filter(Boolean))];
            
            filterSelect.innerHTML = `<option value="">Tutti i tornei (${teamMatches.length})</option>`;
            uniqueTournaments.forEach(tourName => {
                const isSelected = tourName === selectedValue ? 'selected' : '';
                filterSelect.innerHTML += `<option value="${tourName}" ${isSelected}>${tourName}</option>`;
            });
        }

        const selectedTourFilter = filterSelect ? filterSelect.value.trim().toLowerCase() : '';
        let filtered = selectedTourFilter 
            ? teamMatches.filter(m => m.tournament && m.tournament.trim().toLowerCase() === selectedTourFilter) 
            : [...teamMatches];
        
        const statusFilter = statusSelect ? statusSelect.value : '';
        if (statusFilter === 'da_giocare') {
            filtered = filtered.filter(m => !m.played);
        } else if (statusFilter === 'giocata') {
            filtered = filtered.filter(m => m.played === true);
        }

        filtered.sort((a, b) => new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`) - new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`));

        this.container.innerHTML = '';
        if (filtered.length === 0) {
            this.container.innerHTML = `<p class="text-center text-xs text-slate-400 py-10 w-full col-span-2">Nessuna partita trovata con i filtri selezionati.</p>`;
            return;
        }

        filtered.forEach(m => {
            this.container.innerHTML += `
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
                            `<button onclick="window.app.tournaments.setResult('${m.id}')" class="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[10px] py-2 rounded-xl transition active:scale-95">Inserisci Risultato</button>` 
                            : `<p class="mt-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 py-2 rounded-lg">Risultato: ${m.result}</p>`
                        }
                        <div class="flex gap-2">
                            <button onclick="window.app.tournaments.editMatch('${m.id}')" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition">✏️ Modifica</button>
                            <button onclick="window.app.tournaments.deleteMatch('${m.id}')" class="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] py-1.5 rounded-xl transition">🗑️ Elimina</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
}
