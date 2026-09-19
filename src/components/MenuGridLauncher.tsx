import React, { useState } from 'react';
import { 
  Fingerprint, 
  CalendarDays, 
  Users, 
  Clock, 
  Settings, 
  Sparkles, 
  FileCheck, 
  UploadCloud, 
  CalendarCheck, 
  CreditCard, 
  FileText, 
  LayoutGrid, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Radio,
  Zap,
  LogOut
} from 'lucide-react';
import { Teacher, MadrasahProfile, AttendanceRecord, LeaveRequest } from '../types';

interface MenuGridLauncherProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: MadrasahProfile;
  currentUser: Teacher | null;
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  todayStats: {
    total: number;
    present: number;
    late: number;
    permission: number;
    absent: number;
  };
  serverSyncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
  onLogout?: () => void;
}

export const MenuGridLauncher: React.FC<MenuGridLauncherProps> = ({
  activeTab,
  setActiveTab,
  profile,
  currentUser,
  teachers,
  attendanceRecords,
  leaveRequests,
  todayStats,
  serverSyncStatus = 'synced',
  onManualSync,
  onLogout,
}) => {
  const isGuru = currentUser?.role === 'GURU';
  const isKepalaMadrasah = currentUser?.role === 'KEPALA_MADRASAH';
  
  // For Guru, default to compact pills so Fingerprint scanner is visible immediately without scrolling
  const [isExpanded, setIsExpanded] = useState<boolean>(!isGuru);
  const pendingLeaves = (leaveRequests || []).filter(r => r && r.status === 'PENDING').length;

  interface MenuItem {
    id: string;
    title: string;
    tagline: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string;
    badgeStyle?: string;
    roles: string[];
  }

  const allMenuItems: MenuItem[] = [
    {
      id: 'kiosk',
      title: isGuru ? 'Presensi Sidik Jari Saya' : 'Terminal Fingerprint',
      tagline: isGuru ? 'Sensor Biometrik & Log Kehadiran' : 'Kiosk & Presensi Cepat GTK',
      icon: Fingerprint,
      accentColor: 'from-emerald-600 to-teal-700',
      badge: isGuru ? 'Fingerprint' : 'Utama',
      badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU', 'GURU'],
    },
    {
      id: 'guru',
      title: isGuru ? 'Biodata & Profil Saya' : 'Master Data GTK & PIN',
      tagline: isGuru ? 'Biodata Simpatika & Cetak Dokumen' : `${(teachers || []).length} Guru & Tenaga Teknis`,
      icon: Users,
      accentColor: 'from-teal-600 to-emerald-800',
      badge: isGuru ? 'Profil' : `${(teachers || []).length} GTK`,
      badgeStyle: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU', 'GURU'],
    },
    {
      id: 'rekap',
      title: isGuru ? 'Rekap Kehadiran Saya' : 'Rekap Bulanan (S25)',
      tagline: isGuru ? 'Matriks & Riwayat Kehadiran Pribadi' : 'Format S25a / S25b SIMPATIKA',
      icon: CalendarDays,
      accentColor: 'from-blue-600 to-indigo-700',
      badge: 'S25',
      badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU', 'GURU'],
    },
    {
      id: 'kartu',
      title: isGuru ? 'Slip Presensi Saya' : 'Slip Kartu Presensi',
      tagline: isGuru ? 'Slip Bulanan & QR Card Pribadi' : 'Kartu QR & Slip Bulanan Per Guru',
      icon: CreditCard,
      accentColor: 'from-emerald-700 to-green-800',
      badge: 'Cetak',
      badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU', 'GURU'],
    },
    {
      id: 'izin',
      title: isGuru ? 'Pengajuan Izin & Cuti' : 'Izin & Dinas Luar',
      tagline: isGuru ? 'Pengajuan Izin, Cuti & Surat Tugas' : 'Pengajuan Cuti, Sakit & Tugas',
      icon: FileText,
      accentColor: 'from-rose-600 to-pink-700',
      badge: pendingLeaves > 0 ? `${pendingLeaves} Baru` : undefined,
      badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU', 'GURU'],
    },
    {
      id: 'harian',
      title: 'Jurnal Harian Presensi',
      tagline: 'Log Jam Datang & Pulang GTK',
      icon: CalendarCheck,
      accentColor: 'from-cyan-600 to-blue-700',
      badge: 'Harian',
      badgeStyle: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU'],
    },
    {
      id: 'sptjm',
      title: 'Cetak SPTJM Kemenag',
      tagline: 'Lampiran Resmi Pencairan TPG',
      icon: FileCheck,
      accentColor: 'from-amber-600 to-orange-700',
      badge: 'Resmi',
      badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU'],
    },
    {
      id: 'import',
      title: 'Import Log Mesin (.DAT)',
      tagline: 'Sinkronisasi File Mesin Finger',
      icon: UploadCloud,
      accentColor: 'from-sky-600 to-indigo-700',
      badge: 'Sync',
      badgeStyle: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
      roles: ['ADMIN', 'OPERATOR_TU'],
    },
    {
      id: 'ai',
      title: 'AI Supervisi & Analisis',
      tagline: 'Analisis Cerdas Presensi GTK',
      icon: Sparkles,
      accentColor: 'from-amber-500 to-yellow-600',
      badge: 'Gemini',
      badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      roles: ['ADMIN', 'KEPALA_MADRASAH', 'OPERATOR_TU'],
    },
    {
      id: 'pengaturan',
      title: 'Pengaturan Madrasah',
      tagline: 'Jadwal Kerja & Profil Lembaga',
      icon: Settings,
      accentColor: 'from-slate-700 to-zinc-900',
      badge: 'Sistem',
      badgeStyle: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
      roles: ['ADMIN', 'OPERATOR_TU'],
    },
  ];

  const filteredItems = allMenuItems.filter(item => {
    if (isGuru) return item.roles.includes('GURU');
    if (isKepalaMadrasah) return item.roles.includes('KEPALA_MADRASAH');
    return true;
  });

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    // Smooth scroll down to active content container
    const contentElement = document.getElementById('active-module-content');
    if (contentElement) {
      contentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="space-y-3 mb-6 print:hidden">
      {/* Top Banner Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                MENU MODUL PRESENSI & MANAJEMEN GTK
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                {currentUser?.role?.replace('_', ' ') || 'GTK'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              {isGuru ? 'Pilih menu mandiri di bawah untuk presensi, rekap, slip, dan izin' : 'Pilih ikon modul di bawah untuk mengelola operasional presensi madrasah'}
            </p>
          </div>
        </div>

        {/* Right side: Cloud Sync & Minimize Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-Device Cloud Sync Status Indicator */}
          <button
            onClick={onManualSync}
            title="Status sinkronisasi multi-perangkat real-time. Klik untuk sinkronisasi manual."
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              serverSyncStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : serverSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              serverSyncStatus === 'synced' ? 'bg-emerald-500' : serverSyncStatus === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
            }`} />
            <span>
              {serverSyncStatus === 'synced' ? 'Sinkron Multi-Device' : serverSyncStatus === 'syncing' ? 'Menyinkronkan...' : 'Offline'}
            </span>
          </button>

          {/* Today Presence Count */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{isGuru ? 'Hari Ini:' : 'Hadir Hari Ini:'}</span>
            <span className="text-emerald-800 font-black">
              {isGuru ? (
                todayStats.present > 0 || todayStats.late > 0 ? '✓ Hadir' : 'Belum Presensi'
              ) : (
                `${todayStats.present + todayStats.late} / ${todayStats.total}`
              )}
            </span>
          </div>

          {/* Expand / Minimize Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Sembunyikan kisi menu' : 'Buka kisi menu'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-100 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-800 border border-zinc-300 transition cursor-pointer"
          >
            <span>{isExpanded ? 'Tutup Grid' : 'Buka Grid'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Explicit Logout Button (Mudah diakses di Android/Mobile) */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar dari akun ini & kembali ke halaman Login NIK/PIN"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Iconic Grid - Displayed in full glory or Compact Quick Bar */}
      {isExpanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-fadeIn">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`group relative text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between border cursor-pointer min-h-[105px] sm:min-h-[115px] shadow-xs ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-emerald-400 hover:shadow-md'
                }`}
              >
                {/* Top Row: Icon Badge + Pill Tags / Active Beacon */}
                <div className="flex items-center justify-between gap-2 w-full mb-2.5">
                  <div 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${item.accentColor} text-white flex items-center justify-center shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-108`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border leading-tight ${item.badgeStyle || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom: Crisp Title & Informative Tagline */}
                <div className="w-full">
                  <h3 className={`text-xs sm:text-sm font-black leading-snug tracking-tight ${
                    isActive ? 'text-emerald-950 font-black' : 'text-zinc-900 group-hover:text-emerald-800'
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-[11px] font-medium leading-normal mt-0.5 truncate ${
                    isActive ? 'text-emerald-700 font-semibold' : 'text-zinc-500 group-hover:text-zinc-700'
                  }`}>
                    {item.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-fadeIn">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border shrink-0 ${
                  isActive
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200 hover:border-emerald-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-zinc-500'}`} />
                <span>{item.title}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    isActive ? 'bg-emerald-950 text-emerald-200' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
