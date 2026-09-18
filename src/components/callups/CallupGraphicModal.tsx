import React, { useEffect, useState, useRef } from 'react';
import { Callup } from '../../types';
import { formatDateIT } from '../../utils/formatters';
import { formatCallupWhatsAppFinal, sendToWhatsApp } from '../../utils/exports';
import { createCallupGraphicBlob } from '../../utils/callupGraphicGenerator';
import {
  X,
  Share2,
  Download,
  Copy,
  Printer,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  User,
  Trophy,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

interface CallupGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  callup: Callup | null;
  activeTeamId: string;
  onPrint?: () => void;
}

export const CallupGraphicModal: React.FC<CallupGraphicModalProps> = ({
  isOpen,
  onClose,
  callup,
  activeTeamId,
  onPrint
}) => {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !callup) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      setImageBlob(null);
      setShareFeedback(null);
      setCopied(false);
      return;
    }

    let isMounted = true;
    setGenerating(true);

    createCallupGraphicBlob(callup, activeTeamId)
      .then((blob) => {
        if (!isMounted) return;
        setImageBlob(blob);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch((err) => {
        console.error('Errore generazione grafica convocazione:', err);
      })
      .finally(() => {
        if (isMounted) setGenerating(false);
      });

    return () => {
      isMounted = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [isOpen, callup, activeTeamId]);

  if (!isOpen || !callup) return null;

  const playerNames = (callup.players || []).map((p) => {
    if (typeof p === 'string' && p.includes('|')) return p.split('|')[1];
    if (typeof p === 'string') return p;
    return (p as any)?.name || 'Atleta';
  });

  const getMatchBadge = () => {
    if (callup.matchType === 'Torneo') {
      return {
        label: callup.tournamentName ? `TORNEO: ${callup.tournamentName}` : 'TORNEO',
        color: 'bg-amber-500 text-slate-950 border-amber-400 font-black'
      };
    }
    if (callup.matchType === 'Amichevole') {
      return {
        label: 'GARA AMICHEVOLE',
        color: 'bg-sky-500 text-slate-950 border-sky-400 font-black'
      };
    }
    return {
      label: 'GARA DI CAMPIONATO',
      color: 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
    };
  };

  const badge = getMatchBadge();

  // 1. Download Action
  const handleDownload = () => {
    if (!imageBlob) return;
    const safeOpponent = (callup.opponent || 'gara').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Convocazione_Spes_vs_${safeOpponent}_${callup.date || 'match'}.png`;
    const a = document.createElement('a');
    a.href = imageUrl || URL.createObjectURL(imageBlob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareFeedback('Immagine scaricata con successo sul tuo dispositivo!');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  // 2. Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob })
        ]);
        setCopied(true);
        setShareFeedback('✅ Grafica copiata negli appunti! Ora puoi incollarla su WhatsApp con Ctrl+V o Incolla.');
        setTimeout(() => {
          setCopied(false);
          setShareFeedback(null);
        }, 5000);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.warn('Clipboard write non supportato, avvio download:', err);
      handleDownload();
    }
  };

  // 3. Share to WhatsApp (Native share sheet with file if available, else copy + wa)
  const handleShareToWhatsApp = async () => {
    if (!imageBlob) {
      const msg = formatCallupWhatsAppFinal(callup);
      sendToWhatsApp(msg, `Convocazione Spes vs ${callup.opponent}`);
      return;
    }

    const safeOpponent = (callup.opponent || 'gara').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Convocazione_Spes_vs_${safeOpponent}.png`;
    const file = new File([imageBlob], fileName, { type: 'image/png' });
    const textMsg = formatCallupWhatsAppFinal(callup);

    // Try native share on mobile / modern browsers
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Convocazione Spes Montesacro vs ${callup.opponent}`,
          text: textMsg
        });
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return; // User closed dialog
        console.warn('Native share fallito, passo a fallback:', e);
      }
    }

    // Fallback: Copy to clipboard & Download & open WhatsApp
    let didCopy = false;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob })
        ]);
        didCopy = true;
      }
    } catch (e) {
      // Ignora errore clipboard
    }

    // Download image
    const a = document.createElement('a');
    a.href = imageUrl || URL.createObjectURL(imageBlob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Open WhatsApp with text
    sendToWhatsApp(textMsg, `Convocazione vs ${callup.opponent}`);

    setShareFeedback(
      didCopy
        ? 'Immagine copiata negli appunti e scaricata! Incollala su WhatsApp nella chat della squadra con Incolla (Ctrl+V).'
        : 'Immagine scaricata! Puoi allegarla su WhatsApp insieme al messaggio preparato.'
    );
    setTimeout(() => setShareFeedback(null), 6000);
  };

  return (
    <div
      id="modal-callup-graphic"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Grafica Convocazione WhatsApp & Stampa</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HD 1200px
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Locandina ufficiale per la chat genitori e atleti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert if action occurred */}
        {shareFeedback && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Modal Body: Scrollable Preview of the Graphic */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60 flex flex-col items-center">
          {generating && !imageUrl ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs font-bold uppercase tracking-wider">Generazione grafica in alta risoluzione...</p>
            </div>
          ) : imageUrl ? (
            <div className="w-full flex flex-col items-center">
              <div className="max-w-md w-full shadow-2xl rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 transition hover:border-emerald-400">
                <img
                  src={imageUrl}
                  alt={`Convocazione vs ${callup.opponent}`}
                  className="w-full h-auto block select-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Formato ottimizzato per visualizzazione su smartphone e chat WhatsApp</span>
              </p>
            </div>
          ) : (
            /* Visual HTML Fallback Card if Canvas somehow fails */
            <div className="w-full max-w-md bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 border-2 border-emerald-500 shadow-xl space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[12px] font-black text-amber-400 tracking-widest uppercase">
                  Spes Montesacro
                </p>
                <h2 className="text-lg font-black tracking-tight">CONVOCAZIONE UFFICIALE</h2>
                <div className="flex justify-center gap-2 pt-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                    {activeTeamId}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/15 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">Partita</p>
                <p className="text-base font-black text-white">
                  Spes Montesacro vs {callup.opponent}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400">DATA</p>
                  <p className="font-extrabold text-white">{formatDateIT(callup.date)}</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400">INIZIO GARA</p>
                  <p className="font-extrabold text-white">{callup.matchTime}</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400">RITROVO CAMPO</p>
                  <p className="font-extrabold text-emerald-400">{callup.gatheringTime}</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400">LUOGO</p>
                  <p className="font-extrabold text-white truncate">{callup.location}</p>
                </div>
              </div>

              {callup.coachName && (
                <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs">
                  <p className="text-[10px] font-bold text-slate-400">MISTER / RESPONSABILE</p>
                  <p className="font-extrabold text-white">{callup.coachName}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider mb-2">
                  👥 Convocati ({playerNames.length})
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                  {playerNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-1.5 bg-white/5 border border-white/10 rounded-lg">
                      <span className="w-4 h-4 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-semibold truncate text-white">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-[11px] text-amber-200 space-y-1">
                <p className="font-black text-amber-300 uppercase tracking-wider">⚠️ Disposizioni Obbligatorie:</p>
                <p>• Tuta di rappresentanza e parastinchi obbligatori.</p>
                <p>• NON venire al campo con gli scarpini già indossati.</p>
                <p>• Avvisare sempre prima di eventuali assenze o ritardi.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={!imageBlob || generating}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Copia l'immagine negli appunti per incollarla (Ctrl+V) su WhatsApp Web"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copiata!' : 'Copia Grafica'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageBlob || generating}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Scarica il file PNG in alta risoluzione sul tuo PC o smartphone"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Scarica PNG</span>
            </button>

            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onPrint();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Stampa foglio convocazione"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Stampa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const textMsg = formatCallupWhatsAppFinal(callup);
                sendToWhatsApp(textMsg, `Convocazione vs ${callup.opponent}`);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Invia messaggio formattato standard WhatsApp"
            >
              <span>Solo Testo WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              disabled={generating}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Invia la locandina grafica su WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>Invia Grafica WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
