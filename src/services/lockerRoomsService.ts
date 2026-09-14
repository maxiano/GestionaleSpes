import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface LockerAssignment {
  id: string;
  day: string; // "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"
  time: string; // "17:00", "18:30"
  category: string; // "2014", "2015", "2016", "2017", "2018", "2019", "2020/21", "Settore Portieri"
  lockerRoom: string; // "3 e 4", "1", "6 e 7", "2 e 14", "8 e 10"
  field: string; // "Campo A11", "Campi C - D", "Campo A", etc.
  notes?: string; // "I genitori devono passare lato bar"
}

export interface LockerSchedule {
  id?: string;
  weekTitle: string; // "Programmazione Spogliatoi e Campi"
  generalNotes: string[];
  assignments: LockerAssignment[];
  updatedAt?: string;
}

export const DAYS_ORDER = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica'
];

export const CATEGORIES_LIST = [
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020/21',
  'Settore Portieri'
];

export const FIELDS_LIST = [
  { group: 'Singoli Campi', options: ['Campo A11', 'Campo A', 'Campo B', 'Campo C', 'Campo D'] },
  {
    group: 'Coppie Uniche',
    options: [
      'Campi A - B',
      'Campi A - C',
      'Campi A - D',
      'Campi B - C',
      'Campi B - D',
      'Campi C - D'
    ]
  }
];

export const DEFAULT_NOTICES = [
  'Si raccomanda il massimo rispetto degli orari e della numerazione degli spogliatoi assegnati.',
  'Lasciare gli spogliatoi puliti e ordinati al termine di ogni sessione di allenamento.',
  "L'accesso ai campi è consentito esclusivamente agli atleti ed allo staff tecnico autorizzato."
];

export const INITIAL_SPES_LOCKER_SCHEDULE: LockerSchedule = {
  weekTitle: 'Programmazione Spogliatoi e Campi',
  generalNotes: DEFAULT_NOTICES,
  assignments: [
    {
      id: 'spes-1',
      day: 'Lunedì',
      time: '17:00',
      category: '2019',
      lockerRoom: '3 e 4',
      field: 'Campi C - D',
      notes: ''
    },
    {
      id: 'spes-2',
      day: 'Lunedì',
      time: '17:00',
      category: '2020/21',
      lockerRoom: '1',
      field: 'Campo A',
      notes: 'I genitori devono passare lato bar'
    },
    {
      id: 'spes-3',
      day: 'Lunedì',
      time: '17:00',
      category: '2016',
      lockerRoom: '6 e 7',
      field: 'Campo A11',
      notes: ''
    },
    {
      id: 'spes-4',
      day: 'Lunedì',
      time: '17:00',
      category: '2014',
      lockerRoom: '2 e 14',
      field: 'Campo A11',
      notes: ''
    },
    {
      id: 'spes-5',
      day: 'Lunedì',
      time: '18:30',
      category: '2015',
      lockerRoom: '8 e 10',
      field: 'Campo A11',
      notes: ''
    }
  ]
};

const LOCAL_STORAGE_KEY = 'spes_weekly_locker_schedule_v2';

export async function getLockerSchedule(): Promise<LockerSchedule> {
  // 1. Check local storage
  let localData: LockerSchedule | null = null;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        localData = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Errore lettura schedule locale:', e);
    }
  }

  // 2. Fetch from Firestore
  try {
    const docRef = doc(db, 'club_settings', 'weekly_lockers');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as LockerSchedule;
      if (remoteData && Array.isArray(remoteData.assignments)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteData));
        }
        return remoteData;
      }
    }
  } catch (err) {
    console.warn('Firestore offline, uso locale:', err);
  }

  return localData || INITIAL_SPES_LOCKER_SCHEDULE;
}

export async function saveLockerSchedule(schedule: LockerSchedule): Promise<void> {
  const payload: LockerSchedule = {
    ...schedule,
    updatedAt: new Date().toISOString()
  };

  // 1. Save locally
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  }

  // 2. Save in Firestore
  try {
    const docRef = doc(db, 'club_settings', 'weekly_lockers');
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Salvataggio Firestore non riuscito, preservato in locale:', err);
  }
}
