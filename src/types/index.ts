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
  parentPhone?: string;
  parentId?: string | null;
  teamId: string;
  categoria?: string;
  gruppoSquadra?: string;
  teamName?: string;
  team?: string;
  createdAt?: unknown;
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
  | 'tab-locker-rooms';

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

