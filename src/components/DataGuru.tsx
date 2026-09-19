import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Fingerprint, 
  Search, 
  FileSpreadsheet, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Sparkles,
  Shield,
  BookOpen,
  Filter,
  Save,
  Download,
  KeyRound,
  UserCheck,
  Printer,
  FileDown,
  Award,
  Calendar,
  Building,
  Check,
  Upload,
  FileUp,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  HelpCircle,
  X
} from 'lucide-react';
import { Teacher, EmploymentStatus, MadrasahProfile, UserRole } from '../types';
import { 
  exportTeachersListToExcel, 
  formatIndonesianDate,
  downloadGTKTemplateExcel,
  parseGTKExcelFile,
  ParseGTKResult
} from '../utils/attendanceUtils';
import { downloadTeacherBiodataPDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';

interface DataGuruProps {
  teachers: Teacher[];
  profile: MadrasahProfile;
  currentUser?: Teacher | null;
  serverSyncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onClearAllTeachers?: () => void;
  onBatchImportTeachers?: (teachers: Teacher[], mode: 'append' | 'replace') => void;
}

export const DataGuru: React.FC<DataGuruProps> = ({
  teachers,
  profile,
  currentUser,
  serverSyncStatus = 'synced',
  onManualSync,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onClearAllTeachers,
  onBatchImportTeachers,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [biodataModalTeacher, setBiodataModalTeacher] = useState<Teacher | null>(null);

  // Upload GTK States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedGTKResult, setParsedGTKResult] = useState<ParseGTKResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');
  const [showWarnings, setShowWarnings] = useState<boolean>(false);

  // Identify logged in teacher
  const loggedInTeacher = React.useMemo(() => {
    if (!currentUser) return null;
    return teachers.find(
      (t) =>
        t.id === currentUser.id ||
        (currentUser.nik && t.nik === currentUser.nik) ||
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    ) || currentUser;
  }, [currentUser, teachers]);

  const isGuru = currentUser?.role === 'GURU';
  const isKepalaMadrasah = currentUser?.role === 'KEPALA_MADRASAH';
  const isSuperAdmin = 
    currentUser?.email === 'jaenalmaskun@gmail.com' || 
    currentUser?.id === 'super-admin-jaenal' || 
    currentUser?.nik === '3302010000009999';

  // Form states
  const [name, setName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [nik, setNik] = useState<string>('');
  const [pin, setPin] = useState<string>('123456');
  const [role, setRole] = useState<UserRole>('GURU');
  const [nip, setNip] = useState<string>('');
  const [nuptk, setNuptk] = useState<string>('');
  const [npk, setNpk] = useState<string>('');
  const [pegId, setPegId] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('GTY');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [teachingHoursPerWeek, setTeachingHoursPerWeek] = useState<number>(24);
  const [fingerprintId, setFingerprintId] = useState<number>(teachers.length + 1);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsing(true);
    setParsedGTKResult(null);

    try {
      const result = await parseGTKExcelFile(file, teachers);
      setParsedGTKResult(result);
    } catch (err: any) {
      setParsedGTKResult({
        teachers: [],
        errors: [`Gagal memproses file: ${err?.message || 'Format tidak didukung'}`],
        warnings: [],
        totalRows: 0,
      });
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsing(true);
    setParsedGTKResult(null);

    try {
      const result = await parseGTKExcelFile(file, teachers);
      setParsedGTKResult(result);
    } catch (err: any) {
      setParsedGTKResult({
        teachers: [],
        errors: [`Gagal memproses file: ${err?.message || 'Format tidak didukung'}`],
        warnings: [],
        totalRows: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!parsedGTKResult || parsedGTKResult.teachers.length === 0) return;

    if (onBatchImportTeachers) {
      onBatchImportTeachers(parsedGTKResult.teachers, importMode);
    } else {
      // Aman: Timpa tidak menghapus data yang sudah ada
      parsedGTKResult.teachers.forEach((t) => onAddTeacher(t));
    }

    setUploadSuccessMessage(
      `Sukses memproses ${parsedGTKResult.teachers.length} data Guru & GTK! Data lama tetap terjaga aman.`
    );
    setIsUploadModalOpen(false);
    setParsedGTKResult(null);
    setUploadedFileName('');

    setTimeout(() => {
      setUploadSuccessMessage('');
    }, 4500);
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    const maxFingerId = teachers.reduce((max, t) => Math.max(max, t.fingerprintId), 0);
    setFingerprintId(maxFingerId + 1);
    setName('');
    setTitle('S.Pd.');
    setNik(`330201${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setPin('123456');
    setRole('GURU');
    setNip('');
    setNuptk('');
    setNpk('');
    setPegId('');
    setPosition('Guru Kelas');
    setEmploymentStatus('GTY');
    setGender('L');
    setPhone('0812');
    setEmail('');
    setTeachingHoursPerWeek(24);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFingerprintId(t.fingerprintId);
    setName(t.name);
    setTitle(t.title);
    setNik(t.nik || `330201${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setPin(t.pin || '123456');
    setRole(t.role || 'GURU');
    setNip(t.nip || '');
    setNuptk(t.nuptk || '');
    setNpk(t.npk || '');
    setPegId(t.pegId || '');
    setPosition(t.position);
    setEmploymentStatus(t.employmentStatus);
    setGender(t.gender);
    setPhone(t.phone);
    setEmail(t.email || '');
    setTeachingHoursPerWeek(t.teachingHoursPerWeek);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-teal-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        fingerprintId: Number(fingerprintId),
        nik: nik.trim() || editingTeacher.nik,
        pin: pin.trim() || editingTeacher.pin || '123456',
        role: role || editingTeacher.role || 'GURU',
        name: name.trim(),
        title: title.trim(),
        nip: nip.trim() || undefined,
        nuptk: nuptk.trim() || undefined,
        npk: npk.trim() || undefined,
        pegId: pegId.trim() || undefined,
        position: position.trim(),
        employmentStatus,
        gender,
        phone: phone.trim(),
        email: email.trim() || undefined,
        teachingHoursPerWeek: Number(teachingHoursPerWeek),
        isBiometricEnrolled: true,
      };
      onUpdateTeacher(updated);
    } else {
      const newGtk: Teacher = {
        id: `gtk-${Date.now()}`,
        fingerprintId: Number(fingerprintId),
        nik: nik.trim() || `330201${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        pin: pin.trim() || '123456',
        role: role || 'GURU',
        name: name.trim(),
        title: title.trim(),
        nip: nip.trim() || undefined,
        nuptk: nuptk.trim() || undefined,
        npk: npk.trim() || undefined,
        pegId: pegId.trim() || undefined,
        position: position.trim(),
        employmentStatus,
        gender,
        phone: phone.trim(),
        email: email.trim() || undefined,
        teachingHoursPerWeek: Number(teachingHoursPerWeek),
        isBiometricEnrolled: true,
        avatarColor: randomColor,
        isActive: true,
      };
      onAddTeacher(newGtk);
    }

    setIsModalOpen(false);
  };

  // Restrict accessible teachers: If GURU, ONLY show their own account. Admin/TU/Kepala see all.
  const accessibleTeachers = React.useMemo(() => {
    if (isGuru) {
      if (loggedInTeacher) return [loggedInTeacher];
      if (currentUser) return [currentUser];
      return [];
    }
    return teachers;
  }, [isGuru, loggedInTeacher, currentUser, teachers]);

  const filteredTeachers = accessibleTeachers.filter(t => {
    if (filterStatus !== 'ALL' && t.employmentStatus !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.position.toLowerCase().includes(q) ||
      (t.pegId && t.pegId.toLowerCase().includes(q)) ||
      (t.nip && t.nip.includes(q)) ||
      (t.nik && t.nik.includes(q)) ||
      (t.nuptk && t.nuptk.includes(q)) ||
      (t.npk && t.npk.includes(q)) ||
      t.fingerprintId.toString() === q
    );
  });

  const todayStr = formatIndonesianDate(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Personalized Teacher Profile Header for Logged-In Teacher */}
      {loggedInTeacher && (
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/50">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md border-2 border-emerald-300/40 shrink-0 ${loggedInTeacher.avatarColor || 'bg-emerald-600'}`}>
                {loggedInTeacher.fingerprintId ? `#${loggedInTeacher.fingerprintId}` : loggedInTeacher.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    <span>Profil GTK Akun Anda ({currentUser?.role || loggedInTeacher.role || 'GURU'})</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-semibold">
                    {loggedInTeacher.employmentStatus}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
                  {loggedInTeacher.name}{loggedInTeacher.title ? `, ${loggedInTeacher.title}` : ''}
                </h1>
                <p className="text-xs text-emerald-100/90 font-medium">
                  {loggedInTeacher.position} • {profile.name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setBiodataModalTeacher(loggedInTeacher)}
                className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Cetak Biodata & Surat GTK</span>
              </button>
              <button
                type="button"
                onClick={() => openEditModal(loggedInTeacher)}
                className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-500/50 shadow-sm transition-all"
              >
                <Edit className="w-4 h-4" />
                <span>Perbarui Data Saya</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics of Logged-In Teacher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">NIK (Login)</span>
              <span className="font-mono font-bold truncate block">{loggedInTeacher.nik || '-'}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">NIP / NUPTK</span>
              <span className="font-mono font-bold truncate block">{loggedInTeacher.nip || loggedInTeacher.nuptk || '-'}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">NPK / PegID</span>
              <span className="font-mono font-bold truncate block">{loggedInTeacher.npk || loggedInTeacher.pegId || '-'}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">Beban Mengajar (JTM)</span>
              <span className="font-bold block">{loggedInTeacher.teachingHoursPerWeek || 24} Jam/Mgg</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">WhatsApp</span>
              <span className="font-medium truncate block">{loggedInTeacher.phone || '-'}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200 block">ID Fingerprint Mesin</span>
              <span className="font-bold text-amber-300 block">#{loggedInTeacher.fingerprintId} (Aktif)</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccessMessage && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setUploadSuccessMessage('')}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <span>{isGuru ? 'Profil & Biodata GTK Saya' : 'Manajemen Data Guru & GTK'}</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isGuru
                ? 'Informasi data pribadi pendidik, NIP/NUPTK/PegID Simpatika, beban jam mengajar (JTM), dan cetak biodata resmi.'
                : 'Kelola data pendidik, nomor NIP/NUPTK/NPK Simpatika, beban jam mengajar (JTM), dan penandatangan berkas otomatis.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isGuru && (
              <>
                <button
                  type="button"
                  onClick={() => downloadGTKTemplateExcel(profile)}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Unduh format template Excel resmi untuk pengisian data GTK masal"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Unduh Template GTK</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParsedGTKResult(null);
                    setUploadedFileName('');
                    setIsUploadModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Unggah file Excel data guru / GTK untuk diimpor secara otomatis"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Data GTK</span>
                </button>
              </>
            )}

            {accessibleTeachers.length > 0 && (
              <button
                onClick={() => exportTeachersListToExcel(profile, accessibleTeachers)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                title={isGuru ? "Ekspor data biodata pribadi ke file Excel" : "Ekspor seluruh daftar data guru ke file Excel"}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isGuru ? 'Ekspor Biodata (.xlsx)' : 'Ekspor GTK (.xlsx)'}</span>
              </button>
            )}

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  serverSyncStatus === 'synced'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : serverSyncStatus === 'syncing'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
                title="Status sinkronisasi data antar perangkat. Klik untuk memperbarui data GTK dari server."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${serverSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{serverSyncStatus === 'synced' ? 'Cloud Terhubung' : serverSyncStatus === 'syncing' ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
              </button>
            )}

            {!isGuru && (
              <button
                onClick={openAddModal}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Guru Baru</span>
              </button>
            )}

            {!isGuru && teachers.length > 0 && onClearAllTeachers && (
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA DATA GURU / GTK? Semua data daftar guru akan dikosongkan.')) {
                    onClearAllTeachers();
                  }
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Hapus / Kosongkan semua data guru"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-700">Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50"
            >
              <option value="ALL">{isGuru ? `Profil Pribadi (${accessibleTeachers.length} GTK)` : `Semua (${teachers.length} GTK)`}</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="GTY">GTY (Guru Tetap Yayasan)</option>
              <option value="GTT">GTT</option>
              <option value="HONORER">Honorer</option>
              <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan / TU</option>
            </select>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, Peg ID, NIP, NIK, NPK, Mapel..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* GTK Cards Grid / Filtered by Role */}
      {isGuru && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold">Akses Akun GTK:</span> Anda masuk sebagai <strong className="underline">{loggedInTeacher?.name || currentUser?.name}</strong>. Sesuai hak akses guru, halaman ini hanya menampilkan data profil dan kepegawaian Anda sendiri.
            </div>
          </div>
        </div>
      )}

      {/* GTK Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const isCurrentUserCard = loggedInTeacher?.id === teacher.id;
          return (
            <div
              key={teacher.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border transition-all flex flex-col justify-between space-y-3 ${
                isCurrentUserCard 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                  : 'border-zinc-200 hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 ${teacher.avatarColor || 'bg-emerald-700'}`}>
                      #{teacher.fingerprintId}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-zinc-900 leading-tight truncate">
                          {teacher.name}{teacher.title ? `, ${teacher.title}` : ''}
                        </h3>
                        {isCurrentUserCard && (
                          <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded text-[9px] font-bold shrink-0">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 font-medium truncate">
                        {teacher.position}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.2 rounded bg-zinc-100 text-zinc-700">
                        {teacher.employmentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBiodataModalTeacher(teacher)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                      title="Cetak Biodata & Surat Keterangan GTK"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {(!isGuru || isCurrentUserCard) && (
                      <button
                        type="button"
                        onClick={() => openEditModal(teacher)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                        title="Edit Data GTK"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {!isGuru && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus data ${teacher.name}?`)) {
                            onDeleteTeacher(teacher.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-700 hover:bg-rose-50 transition-all"
                        title="Hapus GTK"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detail fields */}
                <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Peg ID Simpatika:</span>
                    <span className="font-mono font-bold text-emerald-800">{teacher.pegId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">NIP:</span>
                    <span className="font-mono font-medium text-zinc-800">{teacher.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">NIK (Login):</span>
                    <span className="font-mono font-medium text-zinc-800">{teacher.nik || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">NPK / NUPTK:</span>
                    <span className="font-mono font-medium text-zinc-800">{teacher.npk || teacher.nuptk || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Beban Ajar (JTM):</span>
                    <span className="font-bold text-zinc-800">{teacher.teachingHoursPerWeek} Jam / Minggu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">WhatsApp:</span>
                    <span className="font-medium text-zinc-800">{teacher.phone}</span>
                  </div>
                </div>
              </div>

              {/* Fingerprint registration badge and print button */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <Fingerprint className="w-4 h-4" />
                  <span>ID Mesin: #{teacher.fingerprintId} (Aktif)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBiodataModalTeacher(teacher)}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Biodata & TTD</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTeachers.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-zinc-300 shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 mb-1">
            {searchQuery || filterStatus !== 'ALL' ? 'Data GTK Tidak Ditemukan' : 'Daftar Guru & GTK Masih Kosong'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
            {searchQuery || filterStatus !== 'ALL'
              ? 'Tidak ada data pendidik yang cocok dengan kriteria pencarian Anda. Silakan ubah filter atau kata kunci pencarian.'
              : 'Silakan mulai menambahkan data guru dan tenaga kependidikan (GTK) baru untuk madrasah Anda.'}
          </p>
          {!isGuru && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Data Guru Baru</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Official Biodata & Surat Keterangan GTK Modal (With Auto Signatures) */}
      {biodataModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-zinc-200 my-8 space-y-4">
            
            {/* Modal Top Actions */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    Biodata Resmi & Surat Keterangan GTK
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Penandatangan otomatis: {biodataModalTeacher.name} & {profile.headmasterName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadTeacherBiodataPDF(profile, biodataModalTeacher)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executePrint({
                      elementId: 'biodata-gtk-paper',
                      title: `Biodata_GTK_${biodataModalTeacher.name}`,
                      landscape: false,
                      onPdfFallback: () => downloadTeacherBiodataPDF(profile, biodataModalTeacher)
                    });
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBiodataModalTeacher(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Biodata Document Paper */}
            <div id="biodata-gtk-paper" className="p-6 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xs font-sans space-y-4 shadow-xs">
              
              {/* Kop Surat */}
              <div className="text-center pb-3 border-b-2 border-zinc-900 space-y-0.5">
                <p className="font-bold text-[10px] uppercase text-zinc-600 tracking-wider">
                  {profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
                </p>
                <p className="font-bold text-[10px] uppercase text-zinc-600 tracking-wider">
                  {profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
                </p>
                <h1 className="font-extrabold text-base uppercase text-zinc-950 tracking-tight">
                  {profile.name}
                </h1>
                <p className="text-[10px] text-zinc-600">
                  {profile.address}, {profile.village}, {profile.district}, {profile.city} • Telp: {profile.phone}
                </p>
                <p className="text-[9px] text-zinc-500 font-mono">
                  NSM: {profile.nsm} | NPSN: {profile.npsn} | Email: {profile.email}
                </p>
              </div>

              {/* Title */}
              <div className="text-center pt-1">
                <h2 className="font-bold text-sm uppercase underline tracking-wide text-zinc-950">
                  BIODATA & SURAT KETERANGAN GURU / TENAGA KEPENDIDIKAN
                </h2>
                <p className="text-[10px] text-zinc-600">
                  Tahun Pelajaran {profile.academicYear || '2025/2026'}
                </p>
              </div>

              {/* Details Table */}
              <table className="w-full border-collapse border border-zinc-400 text-xs">
                <tbody>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300 w-44">Nama Lengkap GTK</td>
                    <td className="p-2 font-extrabold text-zinc-950">
                      {biodataModalTeacher.name}{biodataModalTeacher.title ? `, ${biodataModalTeacher.title}` : ''}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Nomor Induk Kependudukan (NIK)</td>
                    <td className="p-2 font-mono font-bold">{biodataModalTeacher.nik || '-'}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Nomor Induk Pegawai (NIP)</td>
                    <td className="p-2 font-mono">{biodataModalTeacher.nip || '-'}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">NUPTK</td>
                    <td className="p-2 font-mono">{biodataModalTeacher.nuptk || '-'}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">NPK Kemenag / PegID Simpatika</td>
                    <td className="p-2 font-mono font-bold text-emerald-900">{biodataModalTeacher.npk || biodataModalTeacher.pegId || '-'}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Jabatan & Tugas Utama</td>
                    <td className="p-2 font-medium">{biodataModalTeacher.position}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Status Kepegawaian</td>
                    <td className="p-2 font-bold text-emerald-800">{biodataModalTeacher.employmentStatus}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Beban Jam Mengajar (JTM)</td>
                    <td className="p-2 font-bold">{biodataModalTeacher.teachingHoursPerWeek} Jam / Minggu</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Jenis Kelamin</td>
                    <td className="p-2">{biodataModalTeacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">No. WhatsApp / HP</td>
                    <td className="p-2 font-medium">{biodataModalTeacher.phone}</td>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">Alamat Email</td>
                    <td className="p-2 font-mono">{biodataModalTeacher.email || '-'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-zinc-50 border-r border-zinc-300">ID Biometrik Fingerprint</td>
                    <td className="p-2 font-mono font-bold text-emerald-800">#{biodataModalTeacher.fingerprintId} (Terdaftar & Aktif)</td>
                  </tr>
                </tbody>
              </table>

              {/* Automatic Signature Section */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-xs">
                <div className="text-left space-y-1">
                  <p>Mengetahui,</p>
                  <p className="font-bold">{profile.headmasterSignatureTitle || 'Kepala Madrasah'}</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-zinc-950">{profile.headmasterName}</p>
                  <p>NIP. {profile.headmasterNip || profile.headmasterNuptk || '-'}</p>
                </div>

                <div className="text-right space-y-1">
                  <p>{profile.village || profile.city}, {todayStr}</p>
                  <p className="font-bold">Guru Yang Bersangkutan,</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-zinc-950">
                    {biodataModalTeacher.name}{biodataModalTeacher.title ? `, ${biodataModalTeacher.title}` : ''}
                  </p>
                  <p>NIP/NUPTK/NIK. {biodataModalTeacher.nip || biodataModalTeacher.nuptk || biodataModalTeacher.nik || '-'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add / Edit GTK Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <span>{editingTeacher ? 'Edit Data Guru / GTK' : 'Tambah Guru / GTK Baru'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-zinc-700 mb-1">Nama Lengkap:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Contoh: Ahmad Dahlan"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Gelar:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="S.Pd.I / M.Pd"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">NIK (16 Digit - Login):</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    required
                    placeholder="330201..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 font-mono text-xs font-bold text-emerald-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">PIN Login (6-Digit):</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    placeholder="123456"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 font-mono text-xs font-bold text-emerald-900 bg-white tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Peran Hak Akses:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={isGuru}
                    className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-900 bg-white"
                  >
                    <option value="GURU">GURU</option>
                    <option value="KEPALA_MADRASAH">KEPALA MADRASAH</option>
                    <option value="OPERATOR_TU">OPERATOR TU</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">ID Sidik Jari Mesin:</label>
                  <input
                    type="number"
                    value={fingerprintId}
                    onChange={(e) => setFingerprintId(Number(e.target.value))}
                    required
                    disabled={isGuru}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold text-emerald-800 disabled:bg-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Status Kepegawaian:</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                    disabled={isGuru}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold disabled:bg-zinc-100"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="GTY">GTY (Guru Tetap Yayasan)</option>
                    <option value="GTT">GTT (Guru Tidak Tetap)</option>
                    <option value="HONORER">Honorer</option>
                    <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan / TU</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-zinc-700">Jabatan / Mata Pelajaran:</label>
                    <span className="text-[10px] text-emerald-700 font-bold">Pilihan / Ketik Manual</span>
                  </div>
                  
                  {/* Select Preset Dropdown */}
                  <div className="space-y-1.5">
                    <select
                      value={['Guru Kelas', 'Guru Mata Pelajaran', 'Tata Usaha', 'Kepala Madrasah', 'Waspendais'].includes(position) ? position : (position ? 'CUSTOM' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== 'CUSTOM' && val !== '') {
                          setPosition(val);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 font-semibold text-xs bg-zinc-50"
                    >
                      <option value="">-- Pilih Kategori Jabatan / Tugas --</option>
                      <option value="Guru Kelas">Guru Kelas</option>
                      <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                      <option value="Tata Usaha">Tata Usaha</option>
                      <option value="Kepala Madrasah">Kepala Madrasah</option>
                      <option value="Waspendais">Waspendais</option>
                      <option value="CUSTOM">Lainnya / Spesifik (Ketik Mandiri)</option>
                    </select>

                    {/* Text Input with DataList for Custom / Specific Subject */}
                    <input
                      type="text"
                      list="jabatan-preset-list"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      required
                      placeholder="Contoh: Guru Kelas, Guru Mata Pelajaran, Tata Usaha, Kepala Madrasah, Waspendais..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold text-xs bg-white"
                    />
                    <datalist id="jabatan-preset-list">
                      <option value="Guru Kelas" />
                      <option value="Guru Mata Pelajaran" />
                      <option value="Tata Usaha" />
                      <option value="Kepala Madrasah" />
                      <option value="Waspendais" />
                      <option value="Guru Kelas I" />
                      <option value="Guru Kelas II" />
                      <option value="Guru Kelas III" />
                      <option value="Guru Kelas IV" />
                      <option value="Guru Kelas V" />
                      <option value="Guru Kelas VI" />
                      <option value="Guru Mata Pelajaran PAI" />
                      <option value="Guru Mata Pelajaran Fiqih" />
                      <option value="Guru Mata Pelajaran Akidah Akhlak" />
                      <option value="Guru Mata Pelajaran Al-Qur'an Hadis" />
                      <option value="Guru Mata Pelajaran SKI" />
                      <option value="Guru Mata Pelajaran Bahasa Arab" />
                      <option value="Guru Mata Pelajaran PJOK" />
                      <option value="Guru Mata Pelajaran Bahasa Indonesia" />
                      <option value="Guru Mata Pelajaran Matematika" />
                      <option value="Guru Mata Pelajaran IPA" />
                      <option value="Guru Mata Pelajaran IPS" />
                      <option value="Kepala Tata Usaha" />
                      <option value="Staf Tata Usaha" />
                      <option value="Waspendais Kemenag" />
                    </datalist>

                    {/* Quick Selection Badges */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-zinc-500 font-medium">Pilih Cepat:</span>
                      {['Guru Kelas', 'Guru Mata Pelajaran', 'Tata Usaha', 'Kepala Madrasah', 'Waspendais'].map((job) => (
                        <button
                          key={job}
                          type="button"
                          onClick={() => setPosition(job)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            position === job
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-zinc-100 hover:bg-emerald-100 text-zinc-700 hover:text-emerald-800 border border-zinc-200'
                          }`}
                        >
                          {job}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Beban Mengajar (JTM):</label>
                  <input
                    type="number"
                    value={teachingHoursPerWeek}
                    onChange={(e) => setTeachingHoursPerWeek(Number(e.target.value))}
                    placeholder="24"
                    disabled={isGuru}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold disabled:bg-zinc-100 text-xs"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Standar JTM guru sertifikasi Kemenag adalah 24 jam tatap muka per minggu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NIP (PNS/PPPK):</label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="1980xxxx..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Peg ID (Simpatika Kemenag):</label>
                  <input
                    type="text"
                    value={pegId}
                    onChange={(e) => setPegId(e.target.value)}
                    placeholder="20123456789..."
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/40 text-emerald-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NPK Kemenag:</label>
                  <input
                    type="text"
                    value={npk}
                    onChange={(e) => setNpk(e.target.value)}
                    placeholder="987654..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NUPTK:</label>
                  <input
                    type="text"
                    value={nuptk}
                    onChange={(e) => setNuptk(e.target.value)}
                    placeholder="7435xxxx..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Jenis Kelamin:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">No. HP / WhatsApp:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812345678..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@madrasah.sch.id"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data GTK</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNGGAH & IMPOR DATA GTK EXCEL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-fade-in my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Unggah & Impor Data Guru / GTK Masal</h3>
                  <p className="text-xs text-zinc-400">Impor data pendidik dari file Excel (.xlsx, .xls, .csv) secara instan</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setParsedGTKResult(null);
                  setUploadedFileName('');
                }}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Template Download Banner */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-950">Gunakan Template Resmi Format Madrasah</h4>
                    <p className="text-[11px] text-emerald-800">
                      Format kolom telah disesuaikan dengan standar EMIS / Simpatika Kemenag (ID Fingerprint, Nama, NIK, NIP, NPK, PegID, Status, JTM).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadGTKTemplateExcel(profile)}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template (.xlsx)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {!parsedGTKResult && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFile}
                  className="border-2 border-dashed border-zinc-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-zinc-50/50 hover:bg-emerald-50/30 transition-all group flex flex-col items-center justify-center space-y-3 cursor-pointer relative"
                >
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-zinc-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isParsing ? (
                      <RefreshCw className="w-7 h-7 text-emerald-700 animate-spin" />
                    ) : (
                      <FileUp className="w-7 h-7 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">
                      {isParsing ? 'Menganalisis & Membaca Data Excel...' : 'Klik atau Tarik File Excel ke Sini'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-zinc-200 group-hover:bg-emerald-600 group-hover:text-white rounded-lg text-[11px] font-bold text-zinc-700 transition-all">
                    Pilih Berkas dari Komputer
                  </span>
                </div>
              )}

              {/* Parsed Result & Preview */}
              {parsedGTKResult && (
                <div className="space-y-4">
                  {/* File status bar */}
                  <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-zinc-800">{uploadedFileName}</span>
                      <span className="text-zinc-500">({parsedGTKResult.totalRows} baris terdeteksi)</span>
                    </div>
                    <label className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer hover:underline text-xs">
                      Ganti File
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Errors if any */}
                  {parsedGTKResult.errors.length > 0 && (
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-700" />
                        <span>Ditemukan Masalah Saat Membaca Berkas:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                        {parsedGTKResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings if any */}
                  {parsedGTKResult.warnings.length > 0 && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          <span>Pemberitahuan Otomatisasi ({parsedGTKResult.warnings.length} Catatan)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowWarnings(!showWarnings)}
                          className="text-[11px] text-amber-800 underline font-semibold"
                        >
                          {showWarnings ? 'Sembunyikan Detail' : 'Lihat Detail'}
                        </button>
                      </div>
                      {showWarnings && (
                        <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-800 max-h-32 overflow-y-auto">
                          {parsedGTKResult.warnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Valid Data Preview */}
                  {parsedGTKResult.teachers.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-zinc-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-700" />
                          <span>Pratinjau Data GTK Siap Diimpor ({parsedGTKResult.teachers.length} Guru/Tenaga Kependidikan)</span>
                        </h4>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
                        <div className="max-h-60 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-zinc-100 text-zinc-700 font-bold sticky top-0 border-b border-zinc-200">
                              <tr>
                                <th className="p-2.5 w-10 text-center">No</th>
                                <th className="p-2.5 w-16 text-center">ID Mesin</th>
                                <th className="p-2.5">Nama & Gelar</th>
                                <th className="p-2.5">NIK (Login)</th>
                                <th className="p-2.5">Peran</th>
                                <th className="p-2.5">NIP / NPK / PegID</th>
                                <th className="p-2.5">Jabatan / Mapel</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5 text-center">JTM</th>
                                <th className="p-2.5">No. HP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                              {parsedGTKResult.teachers.map((t, idx) => (
                                <tr key={t.id || idx} className="hover:bg-zinc-50">
                                  <td className="p-2 text-center text-zinc-500 font-mono">{idx + 1}</td>
                                  <td className="p-2 text-center">
                                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-100 text-emerald-800">
                                      #{t.fingerprintId}
                                    </span>
                                  </td>
                                  <td className="p-2 font-bold text-zinc-900">
                                    {t.name}{t.title ? `, ${t.title}` : ''}
                                  </td>
                                  <td className="p-2 font-mono text-zinc-600">{t.nik || '-'}</td>
                                  <td className="p-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      t.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                      t.role === 'KEPALA_MADRASAH' ? 'bg-amber-100 text-amber-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {t.role}
                                    </span>
                                  </td>
                                  <td className="p-2 font-mono text-[11px] text-zinc-600">
                                    {t.nip || t.npk || t.pegId || t.nuptk || '-'}
                                  </td>
                                  <td className="p-2 text-zinc-700">{t.position}</td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold text-[10px]">
                                      {t.employmentStatus}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center font-bold text-zinc-800">{t.teachingHoursPerWeek || 24}</td>
                                  <td className="p-2 text-zinc-600">{t.phone || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Import Mode Options */}
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                        <div className="font-bold text-xs text-zinc-800">Pilih Metode Impor:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <label
                            className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                              importMode === 'append'
                                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="append"
                              checked={importMode === 'append'}
                              onChange={() => setImportMode('append')}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="font-bold text-zinc-900">Gabungkan & Perbarui (Rekomendasi)</div>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Menambahkan GTK baru dan memperbarui data guru yang sudah ada berdasarkan NIK/ID Fingerprint.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                              importMode === 'replace'
                                ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="replace"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="mt-0.5 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-amber-950">Timpa & Perbarui (Aman: Data Lama Tidak Hilang)</div>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Menimpa nilai atribut guru yang cocok dan menyisipkan data baru, tanpa menghapus guru maupun riwayat presensi yang sudah ada.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setParsedGTKResult(null);
                  setUploadedFileName('');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-all"
              >
                Batal
              </button>

              {parsedGTKResult && parsedGTKResult.teachers.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Konfirmasi & Impor {parsedGTKResult.teachers.length} Data GTK
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

