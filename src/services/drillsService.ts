import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from './firebase';
import { TacticalDrill, DrillElement, DrillLine } from '../types';

const DRILLS_STORAGE_KEY = 'spes_tactical_drills_v1';

export const DRILL_PHASES = [
  'Riscaldamento & Attivazione',
  'Tecnica & Coordinativo',
  'Possesso Palla & Rondo',
  'Tattica & Costruzione',
  'Partita a Tema & Situazioni',
  '1v1 / Duelli & Finalizzazione',
  'Settore Portieri'
];

export const DRILL_CATEGORIES = [
  'Tutte le Categorie',
  'Esordienti (2014 e 2015)',
  'Pulcini (2016 e 2017)',
  'Primi Calci (2018 e 2019)',
  'Piccoli Amici (2020 e 2021)',
  'Settore Agonistico',
  'Portieri'
];

export const DRILL_TACTICAL_ZONES = [
  'Zona di costruzione bassa',
  'Zona di costruzione alta',
  'Zona di finalizzazione'
] as const;

export type DrillTacticalZone = (typeof DRILL_TACTICAL_ZONES)[number];

/**
 * Normalizza le categorie per compatibilità tra versioni e formati
 */
export function normalizeDrillCategory(cat?: string): string {
  if (!cat) return 'Pulcini (2016 e 2017)';
  const c = cat.toLowerCase().trim();
  if (c === 'tutte' || c === 'tutte le categorie') return 'Tutte le Categorie';
  if (c.includes('2014') || c.includes('2015') || (c.includes('esordienti') && !c.includes('pulcini'))) {
    return 'Esordienti (2014 e 2015)';
  }
  if (c.includes('2016') || c.includes('2017') || c.includes('pulcini')) {
    return 'Pulcini (2016 e 2017)';
  }
  if (c.includes('2018') || c.includes('2019') || c.includes('primi calc') || c.includes('primi calcio')) {
    return 'Primi Calci (2018 e 2019)';
  }
  if (c.includes('2020') || c.includes('2021') || c.includes('piccoli amici')) {
    return 'Piccoli Amici (2020 e 2021)';
  }
  if (c.includes('agonistic')) {
    return 'Settore Agonistico';
  }
  if (c.includes('portier')) {
    return 'Portieri';
  }
  return cat;
}

