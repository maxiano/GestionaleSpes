import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Tournament, TournamentMatch } from '../types';

export async function getTournaments(teamId?: string): Promise<Tournament[]> {
  let q = collection(db, 'tournaments') as any;
  if (teamId && teamId !== 'ALL' && teamId !== 'SELECT_TEAM') {
    q = query(collection(db, 'tournaments'), where('teamId', '==', teamId));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      teamId: data.teamId || '',
      name: data.name || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      location: data.location || '',
      calendarPdf: data.calendarPdf || null,
      regulationPdf: data.regulationPdf || null
    };
  });
}

export async function saveTournament(
  data: Omit<Tournament, 'id'>,
  editingId?: string | null
): Promise<string> {
  const cleanData: any = {
    teamId: data.teamId || '',
    name: data.name || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    location: data.location || '',
    calendarPdf: data.calendarPdf ?? null,
    regulationPdf: data.regulationPdf ?? null
  };

  if (editingId) {
    await updateDoc(doc(db, 'tournaments', editingId), cleanData);
    return editingId;
  }
  const ref = await addDoc(collection(db, 'tournaments'), cleanData);
  return ref.id;
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  // Delete tournament doc
  await deleteDoc(doc(db, 'tournaments', tournamentId));

  // Also delete associated matches
  const q = query(
    collection(db, 'tournament_matches'),
    where('tournamentId', '==', tournamentId)
  );
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, 'tournament_matches', d.id)));
  await Promise.all(deletePromises);
}

export async function getTournamentMatches(teamId?: string): Promise<TournamentMatch[]> {
  let q = collection(db, 'tournament_matches') as any;
  if (teamId && teamId !== 'ALL' && teamId !== 'SELECT_TEAM') {
    q = query(collection(db, 'tournament_matches'), where('teamId', '==', teamId));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      teamId: data.teamId || '',
      tournamentId: data.tournamentId || '',
      match: data.match || '',
      date: data.date || '',
      time: data.time || '',
      location: data.location || '',
      played: !!data.played,
      result: data.result || ''
    };
  });
}

export async function saveTournamentMatch(
  data: Omit<TournamentMatch, 'id'>,
  editingId?: string | null
): Promise<string> {
  if (editingId) {
    await updateDoc(doc(db, 'tournament_matches', editingId), data);
    return editingId;
  }
  const ref = await addDoc(collection(db, 'tournament_matches'), data);
  return ref.id;
}

export async function deleteTournamentMatch(matchId: string): Promise<void> {
  await deleteDoc(doc(db, 'tournament_matches', matchId));
}

export async function updateMatchResult(matchId: string, result: string): Promise<void> {
  await updateDoc(doc(db, 'tournament_matches', matchId), {
    result,
    played: true
  });
}
