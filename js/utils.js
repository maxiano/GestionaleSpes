/**
 * @file utils.js
 * @brief Funzioni di utilità per date, download file e condivisione WhatsApp
 * @project Gestionale Tecnico - Spes Montesacro
 */

export function formatDateIT(dateString) {
    if (!dateString) return 'N/D';
    if (dateString.includes('/')) return dateString;

    const parts = dateString.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return dateString;
}

export function sendToWhatsApp(text, label = '') {
    if (!text) return;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

export function downloadCSV(filename, csvContent) {
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function downloadJSON(filename, data) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
}