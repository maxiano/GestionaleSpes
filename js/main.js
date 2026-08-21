// main.js
import { store } from './core/AppStore.js';
import { DatabaseService } from './services/DatabaseService.js';
import { TournamentManager } from './components/TournamentManager.js';
import { RosterManager } from './components/RosterManager.js';
import { AttendanceManager } from './components/AttendanceManager.js';

window.app = {};

document.addEventListener('DOMContentLoaded', () => {
    // Istanziazione dei Manager modulari
    window.app.store = store;
    window.app.tournaments = new TournamentManager();
    window.app.roster = new RosterManager();
    window.app.attendance = new AttendanceManager();

    // Impostazione iniziale squadra (es. 2014)
    store.currentUserRole = 'admin';
    store.setTeam('2014');

    // Gestione Backup Completo Database in JSON
    const btnBackup = document.getElementById('btn-download-backup');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            try {
                const backup = await DatabaseService.backupDatabase();
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `Spes_Backup_${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                alert("Backup del database completato con successo!");
            } catch (err) {
                alert("Errore durante il backup: " + err.message);
            }
        });
    }

    // Gestione Menu Hamburger UI
    const hamburgerBtn = document.getElementById('hamburger-menu-btn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            const tabsMenu = document.getElementById('navigation-tabs');
            const icon = document.getElementById('hamburger-icon');
            if (tabsMenu) {
                tabsMenu.classList.toggle('hidden');
                if (icon) {
                    icon.style.transform = tabsMenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            }
        });
    }
});
