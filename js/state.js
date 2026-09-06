/**
 * @file state.js
 * @brief Gestione dello stato applicativo centralizzato e condiviso tra moduli
 * @project Gestionale Tecnico - Spes Montesacro
 */

class AppStateManager {
    constructor() {
        this.state = {
            currentUserProfile: null,
            activeTeamId: null,
            activeTeamPlayers: [],
            loadedCallupsList: [],
            tournamentMatches: [],
            currentSessionDocId: null,
            editingPlayerId: null,
            editingCallupId: null
        };
        this.listeners = new Set();
    }

    // Getters
    getCurrentUserProfile() { return this.state.currentUserProfile; }
    getActiveTeamId() { return this.state.activeTeamId; }
    getActiveTeamPlayers() { return this.state.activeTeamPlayers; }
    getLoadedCallupsList() { return this.state.loadedCallupsList; }
    getTournamentMatches() { return this.state.tournamentMatches; }
    getCurrentSessionDocId() { return this.state.currentSessionDocId; }
    getEditingPlayerId() { return this.state.editingPlayerId; }
    getEditingCallupId() { return this.state.editingCallupId; }

    // Setters
    setCurrentUserProfile(profile) {
        this.state.currentUserProfile = profile;
        this._notify('currentUserProfile', profile);
    }

    setActiveTeamId(teamId) {
        this.state.activeTeamId = teamId;
        this._notify('activeTeamId', teamId);
    }

    setActiveTeamPlayers(players) {
        this.state.activeTeamPlayers = players || [];
        this._notify('activeTeamPlayers', this.state.activeTeamPlayers);
    }

    setLoadedCallupsList(callups) {
        this.state.loadedCallupsList = callups || [];
        this._notify('loadedCallupsList', this.state.loadedCallupsList);
    }

    setTournamentMatches(matches) {
        this.state.tournamentMatches = matches || [];
        this._notify('tournamentMatches', this.state.tournamentMatches);
    }

    setCurrentSessionDocId(docId) { this.state.currentSessionDocId = docId; }
    setEditingPlayerId(id) { this.state.editingPlayerId = id; }
    setEditingCallupId(id) { this.state.editingCallupId = id; }

    reset() {
        this.state.currentUserProfile = null;
        this.state.activeTeamId = null;
        this.state.activeTeamPlayers = [];
        this.state.loadedCallupsList = [];
        this.state.tournamentMatches = [];
        this.state.currentSessionDocId = null;
        this.state.editingPlayerId = null;
        this.state.editingCallupId = null;
        this._notify('reset', null);
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notify(prop, value) {
        for (const cb of this.listeners) {
            try { cb(prop, value, this.state); } catch (e) { console.error(e); }
        }
    }
}

export const AppState = new AppStateManager();