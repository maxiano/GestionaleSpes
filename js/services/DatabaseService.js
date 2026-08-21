// services/DatabaseService.js
import { db } from '../firebase-init.js';
import { AppCache } from '../core/cache.js';
import { 
    collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
    doc, query, where, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    // --- Giocatori (con supporto Cache) ---
    static async getPlayers(teamId, forceRefresh = false) {
        if (!forceRefresh) {
            const cached = AppCache.getPlayers(teamId);
            if (cached) return cached;
        }

        const q = query(collection(db, 'players'), where("teamId", "==", teamId));
        const snapshot = await getDocs(q);
        const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Salva in cache
        AppCache.setPlayers(teamId, players);
        return players;
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

        // Invalida la cache dei giocatori per questa squadra
        AppCache.clearPlayers(playerData.teamId);
        return savedId;
    }

    static async deletePlayer(id, teamId) {
        await deleteDoc(doc(db, 'players', id));
        if (teamId) {
            AppCache.clearPlayers(teamId);
        }
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
