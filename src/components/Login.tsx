import React, { useState, useEffect } from 'react';
import { Teacher, MadrasahProfile } from '../types';
import { 
  Lock, 
  UserCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  ShieldAlert,
  GraduationCap,
  Clock,
  Trash2,
  X
} from 'lucide-react';

interface LoginProps {
  profile: MadrasahProfile;
  teachers: Teacher[];
  onLogin: (teacher: Teacher) => void;
  serverSyncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
}

const RECENT_GTK_STORAGE_KEY = 'simpresensi_recent_gtk_logins_v1';

// Komponen Animasi Typewriter 1 Baris untuk Nama Madrasah
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsDeleting(false);
  }, [text]);

  useEffect(() => {
    const fullText = (text || "MI MA'ARIF NU 02 SANGGREMAN").trim();
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayText.length < fullText.length) {
      // Kecepatan mengetik
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 70);
    } else if (!isDeleting && displayText.length === fullText.length) {
      // Jeda setelah teks selesai diketik sebelum dihapus/diulang
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 3500);
    } else if (isDeleting && displayText.length > 0) {
      // Kecepatan menghapus
      timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length - 1));
      }, 30);
    } else if (isDeleting && displayText.length === 0) {
      // Jeda singkat sebelum mulai mengetik kembali
      setIsDeleting(false);
      timer = setTimeout(() => {}, 400);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, text]);

  return (
    <div className="w-full max-w-full overflow-hidden text-center select-none" title={text}>
      <span className="inline-flex items-center justify-center max-w-full overflow-hidden">
        <span className="whitespace-nowrap overflow-hidden text-ellipsis font-extrabold tracking-wide text-white text-xs sm:text-sm md:text-base drop-shadow-md uppercase">
          {displayText || '\u00A0'}
        </span>
        <span className="inline-block w-[2px] h-3.5 sm:h-4.5 bg-emerald-400 ml-1 animate-pulse shrink-0 align-middle shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      </span>
    </div>
  );
};

