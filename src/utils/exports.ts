import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Player, Callup, LockerAssignment, TournamentMatch } from '../types';
import { formatDateIT, normalizeDateToISO, sanitizeCSVField } from './formatters';

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
    const lastName = sanitizeCSVField(p.lastName || '');
    const firstName = sanitizeCSVField(p.firstName || '');
    const matricola = sanitizeCSVField(p.matricola || '');
    const jersey = sanitizeCSVField(p.jersey || '');
    const dob = sanitizeCSVField(p.dob || '');
    const role = sanitizeCSVField(p.role || '');
    const medicalExp = sanitizeCSVField(p.medicalExp || '');
    const parentPhone = sanitizeCSVField(p.parentPhone || '');
    const parentPhone2 = sanitizeCSVField(p.parentPhone2 || '');
    const squad = sanitizeCSVField(p.teamId || teamId || '');
    const notes = sanitizeCSVField(p.notes || '');

    csv += `${lastName};${firstName};${matricola};${jersey};${dob};${role};${medicalExp};${parentPhone};${parentPhone2};${squad};${notes}\n`;
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
  let typeLabel = "PARTITA";
  if (callup.matchType === 'Torneo') {
    typeLabel = callup.tournamentName ? `TORNEO (${callup.tournamentName})` : 'TORNEO';
  } else if (callup.matchType === 'Amichevole') {
    typeLabel = 'GARA AMICHEVOLE';
  } else if (callup.matchType === 'Campionato') {
    typeLabel = 'GARA DI CAMPIONATO';
  }

  let msg = `${siren} *CONVOCAZIONE GARA - SPES MONTESACRO* ${siren}\n\n`;
  msg += `🏆 *Tipo:* ${typeLabel}\n`;
  msg += `⚽ *Partita:* Spes Montesacro vs *${callup.opponent}*\n`;
  if (callup.coachName) {
    msg += `👔 *Mister:* ${callup.coachName}\n`;
  }
  msg += `📅 *Data:* ${formatDateIT(callup.date)}\n`;
  msg += `🕒 *Inizio Gara:* ${callup.matchTime}\n`;
  msg += `⏰ *Ritrovo al Campo:* ${callup.gatheringTime}\n`;
  msg += `📍 *Luogo:* ${callup.location}\n\n`;

  // Players list
  const players = (callup.players || []).map((p) => {
    if (typeof p === 'string' && p.includes('|')) return p.split('|')[1];
    if (typeof p === 'string') return p;
    return (p as any)?.name || 'Atleta';
  });

  if (players.length > 0) {
    msg += `👥 *CONVOCATI (${players.length}):*\n`;
    players.forEach((pName, idx) => {
      msg += `${idx + 1}. ${pName}\n`;
    });
    msg += `\n`;
  }

  // Mandatory notes
  msg += `⚠️ *DISPOSIZIONI E REGOLE OBBLIGATORIE:*\n`;
  msg += `• Venire al campo in tuta di rappresentanza e parastinchi obbligatori.\n`;
  msg += `• Non venire al campo con gli scarpini già indossati.\n`;
  msg += `• Avvisare sempre prima di eventuali assenze o ritardi.\n\n`;
  msg += `🖤🤍💚 *Forza Spes Montesacro!*`;

  return msg;
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

export interface ClubTournamentExportItem {
  id: string;
  name: string;
  teamId: string;
  categoryName?: string;
  coachName: string;
  statusText: 'In corso' | 'Passato';
  startDate: string;
  endDate: string;
  location: string;
  matches: TournamentMatch[];
}

