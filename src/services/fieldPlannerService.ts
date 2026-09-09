import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FieldTrainingPlan, FieldTrainingZone, FieldTrainingZoneSlot } from '../types';

const LOCAL_STORAGE_KEY = 'spes_field_training_plans_v1';

export function getZoneSlots(zone?: FieldTrainingZone): FieldTrainingZoneSlot[] {
  if (!zone) return [{ team: '', coach: '' }];
  if (zone.slots && Array.isArray(zone.slots) && zone.slots.length > 0) {
    return zone.slots;
  }
  const list: FieldTrainingZoneSlot[] = [];
  list.push({ team: zone.team || '', coach: zone.coach || '' });
  if (zone.team2 || zone.coach2) {
    list.push({ team: zone.team2 || '', coach: zone.coach2 || '' });
  }
  if (zone.team3 || zone.coach3) {
    list.push({ team: zone.team3 || '', coach: zone.coach3 || '' });
  }
  return list.length > 0 ? list : [{ team: '', coach: '' }];
}

export function getZoneCoaches(zone?: FieldTrainingZone): string[] {
  if (!zone) return [''];
  if (zone.coaches && Array.isArray(zone.coaches) && zone.coaches.length > 0) {
    return zone.coaches;
  }
  const list: string[] = [];
  if (zone.coach) list.push(zone.coach);
  if (zone.coach2 && !zone.slots) list.push(zone.coach2);
  if (zone.coach3 && !zone.slots) list.push(zone.coach3);
  return list.length > 0 ? list : [''];
}

/**
 * Lista standard degli allenatori della società elencati per cognome (Cognome Nome)
 * senza prefisso "Mister"
 */
export const DEFAULT_COACHES_BY_SURNAME: string[] = [
  'Cirasella Pierluigi',
  'Cirinei Massimo',
  'Cormani Marco',
  'Della Vecchia Daniele',
  'Feliciotti Mattia',
  'Fermani Christian',
  'Fiori Eugenio',
  'Giampaolo Carlo',
  'Lato Massimiliano',
  'Luminari Davide',
  'Pieraccini Roberto',
  'Piras Francesco',
  'Porzio Andrea',
  'Rodio Federico',
  'Rubeo Silvano',
  'Sassi Matteo',
  'Zambito Daniele',
  'Massimiliano'
];

const KNOWN_COACH_MAP: Record<string, string> = {
  'andrea porzio': 'Porzio Andrea',
  'porzio andrea': 'Porzio Andrea',
  'carlo giampaolo': 'Giampaolo Carlo',
  'giampaolo carlo': 'Giampaolo Carlo',
  'christian fermani': 'Fermani Christian',
  'fermani christian': 'Fermani Christian',
  'daniele della vecchia': 'Della Vecchia Daniele',
  'della vecchia daniele': 'Della Vecchia Daniele',
  'daniele zambito': 'Zambito Daniele',
  'zambito daniele': 'Zambito Daniele',
  'davide luminari': 'Luminari Davide',
  'luminari davide': 'Luminari Davide',
  'eugenio fiori': 'Fiori Eugenio',
  'fiori eugenio': 'Fiori Eugenio',
  'federico rodio': 'Rodio Federico',
  'rodio federico': 'Rodio Federico',
  'francesco piras': 'Piras Francesco',
  'piras francesco': 'Piras Francesco',
  'marco cormani': 'Cormani Marco',
  'cormani marco': 'Cormani Marco',
  'massimiliano lato': 'Lato Massimiliano',
  'lato massimiliano': 'Lato Massimiliano',
  'matteo sassi': 'Sassi Matteo',
  'sassi matteo': 'Sassi Matteo',
  'mattia feliciotti': 'Feliciotti Mattia',
  'feliciotti mattia': 'Feliciotti Mattia',
  'pierluigi cirasella': 'Cirasella Pierluigi',
  'cirasella pierluigi': 'Cirasella Pierluigi',
  'roberto pieraccini': 'Pieraccini Roberto',
  'pieraccini roberto': 'Pieraccini Roberto',
  'silvano rubeo': 'Rubeo Silvano',
  'rubeo silvano': 'Rubeo Silvano',
  'massimo cirinei': 'Cirinei Massimo',
  'cirinei massimo': 'Cirinei Massimo',
  'massimiliano': 'Massimiliano'
};

/**
 * Pulisce qualsiasi prefisso "Mister" da una stringa
 */
export function cleanCoachName(name?: string): string {
  if (!name) return '';
  return name.replace(/^mister\s+/i, '').trim();
}

/**
 * Formatta un nome allenatore garantendo l'elencazione per Cognome Nome,
 * senza prefisso "Mister".
 */
export function formatCoachBySurname(rawName: string): string {
  const clean = rawName.trim();
  if (!clean) return '';
  const withoutMister = clean.replace(/^mister\s+/i, '').trim();
  const lower = withoutMister.toLowerCase();
  if (KNOWN_COACH_MAP[lower]) {
    return KNOWN_COACH_MAP[lower];
  }
  const parts = withoutMister.split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  if (parts.length === 3 && /^(della|de|di|del|da|lo|la)$/i.test(parts[1])) {
    const prefix = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    return `${prefix} ${parts[2]} ${parts[0]}`;
  }
  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, parts.length - 1).join(' ');
  return `${lastName} ${firstNames}`;
}

/**
 * Ordina alfabeticamente una lista di allenatori in base al cognome
 */
export function sortCoachesBySurname(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const cleanA = a.replace(/^mister\s+/i, '').trim();
    const cleanB = b.replace(/^mister\s+/i, '').trim();
    return cleanA.localeCompare(cleanB, 'it', { sensitivity: 'base' });
  });
}

export const DEFAULT_ZONES = {
  sideLeft: { team: '', coach: '', notes: '', coaches: [''] },
  sideRight: { team: '', coach: '', notes: '', coaches: [''] },
  topLeft: { team: '', coach: '', notes: '' },
  topRight: { team: '', coach: '', notes: '' },
  centerLeft: {
    team: '',
    coach: '',
    notes: '',
    slots: [{ team: '', coach: '' }]
  },
  centerRight: {
    team: '',
    coach: '',
    notes: '',
    slots: [{ team: '', coach: '' }]
  }
};

export const INITIAL_FIELD_PLANS: FieldTrainingPlan[] = [
  {
    id: 'plan-lunedi-1700',
    day: 'Lunedì',
    time: '17:00 - 18:30',
    notes: 'Inizio seduta pomeridiana attività di base',
    zones: {
      sideLeft: { team: '2019', coach: 'Rossi', notes: '' },
      sideRight: { team: '2020/21', coach: 'Bianchi', notes: '' },
      topLeft: { team: '2017', coach: 'De Luca', notes: '' },
      topRight: { team: '2018', coach: 'Ferrari', notes: '' },
      centerLeft: {
        team: '2016',
        coach: 'Romano',
        notes: '',
        slots: [
          { team: '2016', coach: 'Romano' },
          { team: '2017', coach: 'De Luca' }
        ]
      },
      centerRight: {
        team: '2014',
        coach: 'Conti',
        notes: '',
        slots: [
          { team: '2014', coach: 'Conti' }
        ]
      }
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
