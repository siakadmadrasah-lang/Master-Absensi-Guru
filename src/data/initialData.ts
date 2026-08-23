import { Teacher, AttendanceRecord, LeaveRequest, WorkSchedule, MadrasahProfile, HolidayItem } from '../types';

export const initialMadrasahProfile: MadrasahProfile = {
  name: "MI MA'ARIF NU 02 SANGGREMAN",
  level: "MI",
  nsm: "111233020085",
  npsn: "60712345",
  status: "SWASTA",
  foundationName: "LP MA'ARIF NU KABUPATEN BANYUMAS",
  address: "Jl. Lapangan Desa Sanggreman No. 04, RT 02 RW 03",
  village: "Sanggreman",
  district: "Rawalo",
  city: "Kabupaten Banyumas",
  province: "Jawa Tengah",
  postalCode: "53173",
  phone: "(0281) 6841234",
  email: "mimaarifnu2sanggreman@gmail.com",
  website: "www.mimaarifnu2sanggreman.sch.id",
  headmasterName: "",
  headmasterNip: "",
  headmasterNuptk: "",
  headmasterSignatureTitle: "Kepala Madrasah",
  tuAdminName: "",
  tuAdminNip: "",
  letterHeader1: "LEMBAGA PENDIDIKAN MA'ARIF NU",
  letterHeader2: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
  signaturePosition: "KEPALA_KIRI_GURU_KANAN",
  signaturePlace: "Sanggreman",
  signatureLeftTitle: "Mengetahui,\nKepala Madrasah",
  signatureRightTitle: "Guru Yang Bersangkutan",
};

export const initialSchedule: WorkSchedule = {
  mondayThursday: {
    checkInStart: "06:00",
    checkInLimit: "07:15",
    checkOutStart: "14:00",
    checkOutEnd: "17:00",
  },
  friday: {
    checkInStart: "06:00",
    checkInLimit: "07:00",
    checkOutStart: "11:30",
    checkOutEnd: "16:00",
  },
  saturday: {
    checkInStart: "06:00",
    checkInLimit: "07:15",
    checkOutStart: "13:00",
    checkOutEnd: "16:30",
  },
  toleranceMinutes: 5,
  workDaysCount: 6, // 6 Hari Kerja (Senin - Sabtu)
};

export const initialTeachers: Teacher[] = [];

export const initialHolidays: HolidayItem[] = [
  { id: "h-01", date: "2026-01-01", name: "Tahun Baru Masehi", type: "NASIONAL" },
  { id: "h-02", date: "2026-01-03", name: "Hari Amal Bakti (HAB) Kemenag RI", type: "MADRASAH" },
  { id: "h-03", date: "2026-01-16", name: "Isra Mi'raj Nabi Muhammad SAW", type: "NASIONAL" },
  { id: "h-04", date: "2026-02-17", name: "Tahun Baru Imlek 2577", type: "NASIONAL" },
  { id: "h-05", date: "2026-03-20", name: "Hari Suci Nyepi Tahun Baru Saka 1948", type: "NASIONAL" },
  { id: "h-06", date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H (Hari ke-1)", type: "NASIONAL" },
  { id: "h-07", date: "2026-03-22", name: "Hari Raya Idul Fitri 1447 H (Hari ke-2)", type: "NASIONAL" },
  { id: "h-08", date: "2026-05-01", name: "Hari Buruh Internasional", type: "NASIONAL" },
  { id: "h-09", date: "2026-05-14", name: "Kenaikan Isa Almasih", type: "NASIONAL" },
  { id: "h-10", date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H", type: "NASIONAL" },
  { id: "h-11", date: "2026-06-01", name: "Hari Lahir Pancasila", type: "NASIONAL" },
  { id: "h-12", date: "2026-06-16", name: "Tahun Baru Islam 1448 Hijriah", type: "NASIONAL" },
  { id: "h-13", date: "2026-08-17", name: "Hari Kemerdekaan Republik Indonesia ke-81", type: "NASIONAL" },
  { id: "h-14", date: "2026-10-22", name: "Hari Santri Nasional", type: "MADRASAH" },
  { id: "h-15", date: "2026-11-25", name: "Hari Guru Nasional & PGRI", type: "MADRASAH" },
];

export const initialLeaveRequests: LeaveRequest[] = [];

// Helper to generate attendance history (returns empty array for clean slate)
export function generateInitialAttendanceHistory(): AttendanceRecord[] {
  return [];
}
