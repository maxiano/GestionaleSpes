export type UserRole = 'admin' | 'coach' | 'parent';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  teamId?: string;
  teams?: string[];
  childIds?: string[];
  childId?: string;
  createdAt?: unknown;
}

export interface Player {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  dob?: string | null;
  jersey?: string;
  role?: string;
  medicalExp?: string | null;
  parentPhone?: string; // Tel. Padre (o Genitore 1)
  parentPhone2?: string; // Tel. Madre (o Genitore 2)
  parentPhones?: string[]; // Array di telefoni genitori normalizzati
  parentId?: string | null;
  parentIds?: string[]; // Array UID genitori collegati (padre e madre)
  teamId: string;
  categoria?: string;
  gruppoSquadra?: string;
  teamName?: string;
  team?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'injured' | 'late';

export interface AttendanceRecord {
  id?: string;
  playerId: string;
  name: string;
  status: AttendanceStatus;
  present?: boolean;
  absent?: boolean;
}

export interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  teamId: string;
  notes?: string;
  records?: AttendanceRecord[];
  record?: AttendanceRecord[];
  presenze?: AttendanceRecord[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Callup {
  id: string;
  teamId: string;
  opponent: string;
  location: string;
  date: string;
  matchTime: string;
  gatheringTime: string;
  players: (string | { id?: string; playerId?: string; name?: string; playerName?: string })[];
  responses?: Record<string, 'confirmed' | 'present' | 'absent' | string>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MatchHistoryRecord {
  id: string;
  matchId?: string;
  playerId?: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  status?: string;
  updatedAt?: string;
}

export interface Tournament {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  createdAt?: unknown;
}

export interface TournamentMatch {
  id: string;
  teamId: string;
  tournamentId: string;
  tournament?: string;
  match: string;
  date: string;
  time: string;
  location?: string;
  played: boolean;
  result?: string;
}

export interface StaffAttendance {
  id: string;
  date: string;
  coachId: string;
  status: 'Presente' | 'Assente';
  replacementId?: string | null;
  notes?: string;
  createdAt?: unknown;
}

export interface StaffEquipment {
  id: string;
  coachId: string;
  itemDescription: string;
  date: string;
  createdAt?: string;
}

export type ActiveTab =
  | 'tab-roster'
  | 'tab-attendance'
  | 'tab-monthly'
  | 'tab-callup'
  | 'tab-tournaments'
  | 'tab-staff'
  | 'tab-parents'
  | 'tab-staff-attendance'
  | 'tab-locker-rooms'
  | 'tab-field-diagram';

export interface FieldTrainingZoneSlot {
  team: string;
  coach: string;
}

export interface FieldTrainingZone {
  team: string;
  coach: string;
  notes?: string;
  // Supporto fino a 3 squadre e 3 mister per zona (in particolare metà campo centrale)
  team2?: string;
  coach2?: string;
  team3?: string;
  coach3?: string;
  slots?: FieldTrainingZoneSlot[];
  // Supporto lista di più mister (es. per campi laterali)
  coaches?: string[];
}

export interface FieldTrainingPlan {
  id: string; // e.g. "lunedi-1700"
  day: string; // "Lunedì", "Martedì", etc.
  time: string; // "17:00 - 18:30"
  notes?: string;
  zones: {
    sideLeft: FieldTrainingZone;     // Rettangolo laterale SX (costruito sul lato minore SX del rettangolo centrale)
    sideRight: FieldTrainingZone;    // Rettangolo laterale DX (costruito sul lato minore DX del rettangolo centrale)
    topLeft: FieldTrainingZone;      // Rettangolo superiore SX (costruito sul lato superiore del rettangolo centrale)
    topRight: FieldTrainingZone;     // Rettangolo superiore DX (costruito sul lato superiore del rettangolo centrale)
    centerLeft: FieldTrainingZone;   // Rettangolo centrale grande - metà SX
    centerRight: FieldTrainingZone;  // Rettangolo centrale grande - metà DX
  };
  updatedAt?: string;
}

export interface LockerAssignment {
  id: string;
  day: string;
  time: string;
  category: string;
  lockerRoom: string;
  field: string;
  notes?: string;
}

export interface LockerSchedule {
  id?: string;
  weekTitle: string;
  generalNotes: string[];
  assignments: LockerAssignment[];
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'tournament' | 'locker_room' | 'match' | 'general';
  targetTeamId?: string; // e.g. "2014" or "ALL"
  targetRole?: 'coach' | 'admin' | 'parent' | 'all';
  targetUserId?: string;
  createdAt: string;
  readBy?: string[];
  data?: Record<string, any>;
}

