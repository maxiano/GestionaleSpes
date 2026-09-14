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
import { normalizePhoneNumber, arePhonesMatching } from '../utils/formatters';

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

/**
 * Cerca tutti i giocatori associati a un numero di telefono (padre, madre o entrambi).
 */
export async function findPlayersByParentPhone(phone: string): Promise<Player[]> {
  const clean = normalizePhoneNumber(phone);
  if (!clean) return [];

  const all = await getAllPlayers();
  return all.filter((p) => {
    if (arePhonesMatching(p.parentPhone, clean)) return true;
    if (arePhonesMatching(p.parentPhone2, clean)) return true;
    if (Array.isArray(p.parentPhones) && p.parentPhones.some((ph) => arePhonesMatching(ph, clean))) {
      return true;
    }
    return false;
  });
}

/**
 * Collega un account genitore (UID e Telefono) a tutti i suoi figli nel database.
 */
export async function linkParentToPlayersByPhone(parentUid: string, phone: string): Promise<string[]> {
  const matchedPlayers = await findPlayersByParentPhone(phone);
  if (matchedPlayers.length === 0) return [];

  const childIds = matchedPlayers.map((p) => p.id);

  // 1. Aggiungi il genitore a ciascun giocatore
  await Promise.all(
    matchedPlayers.map((p) =>
      updateDoc(doc(db, 'players', p.id), {
        parentId: p.parentId || parentUid,
        parentIds: arrayUnion(parentUid),
        updatedAt: serverTimestamp()
      }).catch((err) => console.warn(`Errore collegamento genitore a giocatore ${p.id}:`, err))
    )
  );

  // 2. Aggiungi tutti i figli al profilo del genitore
  try {
    const parentRef = doc(db, 'users', parentUid);
    await updateDoc(parentRef, {
      childIds: arrayUnion(...childIds)
    });
  } catch (err) {
    console.warn(`Errore aggiornamento childIds genitore ${parentUid}:`, err);
  }

  return childIds;
}

export async function savePlayer(
  playerData: Omit<Player, 'id'>,
  editingId?: string | null
): Promise<string> {
  const phone1 = playerData.parentPhone ? playerData.parentPhone.trim() : '';
  const phone2 = playerData.parentPhone2 ? playerData.parentPhone2.trim() : '';

  const clean1 = normalizePhoneNumber(phone1);
  const clean2 = normalizePhoneNumber(phone2);
  const parentPhones = Array.from(new Set([clean1, clean2].filter(Boolean)));

  const matchedParentIds: string[] = [];

  // Se è presente almeno un telefono genitore (padre o madre), cerca gli account utenti genitore registrati
  if (clean1 || clean2) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'parent'));
      const snap = await getDocs(q);

      snap.forEach((docSnap) => {
        const u = docSnap.data();
        const uPhone = u.phone;
        if (
          (clean1 && arePhonesMatching(uPhone, clean1)) ||
          (clean2 && arePhonesMatching(uPhone, clean2))
        ) {
          matchedParentIds.push(docSnap.id);
        }
      });
    } catch (e) {
      console.warn('Errore ricerca account genitori:', e);
    }
  }

  const existingParentIds = Array.isArray(playerData.parentIds) ? playerData.parentIds : [];
  const allParentIds = Array.from(new Set([...existingParentIds, ...matchedParentIds]));

  const payload = {
    ...playerData,
    parentPhone: phone1,
    parentPhone2: phone2,
    parentPhones,
    parentId: allParentIds[0] || playerData.parentId || null,
    parentIds: allParentIds,
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

  // Sincronizza tutti gli account genitori trovati (padre e/o madre) aggiungendo il figlio a ciascuno
  if (savedId && allParentIds.length > 0) {
    await Promise.all(
      allParentIds.map((pUid) =>
        updateDoc(doc(db, 'users', pUid), {
          childIds: arrayUnion(savedId)
        }).catch((e) => console.warn(`Errore unione childIds genitore ${pUid}:`, e))
      )
    );
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
      await savePlayer(p, null);
      count++;
    }
  }
  return count;
}
