import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Plus, 
  Printer, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserX,
  Filter,
  Save,
  Trash2,
  FileDown,
  Sparkles,
  Zap,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Users
} from 'lucide-react';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile, HolidayItem, AttendanceStatus, VerificationMethod } from '../types';
import { formatIndonesianDate, calculateLateMinutes, getLocalDateString, isTeacherRecordMatch, getTeacherSignatureId, INDONESIAN_DAYS } from '../utils/attendanceUtils';
import { downloadDailyAttendancePDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';

interface LaporanHarianProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
  holidays?: HolidayItem[];
  onAddOrUpdateRecord: (record: AttendanceRecord) => void;
  onBatchAddOrUpdateRecords?: (records: AttendanceRecord[]) => void;
  onDeleteRecord?: (id: string) => void;
}

// Helper to shift date by offset days (YYYY-MM-DD)
function shiftDate(dateStr: string, daysOffset: number): string {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + daysOffset);
    return getLocalDateString(d);
  } catch (e) {
    return dateStr;
  }
}

// Helper to find Monday or Friday of the current week of a date
function getWeekdayOfSameWeek(dateStr: string, targetDayIndex: number): string {
  try {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const currentDay = d.getDay(); // 0: Sunday, 1: Monday, ...
    const diff = targetDayIndex - currentDay;
    d.setDate(d.getDate() + diff);
    return getLocalDateString(d);
  } catch (e) {
    return dateStr;
  }
}

