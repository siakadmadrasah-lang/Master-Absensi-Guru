import * as XLSX from 'xlsx';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile, HolidayItem, AttendanceStatus } from '../types';

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

/**
 * Returns local YYYY-MM-DD date string without UTC timezone offset conversion issues
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes any date string (ISO, timestamp, slashed, etc) to standard YYYY-MM-DD
 */
export function normalizeDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  if (trimmed.includes(' ')) {
    return trimmed.split(' ')[0];
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts[0].length === 4) {
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    } else if (parts[2]?.length === 4) {
      return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }
  }
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }
  }
  return trimmed;
}

export function isTeacherRecordMatch(recordTeacherId: string | number | undefined, teacher: Teacher | undefined): boolean {
  if (!recordTeacherId || !teacher) return false;
  const rId = String(recordTeacherId).trim().toLowerCase();
  if (!rId) return false;

  const tId = String(teacher.id || '').trim().toLowerCase();
  if (tId && rId === tId) return true;

  if (teacher.nik && rId === String(teacher.nik).trim().toLowerCase()) return true;
  if (teacher.nip && rId === String(teacher.nip).trim().toLowerCase()) return true;
  if (teacher.nuptk && rId === String(teacher.nuptk).trim().toLowerCase()) return true;
  if (teacher.pegId && rId === String(teacher.pegId).trim().toLowerCase()) return true;
  if (teacher.npk && rId === String(teacher.npk).trim().toLowerCase()) return true;
  if (teacher.email && rId === teacher.email.trim().toLowerCase()) return true;

  // Fingerprint ID matching (1 == "1", "01" == 1, etc.)
  if (teacher.fingerprintId !== undefined && teacher.fingerprintId !== null) {
    const fIdStr = String(teacher.fingerprintId).trim();
    if (rId === fIdStr) return true;
    const rNum = parseInt(rId.replace(/\D/g, ''), 10);
    if (!isNaN(rNum) && rNum === Number(teacher.fingerprintId)) return true;
  }

  // Name matching (ignoring special characters)
  if (teacher.name) {
    const cleanTName = teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanRId = rId.replace(/[^a-z0-9]/g, '');
    if (cleanTName && cleanRId && (cleanTName === cleanRId || cleanRId.includes(cleanTName) || cleanTName.includes(cleanRId))) {
      return true;
    }
  }

  return false;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const dayName = INDONESIAN_DAYS[d.getDay()];
  const monthName = INDONESIAN_MONTHS[month];
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = INDONESIAN_MONTHS[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

export function getEstimatedHijriDate(date: Date = new Date()): string {
  // Approximate Hijri calendar calculation for Indonesian Madrasah context
  // 2026 August correlates with Safar / Rabiul Awwal 1448 H
  const hijriMonths = [
    'Muharram', 'Safar', 'Rabiul Awwal', 'Rabiul Akhir',
    'Jumadil Ula', 'Jumadil Akhir', 'Rajab', 'Sya\'ban',
    'Ramadhan', 'Syawal', 'Dzulqa\'dah', 'Dzulhijjah'
  ];
  
  // Approximate offset for 2026-08 (16 August 2026 = ~2 Safar 1448 H)
  const diffDays = Math.floor((date.getTime() - new Date(2026, 7, 16).getTime()) / (1000 * 60 * 60 * 24));
  let hDay = 2 + diffDays;
  let hMonthIdx = 1; // Safar
  let hYear = 1448;

  while (hDay > 29) {
    hDay -= 29;
    hMonthIdx = (hMonthIdx + 1) % 12;
    if (hMonthIdx === 0) hYear++;
  }
  while (hDay < 1) {
    hDay += 29;
    hMonthIdx = (hMonthIdx - 1 + 12) % 12;
  }

  return `${hDay} ${hijriMonths[hMonthIdx]} ${hYear} H`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isDateHoliday(dateStr: string, holidays: HolidayItem[]): HolidayItem | undefined {
  return holidays.find(h => h.date === dateStr);
}

/**
 * Returns formatted teacher identifier for signature blocks and documents:
 * Priority: NIP -> NUPTK -> Peg ID -> NPK -> fallback '-'
 */
export function getTeacherSignatureId(teacher?: Partial<Teacher> | null): string {
  if (!teacher) return 'NIP. -';
  const nip = teacher.nip?.trim();
  if (nip && nip !== '-' && nip !== '') {
    return `NIP. ${nip}`;
  }
  const nuptk = teacher.nuptk?.trim();
  if (nuptk && nuptk !== '-' && nuptk !== '') {
    return `NUPTK. ${nuptk}`;
  }
  const pegId = teacher.pegId?.trim();
  if (pegId && pegId !== '-' && pegId !== '') {
    return `Peg ID. ${pegId}`;
  }
  const npk = teacher.npk?.trim();
  if (npk && npk !== '-' && npk !== '') {
    return `NPK. ${npk}`;
  }
  return 'NIP/NUPTK. -';
}

export function getTeacherIdLabel(teacher?: Partial<Teacher> | null): { label: string; value: string } {
  if (!teacher) return { label: 'NIP / NUPTK', value: '-' };
  const nip = teacher.nip?.trim();
  if (nip && nip !== '-' && nip !== '') {
    return { label: 'NIP', value: nip };
  }
  const nuptk = teacher.nuptk?.trim();
  if (nuptk && nuptk !== '-' && nuptk !== '') {
    return { label: 'NUPTK', value: nuptk };
  }
  const pegId = teacher.pegId?.trim();
  if (pegId && pegId !== '-' && pegId !== '') {
    return { label: 'Peg ID', value: pegId };
  }
  const npk = teacher.npk?.trim();
  if (npk && npk !== '-' && npk !== '') {
    return { label: 'NPK', value: npk };
  }
  return { label: 'NIP / NUPTK', value: '-' };
}

export function isSunday(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0;
}

export function getDayOfWeekName(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return INDONESIAN_DAYS[d.getDay()];
}

export function calculateLateMinutes(checkInTime: string, limitTime: string, tolerance: number): number {
  if (!checkInTime || !limitTime) return 0;
  
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [limH, limM] = limitTime.split(':').map(Number);

  const inTotalM = inH * 60 + inM;
  const limTotalM = limH * 60 + limM;

  const diff = inTotalM - limTotalM;
  if (diff > tolerance) {
    return diff;
  }
  return 0;
}

// Get scheduled shift times for a given day of the week
export function getScheduleTimesForDay(
  schedule: WorkSchedule,
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
): {
  jamMasuk: string;
  jamPulang: string;
  isWorkDay: boolean;
  checkInStart: string;
  checkOutEnd: string;
  tolerance: number;
} {
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  if (isSunday) {
    return {
      jamMasuk: '-',
      jamPulang: '-',
      isWorkDay: false,
      checkInStart: '-',
      checkOutEnd: '-',
      tolerance: 0
    };
  }

  if (isSaturday) {
    if (schedule.workDaysCount === 5) {
      return {
        jamMasuk: '-',
        jamPulang: '-',
        isWorkDay: false,
        checkInStart: '-',
        checkOutEnd: '-',
        tolerance: 0
      };
    }
    return {
      jamMasuk: schedule.saturday.checkInLimit,
      jamPulang: schedule.saturday.checkOutStart,
      isWorkDay: true,
      checkInStart: schedule.saturday.checkInStart,
      checkOutEnd: schedule.saturday.checkOutEnd,
      tolerance: schedule.toleranceMinutes || 0
    };
  }

  if (isFriday) {
    return {
      jamMasuk: schedule.friday.checkInLimit,
      jamPulang: schedule.friday.checkOutStart,
      isWorkDay: true,
      checkInStart: schedule.friday.checkInStart,
      checkOutEnd: schedule.friday.checkOutEnd,
      tolerance: schedule.toleranceMinutes || 0
    };
  }

  // Monday - Thursday
  return {
    jamMasuk: schedule.mondayThursday.checkInLimit,
    jamPulang: schedule.mondayThursday.checkOutStart,
    isWorkDay: true,
    checkInStart: schedule.mondayThursday.checkInStart,
    checkOutEnd: schedule.mondayThursday.checkOutEnd,
    tolerance: schedule.toleranceMinutes || 0
  };
}

// Calculate TELAT / CEPAT (Menit)
export function getTelatCepatCalc(
  absenMasuk: string | undefined,
  jamMasuk: string | undefined,
  tolerance: number = 0
): {
  minutes: number;
  text: string;
  status: 'TEPAT' | 'TELAT' | 'CEPAT' | 'NONE';
} {
  if (!absenMasuk || !jamMasuk || jamMasuk === '-' || absenMasuk === '-') {
    return { minutes: 0, text: '-', status: 'NONE' };
  }

  const [inH, inM] = absenMasuk.split(':').map(Number);
  const [limH, limM] = jamMasuk.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(limH) || isNaN(limM)) {
    return { minutes: 0, text: '-', status: 'NONE' };
  }

  const inTotalM = inH * 60 + inM;
  const limTotalM = limH * 60 + limM;
  const diff = inTotalM - limTotalM;

  if (diff > tolerance) {
    return {
      minutes: diff,
      text: `Telat ${diff} m`,
      status: 'TELAT'
    };
  } else if (diff < 0) {
    const early = Math.abs(diff);
    return {
      minutes: early,
      text: `Cepat ${early} m`,
      status: 'CEPAT'
    };
  } else {
    return {
      minutes: 0,
      text: '0 m (Tepat)',
      status: 'TEPAT'
    };
  }
}

// Calculate PSW (Pulang Sebelum Waktu) / LEWAT WAKTU (Menit)
export function getPswLewatCalc(
  absenPulang: string | undefined,
  jamPulang: string | undefined
): {
  minutes: number;
  text: string;
  status: 'TEPAT' | 'PSW' | 'LEWAT' | 'NONE';
} {
  if (!absenPulang || !jamPulang || jamPulang === '-' || absenPulang === '-') {
    return { minutes: 0, text: '-', status: 'NONE' };
  }

  const [outH, outM] = absenPulang.split(':').map(Number);
  const [limH, limM] = jamPulang.split(':').map(Number);

  if (isNaN(outH) || isNaN(outM) || isNaN(limH) || isNaN(limM)) {
    return { minutes: 0, text: '-', status: 'NONE' };
  }

  const outTotalM = outH * 60 + outM;
  const limTotalM = limH * 60 + limM;
  const diff = outTotalM - limTotalM;

  if (diff < 0) {
    const pswMin = Math.abs(diff);
    return {
      minutes: pswMin,
      text: `PSW ${pswMin} m`,
      status: 'PSW'
    };
  } else if (diff > 0) {
    return {
      minutes: diff,
      text: `Lewat +${diff} m`,
      status: 'LEWAT'
    };
  } else {
    return {
      minutes: 0,
      text: '0 m (Tepat)',
      status: 'TEPAT'
    };
  }
}

export interface TeacherMonthlyDailyRow {
  day: number;
  dateStr: string;
  dayName: string;
  isSunday: boolean;
  holiday?: HolidayItem;
  record?: AttendanceRecord;
  jamMasuk: string;
  absenMasuk: string;
  telatCepat: string;
  telatCepatObj: { minutes: number; text: string; status: 'TEPAT' | 'TELAT' | 'CEPAT' | 'NONE' };
  jamPulang: string;
  absenPulang: string;
  pswLewat: string;
  pswLewatObj: { minutes: number; text: string; status: 'TEPAT' | 'PSW' | 'LEWAT' | 'NONE' };
  keterangan: string;
}

export interface TeacherMonthlyStats {
  countHadir: number;
  countTelat: number;
  countIzin: number;
  countSakit: number;
  countCuti: number;
  countDL: number;
  countAlpa: number;
  totalLateMinutes: number;
  totalWorkMinutes: number;
  attendanceRate: number;
  effectiveWorkingDays: number;
}

/**
 * Normalizes and classifies an attendance record into reliable statuses and tardiness minutes
 */
export function parseAttendanceRecordStatus(
  rec?: AttendanceRecord,
  jamMasuk?: string,
  tolerance: number = 0
): {
  status: AttendanceStatus;
  isHadirTepat: boolean;
  isTerlambat: boolean;
  isIzin: boolean;
  isSakit: boolean;
  isCuti: boolean;
  isDinasLuar: boolean;
  isAlpa: boolean;
  lateMinutes: number;
  workMinutes: number;
} {
  if (!rec) {
    return {
      status: 'ALPA',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes: 0,
    };
  }

  const rawStatus = (rec.status || '').toUpperCase().trim();
  const hasCheckIn = !!rec.checkInTime && rec.checkInTime !== '-' && rec.checkInTime !== '';
  let lateMinutes = Number(rec.lateMinutes) || 0;

  // Auto calculate late minutes if checkInTime is present and jamMasuk is provided
  if (hasCheckIn && jamMasuk && jamMasuk !== '-') {
    const calc = getTelatCepatCalc(rec.checkInTime, jamMasuk, tolerance);
    if (calc.status === 'TELAT') {
      lateMinutes = Math.max(lateMinutes, calc.minutes);
    }
  }

  let workMinutes = rec.workDurationMinutes || 0;
  if (!workMinutes && (hasCheckIn || rawStatus === 'HADIR' || rawStatus === 'TERLAMBAT' || rawStatus === 'DINAS_LUAR' || rawStatus === 'DL')) {
    if (rec.checkInTime && rec.checkOutTime && rec.checkInTime !== '-' && rec.checkOutTime !== '-') {
      const [inH, inM] = rec.checkInTime.split(':').map(Number);
      const [outH, outM] = rec.checkOutTime.split(':').map(Number);
      if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
        workMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
      }
    }
    if (!workMinutes) workMinutes = 420; // Default 7 jam kerja
  }

  if (rawStatus === 'TERLAMBAT' || rawStatus === 'TELAT' || rawStatus === 'LATE' || rawStatus === 'T') {
    return {
      status: 'TERLAMBAT',
      isHadirTepat: false,
      isTerlambat: true,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: lateMinutes > 0 ? lateMinutes : 15,
      workMinutes,
    };
  }

  if (rawStatus === 'HADIR' || rawStatus === 'PRESENT' || rawStatus === 'H') {
    if (lateMinutes > 0) {
      return {
        status: 'TERLAMBAT',
        isHadirTepat: false,
        isTerlambat: true,
        isIzin: false,
        isSakit: false,
        isCuti: false,
        isDinasLuar: false,
        isAlpa: false,
        lateMinutes,
        workMinutes,
      };
    }
    return {
      status: 'HADIR',
      isHadirTepat: true,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes,
    };
  }

  if (rawStatus === 'IZIN' || rawStatus === 'I' || rawStatus === 'PERMIT') {
    return {
      status: 'IZIN',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: true,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes: 0,
    };
  }

  if (rawStatus === 'SAKIT' || rawStatus === 'S' || rawStatus === 'SICK') {
    return {
      status: 'SAKIT',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: false,
      isSakit: true,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes: 0,
    };
  }

  if (rawStatus === 'CUTI' || rawStatus === 'C' || rawStatus === 'LEAVE') {
    return {
      status: 'CUTI',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: true,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes: 0,
    };
  }

  if (rawStatus === 'DINAS_LUAR' || rawStatus === 'DL' || rawStatus === 'DUTY') {
    return {
      status: 'DINAS_LUAR',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: true,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes,
    };
  }

  if (rawStatus === 'ALPA' || rawStatus === 'A' || rawStatus === 'TK' || rawStatus === 'ALPHA' || rawStatus === 'ABSENT') {
    return {
      status: 'ALPA',
      isHadirTepat: false,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: true,
      lateMinutes: 0,
      workMinutes: 0,
    };
  }

  // Fallback: If scan checkInTime exists
  if (hasCheckIn) {
    if (lateMinutes > 0) {
      return {
        status: 'TERLAMBAT',
        isHadirTepat: false,
        isTerlambat: true,
        isIzin: false,
        isSakit: false,
        isCuti: false,
        isDinasLuar: false,
        isAlpa: false,
        lateMinutes,
        workMinutes,
      };
    }
    return {
      status: 'HADIR',
      isHadirTepat: true,
      isTerlambat: false,
      isIzin: false,
      isSakit: false,
      isCuti: false,
      isDinasLuar: false,
      isAlpa: false,
      lateMinutes: 0,
      workMinutes,
    };
  }

  return {
    status: (rawStatus as AttendanceStatus) || 'HADIR',
    isHadirTepat: true,
    isTerlambat: false,
    isIzin: false,
    isSakit: false,
    isCuti: false,
    isDinasLuar: false,
    isAlpa: false,
    lateMinutes: 0,
    workMinutes,
  };
}

export function getTeacherMonthlyDailyRows(
  year: number,
  month: number,
  teacher: Teacher,
  attendanceRecords: AttendanceRecord[],
  holidays: HolidayItem[],
  schedule: WorkSchedule
): {
  dailyRows: TeacherMonthlyDailyRow[];
  stats: TeacherMonthlyStats;
} {
  const daysInMonth = getDaysInMonth(year, month);
  const dailyRows: TeacherMonthlyDailyRow[] = [];

  let countHadir = 0;
  let countTelat = 0;
  let countIzin = 0;
  let countSakit = 0;
  let countCuti = 0;
  let countDL = 0;
  let countAlpa = 0;
  let totalLateMinutes = 0;
  let totalWorkMinutes = 0;
  let effectiveWorkingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const isSun = dayOfWeek === 0;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = isDateHoliday(dateStr, holidays);
    const dayName = INDONESIAN_DAYS[dayOfWeek];

    const isWorkDay = schedule.workDaysCount === 6 ? !isSun : (!isSun && dayOfWeek !== 6);
    if (isWorkDay && !holiday) {
      effectiveWorkingDays++;
    }

    const rec = attendanceRecords.find(r => isTeacherRecordMatch(r.teacherId, teacher) && normalizeDateOnly(r.date) === dateStr);

    const schedTimes = getScheduleTimesForDay(schedule, dayOfWeek);
    const jamMasuk = schedTimes.jamMasuk;
    const jamPulang = schedTimes.jamPulang;

    const absenMasuk = rec?.checkInTime || '-';
    const absenPulang = rec?.checkOutTime || '-';

    const telatCepatObj = getTelatCepatCalc(rec?.checkInTime, jamMasuk, schedTimes.tolerance);
    const pswLewatObj = getPswLewatCalc(rec?.checkOutTime, jamPulang);

    let keterangan = '-';
    if (isSun) {
      keterangan = 'Libur Akhir Pekan (Ahad)';
    } else if (holiday) {
      keterangan = `Libur: ${holiday.name}`;
    } else if (rec) {
      const parsed = parseAttendanceRecordStatus(rec, jamMasuk, schedTimes.tolerance);

      if (rec.notes) {
        keterangan = rec.notes;
      } else if (parsed.isHadirTepat) {
        keterangan = rec.verificationMethod ? `Hadir (${rec.verificationMethod})` : 'Hadir (Fingerprint)';
      } else if (parsed.isTerlambat) {
        keterangan = `Terlambat ${parsed.lateMinutes || 0} mnt`;
      } else if (parsed.isIzin) {
        keterangan = 'Izin';
      } else if (parsed.isSakit) {
        keterangan = 'Sakit';
      } else if (parsed.isCuti) {
        keterangan = 'Cuti';
      } else if (parsed.isDinasLuar) {
        keterangan = 'Dinas Luar';
      } else if (parsed.isAlpa) {
        keterangan = 'Tanpa Keterangan (Alpa)';
      } else {
        keterangan = rec.status || 'Hadir';
      }

      if (parsed.isHadirTepat) countHadir++;
      else if (parsed.isTerlambat) {
        countTelat++;
        totalLateMinutes += parsed.lateMinutes;
      } else if (parsed.isIzin) countIzin++;
      else if (parsed.isSakit) countSakit++;
      else if (parsed.isCuti) countCuti++;
      else if (parsed.isDinasLuar) countDL++;
      else if (parsed.isAlpa) countAlpa++;

      totalWorkMinutes += parsed.workMinutes;
    } else if (isWorkDay) {
      const today = new Date();
      const checkDate = new Date(year, month - 1, day);
      if (checkDate <= today) {
        keterangan = 'Alpa (Tidak Ada Data)';
        countAlpa++;
      } else {
        keterangan = 'Belum Terlaksana';
      }
    }

    dailyRows.push({
      day,
      dateStr,
      dayName,
      isSunday: isSun,
      holiday,
      record: rec,
      jamMasuk,
      absenMasuk,
      telatCepat: telatCepatObj.text,
      telatCepatObj,
      jamPulang,
      absenPulang,
      pswLewat: pswLewatObj.text,
      pswLewatObj,
      keterangan,
    });
  }

  const totalPresence = countHadir + countTelat + countDL;
  const attendanceRate = effectiveWorkingDays > 0 
    ? Math.min(100, Math.round((totalPresence / effectiveWorkingDays) * 100))
    : 0;

  return {
    dailyRows,
    stats: {
      countHadir,
      countTelat,
      countIzin,
      countSakit,
      countCuti,
      countDL,
      countAlpa,
      totalLateMinutes,
      totalWorkMinutes,
      attendanceRate,
      effectiveWorkingDays,
    }
  };
}

