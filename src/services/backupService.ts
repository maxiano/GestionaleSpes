import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function downloadDatabaseBackup(): Promise<void> {
  const backupData: Record<string, any[]> = {};
  const collectionsToBackup = [
    'tournaments',
    'tournament_matches',
    'users',
    'players',
    'callups',
    'attendances',
    'staff_attendances',
    'staff_equipment',
    'match_history'
  ];

  for (const colName of collectionsToBackup) {
    const snap = await getDocs(collection(db, colName));
    backupData[colName] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
  }

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `Spes_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function wipeAllDataExceptCoachesAndAdmins(): Promise<void> {
  const collectionsToClear = [
    'players',
    'callups',
    'attendances',
    'tournaments',
    'match_history',
    'tournament_matches',
    'staff_attendances',
    'staff_equipment'
  ];

  for (const colName of collectionsToClear) {
    const snap = await getDocs(collection(db, colName));
    const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
    await Promise.all(deletePromises);
  }

  // Clear parents only
  const usersSnap = await getDocs(collection(db, 'users'));
  const deleteUserPromises: Promise<void>[] = [];
  usersSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role && data.role.toLowerCase() === 'parent') {
      deleteUserPromises.push(deleteDoc(doc(db, 'users', docSnap.id)));
    }
  });

  if (deleteUserPromises.length > 0) {
    await Promise.all(deleteUserPromises);
  }
}
