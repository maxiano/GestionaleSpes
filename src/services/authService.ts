import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { firebaseConfig } from '../config/constants';
import { UserProfile, UserRole } from '../types';
import { linkParentToPlayersByPhone, getAllPlayers } from './playersService';
import { normalizePhoneNumber, arePhonesMatching } from '../utils/formatters';

export function normalizeUserProfile(rawData: Record<string, any> | undefined | null): UserProfile {
  if (!rawData) {
    return { uid: '', role: 'coach', teams: [], name: 'Utente', email: '' };
  }

  let extractedTeams: string[] = [];
  const cleanArray = (arr: any[]) =>
    arr.filter(
      (t) =>
        t &&
        t !== 'undefined' &&
        t !== 'null' &&
        t !== 'ALL' &&
        typeof t === 'string' &&
        t.trim() !== ''
    );

  if (Array.isArray(rawData.teams)) {
    extractedTeams = cleanArray(rawData.teams);
  } else if (typeof rawData.teams === 'string' && rawData.teams.trim() !== '') {
    extractedTeams = cleanArray(rawData.teams.split(',').map((t: string) => t.trim()));
  }

  if (extractedTeams.length === 0) {
    const legacyTeam = rawData.teamId || rawData.team;
    if (Array.isArray(legacyTeam)) {
      extractedTeams = cleanArray(legacyTeam);
    } else if (typeof legacyTeam === 'string' && legacyTeam.trim() !== '') {
      extractedTeams = cleanArray(legacyTeam.split(',').map((t: string) => t.trim()));
    }
  }

  return {
    uid: rawData.uid || '',
    name: rawData.name || rawData.email || 'Utente',
    email: rawData.email || '',
    role: (rawData.role as UserRole) || 'coach',
    phone: rawData.phone || '',
    teams: extractedTeams,
    teamId: extractedTeams.length > 0 ? extractedTeams[0] : (rawData.teamId || ''),
    childIds: Array.isArray(rawData.childIds) ? rawData.childIds : rawData.childId ? [rawData.childId] : []
  };
}

export async function loginUser(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null, profile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null, null);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = normalizeUserProfile({ uid: firebaseUser.uid, ...userDoc.data() });
        callback(firebaseUser, profile);
      } else {
        console.warn('Profilo utente non trovato nel database!');
        callback(firebaseUser, null);
      }
    } catch (err) {
      console.error('Errore caricamento profilo:', err);
      callback(firebaseUser, null);
    }
  });
}

export async function changeUserPassword(currentPass: string, newPass: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Nessun utente autenticato');
  const credential = EmailAuthProvider.credential(user.email, currentPass);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPass);
}

export async function createStaffAccount(data: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'coach';
  teams: string[];
}): Promise<string> {
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
  const response = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      returnSecureToken: true
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || "Errore durante la creazione dell'account");
  }

  const newUid = resData.localId;
  await setDoc(doc(db, 'users', newUid), {
    uid: newUid,
    name: data.name,
    email: data.email,
    role: data.role,
    teamId: data.teams.length > 0 ? data.teams[0] : '',
    teams: data.teams,
    createdAt: serverTimestamp()
  });

  return newUid;
}

export async function createParentAccount(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<string> {
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
  const response = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      returnSecureToken: true
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'Errore creazione account genitore');
  }

  const newUid = resData.localId;

  // Crea il documento utente genitore
  await setDoc(doc(db, 'users', newUid), {
    uid: newUid,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'parent',
    childIds: [],
    createdAt: serverTimestamp()
  });

  // Collega automaticamente tutti i figli che hanno questo numero di telefono (come Padre o come Madre)
  if (data.phone) {
    try {
      await linkParentToPlayersByPhone(newUid, data.phone);
    } catch (err) {
      console.warn('Errore auto-collegamento figli a nuovo genitore:', err);
    }
  }

  return newUid;
}

/**
 * Sincronizza tutti gli account genitori con l'intero roster dei giocatori
 * basandosi sul numero di telefono (padre o madre).
 */
export async function syncAllParentsWithRoster(): Promise<{ parentsCount: number; totalLinks: number }> {
  const parents = await fetchParentsUsers();
  const allPlayers = await getAllPlayers();
  let totalLinks = 0;

  for (const parent of parents) {
    if (!parent.phone) continue;
    const cleanPhone = normalizePhoneNumber(parent.phone);
    if (!cleanPhone) continue;

    const matchedChildIds: string[] = [];
    for (const player of allPlayers) {
      if (
        arePhonesMatching(player.parentPhone, cleanPhone) ||
        arePhonesMatching(player.parentPhone2, cleanPhone) ||
        (Array.isArray(player.parentPhones) && player.parentPhones.some((p) => arePhonesMatching(p, cleanPhone)))
      ) {
        matchedChildIds.push(player.id);
        const existingPids = Array.isArray(player.parentIds) ? player.parentIds : [];
        if (!existingPids.includes(parent.uid)) {
          await updateDoc(doc(db, 'players', player.id), {
            parentIds: arrayUnion(parent.uid),
            parentId: player.parentId || parent.uid
          }).catch(() => {});
        }
      }
    }

    const currentChildIds = Array.isArray(parent.childIds) ? parent.childIds : [];
    const merged = Array.from(new Set([...currentChildIds, ...matchedChildIds]));
    if (merged.length !== currentChildIds.length) {
      await updateDoc(doc(db, 'users', parent.uid), {
        childIds: merged
      }).catch(() => {});
      totalLinks += merged.length - currentChildIds.length;
    }
  }

  return { parentsCount: parents.length, totalLinks };
}

export async function fetchStaffUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  const list: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role !== 'parent') {
      list.push(normalizeUserProfile({ uid: docSnap.id, ...data }));
    }
  });
  return list;
}

export async function deleteStaffUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
}

export async function fetchParentsUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'parent'));
  const snapshot = await getDocs(q);
  const list: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    list.push(normalizeUserProfile({ uid: docSnap.id, ...docSnap.data() }));
  });
  return list;
}

export async function deleteParentUser(parentId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', parentId));
}