export interface MonthlyTeacherSummary {
  teacher: Teacher;
  hadir: number; // H (tepat waktu)
  terlambat: number; // T (hadir tapi telat)
  totalHadir: number; // H + T
  izin: number; // I
  sakit: number; // S
  cuti: number; // C
  dinasLuar: number; // DL
  alpa: number; // A
  totalLateMinutes: number;
  totalWorkHours: number;
  attendancePercentage: number; // (H + T + DL) / Hari Efektif * 100
  effectiveDays: number;
  dayRecords: { [day: number]: AttendanceRecord | undefined };
}

export function calculateMonthlyMatrix(
  year: number,
  month: number, // 1 - 12
  teachers: Teacher[],
  attendanceRecords: AttendanceRecord[],
  holidays: HolidayItem[],
  schedule: WorkSchedule
): {
  summaries: MonthlyTeacherSummary[];
  effectiveDaysCount: number;
  daysCount: number;
} {
  const daysCount = getDaysInMonth(year, month);
  let effectiveDaysCount = 0;

  // Calculate effective working days in this month
  for (let day = 1; day <= daysCount; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = isDateHoliday(dateStr, holidays);

    // If 6 days work week: Monday(1) to Saturday(6) are workdays, Sunday(0) is off
    // If 5 days work week: Monday(1) to Friday(5) are workdays, Saturday(6) & Sunday(0) are off
    const isWorkDay = schedule.workDaysCount === 6 ? dayOfWeek !== 0 : (dayOfWeek !== 0 && dayOfWeek !== 6);

    if (isWorkDay && !holiday) {
      effectiveDaysCount++;
    }
  }

  const summaries: MonthlyTeacherSummary[] = teachers.map((teacher) => {
    const teacherRecords = attendanceRecords.filter(r => {
      if (!isTeacherRecordMatch(r.teacherId, teacher)) return false;
      const normalizedDate = normalizeDateOnly(r.date);
      const [rY, rM] = normalizedDate.split('-').map(Number);
      return rY === year && rM === month;
    });

    const dayRecords: { [day: number]: AttendanceRecord | undefined } = {};
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let cuti = 0;
    let dinasLuar = 0;
    let alpa = 0;
    let totalLateMinutes = 0;
    let totalWorkMinutes = 0;

    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rec = teacherRecords.find(r => normalizeDateOnly(r.date) === dateStr);
      dayRecords[day] = rec;

      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      const holiday = isDateHoliday(dateStr, holidays);
      const isWorkDay = schedule.workDaysCount === 6 ? dayOfWeek !== 0 : (dayOfWeek !== 0 && dayOfWeek !== 6);
      const schedTimes = getScheduleTimesForDay(schedule, dayOfWeek);

      if (rec) {
        const parsed = parseAttendanceRecordStatus(rec, schedTimes.jamMasuk, schedTimes.tolerance);
        if (parsed.isHadirTepat) {
          hadir++;
        } else if (parsed.isTerlambat) {
          terlambat++;
          totalLateMinutes += parsed.lateMinutes;
        } else if (parsed.isIzin) {
          izin++;
        } else if (parsed.isSakit) {
          sakit++;
        } else if (parsed.isCuti) {
          cuti++;
        } else if (parsed.isDinasLuar) {
          dinasLuar++;
        } else if (parsed.isAlpa) {
          alpa++;
        }

        totalWorkMinutes += parsed.workMinutes;
      } else if (isWorkDay && !holiday) {
        // Not scanned on a working day => Alpa (if past date)
        const today = new Date();
        const checkDate = new Date(year, month - 1, day);
        if (checkDate <= today) {
          alpa++;
        }
      }
    }

    const totalHadir = hadir + terlambat;
    const recognizedPresence = totalHadir + dinasLuar;
    const attendancePercentage = effectiveDaysCount > 0
      ? Math.min(100, Math.round((recognizedPresence / effectiveDaysCount) * 100))
      : 0;

    return {
      teacher,
      hadir,
      terlambat,
      totalHadir,
      izin,
      sakit,
      cuti,
      dinasLuar,
      alpa,
      totalLateMinutes,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
      attendancePercentage,
      effectiveDays: effectiveDaysCount,
      dayRecords,
    };
  });

  return {
    summaries,
    effectiveDaysCount,
    daysCount,
  };
}

