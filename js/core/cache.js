// core/cache.js

export const AppCache = {
    players: {},
    attendances: {},
    setPlayers(teamId, data) {
        if (!teamId) return;
        this.players[teamId] = data;
        sessionStorage.setItem(`cache_players_${teamId}`, JSON.stringify(data));
    },
    getPlayers(teamId) {
        if (!teamId) return null;
        if (this.players[teamId]) return this.players[teamId];
        const stored = sessionStorage.getItem(`cache_players_${teamId}`);
        if (stored) {
            this.players[teamId] = JSON.parse(stored);
            return this.players[teamId];
        }
        return null;
    },
    clearPlayers(teamId) {
        if (!teamId) return;
        delete this.players[teamId];
        sessionStorage.removeItem(`cache_players_${teamId}`);
    },
    setAttendances(teamId, year, month, data) {
        if (!teamId) return;
        const key = `${teamId}_${year}_${month}`;
        this.attendances[key] = data;
    },
    getAttendances(teamId, year, month) {
        if (!teamId) return null;
        const key = `${teamId}_${year}_${month}`;
        return this.attendances[key] || null;
    },
    clearAttendances(teamId) {
        if (!teamId) return;
        Object.keys(this.attendances).forEach(k => {
            if (k.startsWith(`${teamId}_`)) delete this.attendances[k];
        });
    }
};
