import React from 'react';
import { Tournament, Player } from '../../types';
import { X, Printer, MessageCircle, Users, Shirt, Calendar, MapPin, Edit3 } from 'lucide-react';
import { formatDateIT } from '../../utils/formatters';
import { ClubLogo } from '../common/ClubLogo';
import { sendWhatsAppToPhoneOrShare } from '../../utils/exports';

interface TournamentParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  rosterPlayers: Player[];
  activeTeamId: string;
  onEditTournament: (tour: Tournament) => void;
}

export const TournamentParticipantsModal: React.FC<TournamentParticipantsModalProps> = ({
  isOpen,
  onClose,
  tournament,
  rosterPlayers,
  activeTeamId,
  onEditTournament
}) => {
  if (!isOpen || !tournament) return null;

  const participatingIds = tournament.participatingPlayerIds || [];

  // Filter roster players who are selected as participants
  const participants = rosterPlayers.filter((p) => participatingIds.includes(p.id));

  // Sort participants by jersey or surname
  participants.sort((a, b) => {
    const jA = parseInt(a.jersey || '999', 10);
    const jB = parseInt(b.jersey || '999', 10);
    if (jA !== jB) return jA - jB;
    return (a.lastName || '').localeCompare(b.lastName || '');
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    let msg = `📋 *LISTA CALCIATORI PARTECIPANTI - SPES MONTESACRO*\n`;
    msg += `🏆 *Torneo:* ${tournament.name}\n`;
    msg += `👥 *Categoria:* ${activeTeamId}\n`;
    if (tournament.startDate || tournament.endDate) {
      msg += `📅 *Date:* dal ${formatDateIT(tournament.startDate)} al ${formatDateIT(tournament.endDate)}\n`;
    }
    if (tournament.location) {
      msg += `📍 *Sede:* ${tournament.location}\n`;
    }
    msg += `\n⭐ *CONVOCATI (${participants.length}):*\n`;

    participants.forEach((p, idx) => {
      const num = p.jersey ? `#${p.jersey} ` : `${idx + 1}. `;
      const name = `${p.lastName || ''} ${p.firstName || p.name || ''}`.trim();
      const role = p.role ? ` (${p.role})` : '';
      msg += `${num}${name}${role}\n`;
    });

    if (tournament.participatingPlayerNotes) {
      msg += `\n📌 *NOTE CONVOCAZIONE:*\n${tournament.participatingPlayerNotes}\n`;
    }

    sendWhatsAppToPhoneOrShare(msg, undefined, `Convocati ${tournament.name}`);
  };

  return (
    <div
      id="tournament-participants-modal"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header (Screen only) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">
                Lista Calciatori Partecipanti
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {tournament.name} • Cat. {activeTeamId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Condividi su WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Stampa foglio convocati"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stampa</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 print:p-0 print:overflow-visible">
          {/* Official Spes Header for Print */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <ClubLogo className="w-12 h-12 shrink-0" />
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  POLISPORTIVA SPES MONTESACRO 1908
                </h1>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Distinta Ufficiale Calciatori Torneo
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-lg">
                Cat. {activeTeamId}
              </span>
            </div>
          </div>

          {/* Tournament Overview info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Torneo</span>
              <span className="font-extrabold text-slate-900">{tournament.name}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Date</span>
              <span className="font-bold text-slate-800">
                {tournament.startDate ? formatDateIT(tournament.startDate) : '-'}
                {tournament.endDate ? ` - ${formatDateIT(tournament.endDate)}` : ''}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Sede / Campo</span>
              <span className="font-bold text-slate-800">
                {tournament.location || 'Spes Montesacro'}
              </span>
            </div>
          </div>

          {/* Participants Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-emerald-600" />
                <span>Calciatori Convocati ({participants.length})</span>
              </h4>
              <span className="text-xs text-slate-500 font-semibold print:hidden">
                Rosa Categoria: {rosterPlayers.length}
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Nessun calciatore ancora selezionato dalla rosa per questo torneo.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Puoi selezionare i convocati modificando il torneo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditTournament(tournament);
                  }}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  Seleziona Convocati Ora
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3 w-12 text-center">N°</th>
                      <th className="py-2.5 px-3">Cognome e Nome</th>
                      <th className="py-2.5 px-3 text-center w-24">Nascita</th>
                      <th className="py-2.5 px-3 text-center w-24">Ruolo</th>
                      <th className="py-2.5 px-3 text-center w-24">Firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {participants.map((player, idx) => {
                      const displayName = `${player.lastName || ''} ${player.firstName || player.name || ''}`.trim();
                      return (
                        <tr key={player.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center font-black text-slate-800">
                            {player.jersey ? `#${player.jersey}` : idx + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {displayName || 'Calciatore'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 font-medium">
                            {player.dob ? formatDateIT(player.dob) : '-'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 font-medium">
                            {player.role || '-'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-300">
                            <div className="h-4 border-b border-dashed border-slate-300 mx-2" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes & Indications */}
          {tournament.participatingPlayerNotes && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-xs">
              <span className="block font-black text-amber-900 mb-0.5 uppercase tracking-wide text-[10px]">
                Note e Indicazioni Convocati:
              </span>
              <p className="text-amber-800 font-medium whitespace-pre-wrap">
                {tournament.participatingPlayerNotes}
              </p>
            </div>
          )}

          {/* Signatures for Print */}
          <div className="pt-6 hidden print:grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-10 border-b border-slate-400" />
              <p className="mt-1 font-bold text-slate-700">Firma Allenatore / Dirigente</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400" />
              <p className="mt-1 font-bold text-slate-700">Firma Responsabile Torneo</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditTournament(tournament);
            }}
            className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modifica Convocati / Documenti</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
