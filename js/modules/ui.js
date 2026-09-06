/**
 * @file modules/ui.js
 * @brief Gestione della navigazione, menu a tendina, selettore squadra e layout
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { AppState } from '../state.js';

let defaultAdminTeamOptionsHTML = '';

export function captureDefaultAdminTeamOptions() {
    const teamSelect = document.getElementById('admin-team-filter');
    if (teamSelect) defaultAdminTeamOptionsHTML = teamSelect.innerHTML;
}

export function initYearFilter() {
    const now = new Date();
    const currentYr = now.getFullYear();
    const dateInput = document.getElementById('attendance-date');
    const monthFilter = document.getElementById('filter-month');
    const yearSelect = document.getElementById('filter-year');
    const seasonLabel = document.getElementById('print-season-year');

    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (monthFilter) monthFilter.value = now.getMonth();

    if (yearSelect) {
        yearSelect.innerHTML = '';
        for (let y = currentYr - 1; y <= currentYr + 3; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYr) opt.selected = true;
            yearSelect.appendChild(opt);
        }
    }
    if (seasonLabel) {
        seasonLabel.innerText = `Stagione Sportiva ${currentYr}/${currentYr + 1}`;
    }
}

export function switchTab(tabId, onTabActivated) {
    const currentUserProfile = AppState.getCurrentUserProfile();
    const activeTeamId = AppState.getActiveTeamId();
    const adminTabs = ['tab-staff', 'tab-parents'];
    const isAdmin = currentUserProfile && currentUserProfile.role === 'admin';

    if (adminTabs.includes(tabId) && !isAdmin) {
        return alert("Accesso non autorizzato.");
    }

    if (!adminTabs.includes(tabId)) {
        if (!activeTeamId || activeTeamId === "SELECT_TEAM" || activeTeamId === "ALL") {
            alert("⚠️ Attenzione: Devi prima selezionare una Categoria / Gruppo!");
            return;
        }
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.id !== 'btn-tab-staff' && btn.id !== 'btn-tab-parents') {
            btn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm text-gray-600 hover:bg-gray-100 transition";
        }
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    if (tabId === 'tab-staff') {
        document.getElementById('btn-tab-staff')?.classList.add('hidden');
        const activeLabel = document.getElementById('current-active-tab-label');
        if (activeLabel) activeLabel.innerText = 'Staff';
    } else if (tabId === 'tab-parents') {
        document.getElementById('btn-tab-parents')?.classList.add('hidden');
        const activeLabel = document.getElementById('current-active-tab-label');
        if (activeLabel) activeLabel.innerText = 'Genitori';
    } else {
        const activeBtn = document.getElementById(`btn-${tabId}`);
        if (activeBtn) {
            activeBtn.className = "tab-btn flex-1 py-2 px-3 text-center rounded-md font-bold text-xs md:text-sm transition text-white bg-black shadow";
            const activeLabel = document.getElementById('current-active-tab-label');
            if (activeLabel) activeLabel.innerText = activeBtn.innerText.trim();
        }
    }

    if (onTabActivated) onTabActivated(tabId);
}

export function setupTeamSelectorUI(onTeamChange) {
    const currentUserProfile = AppState.getCurrentUserProfile();
    if (!currentUserProfile) return;

    const selectorContainer = document.getElementById('admin-team-selector');
    const teamSelect = document.getElementById('admin-team-filter');
    const roleTitle = document.getElementById('dashboard-role-title');
    const subtitle = document.getElementById('dashboard-subtitle');
    const navTabs = document.getElementById('navigation-tabs');
    const mainArea = document.getElementById('main-content-area');

    if (selectorContainer) selectorContainer.classList.remove('hidden');

    const toggleDisplay = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    };

    if (currentUserProfile.role === 'admin') {
        if (roleTitle) roleTitle.innerText = "Panoramica Responsabile Tecnico";
        if (subtitle) subtitle.innerText = "Seleziona un gruppo per iniziare";

        ['nav-btn-staff', 'nav-btn-parents', 'nav-btn-import-players', 'nav-btn-export-players',
         'nav-btn-import-parents', 'nav-btn-export-parents', 'nav-btn-delete-all', 
         'admin-management-menu', 'nav-btn-backup'].forEach(id => toggleDisplay(id, true));

        if (teamSelect) {
            teamSelect.innerHTML = defaultAdminTeamOptionsHTML;
            teamSelect.value = 'ALL';
        }
        AppState.setActiveTeamId(null);
        if (navTabs) navTabs.classList.add('hidden');
        if (mainArea) mainArea.classList.add('hidden');
    } else {
        if (roleTitle) roleTitle.innerText = "Pannello Tecnico Coach";

        ['nav-btn-staff', 'nav-btn-parents', 'nav-btn-import-players', 'nav-btn-export-players',
         'nav-btn-import-parents', 'nav-btn-export-parents', 'nav-btn-delete-all', 
         'admin-management-menu', 'nav-btn-backup'].forEach(id => toggleDisplay(id, false));

        const coachTeams = currentUserProfile.teams || [];

        if (coachTeams.length === 0) {
            if (subtitle) subtitle.innerText = "Nessuna squadra assegnata";
            if (teamSelect) teamSelect.innerHTML = '<option value="NONE">Nessuna squadra assegnata</option>';
            AppState.setActiveTeamId(null);
            if (navTabs) navTabs.classList.add('hidden');
            if (mainArea) mainArea.classList.add('hidden');
            return;
        }

        if (coachTeams.length === 1) {
            if (teamSelect) teamSelect.innerHTML = `<option value="${coachTeams[0]}">${coachTeams[0]}</option>`;
            AppState.setActiveTeamId(coachTeams[0]);
            if (subtitle) subtitle.innerText = `Squadra: ${coachTeams[0]}`;
            if (navTabs) navTabs.classList.remove('hidden');
            if (mainArea) mainArea.classList.remove('hidden');
            if (onTeamChange) onTeamChange(coachTeams[0]);
        } else {
            let optionsHtml = '<option value="SELECT_TEAM" selected disabled>-- Seleziona la tua Squadra --</option>';
            coachTeams.forEach(t => optionsHtml += `<option value="${t}">${t}</option>`);
            if (teamSelect) {
                teamSelect.innerHTML = optionsHtml;
                teamSelect.value = 'SELECT_TEAM';
            }
            if (subtitle) subtitle.innerText = "Seleziona un gruppo per iniziare";
            AppState.setActiveTeamId(null);
            if (navTabs) navTabs.classList.add('hidden');
            if (mainArea) mainArea.classList.add('hidden');
        }
    }
}

export function initNavigationEvents({ onTabSelect, onTeamSelected }) {
    const teamSelect = document.getElementById('admin-team-filter');
    if (teamSelect) {
        teamSelect.addEventListener('change', () => {
            const selected = teamSelect.value;
            const navTabs = document.getElementById('navigation-tabs');
            const mainArea = document.getElementById('main-content-area');
            const subtitle = document.getElementById('dashboard-subtitle');

            if (selected && selected !== 'ALL' && selected !== 'SELECT_TEAM' && selected !== 'NONE') {
                AppState.setActiveTeamId(selected);
                if (navTabs) navTabs.classList.remove('hidden');
                if (mainArea) mainArea.classList.remove('hidden');
                if (subtitle) subtitle.innerText = `Gruppo Selezionato: ${selected}`;
                if (onTeamSelected) onTeamSelected(selected);
            } else {
                AppState.setActiveTeamId(null);
                if (navTabs) navTabs.classList.add('hidden');
                if (mainArea) mainArea.classList.add('hidden');
                if (subtitle) subtitle.innerText = "Seleziona un gruppo per iniziare";
            }
        });
    }

    window.toggleHamburgerMenu = function() {
        const tabsMenu = document.getElementById('navigation-tabs');
        const icon = document.getElementById('hamburger-icon');
        if (tabsMenu) {
            tabsMenu.classList.toggle('hidden');
            if (icon) icon.style.transform = tabsMenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    };

    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuDropdown = document.getElementById('menu-dropdown-content');
    if (menuToggleBtn && menuDropdown) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        });
        window.addEventListener('click', () => {
            if (!menuDropdown.classList.contains('hidden')) menuDropdown.classList.add('hidden');
        });
    }

    window.toggleManagementMenu = function(event) {
        if (event) event.stopPropagation();
        if (menuDropdown) menuDropdown.classList.toggle('hidden');
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const labelBtn = document.getElementById('current-active-tab-label');
            if (labelBtn) labelBtn.textContent = this.textContent.trim();
            const tabsMenu = document.getElementById('navigation-tabs');
            const wrapper = document.getElementById('hamburger-icon-wrapper');
            if (tabsMenu) {
                tabsMenu.classList.add('hidden');
                if (wrapper) wrapper.style.transform = 'rotate(0deg)';
            }
        });
    });

    const navStaff = document.getElementById('nav-btn-staff');
    if (navStaff) {
        navStaff.addEventListener('click', (e) => {
            e.stopPropagation();
            if (AppState.getCurrentUserProfile()?.role === 'admin') {
                document.getElementById('navigation-tabs')?.classList.add('hidden');
                document.getElementById('main-content-area')?.classList.remove('hidden');
                if (onTabSelect) onTabSelect('tab-staff');
            }
        });
    }

    const navParents = document.getElementById('nav-btn-parents');
    if (navParents) {
        navParents.addEventListener('click', (e) => {
            e.stopPropagation();
            if (AppState.getCurrentUserProfile()?.role === 'admin') {
                document.getElementById('navigation-tabs')?.classList.add('hidden');
                document.getElementById('main-content-area')?.classList.remove('hidden');
                if (onTabSelect) onTabSelect('tab-parents');
            }
        });
    }
}
