/**
 * @file modules/parents.js
 * @brief Gestione Genitori: anagrafica, import/export Excel e associazione ai figli
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db, firebaseConfig } from '../firebase-init.js';
import { AppState } from '../state.js';
import { 
    collection, query, where, getDocs, setDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadParentsList() {
    const container = document.getElementById('parents-list-container');
    if (!container) return;

    try {
        const q = query(collection(db, 'users'), where("role", "==", "parent"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-xs text-gray-400">Nessun genitore registrato.</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const parent = docSnap.data();
            const parentId = docSnap.id;
            const phoneDisplay = parent.phone || 'N/D';
            const childrenCount = parent.childIds ? parent.childIds.length : 0;

            container.innerHTML += `
                <div class="border p-3 rounded bg-white flex justify-between items-center text-xs shadow-sm">
                    <div class="space-y-1">
                        <p class="font-bold text-sm text-gray-800">${parent.name || 'Senza nome'}</p>
                        <p class="text-gray-600">📧 <strong>Email:</strong> ${parent.email || 'N/D'}</p>
                        <p class="text-gray-600">📞 <strong>Tel:</strong> ${phoneDisplay} | 👶 <strong>Figli associati:</strong> ${childrenCount}</p>
                    </div>
                    <div>
                        <button data-id="${parentId}" class="btn-delete-parent text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded transition">🗑️ Elimina</button>
                    </div>
                </div>
            `;
        });

        container.querySelectorAll('.btn-delete-parent').forEach(btn => {
            btn.addEventListener('click', (e) => deleteParentUser(e.target.getAttribute('data-id')));
        });
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-500">Errore: ${err.message}</p>`;
    }
}

export async function deleteParentUser(parentId) {
    if (!confirm("Sei sicuro di voler eliminare questo genitore? Perderà l'accesso al portale.")) return;
    try {
        await deleteDoc(doc(db, 'users', parentId));
        alert("Genitore rimosso con successo!");
        loadParentsList();
    } catch (err) {
        alert("Errore eliminazione genitore: " + err.message);
    }
}

export async function exportParentsToExcel() {
    if (typeof XLSX === 'undefined') return alert("Libreria SheetJS non inclusa.");
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const dataToExport = [];
        querySnapshot.docs.forEach(docSnap => {
            const p = docSnap.data();
            if (p.role === 'parent') {
                dataToExport.push({
                    "Nome": p.name || '',
                    "Email": p.email || '',
                    "Telefono": p.phone || '',
                    "ID Figli Associati": Array.isArray(p.childIds) ? p.childIds.join(', ') : ''
                });
            }
        });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tutti i Genitori");
        XLSX.writeFile(workbook, `Tutti_i_Genitori_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
        alert("Errore: " + err.message);
    }
}