// main.js
import { store } from './core/AppStore.js';
import { DatabaseService } from './services/DatabaseService.js';
import { TournamentManager } from './components/TournamentManager.js';
import { RosterManager } from './components/RosterManager.js';
import { AttendanceManager } from './components/AttendanceManager.js';
import { AuthService } from './services/AuthService.js';


window.app = {};

document.addEventListener('DOMContentLoaded', () => {
    window.app = { store };

    // Gestione dello stato di autenticazione
    AuthService.initAuthStateListener(
        (userData) => {
            // Utente loggato: aggiorna lo store
            store.setUser(userData);
            console.log("Utente autenticato:", store.currentUser);
            
            // Mostra la dashboard principale e nascondi la schermata di login
            document.getElementById('login-screen')?.classList.add('hidden');
            document.getElementById('app-container')?.classList.remove('hidden');
        },
        () => {
            // Utente non loggato: mostra la schermata di login
            console.log("Nessun utente attivo, richiesta login.");
            document.getElementById('login-screen')?.classList.remove('hidden');
            document.getElementById('app-container')?.classList.add('hidden');
        }
    );

    // Gestione del form di login (se presente nell'HTML)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                await AuthService.login(email, password);
            } catch (err) {
                alert("Credenziali non valide o errore di accesso: " + err.message);
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
