import { TournamentAttachment } from '../types';

export const MAX_PDF_SIZE_BYTES = 1.8 * 1024 * 1024; // 1.8 MB

export function formatPdfFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createPdfBlobUrl(dataUrl: string): string | null {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Errore conversione PDF in Blob URL:', err);
    return null;
  }
}

export function openOrDownloadPdf(
  dataUrl: string,
  fileName: string,
  action: 'open' | 'download' = 'open'
): void {
  const safeFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blobUrl = createPdfBlobUrl(dataUrl);

  if (!blobUrl) {
    // Fallback: direct anchor with data URL
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (action === 'download') {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    const opened = window.open(blobUrl, '_blank');
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      // Browser popup blocked: fallback to triggering download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }
}

export function readFileAsPdfAttachment(file: File): Promise<TournamentAttachment> {
  return new Promise((resolve, reject) => {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      reject(new Error('Il file selezionato non è un documento PDF valido.'));
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      reject(
        new Error(
          `Il file PDF (${formatPdfFileSize(file.size)}) supera il limite consentito di 1.8 MB. Riduci le dimensioni del documento prima di caricarlo.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        name: file.name,
        dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.onerror = () => {
      reject(new Error('Impossibile leggere il file PDF. Riprova.'));
    };
    reader.readAsDataURL(file);
  });
}
