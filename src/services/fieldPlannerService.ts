import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FieldTrainingPlan } from '../types';

const LOCAL_STORAGE_KEY = 'spes_field_training_plans_v1';

export const DEFAULT_ZONES = {
  sideLeft: { team: '', coach: '', notes: '' },
  sideRight: { team: '', coach: '', notes: '' },
  topLeft: { team: '', coach: '', notes: '' },
  topRight: { team: '', coach: '', notes: '' },
  centerLeft: { team: '', coach: '', notes: '' },
  centerRight: { team: '', coach: '', notes: '' }
};

export const INITIAL_FIELD_PLANS: FieldTrainingPlan[] = [
  {
    id: 'plan-lunedi-1700',
    day: 'Lunedì',
    time: '17:00 - 18:30',
    notes: 'Inizio seduta pomeridiana attività di base',
    zones: {
      sideLeft: { team: '2019', coach: 'Mister Rossi', notes: '' },
      sideRight: { team: '2020/21', coach: 'Mister Bianchi', notes: '' },
      topLeft: { team: '2017', coach: 'Mister De Luca', notes: '' },
      topRight: { team: '2018', coach: 'Mister Ferrari', notes: '' },
      centerLeft: { team: '2016', coach: 'Mister Romano', notes: '' },
      centerRight: { team: '2014', coach: 'Mister Conti', notes: '' }
    },
    updatedAt: new Date().toISOString()
  }
];

export async function getFieldTrainingPlans(): Promise<FieldTrainingPlan[]> {
  // 1. Read from localStorage as initial / offline cache
  let cached: FieldTrainingPlan[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        cached = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Errore lettura cache locale schemi campi:', e);
    }
  }

  // 2. Fetch from Firestore
  try {
    const docRef = doc(db, 'club_settings', 'field_training_plans');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.plans) && data.plans.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.plans));
        }
        return data.plans;
      }
    }
  } catch (err) {
    console.warn('Avviso lettura Firestore schemi campi, uso cache locale:', err);
  }

  if (cached.length > 0) {
    return cached;
  }

  return INITIAL_FIELD_PLANS;
}

export async function saveFieldTrainingPlans(plans: FieldTrainingPlan[]): Promise<void> {
  // 1. Save to local storage
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
  }

  // 2. Save to Firestore
  try {
    const docRef = doc(db, 'club_settings', 'field_training_plans');
    await setDoc(docRef, {
      plans,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Errore salvataggio Firestore schemi campi:', err);
    throw err;
  }
}
