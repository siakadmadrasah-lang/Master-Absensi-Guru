import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile } from '../types';
import { formatIndonesianDate, calculateLateMinutes, getLocalDateString, isTeacherRecordMatch } from '../utils/attendanceUtils';
import { playSuccessChime, playErrorChime, speakIndonesianFeedback } from '../utils/audioChime';

interface KioskFingerprintProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
  currentUser?: Teacher | null;
  onRecordAttendance: (record: AttendanceRecord) => void;
}

export const KioskFingerprint: React.FC<KioskFingerprintProps> = ({
  teachers,
  attendanceRecords,
  schedule,
  profile,
  currentUser,
  onRecordAttendance,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputFingerId, setInputFingerId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [audioVoiceEnabled, setAudioVoiceEnabled] = useState<boolean>(true);
  const [forcedMode, setForcedMode] = useState<'AUTO' | 'CHECK_IN' | 'CHECK_OUT'>('AUTO');
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'SUCCESS' | 'ALREADY' | 'ERROR';
    teacher?: Teacher;
    record?: AttendanceRecord;
    message: string;
    type: 'IN' | 'OUT';
  } | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const isGuru = currentUser?.role === 'GURU';

  // Find or match the logged in user with the GTK teacher database
  const loggedInTeacher = React.useMemo(() => {
    if (!currentUser) return null;
    const found = teachers.find(
      (t) =>
        t.id === currentUser.id ||
        (currentUser.nik && t.nik === currentUser.nik) ||
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    );
    return found || currentUser;
  }, [currentUser, teachers]);

  // Set initial selected teacher to the logged in user
  useEffect(() => {
    if (loggedInTeacher) {
      setSelectedTeacherId(loggedInTeacher.id);
    } else if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [loggedInTeacher, teachers]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getLocalDateString(currentTime);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentSecond = currentTime.getSeconds();
  const timeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:${String(currentSecond).padStart(2, '0')}`;

  // Determine if currently it's check-in or check-out window
  const dayOfWeek = currentTime.getDay(); // 5 is Friday, 6 is Saturday
  const isFriday = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;

  const currentScheduleLimit = isFriday 
    ? schedule.friday.checkInLimit 
    : isSaturday 
    ? schedule.saturday.checkInLimit 
    : schedule.mondayThursday.checkInLimit;

  const defaultMode = (currentHour >= 11 || (isFriday && currentHour >= 10)) ? 'CHECK_OUT' : 'CHECK_IN';
  const effectiveMode = forcedMode === 'AUTO' ? defaultMode : forcedMode;

  // Filter teachers today records
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);

  const handleFingerprintScan = (teacher: Teacher) => {
    if (!teacher || isScanning) return;

    setIsScanning(true);
    setScanProgress(0);

    // Simulate realistic biometric optical reader scanning delay (600ms)
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 120);

    setTimeout(() => {
      setIsScanning(false);
      processAttendance(teacher);
    }, 650);
  };

  const processAttendance = (teacher: Teacher) => {
    const existingRecord = todayRecords.find(r => isTeacherRecordMatch(r.teacherId, teacher));
    const timeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`;

    if (effectiveMode === 'CHECK_IN') {
      if (existingRecord && existingRecord.checkInTime) {
        playErrorChime();
        setLastScanResult({
          status: 'ALREADY',
          teacher,
          record: existingRecord,
          message: `Bapak/Ibu ${teacher.name} sudah melakukan presensi masuk pukul ${existingRecord.checkInTime}.`,
          type: 'IN',
        });
        if (audioVoiceEnabled) {
          speakIndonesianFeedback(`Sudah absen masuk pukul ${existingRecord.checkInTime}`);
        }
        return;
      }

      // Calculate if late
      const lateMins = calculateLateMinutes(timeStr, currentScheduleLimit, schedule.toleranceMinutes);
      const isLate = lateMins > 0;

      const newRecord: AttendanceRecord = {
        id: existingRecord?.id || `att-${teacher.id}-${todayStr}`,
        teacherId: teacher.id,
        date: todayStr,
        checkInTime: timeStr,
        checkOutTime: existingRecord?.checkOutTime,
        status: isLate ? 'TERLAMBAT' : 'HADIR',
        lateMinutes: lateMins,
        earlyLeaveMinutes: 0,
        workDurationMinutes: 0,
        verificationMethod: 'FINGERPRINT',
        notes: isLate ? `Terlambat ${lateMins} menit (Batas: ${currentScheduleLimit})` : 'Presensi Sidik Jari Tepat Waktu',
      };

      onRecordAttendance(newRecord);
      playSuccessChime();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      setLastScanResult({
        status: 'SUCCESS',
        teacher,
        record: newRecord,
        message: isLate 
          ? `Presensi Masuk Berhasil (Terlambat ${lateMins} menit). Tetap semangat mengajar!`
          : `Presensi Masuk Berhasil Tepat Waktu. Selamat bertugas di ${profile.name}!`,
        type: 'IN',
      });

      if (audioVoiceEnabled) {
        const greeting = isLate ? "Terima kasih, presensi masuk tercatat terlambat." : "Terima kasih, presensi masuk berhasil tepat waktu.";
        speakIndonesianFeedback(`${greeting} Selamat bertugas Bapak Ibu ${teacher.name}`);
      }
    } else {
      // CHECK_OUT Mode
      if (!existingRecord) {
        // Did not check-in, but checking out
        const newRecord: AttendanceRecord = {
          id: `att-${teacher.id}-${todayStr}`,
          teacherId: teacher.id,
          date: todayStr,
          checkOutTime: timeStr,
          status: 'HADIR',
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          workDurationMinutes: 360,
          verificationMethod: 'FINGERPRINT',
          notes: 'Presensi Sidik Jari Pulang (Tanpa Log Masuk)',
        };
        onRecordAttendance(newRecord);
        playSuccessChime();
        setLastScanResult({
          status: 'SUCCESS',
          teacher,
          record: newRecord,
          message: `Presensi Pulang Berhasil pukul ${timeStr}. Selamat beristirahat!`,
          type: 'OUT',
        });
        if (audioVoiceEnabled) {
          speakIndonesianFeedback(`Presensi pulang berhasil. Hati-hati di jalan Bapak Ibu ${teacher.name}`);
        }
        return;
      }

      if (existingRecord.checkOutTime) {
        playErrorChime();
        setLastScanResult({
          status: 'ALREADY',
          teacher,
          record: existingRecord,
          message: `Bapak/Ibu ${teacher.name} sudah melakukan presensi pulang pukul ${existingRecord.checkOutTime}.`,
          type: 'OUT',
        });
        if (audioVoiceEnabled) {
          speakIndonesianFeedback(`Sudah absen pulang pukul ${existingRecord.checkOutTime}`);
        }
        return;
      }

      // Calculate work duration
      let durationMins = 420;
      if (existingRecord.checkInTime) {
        const [inH, inM] = existingRecord.checkInTime.split(':').map(Number);
        const [outH, outM] = timeStr.split(':').map(Number);
        durationMins = Math.max(30, (outH * 60 + outM) - (inH * 60 + inM));
      }

      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        checkOutTime: timeStr,
        workDurationMinutes: durationMins,
      };

      onRecordAttendance(updatedRecord);
      playSuccessChime();
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });

      setLastScanResult({
        status: 'SUCCESS',
        teacher,
        record: updatedRecord,
        message: `Presensi Pulang Berhasil pukul ${timeStr} (Total Kerja: ${Math.floor(durationMins / 60)}j ${durationMins % 60}m). Hati-hati di perjalanan!`,
        type: 'OUT',
      });

      if (audioVoiceEnabled) {
        speakIndonesianFeedback(`Presensi pulang berhasil. Selamat beristirahat dan terima kasih atas dedikasinya.`);
      }
    }
  };

  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputFingerId.trim()) return;

    const query = inputFingerId.trim().toLowerCase();
    const found = teachers.find(t => 
      t.fingerprintId.toString() === query ||
      (t.nip && t.nip.includes(query)) ||
      (t.nuptk && t.nuptk.includes(query)) ||
      (t.npk && t.npk.includes(query)) ||
      t.name.toLowerCase().includes(query)
    );

    if (found) {
      handleFingerprintScan(found);
      setInputFingerId('');
    } else {
      playErrorChime();
      setLastScanResult({
        status: 'ERROR',
        message: `ID Sidik Jari / NIP "${inputFingerId}" tidak ditemukan dalam daftar GTK.`,
        type: effectiveMode === 'CHECK_IN' ? 'IN' : 'OUT',
      });
      if (audioVoiceEnabled) {
        speakIndonesianFeedback("ID sidik jari tidak terdaftar.");
      }
    }
  };

  const filteredTeachers = teachers.filter(t => {
    if (!t.isActive) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.position.toLowerCase().includes(q) ||
      (t.nip && t.nip.includes(q)) ||
      t.fingerprintId.toString() === q
    );
  });

  // Calculate active target teacher for scanning
  const activeTargetTeacher = React.useMemo(() => {
    if (selectedTeacherId) {
      const found = teachers.find((item) => item.id === selectedTeacherId);
      if (found) return found;
    }
    if (loggedInTeacher) return loggedInTeacher;
    if (teachers.length > 0) return teachers[0];
    return null;
  }, [selectedTeacherId, teachers, loggedInTeacher]);

  return (
    <div id="kiosk-fingerprint-root" className="max-w-7xl mx-auto space-y-5">
      {/* Top Banner / Mode Controller - Displayed for Admin / Kiosk Station */}
      {!isGuru && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg border border-emerald-700/50">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-semibold text-emerald-200 border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                TERMINAL PRESENSI BIOMETRIK REAL-TIME
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Sensor Sidik Jari GTK Madrasah
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
                Tempelkan sidik jari pada pemindai, ketik nomor ID Finger, atau klik profil guru untuk mencatat presensi harian otomatis.
              </p>
            </div>

            {/* Mode Selector & Sound Toggle */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/40">
              <div className="flex items-center gap-1 bg-emerald-900/90 p-1 rounded-lg">
                <button
                  id="btn-mode-auto"
                  onClick={() => setForcedMode('AUTO')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    forcedMode === 'AUTO'
                      ? 'bg-emerald-500 text-emerald-950 shadow-sm'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  Otomatis ({defaultMode === 'CHECK_IN' ? 'Masuk' : 'Pulang'})
                </button>
                <button
                  id="btn-mode-checkin"
                  onClick={() => setForcedMode('CHECK_IN')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    forcedMode === 'CHECK_IN'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  Paksa Masuk
                </button>
                <button
                  id="btn-mode-checkout"
                  onClick={() => setForcedMode('CHECK_OUT')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    forcedMode === 'CHECK_OUT'
                      ? 'bg-amber-500 text-amber-950 shadow-sm'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  Paksa Pulang
                </button>
              </div>

              <button
                id="btn-toggle-sound"
                onClick={() => setAudioVoiceEnabled(!audioVoiceEnabled)}
                title={audioVoiceEnabled ? "Suara konfirmasi aktif" : "Suara dimatikan"}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  audioVoiceEnabled
                    ? 'bg-emerald-600/80 text-emerald-100 border-emerald-400/40 hover:bg-emerald-600'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                }`}
              >
                {audioVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                <span className="hidden sm:inline">{audioVoiceEnabled ? 'Suara Aktif' : 'Mute'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Terminal Grid: Interactive Scanner Box + Quick Teacher Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Biometric Interactive Scanner & Fast Keypad (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-200 text-center relative overflow-hidden">
            
            {/* Top Indicator & Mode / Audio Controls */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wide truncate">
                  Sensor Optical Biometric #01
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isGuru && (
                  <button
                    type="button"
                    onClick={() => setAudioVoiceEnabled(!audioVoiceEnabled)}
                    title={audioVoiceEnabled ? "Suara konfirmasi aktif" : "Suara dimatikan"}
                    className="p-1.5 rounded-lg text-xs text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 border border-zinc-200 transition cursor-pointer"
                  >
                    {audioVoiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-400" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isGuru) {
                      setForcedMode(forcedMode === 'AUTO' ? (defaultMode === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN') : 'AUTO');
                    }
                  }}
                  title={isGuru ? "Klik untuk mengganti mode Masuk / Pulang" : undefined}
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full transition ${
                    isGuru ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
                  } ${
                    effectiveMode === 'CHECK_IN' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {effectiveMode === 'CHECK_IN' ? '⚡ MODE PRESENSI MASUK' : '🚪 MODE PRESENSI PULANG'}
                </button>
              </div>
            </div>

            {/* Active Target GTK Card (Ensures Attendance is Recorded for the Correct Teacher) */}
            {activeTargetTeacher && (
              <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl text-left flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow ${activeTargetTeacher.avatarColor || 'bg-emerald-700'}`}>
                    {activeTargetTeacher.fingerprintId ? `#${activeTargetTeacher.fingerprintId}` : activeTargetTeacher.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>GTK Terpilih</span>
                      {loggedInTeacher && activeTargetTeacher.id === loggedInTeacher.id && (
                        <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded text-[9px] font-bold">
                          Akun Anda
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-xs text-zinc-900 truncate">
                      {activeTargetTeacher.name} {activeTargetTeacher.title ? `, ${activeTargetTeacher.title}` : ''}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {activeTargetTeacher.position || activeTargetTeacher.role}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleFingerprintScan(activeTargetTeacher)}
                  disabled={isScanning}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Presensi</span>
                </button>
              </div>
            )}

            {/* Glowing Interactive Fingerprint Scanner Pad */}
            <div className="my-5 flex flex-col items-center justify-center">
              <div 
                id="interactive-fingerprint-pad"
                onClick={() => {
                  if (activeTargetTeacher) {
                    handleFingerprintScan(activeTargetTeacher);
                  }
                }}
                className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform select-none ${
                  isScanning 
                    ? 'scale-105 bg-emerald-100 ring-8 ring-emerald-400 shadow-2xl shadow-emerald-300/60' 
                    : 'bg-gradient-to-b from-emerald-50 to-teal-100 hover:from-emerald-100 hover:to-teal-200 ring-4 ring-emerald-200/80 shadow-lg hover:shadow-emerald-200/50'
                }`}
              >
                {/* Scanning Laser Animation Line */}
                {isScanning && (
                  <div className="absolute inset-x-4 top-4 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-bounce shadow-md" />
                )}

                <Fingerprint className={`w-24 h-24 transition-all duration-300 ${
                  isScanning 
                    ? 'text-emerald-600 scale-110 animate-pulse' 
                    : 'text-emerald-700 hover:text-emerald-800'
                }`} />

                <span className="text-[11px] font-bold text-emerald-800 mt-1 uppercase tracking-wider">
                  {isScanning ? 'MEMINDAI...' : 'TEMPELKAN JARI'}
                </span>

                {isScanning && (
                  <div className="absolute bottom-3 text-xs font-mono font-bold text-emerald-900">
                    {scanProgress}%
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-500 mt-3 font-medium">
                Sentuh lingkaran sidik jari di atas untuk mencatat presensi {activeTargetTeacher ? `an. ${activeTargetTeacher.name}` : ''}
              </p>
            </div>

            {/* Quick Keypad / ID Input Form */}
            <form onSubmit={handleManualKeySubmit} className="space-y-3 pt-2 border-t border-zinc-100">
              <label className="block text-xs font-bold text-zinc-700 text-left">
                Scan Barcode / Input ID Finger / NIP Guru:
              </label>
              <div className="flex gap-2">
                <input
                  id="input-finger-id"
                  type="text"
                  value={inputFingerId}
                  onChange={(e) => setInputFingerId(e.target.value)}
                  placeholder="Ketik ID Finger (1,2..) atau NIP..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                <button
                  id="btn-submit-finger-id"
                  type="submit"
                  disabled={isScanning || !inputFingerId.trim()}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Scan</span>
                </button>
              </div>
            </form>

            {/* Scan Feedback Banner */}
            {lastScanResult && (
              <div 
                id="scan-result-card"
                className={`mt-4 p-4 rounded-xl text-left border transition-all animate-fadeIn ${
                  lastScanResult.status === 'SUCCESS'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : lastScanResult.status === 'ALREADY'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastScanResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-sm">
                      {lastScanResult.teacher ? `${lastScanResult.teacher.name}, ${lastScanResult.teacher.title}` : 'Hasil Pemindaian'}
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {lastScanResult.message}
                    </p>
                    {lastScanResult.record && (
                      <div className="text-[11px] text-zinc-600 pt-1 flex flex-wrap gap-2">
                        <span>Jam: {lastScanResult.record.checkInTime || lastScanResult.record.checkOutTime} WIB</span>
                        <span>•</span>
                        <span>Metode: {lastScanResult.record.verificationMethod}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Notice Box */}
            <div className="mt-4 bg-zinc-50 rounded-xl p-3 text-left text-xs text-zinc-600 border border-zinc-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="font-bold text-zinc-800">Batas Masuk Normal: </span>
                  <span className="font-semibold text-emerald-700">{currentScheduleLimit} WIB</span>
                  <span className="text-[10px] text-zinc-500 block">Toleransi keterlambatan: {schedule.toleranceMinutes} menit</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Roster GTK for Admin vs Personal Attendance Dashboard for Guru (7 cols) */}
        {isGuru ? (
          <div className="lg:col-span-7 space-y-5">
            {/* Today's Personal Attendance Status Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-200">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm ${loggedInTeacher?.avatarColor || 'bg-emerald-700'}`}>
                    #{loggedInTeacher?.fingerprintId || '1'}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                      Status Presensi Mandiri GTK
                    </div>
                    <h3 className="font-extrabold text-sm text-zinc-900">
                      {loggedInTeacher?.name}{loggedInTeacher?.title ? `, ${loggedInTeacher?.title}` : ''}
                    </h3>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 font-medium bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200">
                  {formatIndonesianDate(todayStr)}
                </span>
              </div>

              {/* Status Details Grid */}
              {(() => {
                const myTodayRec = todayRecords.find(r => isTeacherRecordMatch(r.teacherId, loggedInTeacher || currentUser));
                const hasIn = !!myTodayRec?.checkInTime;
                const hasOut = !!myTodayRec?.checkOutTime;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Presensi Masuk</span>
                        <div className="font-mono text-base font-extrabold text-emerald-950">
                          {hasIn ? myTodayRec.checkInTime : '--:--'}
                        </div>
                        <span className="text-[10px] text-emerald-700 block mt-0.5 font-medium">
                          {hasIn ? (myTodayRec.status === 'TERLAMBAT' ? `Telat ${myTodayRec.lateMinutes} mnt` : 'Tepat Waktu') : 'Belum absen masuk'}
                        </span>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                        <span className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Presensi Pulang</span>
                        <div className="font-mono text-base font-extrabold text-blue-950">
                          {hasOut ? myTodayRec.checkOutTime : '--:--'}
                        </div>
                        <span className="text-[10px] text-blue-700 block mt-0.5 font-medium">
                          {hasOut ? 'Sudah absen pulang' : hasIn ? 'Menunggu jam pulang' : 'Belum absen'}
                        </span>
                      </div>

                      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-purple-800 uppercase block mb-1">Status Hari Ini</span>
                        <div className="font-bold text-sm text-purple-950">
                          {hasIn ? (
                            myTodayRec.status === 'TERLAMBAT' ? 'Terlambat' : 'Hadir'
                          ) : 'Belum Hadir'}
                        </div>
                        <span className="text-[10px] text-purple-700 block mt-0.5 font-medium">
                          {myTodayRec?.verificationMethod ? `Metode: ${myTodayRec.verificationMethod}` : 'Siap Presensi'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons for quick 1-tap check-in/out */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (loggedInTeacher) {
                            setForcedMode('CHECK_IN');
                            handleFingerprintScan(loggedInTeacher);
                          }
                        }}
                        disabled={isScanning || hasIn}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                          hasIn
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                        }`}
                      >
                        <Fingerprint className="w-4 h-4" />
                        <span>{hasIn ? '✓ Sudah Presensi Masuk' : 'Presensi Masuk Sekarang'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (loggedInTeacher) {
                            setForcedMode('CHECK_OUT');
                            handleFingerprintScan(loggedInTeacher);
                          }
                        }}
                        disabled={isScanning || !hasIn || hasOut}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                          hasOut
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : !hasIn
                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{hasOut ? '✓ Sudah Presensi Pulang' : 'Presensi Pulang'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Riwayat Presensi Anda (7 Hari Terakhir) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Riwayat Presensi Mandiri Anda</span>
                </h3>
                <span className="text-[11px] text-zinc-500 font-medium">Log Kehadiran Pribadi</span>
              </div>

              {(() => {
                const myRecords = attendanceRecords
                  .filter(r => isTeacherRecordMatch(r.teacherId, loggedInTeacher || currentUser))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 7);

                if (myRecords.length === 0) {
                  return (
                    <div className="text-center py-6 text-zinc-400 text-xs bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                      Belum ada catatan presensi pribadi Anda. Silakan tempelkan jari pada sensor untuk mulai presensi.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {myRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-emerald-50/40 rounded-xl text-xs transition-all border border-zinc-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                            {new Date(rec.date).getDate()}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">
                              {formatIndonesianDate(rec.date)}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Metode: {rec.verificationMethod} {rec.workDurationMinutes ? `• ${Math.floor(rec.workDurationMinutes / 60)}j ${rec.workDurationMinutes % 60}m` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-zinc-800 text-xs">
                            {rec.checkInTime ? `Masuk: ${rec.checkInTime}` : ''}
                            {rec.checkOutTime ? ` | Pulang: ${rec.checkOutTime}` : ''}
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.status === 'HADIR'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.status === 'HADIR' ? 'Tepat Waktu' : rec.status === 'TERLAMBAT' ? `Telat ${rec.lateMinutes} mnt` : rec.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Jadwal Jam Kerja Madrasah */}
            <div className="bg-gradient-to-br from-zinc-900 to-emerald-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                <span className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">Jadwal Kerja & Waktu Kehadiran GTK</span>
                <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-200">Toleransi: {schedule.toleranceMinutes} Menit</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[10px] text-emerald-300 block font-bold">Senin - Kamis</span>
                  <span className="font-mono font-bold block">{schedule.mondayThursday.checkInStart} - {schedule.mondayThursday.checkOutStart}</span>
                </div>
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[10px] text-emerald-300 block font-bold">Jumat</span>
                  <span className="font-mono font-bold block">{schedule.friday.checkInStart} - {schedule.friday.checkOutStart}</span>
                </div>
                <div className="bg-white/10 p-2 rounded-xl">
                  <span className="text-[10px] text-emerald-300 block font-bold">Sabtu</span>
                  <span className="font-mono font-bold block">{schedule.saturday.checkInStart} - {schedule.saturday.checkOutStart}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Right Column for Admin: Full GTK Fast Roster & Live Today Feed */
          <div className="lg:col-span-7 space-y-5">
            {/* GTK Fast Roster */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-zinc-800 text-sm sm:text-base flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span>Daftar Guru & Tenaga Kependidikan ({teachers.length} GTK)</span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Klik tombol <strong>"Tap Sidik Jari"</strong> pada kartu guru untuk presensi langsung
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama / NIP / ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Grid of Teachers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredTeachers.map((teacher) => {
                  const todayRec = todayRecords.find(r => r.teacherId === teacher.id);
                  const hasCheckedIn = !!todayRec?.checkInTime;
                  const hasCheckedOut = !!todayRec?.checkOutTime;
                  const isSelected = selectedTeacherId === teacher.id;
                  const isCurrentUserTeacher = loggedInTeacher?.id === teacher.id;

                  return (
                    <div
                      key={teacher.id}
                      onClick={() => setSelectedTeacherId(teacher.id)}
                      className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-300 shadow-sm'
                          : hasCheckedIn
                          ? todayRec?.status === 'TERLAMBAT'
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-zinc-200 hover:border-emerald-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm ${teacher.avatarColor || 'bg-emerald-700'}`}>
                          #{teacher.fingerprintId}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-zinc-900 truncate flex items-center gap-1.5">
                            <span>{teacher.name}</span>
                            {isCurrentUserTeacher && (
                              <span className="px-1 py-0.2 bg-emerald-700 text-white rounded text-[8px] font-bold">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {teacher.position}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.2 rounded">
                              {teacher.employmentStatus}
                            </span>
                            {hasCheckedIn && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                todayRec?.status === 'TERLAMBAT' 
                                  ? 'bg-amber-200 text-amber-900' 
                                  : 'bg-emerald-200 text-emerald-900'
                              }`}>
                                In: {todayRec.checkInTime}
                              </span>
                            )}
                            {hasCheckedOut && (
                              <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">
                                Out: {todayRec.checkOutTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        id={`btn-scan-teacher-${teacher.fingerprintId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeacherId(teacher.id);
                          handleFingerprintScan(teacher);
                        }}
                        disabled={isScanning}
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 shadow-sm ${
                          hasCheckedIn && !hasCheckedOut && effectiveMode === 'CHECK_OUT'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : hasCheckedIn && effectiveMode === 'CHECK_IN'
                            ? 'bg-zinc-200 text-zinc-600 cursor-not-allowed'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        <Fingerprint className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {hasCheckedIn && effectiveMode === 'CHECK_OUT' ? 'Out' : 'Tap'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredTeachers.length === 0 && (
                <div className="text-center py-10 px-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <p className="text-xs text-zinc-500 font-medium">
                    {searchQuery 
                      ? 'Tidak ada GTK yang cocok dengan kata kunci pencarian.'
                      : 'Belum ada data guru / GTK yang didaftarkan. Silakan buka menu Data GTK untuk menambahkan data guru.'}
                  </p>
                </div>
              )}
            </div>

            {/* Today's Real-time Live Log Feed */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Aktivitas Presensi Hari Ini ({todayRecords.length} Catatan)</span>
                </h3>
                <span className="text-xs text-zinc-500 font-medium">
                  {formatIndonesianDate(todayStr)}
                </span>
              </div>

              {todayRecords.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  Belum ada presensi yang tercatat hari ini. Silakan tempelkan sidik jari pada pemindai.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {todayRecords.map((rec) => {
                    const teacher = teachers.find(t => t.id === rec.teacherId);
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl text-xs transition-all border border-zinc-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[11px] ${teacher?.avatarColor || 'bg-emerald-700'}`}>
                            {teacher?.fingerprintId || '•'}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">
                              {teacher ? `${teacher.name}, ${teacher.title}` : 'Guru'}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {teacher?.position} • {rec.verificationMethod}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-zinc-800">
                            {rec.checkInTime ? `Masuk: ${rec.checkInTime}` : ''}
                            {rec.checkOutTime ? ` | Pulang: ${rec.checkOutTime}` : ''}
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.status === 'HADIR'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.status === 'HADIR' ? 'Tepat Waktu' : rec.status === 'TERLAMBAT' ? `Telat ${rec.lateMinutes} mnt` : rec.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
