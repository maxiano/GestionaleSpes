import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { createPdfBlobUrl, formatPdfFileSize } from '../../utils/pdfHelpers';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  dataUrl: string;
  fileSize?: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName,
  dataUrl,
  fileSize
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !dataUrl) {
      setBlobUrl(null);
      return;
    }
    const url = createPdfBlobUrl(dataUrl);
    setBlobUrl(url);

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, dataUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = blobUrl || dataUrl;
    a.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div
      id="pdf-viewer-modal"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150 print:hidden"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
                <span>{fileName}</span>
                {fileSize && fileSize > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">
                      {formatPdfFileSize(fileSize)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 sm:px-3 sm:py-1.5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="Apri in nuova finestra"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Nuova Scheda</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 sm:px-3 sm:py-1.5 text-white bg-slate-900 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              title="Scarica file PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Scarica</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer ml-1"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF embed */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden relative flex flex-col items-center justify-center">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title={fileName}
              className="w-full h-full rounded-2xl bg-white shadow-inner border border-slate-200"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-3">
                Impossibile generare l&apos;anteprima incorporata.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition"
              >
                Scarica il documento PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
