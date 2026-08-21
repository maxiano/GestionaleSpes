// core/config.js

export const daysOfWeekIT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export const monthNamesIT = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", 
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export function normalizeUserProfile(rawData) {
    if (!rawData) return { role: 'coach', teams: [], name: 'Utente' };

    let extractedTeams = [];
    const cleanArray = (arr) => arr.filter(t => t && t !== 'undefined' && t !== 'null' && t !== 'ALL' && typeof t === 'string' && t.trim() !== '');

    if (Array.isArray(rawData.teams)) {
        extractedTeams = cleanArray(rawData.teams);
    } else if (typeof rawData.teams === 'string' && rawData.teams.trim() !== '') {
        extractedTeams = cleanArray(rawData.teams.split(',').map(t => t.trim()));
    }

    if (extractedTeams.length === 0) {
        const legacyTeam = rawData.teamId || rawData.team;
        if (Array.isArray(legacyTeam)) {
            extractedTeams = cleanArray(legacyTeam);
        } else if (typeof legacyTeam === 'string' && legacyTeam.trim() !== '') {
            extractedTeams = cleanArray(legacyTeam.split(',').map(t => t.trim()));
        }
    }

    return {
        ...rawData,
        name: rawData.name || rawData.email || 'Utente',
        role: rawData.role || 'coach',
        teams: extractedTeams,
        teamId: extractedTeams.length > 0 ? extractedTeams[0] : ''
    };
}