export function parseMachineLogFile(fileContent: string): {
  success: boolean;
  records: Array<{ enrollId: number; dateTime: string; time: string; date: string }>;
  error?: string;
} {
  try {
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: Array<{ enrollId: number; dateTime: string; time: string; date: string }> = [];

    lines.forEach((line) => {
      // Handles Tab-separated, Comma-separated, or Space-separated formats from ZKTeco/Solution/FingerPlus
      // Typical format: "1\t2026-08-16 06:45:12\t1\t0\t..."
      // Or "1,2026-08-16 06:45:12,1,0"
      const tokens = line.split(/[\t, ]+/);
      if (tokens.length >= 2) {
        const enrollId = parseInt(tokens[0], 10);
        
        // Find date-time token (contains YYYY-MM-DD or YYYY/MM/DD)
        let dateTimeStr = "";
        for (let i = 1; i < tokens.length; i++) {
          if (tokens[i].includes('-') || tokens[i].includes('/')) {
            // Next token might be time if split by space
            const nextTok = tokens[i + 1] || "";
            if (nextTok.includes(':')) {
              dateTimeStr = `${tokens[i]} ${nextTok}`;
            } else {
              dateTimeStr = tokens[i];
            }
            break;
          }
        }

        if (!isNaN(enrollId) && dateTimeStr) {
          const cleanDt = dateTimeStr.replace(/\//g, '-');
          const [dPart, tPart] = cleanDt.split(' ');
          if (dPart && tPart) {
            parsed.push({
              enrollId,
              dateTime: cleanDt,
              date: dPart,
              time: tPart,
            });
          }
        }
      }
    });

    return {
      success: true,
      records: parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      records: [],
      error: err.message || 'Gagal memparsing file log mesin fingerprint',
    };
  }
}

export function exportMonthlyReportToExcel(
  profile: MadrasahProfile,
  year: number,
  month: number,
  matrixData: ReturnType<typeof calculateMonthlyMatrix>
) {
  const monthName = INDONESIAN_MONTHS[month - 1];
  const { summaries, daysCount, effectiveDaysCount } = matrixData;

  const headerRows = [
    [profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"],
    [profile.name],
    [`REKAPITULASI PRESENSI KEHADIRAN GURU & TENAGA KEPENDIDIKAN (GTK)`],
    [`Bulan: ${monthName} ${year} | Hari Efektif: ${effectiveDaysCount} Hari | NSM: ${profile.nsm} | NPSN: ${profile.npsn}`],
    [],
  ];

  // Build table columns: No, NIP/NUPTK, Nama Guru, Jabatan, [1..31 days], H, T, I, S, C, DL, A, % Hadir, Keterlambatan (Mnt)
  const daysHeader: (string | number)[] = [];
  for (let d = 1; d <= daysCount; d++) {
    daysHeader.push(d);
  }

  const tableHeader = [
    "No",
    "NIP / NUPTK",
    "Nama Lengkap & Gelar",
    "Jabatan / Tugas",
    "Status",
    ...daysHeader,
    "H (Tepat)",
    "T (Telat)",
    "I (Izin)",
    "S (Sakit)",
    "C (Cuti)",
    "DL (Dinas)",
    "A (Alpa)",
    "Total Hadir",
    "% Hadir",
    "Telat (Menit)",
    "Jam Kerja"
  ];

  const dataRows = summaries.map((s, idx) => {
    const dayCodes: string[] = [];
    for (let d = 1; d <= daysCount; d++) {
      const rec = s.dayRecords[d];
      if (rec) {
        if (rec.status === 'HADIR') dayCodes.push('H');
        else if (rec.status === 'TERLAMBAT') dayCodes.push(`T (${rec.lateMinutes}m)`);
        else if (rec.status === 'IZIN') dayCodes.push('I');
        else if (rec.status === 'SAKIT') dayCodes.push('S');
        else if (rec.status === 'CUTI') dayCodes.push('C');
        else if (rec.status === 'DINAS_LUAR') dayCodes.push('DL');
        else if (rec.status === 'ALPA') dayCodes.push('A');
        else if (rec.status === 'LIBUR') dayCodes.push('L');
        else dayCodes.push('-');
      } else {
        dayCodes.push('-');
      }
    }

    return [
      idx + 1,
      s.teacher.nip || s.teacher.nuptk || s.teacher.pegId || "-",
      `${s.teacher.name}, ${s.teacher.title}`.trim(),
      s.teacher.position,
      s.teacher.employmentStatus,
      ...dayCodes,
      s.hadir,
      s.terlambat,
      s.izin,
      s.sakit,
      s.cuti,
      s.dinasLuar,
      s.alpa,
      s.totalHadir,
      `${s.attendancePercentage}%`,
      s.totalLateMinutes,
      `${s.totalWorkHours} Jam`
    ];
  });

  const footerRows = [
    [],
    [],
    ["", "", "", "", `Mengetahui, ${profile.village}, ${daysCount} ${monthName} ${year}`],
    ["", "", "", "", profile.headmasterSignatureTitle || "Kepala Madrasah"],
    [],
    [],
    [],
    ["", "", "", "", profile.headmasterName],
    ["", "", "", "", `NIP. ${profile.headmasterNip || "-"}`]
  ];

  const wsData = [...headerRows, tableHeader, ...dataRows, ...footerRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Presensi_${monthName}_${year}`);

  // Save to file
  XLSX.writeFile(wb, `Rekap_Presensi_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.xlsx`);
}

export function exportTeachersListToExcel(profile: MadrasahProfile, teachers: Teacher[]) {
  const wsData = [
    [profile.name],
    ["DAFTAR GURU DAN TENAGA KEPENDIDIKAN (GTK) & ID SIDIK JARI MESIN"],
    [`Tanggal Cetak: ${formatIndonesianDate(new Date().toISOString().split('T')[0])}`],
    [],
    [
      "No",
      "ID Finger Mesin",
      "Nama Lengkap & Gelar",
      "NIP",
      "NUPTK",
      "NPK",
      "PegID Simpatika",
      "Jabatan / Tugas",
      "Status Kepegawaian",
      "L/P",
      "No. WhatsApp",
      "JTM (Jam)",
      "Status Sidik Jari"
    ],
    ...teachers.map((t, i) => [
      i + 1,
      t.fingerprintId,
      `${t.name}, ${t.title}`.trim(),
      t.nip || "-",
      t.nuptk || "-",
      t.npk || "-",
      t.pegId || "-",
      t.position,
      t.employmentStatus,
      t.gender,
      t.phone,
      t.teachingHoursPerWeek,
      t.isBiometricEnrolled ? "Terdaftar" : "Belum Rekam"
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data_GTK");
  XLSX.writeFile(wb, `Data_GTK_Madrasah_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

// Download Official GTK Import Template (.xlsx) with Guide Sheet
export function downloadGTKTemplateExcel(profile: MadrasahProfile) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Data GTK
  const templateHeaders = [
    "NO",
    "ID_FINGERPRINT",
    "NAMA_LENGKAP",
    "GELAR",
    "NIK_16_DIGIT",
    "PIN_6_DIGIT",
    "HAK_AKSES",
    "NIP",
    "NUPTK",
    "NPK_KEMENAG",
    "PEGID_SIMPATIKA",
    "JABATAN_MAPEL",
    "STATUS_KEPEGAWAIAN",
    "JENIS_KELAMIN",
    "NO_WHATSAPP",
    "EMAIL",
    "BEBAN_JTM"
  ];

  const sampleRows = [
    [
      1,
      1,
      profile.headmasterName ? profile.headmasterName.split(',')[0].trim() : "Nama Kepala Madrasah",
      profile.headmasterName && profile.headmasterName.includes(',') ? profile.headmasterName.split(',').slice(1).join(',').trim() : "M.Pd.I.",
      "3302015205780001",
      "123456",
      "ADMIN",
      profile.headmasterNip || "-",
      profile.headmasterNuptk || "-",
      "12345678",
      "98765432",
      "Kepala Madrasah",
      "PNS",
      "P",
      profile.phone || "081234567890",
      profile.email || "mimaarifnu2sanggreman@gmail.com",
      24
    ],
    [
      2,
      2,
      "H. Nurul Huda",
      "M.Pd.I.",
      "3302011403820002",
      "123456",
      "GURU",
      "198203142008011005",
      "8546765769300012",
      "23456789",
      "87654321",
      "Guru Fiqih / Waka Kurikulum",
      "PNS",
      "L",
      "081398765432",
      "nurulhuda@madrasah.sch.id",
      24
    ],
    [
      3,
      3,
      "Ahmad Muzakki",
      "S.Pd.",
      "3302012508900003",
      "123456",
      "GURU",
      "",
      "",
      "34567890",
      "76543210",
      "Guru Kelas IV",
      "GTY",
      "L",
      "085712345678",
      "muzakki@madrasah.sch.id",
      24
    ],
    [
      4,
      4,
      profile.tuAdminName ? profile.tuAdminName.split(',')[0].trim() : "Nurul Hidayati",
      profile.tuAdminName && profile.tuAdminName.includes(',') ? profile.tuAdminName.split(',').slice(1).join(',').trim() : "S.Kom.",
      "3302016410890004",
      "123456",
      "OPERATOR_TU",
      profile.tuAdminNip || "198910242019032011",
      "",
      "",
      "",
      "Operator SIMPATIKA & Emis / TU",
      "TENAGA_KEPENDIDIKAN",
      "P",
      "081298765432",
      "tu.madrasah@gmail.com",
      0
    ]
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
  
  wsTemplate['!cols'] = [
    { wch: 6 },  // NO
    { wch: 16 }, // ID_FINGERPRINT
    { wch: 26 }, // NAMA_LENGKAP
    { wch: 12 }, // GELAR
    { wch: 20 }, // NIK_16_DIGIT
    { wch: 12 }, // PIN_6_DIGIT
    { wch: 16 }, // HAK_AKSES
    { wch: 22 }, // NIP
    { wch: 20 }, // NUPTK
    { wch: 16 }, // NPK_KEMENAG
    { wch: 18 }, // PEGID_SIMPATIKA
    { wch: 28 }, // JABATAN_MAPEL
    { wch: 22 }, // STATUS_KEPEGAWAIAN
    { wch: 14 }, // JENIS_KELAMIN
    { wch: 18 }, // NO_WHATSAPP
    { wch: 26 }, // EMAIL
    { wch: 14 }  // BEBAN_JTM
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, "DATA_GTK_TEMPLATE");

  // Sheet 2: Petunjuk & Panduan Pengisian
  const instructions = [
    ["PETUNJUK & PANDUAN PENGISIAN TEMPLATE DATA GTK (GURU & TENAGA KEPENDIDIKAN)"],
    [`Madrasah: ${profile.name}`],
    [""],
    ["KOLOM", "TIPE DATA", "WAJIB?", "KETERANGAN & PILIHAN NILAI"],
    ["ID_FINGERPRINT", "Angka", "Wajib", "Nomor ID pengguna yang didaftarkan di mesin fingerprint (cth: 1, 2, 3, dst)."],
    ["NAMA_LENGKAP", "Teks", "Wajib", "Nama lengkap GTK tanpa gelar (cth: Ahmad Dahlan)."],
    ["GELAR", "Teks", "Opsional", "Gelar akademik depan/belakang (cth: S.Pd.I., M.Pd., S.Ag.)."],
    ["NIK_16_DIGIT", "Teks / Angka", "Wajib", "16 Digit NIK KTP yang digunakan sebagai username login mandiri."],
    ["PIN_6_DIGIT", "Teks / Angka", "Opsional", "6 Digit PIN angka untuk presensi & login mandiri (Default jika kosong: 123456)."],
    ["HAK_AKSES", "Pilihan Teks", "Wajib", "Pilihan: GURU, KEPALA_MADRASAH, OPERATOR_TU, ADMIN."],
    ["NIP", "Teks / Angka", "Opsional", "18 Digit NIP bagi ASN / PNS / PPPK Kemenag (Kosongkan jika non-PNS)."],
    ["NUPTK", "Teks / Angka", "Opsional", "16 Digit NUPTK resmi Kemendikbud/Kemenag."],
    ["NPK_KEMENAG", "Teks / Angka", "Opsional", "Nomor Pendidik Kemenag dari Simpatika."],
    ["PEGID_SIMPATIKA", "Teks / Angka", "Opsional", "PegID dari portal Simpatika Kemenag."],
    ["JABATAN_MAPEL", "Teks", "Wajib", "Jabatan / Mata Pelajaran (Pilihan standar: Guru Kelas, Guru Mata Pelajaran, Tata Usaha, Kepala Madrasah, Waspendais, atau sebutan spesifik)."],
    ["STATUS_KEPEGAWAIAN", "Pilihan Teks", "Wajib", "Pilihan: PNS, PPPK, GTY, GTT, HONORER, TENAGA_KEPENDIDIKAN."],
    ["JENIS_KELAMIN", "Pilihan", "Wajib", "L (Laki-laki) atau P (Perempuan)."],
    ["NO_WHATSAPP", "Teks", "Opsional", "Nomor kontak WhatsApp aktif untuk notifikasi."],
    ["EMAIL", "Teks", "Opsional", "Alamat email aktif GTK."],
    ["BEBAN_JTM", "Angka", "Opsional", "Beban Jam Tatap Muka per minggu (Default: 24 untuk guru)."],
    [""],
    ["CATATAN PENTING:"],
    ["1. Jangan mengubah nama kolom pada baris pertama Sheet 'DATA_GTK_TEMPLATE'."],
    ["2. Pastikan NIK dan ID Fingerprint tidak ada yang ganda/duplikat."],
    ["3. File dapat disimpan dalam format .xlsx atau .csv lalu diunggah kembali ke aplikasi SIM Presensi."]
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 70 }
  ];

  XLSX.utils.book_append_sheet(wb, wsInstructions, "PANDUAN_PENGISIAN");

  XLSX.writeFile(wb, `Template_Import_Data_GTK_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

export interface ParseGTKResult {
  teachers: Teacher[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}

export async function parseGTKExcelFile(file: File, existingTeachers: Teacher[] = []): Promise<ParseGTKResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Prefer sheet with 'data' or 'gtk' or template, else first sheet
        const sheetName = workbook.SheetNames.find(s => {
          const lower = s.toLowerCase();
          return lower.includes('data') || lower.includes('gtk') || lower.includes('guru') || lower.includes('template');
        }) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          return resolve({
            teachers: [],
            errors: ['Format file Excel tidak valid atau lembar kerja (sheet) kosong.'],
            warnings: [],
            totalRows: 0
          });
        }

        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawData.length < 2) {
          return resolve({
            teachers: [],
            errors: ['File Excel tidak memiliki baris data (hanya header atau kosong).'],
            warnings: [],
            totalRows: 0
          });
        }

        // Find header row index
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(rawData.length, 10); r++) {
          const rowStr = rawData[r].map(c => String(c).toLowerCase()).join(' ');
          if (rowStr.includes('nama') || rowStr.includes('finger') || rowStr.includes('nik') || rowStr.includes('jabatan')) {
            headerRowIndex = r;
            break;
          }
        }

        const headers = rawData[headerRowIndex].map((h: any) => String(h || '').trim().toUpperCase());
        
        // Helper to find column index by keywords
        const getColIdx = (...keywords: string[]) => {
          return headers.findIndex(h => {
            const clean = h.replace(/[^A-Z0-9]/g, '');
            return keywords.some(k => clean.includes(k.toUpperCase().replace(/[^A-Z0-9]/g, '')));
          });
        };

        const colFinger = getColIdx('IDFINGER', 'FINGERPRINT', 'FINGER', 'NOFINGER', 'IDMESIN');
        const colName = getColIdx('NAMALENGKAP', 'NAMA', 'NAMAGTK', 'GURUNAMA');
        const colTitle = getColIdx('GELAR', 'TITLE');
        const colNik = getColIdx('NIK', 'NOKTP', 'NIK16');
        const colPin = getColIdx('PIN', 'PASSWORD', 'PIN6', 'KODELOGIN');
        const colRole = getColIdx('HAKAKSES', 'ROLE', 'PERAN', 'AKSES');
        const colNip = getColIdx('NIP', 'NIPPEG');
        const colNuptk = getColIdx('NUPTK');
        const colNpk = getColIdx('NPK', 'NPKKEMENAG');
        const colPegId = getColIdx('PEGID', 'SIMPATIKA', 'PEGIDSIMPATIKA');
        const colPosition = getColIdx('JABATANMAPEL', 'JABATAN', 'MAPEL', 'TUGAS', 'POSISI');
        const colStatus = getColIdx('STATUSKEPEGAWAIAN', 'STATUS', 'STATUSPEGAWAI');
        const colGender = getColIdx('JENISKELAMIN', 'GENDER', 'LP', 'JK');
        const colPhone = getColIdx('NOWHATSAPP', 'WHATSAPP', 'NOHP', 'TELEPON', 'HP', 'TELP', 'KONTAK');
        const colEmail = getColIdx('EMAIL', 'SUREL');
        const colJtm = getColIdx('BEBANJTM', 'JTM', 'JAMMENGAJAR', 'JAM');

        if (colName === -1) {
          return resolve({
            teachers: [],
            errors: ['Kolom "NAMA_LENGKAP" atau "NAMA" tidak ditemukan dalam baris header file Excel.'],
            warnings: [],
            totalRows: rawData.length - headerRowIndex - 1
          });
        }

        const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-teal-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600', 'bg-emerald-700', 'bg-cyan-700'];
        const teachers: Teacher[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];
        const seenNiks = new Set<string>();
        const seenFingerprints = new Set<number>();

        let currentMaxFingerId = existingTeachers.reduce((max, t) => Math.max(max, t.fingerprintId || 0), 0);

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) {
            continue; // Skip empty rows
          }

          const rawName = String(row[colName] || '').trim();
          if (!rawName) {
            continue; // Skip without name
          }

          const rowNum = i + 1;

          // Process Name & Title
          let name = rawName;
          let title = colTitle !== -1 ? String(row[colTitle] || '').trim() : '';

          // If title not in separate column but in name (e.g. "Siti Rochimah, S.Pd.I.")
          if (!title && name.includes(',')) {
            const parts = name.split(',');
            name = parts[0].trim();
            title = parts.slice(1).join(',').trim();
          }

          // Fingerprint ID
          let fingerprintId = 0;
          if (colFinger !== -1 && row[colFinger]) {
            fingerprintId = parseInt(String(row[colFinger]).replace(/[^0-9]/g, ''), 10);
          }
          if (!fingerprintId || isNaN(fingerprintId) || fingerprintId <= 0) {
            currentMaxFingerId += 1;
            fingerprintId = currentMaxFingerId;
            warnings.push(`Baris ${rowNum}: ID Fingerprint untuk "${name}" tidak diisi, otomatis diset #${fingerprintId}.`);
          } else {
            currentMaxFingerId = Math.max(currentMaxFingerId, fingerprintId);
          }

          if (seenFingerprints.has(fingerprintId)) {
            warnings.push(`Baris ${rowNum}: ID Fingerprint #${fingerprintId} ganda/duplikat dalam file.`);
          }
          seenFingerprints.add(fingerprintId);

          // NIK (16 Digits)
          let rawNik = colNik !== -1 ? String(row[colNik] || '').trim().replace(/[^0-9]/g, '') : '';
          if (!rawNik || rawNik.length < 5) {
            rawNik = `330201${Math.floor(1000000000 + Math.random() * 9000000000)}`;
            warnings.push(`Baris ${rowNum}: NIK untuk "${name}" tidak valid/kosong, otomatis dibuat: ${rawNik}.`);
          } else if (rawNik.length !== 16) {
            warnings.push(`Baris ${rowNum}: NIK "${rawNik}" (${name}) bukan 16 digit.`);
          }

          if (seenNiks.has(rawNik)) {
            warnings.push(`Baris ${rowNum}: NIK ${rawNik} ganda/duplikat dalam file.`);
          }
          seenNiks.add(rawNik);

          // PIN
          let pin = colPin !== -1 ? String(row[colPin] || '').trim() : '123456';
          if (!pin) pin = '123456';

          // Role
          let role: any = 'GURU';
          if (colRole !== -1 && row[colRole]) {
            const rawRole = String(row[colRole]).trim().toUpperCase().replace(/[^A-Z_]/g, '');
            if (rawRole.includes('KEPALA')) role = 'KEPALA_MADRASAH';
            else if (rawRole.includes('OPERATOR') || rawRole.includes('TU')) role = 'OPERATOR_TU';
            else if (rawRole.includes('ADMIN')) role = 'ADMIN';
            else role = 'GURU';
          }

          // NIP, NUPTK, NPK, PegID
          const nip = colNip !== -1 ? String(row[colNip] || '').trim().replace(/[^0-9]/g, '') : '';
          const nuptk = colNuptk !== -1 ? String(row[colNuptk] || '').trim().replace(/[^0-9]/g, '') : '';
          const npk = colNpk !== -1 ? String(row[colNpk] || '').trim() : '';
          const pegId = colPegId !== -1 ? String(row[colPegId] || '').trim() : '';

          // Position
          const position = colPosition !== -1 && row[colPosition] 
            ? String(row[colPosition]).trim() 
            : (role === 'KEPALA_MADRASAH' ? 'Kepala Madrasah' : role === 'OPERATOR_TU' ? 'Tenaga Administrasi / TU' : 'Guru Mata Pelajaran');

          // Status Kepegawaian
          let employmentStatus: any = 'GTY';
          if (colStatus !== -1 && row[colStatus]) {
            const rawStatus = String(row[colStatus]).trim().toUpperCase().replace(/[^A-Z_]/g, '');
            if (rawStatus.includes('PNS')) employmentStatus = 'PNS';
            else if (rawStatus.includes('PPPK')) employmentStatus = 'PPPK';
            else if (rawStatus.includes('GTY')) employmentStatus = 'GTY';
            else if (rawStatus.includes('GTT')) employmentStatus = 'GTT';
            else if (rawStatus.includes('HONOR')) employmentStatus = 'HONORER';
            else if (rawStatus.includes('TU') || rawStatus.includes('TENAGA')) employmentStatus = 'TENAGA_KEPENDIDIKAN';
          } else if (nip && nip.length >= 18) {
            employmentStatus = 'PNS';
          }

          // Gender
          let gender: 'L' | 'P' = 'L';
          if (colGender !== -1 && row[colGender]) {
            const rawG = String(row[colGender]).trim().toUpperCase();
            if (rawG.startsWith('P') || rawG.includes('WANITA') || rawG.includes('PEREMPUAN')) {
              gender = 'P';
            } else {
              gender = 'L';
            }
          }

          // Phone / WA
          let phone = colPhone !== -1 ? String(row[colPhone] || '').trim() : '';
          if (phone && !phone.startsWith('0') && !phone.startsWith('+')) {
            phone = '0' + phone;
          }
          if (!phone) phone = '081234567890';

          // Email
          const email = colEmail !== -1 ? String(row[colEmail] || '').trim() : '';

          // JTM
          let teachingHoursPerWeek = 24;
          if (colJtm !== -1 && row[colJtm]) {
            const parsedJtm = parseInt(String(row[colJtm]).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsedJtm)) teachingHoursPerWeek = parsedJtm;
          }

          const teacherId = `gtk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const randomColor = colors[teachers.length % colors.length];

          teachers.push({
            id: teacherId,
            fingerprintId,
            nik: rawNik,
            pin,
            role,
            nip: nip || undefined,
            nuptk: nuptk || undefined,
            npk: npk || undefined,
            pegId: pegId || undefined,
            name,
            title,
            position,
            employmentStatus,
            gender,
            phone,
            email: email || undefined,
            teachingHoursPerWeek,
            isBiometricEnrolled: true,
            avatarColor: randomColor,
            isActive: true,
          });
        }

        if (teachers.length === 0) {
          errors.push('Tidak ada baris data GTK yang valid terbaca dari file Excel.');
        }

        return resolve({
          teachers,
          errors,
          warnings,
          totalRows: teachers.length
        });
      } catch (err: any) {
        return resolve({
          teachers: [],
          errors: [`Gagal membaca file Excel: ${err?.message || 'Format tidak didukung'}`],
          warnings: [],
          totalRows: 0
        });
      }
    };

    reader.onerror = () => {
      resolve({
        teachers: [],
        errors: ['Gagal membaca berkas file yang diunggah.'],
        warnings: [],
        totalRows: 0
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

// Export Teacher's Monthly Fingerprint Log to Excel with EXACT format:
// TANGGAL, HARI, JAM MASUK, ABSEN MASUK, TELAT/ CEPAT (Menit), JAM PULANG, ABSEN PULANG, PSW/ LEWAT WAKTU (Menit), KETERANGAN
export function exportFingerprintLogToExcel(
  profile: MadrasahProfile,
  teacher: Teacher,
  year: number,
  month: number,
  dailyRows: Array<{
    day: number;
    dateStr: string;
    dayName: string;
    isSunday: boolean;
    holiday?: HolidayItem;
    record?: AttendanceRecord;
    jamMasuk: string;
    absenMasuk: string;
    telatCepat: string;
    jamPulang: string;
    absenPulang: string;
    pswLewat: string;
    keterangan: string;
  }>
) {
  const monthName = INDONESIAN_MONTHS[month - 1];

  const wsData = [
    [profile.name.toUpperCase()],
    [`LAPORAN LOG PRESENSI SIDIK JARI (FINGERPRINT) GTK`],
    [`Bulan: ${monthName} ${year}`],
    [],
    [`Nama GTK`, `: ${teacher.name}, ${teacher.title}`, ``, `Jabatan`, `: ${teacher.position}`],
    [`NIP / NUPTK`, `: ${teacher.nip || teacher.nuptk || '-'}`, ``, `Status Pegawai`, `: ${teacher.employmentStatus}`],
    [`NPK / PegID`, `: ${teacher.npk || teacher.pegId || '-'}`, ``, `ID Mesin Finger`, `: #${teacher.fingerprintId}`],
    [],
    [
      "TANGGAL",
      "HARI",
      "JAM MASUK",
      "ABSEN MASUK",
      "TELAT/ CEPAT (Menit)",
      "JAM PULANG",
      "ABSEN PULANG",
      "PSW/ LEWAT WAKTU (Menit)",
      "KETERANGAN"
    ],
    ...dailyRows.map(row => [
      row.day,
      row.dayName,
      row.jamMasuk,
      row.absenMasuk,
      row.telatCepat,
      row.jamPulang,
      row.absenPulang,
      row.pswLewat,
      row.keterangan
    ]),
    [],
    ["", "", "", "", "", "", "", "Mengetahui,"],
    ["", "", "", "", "", "", "", profile.headmasterSignatureTitle || "Kepala Madrasah"],
    [],
    [],
    ["", "", "", "", "", "", "", profile.headmasterName],
    ["", "", "", "", "", "", "", `NIP. ${profile.headmasterNip || '-'}`]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Log_Finger_${teacher.name.substring(0, 10)}`);
  XLSX.writeFile(wb, `Log_Fingerprint_${teacher.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.xlsx`);
}
