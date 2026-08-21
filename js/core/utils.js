// core/utils.js

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

export function exportToExcel(filename, rows) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF serve per leggere correttamente i caratteri accentati in Excel
    
    rows.forEach(function(rowArray) {
        let row = rowArray.map(item => `"${(item || '').toString().replace(/"/g, '""')}"`).join(";");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
