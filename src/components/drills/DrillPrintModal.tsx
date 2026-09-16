import React, { useState, useEffect } from 'react';
import { TacticalDrill } from '../../types';
import { ClubLogo } from '../common/ClubLogo';
import { TacticalBoard } from './TacticalBoard';
import {
  Printer,
  X,
  Share2,
  Clock,
  Users,
  Maximize2,
  Shield,
  Compass,
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  Sparkles,
  HelpCircle,
  Edit3
} from 'lucide-react';

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
  const [printLayout, setPrintLayout] = useState<'compact' | 'extended'>('compact');
  const [colorMode, setColorMode] = useState<'color' | 'bw'>('color');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [includeNotesBox, setIncludeNotesBox] = useState(true);

  // Isolamento stampa: quando la modale è aperta aggiungiamo la classe a document.body
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drill-print-active');
    } else {
      document.body.classList.remove('drill-print-active');
    }
    return () => {
      document.body.classList.remove('drill-print-active');
    };
  }, [isOpen]);

  if (!isOpen || !drill) return null;

  const handlePrint = () => {
    const printElement = document.getElementById('official-drill-printout');
    if (!printElement) {
      window.print();
      return;
    }

    // Rimuove eventuali vecchi iframe di stampa per evitare duplicazioni
    const existingFrame = document.getElementById('spes-drill-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    // Crea un iframe nascosto dedicato esclusivamente alla stampa
    const iframe = document.createElement('iframe');
    iframe.id = 'spes-drill-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Recupera tutti gli stili attivi (Tailwind, Google fonts, regole CSS)
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    const drillTitle = drill.title || 'Scheda Esercitazione SPES';

    // Scrive un documento HTML completo che contiene SOLO ed ESCLUSIVAMENTE l'anteprima
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="it">
        <head>
          <meta charset="utf-8" />
          <title>${drillTitle} - SPES Montesacro</title>
          ${headStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
              width: 100% !important;
              height: auto !important;
            }
            #official-drill-printout {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }
            .print-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            svg {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div id="official-drill-printout" class="${printElement.className}">
            ${printElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Attende il rendering di font e grafici vettoriali, poi lancia la stampa dell'iframe
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Stampa via iframe non disponibile, fallback a window.print()', err);
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      }
    }, 250);
  };

  // Esporta e scarica direttamente l'immagine ad alta risoluzione (1600x1040)
  const handleDownloadHdImage = () => {
    setIsExportingImage(true);
    try {
      const svg = document.querySelector('#official-drill-printout svg') as SVGSVGElement | null;
      if (!svg) {
        alert('Impossibile localizzare lo schema grafico.');
        setIsExportingImage(false);
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1040;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = colorMode === 'bw' ? '#f8fafc' : '#1b6e3b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const safeTitle = drill.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const link = document.createElement('a');
          link.download = `Spes-Schema-${safeTitle || 'esercitazione'}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        URL.revokeObjectURL(blobURL);
        setIsExportingImage(false);
      };

      img.onerror = () => {
        alert('Errore durante la generazione dell\'immagine.');
        URL.revokeObjectURL(blobURL);
        setIsExportingImage(false);
      };

      img.src = blobURL;
    } catch (e) {
      console.error(e);
      alert('Errore esportazione immagine HD.');
      setIsExportingImage(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text =
      `⚽ *SCHEDA ESERCITAZIONE SPES MONTESACRO*\n\n` +
      `📋 *Titolo:* ${drill.title}\n` +
      `🏷️ *Categoria:* ${drill.category}\n` +
      `🎯 *Fase:* ${drill.phase}\n` +
      (drill.tacticalZone ? `🗺️ *Zona:* ${drill.tacticalZone}\n` : '') +
      `⏱️ *Durata:* ${drill.durationMinutes || 15} min | 👥 *Giocatori:* ${drill.playerCount || 'N/D'}\n` +
      `📌 *Obiettivo Primario:* ${drill.objectivesPrimary}\n` +
      (drill.objectivesSecondary ? `🔍 *Obiettivo Secondario:* ${drill.objectivesSecondary}\n` : '') +
      `\n📖 *Svolgimento & Regole:*\n${drill.description}\n\n` +
      (drill.variants ? `⚡ *Varianti:*\n${drill.variants}\n\n` : '') +
      (drill.coachingPoints ? `💡 *Coaching Points:*\n${drill.coachingPoints}\n\n` : '') +
      `👤 *Mister:* ${drill.authorName} ${drill.authorRole ? `(${drill.authorRole})` : ''}\n` +
      `Club Ufficiale Spes Montesacro Calcio.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isBw = colorMode === 'bw';

  return (
    <div
      id="drill-print-modal-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:static print:bg-white print:backdrop-blur-none"
    >
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none my-auto">
        {/* BARRA CONTROLLI MODALE (Nascosta durante la stampa fisica/PDF) */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Titolo e descrizione */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                SPES
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-100 flex items-center gap-2">
                  <span>Stampa Scheda Esercitazione & Immagini</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                    A4 Ready
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Layout ottimizzato per salvaguardare testo completo, schema grafico e proporzioni di stampa.
                </p>
              </div>
            </div>

            {/* Azioni primarie di stampa & download */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleDownloadHdImage}
                disabled={isExportingImage}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition border border-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
                title="Scarica lo schema tattico ad alta risoluzione (1600x1040 PNG)"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>{isExportingImage ? 'Salvataggio...' : 'Salva Schema HD'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                title="Condividi dettagli su WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-black transition shadow-lg cursor-pointer"
                title="Stampa scheda su carta o salva come file PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Stampa / Salva PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Chiudi anteprima"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Opzioni di personalizzazione anteprima e stampa */}
          <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Selettore Formato Layout */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                Impaginazione:
              </span>
              <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPrintLayout('compact')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    printLayout === 'compact'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📄 1 Pagina (Cartellina)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('extended')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    printLayout === 'extended'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>📑 Dettagliata (Multi-pagina)</span>
                </button>
              </div>
            </div>

            {/* Selettore Stile Colore */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                Colori Campo:
              </span>
              <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    colorMode === 'color'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>🟢 A Colori (Reale)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('bw')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    colorMode === 'bw'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Ottimizzato per fotocopie e stampanti laser in bianco e nero"
                >
                  <span>⚪ B&W Alto Contrasto</span>
                </button>
              </div>
            </div>

            {/* Checkbox Note Box */}
            <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeNotesBox}
                onChange={(e) => setIncludeNotesBox(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold">Box Note di campo per appunti a penna</span>
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO UFFICIALE DI STAMPA A4 (ID: #official-drill-printout)          */}
        {/* ========================================================================= */}
        <div
          id="official-drill-printout"
          className={`p-6 sm:p-8 bg-white text-slate-900 print:p-0 ${
            printLayout === 'compact' ? 'drill-layout-compact' : 'drill-layout-extended'
          }`}
        >
          {/* INTESTAZIONE UFFICIALE CLUB */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3 print-avoid-break">
            <div className="flex items-center space-x-3">
              <div className="w-13 h-13 border-2 border-slate-900 rounded-2xl flex items-center justify-center p-1 bg-white shrink-0 overflow-hidden shadow-2xs">
                <ClubLogo className="w-full h-full object-contain text-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">
                    SPES Montesacro
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-900 text-white rounded">
                    Roma 1908
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1 leading-none">
                  Scuola Calcio &amp; Settore Giovanile • Scheda Esercitazione Ufficiale
                </p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Mister: <strong className="text-slate-800">{drill.authorName}</strong>{' '}
                  {drill.authorRole ? `(${drill.authorRole})` : ''}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider mb-1">
                {drill.category}
              </span>
              <p className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">
                {drill.phase}
              </p>
              {drill.tacticalZone && (
                <p className="text-[10px] font-bold text-sky-800">{drill.tacticalZone}</p>
              )}
              <p className="text-[10px] text-slate-500 font-medium">
                Aggiornato: {new Date(drill.updatedAt || drill.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {/* TITOLO E PRINCIPI METODOLOGICI SPES */}
          <div className="mb-3 print-avoid-break">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                {drill.title}
              </h2>
            </div>
            <div className="mt-1.5 px-3 py-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg">
              <p className="text-[10px] sm:text-[10.5px] font-bold text-emerald-950 leading-snug">
                ⚽ <span className="uppercase font-black text-emerald-800">Principi Guida Spes:</span>{' '}
                <span className="underline decoration-emerald-600 font-extrabold">1. Gioco e mi muovo</span> |{' '}
                <span className="underline decoration-emerald-600 font-extrabold">2. Gestione del pallone</span> |{' '}
                <span className="underline decoration-emerald-600 font-extrabold">3. Riaggressione</span> |{' '}
                <span className="underline decoration-emerald-600 font-extrabold">4. Contrattacco</span>.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LAYOUT 1: COMPATTO A SINGOLA PAGINA A4                                    */}
          {/* ========================================================================= */}
          {printLayout === 'compact' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
              {/* COLONNA SINISTRA: Schema Tattico Grafico + Parametri tecnici */}
              <div className="space-y-2.5 print-avoid-break">
                {/* Schema del campo da calcio con TacticalBoard */}
                <div className="rounded-xl overflow-hidden border-2 border-slate-900 shadow-xs bg-slate-100">
                  <div className="w-full relative" style={{ aspectRatio: '800 / 520' }}>
                    <TacticalBoard
                      pitchType={drill.pitchType}
                      onChangePitchType={() => {}}
                      elements={drill.elements}
                      onChangeElements={() => {}}
                      lines={drill.lines}
                      onChangeLines={() => {}}
                      readOnly={true}
                      colorScheme={colorMode === 'bw' ? 'high_contrast_bw' : 'standard'}
                    />
                  </div>
                </div>

                {/* Legenda grafica per la stampa */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[9.5px] font-bold text-slate-700 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-slate-900 inline-block"></span> Corsa
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block"></span> Passaggio
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-sky-600 font-bold">~</span> Conduzione
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> Tiro
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
                </div>

                {/* Parametri tecnici dell'esercizio */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10.5px]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">
                        Durata
                      </span>
                      <span className="font-bold text-slate-900">{drill.durationMinutes || 15} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">
                        Giocatori
                      </span>
                      <span className="font-bold text-slate-900">{drill.playerCount || 'Tutta la rosa'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">
                        Spazio
                      </span>
                      <span className="font-bold text-slate-900">{drill.pitchDimensions || 'Metà campo'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block leading-none">
                        Intensità
                      </span>
                      <span className="font-bold text-slate-900">{drill.intensity || 'Media'}</span>
                    </div>
                  </div>

                  {drill.equipmentNeeded && (
                    <div className="col-span-2 pt-1.5 border-t border-slate-200/80">
                      <span className="text-[9px] text-slate-500 uppercase font-black mr-1.5">
                        Materiale:
                      </span>
                      <span className="font-bold text-slate-800">{drill.equipmentNeeded}</span>
                    </div>
                  )}
                </div>

                {/* Box firma e annotazione campo rapida */}
                {includeNotesBox && (
                  <div className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl print-avoid-break">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-slate-600" />
                        <span>Note a penna del Mister sul campo</span>
                      </span>
                      <span>Firma: ________________</span>
                    </div>
                    <div className="h-10 border-b border-dashed border-slate-300"></div>
                  </div>
                )}
              </div>

              {/* COLONNA DESTRA: Obiettivi didattici, svolgimento, regole e coaching points */}
              <div className="space-y-2.5 text-xs">
                {/* Obiettivi */}
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl print-avoid-break">
                  <h4 className="font-black text-emerald-950 uppercase tracking-wider text-[10px] mb-0.5">
                    🎯 Obiettivo Primario
                  </h4>
                  <p className="text-slate-900 font-semibold leading-relaxed text-[11px]">
                    {drill.objectivesPrimary || 'Non specificato'}
                  </p>
                </div>

                {drill.objectivesSecondary && (
                  <div className="p-2 bg-blue-50/60 border border-blue-200 rounded-xl print-avoid-break">
                    <h4 className="font-black text-blue-950 uppercase tracking-wider text-[9.5px] mb-0.5">
                      🔍 Obiettivo Secondario / Transizione
                    </h4>
                    <p className="text-slate-800 font-medium leading-snug text-[10.5px]">
                      {drill.objectivesSecondary}
                    </p>
                  </div>
                )}

                {/* Svolgimento e Regole dell'esercitazione */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white print-avoid-break shadow-2xs">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[10px] mb-1 pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span>📖 Svolgimento dell'Esercitazione &amp; Regole</span>
                  </h4>
                  <p className="text-slate-800 leading-relaxed font-medium text-[11px] whitespace-pre-line">
                    {drill.description || 'Nessuna descrizione inserita.'}
                  </p>
                </div>

                {/* Varianti didattiche */}
                {drill.variants && (
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-amber-50/50 print-avoid-break">
                    <h4 className="font-black text-amber-950 uppercase tracking-wider text-[10px] mb-0.5">
                      ⚡ Varianti &amp; Progressioni Didattiche
                    </h4>
                    <p className="text-slate-800 leading-relaxed font-medium text-[10.5px] whitespace-pre-line">
                      {drill.variants}
                    </p>
                  </div>
                )}

                {/* Coaching points per il mister */}
                {drill.coachingPoints && (
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-purple-50/50 print-avoid-break">
                    <h4 className="font-black text-purple-950 uppercase tracking-wider text-[10px] mb-0.5">
                      💡 Punti Chiave per il Mister (Cosa osservare)
                    </h4>
                    <p className="text-slate-800 leading-relaxed font-medium text-[10.5px] whitespace-pre-line">
                      {drill.coachingPoints}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LAYOUT 2: DETTAGLIATO ESTESO (MULTI-PAGINA)                              */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Tabella Parametri Esercizio */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs print-avoid-break">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Durata</span>
                    <span className="font-bold text-slate-900">{drill.durationMinutes || 15} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Giocatori</span>
                    <span className="font-bold text-slate-900">{drill.playerCount || 'Tutta la rosa'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Dimensioni</span>
                    <span className="font-bold text-slate-900">{drill.pitchDimensions || 'Metà campo'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Intensità</span>
                    <span className="font-bold text-slate-900">{drill.intensity || 'Media'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <Compass className="w-4 h-4 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Zona Campo</span>
                    <span className="font-bold text-sky-950 truncate block">
                      {drill.tacticalZone || 'Costruzione'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schema Grafico Campo Tattico Grande */}
              <div className="print-avoid-break">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Schema Grafico Campo &amp; Sviluppo Tattico</span>
                  <span className="text-[10px] font-normal text-slate-500">Vista Vettoriale HD</span>
                </h3>
                <div className="w-full max-w-3xl mx-auto rounded-xl overflow-hidden border-2 border-slate-900 shadow-sm bg-slate-100">
                  <div className="w-full relative" style={{ aspectRatio: '800 / 520' }}>
                    <TacticalBoard
                      pitchType={drill.pitchType}
                      onChangePitchType={() => {}}
                      elements={drill.elements}
                      onChangeElements={() => {}}
                      lines={drill.lines}
                      onChangeLines={() => {}}
                      readOnly={true}
                      colorScheme={colorMode === 'bw' ? 'high_contrast_bw' : 'standard'}
                    />
                  </div>
                </div>

                {/* Legenda grafica */}
                <div className="flex items-center justify-center gap-4 text-[10.5px] font-bold text-slate-700 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-0.5 bg-slate-900 inline-block"></span> Corsa
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-0.5 border-t border-dashed border-amber-500 inline-block"></span> Passaggio
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-sky-600 font-bold">~</span> Guida palla
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-0.5 bg-rose-600 inline-block"></span> Tiro
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
                </div>
              </div>

              {/* Dettagli Metodologici & Obiettivi */}
              <div className="space-y-3 text-xs">
                {/* Obiettivi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print-avoid-break">
                  <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl">
                    <h4 className="font-black text-emerald-950 uppercase tracking-wider text-[11px] mb-1">
                      🎯 Obiettivo Primario
                    </h4>
                    <p className="text-slate-900 font-semibold leading-relaxed text-xs">
                      {drill.objectivesPrimary || 'Non specificato'}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                    <h4 className="font-black text-blue-950 uppercase tracking-wider text-[11px] mb-1">
                      🔍 Obiettivo Secondario / Transizione
                    </h4>
                    <p className="text-slate-900 font-semibold leading-relaxed text-xs">
                      {drill.objectivesSecondary || 'Continuità di gioco e concentrazione'}
                    </p>
                  </div>
                </div>

                {/* Materiale */}
                {drill.equipmentNeeded && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl print-avoid-break">
                    <span className="font-black uppercase text-[10px] text-slate-500 mr-2">
                      Materiale Occorrente:
                    </span>
                    <span className="font-bold text-slate-800">{drill.equipmentNeeded}</span>
                  </div>
                )}

                {/* Svolgimento e Regole */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white print-avoid-break shadow-2xs">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2 pb-1.5 border-b border-slate-100">
                    📖 Svolgimento dell'Esercitazione &amp; Regole di Gioco
                  </h4>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium text-xs">
                    {drill.description || 'Nessuna descrizione inserita.'}
                  </p>
                </div>

                {/* Varianti & Progressione */}
                {drill.variants && (
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 print-avoid-break">
                    <h4 className="font-black text-amber-950 uppercase tracking-wider text-[11px] mb-1.5">
                      ⚡ Varianti &amp; Progressioni Didattiche
                    </h4>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium text-xs">
                      {drill.variants}
                    </p>
                  </div>
                )}

                {/* Coaching points */}
                {drill.coachingPoints && (
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-purple-50/70 print-avoid-break">
                    <h4 className="font-black text-purple-950 uppercase tracking-wider text-[11px] mb-1.5">
                      💡 Punti Chiave per il Mister (Cosa correggere)
                    </h4>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium text-xs">
                      {drill.coachingPoints}
                    </p>
                  </div>
                )}

                {/* Note scritte a mano & Firma */}
                {includeNotesBox && (
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 print-avoid-break">
                    <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Osservazioni sul Campo &amp; Note dell'Allenatore</span>
                    </h4>
                    <div className="space-y-3 pt-1">
                      <div className="border-b border-dashed border-slate-300 h-5"></div>
                      <div className="border-b border-dashed border-slate-300 h-5"></div>
                      <div className="border-b border-dashed border-slate-300 h-5"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOOTER UFFICIALE SCHEDA */}
          <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 print-avoid-break">
            <div>
              <p className="font-bold text-slate-800">SPES Montesacro Calcio 1908</p>
              <p>Archivio Metodologico e Tecnico Condiviso</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">Firma Allenatore:</p>
              <div className="w-40 border-b border-slate-500 mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
