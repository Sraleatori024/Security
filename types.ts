

export interface Employee {
  id: string;
  name: string;
  active: boolean;
  role: 'GUARD' | 'ADMIN';
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'DAY';

export interface Post {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  altitude: number; // Campo solicitado para GPS completo
  radiusMeters: number;
  minIntervalMinutes: number;
  qrUrl: string;
  allowedEmployeeIds: string[]; 
  // Configuração de 3 turnos
  morningActive?: boolean;
  morningStart?: string;
  morningEnd?: string;
  afternoonActive?: boolean;
  afternoonStart?: string;
  afternoonEnd?: string;
  nightActive?: boolean;
  nightStart?: string;
  nightEnd?: string;
  // Fallback para 2 turnos se necessário
  isDayActive?: boolean;
  dayStart?: string;
  dayEnd?: string;
  isNightActive?: boolean;
  // Removed duplicate nightStart and nightEnd here
  dayShiftCapacity?: number;
  nightShiftCapacity?: number;
}

export interface PlannedShift {
  id: string;
  postId: string;
  employeeId: string;
  date: string; // ISO string (YYYY-MM-DD)
  shift: ShiftType;
}

export interface AttendanceRecord {
  id: string;
  timestamp: string;
  employeeId: string;
  postId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT';
  status: 'VALID' | 'SUBSTITUTION' | 'MISMATCH';
  substitutedEmployeeId?: string;
  photos?: string[]; 
}

export interface AppState {
  employees: Employee[];
  posts: Post[];
  plannedShifts: PlannedShift[];
  attendanceRecords: AttendanceRecord[];
}