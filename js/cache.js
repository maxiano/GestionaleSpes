/**
 * @file cache.js
 * @brief Gestionale Tecnico - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 * 
 * Questo software è riservato esclusivamente all'uso interno della società 
 * sportiva Spes Montesacro. Ne è vietata la copia, la riproduzione o la 
 * distribuzione non autorizzata.
 */

export const AppCache = {
    players: {},
    attendances: {},

    // --- GESTIONE GIOCATORI (con RAM + sessionStorage) ---
    setPlayers(teamId, data) {
        if (!teamId) return;
        this.players[teamId] = data;
        try {
            sessionStorage.setItem(`cache_players_${teamId}`, JSON.stringify(data));
        } catch (e) {
            console.warn("Impossibile salvare i giocatori in sessionStorage:", e);
        }
    },

    getPlayers(teamId) {
        if (!teamId) return null;
        if (this.players[teamId]) return this.players[teamId];
        
        try {
            const stored = sessionStorage.getItem(`cache_players_${teamId}`);
            if (stored) {
                this.players[teamId] = JSON.parse(stored);
                return this.players[teamId];
            }
        } catch (e) {
            console.warn("Errore nel parsing della cache giocatori da sessionStorage:", e);
            sessionStorage.removeItem(`cache_players_${teamId}`); // Pulisce il dato corrotto
        }
        
        return null;
    },

    clearPlayers(teamId) {
        if (!teamId) return;
        delete this.players[teamId];
        try {
            sessionStorage.removeItem(`cache_players_${teamId}`);
        } catch (e) {
            console.warn("Errore rimozione cache giocatori:", e);
        }
    },

    // --- GESTIONE PRESENZE (estesa con sessionStorage per persistenza al refresh) ---
    setAttendances(teamId, year, month, data) {
        if (!teamId) return;
        const key = `${teamId}_${year}_${month}`;
        this.attendances[key] = data;
        try {
            sessionStorage.setItem(`cache_att_${key}`, JSON.stringify(data));
        } catch (e) {
            console.warn("Impossibile salvare le presenze in sessionStorage:", e);
        }
    },

    getAttendances(teamId, year, month) {
        if (!teamId) return null;
        const key = `${teamId}_${year}_${month}`;
        
        if (this.attendances[key]) return this.attendances[key];

        try {
            const stored = sessionStorage.getItem(`cache_att_${key}`);
            if (stored) {
                this.attendances[key] = JSON.parse(stored);
                return this.attendances[key];
            }
        } catch (e) {
            console.warn("Errore nel parsing della cache presenze:", e);
            sessionStorage.removeItem(`cache_att_${key}`);
        }

        return null;
    },

    clearAttendances(teamId) {
        if (!teamId) return;
        
        // Pulisce RAM
        Object.keys(this.attendances).forEach(k => {
            if (k.startsWith(`${teamId}_`)) delete this.attendances[k];
        });

        // Pulisce sessionStorage correlato
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const storageKey = sessionStorage.key(i);
                if (storageKey && storageKey.startsWith(`cache_att_${teamId}_`)) {
                    keysToRemove.push(storageKey);
                }
            }
            keysToRemove.forEach(k => sessionStorage.removeItem(k));
        } catch (e) {
            console.warn("Errore pulizia presenze da sessionStorage:", e);
        }
    },

    // --- PULIZIA TOTALE (es. Logout / Cambio utente) ---
    clearAll() {
        this.players = {};
        this.attendances = {};
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const storageKey = sessionStorage.key(i);
                if (storageKey && storageKey.startsWith('cache_')) {
                    keysToRemove.push(storageKey);
                }
            }
            keysToRemove.forEach(k => sessionStorage.removeItem(k));
            console.log("[Cache] Svuotata completamente (RAM e SessionStorage).");
        } catch (e) {
            console.warn("Errore durante la pulizia totale della cache:", e);
        }
    }
};