export const INITIAL_TACTICAL_DRILLS: TacticalDrill[] = [
  {
    id: 'drill-rondo-4v2-transizione',
    title: 'Rondo 4v2 con Ricerca del Terzo Uomo',
    category: 'Pulcini (2016 e 2017)',
    phase: 'Possesso Palla & Rondo',
    tacticalZone: 'Zona di costruzione bassa',
    intensity: 'Media',
    durationMinutes: 15,
    playerCount: '6 giocatori per quadrato',
    pitchDimensions: '15 x 15 metri',
    equipmentNeeded: '4 cinesini gialli, 4 casacche blu, 2 casacche rosse, 3 palloni',
    objectivesPrimary: 'Mantenimento del possesso, trasmissione rasoterra e ricerca del compagno libero (terzo uomo).',
    objectivesSecondary: 'Pressione immediata in transizione negativa e orientamento del corpo prima della ricezione.',
    description: 'In uno spazio quadrato di 15x15m, 4 giocatori blu all\'esterno si muovono lungo i lati e mantengono il possesso palla contro 2 difensori rossi all\'interno. Dopo 6 passaggi consecutivi la squadra in possesso guadagna 1 punto. Se un difensore intercetta, cerca di trasmettere subito palla fuori o al compagno di pressione per scambiarsi di ruolo con chi ha sbagliato.',
    variants: '1) Massimo due tocchi per i possessori; 2) Passaggio filtrante obbligatorio tra i due difensori per raddoppiare i punti; 3) Un giocatore blu può entrare al centro a turno per fare da appoggio interno.',
    coachingPoints: 'Attenzione alla postura di ricezione: corpo aperto verso il campo, controllo orientato con il piede più lontano dal difensore, passaggi forti e precisi sul piede dominante del compagno.',
    pitchType: 'box',
    elements: [
      { id: 'b1', type: 'player_blue', x: 15, y: 50, label: 'B1' },
      { id: 'b2', type: 'player_blue', x: 50, y: 15, label: 'B2' },
      { id: 'b3', type: 'player_blue', x: 85, y: 50, label: 'B3' },
      { id: 'b4', type: 'player_blue', x: 50, y: 85, label: 'B4' },
      { id: 'r1', type: 'player_red', x: 40, y: 45, label: 'R1' },
      { id: 'r2', type: 'player_red', x: 60, y: 55, label: 'R2' },
      { id: 'ball1', type: 'ball', x: 22, y: 50 },
      { id: 'c1', type: 'disc_yellow', x: 10, y: 10 },
      { id: 'c2', type: 'disc_yellow', x: 90, y: 10 },
      { id: 'c3', type: 'disc_yellow', x: 90, y: 90 },
      { id: 'c4', type: 'disc_yellow', x: 10, y: 90 }
    ],
    lines: [
      {
        id: 'l1',
        style: 'pass',
        points: [{ x: 18, y: 48 }, { x: 45, y: 18 }]
      },
      {
        id: 'l2',
        style: 'run',
        points: [{ x: 40, y: 45 }, { x: 30, y: 35 }]
      }
    ],
    authorId: 'staff-spes-system',
    authorName: 'Mister Staff SPES',
    authorRole: 'Responsabile Tecnico',
    isShared: true,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z'
  },
  {
    id: 'drill-costruzione-bassa-4v3',
    title: 'Costruzione dal Basso 4+Portiere vs 3 in Pressing',
    category: 'Esordienti (2014 e 2015)',
    phase: 'Tattica & Costruzione',
    tacticalZone: 'Zona di costruzione bassa',
    intensity: 'Alta',
    durationMinutes: 20,
    playerCount: '8-10 giocatori',
    pitchDimensions: 'Metà campo',
    equipmentNeeded: '1 porta regolamentare, 2 porticine per meta, 6 cinesini, casacche blu e rosse',
    objectivesPrimary: 'Uscita palla al piede dalla prima zona di costruzione sfruttando la superiorità numerica del portiere.',
    objectivesSecondary: 'Scaglionamento dei difensori, attacco rapido alla profondità e transizione difensiva se persa palla.',
    description: 'Il portiere avvia l\'azione dal fondo. La linea a 4 blu (2 centrali aperti ai lati dell\'area e 2 terzini alti in ampiezza) deve superare la linea di pressing dei 3 attaccanti rossi per condurre palla oltre la linea di metà campo o segnare in una delle due porticine laterali. Se i rossi recuperano palla attaccano la porta grande entro 8 secondi.',
    variants: '1) Aggiungere un vertice basso (mediano) per creare il rombo di costruzione; 2) Gli attaccanti rossi possono pressare solo dopo il primo tocco del portiere.',
    coachingPoints: 'I centrali devono aprirsi al limite dell\'area per costringere i primi pressatori ad allargarsi. Il portiere deve essere considerato un giocatore di movimento a tutti gli effetti.',
    pitchType: 'half',
    elements: [
      { id: 'gk1', type: 'player_gk', x: 50, y: 88, label: 'GK' },
      { id: 'b1', type: 'player_blue', x: 30, y: 75, label: 'B4' },
      { id: 'b2', type: 'player_blue', x: 70, y: 75, label: 'B5' },
      { id: 'b3', type: 'player_blue', x: 15, y: 55, label: 'B2' },
      { id: 'b4', type: 'player_blue', x: 85, y: 55, label: 'B3' },
      { id: 'r1', type: 'player_red', x: 35, y: 62, label: 'R9' },
      { id: 'r2', type: 'player_red', x: 65, y: 62, label: 'R11' },
      { id: 'r3', type: 'player_red', x: 50, y: 48, label: 'R10' },
      { id: 'mg1', type: 'mini_goal', x: 20, y: 15 },
      { id: 'mg2', type: 'mini_goal', x: 80, y: 15 },
      { id: 'ball1', type: 'ball', x: 50, y: 82 }
    ],
    lines: [
      {
        id: 'l1',
        style: 'pass',
        points: [{ x: 50, y: 82 }, { x: 32, y: 73 }]
      },
      {
        id: 'l2',
        style: 'run',
        points: [{ x: 35, y: 62 }, { x: 33, y: 69 }]
      },
      {
        id: 'l3',
        style: 'pass',
        points: [{ x: 30, y: 71 }, { x: 18, y: 57 }]
      }
    ],
    authorId: 'staff-spes-system',
    authorName: 'Mister Staff SPES',
    authorRole: 'Mister Esordienti',
    isShared: true,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 'drill-1v1-conclusione-rapida',
    title: '1v1 Frontale con Conclusione e Transizione Immediata',
    category: 'Primi Calci (2018 e 2019)',
    phase: '1v1 / Duelli & Finalizzazione',
    tacticalZone: 'Zona di finalizzazione',
    intensity: 'Alta',
    durationMinutes: 15,
    playerCount: '8-12 bambini',
    pitchDimensions: '20 x 15 metri',
    equipmentNeeded: '1 porta grande con portiere, 4 coni, 1 sagoma, palloni a volontà',
    objectivesPrimary: 'Dribbling frontale, finta di corpo, accelerazione e tiro in porta.',
    objectivesSecondary: 'Tempismo difensivo (non farsi saltare) e reazione immediata alla perdita del pallone.',
    description: 'L\'attaccante blu parte palla al piede dall\'esterno, punta il cono centrale o la sagoma, esegue una finta per eludere il difensore rosso in uscita e conclude a rete prima della linea dei 7 metri. Appena finita l\'azione, l\'attaccante diventa difensore per il compagno successivo della fila opposta.',
    variants: '1) Obbligo di conclusione con il piede debole; 2) Se il difensore conquista la palla può fare punto calciando in una porticina posizionata sulla linea di partenza.',
    coachingPoints: 'Incoraggiare il coraggio nel puntare l\'avversario: cambiare velocità dopo la finta, non rallentare al momento del tiro.',
    pitchType: 'penalty_box',
    elements: [
      { id: 'gk1', type: 'player_gk', x: 50, y: 92, label: 'GK' },
      { id: 'r1', type: 'player_red', x: 50, y: 60, label: 'R' },
      { id: 'b1', type: 'player_blue', x: 50, y: 22, label: 'B' },
      { id: 'c1', type: 'cone', x: 42, y: 45 },
      { id: 'c2', type: 'cone', x: 58, y: 45 },
      { id: 'ball1', type: 'ball', x: 50, y: 27 }
    ],
    lines: [
      {
        id: 'l1',
        style: 'dribble',
        points: [{ x: 50, y: 27 }, { x: 46, y: 42 }, { x: 55, y: 48 }, { x: 48, y: 55 }]
      },
      {
        id: 'l2',
        style: 'shot',
        points: [{ x: 48, y: 55 }, { x: 44, y: 88 }]
      }
    ],
    authorId: 'staff-spes-system',
    authorName: 'Mister Staff SPES',
    authorRole: 'Istruttore Primi Calci',
    isShared: true,
    createdAt: '2026-09-03T11:00:00.000Z',
    updatedAt: '2026-09-03T11:00:00.000Z'
  },
  {
    id: 'drill-piccoli-amici-castello',
    title: 'La Corsa al Castello Incantato: Guida della Palla e Conclusione',
    category: 'Piccoli Amici (2020 e 2021)',
    phase: 'Tecnica & Coordinativo',
    tacticalZone: 'Zona di costruzione alta',
    intensity: 'Media',
    durationMinutes: 15,
    playerCount: '6-8 bambini',
    pitchDimensions: '15 x 12 metri',
    equipmentNeeded: '6 cinesini colorati, 2 porticine o coni per porta, palloni n°3 o 4 leggeri',
    objectivesPrimary: 'Confidenza e divertimento con il pallone, guida della palla con entrambi i piedi e tiro finale.',
    objectivesSecondary: 'Sviluppo degli schemi motori di base (corsa, cambio di direzione, arresto della palla con la suola).',
    description: 'I bambini partono uno alla volta dalla linea di partenza guidando la palla nella "foresta di cinesini" (slalom o guida libera senza toccare i cinesini). Giunti alla "zona magica", fermano il pallone con la suola e calciano nella porticina per conquistare il castello.',
    variants: '1) Cambiare il piede di guida (solo destro o solo sinistro); 2) Chiamata del colore della porta al momento del tiro ("Porta Gialla" o "Porta Verde").',
    coachingPoints: 'Mantenere un clima giocoso e positivo. Incoraggiare tocchi leggeri e festeggiare ogni gol o tentativo con entusiasmo.',
    pitchType: 'box',
    elements: [
      { id: 'b1', type: 'player_blue', x: 20, y: 75, label: 'B1' },
      { id: 'b2', type: 'player_blue', x: 20, y: 88, label: 'B2' },
      { id: 'c1', type: 'disc_yellow', x: 35, y: 65 },
      { id: 'c2', type: 'disc_red', x: 50, y: 45 },
      { id: 'c3', type: 'disc_blue', x: 65, y: 65 },
      { id: 'mg1', type: 'mini_goal', x: 80, y: 35 },
      { id: 'ball1', type: 'ball', x: 25, y: 75 }
    ],
    lines: [
      {
        id: 'l1',
        style: 'dribble',
        points: [{ x: 25, y: 75 }, { x: 42, y: 55 }, { x: 58, y: 52 }, { x: 70, y: 45 }]
      },
      {
        id: 'l2',
        style: 'shot',
        points: [{ x: 70, y: 45 }, { x: 80, y: 35 }]
      }
    ],
    authorId: 'staff-spes-system',
    authorName: 'Mister Staff SPES',
    authorRole: 'Istruttore Piccoli Amici',
    isShared: true,
    createdAt: '2026-09-04T09:30:00.000Z',
    updatedAt: '2026-09-04T09:30:00.000Z'
  }
];

