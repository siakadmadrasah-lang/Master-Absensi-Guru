export type EmploymentStatus = 'PNS' | 'PPPK' | 'GTY' | 'GTT' | 'HONORER' | 'TENAGA_KEPENDIDIKAN';

export type UserRole = 'ADMIN' | 'GURU' | 'KEPALA_MADRASAH' | 'OPERATOR_TU';

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'CUTI' | 'DINAS_LUAR' | 'ALPA' | 'LIBUR';

export type VerificationMethod = 'FINGERPRINT' | 'MANUAL_ADMIN' | 'IMPORT_MESIN' | 'FACE_SCAN' | 'WEBAUTHN';

export interface Teacher {
  id: string;
  fingerprintId: number; // ID finger mesin (1, 2, 3, etc)
  nik: string; // Nomor Induk Kependudukan (16 digit) untuk Login
  pin: string; // 6 digit PIN Presensi & Login (cth: 123456)
  role: UserRole; // Peran hak akses akun
  nip?: string;
  nuptk?: string;
  npk?: string; // Nomor Pendidik Kemenag
  pegId?: string; // ID Simpatika Kemenag
  name: string;
  title: string; // Gelar (cth: S.Pd.I, M.Pd, S.Ag)
  position: string; // Jabatan / Tugas (cth: Guru Fiqih, Guru Kelas IV, Waka Kurikulum, Kepala Madrasah)
  employmentStatus: EmploymentStatus;
  gender: 'L' | 'P';
  phone: string;
  email?: string;
  teachingHoursPerWeek: number; // JTM
  isBiometricEnrolled: boolean;
  avatarColor?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workDurationMinutes: number;
  verificationMethod: VerificationMethod;
  notes?: string;
  attachmentUrl?: string;
  approvedBy?: string;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  type: 'IZIN' | 'SAKIT' | 'CUTI' | 'DINAS_LUAR';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedDate?: string;
  approvedBy?: string;
  letterNumber?: string; // No surat tugas / dokter
}

export interface WorkSchedule {
  mondayThursday: {
    checkInStart: string; // '06:00'
    checkInLimit: string; // '07:15'
    checkOutStart: string; // '14:00'
    checkOutEnd: string; // '17:00'
  };
  friday: {
    checkInStart: string; // '06:00'
    checkInLimit: string; // '07:00'
    checkOutStart: string; // '11:30'
    checkOutEnd: string; // '16:00'
  };
  saturday: {
    checkInStart: string; // '06:00'
    checkInLimit: string; // '07:15'
    checkOutStart: string; // '13:00'
    checkOutEnd: string; // '16:30'
  };
  toleranceMinutes: number; // Toleransi keterlambatan (misal 5 menit)
  workDaysCount: 5 | 6; // 6 hari kerja (Senin-Sabtu) atau 5 hari kerja
}

export interface MadrasahProfile {
  name: string;
  level: 'RA' | 'MI' | 'MTs' | 'MA' | 'MAK';
  nsm: string; // Nomor Statistik Madrasah
  npsn: string;
  status: 'NEGERI' | 'SWASTA';
  foundationName?: string; // Yayasan (cth: LP Ma'arif NU)
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  headmasterName: string;
  headmasterNip?: string;
  headmasterNuptk?: string;
  headmasterSignatureTitle?: string;
  tuAdminName: string;
  tuAdminNip?: string;
  logoUrl?: string; // Logo Kop Surat Madrasah (Cetak PDF, SPTJM, Rekap)
  secondaryLogoUrl?: string; // Logo Sekunder Kop Surat (Kemenag / LP Ma'arif NU)
  appLogoUrl?: string; // Logo Khusus Aplikasi SIMPRESENSI (Halaman Login & Navbar)
  faviconUrl?: string;
  ogImageUrl?: string;
  letterHeader1?: string;
  letterHeader2?: string;
  letterHeader3?: string;
  signaturePosition?: 'KEPALA_KIRI_GURU_KANAN' | 'GURU_KIRI_KEPALA_KANAN';
  signaturePlace?: string;
  signatureLeftTitle?: string;
  signatureRightTitle?: string;
  academicYear?: string;
}

export interface HolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'NASIONAL' | 'MADRASAH' | 'CUTI_BERSAMA';
}

export interface MachineImportLog {
  id: string;
  importedAt: string;
  fileName: string;
  totalRows: number;
  successfulRows: number;
  rawPreview?: string;
}
