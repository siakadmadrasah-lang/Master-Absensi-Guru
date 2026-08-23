import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fingerprint, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileText, 
  User, 
  UserCheck, 
  Shield, 
  Sparkles, 
  Download, 
  Printer, 
  ArrowRight, 
  Building,
  CalendarDays,
  Award,
  BookOpen,
  Zap,
  TrendingUp,
  CreditCard,
  Send,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Teacher, 
  AttendanceRecord, 
  LeaveRequest, 
  WorkSchedule, 
  MadrasahProfile, 
  HolidayItem 
} from '../types';
import { 
  formatIndonesianDate, 
  formatShortDate, 
  calculateLateMinutes, 
  getLocalDateString, 
  isTeacherRecordMatch 
} from '../utils/attendanceUtils';
import { playSuccessChime, playErrorChime, speakIndonesianFeedback } from '../utils/audioChime';

interface PortalGtkDashboardProps {
  teacher: Teacher;
  profile: MadrasahProfile;
  schedule: WorkSchedule;
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  holidays: HolidayItem[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onNavigateTab: (tabId: string) => void;
}

export const PortalGtkDashboard: React.FC<PortalGtkDashboardProps> = ({
  teacher,
  profile,
  schedule,
  records,
  leaveRequests,
  holidays,
  onRecordAttendance,
  onNavigateTab,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getLocalDateString(currentTime);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentSecond = currentTime.getSeconds();
  const timeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:${String(currentSecond).padStart(2, '0')}`;

  const dayOfWeek = currentTime.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  const currentDaySchedule = isFriday 
    ? schedule.friday 
    : isSaturday 
    ? schedule.saturday 
    : schedule.mondayThursday;

  // Filter records belonging strictly to this teacher
  const teacherRecords = useMemo(() => {
    return (records || []).filter((r) => isTeacherRecordMatch(r.teacherId, teacher));
  }, [records, teacher]);

  // Today's record for this teacher
  const todayRecord = useMemo(() => {
    return teacherRecords.find((r) => r.date === todayStr);
  }, [teacherRecords, todayStr]);

  // Monthly statistics for this teacher
  const currentMonthStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthRecords = useMemo(() => {
    return teacherRecords.filter((r) => r.date.startsWith(currentMonthStr));
  }, [teacherRecords, currentMonthStr]);

  const stats = useMemo(() => {
    let hadir = 0;
    let telat = 0;
    let totalTelatMenit = 0;
    let izin = 0;
    let sakit = 0;
    let cuti = 0;
    let dinasLuar = 0;

    thisMonthRecords.forEach((r) => {
      if (r.status === 'HADIR') hadir++;
      else if (r.status === 'TERLAMBAT') {
        telat++;
        totalTelatMenit += r.lateMinutes || 0;
      } else if (r.status === 'IZIN') izin++;
      else if (r.status === 'SAKIT') sakit++;
      else if (r.status === 'CUTI') cuti++;
      else if (r.status === 'DINAS_LUAR') dinasLuar++;
    });

    const totalHariKehadiran = hadir + telat + dinasLuar;
    const totalHariKerja = 24; // Standard monthly working days
    const persentase = totalHariKerja > 0 ? Math.min(100, Math.round((totalHariKehadiran / totalHariKerja) * 100)) : 100;

    return {
      hadir,
      telat,
      totalTelatMenit,
      izin,
      sakit,
      cuti,
      dinasLuar,
      totalHariKehadiran,
      persentase,
    };
  }, [thisMonthRecords]);

  // Handle Attendance Action (Check-in or Check-out)
  const handleDoAttendance = (action: 'IN' | 'OUT') => {
    if (isScanning) return;
    setIsScanning(true);
    setScanMessage(null);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setTimeout(() => {
      setIsScanning(false);

      if (action === 'IN') {
        if (todayRecord && todayRecord.checkInTime) {
          playErrorChime();
          setScanMessage({
            type: 'warning',
            text: `Anda sudah melakukan presensi masuk hari ini pada pukul ${todayRecord.checkInTime}.`,
          });
          speakIndonesianFeedback(`Sudah absen masuk pukul ${todayRecord.checkInTime}`);
          return;
        }

        const lateMins = calculateLateMinutes(timeStr, currentDaySchedule.checkInLimit, schedule.toleranceMinutes || 5);
        const status = lateMins > 0 ? 'TERLAMBAT' : 'HADIR';

        const newRecord: AttendanceRecord = {
          id: todayRecord?.id || `rec-${teacher.id}-${todayStr}`,
          teacherId: teacher.id,
          date: todayStr,
          checkInTime: timeStr,
          checkOutTime: todayRecord?.checkOutTime,
          status: status,
          lateMinutes: lateMins,
          earlyLeaveMinutes: 0,
          workDurationMinutes: 0,
          verificationMethod: 'FINGERPRINT',
          notes: lateMins > 0 ? `Terlambat ${lateMins} menit (Portal Mandiri GTK)` : 'Tepat Waktu (Portal Mandiri GTK)',
        };

        onRecordAttendance(newRecord);
        playSuccessChime();
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
        setScanMessage({
          type: 'success',
          text: `Presensi MASUK berhasil tercatat pukul ${timeStr}. Status: ${status === 'TERLAMBAT' ? `Terlambat (${lateMins} mnt)` : 'Tepat Waktu'}.`,
        });
        speakIndonesianFeedback(`Presensi masuk berhasil, ${teacher.name}`);
      } else {
        // Check-out
        if (todayRecord && todayRecord.checkOutTime) {
          playErrorChime();
          setScanMessage({
            type: 'warning',
            text: `Anda sudah melakukan presensi pulang hari ini pada pukul ${todayRecord.checkOutTime}.`,
          });
          speakIndonesianFeedback(`Sudah absen pulang pukul ${todayRecord.checkOutTime}`);
          return;
        }

        const newRecord: AttendanceRecord = {
          id: todayRecord?.id || `rec-${teacher.id}-${todayStr}`,
          teacherId: teacher.id,
          date: todayStr,
          checkInTime: todayRecord?.checkInTime || timeStr,
          checkOutTime: timeStr,
          status: todayRecord?.status || 'HADIR',
          lateMinutes: todayRecord?.lateMinutes || 0,
          earlyLeaveMinutes: 0,
          workDurationMinutes: 0,
          verificationMethod: 'FINGERPRINT',
          notes: todayRecord?.notes ? `${todayRecord.notes} | Pulang ${timeStr}` : `Pulang ${timeStr} (Portal Mandiri GTK)`,
        };

        onRecordAttendance(newRecord);
        playSuccessChime();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setScanMessage({
          type: 'success',
          text: `Presensi PULANG berhasil tercatat pukul ${timeStr}. Selamat beristirahat!`,
        });
        speakIndonesianFeedback(`Presensi pulang berhasil, terima kasih`);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner GTK Mandiri */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Identity Info */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg border-2 border-emerald-300/40 shrink-0 ${teacher.avatarColor || 'bg-emerald-600'}`}>
              {teacher.fingerprintId ? `#${teacher.fingerprintId}` : teacher.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>PORTAL MANDIRI GTK</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold">
                  Status: {teacher.employmentStatus}
                </span>
                {teacher.fingerprintId && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-mono font-bold">
                    ID Mesin: #{teacher.fingerprintId}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black mt-1.5 text-white tracking-tight">
                {teacher.name}{teacher.title ? `, ${teacher.title}` : ''}
              </h1>
              
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                {teacher.position} • {profile.name}
              </p>
            </div>
          </div>

          {/* Quick Actions for GTK */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => onNavigateTab('kartu')}
              className="px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>Slip Presensi Saya</span>
            </button>
            <button
              onClick={() => onNavigateTab('izin')}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-500/40 shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Ajukan Izin / Cuti</span>
            </button>
            <button
              onClick={() => onNavigateTab('guru')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600/60 shadow-sm transition-all cursor-pointer"
            >
              <User className="w-4 h-4 text-teal-400" />
              <span>Biodata Saya</span>
            </button>
          </div>
        </div>

        {/* GTK Specific Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">NIP / NUPTK</span>
            <span className="font-mono font-bold text-white text-xs truncate block mt-0.5">
              {teacher.nip || teacher.nuptk || '-'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Peg ID Simpatika</span>
            <span className="font-mono font-bold text-white text-xs truncate block mt-0.5">
              {teacher.pegId || teacher.npk || '-'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Beban Mengajar (JTM)</span>
            <span className="font-bold text-white text-xs block mt-0.5">
              {teacher.teachingHoursPerWeek || 24} Jam Tatap Muka
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Hari Ini</span>
            <span className="font-semibold text-white text-xs truncate block mt-0.5">
              {formatIndonesianDate(todayStr)}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Status Akun</span>
            <span className="font-bold text-emerald-300 text-xs flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Aktif Terdaftar</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Attendance Pad & Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: One-Click Presensi Mandiri (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-700" />
                <span>Presensi Mandiri Hari Ini</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isSunday ? 'Hari Minggu (Libur Mingguan)' : `Jadwal: Masuk s.d ${currentDaySchedule.checkInLimit} • Pulang mulai ${currentDaySchedule.checkOutStart}`}
              </p>
            </div>

            {/* Live Clock Badge */}
            <div className="px-3.5 py-1.5 bg-zinc-900 text-emerald-400 font-mono font-black text-sm rounded-xl flex items-center gap-2 shadow-xs">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{timeFormatted}</span>
            </div>
          </div>

          {/* Alert Message Notification */}
          {scanMessage && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-fadeIn ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : scanMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}>
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span>{scanMessage.text}</span>
            </div>
          )}

          {/* Today's Live Status Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Status Kehadiran Hari Ini
              </span>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className={`text-base sm:text-lg font-black ${
                  todayRecord?.status === 'HADIR'
                    ? 'text-emerald-700'
                    : todayRecord?.status === 'TERLAMBAT'
                    ? 'text-amber-700'
                    : ['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(todayRecord?.status || '')
                    ? 'text-blue-700'
                    : 'text-zinc-700'
                }`}>
                  {todayRecord?.status ? todayRecord.status : 'BELUM PRESENSI'}
                </span>
                {todayRecord?.lateMinutes && todayRecord.lateMinutes > 0 ? (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                    +{todayRecord.lateMinutes} mnt
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">
                Masuk: <strong>{todayRecord?.checkInTime || '-'}</strong> • Pulang: <strong>{todayRecord?.checkOutTime || '-'}</strong>
              </p>
            </div>

            {/* Biometric Interactive Action */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleDoAttendance('IN')}
                disabled={isScanning || (!!todayRecord?.checkInTime)}
                className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-5 h-5 text-emerald-200" />
                <span>{todayRecord?.checkInTime ? 'Sudah Masuk' : 'Presensi Masuk'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDoAttendance('OUT')}
                disabled={isScanning || (!!todayRecord?.checkOutTime)}
                className="flex-1 sm:flex-initial px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-5 h-5 text-amber-200" />
                <span>{todayRecord?.checkOutTime ? 'Sudah Pulang' : 'Presensi Pulang'}</span>
              </button>
            </div>
          </div>

          {/* Quick Schedule Reference for GTK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
              <span className="text-zinc-500 block font-medium">Senin — Kamis</span>
              <span className="font-bold text-zinc-800 mt-0.5 block">
                {schedule.mondayThursday.checkInStart} - {schedule.mondayThursday.checkInLimit} / {schedule.mondayThursday.checkOutStart}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
              <span className="text-zinc-500 block font-medium">Jumat</span>
              <span className="font-bold text-zinc-800 mt-0.5 block">
                {schedule.friday.checkInStart} - {schedule.friday.checkInLimit} / {schedule.friday.checkOutStart}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
              <span className="text-zinc-500 block font-medium">Sabtu</span>
              <span className="font-bold text-zinc-800 mt-0.5 block">
                {schedule.saturday.checkInStart} - {schedule.saturday.checkInLimit} / {schedule.saturday.checkOutStart}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Monthly Personal KPI & History (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-zinc-200 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>Rekapitulasi Kehadiran Bulan Ini</span>
            </h3>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              {stats.persentase}% Kehadiran
            </span>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-bold block">Tepat Waktu (H)</span>
              <span className="text-xl font-black text-emerald-950 mt-1 block">{stats.hadir} Hari</span>
            </div>
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200">
              <span className="text-[11px] text-amber-800 font-bold block">Terlambat (T)</span>
              <span className="text-xl font-black text-amber-950 mt-1 block">
                {stats.telat} <span className="text-xs font-medium text-amber-700">({stats.totalTelatMenit} m)</span>
              </span>
            </div>
            <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200">
              <span className="text-[11px] text-blue-800 font-bold block">Izin / Cuti (I/C)</span>
              <span className="text-xl font-black text-blue-950 mt-1 block">{stats.izin + stats.cuti} Hari</span>
            </div>
            <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200">
              <span className="text-[11px] text-purple-800 font-bold block">Sakit / Dinas (S/DL)</span>
              <span className="text-xl font-black text-purple-950 mt-1 block">{stats.sakit + stats.dinasLuar} Hari</span>
            </div>
          </div>

          {/* Recent 5 Attendance Logs */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-700">5 Catatan Terakhir Anda</span>
              <button
                onClick={() => onNavigateTab('rekap')}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {teacherRecords.slice(0, 5).map((rec) => (
                <div 
                  key={rec.id} 
                  className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-zinc-800 block">{formatShortDate(rec.date)}</span>
                    <span className="text-[10px] text-zinc-500">
                      In: {rec.checkInTime || '-'} • Out: {rec.checkOutTime || '-'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    rec.status === 'HADIR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rec.status === 'TERLAMBAT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              ))}

              {teacherRecords.length === 0 && (
                <p className="text-center text-xs text-zinc-400 py-4 italic">
                  Belum ada catatan presensi untuk akun Anda.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