/**
 * Pulisce in profondità qualsiasi valore undefined prima di salvare in Firestore
 */
function cleanUndefinedDeep<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => cleanUndefinedDeep(item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, propVal] of Object.entries(val)) {
    if (propVal !== undefined) {
      result[key] = cleanUndefinedDeep(propVal);
    }
  }
  return result as T;
}

export function sanitizeDrillForStorage(d: TacticalDrill): TacticalDrill {
  const cleanElements: DrillElement[] = (d.elements || [])
    .filter(Boolean)
    .map((e) => ({
      id: e.id || `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: e.type,
      x: Number.isFinite(e.x) ? Math.max(0, Math.min(100, e.x)) : 50,
      y: Number.isFinite(e.y) ? Math.max(0, Math.min(100, e.y)) : 50,
      label: e.label || '',
      rotation: Number.isFinite(e.rotation) ? e.rotation : 0,
      scale: Number.isFinite(e.scale) ? e.scale : 1.0
    }));

  const cleanLines: DrillLine[] = (d.lines || [])
    .filter(Boolean)
    .map((l) => ({
      id: l.id || `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      style: l.style || 'pass',
      color: l.color || '',
      width: Number.isFinite(l.width) ? l.width : undefined,
      points: (l.points || []).map((p) => ({
        x: Number.isFinite(p.x) ? p.x : 0,
        y: Number.isFinite(p.y) ? p.y : 0
      }))
    }));

  return {
    id: d.id || `drill-${Date.now()}`,
    title: (d.title || '').trim() || 'Nuova Esercitazione',
    category: d.category || 'Tutte le Categorie',
    phase: d.phase || 'Possesso Palla & Rondo',
    tacticalZone: d.tacticalZone || 'Zona di costruzione bassa',
    intensity: d.intensity || 'Media',
    durationMinutes: Number(d.durationMinutes) || 15,
    playerCount: d.playerCount || '',
    pitchDimensions: d.pitchDimensions || '',
    equipmentNeeded: d.equipmentNeeded || '',
    objectivesPrimary: d.objectivesPrimary || '',
    objectivesSecondary: d.objectivesSecondary || '',
    description: d.description || '',
    variants: d.variants || '',
    coachingPoints: d.coachingPoints || '',
    pitchType: d.pitchType || 'half',
    elements: cleanElements,
    lines: cleanLines,
    previewImageDataUrl: d.previewImageDataUrl || '',
    authorId: d.authorId || '',
    authorName: d.authorName || 'Mister SPES',
    authorRole: d.authorRole || 'Allenatore',
    isShared: d.isShared !== false,
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Recupera tutti gli esercizi tattici da Firestore con fallback su localStorage
 */
export async function getTacticalDrills(): Promise<TacticalDrill[]> {
  try {
    const q = query(collection(db, 'drills'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const drills = snap.docs.map((d) => {
        const item = d.data() as TacticalDrill;
        return {
          id: d.id,
          ...item,
          category: normalizeDrillCategory(item.category)
        };
      }) as TacticalDrill[];

      // Aggiorna cache locale
      if (typeof window !== 'undefined') {
        localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify(drills));
      }
      return drills;
    }
  } catch (err) {
    console.warn('Recupero drills da Firestore non riuscito, uso cache locale:', err);
  }

  // Fallback cache locale
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(DRILLS_STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: TacticalDrill) => ({
            ...item,
            category: normalizeDrillCategory(item.category)
          }));
        }
      } catch (e) {
        console.error('Errore parsing cache locale drills:', e);
      }
    }
  }

  // Se primo avvio senza dati, salva gli esercizi iniziali di esempio
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify(INITIAL_TACTICAL_DRILLS));
  }
  return INITIAL_TACTICAL_DRILLS;
}

