import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { StaffAttendance, StaffEquipment } from '../types';

export async function getStaffAttendances(): Promise<StaffAttendance[]> {
  const snap = await getDocs(collection(db, 'staff_attendances'));
  const list: StaffAttendance[] = snap.docs.map((d) => ({
    id: d.id,
    date: d.data().date || '',
    coachId: d.data().coachId || '',
    status: d.data().status || 'Presente',
    replacementId: d.data().replacementId || null,
    notes: d.data().notes || '',
    createdAt: d.data().createdAt
  }));

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return list;
}

export async function saveStaffAttendance(data: Omit<StaffAttendance, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'staff_attendances'), {
    ...data,
    createdAt: new Date()
  });
  return ref.id;
}

export async function deleteStaffAttendance(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staff_attendances', id));
}

export async function getStaffEquipmentList(): Promise<StaffEquipment[]> {
  const snap = await getDocs(collection(db, 'staff_equipment'));
  const list: StaffEquipment[] = snap.docs.map((d) => ({
    id: d.id,
    coachId: d.data().coachId || '',
    itemDescription: d.data().itemDescription || '',
    date: d.data().date || '',
    createdAt: d.data().createdAt
  }));

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return list;
}

export async function saveStaffEquipment(data: Omit<StaffEquipment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'staff_equipment'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

export async function deleteStaffEquipment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staff_equipment', id));
}