export const LaporanHarian: React.FC<LaporanHarianProps> = ({
  teachers,
  attendanceRecords,
  schedule,
  profile,
  holidays = [],
  onAddOrUpdateRecord,
  onBatchAddOrUpdateRecords,
  onDeleteRecord,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [manualInTime, setManualInTime] = useState<string>('06:45');
  const [manualOutTime, setManualOutTime] = useState<string>('14:15');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('HADIR');
  const [manualMethod, setManualMethod] = useState<VerificationMethod>('MANUAL_ADMIN');
  const [manualNotes, setManualNotes] = useState<string>('Penyesuaian Manual Admin');

  // Daily Batch Modal State (with Flexible Day & Date Selection)
  const [isBatchDailyModalOpen, setIsBatchDailyModalOpen] = useState<boolean>(false);
  const [batchDailyDate, setBatchDailyDate] = useState<string>(getLocalDateString());
  const [batchDailyInTime, setBatchDailyInTime] = useState<string>('06:45');
  const [batchDailyOutTime, setBatchDailyOutTime] = useState<string>('14:15');
  const [batchDailyStatus, setBatchDailyStatus] = useState<AttendanceStatus>('HADIR');
  const [batchDailyJitter, setBatchDailyJitter] = useState<boolean>(true);
  const [batchDailyTarget, setBatchDailyTarget] = useState<'UNSCANNED_ONLY' | 'ALL_ACTIVE' | 'CUSTOM'>('UNSCANNED_ONLY');
  const [customSelectedTeacherIds, setCustomSelectedTeacherIds] = useState<string[]>([]);
  const [customTeacherSearch, setCustomTeacherSearch] = useState<string>('');
  const [batchDailyNotes, setBatchDailyNotes] = useState<string>('Presensi Kolektif Harian Admin');
  const [batchAutoSyncView, setBatchAutoSyncView] = useState<boolean>(true);
  const [batchDailySuccessMsg, setBatchDailySuccessMsg] = useState<string>('');

  // Sync batchDailyDate when opening modal
  const handleOpenBatchModal = () => {
    const targetDate = selectedDate || getLocalDateString();
    setBatchDailyDate(targetDate);
    applyScheduleForDate(targetDate, false);
    setIsBatchDailyModalOpen(true);
    setBatchDailySuccessMsg('');
  };

  // Helper function to auto-adjust standard times based on chosen day
  const applyScheduleForDate = (dateStr: string, forceUpdate: boolean = true) => {
    try {
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayIndex = d.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
      
      let inTime = '06:45';
      let outTime = '14:15';

      if (dayIndex === 5) {
        // Friday
        inTime = '06:45';
        outTime = schedule?.friday?.checkOutStart || '11:30';
      } else if (dayIndex === 6) {
        // Saturday
        inTime = '06:45';
        outTime = schedule?.saturday?.checkOutStart || '13:00';
      } else {
        // Monday - Thursday
        inTime = '06:45';
        outTime = schedule?.mondayThursday?.checkOutStart || '14:15';
      }

      if (forceUpdate) {
        setBatchDailyInTime(inTime);
        setBatchDailyOutTime(outTime);
      }
    } catch (e) {
      // ignore
    }
  };

  // When date in batch modal changes
  const handleBatchDateChange = (newDate: string) => {
    setBatchDailyDate(newDate);
    applyScheduleForDate(newDate, true);
  };

  // Get Day Information for batchDailyDate
  const getBatchDayMeta = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayIndex = d.getDay(); // 0..6
      const dayName = INDONESIAN_DAYS[dayIndex] || 'Hari';
      const isSunday = dayIndex === 0;
      const isFriday = dayIndex === 5;
      const isSaturday = dayIndex === 6;
      const isWeekday = dayIndex >= 1 && dayIndex <= 4;
      
      const holiday = holidays.find(h => h.date === dateStr);

      return {
        dayIndex,
        dayName,
        isSunday,
        isFriday,
        isSaturday,
        isWeekday,
        holiday,
        formatted: formatIndonesianDate(dateStr)
      };
    } catch (e) {
      return {
        dayIndex: 1,
        dayName: 'Senin',
        isSunday: false,
        isFriday: false,
        isSaturday: false,
        isWeekday: true,
        holiday: undefined,
        formatted: dateStr
      };
    }
  };

  const batchDayMeta = getBatchDayMeta(batchDailyDate);

  // Records for current selected view date
  const recordsToday = attendanceRecords.filter(r => r.date === selectedDate);

  // Records for batch modal selected date
  const recordsOnBatchDate = attendanceRecords.filter(r => r.date === batchDailyDate);

  // Group teachers into list with their record
  const fullDailyList = teachers.map(teacher => {
    const rec = recordsToday.find(r => isTeacherRecordMatch(r.teacherId, teacher));
    return {
      teacher,
      record: rec,
      hasScanned: !!rec,
    };
  });

  const filteredList = fullDailyList.filter(item => {
    if (!item.teacher.isActive) return false;
    
    // Filter status
    if (statusFilter === 'HADIR' && item.record?.status !== 'HADIR') return false;
    if (statusFilter === 'TERLAMBAT' && item.record?.status !== 'TERLAMBAT') return false;
    if (statusFilter === 'IZIN_SAKIT' && !['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(item.record?.status || '')) return false;
    if (statusFilter === 'BELUM' && item.hasScanned) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.teacher.name.toLowerCase().includes(q) ||
      item.teacher.position.toLowerCase().includes(q) ||
      (item.teacher.nip && item.teacher.nip.includes(q))
    );
  });

  // Summary counts
  const countHadir = recordsToday.filter(r => r.status === 'HADIR').length;
  const countTelat = recordsToday.filter(r => r.status === 'TERLAMBAT').length;
  const countIzinSakit = recordsToday.filter(r => ['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(r.status)).length;
  const countBelum = teachers.length - (countHadir + countTelat + countIzinSakit);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) return;

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;

    const lateMins = manualStatus === 'TERLAMBAT' ? 15 : 0;

    const newRecord: AttendanceRecord = {
      id: `att-${selectedTeacherId}-${selectedDate}`,
      teacherId: selectedTeacherId,
      date: selectedDate,
      checkInTime: manualInTime,
      checkOutTime: manualOutTime,
      status: manualStatus,
      lateMinutes: lateMins,
      earlyLeaveMinutes: 0,
      workDurationMinutes: 420,
      verificationMethod: manualMethod,
      notes: manualNotes,
    };

    onAddOrUpdateRecord(newRecord);
    setIsAddModalOpen(false);
    setSelectedTeacherId('');
  };

  // Active & Unscanned teachers for the batch modal date
  const activeTeachers = teachers.filter(t => t.isActive);
  const unscannedTeachersOnBatchDate = activeTeachers.filter(t => !recordsOnBatchDate.some(r => isTeacherRecordMatch(r.teacherId, t)));
  
  let targetBatchTeachers: Teacher[] = [];
  if (batchDailyTarget === 'UNSCANNED_ONLY') {
    targetBatchTeachers = unscannedTeachersOnBatchDate;
  } else if (batchDailyTarget === 'ALL_ACTIVE') {
    targetBatchTeachers = activeTeachers;
  } else if (batchDailyTarget === 'CUSTOM') {
    targetBatchTeachers = activeTeachers.filter(t => customSelectedTeacherIds.includes(t.id));
  }

  // Toggle selection for custom teacher list
  const toggleTeacherCustom = (id: string) => {
    setCustomSelectedTeacherIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllCustomTeachers = () => {
    setCustomSelectedTeacherIds(activeTeachers.map(t => t.id));
  };

  const clearAllCustomTeachers = () => {
    setCustomSelectedTeacherIds([]);
  };

  const handleExecuteDailyBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetBatchTeachers.length === 0) {
      alert('Tidak ada guru yang dipilih/perlu diproses untuk kriteria dan tanggal yang dipilih.');
      return;
    }

    const newRecords: AttendanceRecord[] = targetBatchTeachers.map((teacher, index) => {
      let finalIn = batchDailyInTime;
      let finalOut = batchDailyOutTime;

      if (batchDailyJitter && batchDailyStatus === 'HADIR') {
        const inJitter = ((index * 7 + 3) % 9) - 4;
        const outJitter = ((index * 11 + 5) % 9) - 1;
        
        const [inH, inM] = batchDailyInTime.split(':').map(Number);
        const [outH, outM] = batchDailyOutTime.split(':').map(Number);

        let adjInM = inM + inJitter;
        let adjInH = inH;
        if (adjInM < 0) { adjInM += 60; adjInH -= 1; }
        if (adjInM >= 60) { adjInM -= 60; adjInH += 1; }

        let adjOutM = outM + outJitter;
        let adjOutH = outH;
        if (adjOutM < 0) { adjOutM += 60; adjOutH -= 1; }
        if (adjOutM >= 60) { adjOutM -= 60; adjOutH += 1; }

        finalIn = `${String(adjInH).padStart(2, '0')}:${String(adjInM).padStart(2, '0')}`;
        finalOut = `${String(adjOutH).padStart(2, '0')}:${String(adjOutM).padStart(2, '0')}`;
      }

      const lateMins = batchDailyStatus === 'TERLAMBAT' ? 15 : 0;

      return {
        id: `att-${teacher.id}-${batchDailyDate}`,
        teacherId: teacher.id,
        date: batchDailyDate,
        checkInTime: finalIn,
        checkOutTime: finalOut,
        status: batchDailyStatus,
        lateMinutes: lateMins,
        earlyLeaveMinutes: 0,
        workDurationMinutes: 420,
        verificationMethod: 'MANUAL_ADMIN',
        notes: batchDailyNotes || `Presensi Kolektif Harian (${batchDayMeta.dayName}, ${batchDailyDate})`,
      };
    });

    if (onBatchAddOrUpdateRecords) {
      onBatchAddOrUpdateRecords(newRecords);
    } else {
      newRecords.forEach(r => onAddOrUpdateRecord(r));
    }

    if (batchAutoSyncView) {
      setSelectedDate(batchDailyDate);
    }

    setBatchDailySuccessMsg(`Berhasil mengisi presensi kolektif untuk ${newRecords.length} guru pada ${formatIndonesianDate(batchDailyDate)}.`);
    setTimeout(() => {
      setIsBatchDailyModalOpen(false);
      setBatchDailySuccessMsg('');
    }, 1400);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-700" />
              <span>Jurnal Presensi Harian Guru & Tenaga Kependidikan</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Daftar hadir harian perorangan, koreksi jam absensi manual, dan pemantauan guru hadir/terlambat/belum scan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenBatchModal}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-teal-600 cursor-pointer"
              title="Isi presensi otomatis untuk semua guru dengan pilihan hari dan tanggal fleksibel"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Isi Kolektif 1 Hari</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Entri Presensi Manual</span>
            </button>
            <button
              onClick={() => downloadDailyAttendancePDF(profile, selectedDate, fullDailyList, schedule)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-600"
              title="Unduh PDF Jurnal Harian Lengkap dengan Jam Berangkat dan Jam Pulang"
            >
              <FileDown className="w-4 h-4 text-emerald-300" />
              <span>Cetak PDF (Jam Masuk & Pulang)</span>
            </button>
            <button
              onClick={() => {
                executePrint({
                  elementId: 'jurnal-harian-paper',
                  title: `Jurnal_Presensi_GTK_${selectedDate}`,
                  landscape: false,
                  onPdfFallback: () => downloadDailyAttendancePDF(profile, selectedDate, fullDailyList, schedule)
                });
              }}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Browser</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-zinc-700 mb-1">Pilih Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold bg-zinc-50 text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-700 font-semibold">Hadir Tepat</div>
              <div className="text-xl font-bold text-emerald-900">{countHadir} Orang</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-700 font-semibold">Terlambat</div>
              <div className="text-xl font-bold text-amber-900">{countTelat} Orang</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-700 font-semibold">Izin / Sakit / DL</div>
              <div className="text-xl font-bold text-blue-900">{countIzinSakit} Orang</div>
            </div>
            <Clock className="w-6 h-6 text-blue-600" />
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-rose-700 font-semibold">Belum Presensi</div>
              <div className="text-xl font-bold text-rose-900">{Math.max(0, countBelum)} Orang</div>
            </div>
            <UserX className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
            >
              <option value="ALL">Semua Guru ({teachers.length})</option>
              <option value="HADIR">Hadir Tepat Waktu</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="IZIN_SAKIT">Izin / Sakit / Dinas Luar</option>
              <option value="BELUM">Belum Presensi</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru / NIP..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

      </div>

      {/* Table of Daily Journal */}
      <div id="jurnal-harian-paper" className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden print:border-none print:shadow-none p-0 sm:p-2">
        {/* Print Kop */}
        <div className="hidden print:block border-b-2 border-zinc-950 pb-3 mb-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : null}
            </div>
            <div className="flex-1 text-center space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider">{profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}</div>
              <div className="text-xs font-semibold uppercase">{profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}</div>
              <div className="text-base font-black uppercase">{profile.name}</div>
              <div className="text-[11px] text-zinc-600">{profile.address}, {profile.village}, {profile.district}, {profile.city}</div>
            </div>
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              {profile.secondaryLogoUrl ? (
                <img src={profile.secondaryLogoUrl} alt="Logo 2" className="w-full h-full object-contain" />
              ) : profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain opacity-40 grayscale" />
              ) : null}
            </div>
          </div>
          <div className="mt-2 text-sm font-bold uppercase underline text-center">
            DAFTAR HADIR HARIAN GURU & TENAGA KEPENDIDIKAN (GTK)
          </div>
          <div className="text-xs font-medium text-center">Hari / Tanggal: {formatIndonesianDate(selectedDate)}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800 text-white font-bold">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Nama Lengkap & NIP</th>
                <th className="p-3">Jabatan / Mapel</th>
                <th className="p-3 text-center">Jam Masuk</th>
                <th className="p-3 text-center">Jam Pulang</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Metode</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-center print:hidden w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium">
              {filteredList.map((item, idx) => {
                const rec = item.record;
                return (
                  <tr key={item.teacher.id} className="hover:bg-zinc-50 transition-all">
                    <td className="p-3 text-center text-zinc-500 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900">{item.teacher.name}, {item.teacher.title}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {getTeacherSignatureId(item.teacher)} | ID Mesin: #{item.teacher.fingerprintId}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-zinc-700">{item.teacher.position}</span>
                      <span className="block text-[10px] text-zinc-400">{item.teacher.employmentStatus}</span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {rec?.checkInTime ? (
                        <span className="text-emerald-700">{rec.checkInTime}</span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {rec?.checkOutTime ? (
                        <span className="text-blue-700">{rec.checkOutTime}</span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {rec ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'IZIN'
                            ? 'bg-blue-100 text-blue-800'
                            : rec.status === 'SAKIT'
                            ? 'bg-purple-100 text-purple-800'
                            : rec.status === 'DINAS_LUAR'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status === 'HADIR' ? 'Tepat Waktu' : rec.status === 'TERLAMBAT' ? `Telat ${rec.lateMinutes}m` : rec.status}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold text-[10px]">Belum Presensi</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-[10px] text-zinc-500">
                      {rec?.verificationMethod || '-'}
                    </td>
                    <td className="p-3 text-zinc-600 text-[11px]">
                      {rec?.notes || '-'}
                    </td>
                    <td className="p-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTeacherId(item.teacher.id);
                            setManualInTime(rec?.checkInTime || '06:45');
                            setManualOutTime(rec?.checkOutTime || '14:15');
                            setManualStatus(rec?.status || 'HADIR');
                            setManualNotes(rec?.notes || 'Koreksi Admin');
                            setIsAddModalOpen(true);
                          }}
                          className="px-2 py-1 bg-zinc-100 hover:bg-emerald-100 hover:text-emerald-800 rounded text-[11px] font-bold transition-all"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400 text-xs">
                    {teachers.length === 0
                      ? 'Belum ada data guru terdaftar. Silakan tambahkan data di menu Data GTK.'
                      : 'Tidak ada data presensi yang sesuai dengan filter pencarian.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signatures */}
        <div className="hidden print:grid grid-cols-2 gap-8 text-xs pt-8 px-4 pb-4">
          <div className="text-left space-y-1">
            <p className="font-bold whitespace-pre-line">{profile.signatureLeftTitle || `Mengetahui,\n${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`}</p>
            <div className="h-16" />
            <p className="font-bold underline">{profile.headmasterName}</p>
            <p>NIP. {profile.headmasterNip || '-'}</p>
          </div>
          <div className="text-right space-y-1">
            <p>{profile.signaturePlace || profile.village}, {formatIndonesianDate(selectedDate)}</p>
            <p className="font-semibold">Petugas Presensi / Kepala TU,</p>
            <div className="h-16" />
            <p className="font-bold underline">{profile.tuAdminName || 'Nurul Hidayati, S.Kom.'}</p>
            <p>NIP. {profile.tuAdminNip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Entri / Koreksi Presensi Harian</span>
              </h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Pilih Guru / GTK:</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}, {t.title} ({t.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Jam Masuk (In):</label>
                  <input
                    type="time"
                    value={manualInTime}
                    onChange={(e) => setManualInTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Jam Pulang (Out):</label>
                  <input
                    type="time"
                    value={manualOutTime}
                    onChange={(e) => setManualOutTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Status Kehadiran:</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 font-semibold"
                  >
                    <option value="HADIR">Hadir (Tepat)</option>
                    <option value="TERLAMBAT">Terlambat</option>
                    <option value="IZIN">Izin</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="CUTI">Cuti</option>
                    <option value="DINAS_LUAR">Dinas Luar</option>
                    <option value="ALPA">Alpa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Metode Verifikasi:</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value as VerificationMethod)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 font-semibold"
                  >
                    <option value="MANUAL_ADMIN">Manual Admin</option>
                    <option value="FINGERPRINT">Fingerprint</option>
                    <option value="IMPORT_MESIN">Import Mesin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Catatan / Alasan:</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Listrik padam, koreksi presensi..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Presensi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Collective Batch Modal */}
      {isBatchDailyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Isi Presensi Kolektif (1 Hari)</h3>
                  <p className="text-xs text-zinc-500">Pilih hari dan tanggal secara fleksibel untuk generate absensi serentak</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchDailyModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 text-lg font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {batchDailySuccessMsg ? (
              <div className="my-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-emerald-950">{batchDailySuccessMsg}</p>
                <p className="text-xs text-emerald-700">Data presensi telah diperbarui di sistem.</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteDailyBatch} className="mt-4 space-y-4 text-xs">
                
                {/* 1. Flexible Day & Date Selection Box */}
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      <span>Pilih Hari & Tanggal Presensi:</span>
                    </label>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      batchDayMeta.isSunday || batchDayMeta.holiday
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : batchDayMeta.isFriday
                        ? 'bg-teal-100 text-teal-800 border border-teal-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {batchDayMeta.dayName}
                      {batchDayMeta.isSunday && ' (Libur Ahad)'}
                      {batchDayMeta.holiday && ` (${batchDayMeta.holiday.name})`}
                    </span>
                  </div>

                  {/* Date Input with Stepper Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(shiftDate(batchDailyDate, -1))}
                      className="px-2.5 py-2 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-800 transition-colors flex items-center gap-1"
                      title="Mundur 1 Hari"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-[11px] hidden sm:inline">-1 Hari</span>
                    </button>
                    <input
                      type="date"
                      value={batchDailyDate}
                      onChange={(e) => handleBatchDateChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white rounded-xl border border-emerald-300 font-bold text-zinc-800 text-xs shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(shiftDate(batchDailyDate, 1))}
                      className="px-2.5 py-2 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-800 transition-colors flex items-center gap-1"
                      title="Maju 1 Hari"
                    >
                      <span className="text-[11px] hidden sm:inline">+1 Hari</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Shortcut Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-emerald-900 mr-1">Pintasan:</span>
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(getLocalDateString())}
                      className="px-2 py-1 bg-white hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 transition-colors cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(shiftDate(getLocalDateString(), -1))}
                      className="px-2 py-1 bg-white hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 transition-colors cursor-pointer"
                    >
                      Kemarin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(getWeekdayOfSameWeek(batchDailyDate, 1))}
                      className="px-2 py-1 bg-white hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[10px] font-semibold text-emerald-800 transition-colors cursor-pointer"
                      title="Pilih hari Senin di minggu yang sama"
                    >
                      Senin Minggu Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(getWeekdayOfSameWeek(batchDailyDate, 5))}
                      className="px-2 py-1 bg-white hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[10px] font-semibold text-emerald-800 transition-colors cursor-pointer"
                      title="Pilih hari Jumat di minggu yang sama"
                    >
                      Jum'at
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBatchDateChange(getWeekdayOfSameWeek(batchDailyDate, 6))}
                      className="px-2 py-1 bg-white hover:bg-emerald-200 border border-emerald-300 rounded-lg text-[10px] font-semibold text-emerald-800 transition-colors cursor-pointer"
                      title="Pilih hari Sabtu di minggu yang sama"
                    >
                      Sabtu
                    </button>
                  </div>

                  {/* Summary row inside date box */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60 text-emerald-900">
                    <div>
                      Tanggal Dipilih: <strong className="text-emerald-950">{batchDayMeta.formatted}</strong>
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      Sudah ada <strong>{recordsOnBatchDate.length}</strong> guru terabsen pada tanggal ini
                    </div>
                  </div>
                </div>

                {/* 2. Target Guru Pengisian */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-zinc-700">Pilih Target Guru yang Diisi:</label>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {targetBatchTeachers.length} Guru Terpilih
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchDailyTarget('UNSCANNED_ONLY')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        batchDailyTarget === 'UNSCANNED_ONLY'
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-900 font-bold shadow-xs'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                      }`}
                    >
                      <div className="text-[11px] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Belum Absen</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                        ({unscannedTeachersOnBatchDate.length} guru tgl ini)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchDailyTarget('ALL_ACTIVE')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        batchDailyTarget === 'ALL_ACTIVE'
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-900 font-bold shadow-xs'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                      }`}
                    >
                      <div className="text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Semua Aktif</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                        ({activeTeachers.length} guru - timpa)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBatchDailyTarget('CUSTOM');
                        if (customSelectedTeacherIds.length === 0) {
                          selectAllCustomTeachers();
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        batchDailyTarget === 'CUSTOM'
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-900 font-bold shadow-xs'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                      }`}
                    >
                      <div className="text-[11px] flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Pilih Tertentu</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">
                        ({customSelectedTeacherIds.length} dicentang)
                      </div>
                    </button>
                  </div>

                  {/* Custom selection list dropdown/accordion if CUSTOM chosen */}
                  {batchDailyTarget === 'CUSTOM' && (
                    <div className="mt-2.5 p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari nama guru..."
                            value={customTeacherSearch}
                            onChange={(e) => setCustomTeacherSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-white rounded-lg border border-zinc-300 text-xs"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={selectAllCustomTeachers}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold"
                          >
                            Pilih Semua
                          </button>
                          <button
                            type="button"
                            onClick={clearAllCustomTeachers}
                            className="px-2 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded text-[10px] font-bold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-zinc-100">
                        {activeTeachers
                          .filter(t => !customTeacherSearch || t.name.toLowerCase().includes(customTeacherSearch.toLowerCase()))
                          .map(teacher => {
                            const isSelected = customSelectedTeacherIds.includes(teacher.id);
                            const alreadyHasRecord = recordsOnBatchDate.some(r => isTeacherRecordMatch(r.teacherId, teacher));
                            return (
                              <label
                                key={teacher.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-100/50' : 'hover:bg-zinc-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleTeacherCustom(teacher.id)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                  />
                                  <div>
                                    <div className="text-xs font-semibold text-zinc-800">{teacher.name}</div>
                                    <div className="text-[10px] text-zinc-500">{teacher.position}</div>
                                  </div>
                                </div>
                                {alreadyHasRecord && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                    Sudah Ada Record
                                  </span>
                                )}
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Waktu Standar Masuk & Pulang */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      Jam Masuk ({batchDayMeta.dayName}):
                    </label>
                    <input
                      type="time"
                      value={batchDailyInTime}
                      onChange={(e) => setBatchDailyInTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      Jam Pulang ({batchDayMeta.dayName}):
                    </label>
                    <input
                      type="time"
                      value={batchDailyOutTime}
                      onChange={(e) => setBatchDailyOutTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-xs"
                      required
                    />
                  </div>
                </div>

                {/* 4. Status & Jitter */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Status Kehadiran:</label>
                    <select
                      value={batchDailyStatus}
                      onChange={(e) => setBatchDailyStatus(e.target.value as AttendanceStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold text-xs"
                    >
                      <option value="HADIR">Hadir (Tepat Waktu)</option>
                      <option value="TERLAMBAT">Terlambat</option>
                      <option value="DINAS_LUAR">Dinas Luar (DL)</option>
                      <option value="IZIN">Izin</option>
                      <option value="CUTI">Cuti</option>
                      <option value="SAKIT">Sakit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Variasi Jam (Jitter):</label>
                    <label className="flex items-center gap-2 p-2 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 mt-0.5">
                      <input
                        type="checkbox"
                        checked={batchDailyJitter}
                        onChange={(e) => setBatchDailyJitter(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="text-[11px] text-zinc-700 font-medium">Acak ±1-4 menit (Realistis)</span>
                    </label>
                  </div>
                </div>

                {/* 5. Catatan / Alasan */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Keterangan / Catatan:</label>
                  <input
                    type="text"
                    value={batchDailyNotes}
                    onChange={(e) => setBatchDailyNotes(e.target.value)}
                    placeholder={`Presensi Kolektif Harian (${batchDayMeta.dayName})`}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                  />
                </div>

                {/* 6. Auto sync view checkbox */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchAutoSyncView}
                      onChange={(e) => setBatchAutoSyncView(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-[11px] text-zinc-700 font-medium">
                      Otomatis alihkan tampilan tabel jurnal harian ke tanggal yang baru diisi (<strong>{batchDayMeta.formatted}</strong>)
                    </span>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
                  <span className="text-[11px] text-zinc-500">
                    Akan mencatat <strong>{targetBatchTeachers.length}</strong> guru pada tgl <strong>{batchDailyDate}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchDailyModalOpen(false)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={targetBatchTeachers.length === 0}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Eksekusi Kolektif</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
