import React, { useState } from 'react';
import { 
  Printer, 
  FileCheck, 
  Download, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Building,
  FileDown
} from 'lucide-react';
import { Teacher, AttendanceRecord, WorkSchedule, MadrasahProfile, HolidayItem } from '../types';
import { calculateMonthlyMatrix, INDONESIAN_MONTHS, formatIndonesianDate, getTeacherSignatureId } from '../utils/attendanceUtils';
import { downloadSptjmPDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';

interface CetakSPTJMProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  holidays: HolidayItem[];
  schedule: WorkSchedule;
  profile: MadrasahProfile;
}

export const CetakSPTJM: React.FC<CetakSPTJMProps> = ({
  teachers,
  attendanceRecords,
  holidays,
  schedule,
  profile,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [letterNumber, setLetterNumber] = useState<string>(`SPTJM/088/MI-MA/${INDONESIAN_MONTHS[now.getMonth()].substring(0, 3).toUpperCase()}/${now.getFullYear()}`);
  const [sptjmPurpose, setSptjmPurpose] = useState<string>('Pencairan Tunjangan Profesi Guru (TPG) & Insentif Guru Madrasah Kemenag');

  const matrix = calculateMonthlyMatrix(
    selectedYear,
    selectedMonth,
    teachers,
    attendanceRecords,
    holidays,
    schedule
  );

  const monthName = INDONESIAN_MONTHS[selectedMonth - 1];

  const handlePrint = () => {
    executePrint({
      elementId: 'sptjm-document-paper',
      title: `SPTJM_Presensi_${monthName}_${selectedYear}`,
      landscape: false,
      onPdfFallback: () => {
        downloadSptjmPDF(
          profile,
          letterNumber,
          sptjmPurpose,
          monthName,
          selectedYear,
          matrix.summaries,
          matrix.effectiveDaysCount
        );
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Control Panel (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <span>Cetak SPTJM Kehadiran Guru Madrasah (Format Resmi Kemenag)</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) bermaterai untuk berkas pencairan TPG, Simpatika, EMIS, & Insentif Kemenag.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-download-pdf-sptjm"
              onClick={() => {
                downloadSptjmPDF(
                  profile,
                  letterNumber,
                  sptjmPurpose,
                  monthName,
                  selectedYear,
                  matrix.summaries,
                  matrix.effectiveDaysCount
                );
              }}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all border border-emerald-600"
              title="Unduh SPTJM Format PDF Resmi Kemenag"
            >
              <FileDown className="w-4 h-4 text-emerald-300" />
              <span>Unduh PDF SPTJM Resmi</span>
            </button>
            <button
              id="btn-print-sptjm"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Browser</span>
            </button>
          </div>
        </div>

        {/* Configuration inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-100">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Bulan & Tahun:</label>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  setLetterNumber(`SPTJM/088/MI-MA/${INDONESIAN_MONTHS[m - 1].substring(0, 3).toUpperCase()}/${selectedYear}`);
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
              >
                {INDONESIAN_MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setSelectedYear(y);
                  setLetterNumber(`SPTJM/088/MI-MA/${INDONESIAN_MONTHS[selectedMonth - 1].substring(0, 3).toUpperCase()}/${y}`);
                }}
                className="w-24 px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Nomor Surat SPTJM:</label>
            <input
              type="text"
              value={letterNumber}
              onChange={(e) => setLetterNumber(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Keperluan SPTJM:</label>
            <input
              type="text"
              value={sptjmPurpose}
              onChange={(e) => setSptjmPurpose(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
            />
          </div>
        </div>
      </div>

      {/* Official SPTJM Document Paper (A4 Style) */}
      <div 
        id="sptjm-document-paper"
        className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-zinc-300 text-zinc-900 font-serif leading-relaxed text-sm print:p-0 print:border-none print:shadow-none"
      >
        {/* Official Kop Madrasah */}
        <div className="text-center border-b-4 border-double border-zinc-950 pb-4 mb-6">
          <div className="text-sm font-bold tracking-wider uppercase font-sans text-zinc-800">
            {profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
          </div>
          <div className="text-xs font-semibold tracking-wider uppercase font-sans text-zinc-700">
            {profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
          </div>
          <div className="text-xl font-black uppercase tracking-tight text-zinc-950 mt-1 font-sans">
            {profile.name}
          </div>
          <div className="text-xs text-zinc-700 font-sans mt-0.5">
            {profile.address}, Desa/Kel. {profile.village}, Kec. {profile.district}, {profile.city} - {profile.province} {profile.postalCode}
          </div>
          <div className="text-[11px] text-zinc-600 font-sans">
            NSM: <strong>{profile.nsm}</strong> | NPSN: <strong>{profile.npsn}</strong> | Telp: {profile.phone} | Email: {profile.email}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6 space-y-1">
          <h3 className="text-base font-bold underline uppercase tracking-wide font-sans">
            SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)
          </h3>
          <p className="text-xs font-bold font-sans text-zinc-700">
            Nomor: {letterNumber}
          </p>
        </div>

        {/* Statement Body */}
        <div className="space-y-3 text-xs sm:text-sm text-justify">
          <p>
            Yang bertanda tangan di bawah ini:
          </p>

          <div className="pl-6 space-y-1 text-xs sm:text-sm font-sans">
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">Nama Lengkap</span>
              <span className="col-span-8 font-bold">: {profile.headmasterName}</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">NIP / NUPTK</span>
              <span className="col-span-8">: {profile.headmasterNip || profile.headmasterNuptk || '-'}</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">Jabatan</span>
              <span className="col-span-8">: {profile.headmasterSignatureTitle || 'Kepala Madrasah'}</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">Nama Madrasah</span>
              <span className="col-span-8 font-bold">: {profile.name}</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">NSM / NPSN</span>
              <span className="col-span-8">: {profile.nsm} / {profile.npsn}</span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <span className="col-span-4 font-semibold">Alamat Madrasah</span>
              <span className="col-span-8">: {profile.address}, {profile.city}</span>
            </div>
          </div>

          <p className="pt-2">
            Dengan ini menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:
          </p>

          <ol className="list-decimal pl-6 space-y-1.5 text-xs sm:text-sm">
            <li>
              Data kehadiran Guru dan Tenaga Kependidikan (GTK) pada <strong>{profile.name}</strong> untuk periode bulan <strong>{monthName} {selectedYear}</strong> (Hari Efektif: {matrix.effectiveDaysCount} hari) sebagaimana terlampir adalah <strong>BENAR</strong> dan sesuai dengan rekaman mesin absensi sidik jari (fingerprint) serta dokumen kehadiran resmi madrasah.
            </li>
            <li>
              Seluruh guru yang tercantum dalam lampiran surat ini telah melaksanakan tugas pokok pembelajaran / bimbingan / tugas tambahan sesuai dengan beban kerja guru yang dipersyaratkan.
            </li>
            <li>
              Laporan rekapitulasi kehadiran ini dipergunakan sebagai dasar kelengkapan administrasi <strong>{sptjmPurpose}</strong>.
            </li>
            <li>
              Apabila di kemudian hari terbukti pernyataan ini tidak benar atau ditemukan manipulasi data kehadiran yang mengakibatkan kerugian negara, saya bersedia bertanggung jawab penuh secara hukum dan mengembalikan seluruh kerugian tersebut ke Kas Negara sesuai ketentuan perundang-undangan.
            </li>
          </ol>

          <p className="pt-2">
            Demikian Surat Pernyataan Tanggung Jawab Mutlak ini saya buat dengan sadar dan tanpa paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.
          </p>
        </div>

        {/* Table of Teachers Attached */}
        <div className="mt-6 pt-4 border-t border-zinc-200">
          <div className="text-center font-sans font-bold text-xs uppercase tracking-wider mb-2">
            LAMPIRAN DAFTAR KEHADIRAN GTK PERIODE: {monthName.toUpperCase()} {selectedYear}
          </div>

          <table className="w-full text-[11px] font-sans border-collapse border border-zinc-400 text-left">
            <thead>
              <tr className="bg-zinc-100 font-bold border-b border-zinc-400 text-center">
                <th className="p-1.5 border-r border-zinc-400 w-7">No</th>
                <th className="p-1.5 border-r border-zinc-400 text-left">Nama GTK / NIP / NUPTK</th>
                <th className="p-1.5 border-r border-zinc-400">Jabatan & Mapel</th>
                <th className="p-1.5 border-r border-zinc-400 w-12">Status</th>
                <th className="p-1.5 border-r border-zinc-400 w-10">JTM</th>
                <th className="p-1.5 border-r border-zinc-400 w-10">Hadir</th>
                <th className="p-1.5 border-r border-zinc-400 w-10">I/S/C</th>
                <th className="p-1.5 border-r border-zinc-400 w-10">DL</th>
                <th className="p-1.5 border-r border-zinc-400 w-10">Alpa</th>
                <th className="p-1.5 border-r border-zinc-400 w-12">% Hadir</th>
                <th className="p-1.5">Ket. TPG</th>
              </tr>
            </thead>
            <tbody>
              {matrix.summaries.map((s, idx) => {
                const isEligible = s.attendancePercentage >= 85;
                const izinSakitCuti = s.izin + s.sakit + s.cuti;
                return (
                  <tr key={s.teacher.id} className="border-b border-zinc-300">
                    <td className="p-1 text-center border-r border-zinc-300">{idx + 1}</td>
                    <td className="p-1 border-r border-zinc-300">
                      <div className="font-bold text-zinc-950">{s.teacher.name}, {s.teacher.title}</div>
                      <div className="text-[10px] text-zinc-600">{getTeacherSignatureId(s.teacher)}</div>
                    </td>
                    <td className="p-1 border-r border-zinc-300">{s.teacher.position}</td>
                    <td className="p-1 text-center border-r border-zinc-300">{s.teacher.employmentStatus}</td>
                    <td className="p-1 text-center border-r border-zinc-300 font-bold">{s.teacher.teachingHoursPerWeek || '-'}</td>
                    <td className="p-1 text-center border-r border-zinc-300 font-bold">{s.totalHadir}</td>
                    <td className="p-1 text-center border-r border-zinc-300">{izinSakitCuti}</td>
                    <td className="p-1 text-center border-r border-zinc-300">{s.dinasLuar}</td>
                    <td className="p-1 text-center border-r border-zinc-300">{s.alpa}</td>
                    <td className="p-1 text-center border-r border-zinc-300 font-bold">{s.attendancePercentage}%</td>
                    <td className="p-1 text-center font-bold text-[10px]">
                      {isEligible ? 'MEMENUHI' : 'BELUM'}
                    </td>
                  </tr>
                );
              })}
              {matrix.summaries.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-zinc-400 text-xs">
                    Belum ada data GTK terdaftar. Silakan tambahkan data guru di menu Data GTK.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures & Materai Box */}
        <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs font-sans">
          <div className="text-left space-y-1">
            <p>Mengetahui / Menyetujui,</p>
            <p className="font-bold">Ketua Yayasan / Pengawas Madrasah</p>
            <div className="h-20" />
            <p className="font-bold underline">....................................................</p>
            <p>NIP. -</p>
          </div>

          <div className="text-right space-y-1">
            <p>{profile.village}, {matrix.daysCount} {monthName} {selectedYear}</p>
            <p className="font-bold">{profile.headmasterSignatureTitle || 'Kepala Madrasah'}</p>
            
            {/* Materai 10000 box placeholder */}
            <div className="my-2 ml-auto w-24 h-14 border border-dashed border-zinc-400 rounded flex flex-col items-center justify-center text-[9px] text-zinc-400 bg-zinc-50 print:bg-transparent">
              <span>MATERAI</span>
              <span className="font-bold">Rp 10.000</span>
            </div>

            <p className="font-bold underline text-zinc-950">{profile.headmasterName}</p>
            <p>NIP. {profile.headmasterNip || profile.headmasterNuptk || '-'}</p>
          </div>
        </div>

      </div>

    </div>
  );
};