/**
 * Salva un'esercitazione in Firestore e cache locale
 */
export async function saveTacticalDrill(drill: TacticalDrill): Promise<TacticalDrill> {
  const sanitized = sanitizeDrillForStorage(drill);

  // 1. Aggiorna cache locale
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(DRILLS_STORAGE_KEY);
      const list: TacticalDrill[] = local ? JSON.parse(local) : [];
      const idx = list.findIndex((item) => item.id === sanitized.id);
      if (idx >= 0) {
        list[idx] = sanitized;
      } else {
        list.unshift(sanitized);
      }
      localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Errore salvataggio cache locale drill:', e);
    }
  }

  // 2. Salva su Firestore
  try {
    const docRef = doc(db, 'drills', sanitized.id);
    const cleanPayload = cleanUndefinedDeep(sanitized);
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    console.error('Errore salvataggio Firestore esercitazione:', err);
    throw err;
  }

  return sanitized;
}

/**
 * Elimina un'esercitazione da Firestore e cache locale
 */
export async function deleteTacticalDrill(drillId: string): Promise<void> {
  // 1. Cache locale
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(DRILLS_STORAGE_KEY);
      if (local) {
        const list: TacticalDrill[] = JSON.parse(local);
        const filtered = list.filter((item) => item.id !== drillId);
        localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Errore rimozione cache locale drill:', e);
    }
  }

  // 2. Firestore
  try {
    await deleteDoc(doc(db, 'drills', drillId));
  } catch (err) {
    console.error('Errore eliminazione Firestore esercitazione:', err);
    throw err;
  }
}

/**
 * Clona un'esercitazione per permettere a un mister di personalizzarla
 */
export async function duplicateTacticalDrill(
  original: TacticalDrill,
  authorId: string,
  authorName: string,
  authorRole: string = 'Allenatore'
): Promise<TacticalDrill> {
  const newDrill: TacticalDrill = {
    ...original,
    id: `drill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: `${original.title} (Copia)`,
    authorId,
    authorName,
    authorRole,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return await saveTacticalDrill(newDrill);
}
