
export interface Employee {
  id: string;
  name: string;
  active: boolean;
  role: 'GUARD' | 'ADMIN';
}

export type ShiftType = 'DAY' | 'NIGHT';

export interface Post {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  minIntervalMinutes: number;
  qrUrl: string;
  allowedEmployeeIds: string[]; 
  dayShiftCapacity: number;
  nightShiftCapacity: number;
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
  type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT';
  status: 'VALID' | 'SUBSTITUTION' | 'MISMATCH';
  substitutedEmployeeId?: string;
  photos?: string[]; // Suporte para fotos das rondas
}

export interface AppState {
  employees: Employee[];
  posts: Post[];
  plannedShifts: PlannedShift[];
  attendanceRecords: AttendanceRecord[];
}
