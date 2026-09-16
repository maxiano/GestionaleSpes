import React from 'react';
import { TacticalDrill } from '../../types';
import { ClubLogo } from '../common/ClubLogo';
import { TacticalBoard } from './TacticalBoard';
import { Printer, X, Share2, Clock, Users, Maximize2, Shield, Calendar, Compass } from 'lucide-react';

interface DrillPrintModalProps {
  drill: TacticalDrill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DrillPrintModal: React.FC<DrillPrintModalProps> = ({
  drill,
  isOpen,
  onClose
}) => {
  if (!isOpen || !drill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `⚽ *SCHEDA ESERCIZIO SPES MONTESACRO*\n\n` +
      `📋 *Titolo:* ${drill.title}\n` +
      `🏷️ *Categoria:* ${drill.category}\n` +
      `🎯 *Fase:* ${drill.phase}\n` +
      (drill.tacticalZone ? `🗺️ *Zona:* ${drill.tacticalZone}\n` : '') +
      `⏱️ *Durata:* ${drill.durationMinutes || 15} min | 👥 *Giocatori:* ${drill.playerCount || 'N/D'}\n` +
      `📌 *Obiettivo:* ${drill.objectivesPrimary}\n\n` +
      `📝 *Svolgimento:* ${drill.description.substring(0, 180)}...\n\n` +
      `👤 *Mister:* ${drill.authorName} (${drill.authorRole || 'Allenatore'})\n` +
      `Consultabile nel gestionale Spes Montesacro.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:static print:bg-white print:backdrop-blur-none">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none my-auto">
        {/* Barra controlli modale (nascosta in stampa) */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow">
              SPES
            </div>
            <div>
              <h3 className="font-black text-base text-slate-100">Anteprima di Stampa & Scheda Tecnica</h3>
              <p className="text-xs text-slate-400">Ottimizzato per foglio A4 o cartellina allenatore</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              title="Condividi dettagli su WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition shadow-sm"
              title="Stampa scheda su carta o salva in PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scheda Ufficiale stampabile in A4 */}
        <div id="official-drill-printout" className="p-6 sm:p-8 bg-white text-slate-900 print:p-2">
          {/* Intestazione Ufficiale Club */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 border-2 border-slate-900 rounded-2xl flex items-center justify-center p-1.5 bg-white shrink-0 overflow-hidden shadow-2xs">
                <ClubLogo className="w-full h-full object-contain text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  SPES Montesacro
                </h1>
                <p className="text-xs font-bold text-slate-700">
                  Scuola Calcio & Settore Giovanile • Scheda Esercitazione Ufficiale
                </p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Mister: {drill.authorName} {drill.authorRole ? `(${drill.authorRole})` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider mb-1">
                {drill.category}
              </span>
              <p className="text-[11px] font-bold text-emerald-700">{drill.phase}</p>
              {drill.tacticalZone && (
                <p className="text-[10px] font-bold text-sky-800">{drill.tacticalZone}</p>
              )}
              <p className="text-[10px] text-slate-500">
                Data: {new Date(drill.updatedAt || drill.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {/* Titolo e Sottotitolo Principi Metodologici */}
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
              {drill.title}
            </h2>
            <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-[11px] font-bold text-emerald-900 leading-snug">
                Tutte le esercitazioni devono implementare questi 4 principi: <span className="underline decoration-emerald-500">gioco e mi muovo</span>, <span className="underline decoration-emerald-500">gestione del pallone</span>, <span className="underline decoration-emerald-500">riaggressione</span> e <span className="underline decoration-emerald-500">contrattacco</span>.
              </p>
            </div>
          </div>

          {/* Tabella Parametri Esercizio */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block">Durata</span>
                <span className="font-bold text-slate-900">{drill.durationMinutes || 15} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block">Giocatori</span>
                <span className="font-bold text-slate-900">{drill.playerCount || 'Tutta la squadra'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block">Dimensioni</span>
                <span className="font-bold text-slate-900">{drill.pitchDimensions || 'Metà campo'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block">Intensità</span>
                <span className="font-bold text-slate-900">{drill.intensity || 'Media'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Compass className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block">Zona Campo</span>
                <span className="font-bold text-sky-900 truncate block">
                  {drill.tacticalZone || 'Costruzione bassa'}
                </span>
              </div>
            </div>
          </div>

          {/* Lavagna Grafica Tattica (Schema del campo) */}
          <div className="mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <span>Schema Grafico Campo & Sviluppo Tattico</span>
            </h3>
            <div className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden border-2 border-slate-900 shadow-sm print:border-slate-800">
              <TacticalBoard
                pitchType={drill.pitchType}
                onChangePitchType={() => {}}
                elements={drill.elements}
                onChangeElements={() => {}}
                lines={drill.lines}
                onChangeLines={() => {}}
                readOnly={true}
              />
            </div>
            {/* Legenda grafica */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-600 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-900 inline-block"></span> Corsa / Movimento
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span> Passaggio
              </span>
              <span className="flex items-center gap-1">
                <span className="text-sky-600 font-bold">~</span> Guida palla
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> Tiro a rete
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Blu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span> Rossi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Jolly
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block"></span> Portiere
              </span>
            </div>
          </div>

          {/* Dettagli Metodologici & Obiettivi */}
          <div className="space-y-3.5 text-xs">
            {/* Obiettivi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <h4 className="font-black text-emerald-900 uppercase tracking-wider text-[11px] mb-1">
                  🎯 Obiettivo Primario
                </h4>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  {drill.objectivesPrimary || 'Non specificato'}
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <h4 className="font-black text-blue-900 uppercase tracking-wider text-[11px] mb-1">
                  🔍 Obiettivo Secondario / Transizione
                </h4>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  {drill.objectivesSecondary || 'Continuità di gioco e concentrazione'}
                </p>
              </div>
            </div>

            {/* Materiale */}
            {drill.equipmentNeeded && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-black uppercase text-[10px] text-slate-500 mr-2">Materiale Occorrente:</span>
                <span className="font-bold text-slate-800">{drill.equipmentNeeded}</span>
              </div>
            )}

            {/* Svolgimento e Regole */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
                📖 Svolgimento dell'Esercitazione & Regole
              </h4>
              <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {drill.description || 'Nessuna descrizione inserita.'}
              </p>
            </div>

            {/* Varianti & Progressione */}
            {drill.variants && (
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
                <h4 className="font-black text-amber-900 uppercase tracking-wider text-[11px] mb-1.5">
                  ⚡ Varianti & Progressioni Didattiche
                </h4>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {drill.variants}
                </p>
              </div>
            )}

            {/* Coaching points */}
            {drill.coachingPoints && (
              <div className="border border-slate-200 rounded-xl p-3.5 bg-purple-50/60">
                <h4 className="font-black text-purple-900 uppercase tracking-wider text-[11px] mb-1.5">
                  💡 Punti Chiave per il Mister (Cosa correggere)
                </h4>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {drill.coachingPoints}
                </p>
              </div>
            )}
          </div>

          {/* Footer Ufficiale Scheda */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-800">SPES Montesacro Calcio</p>
              <p>Archivio Tecnico Condiviso Staff & Mister</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">Firma Allenatore:</p>
              <div className="w-36 border-b border-slate-400 mt-5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
