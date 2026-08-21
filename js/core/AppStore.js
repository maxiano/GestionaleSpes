// core/AppStore.js
import { normalizeUserProfile } from './config.js';

class AppStore {
    constructor() {
        this.activeTeamId = null;
        this.currentUser = null;
        this.currentUserRole = 'admin'; // 'admin' o 'coach'
        this.currentCoachTeamId = null;
        this.players = [];
        this.tournaments = [];
        this.callups = [];
    }

    setUser(rawUserData) {
        this.currentUser = normalizeUserProfile(rawUserData);
        this.currentUserRole = this.currentUser.role || 'coach';
        
        // Se l'utente ha delle squadre associate e non c'è una squadra attiva, imposta la prima disponibile
        if (this.currentUser.teams && this.currentUser.teams.length > 0 && !this.activeTeamId) {
            this.setTeam(this.currentUser.teams[0]);
        }
    }

    setTeam(teamId) {
        this.activeTeamId = teamId;
        window.dispatchEvent(new CustomEvent('teamChanged', { detail: { teamId } }));
    }

    setPlayers(players) {
        this.players = players;
        window.dispatchEvent(new CustomEvent('playersUpdated', { detail: { players } }));
    }

    setTournaments(tournaments) {
        this.tournaments = tournaments;
        window.dispatchEvent(new CustomEvent('tournamentsUpdated', { detail: { tournaments } }));
    }

    setCallups(callups) {
        this.callups = callups;
        window.dispatchEvent(new CustomEvent('callupsUpdated', { detail: { callups } }));
    }
}

export const store = new AppStore();