export function exportClubTournamentsToExcel(
  items: ClubTournamentExportItem[],
  filterLabel = 'Tutti'
) {
  // Palette di tinte pastello delicate ed eleganti per evidenziare le categorie
  const CATEGORY_ROW_TONES = [
    'EBF3FC', // Blu pastello delicato (in tinta col blu zaffiro)
    'EAF8ED', // Menta chiarissimo
    'FFF8E7', // Ambra / vaniglia chiarissimo
    'F4EBFB', // Lilla pastello chiarissimo
    'FDEEE5', // Pesca chiarissimo
    'E6F8F6', // Acqua marina pastello
    'FCE8F0', // Rosa tenue pastello
    'F1F3F9', // Ghiaccio / ardesia chiarissimo
    'FEF4E8', // Albicocca chiarissimo
    'E8F5E9', // Salvia pastello
    'EDE7F6', // Violetto chiarissimo
    'E0F2F1'  // Turchese chiarissimo
  ];

  const categoryColorMap = new Map<string, string>();
  let nextColorIndex = 0;
  const getCategoryColor = (cat: string): string => {
    const key = (cat || 'generale').trim().toLowerCase();
    if (!categoryColorMap.has(key)) {
      categoryColorMap.set(key, CATEGORY_ROW_TONES[nextColorIndex % CATEGORY_ROW_TONES.length]);
      nextColorIndex++;
    }
    return categoryColorMap.get(key)!;
  };

  // Blu Zaffiro ufficiale (#0F52BA) per le intestazioni
  const SAPPHIRE_BLUE = '0F52BA';

  const headerStyle = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: SAPPHIRE_BLUE }
    },
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: 'FFFFFF' }
    },
    alignment: {
      vertical: 'center',
      horizontal: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { rgb: '093574' } },
      bottom: { style: 'medium', color: { rgb: '093574' } },
      left: { style: 'thin', color: { rgb: '093574' } },
      right: { style: 'thin', color: { rgb: '093574' } }
    }
  };

  // Foglio 1: Calendario Completo Partite (Ogni riga una partita)
  // Nota: Colonna 'Stato Torneo' rimossa su richiesta utente.
  // Colonna 'Stato Gara': solo due opzioni 'Da disputare' o 'Disputata'.
  const allMatchesData: any[] = [];
  let matchSeq = 1;

  items.forEach((t) => {
    const catName = t.teamId || t.categoryName || '-';
    if (t.matches.length === 0) {
      allMatchesData.push({
        '#': '-',
        'Nome Torneo': t.name,
        'Categoria / Squadra': catName,
        'Mister Responsabile': t.coachName || 'Staff Tecnico',
        'Data Gara': t.startDate ? formatDateIT(t.startDate) : '-',
        'Orario': '-',
        'Partita / Incontro': 'Nessuna partita programmata',
        'Campo / Impianto': t.location || '-',
        'Risultato': '-',
        'Stato Gara': 'Da disputare'
      });
    } else {
      t.matches.forEach((m) => {
        allMatchesData.push({
          '#': matchSeq++,
          'Nome Torneo': t.name,
          'Categoria / Squadra': catName,
          'Mister Responsabile': t.coachName || 'Staff Tecnico',
          'Data Gara': m.date ? formatDateIT(m.date) : '-',
          'Orario': m.time || '-',
          'Partita / Incontro': m.match,
          'Campo / Impianto': m.location || t.location || '-',
          'Risultato': m.result || '-',
          'Stato Gara': m.played ? 'Disputata' : 'Da disputare'
        });
      });
    }
  });

  const wsMatches = XLSX.utils.json_to_sheet(allMatchesData);
  const matchCols = [
    { wch: 6 },  // #
    { wch: 28 }, // Nome Torneo
    { wch: 24 }, // Categoria / Squadra
    { wch: 24 }, // Mister Responsabile
    { wch: 14 }, // Data Gara
    { wch: 10 }, // Orario
    { wch: 34 }, // Partita / Incontro
    { wch: 26 }, // Campo / Impianto
    { wch: 16 }, // Risultato
    { wch: 18 }  // Stato Gara (Da disputare o Disputata)
  ];
  wsMatches['!cols'] = matchCols;

  // Stile intestazioni Foglio 1: Bold, Bianco su Blu Zaffiro
  for (let c = 0; c < matchCols.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (wsMatches[cellRef]) {
      wsMatches[cellRef].s = headerStyle;
    }
  }

  // Stile righe dati Foglio 1: Evidenziazione a colore distinto per ciascuna categoria
  allMatchesData.forEach((row, rowIdx) => {
    const r = rowIdx + 1;
    const cat = row['Categoria / Squadra'] || '';
    const rowColor = getCategoryColor(cat);

    for (let c = 0; c < matchCols.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (wsMatches[cellRef]) {
        const isCenter = c === 0 || c === 4 || c === 5 || c === 8 || c === 9;
        const isBold = c === 0 || c === 6 || c === 8;

        wsMatches[cellRef].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: rowColor }
          },
          font: {
            name: 'Calibri',
            sz: 10,
            color: { rgb: '0F172A' },
            bold: isBold
          },
          alignment: {
            vertical: 'center',
            horizontal: isCenter ? 'center' : 'left',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } }
          }
        };
      }
    }
  });

  wsMatches['!rows'] = [
    { hpt: 26 },
    ...allMatchesData.map(() => ({ hpt: 22 }))
  ];

  // Foglio 2: Riepilogo Tornei
  const tournamentsData = items.map((t) => {
    const totalMatches = t.matches.length;
    const playedMatches = t.matches.filter((m) => m.played).length;
    const pendingMatches = totalMatches - playedMatches;
    const matchesSummary = t.matches
      .map((m) => {
        const d = m.date ? formatDateIT(m.date) : '';
        const time = m.time ? `ore ${m.time}` : '';
        const res = m.result ? `[${m.result}]` : m.played ? '[Disputata]' : '[Da disputare]';
        return `${d} ${time} ${m.match} ${res}`.trim();
      })
      .join(' | ');

    return {
      'Nome Torneo': t.name,
      'Categoria / Squadra': t.teamId || t.categoryName || 'Tutte',
      'Mister Responsabile': t.coachName || 'Staff Tecnico',
      'Data Inizio': t.startDate ? formatDateIT(t.startDate) : '-',
      'Data Fine': t.endDate ? formatDateIT(t.endDate) : '-',
      'Sede / Impianto': t.location || '-',
      'Totale Gare': totalMatches,
      'Gare Disputate': playedMatches,
      'Gare Da Giocare': pendingMatches,
      'Calendario Gare Sintesi': matchesSummary || 'Nessuna gara registrata'
    };
  });

  const wsTournaments = XLSX.utils.json_to_sheet(tournamentsData);
  const tourCols = [
    { wch: 28 }, // Nome Torneo
    { wch: 26 }, // Categoria / Squadra
    { wch: 24 }, // Mister Responsabile
    { wch: 14 }, // Data Inizio
    { wch: 14 }, // Data Fine
    { wch: 26 }, // Sede
    { wch: 12 }, // Totale Gare
    { wch: 14 }, // Gare Disputate
    { wch: 14 }, // Gare Da Giocare
    { wch: 45 }  // Calendario Gare Sintesi
  ];
  wsTournaments['!cols'] = tourCols;

  // Stile intestazioni Foglio 2: Bold, Bianco su Blu Zaffiro
  for (let c = 0; c < tourCols.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (wsTournaments[cellRef]) {
      wsTournaments[cellRef].s = headerStyle;
    }
  }

  // Stile righe Foglio 2: Evidenziazione a colore distinto per ciascuna categoria
  tournamentsData.forEach((row, rowIdx) => {
    const r = rowIdx + 1;
    const cat = row['Categoria / Squadra'] || '';
    const rowColor = getCategoryColor(cat);

    for (let c = 0; c < tourCols.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (wsTournaments[cellRef]) {
        const isCenter = c === 3 || c === 4 || c === 6 || c === 7 || c === 8;
        wsTournaments[cellRef].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: rowColor }
          },
          font: {
            name: 'Calibri',
            sz: 10,
            color: { rgb: '0F172A' },
            bold: c === 0
          },
          alignment: {
            vertical: 'center',
            horizontal: isCenter ? 'center' : 'left',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } }
          }
        };
      }
    }
  });

  wsTournaments['!rows'] = [
    { hpt: 26 },
    ...tournamentsData.map(() => ({ hpt: 22 }))
  ];

  const workbook = XLSX.utils.book_new();
  // Il Foglio 1 è il Calendario Partite (ogni riga una partita)
  XLSX.utils.book_append_sheet(workbook, wsMatches, 'Partite Tornei (Calendario)');
  XLSX.utils.book_append_sheet(workbook, wsTournaments, 'Riepilogo Tornei');

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanFilter = filterLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Spes_Montesacro_Partite_Tornei_${cleanFilter}_${dateStr}.xlsx`);
}

