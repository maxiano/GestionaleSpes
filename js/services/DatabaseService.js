// services/DatabaseService.js
import { db } from '../firebase-config.js';
import { 
    collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
    doc, query, where, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

export class DatabaseService {
    // --- Tornei ---
    static async getTournaments(teamId) {
        const q = teamId ? query(collection(db, 'tournaments'), where("teamId", "==", teamId)) : collection(db, 'tournaments');
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    static async saveTournament(data) {
        const ref = await addDoc(collection(db, 'tournaments'), data);
        return ref.id;
    }

    static async updateTournament(id, data) {
        await updateDoc(doc(db, 'tournaments', String(id)), data);
    }

    static async deleteTournament(id) {
        await deleteDoc(doc(db, 'tournaments', String(id)));
    }

    // --- Giocatori ---
    static async getPlayers(teamId) {
        const q = query(collection(db, 'players'), where("teamId", "==", teamId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    static async savePlayer(playerData, editingId = null) {
        let savedId = editingId;
        if (editingId) {
            await updateDoc(doc(db, 'players', editingId), playerData);
        } else {
            playerData.createdAt = serverTimestamp();
            const ref = await addDoc(collection(db, 'players'), playerData);
            savedId = ref.id;
        }

        // Associazione automatica al genitore tramite telefono
        if (playerData.parentPhone && savedId) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("phone", "==", playerData.parentPhone), where("role", "==", "parent"));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const parentId = snapshot.docs[0].id;
                await updateDoc(doc(db, 'players', savedId), { parentId });
                await updateDoc(doc(db, 'users', parentId), { childIds: arrayUnion(savedId) });
            }
        }
        return savedId;
    }

    static async deletePlayer(id) {
        await deleteDoc(doc(db, 'players', id));
    }

    // --- Convocazioni ---
    static async getCallups(teamId) {
        const q = teamId ? query(collection(db, 'callups'), where("teamId", "==", teamId)) : collection(db, 'callups');
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    static async archiveAndRemoveCallup(callupId) {
        const callupRef = doc(db, 'callups', callupId);
        const callupSnap = await getDoc(callupRef);

        if (callupSnap.exists()) {
            await addDoc(collection(db, 'match_history'), {
                ...callupSnap.data(),
                archivedAt: new Date().toISOString()
            });
        }
        await deleteDoc(callupRef);
    }

    // --- Backup Globale ---
    static async backupDatabase() {
        const collections = ['tournaments', 'users', 'players', 'callups', 'attendances'];
        const backupData = {};
        for (const col of collections) {
            const snapshot = await getDocs(collection(db, col));
            backupData[col] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        return backupData;
    }

    // --- Utility Formato Data ---
    static formatDateIT(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    }
}
