import React, { useState, useEffect, useRef } from 'react';
import { Tournament, TournamentAttachment, UserProfile } from '../../types';
import { saveTournament, deleteTournament } from '../../services/tournamentsService';
import { fetchStaffUsers } from '../../services/authService';
import { createPushNotification } from '../../services/notificationService';
import {
  formatNewTournamentCoachWhatsApp,
  sendWhatsAppToPhoneOrShare
} from '../../utils/exports';
import { formatDateIT } from '../../utils/formatters';
import {
  X,
  Loader2,
  Trash2,
  MessageCircle,
  Smartphone,
  BellRing,
  Paperclip,
  Eye,
  Upload,
  Calendar,
  FileText
} from 'lucide-react';
import { formatPdfFileSize, readFileAsPdfAttachment } from '../../utils/pdfHelpers';
import { PdfViewerModal } from '../common/PdfViewerModal';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentToEdit: Tournament | null;
  activeTeamId: string;
  onSaved: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  tournamentToEdit,
  activeTeamId,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [calendarPdf, setCalendarPdf] = useState<TournamentAttachment | null>(null);
  const [regulationPdf, setRegulationPdf] = useState<TournamentAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const calendarFileRef = useRef<HTMLInputElement>(null);
  const regulationFileRef = useRef<HTMLInputElement>(null);

  // PDF Preview modal state
  const [previewPdfModal, setPreviewPdfModal] = useState<{
    isOpen: boolean;
    title: string;
    fileName: string;
    dataUrl: string;
    fileSize?: number;
  }>({
    isOpen: false,
    title: '',
    fileName: '',
    dataUrl: ''
  });

  // Notifications
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyCoach, setNotifyCoach] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [selectedCoachUid, setSelectedCoachUid] = useState<string>('custom');
  const [coachPhone, setCoachPhone] = useState<string>('');
  const [coachName, setCoachName] = useState<string>('');

  useEffect(() => {
    setErrorMessage(null);
    setConfirmDelete(false);
    if (tournamentToEdit) {
      setName(tournamentToEdit.name || '');
      setStartDate(tournamentToEdit.startDate || '');
      setEndDate(tournamentToEdit.endDate || '');
      setLocation(tournamentToEdit.location || '');
      setCalendarPdf(tournamentToEdit.calendarPdf || null);
      setRegulationPdf(tournamentToEdit.regulationPdf || null);
      setNotifyPush(false);
      setNotifyCoach(false);
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setCalendarPdf(null);
      setRegulationPdf(null);
      setNotifyPush(true);
      setNotifyCoach(false);
    }
  }, [tournamentToEdit, isOpen]);

  // Load coaches for this category
  useEffect(() => {
    if (!isOpen) return;

    async function loadCoaches() {
      try {
        const staffList = await fetchStaffUsers();
        // Filter coaches for active team or all
        const teamCoaches = staffList.filter(
          (u) =>
            u.role === 'coach' &&
            (u.teams?.includes(activeTeamId) ||
              u.teamId === activeTeamId ||
              u.teams?.includes('ALL') ||
              u.teams?.length === 0)
        );

        if (teamCoaches.length > 0) {
          setCoaches(teamCoaches);
          setSelectedCoachUid(teamCoaches[0].uid);
          setCoachPhone(teamCoaches[0].phone || '');
          setCoachName(teamCoaches[0].name || '');
        } else {
          const allCoaches = staffList.filter((u) => u.role === 'coach');
          setCoaches(allCoaches);
          if (allCoaches.length > 0) {
            setSelectedCoachUid(allCoaches[0].uid);
            setCoachPhone(allCoaches[0].phone || '');
            setCoachName(allCoaches[0].name || '');
          }
        }
      } catch (err) {
        console.warn('Impossibile caricare lista staff per notifica WhatsApp:', err);
      }
    }

    loadCoaches();
  }, [isOpen, activeTeamId]);

  if (!isOpen) return null;

  const handleUploadCalendar = async (file: File) => {
    try {
      setErrorMessage(null);
      const att = await readFileAsPdfAttachment(file);
      setCalendarPdf(att);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante il caricamento del PDF');
    }
  };

  const handleUploadRegulation = async (file: File) => {
    try {
      setErrorMessage(null);
      const att = await readFileAsPdfAttachment(file);
      setRegulationPdf(att);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante il caricamento del PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Inserisci il nome del torneo!');
      return;
    }
    setLoading(true);

    try {
      await saveTournament(
        {
          teamId: activeTeamId,
          name: name.trim(),
          startDate,
          endDate,
          location: location.trim(),
          calendarPdf,
          regulationPdf
        },
        tournamentToEdit ? tournamentToEdit.id : null
      );

      // 1. Invio Notifica Push PWA automatica all'Allenatore e all'Admin (anche a schermo bloccato)
      if (notifyPush && !tournamentToEdit) {
        try {
          const pdfNotes: string[] = [];
          if (calendarPdf) pdfNotes.push('Calendario PDF');
          if (regulationPdf) pdfNotes.push('Regolamento PDF');
          const pdfSuffix = pdfNotes.length > 0 ? ` [Allegati: ${pdfNotes.join(', ')}]` : '';

          await createPushNotification({
            title: `🏆 Nuovo Torneo: ${name.trim()}`,
            body: `È stato inserito il torneo per la Cat. ${activeTeamId} (${formatDateIT(startDate)} - ${formatDateIT(endDate)}) presso ${location.trim() || 'Spes Montesacro'}.${pdfSuffix}`,
            type: 'tournament',
            targetTeamId: activeTeamId,
            targetRole: 'all',
            data: {
              tournamentName: name.trim(),
              teamId: activeTeamId,
              startDate,
              endDate,
              location: location.trim(),
              hasCalendarPdf: !!calendarPdf,
              hasRegulationPdf: !!regulationPdf
            }
          });
        } catch (pushErr) {
          console.warn('Errore invio push PWA:', pushErr);
        }
      }

      // 2. Notifica opzionale via WhatsApp
      if (notifyCoach && !tournamentToEdit) {
        const msg = formatNewTournamentCoachWhatsApp(
          {
            name: name.trim(),
            startDate,
            endDate,
            location: location.trim(),
            hasCalendarPdf: !!calendarPdf,
            hasRegulationPdf: !!regulationPdf
          },
          activeTeamId,
          coachName
        );
        sendWhatsAppToPhoneOrShare(msg, coachPhone, `Nuovo Torneo ${name.trim()}`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Errore salvataggio torneo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tournamentToEdit) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await deleteTournament(tournamentToEdit.id);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage('Errore eliminazione: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
      <div className="bg-white p-6 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-900 text-lg">
            🏆 {tournamentToEdit ? 'Modifica Torneo' : 'Nuovo Torneo'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Torneo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Torneo NIKI 2026"
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Inizio Torneo *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Fine Torneo *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campo di Gioco / Località Principale
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="es. Centro Sportivo Spes Montesacro"
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Allegati Documenti Ufficiali in PDF (Calendario e Regolamento) */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Documenti Ufficiali Torneo (PDF)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Max 1.8 MB cad.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Calendario Gare PDF */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Calendario Gare</span>
                  </span>
                  {calendarPdf && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Caricato
                    </span>
                  )}
                </div>

                {calendarPdf ? (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={calendarPdf.name}>
                            {calendarPdf.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatPdfFileSize(calendarPdf.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCalendarPdf(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                        title="Rimuovi Calendario PDF"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPdfModal({
                            isOpen: true,
                            title: `Calendario - ${name || 'Torneo'}`,
                            fileName: calendarPdf.name,
                            dataUrl: calendarPdf.dataUrl,
                            fileSize: calendarPdf.size
                          })
                        }
                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-600" />
                        <span>Visualizza</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => calendarFileRef.current?.click()}
                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-slate-600" />
                        <span>Sostituisci</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => calendarFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadCalendar(f);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-700">Carica Calendario</span>
                    <span className="text-[9px] text-slate-400">Trascina o clicca (.pdf)</span>
                  </div>
                )}

                <input
                  ref={calendarFileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadCalendar(f);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* 2. Regolamento PDF */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Regolamento</span>
                  </span>
                  {regulationPdf && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Caricato
                    </span>
                  )}
                </div>

                {regulationPdf ? (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={regulationPdf.name}>
                            {regulationPdf.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatPdfFileSize(regulationPdf.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRegulationPdf(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                        title="Rimuovi Regolamento PDF"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPdfModal({
                            isOpen: true,
                            title: `Regolamento - ${name || 'Torneo'}`,
                            fileName: regulationPdf.name,
                            dataUrl: regulationPdf.dataUrl,
                            fileSize: regulationPdf.size
                          })
                        }
                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-600" />
                        <span>Visualizza</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => regulationFileRef.current?.click()}
                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-slate-600" />
                        <span>Sostituisci</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => regulationFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadRegulation(f);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-700">Carica Regolamento</span>
                    <span className="text-[9px] text-slate-400">Trascina o clicca (.pdf)</span>
                  </div>
                )}

                <input
                  ref={regulationFileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadRegulation(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Opzioni Notifiche per il Mister */}
          {!tournamentToEdit && (
            <div className="space-y-2 pt-1">
              {/* Notifica Push PWA (Automatica su smartphone) */}
              <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyPush}
                      onChange={(e) => setNotifyPush(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                      Notifica Push PWA (Mister &amp; Admin)
                    </span>
                  </label>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Automatica
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                  Invia istantaneamente un avviso a comparsa sullo smartphone del mister e dell&apos;amministratore (anche a schermo bloccato).
                </p>
              </div>

              {/* Notifica WhatsApp (Opzionale con testo preimpostato) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyCoach}
                      onChange={(e) => setNotifyCoach(e.target.checked)}
                      className="w-4 h-4 text-slate-700 rounded border-slate-300 focus:ring-slate-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Apri anche messaggio WhatsApp
                    </span>
                  </label>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    Opzionale
                  </span>
                </div>

                {notifyCoach && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Destinatario Mister
                        </label>
                        <select
                          value={selectedCoachUid}
                          onChange={(e) => {
                            const uid = e.target.value;
                            setSelectedCoachUid(uid);
                            const coach = coaches.find((c) => c.uid === uid);
                            if (coach) {
                              setCoachName(coach.name);
                              setCoachPhone(coach.phone || '');
                            } else {
                              setCoachName('');
                            }
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {coaches.map((c) => (
                            <option key={c.uid} value={c.uid}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </option>
                          ))}
                          <option value="custom">Altro numero / Manuale</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Telefono (WhatsApp)
                        </label>
                        <input
                          type="tel"
                          value={coachPhone}
                          onChange={(e) => setCoachPhone(e.target.value)}
                          placeholder="es. 3401234567"
                          className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center justify-between">
              <span>⚠️ {errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-800 text-xs font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {confirmDelete ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <p className="text-xs text-rose-800 font-bold">
                Confermi l&apos;eliminazione di questo torneo e di tutte le partite associate?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {loading ? 'Eliminazione...' : 'Sì, elimina definitivamente'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Annulla
              </button>

              {tournamentToEdit && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Elimina</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{tournamentToEdit ? 'Salva Modifiche' : 'Crea Torneo'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Modale Anteprima PDF Documento */}
      {previewPdfModal.isOpen && (
        <PdfViewerModal
          isOpen={previewPdfModal.isOpen}
          onClose={() =>
            setPreviewPdfModal({ isOpen: false, title: '', fileName: '', dataUrl: '' })
          }
          title={previewPdfModal.title}
          fileName={previewPdfModal.fileName}
          dataUrl={previewPdfModal.dataUrl}
          fileSize={previewPdfModal.fileSize}
        />
      )}
    </div>
  );
};

