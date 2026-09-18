import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Player, Callup, LockerAssignment } from '../types';
import { formatDateIT, normalizeDateToISO } from './formatters';

export function sendToWhatsApp(text: string, title = "Spes Montesacro Report") {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
}

export function sendWhatsAppToPhoneOrShare(text: string, phone?: string, title = "Spes Montesacro") {
  let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  if (cleanPhone && cleanPhone.length === 10 && !cleanPhone.startsWith('39')) {
    cleanPhone = `39${cleanPhone}`;
  }

  const encoded = encodeURIComponent(text);
  if (cleanPhone) {
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  } else if (navigator.share) {
    navigator.share({ title, text }).catch(() => {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

export function formatNewTournamentCoachWhatsApp(
  tournament: {
    name: string;
    startDate: string;
    endDate: string;
    location?: string;
    hasCalendarPdf?: boolean;
    hasRegulationPdf?: boolean;
    hasMatchListPdf?: boolean;
    hasPlayerListPdf?: boolean;
    participatingPlayersCount?: number;
  },
  teamId: string,
  coachName?: string
): string {
  const greeting = coachName ? `Ciao Allenatore ${coachName}!` : `Ciao Allenatore!`;
  let msg = `🏆 *NUOVO TORNEO PROGRAMMATO - SPES MONTESACRO*\n\n`;
  msg += `${greeting}\nÈ stato inserito un nuovo torneo per la tua categoria *${teamId}*:\n\n`;
  msg += `⚽ *Torneo:* ${tournament.name}\n`;
  if (tournament.startDate || tournament.endDate) {
    msg += `📅 *Date:* dal ${formatDateIT(tournament.startDate)} al ${formatDateIT(tournament.endDate)}\n`;
  }
  if (tournament.location) {
    msg += `📍 *Campo / Sede:* ${tournament.location}\n`;
  }
  if (tournament.hasCalendarPdf) {
    msg += `📎 *Calendario PDF:* Disponibile e scaricabile dal gestionale\n`;
  }
  if (tournament.hasRegulationPdf) {
    msg += `📋 *Regolamento Torneo PDF:* Disponibile e scaricabile dal gestionale\n`;
  }
  if (tournament.hasMatchListPdf) {
    msg += `📝 *Lista Gara / Distinta:* Allegata nel gestionale\n`;
  }
  if (tournament.hasPlayerListPdf) {
    msg += `👥 *Lista Calciatori Partecipanti:* Allegata nel gestionale\n`;
  }
  if (tournament.participatingPlayersCount && tournament.participatingPlayersCount > 0) {
    msg += `⭐ *Calciatori Convocati:* ${tournament.participatingPlayersCount} ragazzi inseriti\n`;
  }
  msg += `👥 *Categoria:* ${teamId}\n\n`;
  msg += `👉 Accedi al portale Spes Montesacro per visualizzare i dettagli, consultare i documenti allegati e gestire il torneo!`;
  return msg;
}

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportRosterCSV(teamId: string, players: Player[]) {
  let csv = `Cognome;Nome;Matricola;Numero Maglia;Data Nascita;Ruolo;Scadenza Certificato;Tel. Padre;Tel. Madre;Squadra;Note\n`;
  players.forEach((p) => {
    const lastName = (p.lastName || '').replace(/"/g, '""');
    const firstName = (p.firstName || '').replace(/"/g, '""');
    const matricola = (p.matricola || '').replace(/"/g, '""');
    const jersey = (p.jersey || '').replace(/"/g, '""');
    const dob = (p.dob || '').replace(/"/g, '""');
    const role = (p.role || '').replace(/"/g, '""');
    const medicalExp = (p.medicalExp || '').replace(/"/g, '""');
    const parentPhone = (p.parentPhone || '').replace(/"/g, '""');
    const parentPhone2 = (p.parentPhone2 || '').replace(/"/g, '""');
    const squad = (p.teamId || teamId || '').replace(/"/g, '""');
    const notes = (p.notes || '').replace(/"/g, '""');

    csv += `"${lastName}";"${firstName}";"${matricola}";"${jersey}";"${dob}";"${role}";"${medicalExp}";"${parentPhone}";"${parentPhone2}";"${squad}";"${notes}"\n`;
  });
  downloadCSV(`Rosa_${teamId || 'Squadra'}.csv`, csv);
}

export function exportPlayersToExcelFile(players: Player[], fileNamePrefix = 'Tutti_i_Giocatori') {
  const data = players.map((p) => ({
    "Cognome": p.lastName || '',
    "Nome": p.firstName || '',
    "Matricola": p.matricola || '',
    "Numero Maglia": p.jersey || '',
    "Data di Nascita (YYYY-MM-DD)": p.dob || '',
    "Ruolo": p.role || '',
    "Scadenza Medica (YYYY-MM-DD)": p.medicalExp || '',
    "Telefono Padre / Genitore 1": p.parentPhone || '',
    "Telefono Madre / Genitore 2": p.parentPhone2 || '',
    "Squadra / Gruppo": p.teamId || '',
    "Note": p.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Imposta larghezze leggibili per tutte le colonne
  worksheet['!cols'] = [
    { wch: 18 }, // Cognome
    { wch: 18 }, // Nome
    { wch: 16 }, // Matricola
    { wch: 14 }, // Numero Maglia
    { wch: 22 }, // Data di Nascita
    { wch: 16 }, // Ruolo
    { wch: 22 }, // Scadenza Medica
    { wch: 22 }, // Tel Padre
    { wch: 22 }, // Tel Madre
    { wch: 22 }, // Squadra
    { wch: 30 }  // Note
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Giocatori");
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
}

/**
 * Parser universale per una riga di giocatore da CSV o Excel.
 * Riconosce tutte le varianti di intestazione e converte le date nel formato standard YYYY-MM-DD.
 */
export function parsePlayerRow(row: Record<string, any>, fallbackTeamId: string): Omit<Player, 'id'> | null {
  if (!row || typeof row !== 'object') return null;

  // Cerca il cognome in varie denominazioni
  let lastName = String(
    row['Cognome'] ??
    row['cognome'] ??
    row['Cognome Giocatore'] ??
    row['Last Name'] ??
    row['LastName'] ??
    row['Surname'] ??
    row['Family Name'] ??
    ''
  ).trim();

  // Cerca il nome in varie denominazioni
  let firstName = String(
    row['Nome'] ??
    row['nome'] ??
    row['Nome Giocatore'] ??
    row['First Name'] ??
    row['FirstName'] ??
    row['Given Name'] ??
    ''
  ).trim();

  // Se c'è solo una colonna 'Nominativo' o 'Nome Completo' o 'Giocatore'
  if (!lastName && !firstName) {
    const full = String(
      row['Nominativo'] ??
      row['Nome Completo'] ??
      row['Giocatore'] ??
      row['Atleta'] ??
      row['Full Name'] ??
      row['name'] ??
      ''
    ).trim();

    if (full) {
      const parts = full.split(/\s+/);
      if (parts.length === 1) {
        lastName = parts[0];
      } else {
        lastName = parts[0];
        firstName = parts.slice(1).join(' ');
      }
    }
  }

  // Se non c'è né nome né cognome, riga non valida
  if (!lastName && !firstName) return null;

  // Matricola / Cartellino FIGC
  const matricola = String(
    row['Matricola'] ??
    row['matricola'] ??
    row['N° Matricola'] ??
    row['Numero Matricola'] ??
    row['N. Matricola'] ??
    row['Num Matricola'] ??
    row['Cartellino'] ??
    row['Tessera'] ??
    row['Tessera FIGC'] ??
    row['FIGC'] ??
    row['ID FIGC'] ??
    row['Registration No'] ??
    row['Registration Number'] ??
    ''
  ).trim();

  // Numero di maglia
  const rawJersey = row['Numero Maglia'] ??
    row['Maglia'] ??
    row['N° Maglia'] ??
    row['N. Maglia'] ??
    row['Num Maglia'] ??
    row['jersey'] ??
    row['Jersey'] ??
    row['Numero'] ??
    row['#'] ??
    '';
  const jersey = rawJersey !== undefined && rawJersey !== null ? String(rawJersey).trim().replace(/[^0-9]/g, '') : '';

  // Data di Nascita
  const rawDob = row['Data di Nascita (YYYY-MM-DD)'] ??
    row['Data Nascita'] ??
    row['Data di Nascita'] ??
    row['Nascita'] ??
    row['dob'] ??
    row['DOB'] ??
    row['Birth Date'] ??
    row['Data Nasc.'] ??
    null;
  const dob = normalizeDateToISO(rawDob);

  // Ruolo
  const role = String(
    row['Ruolo'] ??
    row['ruolo'] ??
    row['Role'] ??
    row['role'] ??
    row['Posizione'] ??
    row['Position'] ??
    'Non specificato'
  ).trim();

  // Scadenza Certificato Medico
  const rawMedical = row['Scadenza Medica (YYYY-MM-DD)'] ??
    row['Scadenza Certificato'] ??
    row['Scadenza Medica'] ??
    row['Visita Medica'] ??
    row['Certificato Medico'] ??
    row['Scadenza Visita'] ??
    row['medicalExp'] ??
    row['Medical Exp'] ??
    row['Certificato'] ??
    null;
  const medicalExp = normalizeDateToISO(rawMedical);

  // Telefono Padre / Genitore 1
  const parentPhone = String(
    row['Telefono Padre / Genitore 1'] ??
    row['Telefono Padre'] ??
    row['Tel. Padre'] ??
    row['Tel Padre'] ??
    row['Telefono Genitore 1'] ??
    row['Tel. Genitore 1'] ??
    row['Tel. Genitore'] ??
    row['Telefono Genitore'] ??
    row['parentPhone'] ??
    row['Phone 1'] ??
    ''
  ).trim();

  // Telefono Madre / Genitore 2
  const parentPhone2 = String(
    row['Telefono Madre / Genitore 2'] ??
    row['Telefono Madre'] ??
    row['Tel. Madre'] ??
    row['Tel Madre'] ??
    row['Telefono Genitore 2'] ??
    row['Tel. Genitore 2'] ??
    row['parentPhone2'] ??
    row['Phone 2'] ??
    ''
  ).trim();

  // Squadra / Categoria
  const teamId = String(
    row['Squadra / Gruppo'] ??
    row['Squadra / Categoria'] ??
    row['Squadra'] ??
    row['Categoria'] ??
    row['Gruppo'] ??
    row['teamId'] ??
    row['Team'] ??
    fallbackTeamId
  ).trim() || fallbackTeamId;

  // Note
  const notes = String(
    row['Note'] ??
    row['note'] ??
    row['Note / Osservazioni'] ??
    row['Osservazioni'] ??
    row['Notes'] ??
    row['notes'] ??
    ''
  ).trim();

  const displayName = `${lastName} ${firstName}`.trim();

  return {
    firstName,
    lastName,
    name: displayName,
    matricola,
    jersey,
    dob,
    role: role || 'Non specificato',
    medicalExp,
    parentPhone,
    parentPhone2,
    teamId,
    notes: notes || undefined
  };
}

export function exportParentsToExcelFile(parents: Array<{ name?: string; email?: string; phone?: string; childIds?: string[] }>) {
  const data = parents.map((p) => ({
    "Nome": p.name || '',
    "Email": p.email || '',
    "Telefono": p.phone || '',
    "ID Figli Associati": Array.isArray(p.childIds) ? p.childIds.join(', ') : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tutti i Genitori");
  XLSX.writeFile(workbook, `Tutti_i_Genitori_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseCSVFile<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
}

export function readExcelFile<T = Record<string, unknown>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function formatCallupWhatsAppInvite(callup: Callup): string {
  return `Ciao! È online la convocazione per la partita contro ${callup.opponent} del ${formatDateIT(callup.date)}. Entrate nel portale Spes Montesacro per gestire la presenza!`;
}

export function formatCallupWhatsAppFinal(callup: Callup): string {
  const siren = "\uD83D\uDEA8";
  return `${siren} CONVOCAZIONE DEFINITIVA - Spes Montesacro ${siren}\n\nPartita: *${callup.opponent}*\nRitrovo: *${callup.gatheringTime}*\n\nLa lista è stata finalizzata. Controllate il portale per i dettagli definitivi!`;
}

export function exportLockerRoomsToExcelFile(
  assignments: LockerAssignment[],
  weekTitle = "Settimana Spes Montesacro"
) {
  const data = assignments.map((a) => ({
    "Giorno": a.day,
    "Orario": a.time,
    "Categoria": a.category,
    "Spogliatoio / Spogliatoi": a.lockerRoom,
    "Campo di Gioco": a.field,
    "Note / Disposizioni": a.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for readable Excel viewing
  worksheet['!cols'] = [
    { wch: 18 }, // Giorno
    { wch: 10 }, // Orario
    { wch: 28 }, // Categoria
    { wch: 26 }, // Spogliatoio
    { wch: 20 }, // Campo
    { wch: 38 }  // Note
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Spogliatoi e Campi");

  const sanitizedTitle = weekTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Spes_Spogliatoi_Campi_${sanitizedTitle || dateStr}.xlsx`);
}

export function formatLockerRoomsWhatsApp(
  assignments: LockerAssignment[],
  weekTitle = "Piano Settimanale Spogliatoi",
  generalNotes = ""
): string {
  let msg = `📋 *SPES MONTESACRO - PIANO SPOGLIATOI & CAMPI*\n_${weekTitle}_\n\n`;

  // Group by day
  const byDay: Record<string, LockerAssignment[]> = {};
  assignments.forEach((a) => {
    if (!byDay[a.day]) byDay[a.day] = [];
    byDay[a.day].push(a);
  });

  Object.entries(byDay).forEach(([day, list]) => {
    msg += `📅 *${day.toUpperCase()}*\n`;
    list.forEach((item) => {
      msg += `• Ore ${item.time} | *${item.category}*\n`;
      msg += `  🚪 Spogliatoio: *${item.lockerRoom}* | ⚽ Campo: *${item.field}*\n`;
      if (item.notes) {
        msg += `  ⚠️ _Nota: ${item.notes}_\n`;
      }
    });
    msg += `\n`;
  });

  if (generalNotes) {
    msg += `📌 *AVVISO IMPORTANTE:*\n${generalNotes}\n`;
  }

  return msg;
}
