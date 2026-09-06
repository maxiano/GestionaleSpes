/**
 * @file cache.js
 * @brief Gestione della memoria cache locale per ottimizzare le letture Firestore
 * @project Gestionale Tecnico - Spes Montesacro
 */

class MemoryCache {
    constructor() {
        this.playersByTeam = new Map();
        this.attendancesByTeamAndMonth = new Map();
    }

    getPlayers(teamId) { return this.playersByTeam.get(teamId) || null; }
    setPlayers(teamId, players) { this.playersByTeam.set(teamId, players); }
    clearPlayers(teamId) {
        if (teamId) this.playersByTeam.delete(teamId);
        else this.playersByTeam.clear();
    }

    _getAttendanceKey(teamId, year, month) {
        return `${teamId}_${year}_${month}`;
    }

    getAttendances(teamId, year, month) {
        return this.attendancesByTeamAndMonth.get(this._getAttendanceKey(teamId, year, month)) || null;
    }

    setAttendances(teamId, year, month, sessions) {
        this.attendancesByTeamAndMonth.set(this._getAttendanceKey(teamId, year, month), sessions);
    }

    clearAttendances(teamId) {
        if (teamId) {
            for (const key of this.attendancesByTeamAndMonth.keys()) {
                if (key.startsWith(`${teamId}_`)) this.attendancesByTeamAndMonth.delete(key);
            }
        } else {
            this.attendancesByTeamAndMonth.clear();
        }
    }

    clearAll() {
        this.playersByTeam.clear();
        this.attendancesByTeamAndMonth.clear();
    }
}

export const AppCache = new MemoryCache();