// core/AppStore.js
class AppStore {
    constructor() {
        this.activeTeamId = null;
        this.currentUserRole = 'admin'; // 'admin' o 'coach'
        this.currentCoachTeamId = null;
        this.players = [];
        this.tournaments = [];
        this.callups = [];
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
