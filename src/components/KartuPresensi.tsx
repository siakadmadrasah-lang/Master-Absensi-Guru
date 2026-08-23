import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Award,
  FileDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile, HolidayItem } from '../types';
import { 
  INDONESIAN_MONTHS, 
  formatIndonesianDate, 
  getDaysInMonth, 
  isDateHoliday,
  getScheduleTimesForDay,
  getTelatCepatCalc,
  getPswLewatCalc,
  exportFingerprintLogToExcel,
  isTeacherRecordMatch,
  getLocalDateString,
  getTeacherSignatureId,
  getTeacherMonthlyDailyRows
} from '../utils/attendanceUtils';
import { downloadIndividualTeacherSlipPDF, downloadBatchTeacherSlipsPDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';

interface KartuPresensiProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: HolidayItem[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
  currentUser?: Teacher | null;
}

export const KartuPresensi: React.FC<KartuPresensiProps> = ({
  teachers,
  attendanceRecords,
  holidays,
  schedule,
  profile,
  currentUser,
}) => {
  const isGuru = currentUser?.role === 'GURU';
  const defaultTeacherId = isGuru && currentUser ? currentUser.id : (teachers[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacherId);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Sync selectedTeacherId if teachers change or load async
  useEffect(() => {
    if (isGuru && currentUser) {
      setSelectedTeacherId(currentUser.id);
    } else if (teachers.length > 0 && (!selectedTeacherId || !teachers.some(t => t.id === selectedTeacherId))) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, isGuru, currentUser, selectedTeacherId]);

  const effectiveTeacherId = isGuru && currentUser ? currentUser.id : selectedTeacherId;
  const teacher = teachers.find(t => isTeacherRecordMatch(effectiveTeacherId, t)) || (isGuru && currentUser ? currentUser : teachers[0]);
  const monthName = INDONESIAN_MONTHS[selectedMonth - 1];
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Compute daily rows and accurate statistics for this specific teacher
  const { dailyRows, stats } = teacher
    ? getTeacherMonthlyDailyRows(selectedYear, selectedMonth, teacher, attendanceRecords, holidays, schedule)
    : {
        dailyRows: [],
        stats: {
          countHadir: 0,
          countTelat: 0,
          countIzin: 0,
          countSakit: 0,
          countCuti: 0,
          countDL: 0,
          countAlpa: 0,
          totalLateMinutes: 0,
          totalWorkMinutes: 0,
          attendanceRate: 0,
          effectiveWorkingDays: 0,
        }
      };

  const {
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
  } = stats;

  const handlePrint = () => {
    executePrint({
      elementId: 'kartu-presensi-paper',
      title: `Log_Fingerprint_${teacher?.name || 'GTK'}_${monthName}_${selectedYear}`,
      landscape: false,
      onPdfFallback: () => {
        if (teacher) {
          downloadIndividualTeacherSlipPDF(
            profile,
            teacher,
            selectedYear,
            selectedMonth,
            dailyRows,
            {
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
            },
            schedule
          );
        }
      }
    });
  };

  const handleExportExcel = () => {
    if (teacher) {
      exportFingerprintLogToExcel(
        profile,
        teacher,
        selectedYear,
        selectedMonth,
        dailyRows
      );
    }
  };

  const currentTeacherIndex = teachers.findIndex(t => t.id === selectedTeacherId);
  const handlePrevTeacher = () => {
    if (teachers.length === 0) return;
    if (currentTeacherIndex > 0) {
      setSelectedTeacherId(teachers[currentTeacherIndex - 1].id);
    } else if (currentTeacherIndex === 0) {
      setSelectedTeacherId(teachers[teachers.length - 1].id);
    }
  };
  const handleNextTeacher = () => {
    if (teachers.length === 0) return;
    if (currentTeacherIndex >= 0 && currentTeacherIndex < teachers.length - 1) {
      setSelectedTeacherId(teachers[currentTeacherIndex + 1].id);
    } else if (currentTeacherIndex === teachers.length - 1) {
      setSelectedTeacherId(teachers[0].id);
    }
  };

  const handlePrintBatchAll = () => {
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

  if (teachers.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-zinc-300 shadow-sm max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 mb-1">
          Belum Ada Data Guru / GTK
        </h3>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
          Daftar Guru & Tenaga Kependidikan masih kosong. Silakan tambahkan data guru di menu <b>Data GTK</b> untuk melihat dan mencetak format log finger print.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Control Selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              <span>Format Cetak Finger Print GTK Madrasah</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Format baku log mesin presensi: <b>TANGGAL | HARI | JAM MASUK | ABSEN MASUK | TELAT/ CEPAT (Menit) | JAM PULANG | ABSEN PULANG | PSW/ LEWAT WAKTU (Menit) | KETERANGAN</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isGuru && (
              <button
                onClick={handlePrintBatchAll}
                className="px-3.5 py-2 bg-emerald-950 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-800"
                title="Unduh 1 File PDF Berisi Lembar Presensi Bulanan Semua Guru (Per Halaman GTK)"
              >
                <Layers className="w-4 h-4 text-emerald-300" />
                <span>Cetak Semua Guru (Multi-Page PDF)</span>
              </button>
            )}

            <button
              onClick={() => {
                if (teacher) {
                  downloadIndividualTeacherSlipPDF(
                    profile,
                    teacher,
                    selectedYear,
                    selectedMonth,
                    dailyRows,
                    {
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
                    },
                    schedule
                  );
                }
              }}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-emerald-600"
              title="Unduh PDF Format Log Finger Print"
            >
              <FileDown className="w-4 h-4 text-emerald-300" />
              <span>{isGuru ? 'Unduh PDF Presensi Saya' : 'Cetak PDF Guru Ini'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all border border-teal-600"
              title="Unduh Excel Format Log Finger Print"
            >
              <Download className="w-4 h-4 text-teal-200" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Browser</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-100">
          <div>
            {isGuru && teacher ? (
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Guru / GTK:</label>
                <div className="w-full px-3 py-2 rounded-xl border border-emerald-300 font-bold bg-emerald-50 text-emerald-950 flex items-center justify-between text-xs">
                  <span>{teacher.name}, {teacher.title || ''}</span>
                  <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-normal">Akun Anda</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-700">Pilih Guru / GTK:</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevTeacher}
                      className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      title="Guru Sebelumnya"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextTeacher}
                      className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      title="Guru Berikutnya"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}, {t.title} ({t.position})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
            >
              {INDONESIAN_MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Tahun:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div 
        id="kartu-presensi-paper"
        className="bg-white p-5 sm:p-8 rounded-2xl shadow-md border border-zinc-300 text-zinc-900 text-xs print:p-0 print:border-none print:shadow-none"
      >
        {/* Kop */}
        <div className="border-b-2 border-zinc-950 pb-3 mb-4">
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                {profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
              </div>
              <div className="text-[10px] font-semibold uppercase text-zinc-600">
                {profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
              </div>
              <div className="text-base font-black uppercase tracking-wide text-zinc-950">
                {profile.name}
              </div>
              <div className="text-[10px] text-zinc-600">
                {profile.address}, {profile.village}, {profile.district}, {profile.city} - Telp: {profile.phone}
              </div>
              <div className="text-[9.5px] font-mono text-zinc-500">
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

          <div className="mt-2 text-xs font-black uppercase tracking-wider underline border-t border-zinc-300 pt-2 text-center text-zinc-900">
            LAPORAN LOG PRESENSI FINGER PRINT GTK
          </div>
          <div className="text-[11px] font-bold text-zinc-800 text-center">
            Bulan: {monthName} {selectedYear}
          </div>
        </div>

        {/* Teacher Profile Box */}
        {teacher && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 print:bg-transparent print:border-zinc-300">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">Nama Guru:</span>
                <span className="font-bold text-zinc-950">{teacher.name}, {teacher.title}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">NIP / NUPTK:</span>
                <span className="font-mono">{teacher.nip || teacher.nuptk || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">NPK / PegID:</span>
                <span className="font-mono">{teacher.npk || teacher.pegId || '-'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">Jabatan / Mapel:</span>
                <span className="font-medium">{teacher.position}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">Status Pegawai:</span>
                <span className="font-bold text-emerald-800">{teacher.employmentStatus}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-zinc-500">ID Fingerprint:</span>
                <span className="font-mono font-bold">#{teacher.fingerprintId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Summary Banner */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4 text-center font-bold text-[10px]">
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-zinc-500">Hadir Tepat</div>
            <div className="text-sm text-emerald-800">{countHadir}</div>
          </div>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-zinc-500">Terlambat</div>
            <div className="text-sm text-amber-800">{countTelat}</div>
          </div>
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-zinc-500">Izin</div>
            <div className="text-sm text-blue-800">{countIzin}</div>
          </div>
          <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-zinc-500">Sakit</div>
            <div className="text-sm text-purple-800">{countSakit}</div>
          </div>
          <div className="p-2 bg-cyan-50 border border-cyan-200 rounded-lg">
            <div className="text-zinc-500">Cuti</div>
            <div className="text-sm text-cyan-800">{countCuti}</div>
          </div>
          <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="text-zinc-500">Dinas Luar</div>
            <div className="text-sm text-teal-800">{countDL}</div>
          </div>
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="text-zinc-500">Alpa</div>
            <div className="text-sm text-rose-800">{countAlpa}</div>
          </div>
          <div className="p-2 bg-emerald-700 text-white rounded-lg">
            <div className="text-emerald-100">% Kehadiran</div>
            <div className="text-sm">{attendanceRate}%</div>
          </div>
        </div>

        {/* Detailed Days Table with EXACT 9 COLUMNS requested */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-zinc-400 text-left text-[11px]">
            <thead>
              <tr className="bg-emerald-800 text-white font-bold border-b border-zinc-400 text-center uppercase tracking-tight text-[10px]">
                <th className="p-2 border-r border-emerald-700 w-10">TANGGAL</th>
                <th className="p-2 border-r border-emerald-700 w-16">HARI</th>
                <th className="p-2 border-r border-emerald-700 w-20">JAM MASUK</th>
                <th className="p-2 border-r border-emerald-700 w-20">ABSEN MASUK</th>
                <th className="p-2 border-r border-emerald-700 w-28">TELAT/ CEPAT (Menit)</th>
                <th className="p-2 border-r border-emerald-700 w-20">JAM PULANG</th>
                <th className="p-2 border-r border-emerald-700 w-20">ABSEN PULANG</th>
                <th className="p-2 border-r border-emerald-700 w-32">PSW/ LEWAT WAKTU (Menit)</th>
                <th className="p-2">KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((row) => {
                let rowBg = '';

                if (row.isSunday) {
                  rowBg = 'bg-rose-50/40 text-rose-950';
                } else if (row.holiday) {
                  rowBg = 'bg-amber-50/40 text-amber-950';
                } else if (row.telatCepatObj.status === 'TELAT' || row.pswLewatObj.status === 'PSW') {
                  rowBg = 'bg-amber-50/20';
                }

                return (
                  <tr key={row.day} className={`border-b border-zinc-300 hover:bg-zinc-50/80 transition-colors ${rowBg}`}>
                    <td className="p-1.5 text-center font-bold border-r border-zinc-300">{row.day}</td>
                    <td className="p-1.5 font-medium border-r border-zinc-300">{row.dayName}</td>
                    <td className="p-1.5 text-center font-mono border-r border-zinc-300 text-zinc-600">
                      {row.jamMasuk}
                    </td>
                    <td className="p-1.5 text-center font-mono font-bold border-r border-zinc-300 text-emerald-800">
                      {row.absenMasuk}
                    </td>
                    <td className="p-1.5 text-center font-mono border-r border-zinc-300 text-[10px]">
                      {row.telatCepatObj.status === 'TELAT' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                          {row.telatCepat}
                        </span>
                      ) : row.telatCepatObj.status === 'CEPAT' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">
                          {row.telatCepat}
                        </span>
                      ) : row.telatCepatObj.status === 'TEPAT' ? (
                        <span className="text-emerald-700 font-medium">0 m (Tepat)</span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="p-1.5 text-center font-mono border-r border-zinc-300 text-zinc-600">
                      {row.jamPulang}
                    </td>
                    <td className="p-1.5 text-center font-mono font-bold border-r border-zinc-300 text-blue-800">
                      {row.absenPulang}
                    </td>
                    <td className="p-1.5 text-center font-mono border-r border-zinc-300 text-[10px]">
                      {row.pswLewatObj.status === 'PSW' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold" title="Pulang Sebelum Waktu">
                          {row.pswLewat}
                        </span>
                      ) : row.pswLewatObj.status === 'LEWAT' ? (
                        <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium" title="Lewat Waktu Jam Kerja">
                          {row.pswLewat}
                        </span>
                      ) : row.pswLewatObj.status === 'TEPAT' ? (
                        <span className="text-blue-700 font-medium">0 m (Tepat)</span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="p-1.5 text-[10px] text-zinc-700 font-medium">
                      {row.keterangan}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signature Footer */}
        {profile.signaturePosition === 'GURU_KIRI_KEPALA_KANAN' ? (
          <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs">
            <div className="text-left space-y-1">
              <p className="font-semibold">{profile.signatureRightTitle || 'Guru Yang Bersangkutan'},</p>
              <div className="h-16" />
              <p className="font-bold underline">{teacher?.name}, {teacher?.title}</p>
              <p className="text-zinc-700">{getTeacherSignatureId(teacher)}</p>
            </div>

            <div className="text-right space-y-1">
              <p>{profile.signaturePlace || profile.village}, {daysInMonth} {monthName} {selectedYear}</p>
              <p className="font-bold whitespace-pre-line">{profile.signatureLeftTitle || `Mengetahui,\n${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`}</p>
              <div className="h-16" />
              <p className="font-bold underline">{profile.headmasterName}</p>
              <p>NIP. {profile.headmasterNip || '-'}</p>
            </div>
          </div>
        ) : (
          /* Default: Kepala Madrasah di Kiri, Guru di Kanan */
          <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs">
            <div className="text-left space-y-1">
              <p className="font-bold whitespace-pre-line">{profile.signatureLeftTitle || `Mengetahui,\n${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`}</p>
              <div className="h-16" />
              <p className="font-bold underline">{profile.headmasterName}</p>
              <p>NIP. {profile.headmasterNip || '-'}</p>
            </div>

            <div className="text-right space-y-1">
              <p>{profile.signaturePlace || profile.village}, {daysInMonth} {monthName} {selectedYear}</p>
              <p className="font-semibold">{profile.signatureRightTitle || 'Guru Yang Bersangkutan'},</p>
              <div className="h-16" />
              <p className="font-bold underline">{teacher?.name}, {teacher?.title}</p>
              <p className="text-zinc-700">{getTeacherSignatureId(teacher)}</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
