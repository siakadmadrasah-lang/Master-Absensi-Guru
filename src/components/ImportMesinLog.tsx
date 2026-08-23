import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  Download,
  Info,
  Database
} from 'lucide-react';
import { Teacher, AttendanceRecord, WorkSchedule } from '../types';
import { parseMachineLogFile, calculateLateMinutes } from '../utils/attendanceUtils';

interface ImportMesinLogProps {
  teachers: Teacher[];
  schedule: WorkSchedule;
  onImportRecords: (records: AttendanceRecord[]) => void;
}

export const ImportMesinLog: React.FC<ImportMesinLogProps> = ({
  teachers,
  schedule,
  onImportRecords,
}) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseMachineLogFile> | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const sampleLogData = `1\t2026-08-16 06:42:15\t1\t0\t1\t0
2\t2026-08-16 06:48:30\t1\t0\t1\t0
3\t2026-08-16 07:05:12\t1\t0\t1\t0
4\t2026-08-16 07:24:45\t1\t0\t1\t0
5\t2026-08-16 06:55:00\t1\t0\t1\t0
6\t2026-08-16 06:58:20\t1\t0\t1\t0
7\t2026-08-16 07:02:10\t1\t0\t1\t0
8\t2026-08-16 06:50:35\t1\t0\t1\t0
1\t2026-08-16 14:15:20\t1\t1\t1\t0
2\t2026-08-16 14:20:10\t1\t1\t1\t0
3\t2026-08-16 14:05:40\t1\t1\t1\t0`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
      const res = parseMachineLogFile(text);
      setParseResult(res);
      setImportStatus('');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('attlog_zkteco_solution_sample.dat');
    setFileContent(sampleLogData);
    const res = parseMachineLogFile(sampleLogData);
    setParseResult(res);
    setImportStatus('');
  };

  const handleProcessImport = () => {
    if (!parseResult || !parseResult.success || parseResult.records.length === 0) return;

    // Group logs by enrollId and date to find checkIn (first scan) and checkOut (last scan)
    const grouped: { [key: string]: { enrollId: number; date: string; scans: string[] } } = {};

    parseResult.records.forEach(rec => {
      const key = `${rec.enrollId}_${rec.date}`;
      if (!grouped[key]) {
        grouped[key] = { enrollId: rec.enrollId, date: rec.date, scans: [] };
      }
      grouped[key].scans.push(rec.time);
    });

    const newAttendanceRecords: AttendanceRecord[] = [];

    Object.values(grouped).forEach(item => {
      const teacher = teachers.find(t => t.fingerprintId === item.enrollId);
      if (!teacher) return; // Unmatched finger ID

      // Sort scans chronologically
      item.scans.sort();
      const firstScan = item.scans[0];
      const lastScan = item.scans.length > 1 ? item.scans[item.scans.length - 1] : undefined;

      // Determine late
      const d = new Date(item.date);
      const isFriday = d.getDay() === 5;
      const isSat = d.getDay() === 6;
      const limit = isFriday ? schedule.friday.checkInLimit : isSat ? schedule.saturday.checkInLimit : schedule.mondayThursday.checkInLimit;

      const lateMins = calculateLateMinutes(firstScan, limit, schedule.toleranceMinutes);
      const isLate = lateMins > 0;

      let workMins = 0;
      if (firstScan && lastScan) {
        const [inH, inM] = firstScan.split(':').map(Number);
        const [outH, outM] = lastScan.split(':').map(Number);
        workMins = (outH * 60 + outM) - (inH * 60 + inM);
      }

      newAttendanceRecords.push({
        id: `att-${teacher.id}-${item.date}`,
        teacherId: teacher.id,
        date: item.date,
        checkInTime: firstScan,
        checkOutTime: lastScan,
        status: isLate ? 'TERLAMBAT' : 'HADIR',
        lateMinutes: lateMins,
        earlyLeaveMinutes: 0,
        workDurationMinutes: workMins > 0 ? workMins : 420,
        verificationMethod: 'IMPORT_MESIN',
        notes: isLate ? `Import Mesin: Terlambat ${lateMins}m` : 'Import Log Mesin Sidik Jari',
      });
    });

    onImportRecords(newAttendanceRecords);
    setImportStatus(`Berhasil menyinkronkan ${newAttendanceRecords.length} catatan presensi guru ke sistem!`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-700" />
              <span>Import Data Log Mesin Sidik Jari Fisik (ZKTeco / Solution / FingerPlus)</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sinkronisasi file USB / ekspor log dari mesin fingerprint fisik madrasah (format .DAT, .CSV, .TXT) langsung ke rekapitulasi.
            </p>
          </div>

          <button
            onClick={handleLoadSample}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Muat Contoh File .DAT Mesin</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Box: File Selector */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Pilih File Log dari USB Flashdisk Mesin</span>
          </h3>

          <div className="border-2 border-dashed border-zinc-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-zinc-50/50">
            <UploadCloud className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-700">
              Drag & Drop file log mesin (.DAT / .CSV / .TXT) atau klik untuk memilih
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Mendukung format standar ZKTeco, Solution X100-C, FingerPlus, BioFinger, dll.
            </p>

            <input
              id="file-upload-input"
              type="file"
              accept=".dat,.csv,.txt"
              onChange={handleFileUpload}
              className="mt-4 block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
            />
          </div>

          {fileName && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
              <span className="font-semibold text-emerald-950 truncate max-w-[240px]">{fileName}</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                Siap Diproses
              </span>
            </div>
          )}

          {/* Sync Button */}
          {parseResult && parseResult.success && parseResult.records.length > 0 && (
            <button
              onClick={handleProcessImport}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Database className="w-4 h-4" />
              <span>Sinkronkan {parseResult.records.length} Baris Log ke Rekap Presensi</span>
            </button>
          )}

          {importStatus && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Right Box: Live Parsed Log Preview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Pratinjau Hasil Parsing Log Mesin</span>
            </h3>
            {parseResult && parseResult.success && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {parseResult.records.length} Log Ditemukan
              </span>
            )}
          </div>

          {!parseResult ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              Belum ada file log yang dimuat. Silakan upload file atau klik "Muat Contoh File .DAT".
            </div>
          ) : !parseResult.success ? (
            <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{parseResult.error}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                    <th className="p-2">ID Finger</th>
                    <th className="p-2">Nama Guru Terpetakan</th>
                    <th className="p-2">Tanggal</th>
                    <th className="p-2">Jam Scan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {parseResult.records.map((r, i) => {
                    const matchedTeacher = teachers.find(t => t.fingerprintId === r.enrollId);
                    return (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="p-2 font-mono font-bold text-emerald-800">#{r.enrollId}</td>
                        <td className="p-2">
                          {matchedTeacher ? (
                            <span className="font-bold text-zinc-900">{matchedTeacher.name}</span>
                          ) : (
                            <span className="text-zinc-400 italic">ID Belum Terdaftar</span>
                          )}
                        </td>
                        <td className="p-2 text-zinc-600">{r.date}</td>
                        <td className="p-2 font-mono font-bold text-zinc-800">{r.time}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
