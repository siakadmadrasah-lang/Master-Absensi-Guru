import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  CalendarDays, 
  Users, 
  FileText, 
  FileSpreadsheet, 
  Clock, 
  Settings, 
  Sparkles, 
  FileCheck, 
  UploadCloud, 
  Building2,
  CalendarCheck,
  ShieldCheck,
  LogOut,
  User,
  KeyRound,
  Server,
  Download
} from 'lucide-react';
import { MadrasahProfile, Teacher } from '../types';
import { getEstimatedHijriDate, formatIndonesianDate } from '../utils/attendanceUtils';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: MadrasahProfile;
  currentUser: Teacher | null;
  onLogout: () => void;
  onOpenPleskExport?: () => void;
  todayStats: {
    total: number;
    present: number;
    late: number;
    permission: number;
    absent: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  currentUser,
  onLogout,
  onOpenPleskExport,
  todayStats,
}) => {
  const [time, setTime] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');
  const [todayStr, setTodayStr] = useState<string>('');
  const [hijriStr, setHijriStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}`);
      setSeconds(s);
      setTodayStr(formatIndonesianDate(now.toISOString().split('T')[0]));
      setHijriStr(getEstimatedHijriDate(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isGuru = currentUser?.role === 'GURU';
  const isKepalaMadrasah = currentUser?.role === 'KEPALA_MADRASAH';
  const isSuperAdmin = 
    currentUser?.email === 'jaenalmaskun@gmail.com' || 
    currentUser?.id === 'super-admin-jaenal' || 
    currentUser?.nik === '3302010000009999';

  let navItems;
  if (isGuru) {
    navItems = [
      { id: 'kiosk', label: 'Terminal Presensi Saya', icon: Fingerprint, badge: 'Mandiri' },
      { id: 'guru', label: 'Biodata & Profil Saya', icon: Users },
      { id: 'rekap', label: 'Rekap Kehadiran Saya', icon: CalendarDays },
      { id: 'kartu', label: 'Slip Presensi Saya', icon: FileSpreadsheet, highlight: true },
      { id: 'izin', label: 'Pengajuan Izin & Cuti', icon: FileText },
    ];
  } else if (isKepalaMadrasah) {
    navItems = [
      { id: 'kiosk', label: 'Terminal Fingerprint', icon: Fingerprint, badge: 'Utama' },
      { id: 'harian', label: 'Jurnal Harian Presensi', icon: CalendarCheck },
      { id: 'rekap', label: 'Rekap Bulanan (Matriks S25)', icon: CalendarDays },
      { id: 'guru', label: 'Data GTK Madrasah', icon: Users },
      { id: 'sptjm', label: 'Cetak SPTJM Kemenag', icon: FileCheck, highlight: true },
      { id: 'kartu', label: 'Slip Kartu Presensi', icon: FileSpreadsheet },
      { id: 'izin', label: 'Verifikasi Izin & Cuti', icon: FileText },
      { id: 'ai', label: 'Supervisi AI & Analisis', icon: Sparkles },
    ];
  } else {
    // ADMIN / OPERATOR_TU / SUPER ADMIN
    navItems = [
      { id: 'kiosk', label: 'Terminal Fingerprint', icon: Fingerprint, badge: 'Utama' },
      { id: 'harian', label: 'Jurnal Harian Presensi', icon: CalendarCheck },
      { id: 'rekap', label: 'Rekap Bulanan (Matriks S25)', icon: CalendarDays },
      { id: 'guru', label: 'Master Data GTK & PIN', icon: Users },
      { id: 'sptjm', label: 'Cetak SPTJM Kemenag', icon: FileCheck, highlight: true },
      { id: 'kartu', label: 'Slip Kartu Presensi', icon: FileSpreadsheet },
      { id: 'izin', label: 'Kelola Izin & Tugas Dinas', icon: FileText },
      { id: 'import', label: 'Import Log Mesin (.DAT)', icon: UploadCloud },
      { id: 'ai', label: 'AI Analisis Presensi', icon: Sparkles },
      { id: 'pengaturan', label: 'Pengaturan Madrasah', icon: Settings },
    ];
  }

  const getRoleBadge = (role?: string) => {
    if (isSuperAdmin) {
      return { 
        label: 'SUPER ADMIN', 
        portalTitle: 'PORTAL SUPER ADMINISTRATOR',
        bg: 'bg-emerald-950 text-emerald-300 border-emerald-400 font-black' 
      };
    }
    switch (role) {
      case 'ADMIN':
        return { 
          label: 'ADMINISTRATOR', 
          portalTitle: 'PORTAL ADMINISTRATOR MADRASAH',
          bg: 'bg-rose-900/90 text-rose-200 border-rose-700/50' 
        };
      case 'KEPALA_MADRASAH':
        return { 
          label: 'KEPALA MADRASAH', 
          portalTitle: 'PORTAL SUPERVISI KEPALA MADRASAH',
          bg: 'bg-amber-900/90 text-amber-200 border-amber-700/50' 
        };
      case 'OPERATOR_TU':
        return { 
          label: 'OPERATOR TU', 
          portalTitle: 'PORTAL OPERATOR TATA USAHA',
          bg: 'bg-blue-900/90 text-blue-200 border-blue-700/50' 
        };
      case 'GURU':
      default:
        return { 
          label: 'GURU / GTK (MANDIRI)', 
          portalTitle: 'PORTAL GTK MANDIRI',
          bg: 'bg-emerald-800/90 text-emerald-200 border-emerald-700/50' 
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <header className="bg-emerald-900 text-white shadow-md print:hidden sticky top-0 z-40 border-b border-emerald-800">
      {/* Top Banner with Madrasah Identity & Live Clock */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {(profile.appLogoUrl || profile.logoUrl) ? (
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-emerald-500 shrink-0 overflow-hidden ring-2 ring-emerald-400/20">
              <img 
                src={profile.appLogoUrl || profile.logoUrl} 
                alt={profile.name} 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-inner shrink-0 overflow-hidden">
              <div className="w-full h-full bg-emerald-950/80 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-300" />
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700/60">
                {roleInfo.portalTitle}
              </span>
              <span className="text-xs text-emerald-300 font-medium hidden sm:inline">
                NSM: {profile.nsm} | NPSN: {profile.npsn}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              {profile.name}
            </h1>
          </div>
        </div>

        {/* Right Info: Super Admin Actions + User Pill + Live Date & Clock + Logout */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          
          {/* Admin & Super Admin cPanel & MySQL Export Button */}
          {(isSuperAdmin || currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR_TU') && onOpenPleskExport && (
            <button
              onClick={onOpenPleskExport}
              title="Download File ZIP Siap Pakai cPanel (Database MySQL: masbagoes_absensi) dan Kelola Auto-Sync"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 hover:from-emerald-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm border border-amber-300 transition cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-slate-950" />
              <span>cPanel & MySQL</span>
            </button>
          )}

          {/* Logged in user profile badge */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-700/50">
              <div className={`w-6 h-6 rounded-lg ${currentUser.avatarColor || 'bg-emerald-600'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight max-w-[130px] truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase font-bold border ${roleInfo.bg}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Live Date, Hijri Date, & Clock */}
          <div className="flex items-center gap-2.5 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-700/40">
            <div className="text-right hidden lg:block">
              <div className="text-[10px] font-semibold text-emerald-200">{todayStr}</div>
              <div className="text-[9px] text-emerald-400 font-medium">{hijriStr}</div>
            </div>
            <div className="h-5 w-px bg-emerald-700/60 hidden lg:block" />
            <div className="flex items-baseline gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400 self-center mr-0.5" />
              <span className="text-sm font-bold text-emerald-100">{time}</span>
              <span className="text-[10px] text-emerald-400 font-medium">:{seconds}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Keluar / Ganti Akun Login NIK"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-900/40 hover:bg-rose-800/80 border border-rose-600/50 text-rose-200 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
