/**
 * @file app.js
 * @brief Gestionale Tecnico - Spes Montesacro (Entry Point Modulare)
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 */

import { AppState } from './state.js';
import { initAuth } from './modules/auth.js';
import { 
    captureDefaultAdminTeamOptions, 
    initYearFilter, 
    setupTeamSelectorUI, 
    switchTab, 
    initNavigationEvents 
} from './modules/ui.js';
import { loadTeamData, initPlayerEvents } from './modules/players.js';
import { 
    renderAttendanceInputs, 
    checkAndLoadExistingAttendance, 
    loadMonthlyAttendances, 
    initAttendanceEvents 
} from './modules/attendance.js';
import { 
    renderCallupCheckboxes, 
    loadCallups, 
    initCallupEvents 
} from './modules/callups.js';
import { 
    loadTournamentsFromDB, 
    renderTournaments, 
    initTournamentEvents 
} from './modules/tournaments.js';
import { loadStaffList, initStaffEvents } from './modules/staff.js';
import { loadParentsList, initParentsEvents } from './modules/parents.js';
import { initBackupEvents } from './modules/backup.js';
import { initParentPortal } from './modules/parent-portal.js';

// --- INIZIALIZZAZIONE GLOBALE AL CARICAMENTO DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cattura opzioni admin predefinite e inizializza date
    captureDefaultAdminTeamOptions();
    initYearFilter();

    // 2. Inizializza gli ascoltatori dei sotto-moduli funzionali
    initNavigationEvents({
        onTabSelect: (tabId) => switchTab(tabId, handleTabActivated),
        onTeamSelected: (teamId) => {
            switchTab('tab-roster', handleTabActivated);
            loadTeamData(false, { onPlayersLoaded: handleTeamLoaded });
        }
    });

    initPlayerEvents(() => {
        const players = AppState.getActiveTeamPlayers();
        handleTeamLoaded(players);
    });

    initAttendanceEvents();
    initCallupEvents();
    initTournamentEvents();
    initStaffEvents();
    initParentsEvents();
    initBackupEvents();

    // Collegamento rapido bottoni tab
    const tabsMap = [
        { id: 'btn-tab-roster', target: 'tab-roster' },
        { id: 'btn-tab-attendance', target: 'tab-attendance' },
        { id: 'btn-tab-monthly', target: 'tab-monthly' },
        { id: 'btn-tab-callup', target: 'tab-callup' },
        { id: 'btn-tab-staff', target: 'tab-staff' },
        { id: 'btn-tab-tournaments', target: 'tab-tournaments' }
    ];

    tabsMap.forEach(tab => {
        const btn = document.getElementById(tab.id);
        if (btn) {
            btn.addEventListener('click', () => switchTab(tab.target, handleTabActivated));
        }
    });

    // 3. Avvia la gestione dell'Autenticazione Firebase
    initAuth({
        onLoginSuccess: (profile) => {
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.innerText = `${profile.name} (${profile.role.toUpperCase()})`;
            }
            document.getElementById('btn-logout')?.classList.remove('hidden');
            document.getElementById('section-login')?.classList.add('hidden');
            document.getElementById('app-dashboard')?.classList.remove('hidden');

            setupTeamSelectorUI((singleTeamId) => {
                switchTab('tab-roster', handleTabActivated);
                loadTeamData(false, { onPlayersLoaded: handleTeamLoaded });
            });
            loadTournamentsFromDB();
        },
        onParentLogin: async (profile) => {
            document.getElementById('section-login')?.classList.add('hidden');
            document.getElementById('app-dashboard')?.classList.add('hidden');

            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.innerText = `${profile.name || profile.email} (GENITORE)`;
            }
            document.getElementById('btn-logout')?.classList.remove('hidden');
            document.getElementById('admin-management-menu')?.classList.add('hidden');

            await initParentPortal(profile);
        },
        onLogout: () => {
            document.getElementById('btn-logout')?.classList.add('hidden');
            document.getElementById('nav-btn-staff')?.classList.add('hidden');
            document.getElementById('btn-tab-staff')?.classList.add('hidden');
            document.getElementById('nav-btn-backup')?.classList.add('hidden');
            document.getElementById('section-login')?.classList.remove('hidden');
            document.getElementById('app-dashboard')?.classList.add('hidden');

            const dynamicParent = document.getElementById('dynamic-parent-container');
            if (dynamicParent) dynamicParent.remove();
        }
    });

    // Registrazione Service Worker per Progressive Web App
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registrato con successo'))
            .catch((err) => console.log('Registrazione Service Worker fallita:', err));
    }
});

function handleTeamLoaded() {
    renderAttendanceInputs();
    renderCallupCheckboxes();
    checkAndLoadExistingAttendance();
    loadMonthlyAttendances(false);
}

function handleTabActivated(tabId) {
    if (tabId === 'tab-callup') loadCallups();
    if (tabId === 'tab-staff') loadStaffList();
    if (tabId === 'tab-parents') loadParentsList();
    if (tabId === 'tab-tournaments') renderTournaments();
}
