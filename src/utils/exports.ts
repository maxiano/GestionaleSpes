import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Player, Callup } from '../types';
import { formatDateIT } from './formatters';

export function sendToWhatsApp(text: string, title = "Spes Montesacro Report") {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
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
  let csv = `Cognome;Nome;Numero Maglia;Data Nascita;Ruolo;Scadenza Certificato;Tel. Genitore\n`;
  players.forEach((p) => {
    csv += `"${p.lastName || ''}";"${p.firstName || ''}";"${p.jersey || ''}";"${p.dob || ''}";"${p.role || ''}";"${p.medicalExp || ''}";"${p.parentPhone || ''}"\n`;
  });
  downloadCSV(`Rosa_${teamId || 'Squadra'}.csv`, csv);
}

export function exportPlayersToExcelFile(players: Player[]) {
  const data = players.map((p) => ({
    "Nome": p.firstName || '',
    "Cognome": p.lastName || '',
    "Data di Nascita (YYYY-MM-DD)": p.dob || '',
    "Ruolo": p.role || '',
    "Numero Maglia": p.jersey || '',
    "Scadenza Medica (YYYY-MM-DD)": p.medicalExp || '',
    "Telefono Genitore": p.parentPhone || '',
    "Squadra / Gruppo": p.teamId || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Giocatori");
  XLSX.writeFile(workbook, `Tutti_i_Giocatori_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
