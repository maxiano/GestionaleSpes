import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { AttendanceRecord, AttendanceSession } from '../types';
import { parseDateObj } from '../utils/formatters';

export async function getAttendancesByTeam(teamId: string): Promise<AttendanceSession[]> {
  if (!teamId || teamId === 'ALL' || teamId === 'SELECT_TEAM') return [];
  const q = query(collection(db, 'attendances'), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    teamId,
    date: d.data().date || '',
    records: d.data().records || d.data().record || d.data().presenze || [],
    ...d.data()
  }));
}

export async function getMonthlyAttendances(
  teamId: string,
  year: number,
  month: number
): Promise<AttendanceSession[]> {
  const sessions = await getAttendancesByTeam(teamId);
  return sessions.filter((s) => {
    const d = parseDateObj(s.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export async function findSessionByDate(teamId: string, dateIso: string): Promise<AttendanceSession | null> {
  const sessions = await getAttendancesByTeam(teamId);
  const [year, month, day] = dateIso.split('-');
  const dateIt = `${day}/${month}/${year}`;
  const dateItAlt = `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;

  const match = sessions.find((s) => {
    const d = String(s.date || '').trim();
    return d === dateIso || d === dateIt || d === dateItAlt;
  });

  return match || null;
}

export async function saveAttendanceSession(
  teamId: string,
  date: string,
  records: AttendanceRecord[],
  existingSessionId?: string | null
): Promise<string> {
  if (existingSessionId) {
    const docRef = doc(db, 'attendances', existingSessionId);
    await updateDoc(docRef, {
      records,
      record: records,
      updatedAt: serverTimestamp()
    });
    return existingSessionId;
  }

  // Check if one already exists
  const existing = await findSessionByDate(teamId, date);
  if (existing) {
    const docRef = doc(db, 'attendances', existing.id);
    await updateDoc(docRef, {
      records,
      record: records,
      updatedAt: serverTimestamp()
    });
    return existing.id;
  }

  const newDoc = await addDoc(collection(db, 'attendances'), {
    teamId,
    date,
    records,
    record: records,
    createdAt: serverTimestamp()
  });

  return newDoc.id;
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'attendances', sessionId));
}

export async function submitParentCustomTraining(
  childId: string,
  teamName: string,
  childName: string,
  selectedDate: string,
  status: 'present' | 'absent'
): Promise<void> {
  const [year, month, day] = selectedDate.split('-');
  const dateIso = selectedDate;
  const dateIt = `${day}/${month}/${year}`;
  const dateItAlt = `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;

  const snap = await getDocs(collection(db, 'attendances'));
  let targetDoc: any = null;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const dbDate = String(data.date || '').trim();
    const dbTeam = String(data.teamId || data.team || '').trim();
    const matchDate = dbDate === dateIso || dbDate === dateIt || dbDate === dateItAlt;
    const matchTeam = !dbTeam || !teamName || dbTeam.toLowerCase() === teamName.toLowerCase();
    if (matchDate && matchTeam) {
      targetDoc = docSnap;
    }
  });

  let docRef: any;
  let recordList: AttendanceRecord[] = [];

  if (targetDoc) {
    docRef = doc(db, 'attendances', targetDoc.id);
    const data = targetDoc.data();
    recordList = data.records || data.record || data.presenze || [];
  } else {
    docRef = doc(collection(db, 'attendances'));
    await setDoc(docRef, {
      date: dateIt,
      teamId: teamName,
      notes: 'Seduta scelta da portale famiglia',
      records: [],
      record: []
    });
    recordList = [];
  }

  const cleanList = recordList.filter(
    (r) => String(r.playerId || r.id || '') !== String(childId)
  );

  cleanList.push({
    id: String(childId),
    playerId: String(childId),
    name: childName,
    status: status,
    present: status === 'present',
    absent: status === 'absent'
  });

  await updateDoc(docRef, {
    records: cleanList,
    record: cleanList
  });
}
