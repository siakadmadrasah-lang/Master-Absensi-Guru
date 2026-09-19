import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  RefreshCw,
  Zap,
  Globe
} from 'lucide-react';
import { MadrasahProfile, WorkSchedule, Teacher, AttendanceRecord, LeaveRequest, HolidayItem } from '../types';
import { 
  generateMySQLDump, 
  generatePHPBackend, 
  generateHtaccess, 
  generateReadme, 
  generatePleskHtmlGuide 
} from '../utils/pleskPackageGenerator';
import {
  generateMySQLDumpForCpanel,
  generatePHPBackendForCpanel,
  generateDbConfigFileForCpanel,
  generateHtaccessForCpanel,
  generateReadmeCpanel,
  generateCpanelHtmlGuide,
  CPANEL_DEFAULT_DB,
} from '../utils/cpanelPackageGenerator';

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
  const [platform, setPlatform] = useState<'CPANEL' | 'PLESK'>('CPANEL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SQL' | 'PHP' | 'HTACCESS' | 'GUIDE'>('OVERVIEW');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // MySQL Sync & Connection State
  const [mysqlStatus, setMysqlStatus] = useState<{
    connected: boolean;
    autoSyncEnabled: boolean;
    database: string;
    user: string;
    host: string;
    port: number;
    lastSyncTime: number | null;
    lastSyncStatus: string;
    lastError: string | null;
    syncedCount: number;
    localRecordCount: number;
    localTeacherCount: number;
  } | null>(null);

  const [cpanelLiveUrl, setCpanelLiveUrl] = useState('');
  const [isSyncingMysql, setIsSyncingMysql] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const fetchMysqlStatus = async () => {
    try {
      const res = await fetch('/api/mysql/status');
      if (res.ok) {
        const data = await res.json();
        setMysqlStatus(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchMysqlStatus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

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

  // Content for cPanel
  const cpanelSqlDump = generateMySQLDumpForCpanel({
    ...exportOptions,
    dbUser: CPANEL_DEFAULT_DB.user,
    dbName: CPANEL_DEFAULT_DB.name,
    dbPass: CPANEL_DEFAULT_DB.pass,
    dbHost: CPANEL_DEFAULT_DB.host,
  });
  const cpanelPhpBackend = generatePHPBackendForCpanel(CPANEL_DEFAULT_DB);
  const cpanelConfig = generateDbConfigFileForCpanel(CPANEL_DEFAULT_DB);
  const cpanelHtaccess = generateHtaccessForCpanel();
  const cpanelReadme = generateReadmeCpanel({
    ...exportOptions,
    dbUser: CPANEL_DEFAULT_DB.user,
    dbName: CPANEL_DEFAULT_DB.name,
    dbPass: CPANEL_DEFAULT_DB.pass,
    dbHost: CPANEL_DEFAULT_DB.host,
  });

  // Content for Plesk
  const pleskSqlDump = generateMySQLDump(exportOptions);
  const pleskPhpBackend = generatePHPBackend();
  const pleskHtaccess = generateHtaccess();
  const pleskReadme = generateReadme(exportOptions);

  const currentSql = platform === 'CPANEL' ? cpanelSqlDump : pleskSqlDump;
  const currentPhp = platform === 'CPANEL' ? `${cpanelConfig}\n\n// --- api.php ---\n\n${cpanelPhpBackend}` : pleskPhpBackend;
  const currentHtaccess = platform === 'CPANEL' ? cpanelHtaccess : pleskHtaccess;
  const currentReadme = platform === 'CPANEL' ? cpanelReadme : pleskReadme;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualSyncMysql = async () => {
    setIsSyncingMysql(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mysql/sync-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncFeedback({ success: true, message: `Sinkronisasi otomatis berhasil! ${data.syncedCount || ''} entri tersimpan di MySQL.` });
        await fetchMysqlStatus();
      } else {
        setSyncFeedback({ success: false, message: data.error || 'Sinkronisasi gagal, periksa server MySQL.' });
      }
    } catch (err: any) {
      setSyncFeedback({ success: false, message: 'Gagal terhubung ke endpoint sync: ' + err.message });
    } finally {
      setIsSyncingMysql(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handleTestCpanelApi = async () => {
    setIsTestingMysql(true);
    setTestFeedback(null);
    try {
      if (cpanelLiveUrl.trim()) {
        const res = await fetch('/api/mysql/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpanelUrl: cpanelLiveUrl.trim(),
            database: CPANEL_DEFAULT_DB.name,
            user: CPANEL_DEFAULT_DB.user,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTestFeedback({ success: true, message: data.message });
          await fetchMysqlStatus();
        } else {
          setTestFeedback({ success: false, message: data.error || 'Endpoint API cPanel live gagal dihubungi.' });
        }
      } else {
        const res = await fetch('/api.php?action=test_db', {
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (res.ok && (data.success || data.status === 'ok')) {
          setTestFeedback({
            success: true,
            message: data.message || `Endpoint API cPanel & Database MySQL (${data.database || CPANEL_DEFAULT_DB.name}) DITEMUKAN & BERHASIL!`,
          });
          await fetchMysqlStatus();
        } else {
          setTestFeedback({
            success: false,
            message: data.message || data.error || 'Endpoint API cPanel tidak ditemukan.',
          });
        }
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: 'Gagal memanggil API cPanel: ' + err.message });
    } finally {
      setIsTestingMysql(false);
      setTimeout(() => setTestFeedback(null), 8000);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingMysql(true);
    setTestFeedback(null);
    try {
      const res = await fetch('/api/mysql/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: CPANEL_DEFAULT_DB.host,
          user: CPANEL_DEFAULT_DB.user,
          password: CPANEL_DEFAULT_DB.pass,
          database: CPANEL_DEFAULT_DB.name,
          cpanelUrl: cpanelLiveUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestFeedback({ success: true, message: data.message });
        await fetchMysqlStatus();
      } else {
        setTestFeedback({ success: false, message: data.error || 'Koneksi ke MySQL gagal.' });
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: 'Gagal tes koneksi: ' + err.message });
    } finally {
      setIsTestingMysql(false);
      setTimeout(() => setTestFeedback(null), 8000);
    }
  };

  const handleDownloadZip = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    const isCpanel = platform === 'CPANEL';
    const endpoint = isCpanel ? '/api/download-cpanel-zip' : '/api/download-plesk-zip';
    const defaultFilename = isCpanel 
      ? 'SIMPRESENSI_cPanel_MySQL_masbagoes_absensi.zip' 
      : 'SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCpanel
            ? {
                dbUser: CPANEL_DEFAULT_DB.user,
                dbName: CPANEL_DEFAULT_DB.name,
                dbPass: CPANEL_DEFAULT_DB.pass,
                dbHost: CPANEL_DEFAULT_DB.host,
                sqlContent: cpanelSqlDump,
                phpContent: cpanelPhpBackend,
                configContent: cpanelConfig,
                htaccessContent: cpanelHtaccess,
                readmeContent: cpanelReadme,
              }
            : {
                userEmail: currentUser?.email || 'mas.jaenalmaskun@gmail.com',
                sqlContent: pleskSqlDump,
                phpContent: pleskPhpBackend,
                htaccessContent: pleskHtaccess,
                readmeContent: pleskReadme,
              }
        ),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
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
      console.warn("POST fetch download fallback:", err);
      try {
        const directUrl = `${endpoint}?t=${Date.now()}`;
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = defaultFilename;
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/25 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Paket Hosting cPanel & Database MySQL
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  AUTO-SYNC MYSQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ekspor ZIP siap deploy dan sinkronisasi otomatis database <strong className="text-emerald-300 font-mono">masbagoes_absensi</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Dialog"
            className="p-2 sm:p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Bar: cPanel (Primary) vs Plesk */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 font-medium">Target Platform:</span>
            <button
              onClick={() => setPlatform('CPANEL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                platform === 'CPANEL'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>cPanel Hosting (masbagoes_absensi)</span>
            </button>

            <button
              onClick={() => setPlatform('PLESK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                platform === 'PLESK'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Plesk Hosting (jaenal_absensi)</span>
            </button>
          </div>

          {/* Realtime Auto-Sync Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Auto-Sync MySQL Aktif</span>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="px-5 sm:px-6 bg-slate-950/80 border-b border-slate-800 flex space-x-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Kredensial & Auto-Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('SQL')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
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
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'PHP'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>api.php & config.php</span>
          </button>

          <button
            onClick={() => setActiveTab('HTACCESS')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
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
            className={`py-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'GUIDE'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Panduan Instalasi</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-slate-300 text-xs space-y-4">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              
              {/* MySQL Credentials Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Akun & Kredensial Database MySQL ({platform === 'CPANEL' ? 'cPanel' : 'Plesk'})</span>
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-medium">Terkonfigurasi Otomatis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Host</div>
                      <div className="text-emerald-300 font-bold">
                        {platform === 'CPANEL' ? CPANEL_DEFAULT_DB.host : 'localhost'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(platform === 'CPANEL' ? CPANEL_DEFAULT_DB.host : 'localhost', 'host')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'host' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database User</div>
                      <div className="text-emerald-300 font-bold">
                        {platform === 'CPANEL' ? CPANEL_DEFAULT_DB.user : 'jaenal_absensi'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(platform === 'CPANEL' ? CPANEL_DEFAULT_DB.user : 'jaenal_absensi', 'user')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'user' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Name</div>
                      <div className="text-emerald-300 font-bold">
                        {platform === 'CPANEL' ? CPANEL_DEFAULT_DB.name : 'jaenal_absensi'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(platform === 'CPANEL' ? CPANEL_DEFAULT_DB.name : 'jaenal_absensi', 'name')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'name' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Database Password</div>
                      <div className="text-emerald-300 font-bold">
                        {platform === 'CPANEL' ? CPANEL_DEFAULT_DB.pass : 'masbagus15'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(platform === 'CPANEL' ? CPANEL_DEFAULT_DB.pass : 'masbagus15', 'pass')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Salin"
                    >
                      {copiedField === 'pass' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Auto-Sync & Real-Time Storage Box */}
              <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">Penyimpanan & Sinkronisasi Otomatis ke MySQL:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestCpanelApi}
                      disabled={isTestingMysql}
                      className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-600/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Uji Endpoint REST API cPanel (/api.php)"
                    >
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isTestingMysql ? 'Menguji...' : 'Uji API cPanel'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingMysql}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Uji Koneksi Database MySQL"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isTestingMysql ? 'Menguji...' : 'Uji Database'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleManualSyncMysql}
                      disabled={isSyncingMysql}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMysql ? 'animate-spin' : ''}`} />
                      <span>{isSyncingMysql ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                    </button>
                  </div>
                </div>

                {/* cPanel Live URL Input (Optional) */}
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>URL Endpoint API cPanel (opsional untuk live domain cPanel Anda):</span>
                    </label>
                    <a
                      href="/api.php"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-sky-400 hover:text-sky-300 underline font-mono flex items-center gap-1 shrink-0"
                    >
                      <span>Lihat Status /api.php</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={cpanelLiveUrl}
                      onChange={(e) => setCpanelLiveUrl(e.target.value)}
                      placeholder="https://absensi.domain-madrasah.sch.id/api.php (kosongkan untuk uji internal)"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    💡 <strong className="text-slate-300">Catatan:</strong> Bila dikosongkan, tombol <em>"Uji API cPanel"</em> akan menguji endpoint internal <code className="text-sky-300">/api.php</code>. Jika diisi domain cPanel Anda, sistem akan langsung memverifikasi live API pada hosting cPanel Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Status Server Database</div>
                    <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${mysqlStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <span>{mysqlStatus?.connected ? 'Terhubung (Online)' : 'Standby / Local Fallback'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Penyimpanan Tiap Presensi</div>
                    <div className="font-bold text-emerald-300 mt-0.5">
                      Otomatis & Permanen
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Data Lokal Tersedia</div>
                    <div className="font-bold text-white mt-0.5">
                      {teachers.length} GTK • {attendanceRecords.length} Riwayat Presensi
                    </div>
                  </div>
                </div>

                {/* Feedback Alerts */}
                {syncFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    syncFeedback.success ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
                  }`}>
                    {syncFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                {testFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testFeedback.success ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40' : 'bg-amber-950/80 text-amber-200 border border-amber-500/40'
                  }`}>
                    {testFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span>{testFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Package Details */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Struktur Berkas di dalam Paket ZIP ({platform === 'CPANEL' ? 'cPanel' : 'Plesk'}):</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">1. database.sql:</span>
                    <span>Skema tabel MySQL ({platform === 'CPANEL' ? 'masbagoes_absensi' : 'jaenal_absensi'}) lengkap dengan data GTK & riwayat presensi.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">2. api.php & config.php:</span>
                    <span>REST API PHP PDO dengan koneksi otomatis ke database MySQL ({platform === 'CPANEL' ? 'masbagoes_absensi' : 'jaenal_absensi'}).</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">3. .htaccess:</span>
                    <span>Aturan rewrite Apache cPanel / Plesk, SPA routing, kompresi GZIP, & cache headers.</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">4. index.html & assets/:</span>
                    <span>Seluruh bundle frontend React terkompilasi siap tayang di folder <code>public_html</code>.</span>
                  </div>
                  <div className="flex items-start space-x-2 md:col-span-2">
                    <span className="font-mono text-emerald-400 font-bold shrink-0">5. Panduan & README:</span>
                    <span>Dokumentasi HTML interaktif & petunjuk teks 4 langkah upload di File Manager & phpMyAdmin.</span>
                  </div>
                </div>
              </div>

              {/* Download Action Card */}
              <div className="p-5 bg-gradient-to-br from-emerald-950/90 to-slate-950 rounded-xl border border-emerald-500/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <h4 className="font-bold text-emerald-200 text-sm">
                    Unduh Berkas ZIP SIMPRESENSI Madrasah ({platform === 'CPANEL' ? 'cPanel' : 'Plesk'})
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    File: <span className="font-mono text-emerald-300 font-bold">
                      {platform === 'CPANEL' 
                        ? `SIMPRESENSI_cPanel_MySQL_${CPANEL_DEFAULT_DB.name}.zip` 
                        : 'SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip'}
                    </span>
                  </p>
                  {downloadSuccess && (
                    <div className="text-emerald-400 text-xs font-bold mt-2 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Paket ZIP berhasil dibuat dan proses unduhan dimulai!</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/40 transition shrink-0 cursor-pointer"
                >
                  <Download className={`w-5 h-5 ${isGenerating ? 'animate-bounce' : ''}`} />
                  <span>
                    {isGenerating 
                      ? 'Mengemas Berkas ZIP...' 
                      : platform === 'CPANEL' 
                        ? 'Download Paket ZIP cPanel' 
                        : 'Download Paket ZIP Plesk'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SQL' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">
                  Pratinjau skrip SQL untuk database <code>{platform === 'CPANEL' ? CPANEL_DEFAULT_DB.name : 'jaenal_absensi'}</code>:
                </span>
                <button
                  onClick={() => handleCopy(currentSql, 'sql')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'sql' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Semua SQL</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {currentSql}
              </pre>
            </div>
          )}

          {activeTab === 'PHP' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">
                  Pratinjau berkas PHP koneksi MySQL (<code>{platform === 'CPANEL' ? CPANEL_DEFAULT_DB.name : 'jaenal_absensi'}</code>):
                </span>
                <button
                  onClick={() => handleCopy(currentPhp, 'php')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'php' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Skrip PHP</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {currentPhp}
              </pre>
            </div>
          )}

          {activeTab === 'HTACCESS' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">
                  Pratinjau berkas <code>.htaccess</code> Apache ({platform === 'CPANEL' ? 'cPanel public_html' : 'Plesk httpdocs'}):
                </span>
                <button
                  onClick={() => handleCopy(currentHtaccess, 'htaccess')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'htaccess' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin .htaccess</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto max-h-96 leading-relaxed">
                {currentHtaccess}
              </pre>
            </div>
          )}

          {activeTab === 'GUIDE' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Panduan Langkah Instalasi ({platform === 'CPANEL' ? 'cPanel' : 'Plesk'}):</span>
                <button
                  onClick={() => handleCopy(currentReadme, 'guide')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedField === 'guide' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin Petunjuk</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                {currentReadme}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[11px]">
              {platform === 'CPANEL' 
                ? `MySQL cPanel: localhost | User: ${CPANEL_DEFAULT_DB.user} | DB: ${CPANEL_DEFAULT_DB.name}`
                : 'MySQL Plesk: localhost | User: jaenal_absensi | DB: jaenal_absensi'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl font-semibold transition cursor-pointer text-xs sm:text-sm shadow-sm"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
