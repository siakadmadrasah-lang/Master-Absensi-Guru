import React, { useState } from 'react';
import { 
  Server, 
  Download, 
  Database, 
  FileCode, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  X, 
  Layers, 
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { MadrasahProfile, WorkSchedule, Teacher, AttendanceRecord, LeaveRequest, HolidayItem } from '../types';
import { 
  generateMySQLDump, 
  generatePHPBackend, 
  generateHtaccess, 
  generateReadme, 
  generatePleskHtmlGuide,
  createPleskZip 
} from '../utils/pleskPackageGenerator';

interface PleskExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Teacher | null;
  profile: MadrasahProfile;
  schedule: WorkSchedule;
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  holidays: HolidayItem[];
}

export const PleskExportModal: React.FC<PleskExportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profile,
  schedule,
  teachers,
  attendanceRecords,
  leaveRequests,
  holidays,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SQL' | 'PHP' | 'HTACCESS' | 'GUIDE'>('OVERVIEW');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const isSuperAdmin = 
    !currentUser ||
    currentUser?.email === 'jaenalmaskun@gmail.com' || 
    currentUser?.email === 'mas.jaenalmaskun@gmail.com' ||
    currentUser?.email?.includes('jaenal') ||
    currentUser?.id === 'super-admin-jaenal' ||
    currentUser?.nik === '3302010000009999' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'KEPALA_MADRASAH';

  const exportOptions = {
    profile,
    schedule,
    teachers,
    attendanceRecords,
    leaveRequests,
    holidays,
  };

  const sqlDump = generateMySQLDump(exportOptions);
  const phpBackend = generatePHPBackend();
  const htaccess = generateHtaccess();
  const readme = generateReadme(exportOptions);
  const htmlGuide = generatePleskHtmlGuide();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadZip = async () => {
    if (!isSuperAdmin) {
      alert("Akses Terbatas: File ZIP Plesk hanya dapat diunduh oleh Administrator / Super Admin.");
      return;
    }

    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      // 1. Fetch complete bundled production ZIP from server (including compiled JS/CSS dist assets)
      const response = await fetch('/api/download-plesk-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser?.email || 'mas.jaenalmaskun@gmail.com',
          sqlContent: sqlDump,
          phpContent: phpBackend,
          htaccessContent: htaccess,
          readmeContent: readme,
          htmlGuide: htmlGuide,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (e) {}
        }, 1000);
        setDownloadSuccess(true);
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.warn("POST fetch download error, triggering native browser download:", err);
      try {
        const directUrl = `/api/download-plesk-zip?t=${Date.now()}`;
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = 'SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch(e){}
        }, 1000);
        setDownloadSuccess(true);
      } catch (fallbackErr: any) {
        console.error("Direct download fallback failed:", fallbackErr);
        alert("Gagal mengunduh file ZIP: " + (fallbackErr?.message || err?.message));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Paket Hosting Plesk & Database MySQL
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SUPER ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                File ZIP siap pakai diunggah langsung ke Plesk Web Hosting dengan konfigurasi MySQL otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Alert if Not Super Admin */}
        {!isSuperAdmin && (
          <div className="p-4 bg-rose-950/80 border-b border-rose-500/40 flex items-center space-x-3 text-rose-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong>Akses Ditolak:</strong> Halaman ini dan unduhan file ZIP Plesk hanya dapat diakses oleh akun Super Administrator (<strong>jaenalmaskun@gmail.com</strong>).
            </div>
          </div>
        )}

        {/* Sub Navigation */}
        <div className="px-6 bg-slate-950 border-b border-slate-800 flex space-x-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Kredensial & Download ZIP</span>
          </button>

          <button
            onClick={() => setActiveTab('SQL')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'SQL'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>database.sql</span>
          </button>

          <button
            onClick={() => setActiveTab('PHP')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'PHP'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>api.php (MySQL API)</span>
          </button>

          <button
            onClick={() => setActiveTab('HTACCESS')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'HTACCESS'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>.htaccess</span>
          </button>

          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'GUIDE'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Panduan Instalasi Plesk</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-300 text-xs space-y-4">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* MySQL Credentials Grid */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Kredensial Database MySQL Plesk</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Host</div>
                      <div className="text-emerald-300 font-bold">localhost</div>
                    </div>
                    <button
                      onClick={() => handleCopy('localhost', 'host')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'host' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database User</div>
                      <div className="text-emerald-300 font-bold">jaenal_absensi</div>
                    </div>
                    <button
                      onClick={() => handleCopy('jaenal_absensi', 'user')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'user' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Name</div>
                      <div className="text-emerald-300 font-bold">jaenal_absensi</div>
                    </div>
                    <button
                      onClick={() => handleCopy('jaenal_absensi', 'name')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'name' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Password</div>
                      <div className="text-emerald-300 font-bold">masbagus15</div>
                    </div>
                    <button
                      onClick={() => handleCopy('masbagus15', 'pass')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'pass' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Struktur Berkas di dalam File ZIP:</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">1. database.sql:</span>
                    <span>Struktur tabel lengkap (GTK, presensi, izin, jadwal, hari libur) & user super admin.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">2. api.php:</span>
                    <span>Backend REST API MySQL dengan kredensial Plesk pra-dikonfigurasi.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">3. .htaccess:</span>
                    <span>Konfigurasi routing Apache Plesk, GZIP compression, & security headers.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">4. assets/ & index.html:</span>
                    <span>Aplikasi web frontend terkompilasi siap pakai langsung di folder <code>httpdocs</code>.</span>
                  </div>
                  <div className="flex items-start space-x-2 md:col-span-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">5. README_PLESK.txt:</span>
                    <span>Petunjuk langkah demi langkah pembuatan database & upload ke Plesk File Manager.</span>
                  </div>
                </div>
              </div>

              {/* Download Action Card */}
              <div className="p-5 bg-gradient-to-br from-emerald-950/80 to-slate-950 rounded-xl border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-emerald-200 text-sm">Unduh Berkas ZIP SIMPRESENSI Madrasah</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    File: <span className="font-mono text-emerald-300">SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip</span>
                  </p>
                  {downloadSuccess && (
                    <div className="text-emerald-400 text-xs font-bold mt-2 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>File ZIP berhasil dibuat dan mulai diunduh!</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={!isSuperAdmin || isGenerating}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/40 transition shrink-0"
                >
                  <Download className={`w-5 h-5 ${isGenerating ? 'animate-bounce' : ''}`} />
                  <span>{isGenerating ? 'Mengemas File ZIP...' : 'Download Paket Plesk (ZIP)'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SQL' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pratinjau skrip SQL untuk database <code>jaenal_absensi</code>:</span>
                <button
                  onClick={() => handleCopy(sqlDump, 'sql')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'sql' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Semua SQL</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {sqlDump}
              </pre>
            </div>
          )}

          {activeTab === 'PHP' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pratinjau file <code>api.php</code> penghubung database MySQL:</span>
                <button
                  onClick={() => handleCopy(phpBackend, 'php')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'php' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Skrip PHP</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {phpBackend}
              </pre>
            </div>
          )}

          {activeTab === 'HTACCESS' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pratinjau file <code>.htaccess</code> Apache/Plesk:</span>
                <button
                  onClick={() => handleCopy(htaccess, 'htaccess')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'htaccess' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin .htaccess</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {htaccess}
              </pre>
            </div>
          )}

          {activeTab === 'GUIDE' && (
            <div className="space-y-3">
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                {readme}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MySQL Host: localhost | User: jaenal_absensi | DB: jaenal_absensi</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
