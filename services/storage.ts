
import { AppState } from '../types';

const STORAGE_KEY = 'guard_system_v3_db';

const INITIAL_DATA: AppState = {
  employees: [
    { id: 'admin-0', name: 'Administrador', active: true, role: 'ADMIN' },
    { id: 'e-1', name: 'Pedro Souza', active: true, role: 'GUARD' },
    { id: 'e-2', name: 'Matheus Silva', active: true, role: 'GUARD' },
    { id: 'e-3', name: 'Nicolas Santos', active: true, role: 'GUARD' },
  ],
  posts: [
    {
      id: 'p-1',
      name: 'Posto São Miguel',
      code: 'MIGUEL-QR',
      latitude: -23.5505,
      longitude: -46.6333,
      radiusMeters: 100,
      minIntervalMinutes: 60,
      qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MIGUEL-QR',
      allowedEmployeeIds: ['e-1', 'e-2', 'e-3'],
      dayShiftCapacity: 1,
      nightShiftCapacity: 1
    }
  ],
  plannedShifts: [
    { id: 'ps-1', postId: 'p-1', employeeId: 'e-2', date: new Date().toISOString().split('T')[0], shift: 'DAY' }
  ],
  attendanceRecords: []
};

export const db = {
  get: (): AppState => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : INITIAL_DATA;
  },
  save: (data: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
