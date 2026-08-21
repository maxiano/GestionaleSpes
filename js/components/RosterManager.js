// components/RosterManager.js
import { DatabaseService } from '../services/DatabaseService.js';
import { store } from '../core/AppStore.js';

export class RosterManager {
    constructor() {
        this.editingPlayerId = null;
        this.initListeners();
        window.addEventListener('teamChanged', () => this.loadData());
    }

    async loadData() {
        if (!store.activeTeamId) return;
        try {
            const players = await DatabaseService.getPlayers(store.activeTeamId);
            store.setPlayers(players);
        } catch (err) {
            console.error("Errore caricamento giocatori:", err);
        }
    }

    initListeners() {
        document.getElementById('btn-open-add-player')?.addEventListener('click', () => {
            if (!store.activeTeamId) return alert('Seleziona prima una squadra!');
            this.editingPlayerId = null;
            document.getElementById('modal-player-title').innerText = "Aggiungi Nuovo Giocatore";
            document.getElementById('btn-submit-player').innerText = "Salva Giocatore";

            ['player-first-name', 'player-last-name', 'player-dob', 'player-jersey', 'player-role', 'player-medical-exp', 'player-parent-phone'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('modal-add-player').classList.remove('hidden');
        });

        document.getElementById('btn-close-modal-player')?.addEventListener('click', () => {
            document.getElementById('modal-add-player').classList.add('hidden');
        });

        document.getElementById('form-add-player')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSavePlayer();
        });

        document.getElementById('btn-print-roster')?.addEventListener('click', () => {
            document.body.classList.remove('print-landscape', 'print-monthly', 'print-callup');
            document.body.classList.add('print-roster');
            document.getElementById('print-report-period').innerText = 'Documento: Rosa Giocatori Ufficiale';
            window.print();
        });

        document.getElementById('btn-share-roster-wa')?.addEventListener('click', () => {
            if (!store.activeTeamId || store.players.length === 0) return;
            let text = `👥 *ROSA UFFICIALE GIOCATORI*\n🏆 *Spes Montesacro - ${store.activeTeamId}*\n📊 *Totale Tesserati:* ${store.players.length}\n\n`;
            store.players.forEach((p, i) => text += `${i + 1}. ${p.lastName ? `${p.lastName} ${p.firstName}` : p.name}\n`);
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        });
    }

    async handleSavePlayer() {
        const firstName = document.getElementById('player-first-name').value.trim();
        const lastName = document.getElementById('player-last-name').value.trim();
        const parentPhone = document.getElementById('player-parent-phone').value.trim();

        const playerData = {
            firstName,
            lastName,
            name: `${lastName} ${firstName}`.trim(),
            dob: document.getElementById('player-dob').value,
            jersey: document.getElementById('player-jersey').value.trim(),
            role: document.getElementById('player-role').value,
            medicalExp: document.getElementById('player-medical-exp').value,
            parentPhone,
            teamId: store.activeTeamId,
            parentId: null
        };

        try {
            await DatabaseService.savePlayer(playerData, this.editingPlayerId);
            alert(this.editingPlayerId ? "Giocatore aggiornato!" : "Nuovo giocatore aggiunto!");
            document.getElementById('modal-add-player').classList.add('hidden');
            this.loadData();
        } catch (err) {
            alert("Errore salvataggio giocatore: " + err.message);
        }
    }

    async deletePlayer(playerId) {
        if (!confirm("Sei sicuro di voler rimuovere questo giocatore dalla rosa?")) return;
        try {
            await DatabaseService.deletePlayer(playerId);
            alert("Giocatore eliminato!");
            this.loadData();
        } catch (err) {
            alert("Errore eliminazione: " + err.message);
        }
    }

    openEditPlayerModal(playerId) {
        const player = store.players.find(p => p.id === playerId);
        if (!player) return;

        this.editingPlayerId = playerId;
        document.getElementById('modal-player-title').innerText = "Modifica Giocatore";
        document.getElementById('btn-submit-player').innerText = "Aggiorna Giocatore";

        document.getElementById('player-first-name').value = player.firstName || '';
        document.getElementById('player-last-name').value = player.lastName || '';
        document.getElementById('player-dob').value = player.dob || '';
        document.getElementById('player-jersey').value = player.jersey || '';
        document.getElementById('player-role').value = player.role || '';
        document.getElementById('player-medical-exp').value = player.medicalExp || '';
        document.getElementById('player-parent-phone').value = player.parentPhone || '';

        document.getElementById('modal-add-player').classList.remove('hidden');
    }
}
