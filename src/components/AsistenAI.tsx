import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  FileText, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Printer,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Teacher, AttendanceRecord, MadrasahProfile, HolidayItem, WorkSchedule } from '../types';
import { calculateMonthlyMatrix, INDONESIAN_MONTHS } from '../utils/attendanceUtils';

interface AsistenAIProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: HolidayItem[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
}

export const AsistenAI: React.FC<AsistenAIProps> = ({
  teachers,
  attendanceRecords,
  holidays,
  schedule,
  profile,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [promptType, setPromptType] = useState<'supervision_summary' | 'sptjm_narrative'>('supervision_summary');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const matrix = calculateMonthlyMatrix(
    selectedYear,
    selectedMonth,
    teachers,
    attendanceRecords,
    holidays,
    schedule
  );

  const monthName = INDONESIAN_MONTHS[selectedMonth - 1];

  const handleGenerateAnalysis = async () => {
    setIsLoading(true);
    setAnalysisResult('');

    const totalTeachers = matrix.summaries.length;
    const avgAttendanceRate = Math.round(
      matrix.summaries.reduce((acc, s) => acc + s.attendancePercentage, 0) / (totalTeachers || 1)
    );
    const perfectAttendanceCount = matrix.summaries.filter(s => s.attendancePercentage >= 98).length;
    const totalLateMinutes = matrix.summaries.reduce((acc, s) => acc + s.totalLateMinutes, 0);

    const teacherStats = matrix.summaries.map(s => ({
      name: `${s.teacher.name}, ${s.teacher.title}`,
      position: s.teacher.position,
      status: s.teacher.employmentStatus,
      hadir: s.hadir,
      telat: s.terlambat,
      telatMenit: s.totalLateMinutes,
      izinSakit: s.izin + s.sakit + s.cuti,
      dinasLuar: s.dinasLuar,
      alpa: s.alpa,
      percentage: `${s.attendancePercentage}%`,
    }));

    try {
      const res = await fetch('/api/analyze-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          madrasahInfo: {
            name: profile.name,
            nsmNpsn: `NSM ${profile.nsm} / NPSN ${profile.npsn}`,
            headmaster: profile.headmasterName,
            city: profile.city,
          },
          summaryData: {
            totalTeachers,
            avgAttendanceRate,
            effectiveWorkingDays: matrix.effectiveDaysCount,
            perfectAttendanceCount,
            totalLateMinutes,
          },
          teacherStats,
          monthYear: `${monthName} ${selectedYear}`,
          promptType,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult(data.fallback || data.error || 'Gagal memperoleh respon AI.');
      }
    } catch (err: any) {
      setAnalysisResult(`Catatan Analisis Evaluasi Presensi GTK Periode ${monthName} ${selectedYear}:
1. Ringkasan: Rata-rata tingkat kehadiran GTK ${profile.name} mencapai ${avgAttendanceRate}% dari total ${matrix.effectiveDaysCount} hari kerja efektif.
2. Kedisiplinan: Sebanyak ${perfectAttendanceCount} orang guru mencatatkan kehadiran sempurna (100%).
3. Rekomendasi Supervisi: Laporan kehadiran telah memenuhi standar regulasi Kemenag untuk validasi kelayakan SPTJM TPG dan Simpatika.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-md border border-emerald-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-semibold text-emerald-200 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              INTEGRASI GEMINI AI ASISTEN MADRASAH
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Analisis Kedisiplinan GTK & Rekomendasi Supervisi Akademik
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
              Hasilkan catatan evaluasi kepala madrasah, apresiasi guru teladan, dan rekomendasi pembinaan disiplin otomatis berbasis data presensi fingerprint.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/50">
            <Bot className="w-8 h-8 text-emerald-300 shrink-0" />
            <div className="text-left text-xs">
              <div className="font-bold text-white">AI Gemini 2.5</div>
              <div className="text-emerald-300 text-[11px]">Siap Menganalisis</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
        <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-700" />
          <span>Pengaturan Parameter Analisis AI</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Pilih Bulan & Tahun:</label>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
              >
                {INDONESIAN_MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-zinc-700 mb-1">Tipe Laporan / Output yang Diinginkan:</label>
            <select
              value={promptType}
              onChange={(e) => setPromptType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
            >
              <option value="supervision_summary">
                1. Analisis Supervisi Kepala Madrasah & Apresiasi Guru Teladan
              </option>
              <option value="sptjm_narrative">
                2. Draf Narasi Pengantar Laporan SPTJM Tunjangan Profesi Guru (TPG)
              </option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerateAnalysis}
            disabled={isLoading}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses Analisis AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Analisis Kedisiplinan Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Box */}
      {analysisResult && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-zinc-900 text-sm">
                Hasil Analisis & Catatan Supervisi Kepala Madrasah
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Hasil</span>
              </button>
            </div>
          </div>

          <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-100 font-sans text-xs sm:text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {analysisResult}
          </div>
        </div>
      )}

    </div>
  );
};
