/**
 * @file modules/backup.js
 * @brief Strumenti di backup database JSON e reset totale protetto per amministratori
 * @project Gestionale Tecnico - Spes Montesacro
 */

import { db } from '../firebase-init.js';
import { AppState } from '../state.js';
import { downloadJSON } from '../utils.js';
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function downloadDatabaseBackup() {
    const backupData = {};
    const collectionsToBackup = ['tournaments', 'users', 'players', 'callups', 'attendances', 'match_history'];

    try {
        console.log("Inizio backup del database...");
        for (const colName of collectionsToBackup) {
            const querySnapshot = await getDocs(collection(db, colName));
            backupData[colName] = querySnapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            }));
        }
        const dateIso = new Date().toISOString().slice(0, 10);
        downloadJSON(`Spes_Backup_${dateIso}.json`, backupData);
        alert("Backup del database completato con successo!");
    } catch (error) {
        alert("Errore nel backup: " + error.message);
    }
}

export async function deleteAllFirebaseData() {
    const currentUserProfile = AppState.getCurrentUserProfile();
    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        return alert("Accesso non autorizzato. Solo gli amministratori possono eseguire questa operazione.");
    }

    const conferma1 = confirm("⚠️ ATTENZIONE: Stai per eliminare TUTTI i giocatori, lo storico partite, le convocazioni, le presenze, i tornei e TUTTI I GENITORI registrati. Questa operazione è IRREVERSIBILE!");
    if (!conferma1) return;

    const conferma2 = prompt("Per confermare, scrivi esattamente la parola 'ELIMINA' in maiuscolo:");
    if (conferma2 !== "ELIMINA") return alert("Operazione annullata.");

    const collectionsToClear = ['players', 'callups', 'attendances', 'tournaments', 'match_history'];

    try {
        for (const colName of collectionsToClear) {
            const querySnapshot = await getDocs(collection(db, colName));
            const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(doc(db, colName, docSnap.id)));
            await Promise.all(deletePromises);
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const deleteUsersPromises = [];
        usersSnapshot.docs.forEach(docSnap => {
            if (docSnap.data().role === 'parent') {
                deleteUsersPromises.push(deleteDoc(doc(db, 'users', docSnap.id)));
            }
        });
        if (deleteUsersPromises.length > 0) await Promise.all(deleteUsersPromises);

        alert("🗑️ Tutti i dati sono stati eliminati con successo dal database (account Admin e Coach preservati).");
        location.reload();
    } catch (error) {
        alert("Errore durante l'eliminazione dei dati: " + error.message);
    }
}