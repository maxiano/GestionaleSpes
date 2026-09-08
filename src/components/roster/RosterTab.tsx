import React, { useRef } from 'react';
import { Player } from '../../types';
import { formatDateIT } from '../../utils/formatters';
import { exportRosterCSV, sendToWhatsApp, parseCSVFile } from '../../utils/exports';
import { deletePlayer, batchImportPlayers } from '../../services/playersService';
import {
  Users,
  FileDown,
  FileUp,
  Share2,
  Printer,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface RosterTabProps {
  players: Player[];
  activeTeamId: string;
  isAdmin: boolean;
  onEditPlayer: (player: Player) => void;
  onRefresh: () => void;
}

export const RosterTab: React.FC<RosterTabProps> = ({
  players,
  activeTeamId,
  isAdmin,
  onEditPlayer,
  onRefresh
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const handleDelete = async (playerId: string, playerName?: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${playerName || 'questo giocatore'} dalla rosa?`)) {
      return;
    }
    try {
      await deletePlayer(playerId);
      onRefresh();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleShareWhatsApp = () => {
    if (players.length === 0) return alert('Nessun giocatore in rosa!');
    let text = `👥 *ROSA UFFICIALE GIOCATORI*\n🏆 *Spes Montesacro - ${activeTeamId}*\n📊 *Totale Tesserati:* ${players.length}\n\n`;
    players.forEach((p, i) => {
      const displayName = p.lastName ? `${p.lastName} ${p.firstName}` : p.name;
      text += `${i + 1}. ${displayName}${p.jersey ? ` (#${p.jersey})` : ''}\n`;
    });
    sendToWhatsApp(text, `Rosa ${activeTeamId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseCSVFile<any>(file);
      if (!rows || rows.length === 0) {
        alert('File CSV vuoto o non valido.');
        return;
      }

      if (!confirm(`Trovati ${rows.length} record. Importare nella squadra "${activeTeamId}"?`)) {
        e.target.value = '';
        return;
      }

      const playerPayloads = rows
        .map((r) => {
          const lastName = (r['Cognome'] || r['cognome'] || '').trim();
          const firstName = (r['Nome'] || r['nome'] || '').trim();
          if (!lastName && !firstName) return null;
          return {
            lastName,
            firstName,
            name: `${lastName} ${firstName}`.trim(),
            jersey: (r['Numero Maglia'] || r['Maglia'] || r['jersey'] || '').toString().trim(),
            dob: (r['Data Nascita'] || r['dob'] || '').trim(),
            role: (r['Ruolo'] || r['role'] || '').trim(),
            medicalExp: (r['Scadenza Certificato'] || r['medicalExp'] || '').trim(),
            parentPhone: (r['Tel. Padre'] || r['Tel. Genitore 1'] || r['Tel. Genitore'] || r['parentPhone'] || '').toString().trim(),
            parentPhone2: (r['Tel. Madre'] || r['Tel. Genitore 2'] || r['parentPhone2'] || '').toString().trim(),
            teamId: activeTeamId
          };
        })
        .filter(Boolean) as any[];

      const count = await batchImportPlayers(playerPayloads);
      alert(`✅ Importati con successo ${count} giocatori!`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Errore lettura CSV: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div id="tab-roster" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5 print:hidden">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 text-sm">
              <Users className="w-4 h-4 text-emerald-600" />
            </span>
            <span>Rosa Giocatori</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              {activeTeamId || 'Seleziona Gruppo'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Anagrafica tesserati, numeri di maglia, visite mediche e recapiti
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={csvInputRef}
            onChange={handleCSVImport}
            accept=".csv"
            className="hidden"
          />

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => csvInputRef.current?.click()}
              className="hover:bg-white text-slate-700 hover:text-slate-900 text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
              title="Importa da file CSV"
            >
              <FileUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Import CSV</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200"></div>
            <button
              onClick={() => exportRosterCSV(activeTeamId, players)}
              className="hover:bg-white text-slate-700 hover:text-slate-900 text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
              title="Esporta in CSV"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>

          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Stampa</span>
          </button>
        </div>
      </div>

      {/* Screen Cards Grid */}
      <div id="players-list-container" className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:hidden">
        {players.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Nessun giocatore registrato in questa rosa.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Usa il pulsante "+ Aggiungi Giocatore" o "Import CSV" per inserire gli atleti.
            </p>
          </div>
        ) : (
          players.map((player) => {
            const displayName = player.lastName
              ? `${player.lastName} ${player.firstName}`
              : player.name || 'Senza nome';

            let medBadge = (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                <HelpCircle className="w-3 h-3" /> Cert. Mancante
              </span>
            );

            if (player.medicalExp) {
              if (player.medicalExp < today) {
                medBadge = (
                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-md font-bold">
                    <AlertCircle className="w-3 h-3" /> Cert. Scaduto ({formatDateIT(player.medicalExp)})
                  </span>
                );
              } else {
                medBadge = (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Cert. OK ({formatDateIT(player.medicalExp)})
                  </span>
                );
              }
            }

            return (
              <div
                key={player.id}
                className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-white transition flex justify-between items-start text-xs shadow-sm hover:shadow"
              >
                <div className="space-y-1.5 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-sm text-slate-900">
                      ⚽ {displayName}
                    </p>
                    {player.jersey && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-900 text-white rounded-md">
                        #{player.jersey}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 flex items-center gap-2">
                    <span className="font-semibold">Ruolo:</span> {player.role || 'N/D'} |{' '}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDateIT(player.dob)}
                    </span>
                  </p>

                  <div className="text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold">Padre:</span> {player.parentPhone || 'N/D'}
                    </span>
                    {player.parentPhone2 && (
                      <span className="flex items-center gap-1 border-l border-slate-300 pl-2">
                        <span className="font-semibold">Madre:</span> {player.parentPhone2}
                      </span>
                    )}
                  </div>

                  <div className="pt-1">{medBadge}</div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => onEditPlayer(player)}
                    className="text-xs text-slate-800 font-bold hover:bg-slate-200 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3 text-slate-600" />
                    <span>Modifica</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(player.id, displayName)}
                      className="text-xs text-rose-600 font-bold hover:bg-rose-50 px-2 py-1.5 rounded-xl border border-rose-200 transition"
                      title="Elimina Giocatore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Official Print Layout */}
      <div id="roster-print-table-container" className="hidden print:block">
        <div className="mb-4">
          <h2 className="text-lg font-black uppercase text-slate-900">
            Rosa Ufficiale: {activeTeamId}
          </h2>
          <p className="text-xs text-slate-600 font-semibold">
            Totale Giocatori in Organico: {players.length}
          </p>
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="border border-slate-900 p-2 text-center w-10">#</th>
              <th className="border border-slate-900 p-2 text-left">Cognome e Nome</th>
              <th className="border border-slate-900 p-2 text-center w-16">Maglia</th>
              <th className="border border-slate-900 p-2 text-center w-24">Data Nascita</th>
              <th className="border border-slate-900 p-2 text-left">Ruolo</th>
              <th className="border border-slate-900 p-2 text-center w-28">Certificato</th>
              <th className="border border-slate-900 p-2 text-left">Tel. Famiglia</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => {
              const displayName = p.lastName ? `${p.lastName} ${p.firstName}` : p.name;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-1.5 text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                    {displayName}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold">
                    {p.jersey || '-'}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">
                    {formatDateIT(p.dob)}
                  </td>
                  <td className="border border-slate-300 p-1.5">{p.role || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center">
                    {formatDateIT(p.medicalExp)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-[11px] leading-tight">
                    {p.parentPhone && <div><span className="font-semibold text-slate-500">P:</span> {p.parentPhone}</div>}
                    {p.parentPhone2 && <div><span className="font-semibold text-slate-500">M:</span> {p.parentPhone2}</div>}
                    {!p.parentPhone && !p.parentPhone2 && '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
