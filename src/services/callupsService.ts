import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Callup } from '../types';

export async function getCallupsByTeam(teamId: string): Promise<Callup[]> {
  if (!teamId || teamId === 'ALL' || teamId === 'SELECT_TEAM') return [];
  const q = query(collection(db, 'callups'), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  const list: Callup[] = snap.docs.map((d) => ({
    id: d.id,
    teamId,
    opponent: d.data().opponent || '',
    location: d.data().location || '',
    date: d.data().date || '',
    matchTime: d.data().matchTime || '',
    gatheringTime: d.data().gatheringTime || '',
    players: d.data().players || [],
    responses: d.data().responses || {},
    ...d.data()
  }));

  list.sort(
    (a, b) =>
      new Date(`${b.date}T${b.matchTime || '00:00'}`).getTime() -
      new Date(`${a.date}T${a.matchTime || '00:00'}`).getTime()
  );

  return list;
}

export async function getAllActiveCallups(): Promise<Callup[]> {
  const snap = await getDocs(collection(db, 'callups'));
  return snap.docs.map((d) => ({
    id: d.id,
    teamId: d.data().teamId || '',
    opponent: d.data().opponent || '',
    location: d.data().location || '',
    date: d.data().date || '',
    matchTime: d.data().matchTime || '',
    gatheringTime: d.data().gatheringTime || '',
    players: d.data().players || [],
    responses: d.data().responses || {},
    ...d.data()
  }));
}

export async function saveCallup(
  data: Omit<Callup, 'id' | 'responses'>,
  editingId?: string | null
): Promise<string> {
  if (editingId) {
    await updateDoc(doc(db, 'callups', editingId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return editingId;
  }

  const docRef = await addDoc(collection(db, 'callups'), {
    ...data,
    responses: {},
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function archiveAndDeleteCallup(callupId: string): Promise<void> {
  const docRef = doc(db, 'callups', callupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    await addDoc(collection(db, 'match_history'), {
      ...data,
      archivedAt: new Date().toISOString()
    });
  }
  await deleteDoc(docRef);
}

export async function respondToCallup(
  callupId: string,
  playerId: string,
  status: 'confirmed' | 'absent' | 'present'
): Promise<void> {
  const callupRef = doc(db, 'callups', callupId);
  const snap = await getDoc(callupRef);

  if (!snap.exists()) {
    throw new Error('Questa convocazione non è più attiva.');
  }

  const data = snap.data();
  const responses = data.responses || {};
  responses[playerId] = status;

  await updateDoc(callupRef, { responses });

  // Update or set in permanent match_history
  const historyId = `${callupId}_${playerId}`;
  const historyRef = doc(db, 'match_history', historyId);
  await setDoc(
    historyRef,
    {
      playerId,
      matchId: callupId,
      title: `Partita vs ${data.opponent || 'Avversario'}`,
      date: data.date || 'Da definire',
      time: data.matchTime || '',
      location: data.location || 'Da definire',
      status: status,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function getPermanentMatchHistory(playerId: string): Promise<any[]> {
  const snap = await getDocs(collection(db, 'match_history'));
  const results: any[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (String(data.playerId) === String(playerId)) {
      results.push({
        id: docSnap.id,
        matchId: data.matchId,
        title: data.title || `Partita vs ${data.opponent || 'Avversario'}`,
        date: data.date || 'Da definire',
        time: data.time || data.matchTime || '',
        location: data.location || 'Da definire',
        status: data.status,
        responses: { [playerId]: data.status }
      });
    }
  });
  return results;
}