export const Login: React.FC<LoginProps> = ({ 
  profile, 
  teachers, 
  onLogin,
  serverSyncStatus = 'synced',
  onManualSync,
}) => {
  const [loginMode, setLoginMode] = useState<'GTK' | 'SUPER_ADMIN'>('GTK');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Load recently logged-in GTK accounts on this device from localStorage
  const [recentGtkIds, setRecentGtkIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_GTK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentGtkLogin = (teacherId: string) => {
    if (teacherId === 'super-admin-jaenal') return;
    try {
      const updated = [teacherId, ...recentGtkIds.filter((id) => id !== teacherId)].slice(0, 3);
      setRecentGtkIds(updated);
      localStorage.setItem(RECENT_GTK_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent GTK login', e);
    }
  };

  const removeRecentGtk = (e: React.MouseEvent, teacherId: string) => {
    e.stopPropagation();
    try {
      const updated = recentGtkIds.filter((id) => id !== teacherId);
      setRecentGtkIds(updated);
      localStorage.setItem(RECENT_GTK_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove recent GTK login', e);
    }
  };

  const clearAllRecentGtk = () => {
    try {
      setRecentGtkIds([]);
      localStorage.removeItem(RECENT_GTK_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear recent GTK logins', e);
    }
  };

  const superAdminUser: Teacher = {
    id: 'super-admin-jaenal',
    fingerprintId: 999,
    nik: '3302010000009999',
    pin: 'masbagus',
    role: 'ADMIN',
    name: 'Jaenal Maskun',
    title: 'S.Pd.I.',
    position: 'Super Administrator SIMPRESENSI',
    employmentStatus: 'TENAGA_KEPENDIDIKAN',
    gender: 'L',
    phone: '081234567890',
    email: 'jaenalmaskun@gmail.com',
    teachingHoursPerWeek: 0,
    isBiometricEnrolled: true,
    avatarColor: 'bg-emerald-800',
    isActive: true,
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIdentifier = identifier.trim();
    const cleanPin = pin.trim();

    if (!cleanIdentifier || !cleanPin) {
      setErrorMsg('Harap masukkan Identitas Akun dan Kata Sandi / PIN Anda.');
      return;
    }

    // MODE 1: ADMINISTRATOR & OPERATOR PORTAL
    if (loginMode === 'SUPER_ADMIN') {
      // Check Super Admin Master Account
      if (
        (cleanIdentifier.toLowerCase() === 'jaenalmaskun@gmail.com' || cleanIdentifier.toLowerCase() === 'jaenalmaskun') &&
        cleanPin === 'masbagus'
      ) {
        onLogin(superAdminUser);
        return;
      }

      // Check Administrative Staff (Kepala Madrasah / Admin / Operator TU)
      const adminStaff = teachers.find((t) => {
        const matchIdent = 
          (t.pegId && t.pegId.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
          (t.nip && t.nip.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
          (t.nik && t.nik.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
          (t.email && t.email.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
          t.name.toLowerCase().trim() === cleanIdentifier.toLowerCase();

        if (!matchIdent) return false;

        const staffPin = t.pin || '123456';
        return cleanPin === staffPin || (cleanPin === '123456' && (!t.pin || t.pin === '123456'));
      });

      if (adminStaff) {
        if (adminStaff.role === 'GURU') {
          setErrorMsg('Akses Ditolak: Akun Anda terdaftar sebagai GURU/GTK. Silakan pilih tab "Login Guru & GTK" untuk masuk ke Portal Mandiri Anda.');
          return;
        }
        onLogin(adminStaff);
        return;
      }

      setErrorMsg('Kredensial Administrator / Operator TU tidak valid atau belum terdaftar. Akses ditolak.');
      return;
    }

    // MODE 2: GURU & GTK LOGIN (Strict Check: Teachers cannot use Super Admin account or password)
    const isAttemptingSuperAdmin = 
      cleanIdentifier.toLowerCase() === 'jaenalmaskun@gmail.com' || 
      cleanIdentifier.toLowerCase() === 'jaenalmaskun' || 
      cleanIdentifier === '3302010000009999' ||
      cleanIdentifier.toLowerCase() === 'superadmin';

    if (isAttemptingSuperAdmin) {
      setErrorMsg('Akses Ditolak: Akun Super Administrator khusus untuk Portal Admin. Silakan gunakan Peg ID / NIP / NIK Anda sendiri untuk login Guru/GTK.');
      return;
    }

    // Find GTK by Peg ID, NIP, NIK, NUPTK, NPK, Email, Name, or Fingerprint ID
    // CRITICAL: Guru CANNOT use 'masbagus' to bypass PIN. Guru MUST match their own PIN or default 123456.
    const foundTeacher = teachers.find((t) => {
      const matchIdent = 
        (t.pegId && t.pegId.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (t.nip && t.nip.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (t.nik && t.nik.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (t.nuptk && t.nuptk.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        (t.npk && t.npk.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        t.fingerprintId.toString() === cleanIdentifier ||
        (t.email && t.email.trim().toLowerCase() === cleanIdentifier.toLowerCase()) ||
        t.name.toLowerCase().trim() === cleanIdentifier.toLowerCase();

      if (!matchIdent) return false;

      const teacherPin = t.pin || '123456';
      return cleanPin === teacherPin || (cleanPin === '123456' && (!t.pin || t.pin === '123456'));
    });

    if (!foundTeacher) {
      setErrorMsg('Peg ID / NIP / NIK / Email atau PIN tidak cocok atau belum terdaftar.');
      return;
    }

    // If teacher is logged in via GTK portal, ensure they are treated as GURU or their defined role
    saveRecentGtkLogin(foundTeacher.id);
    onLogin(foundTeacher);
  };

  const handleQuickLogin = (teacher: Teacher) => {
    saveRecentGtkLogin(teacher.id);
    onLogin(teacher);
  };

  const handleSelectRecentAccount = (teacher: Teacher) => {
    setIdentifier(teacher.pegId || teacher.nip || teacher.nik || teacher.email || teacher.name);
    setPin(teacher.pin || '123456');
    setErrorMsg(null);
  };

  // Only get teachers that have previously logged in on this browser/device
  const recentTeachers = recentGtkIds
    .map((id) => teachers.find((t) => t.id === id))
    .filter(Boolean) as Teacher[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center py-3 px-3 sm:py-5 sm:px-4 lg:py-6 lg:px-6">
      {/* Background Islamic Geometric / Glow Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-3xl grid grid-cols-1 lg:grid-cols-12 gap-0 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Left Side: Madrasah Identity & Info (Ramping, Terpusat, & Elegan) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-emerald-800 to-emerald-950 p-3.5 sm:p-4 lg:p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-emerald-700/50">
          <div>
            {/* Logo Aplikasi di Tengah (Centered App Logo) */}
            <div className="flex flex-col items-center justify-center text-center pt-1 mb-2">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 shadow-xl ring-4 ring-emerald-400/25 border-2 border-emerald-400/80 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                  <img 
                    src={profile.appLogoUrl || profile.logoUrl || '/favicon.svg'} 
                    alt={profile.name || "SIMPRESENSI GTK"} 
                    className="w-full h-full object-contain rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/favicon.svg';
                    }}
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-700 border-2 border-emerald-300 flex items-center justify-center shadow-md">
                  <Fingerprint className="w-3 h-3 text-white" />
                </span>
              </div>

              {/* Badge SIMPRESENSI GTK */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/90 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SIMPRESENSI GTK</span>
              </div>

              {/* Nama Madrasah 1 Baris Animasi Type Writer */}
              <div className="w-full max-w-full my-0.5">
                <TypewriterText text={profile.name || "MI MA'ARIF NU 02 SANGGREMAN"} />
              </div>

              {/* Informasi Ramping Madrasah (NSM & Lokasi 1 Baris) */}
              <div className="w-full text-center mt-1 space-y-0.5">
                <p className="text-[11px] text-emerald-200/95 font-medium truncate max-w-full px-1">
                  {profile.letterHeader1 || "LP Ma'arif NU"} • NSM: {profile.nsm}
                </p>
                <p className="text-[10px] text-emerald-300/75 truncate max-w-full px-1">
                  {profile.village}, {profile.district}, {profile.city}
                </p>
              </div>
            </div>

            {/* Fitur Unggulan Sistem (Dibuat Ramping Grid 2 Kolom) */}
            <div className="mt-2.5 pt-2 border-t border-emerald-700/50">
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-emerald-100/90">
                <div className="flex items-center gap-1.5 bg-emerald-900/50 border border-emerald-600/30 rounded-md px-2 py-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Presensi NIK & PIN</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-900/50 border border-emerald-600/30 rounded-md px-2 py-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Cetak SPTJM & S35</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-900/50 border border-emerald-600/30 rounded-md px-2 py-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Jam Masuk & Pulang</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-900/50 border border-emerald-600/30 rounded-md px-2 py-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Multi-Device Cloud</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Ramping Terintegrasi */}
          <div className="mt-3 pt-2 border-t border-emerald-700/60 text-[10px] text-emerald-300/80 flex items-center justify-between">
            <span className="truncate">Kemenag Terintegrasi</span>
            <span className="flex items-center shrink-0 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Aman & Terverifikasi
            </span>
          </div>
        </div>

        {/* Right Side: Login Form & Tabbed Access */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-center">
          
          {/* Header & Mode Switcher */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <Lock className="w-5 h-5 mr-2 text-emerald-400" />
                Masuk SIMPRESENSI
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {loginMode === 'GTK' 
                  ? 'Login mandiri Guru & GTK menggunakan identitas resmi.' 
                  : 'Area khusus Administrator Sistem SIMPRESENSI.'}
              </p>
            </div>

            {/* Live Multi-Device Sync Indicator */}
            <button
              type="button"
              onClick={onManualSync}
              title="Status sinkronisasi data antar perangkat. Klik untuk memperbarui data sekarang."
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors shrink-0 ${
                serverSyncStatus === 'synced'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                  : serverSyncStatus === 'syncing'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                serverSyncStatus === 'synced' ? 'bg-emerald-400' : serverSyncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-rose-400'
              }`} />
              <span>{serverSyncStatus === 'synced' ? 'Live Cloud' : serverSyncStatus === 'syncing' ? 'Sinkron...' : 'Offline'}</span>
            </button>
          </div>

          {/* Mode Switch Tabs (Guru/GTK vs Admin/Operator) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => {
                setLoginMode('GTK');
                setErrorMsg(null);
                setIdentifier('');
                setPin('');
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-bold transition ${
                loginMode === 'GTK'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Login Guru & GTK</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('SUPER_ADMIN');
                setErrorMsg(null);
                setIdentifier('');
                setPin('');
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-bold transition ${
                loginMode === 'SUPER_ADMIN'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Portal Admin & Operator</span>
            </button>
          </div>

          {/* Admin & Operator Notice */}
          {loginMode === 'SUPER_ADMIN' && (
            <div className="mb-2.5 p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-[11px] flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300 text-xs">Portal Administrator & Operator TU</p>
                <p className="text-[10.5px] text-amber-200/80 mt-0.5">
                  Khusus Super Admin, Kepala Madrasah, dan Operator TU. Menyediakan akses Master Data GTK, Jurnal Harian, Rekap S25, Cetak SPTJM, dan Pengaturan.
                </p>
              </div>
            </div>
          )}

          {/* Quick Credential Support Pill Badges for GTK */}
          {loginMode === 'GTK' && (
            <div className="mb-2.5 flex flex-wrap gap-1 items-center text-[10px] text-slate-300">
              <span className="text-slate-400">Metode:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono text-[9.5px]">
                Peg ID Simpatika
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono text-[9.5px]">
                NIP PNS/PPPK
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono text-[9.5px]">
                NIK
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono text-[9.5px]">
                Email Guru
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-3 p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-lg text-rose-200 text-xs flex items-center space-x-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-3">
            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  {loginMode === 'GTK' ? 'Peg ID / NIP / NIK / Email Guru' : 'Email / Username Super Admin'}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {loginMode === 'GTK' ? 'Simpatika / Kemenag' : 'Kredensial Khusus'}
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    loginMode === 'GTK'
                      ? 'Contoh: Peg ID (20123456789) / NIP / NIK / Email Guru'
                      : 'jaenalmaskun@gmail.com / jaenalmaskun'
                  }
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-800/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password / PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  {loginMode === 'GTK' ? 'Kode PIN GTK (6 Digit)' : 'Kata Sandi Super Admin'}
                </label>
                {loginMode === 'GTK' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center transition"
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    Bantuan Akun?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={loginMode === 'GTK' ? 'Masukkan PIN GTK Anda (Default: 123456)' : 'Masukkan Kata Sandi Super Admin'}
                  className="w-full pl-9 pr-9 py-2 bg-slate-800/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-2.5 px-3.5 ${
                loginMode === 'GTK'
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-emerald-900/40'
                  : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 shadow-amber-900/40'
              } text-white font-bold rounded-lg shadow-md text-xs sm:text-sm transition flex items-center justify-center space-x-2`}
            >
              {loginMode === 'GTK' ? <Fingerprint className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{loginMode === 'GTK' ? 'Masuk Sebagai Guru / GTK' : 'Masuk Super Administrator'}</span>
            </button>
          </form>

          {/* Quick Access: Only shows accounts that recently logged in on THIS browser/device */}
          {loginMode === 'GTK' && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              {recentTeachers.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>Akun Terakhir Masuk di Perangkat Ini</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAllRecentGtk}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
                      title="Hapus riwayat akun tersimpan di browser ini"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Riwayat</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentTeachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        onClick={() => handleSelectRecentAccount(teacher)}
                        className="p-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-emerald-500/60 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs relative"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1 pr-1.5">
                          <div className={`w-7 h-7 rounded-md ${teacher.avatarColor || 'bg-emerald-700'} flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow`}>
                            {teacher.fingerprintId ? `#${teacher.fingerprintId}` : teacher.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                              {teacher.name}
                            </div>
                            <div className="text-[9.5px] text-slate-400 truncate">
                              {teacher.position}
                            </div>
                            <div className="text-[8.5px] text-emerald-400 font-mono truncate">
                              {teacher.pegId ? `PegID: ${teacher.pegId}` : teacher.nip ? `NIP: ${teacher.nip}` : `NIK: ${teacher.nik}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickLogin(teacher);
                            }}
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs"
                            title="Masuk langsung dengan akun ini"
                          >
                            Masuk
                          </button>
                          <button
                            type="button"
                            onClick={(e) => removeRecentGtk(e, teacher.id)}
                            className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition"
                            title="Hapus akun ini dari perangkat"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[9.5px] text-slate-400 mt-2 text-center">
                    Klik akun di atas untuk login cepat atau pilih untuk mengisi formulir login otomatis.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-300 font-medium mb-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Privasi Akun Terlindungi</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Daftar seluruh guru tidak ditampilkan secara terbuka. Masukkan <strong className="text-slate-300">Peg ID</strong>, <strong className="text-slate-300">NIP</strong>, atau <strong className="text-slate-300">NIK</strong> untuk masuk.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forgot PIN Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Panduan Reset PIN GTK</h3>
                <p className="text-xs text-slate-400">SIMPRESENSI Madrasah</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-800/70 p-4 rounded-xl border border-slate-700/60">
              <p>
                1. PIN bawaan standar untuk seluruh GTK baru adalah: <strong className="text-emerald-400 font-mono">123456</strong>.
              </p>
              <p>
                2. Jika Anda telah mengubah PIN dan lupa kodenya, silakan hubungi <strong>Operator TU / Simpatika</strong> ({profile.tuAdminName}) atau <strong>Kepala Madrasah</strong> ({profile.headmasterName}).
              </p>
              <p>
                3. Operator TU dapat mereset PIN melalui menu <em>Master Data Guru & Staff</em>.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
