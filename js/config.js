/**
 * @file config.js
 * @brief Configurazioni globali, costanti e normalizzazione dati
 * @project Gestionale Tecnico - Spes Montesacro
 */

export const daysOfWeekIT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export const monthNamesIT = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export function normalizeUserProfile(rawData = {}) {
    return {
        uid: rawData.uid || '',
        name: rawData.name || rawData.email || 'Utente',
        email: rawData.email || '',
        role: rawData.role ? rawData.role.toLowerCase() : 'coach',
        teamId: rawData.teamId || (rawData.teams && rawData.teams[0]) || '',
        teams: Array.isArray(rawData.teams) 
            ? rawData.teams 
            : (rawData.teamId ? [rawData.teamId] : []),
        phone: rawData.phone || '',
        childIds: Array.isArray(rawData.childIds) ? rawData.childIds : []
    };
}