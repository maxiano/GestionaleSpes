import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Player } from '../types';
import { normalizePhoneNumber } from '../utils/formatters';

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  if (!teamId || teamId === 'ALL' || teamId === 'SELECT_TEAM' || teamId === 'NONE') {
    return [];
  }

  const q = query(collection(db, 'players'), where('teamId', '==', teamId));
  const snapshot = await getDocs(q);
  const players: Player[] = snapshot.docs.map((d) => ({
    id: d.id,
    teamId,
    ...d.data()
  }));

  players.sort((a, b) => {
    const surnameA = (a.lastName || '').toLowerCase();
    const surnameB = (b.lastName || '').toLowerCase();
    if (surnameA < surnameB) return -1;
    if (surnameA > surnameB) return 1;
    return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
  });

  return players;
}

export async function getAllPlayers(): Promise<Player[]> {
  const snapshot = await getDocs(collection(db, 'players'));
  return snapshot.docs.map((d) => ({
    id: d.id,
    teamId: d.data().teamId || '',
    ...d.data()
  }));
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const docRef = doc(db, 'players', playerId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, teamId: snap.data().teamId || '', ...snap.data() };
}

export async function savePlayer(
  playerData: Omit<Player, 'id'>,
  editingId?: string | null
): Promise<string> {
  let parentId: string | null = null;

  // Search parent account by phone
  if (playerData.parentPhone) {
    const cleanPhone = normalizePhoneNumber(playerData.parentPhone);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'parent'));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const u = docSnap.data();
      if (normalizePhoneNumber(u.phone) === cleanPhone) {
        parentId = docSnap.id;
      }
    });
  }

  const payload = {
    ...playerData,
    parentId: parentId || playerData.parentId || null,
    updatedAt: serverTimestamp()
  };

  let savedId = editingId;

  if (editingId) {
    await updateDoc(doc(db, 'players', editingId), payload);
  } else {
    const newDoc = await addDoc(collection(db, 'players'), {
      ...payload,
      createdAt: serverTimestamp()
    });
    savedId = newDoc.id;
  }

  // If parent account found, link child in parent document
  if (parentId && savedId) {
    try {
      const parentRef = doc(db, 'users', parentId);
      await updateDoc(parentRef, {
        childIds: arrayUnion(savedId)
      });
    } catch (e) {
      console.warn('Errore unione childIds genitore:', e);
    }
  }

  return savedId!;
}

export async function deletePlayer(playerId: string): Promise<void> {
  await deleteDoc(doc(db, 'players', playerId));
}

export async function batchImportPlayers(players: Array<Omit<Player, 'id'>>): Promise<number> {
  let count = 0;
  for (const p of players) {
    if (p.firstName || p.lastName) {
      await addDoc(collection(db, 'players'), {
        ...p,
        name: `${p.lastName || ''} ${p.firstName || ''}`.trim(),
        createdAt: serverTimestamp()
      });
      count++;
    }
  }
  return count;
}
