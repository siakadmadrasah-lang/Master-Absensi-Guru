import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  Calendar, 
  Info, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  X,
  FileDown,
  Building,
  Award,
  Layers,
  Zap,
  Save
} from 'lucide-react';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile, HolidayItem, EmploymentStatus, AttendanceStatus } from '../types';
import { 
  calculateMonthlyMatrix, 
  exportMonthlyReportToExcel, 
  exportFingerprintLogToExcel,
  INDONESIAN_MONTHS, 
  formatShortDate,
  formatIndonesianDate,
  getTeacherMonthlyDailyRows,
  getTeacherSignatureId,
  TeacherMonthlyDailyRow,
  TeacherMonthlyStats
} from '../utils/attendanceUtils';
import { downloadMonthlyMatrixPDF, downloadIndividualTeacherSlipPDF, downloadBatchTeacherSlipsPDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';

interface RekapBulananProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: HolidayItem[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
  currentUser?: Teacher | null;
  onUpdateRecord?: (record: AttendanceRecord) => void;
  onBatchAddOrUpdateRecords?: (records: AttendanceRecord[]) => void;
}

export const RekapBulanan: React.FC<RekapBulananProps> = ({
  teachers,
  attendanceRecords,
  holidays,
  schedule,
  profile,
  currentUser,
  onUpdateRecord,
  onBatchAddOrUpdateRecords,
}) => {
  const isGuru = currentUser?.role === 'GURU';
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTeacherForPrint, setSelectedTeacherForPrint] = useState<Teacher | null>(null);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    teacher: Teacher;
    day: number;
    record?: AttendanceRecord;
    isHoliday?: HolidayItem;
    isSunday?: boolean;
  } | null>(null);

  // Monthly Collective Batch Generator State
  const [isBatchMonthlyModalOpen, setIsBatchMonthlyModalOpen] = useState<boolean>(false);
  const [batchMonth, setBatchMonth] = useState<number>(selectedMonth);
  const [batchYear, setBatchYear] = useState<number>(selectedYear);
  const [batchWorkDays, setBatchWorkDays] = useState<'MON_SAT' | 'MON_FRI'>('MON_SAT');
  const [batchSkipHolidays, setBatchSkipHolidays] = useState<boolean>(true);
  const [batchSkipSundays, setBatchSkipSundays] = useState<boolean>(true);
  const [batchInTime, setBatchInTime] = useState<string>('06:45');
  const [batchOutTime, setBatchOutTime] = useState<string>('14:15');
  const [batchJitter, setBatchJitter] = useState<boolean>(true);
  const [batchStatus, setBatchStatus] = useState<AttendanceStatus>('HADIR');
  const [batchScope, setBatchScope] = useState<'FILL_EMPTY_ONLY' | 'OVERWRITE_ALL'>('FILL_EMPTY_ONLY');
  const [batchTargetTeacherId, setBatchTargetTeacherId] = useState<string>('ALL');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string>('');

  const matrix = calculateMonthlyMatrix(
    selectedYear,
    selectedMonth,
    teachers,
    attendanceRecords,
    holidays,
    schedule
  );

  const filteredSummaries = matrix.summaries.filter(s => {
    if (isGuru && currentUser && s.teacher.id !== currentUser.id) return false;
    if (statusFilter === 'ALL') return true;
    return s.teacher.employmentStatus === statusFilter;
  });

  const monthName = INDONESIAN_MONTHS[selectedMonth - 1];

  const handleExportExcel = () => {
    exportMonthlyReportToExcel(profile, selectedYear, selectedMonth, matrix);
  };

  const handlePrint = () => {
    executePrint({
      elementId: 'rekap-matriks-paper',
      title: `Rekap_Presensi_GTK_${monthName}_${selectedYear}`,
      landscape: true,
      onPdfFallback: () => downloadMonthlyMatrixPDF(profile, selectedYear, selectedMonth, matrix)
    });
  };

  const handlePrintBatchAllTeachers = () => {
    if (teachers.length === 0) return;
    downloadBatchTeacherSlipsPDF(
      profile,
      teachers,
      selectedYear,
      selectedMonth,
      attendanceRecords,
      holidays,
      schedule
    );
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  // Helper for navigating between teachers in the print modal
  const currentIndex = selectedTeacherForPrint 
    ? teachers.findIndex(t => t.id === selectedTeacherForPrint.id)
    : -1;

  const handlePrevTeacher = () => {
    if (currentIndex > 0) {
      setSelectedTeacherForPrint(teachers[currentIndex - 1]);
    } else if (currentIndex === 0) {
      setSelectedTeacherForPrint(teachers[teachers.length - 1]);
    }
  };

  const handleNextTeacher = () => {
    if (currentIndex >= 0 && currentIndex < teachers.length - 1) {
      setSelectedTeacherForPrint(teachers[currentIndex + 1]);
    } else if (currentIndex === teachers.length - 1) {
      setSelectedTeacherForPrint(teachers[0]);
    }
  };

  // Compute individual teacher monthly rows for the modal
  const individualData = selectedTeacherForPrint
    ? getTeacherMonthlyDailyRows(
        selectedYear,
        selectedMonth,
        selectedTeacherForPrint,
        attendanceRecords,
        holidays,
        schedule
      )
    : null;

  const handlePrintIndividualModal = () => {
    if (!selectedTeacherForPrint || !individualData) return;
    executePrint({
      elementId: 'modal-individual-print-paper',
      title: `Log_Presensi_${selectedTeacherForPrint.name}_${monthName}_${selectedYear}`,
      landscape: false,
      onPdfFallback: () => {
        downloadIndividualTeacherSlipPDF(
          profile,
          selectedTeacherForPrint,
          selectedYear,
          selectedMonth,
          individualData.dailyRows,
          individualData.stats,
          schedule
        );
      }
    });
  };

  const handleDownloadIndividualPDF = () => {
    if (!selectedTeacherForPrint || !individualData) return;
    downloadIndividualTeacherSlipPDF(
      profile,
      selectedTeacherForPrint,
      selectedYear,
      selectedMonth,
      individualData.dailyRows,
      individualData.stats,
      schedule
    );
  };

  const handleExportIndividualExcel = () => {
    if (!selectedTeacherForPrint || !individualData) return;
    exportFingerprintLogToExcel(
      profile,
      selectedTeacherForPrint,
      selectedYear,
      selectedMonth,
      individualData.dailyRows
    );
  };

  const handleExecuteMonthlyBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const activeTeachers = teachers.filter(t => t.isActive);
    const targetTeachers = batchTargetTeacherId === 'ALL'
      ? activeTeachers
      : activeTeachers.filter(t => t.id === batchTargetTeacherId);

    if (targetTeachers.length === 0) {
      alert('Tidak ada guru aktif yang dipilih.');
      return;
    }

    const daysInMonth = new Date(batchYear, batchMonth, 0).getDate();
    const newRecordsList: AttendanceRecord[] = [];

    const existingMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => {
      existingMap.set(`${r.teacherId}_${r.date}`, r);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(batchYear, batchMonth - 1, day);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${batchYear}-${String(batchMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (batchSkipSundays && dayOfWeek === 0) {
        continue;
      }

      if (batchWorkDays === 'MON_FRI' && dayOfWeek === 6) {
        continue;
      }

      if (batchSkipHolidays) {
        const isHoliday = holidays.some(h => h.date === dateStr);
        if (isHoliday) {
          continue;
        }
      }

      targetTeachers.forEach((teacher, tIdx) => {
        const key = `${teacher.id}_${dateStr}`;
        const existing = existingMap.get(key);

        if (batchScope === 'FILL_EMPTY_ONLY' && existing) {
          return;
        }

        let finalIn = batchInTime;
        let finalOut = batchOutTime;

        if (batchJitter && batchStatus === 'HADIR') {
          const seed = (day * 13 + tIdx * 17 + batchMonth * 7);
          const inJitter = (seed % 9) - 4;
          const outJitter = ((seed * 3) % 11) - 2;

          const [inH, inM] = batchInTime.split(':').map(Number);
          const [outH, outM] = batchOutTime.split(':').map(Number);

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

        const lateMins = batchStatus === 'TERLAMBAT' ? 15 : 0;

        newRecordsList.push({
          id: `att-${teacher.id}-${dateStr}`,
          teacherId: teacher.id,
          date: dateStr,
          checkInTime: finalIn,
          checkOutTime: finalOut,
          status: batchStatus,
          lateMinutes: lateMins,
          earlyLeaveMinutes: 0,
          workDurationMinutes: 420,
          verificationMethod: 'MANUAL_ADMIN',
          notes: 'Presensi Kolektif Bulanan Admin',
        });
      });
    }

    if (newRecordsList.length === 0) {
      alert('Tidak ada entri baru yang perlu di-generate (semua hari sudah terisi atau merupakan hari libur).');
      return;
    }

    if (onBatchAddOrUpdateRecords) {
      onBatchAddOrUpdateRecords(newRecordsList);
    } else if (onUpdateRecord) {
      newRecordsList.forEach(r => onUpdateRecord(r));
    }

    setBatchSuccessMsg(`Berhasil men-generate ${newRecordsList.length} entri presensi untuk periode ${INDONESIAN_MONTHS[batchMonth - 1]} ${batchYear}.`);
    setTimeout(() => {
      setIsBatchMonthlyModalOpen(false);
      setBatchSuccessMsg('');
    }, 1200);
  };

  return (
    <div id="rekap-matriks-paper" className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 print:border-none print:shadow-none print:p-0">
        
        {/* Print Only Official Madrasah Letterhead */}
        <div className="hidden print:block text-center border-b-2 border-zinc-900 pb-3 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider">{profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}</div>
          <div className="text-base font-black uppercase text-zinc-950">{profile.name}</div>
          <div className="text-[11px] text-zinc-700">{profile.address}, {profile.village}, {profile.district}, {profile.city} - Telp: {profile.phone}</div>
          <div className="text-[10px] text-zinc-600">NSM: {profile.nsm} | NPSN: {profile.npsn} | Email: {profile.email}</div>
          <div className="mt-3 text-sm font-bold uppercase tracking-wide border-t border-zinc-300 pt-2">
            REKAPITULASI PRESENSI KEHADIRAN GURU & TENAGA KEPENDIDIKAN (GTK)
          </div>
          <div className="text-xs text-zinc-800 font-medium">
            Periode Bulan: {monthName} {selectedYear} | Hari Efektif: {matrix.effectiveDaysCount} Hari
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>{isGuru ? 'Rekapitulasi Kehadiran Presensi Saya' : 'Rekapitulasi Matriks Presensi Bulanan GTK'}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isGuru 
                ? 'Laporan riwayat kehadiran pribadi bulan berjalan sesuai catatan log mesin presensi.'
                : 'Laporan matriks 1–31 hari standar Simpatika & EMIS Kemenag dengan fitur cetak bulanan per nama guru masing-masing.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isGuru ? (
              <>
                <button
                  id="btn-batch-monthly-generate"
                  onClick={() => {
                    setBatchMonth(selectedMonth);
                    setBatchYear(selectedYear);
                    setIsBatchMonthlyModalOpen(true);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-teal-600 cursor-pointer"
                  title="Generate otomatis presensi 1 bulan penuh untuk semua guru pada hari kerja efektif"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Isi Kolektif 1 Bulan</span>
                </button>

                <button
                  id="btn-batch-print-all"
                  onClick={handlePrintBatchAllTeachers}
                  className="px-3 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-700"
                  title="Unduh 1 File PDF Berisi Lembar Presensi Bulanan Semua Guru (Per Halaman GTK)"
                >
                  <Layers className="w-4 h-4 text-emerald-300" />
                  <span>Cetak Semua Guru (PDF Multi-Halaman)</span>
                </button>

                <button
                  id="btn-export-pdf"
                  onClick={() => downloadMonthlyMatrixPDF(profile, selectedYear, selectedMonth, matrix)}
                  className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-600"
                  title="Unduh Rekapitulasi Matriks Format PDF Lengkap"
                >
                  <FileDown className="w-4 h-4 text-emerald-300" />
                  <span>Unduh Matriks PDF</span>
                </button>
                <button
                  id="btn-export-excel"
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  id="btn-print-rekap"
                  onClick={handlePrint}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Matriks</span>
                </button>
              </>
            ) : (
              currentUser && (
                <button
                  id="btn-guru-my-slip"
                  onClick={() => setSelectedTeacherForPrint(currentUser)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Cetak / Lihat Slip Presensi Saya</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Filter Bar (Month, Year, Status, & Quick Teacher Print Selector) */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-all"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold bg-zinc-50 text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INDONESIAN_MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold bg-zinc-50 text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-all"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Individual Teacher Print Selector (Only for Admin) - Compact & Slim */}
            {!isGuru && (
              <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-300/80 rounded-xl px-2.5 py-1 text-emerald-950">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[11px] font-bold shrink-0 hidden sm:inline">Cetak Guru:</span>
                <select
                  value=""
                  onChange={(e) => {
                    const t = teachers.find(item => item.id === e.target.value);
                    if (t) setSelectedTeacherForPrint(t);
                  }}
                  className="max-w-[190px] sm:max-w-[220px] md:max-w-[260px] py-0.5 px-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-lg text-emerald-900 outline-none focus:ring-1 focus:ring-emerald-500 truncate cursor-pointer shadow-2xs"
                  title="Pilih Guru untuk Cetak / Unduh Slip Presensi Bulanan"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.position})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isGuru && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="max-w-[140px] sm:max-w-[160px] px-2.5 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 text-zinc-800 outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                >
                  <option value="ALL">Semua ({teachers.length})</option>
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="GTY">GTY (Yayasan)</option>
                  <option value="GTT">GTT (Tidak Tetap)</option>
                  <option value="HONORER">Honorer</option>
                  <option value="TENAGA_KEPENDIDIKAN">Tata Usaha (TU)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Legend Box */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/70 print:bg-transparent print:border-none">
          <span className="font-bold text-zinc-800">Keterangan:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px]">H</span>
            <span>Hadir Tepat</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-[9px]">T</span>
            <span>Terlambat</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-[9px]">I</span>
            <span>Izin</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-purple-500 text-white flex items-center justify-center font-bold text-[9px]">S</span>
            <span>Sakit</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-cyan-600 text-white flex items-center justify-center font-bold text-[9px]">C</span>
            <span>Cuti</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-teal-600 text-white flex items-center justify-center font-bold text-[9px]">DL</span>
            <span>Dinas Luar</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">A</span>
            <span>Alpa</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-zinc-300 text-zinc-700 flex items-center justify-center font-bold text-[9px]">L</span>
            <span>Libur</span>
          </span>
          <span className="ml-auto text-zinc-500">
            Total Hari Efektif: <strong className="text-zinc-900">{matrix.effectiveDaysCount} Hari</strong>
          </span>
        </div>

      </div>

      {/* Main Table Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-emerald-900 text-white font-bold border-b border-emerald-800 text-center">
                <th className="p-2 border-r border-emerald-800 sticky left-0 bg-emerald-900 z-10 w-8">No</th>
                <th className="p-2 border-r border-emerald-800 sticky left-8 bg-emerald-900 z-10 text-left min-w-[180px]">
                  Nama GTK & Jabatan
                </th>
                <th className="p-2 border-r border-emerald-800 min-w-[60px]">Status</th>

                {/* Day Columns (1..31) */}
                {Array.from({ length: matrix.daysCount }, (_, i) => i + 1).map(day => {
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isHoliday = holidays.find(h => h.date === dateStr);
                  const isSun = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;

                  return (
                    <th 
                      key={day} 
                      className={`p-1 w-6 border-r border-emerald-800 font-mono text-[11px] ${
                        isSun || isHoliday ? 'bg-rose-900/90 text-rose-200' : ''
                      }`}
                      title={isHoliday ? isHoliday.name : isSun ? 'Ahad (Hari Libur)' : `Tanggal ${day} ${monthName}`}
                    >
                      {day}
                    </th>
                  );
                })}

                {/* Summary Headers */}
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-emerald-300" title="Hadir Tepat">H</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-amber-300" title="Terlambat">T</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-blue-300" title="Izin">I</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-purple-300" title="Sakit">S</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-cyan-300" title="Cuti">C</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-teal-300" title="Dinas Luar">DL</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[32px] text-rose-300" title="Alpa / Tanpa Keterangan">A</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[50px] text-white">Total</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[65px] text-white">% Hadir</th>
                <th className="p-2 border-r border-emerald-800 bg-emerald-950 min-w-[60px] text-amber-300">Telat (m)</th>
                
                {/* Print Column - Compact */}
                <th className="p-2 bg-emerald-950 w-20 text-white print:hidden">
                  Cetak
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium">
              {filteredSummaries.map((sum, index) => {
                const isPerfect = sum.attendancePercentage >= 95;
                const isEligibleTPG = sum.attendancePercentage >= 85;

                return (
                  <tr key={sum.teacher.id} className="hover:bg-emerald-50/40 transition-all">
                    <td className="p-2 text-center border-r border-zinc-200 sticky left-0 bg-white z-10 font-bold text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="p-2 border-r border-zinc-200 sticky left-8 bg-white z-10">
                      <div className="font-bold text-zinc-900">
                        {sum.teacher.name}, {sum.teacher.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                        {sum.teacher.position}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono">
                        NIP: {sum.teacher.nip || sum.teacher.nuptk || sum.teacher.pegId || '-'}
                      </div>
                    </td>
                    <td className="p-2 text-center border-r border-zinc-200">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-zinc-100 text-zinc-700">
                        {sum.teacher.employmentStatus}
                      </span>
                    </td>

                    {/* Day Cells 1..31 */}
                    {Array.from({ length: matrix.daysCount }, (_, i) => i + 1).map(day => {
                      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isHoliday = holidays.find(h => h.date === dateStr);
                      const isSun = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
                      const rec = sum.dayRecords[day];

                      let cellBg = 'bg-white';
                      let cellText = '-';
                      let cellClass = 'text-zinc-300';
                      let titleStr = `Tgl ${day} ${monthName}: Belum ada data`;

                      if (isSun) {
                        cellBg = 'bg-rose-50/70';
                        cellText = 'L';
                        cellClass = 'text-rose-400 font-bold';
                        titleStr = `Tgl ${day} ${monthName}: Libur Ahad`;
                      } else if (isHoliday) {
                        cellBg = 'bg-amber-50';
                        cellText = 'L';
                        cellClass = 'text-amber-600 font-bold';
                        titleStr = `Tgl ${day} ${monthName}: Libur Resmi (${isHoliday.name})`;
                      } else if (rec) {
                        if (rec.status === 'HADIR') {
                          cellBg = 'bg-emerald-100/70';
                          cellText = 'H';
                          cellClass = 'text-emerald-800 font-black';
                          titleStr = `Tgl ${day}: Hadir (${rec.checkInTime} - ${rec.checkOutTime || '...' })`;
                        } else if (rec.status === 'TERLAMBAT') {
                          cellBg = 'bg-amber-100';
                          cellText = 'T';
                          cellClass = 'text-amber-900 font-black';
                          titleStr = `Tgl ${day}: Terlambat ${rec.lateMinutes} menit (Masuk: ${rec.checkInTime})`;
                        } else if (rec.status === 'IZIN') {
                          cellBg = 'bg-blue-100';
                          cellText = 'I';
                          cellClass = 'text-blue-900 font-bold';
                          titleStr = `Tgl ${day}: Izin (${rec.notes || 'Disetujui'})`;
                        } else if (rec.status === 'SAKIT') {
                          cellBg = 'bg-purple-100';
                          cellText = 'S';
                          cellClass = 'text-purple-900 font-bold';
                          titleStr = `Tgl ${day}: Sakit (${rec.notes || 'Surat Dokter'})`;
                        } else if (rec.status === 'CUTI') {
                          cellBg = 'bg-cyan-100';
                          cellText = 'C';
                          cellClass = 'text-cyan-900 font-bold';
                          titleStr = `Tgl ${day}: Cuti Tahunan / Bersalin`;
                        } else if (rec.status === 'DINAS_LUAR') {
                          cellBg = 'bg-teal-100';
                          cellText = 'DL';
                          cellClass = 'text-teal-900 font-bold';
                          titleStr = `Tgl ${day}: Tugas Dinas Luar (${rec.notes || 'Surat Tugas'})`;
                        } else if (rec.status === 'ALPA') {
                          cellBg = 'bg-rose-100';
                          cellText = 'A';
                          cellClass = 'text-rose-900 font-bold';
                          titleStr = `Tgl ${day}: Alpa / Tanpa Keterangan`;
                        } else if (rec.status === 'LIBUR') {
                          cellBg = 'bg-zinc-100';
                          cellText = 'L';
                          cellClass = 'text-zinc-500 font-bold';
                        }
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => setSelectedCellInfo({
                            teacher: sum.teacher,
                            day,
                            record: rec,
                            isHoliday,
                            isSunday: isSun,
                          })}
                          className={`p-1 text-center border-r border-zinc-200 font-mono text-[10px] cursor-pointer hover:ring-1 hover:ring-emerald-500 transition-all ${cellBg}`}
                          title={titleStr}
                        >
                          <span className={cellClass}>{cellText}</span>
                        </td>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-emerald-700 bg-emerald-50/40">
                      {sum.hadir}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-amber-700 bg-amber-50/40">
                      {sum.terlambat}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-blue-700 bg-blue-50/40">
                      {sum.izin}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-purple-700 bg-purple-50/40">
                      {sum.sakit}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-cyan-700 bg-cyan-50/40">
                      {sum.cuti}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-teal-700 bg-teal-50/40">
                      {sum.dinasLuar}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold text-rose-700 bg-rose-50/40">
                      {sum.alpa}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-black text-zinc-900 bg-zinc-100">
                      {sum.totalHadir}
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-bold">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        isPerfect
                          ? 'bg-emerald-600 text-white'
                          : isEligibleTPG
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800 font-bold'
                      }`}>
                        {sum.attendancePercentage}%
                      </span>
                    </td>
                    <td className="p-1.5 text-center border-r border-zinc-200 font-mono font-semibold text-zinc-700">
                      {sum.totalLateMinutes > 0 ? (
                        <span className="text-amber-700 font-bold">{sum.totalLateMinutes} m</span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>

                    {/* Action Button: Print Monthly Slip for this specific teacher - Compact */}
                    <td className="p-1 text-center print:hidden w-20">
                      <button
                        onClick={() => setSelectedTeacherForPrint(sum.teacher)}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition-all hover:scale-105"
                        title={`Cetak Presensi Bulanan untuk ${sum.teacher.name}`}
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={45} className="p-10 text-center text-zinc-400 text-xs">
                    {teachers.length === 0
                      ? 'Belum ada data guru / GTK terdaftar. Silakan tambahkan data di menu Data GTK.'
                      : 'Tidak ada data guru yang cocok dengan filter status.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Signature Footer */}
      <div className="hidden print:grid grid-cols-2 gap-8 text-xs pt-8 mt-6 border-t border-zinc-300">
        <div className="text-left">
          <p className="font-semibold">Mengetahui,</p>
          <p className="font-bold">{profile.headmasterSignatureTitle || 'Kepala Madrasah'}</p>
          <div className="h-20" />
          <p className="font-black underline">{profile.headmasterName}</p>
          <p>NIP. {profile.headmasterNip || '-'}</p>
        </div>
        <div className="text-right">
          <p>{profile.village}, {matrix.daysCount} {monthName} {selectedYear}</p>
          <p className="font-bold">Kepala Tata Usaha / Operator Simpatika</p>
          <div className="h-20" />
          <p className="font-black underline">{profile.tuAdminName}</p>
          <p>NIP. {profile.tuAdminNip || '-'}</p>
        </div>
      </div>

      {/* Modal: Individual Teacher Monthly Attendance Print / Preview */}
      {selectedTeacherForPrint && individualData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs print:bg-white print:p-0 print:static overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-5 my-auto max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0">
            
            {/* Modal Header Controls (Hidden on Print) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Cetak Presensi Bulanan: {selectedTeacherForPrint.name}, {selectedTeacherForPrint.title}</span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Periode: <b>{monthName} {selectedYear}</b> • {selectedTeacherForPrint.position} ({selectedTeacherForPrint.employmentStatus})
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handlePrevTeacher}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-xs font-semibold flex items-center gap-1"
                  title="Guru Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={handleNextTeacher}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-xs font-semibold flex items-center gap-1"
                  title="Guru Berikutnya"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleDownloadIndividualPDF}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Unduh PDF Resmi"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-300" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={handleExportIndividualExcel}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Ekspor Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-200" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={handlePrintIndividualModal}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>

                <button
                  onClick={() => setSelectedTeacherForPrint(null)}
                  className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all ml-1"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Paper Area */}
            <div id="modal-individual-print-paper" className="p-1 sm:p-2">
              
              {/* Official Madrasah Kop Surat */}
              <div className="border-b-2 border-zinc-900 pb-3 mb-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo Kiri */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-300 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        LOGO
                      </div>
                    )}
                  </div>

                  {/* Header Text */}
                  <div className="flex-1 text-center space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      {profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
                    </div>
                    <div className="text-xs font-semibold uppercase text-zinc-600">
                      {profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
                    </div>
                    <div className="text-base sm:text-lg font-black uppercase text-zinc-950 tracking-tight mt-0.5">
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-zinc-700">
                      {profile.address}, {profile.village}, {profile.district}, {profile.city} - Telp: {profile.phone}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                      NSM: {profile.nsm} | NPSN: {profile.npsn} | Email: {profile.email}
                    </div>
                  </div>

                  {/* Logo Kanan */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    {profile.secondaryLogoUrl ? (
                      <img src={profile.secondaryLogoUrl} alt="Logo 2" className="w-full h-full object-contain" />
                    ) : profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain opacity-40 grayscale" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-300 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        LOGO
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-sm font-bold uppercase tracking-wide border-t border-zinc-300 pt-2 text-zinc-950 text-center">
                  LAPORAN LOG PRESENSI FINGERPRINT GTK
                </div>
                <div className="text-xs text-zinc-700 font-medium text-center">
                  Periode Bulan: {monthName} {selectedYear} | Format Standar Simpatika & Mesin Presensi
                </div>
              </div>

              {/* Teacher Identity Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs mb-4">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-zinc-500">Nama Lengkap</span>
                    <span className="font-bold text-zinc-900">: {selectedTeacherForPrint.name}, {selectedTeacherForPrint.title}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-zinc-500">NIP / NUPTK</span>
                    <span className="font-mono font-semibold text-zinc-800">: {selectedTeacherForPrint.nip || selectedTeacherForPrint.nuptk || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-zinc-500">NPK / PegID</span>
                    <span className="font-mono text-zinc-800">: {selectedTeacherForPrint.npk || selectedTeacherForPrint.pegId || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-zinc-500">Jabatan / Mapel</span>
                    <span className="font-bold text-zinc-900">: {selectedTeacherForPrint.position}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-zinc-500">Status Pegawai</span>
                    <span className="text-zinc-800">: {selectedTeacherForPrint.employmentStatus} (JTM: {selectedTeacherForPrint.teachingHoursPerWeek} Jam)</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-zinc-500">ID Mesin Finger</span>
                    <span className="font-bold text-emerald-800">: #{selectedTeacherForPrint.fingerprintId}</span>
                  </div>
                </div>
              </div>

              {/* Standard 9-Column Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-900 text-white font-bold text-center text-[10px] sm:text-xs">
                      <th className="p-1.5 border-r border-emerald-800 w-8">TGL</th>
                      <th className="p-1.5 border-r border-emerald-800 w-16">HARI</th>
                      <th className="p-1.5 border-r border-emerald-800 w-16">JAM MASUK</th>
                      <th className="p-1.5 border-r border-emerald-800 w-16">ABSEN MASUK</th>
                      <th className="p-1.5 border-r border-emerald-800 w-24">TELAT/ CEPAT (Menit)</th>
                      <th className="p-1.5 border-r border-emerald-800 w-16">JAM PULANG</th>
                      <th className="p-1.5 border-r border-emerald-800 w-16">ABSEN PULANG</th>
                      <th className="p-1.5 border-r border-emerald-800 w-24">PSW/ LEWAT (Menit)</th>
                      <th className="p-1.5 text-left">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-medium text-[10.5px]">
                    {individualData.dailyRows.map((row) => (
                      <tr key={row.day} className={`hover:bg-emerald-50/30 ${row.isSunday ? 'bg-rose-50/50' : row.holiday ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-1 text-center border-r border-zinc-200 font-bold font-mono">
                          {row.day}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200">
                          {row.dayName}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 font-mono text-zinc-500">
                          {row.jamMasuk}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 font-mono font-bold text-emerald-800">
                          {row.absenMasuk}
                        </td>
                        <td className={`p-1 text-center border-r border-zinc-200 font-semibold ${row.telatCepatObj.status === 'TELAT' ? 'text-rose-700 font-bold bg-rose-50' : row.telatCepatObj.status === 'CEPAT' ? 'text-emerald-700' : 'text-zinc-600'}`}>
                          {row.telatCepat}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 font-mono text-zinc-500">
                          {row.jamPulang}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 font-mono font-bold text-blue-800">
                          {row.absenPulang}
                        </td>
                        <td className={`p-1 text-center border-r border-zinc-200 font-semibold ${row.pswLewatObj.status === 'PSW' ? 'text-rose-700 font-bold bg-rose-50' : row.pswLewatObj.status === 'LEWAT' ? 'text-emerald-700' : 'text-zinc-600'}`}>
                          {row.pswLewat}
                        </td>
                        <td className="p-1 text-zinc-700">
                          {row.keterangan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Monthly Stats Summary Banner */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-950 flex flex-wrap items-center justify-between gap-2 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span>Hadir Tepat: <b>{individualData.stats.countHadir}</b></span>
                  <span>• Terlambat: <b>{individualData.stats.countTelat}</b> ({individualData.stats.totalLateMinutes} mnt)</span>
                  <span>• Izin: <b>{individualData.stats.countIzin}</b></span>
                  <span>• Sakit: <b>{individualData.stats.countSakit}</b></span>
                  <span>• Cuti: <b>{individualData.stats.countCuti}</b></span>
                  <span>• DL: <b>{individualData.stats.countDL}</b></span>
                  <span>• Alpa: <b>{individualData.stats.countAlpa}</b></span>
                </div>
                <div className="text-emerald-900 font-bold">
                  Persentase Kehadiran: <span className="text-sm px-2 py-0.5 bg-emerald-700 text-white rounded-lg">{individualData.stats.attendanceRate}%</span>
                </div>
              </div>

              {/* Official Signatures */}
              {profile.signaturePosition === 'GURU_KIRI_KEPALA_KANAN' ? (
                <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-zinc-200">
                  <div className="text-left">
                    <p className="text-zinc-600 font-semibold">{profile.signatureRightTitle || 'Guru Yang Bersangkutan'},</p>
                    <div className="h-16" />
                    <p className="font-bold text-zinc-950 underline">{selectedTeacherForPrint.name}, {selectedTeacherForPrint.title}</p>
                    <p className="text-zinc-600">{getTeacherSignatureId(selectedTeacherForPrint)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-600">{profile.signaturePlace || profile.village}, {individualData.dailyRows.length} {monthName} {selectedYear}</p>
                    <p className="font-bold text-zinc-900 whitespace-pre-line">{profile.signatureLeftTitle || `Mengetahui,\n${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`}</p>
                    <div className="h-16" />
                    <p className="font-bold text-zinc-950 underline">{profile.headmasterName}</p>
                    <p className="text-zinc-600">NIP. {profile.headmasterNip || '-'}</p>
                  </div>
                </div>
              ) : (
                /* Default: Kepala Madrasah di Kiri, Guru di Kanan */
                <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-zinc-200">
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 whitespace-pre-line">{profile.signatureLeftTitle || `Mengetahui,\n${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`}</p>
                    <div className="h-16" />
                    <p className="font-bold text-zinc-950 underline">{profile.headmasterName}</p>
                    <p className="text-zinc-600">NIP. {profile.headmasterNip || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-600">{profile.signaturePlace || profile.village}, {individualData.dailyRows.length} {monthName} {selectedYear}</p>
                    <p className="text-zinc-600 font-semibold">{profile.signatureRightTitle || 'Guru Yang Bersangkutan'},</p>
                    <div className="h-16" />
                    <p className="font-bold text-zinc-950 underline">{selectedTeacherForPrint.name}, {selectedTeacherForPrint.title}</p>
                    <p className="text-zinc-600">{getTeacherSignatureId(selectedTeacherForPrint)}</p>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Cell Detail Modal / Drawer */}
      {selectedCellInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs print:hidden animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">
                  Detail Presensi Harian
                </h4>
                <p className="text-xs text-zinc-500">
                  {selectedCellInfo.day} {monthName} {selectedYear}
                </p>
              </div>
              <button
                onClick={() => setSelectedCellInfo(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-emerald-50/70 rounded-xl">
                <div className="font-bold text-zinc-900 text-sm">
                  {selectedCellInfo.teacher.name}, {selectedCellInfo.teacher.title}
                </div>
                <div className="text-zinc-600">
                  {selectedCellInfo.teacher.position} • Status: {selectedCellInfo.teacher.employmentStatus}
                </div>
                <div className="text-zinc-500 font-mono text-[11px] mt-0.5">
                  ID Finger: #{selectedCellInfo.teacher.fingerprintId} | NIP: {selectedCellInfo.teacher.nip || '-'}
                </div>
              </div>

              <div className="space-y-1.5 border border-zinc-100 p-3 rounded-xl bg-zinc-50/60">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status Kehadiran:</span>
                  <span className="font-bold text-zinc-800">
                    {selectedCellInfo.record ? selectedCellInfo.record.status : selectedCellInfo.isSunday ? 'LIBUR AHAD' : selectedCellInfo.isHoliday ? 'LIBUR RESMI' : 'BELUM ADA LOG'}
                  </span>
                </div>
                {selectedCellInfo.record?.checkInTime && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Jam Masuk (In):</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedCellInfo.record.checkInTime} WIB</span>
                  </div>
                )}
                {selectedCellInfo.record?.checkOutTime && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Jam Pulang (Out):</span>
                    <span className="font-mono font-bold text-blue-700">{selectedCellInfo.record.checkOutTime} WIB</span>
                  </div>
                )}
                {selectedCellInfo.record?.lateMinutes ? (
                  <div className="flex justify-between text-amber-700">
                    <span>Keterlambatan:</span>
                    <span className="font-bold">{selectedCellInfo.record.lateMinutes} Menit</span>
                  </div>
                ) : null}
                {selectedCellInfo.record?.notes && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Keterangan:</span>
                    <span className="text-zinc-700 font-medium">{selectedCellInfo.record.notes}</span>
                  </div>
                )}
                {selectedCellInfo.isHoliday && (
                  <div className="flex justify-between text-rose-700 font-semibold">
                    <span>Hari Libur:</span>
                    <span>{selectedCellInfo.isHoliday.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  const t = selectedCellInfo.teacher;
                  setSelectedCellInfo(null);
                  setSelectedTeacherForPrint(t);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Guru Ini</span>
              </button>

              <button
                onClick={() => setSelectedCellInfo(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Collective Batch Generator Modal */}
      {isBatchMonthlyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5 fill-white text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Generate Presensi Kolektif 1 Bulan Penuh</h3>
                  <p className="text-xs text-zinc-500">Otomatisasi pengisian kehadiran semua guru pada hari-hari kerja efektif</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchMonthlyModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {batchSuccessMsg ? (
              <div className="my-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-bold text-emerald-900">{batchSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteMonthlyBatch} className="mt-4 space-y-4 text-xs">
                
                {/* Period Selector */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Bulan Dituju:</label>
                    <select
                      value={batchMonth}
                      onChange={(e) => setBatchMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold bg-white text-xs"
                    >
                      {INDONESIAN_MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Tahun:</label>
                    <select
                      value={batchYear}
                      onChange={(e) => setBatchYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold bg-white text-xs"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Teachers */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Target Guru / Tenaga Pendidik:</label>
                  <select
                    value={batchTargetTeacherId}
                    onChange={(e) => setBatchTargetTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-white text-xs"
                  >
                    <option value="ALL">Semua Guru Aktif ({teachers.filter(t => t.isActive).length} Orang)</option>
                    {teachers.filter(t => t.isActive).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.position})</option>
                    ))}
                  </select>
                </div>

                {/* Workday Scheme & Holiday Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Pola Hari Kerja Madrasah:</label>
                    <select
                      value={batchWorkDays}
                      onChange={(e) => setBatchWorkDays(e.target.value as 'MON_SAT' | 'MON_FRI')}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-white text-xs"
                    >
                      <option value="MON_SAT">Senin s/d Sabtu (6 Hari Kerja)</option>
                      <option value="MON_FRI">Senin s/d Jumat (5 Hari Kerja)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Aturan Hari Libur:</label>
                    <div className="space-y-1.5 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={batchSkipSundays}
                          onChange={(e) => setBatchSkipSundays(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span className="text-zinc-700 font-medium">Lewati Hari Ahad (Minggu)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={batchSkipHolidays}
                          onChange={(e) => setBatchSkipHolidays(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span className="text-zinc-700 font-medium">Lewati Hari Libur Nasional ({holidays.length} data)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Times & Jitter */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Jam Datang Standar:</label>
                    <input
                      type="time"
                      value={batchInTime}
                      onChange={(e) => setBatchInTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Jam Pulang Standar:</label>
                    <input
                      type="time"
                      value={batchOutTime}
                      onChange={(e) => setBatchOutTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Scope Mode: Safe Fill vs Overwrite */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Mode Eksekusi Data:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchScope('FILL_EMPTY_ONLY')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        batchScope === 'FILL_EMPTY_ONLY'
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 font-bold'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                      }`}
                    >
                      <div className="text-[11px] text-emerald-800 font-bold">Hanya Isi Hari Kosong (Aman)</div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">Mempertahankan log finger, izin, & sakit yang sudah ada</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchScope('OVERWRITE_ALL')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        batchScope === 'OVERWRITE_ALL'
                          ? 'border-amber-600 bg-amber-50/90 text-amber-950 font-bold'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                      }`}
                    >
                      <div className="text-[11px] text-amber-800 font-bold">Timpa Semua Hari Kerja</div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">Mengganti seluruh data hadir kerja di bulan ini</div>
                    </button>
                  </div>
                </div>

                {/* Natural Jitter */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-800 text-[11px]">Variasi Alami Menit Presensi (Anti-Monoton)</div>
                    <div className="text-zinc-500 text-[10px]">Mengacak jam masuk (06:41 - 06:49) & pulang secara realistis</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={batchJitter}
                    onChange={(e) => setBatchJitter(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 flex items-center justify-between border-t border-zinc-100">
                  <div className="text-[11px] text-zinc-500">
                    Target: <strong>{INDONESIAN_MONTHS[batchMonth - 1]} {batchYear}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchMonthlyModalOpen(false)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Generate 1 Bulan</span>
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
