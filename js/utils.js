/**
 * @file utils.js
 * @brief Gestionale Tecnico - Spes Montesacro
 * @author Massimiliano Nanni
 * @copyright © 2026 Spes Montesacro. Tutti i diritti riservati.
 * 
 * Questo software è riservato esclusivamente all'uso interno della società 
 * sportiva Spes Montesacro. Ne è vietata la copia, la riproduzione o la 
 * distribuzione non autorizzata.
 */

export function formatDateIT(dateStr) {
    if (!dateStr) return '--/--/----';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function sendToWhatsApp(text, title = "Spes Montesacro Report") {
    if (navigator.share) {
        navigator.share({ title: title, text: text }).catch(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}

export function downloadCSV(filename, csvContent) {
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
