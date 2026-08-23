import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  Check, 
  X, 
  Download,
  Filter,
  Save
} from 'lucide-react';
import { Teacher, LeaveRequest, AttendanceRecord, MadrasahProfile } from '../types';
import { formatIndonesianDate, formatShortDate } from '../utils/attendanceUtils';

interface PengajuanIzinProps {
  teachers: Teacher[];
  leaveRequests: LeaveRequest[];
  profile: MadrasahProfile;
  currentUser?: Teacher | null;
  onAddLeaveRequest: (request: LeaveRequest) => void;
  onApproveLeaveRequest: (id: string) => void;
  onRejectLeaveRequest: (id: string) => void;
}

export const PengajuanIzin: React.FC<PengajuanIzinProps> = ({
  teachers,
  leaveRequests,
  profile,
  currentUser,
  onAddLeaveRequest,
  onApproveLeaveRequest,
  onRejectLeaveRequest,
}) => {
  const isGuru = currentUser?.role === 'GURU';
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [teacherId, setTeacherId] = useState<string>(isGuru && currentUser ? currentUser.id : (teachers[0]?.id || ''));
  const [type, setType] = useState<'IZIN' | 'SAKIT' | 'CUTI' | 'DINAS_LUAR'>('DINAS_LUAR');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [letterNumber, setLetterNumber] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTeacherId = isGuru && currentUser ? currentUser.id : teacherId;
    if (!effectiveTeacherId || !reason.trim()) return;

    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      teacherId: effectiveTeacherId,
      type,
      startDate,
      endDate,
      reason: reason.trim(),
      status: isGuru ? 'PENDING' : 'APPROVED', // Guru creates PENDING, Admin can directly approve
      approvedDate: isGuru ? undefined : new Date().toISOString().split('T')[0],
      approvedBy: isGuru ? undefined : (profile.headmasterName || 'Kepala Madrasah'),
      letterNumber: letterNumber.trim() || undefined,
    };

    onAddLeaveRequest(newRequest);
    setIsModalOpen(false);
    setReason('');
    setLetterNumber('');
  };

  const filteredRequests = leaveRequests.filter(r => {
    if (isGuru && currentUser && r.teacherId !== currentUser.id) return false;
    if (filterType === 'ALL') return true;
    return r.type === filterType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>Pengajuan Izin, Sakit, Cuti & Surat Tugas Dinas Luar</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pencatatan surat keterangan sakit, izin keperluan mendesak, dan surat tugas dinas pelatihan/MGMP Kemenag.
            </p>
          </div>

          <button
            onClick={() => {
              setTeacherId(teachers[0]?.id || '');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan / Surat Tugas</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-700">Filter Jenis:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-zinc-50 outline-none"
          >
            <option value="ALL">Semua Jenis Pengajuan</option>
            <option value="DINAS_LUAR">Dinas Luar (Surat Tugas / MGMP)</option>
            <option value="SAKIT">Sakit (Surat Dokter)</option>
            <option value="IZIN">Izin</option>
            <option value="CUTI">Cuti</option>
          </select>
        </div>
      </div>

      {/* Grid of Leave Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((req) => {
          const teacher = teachers.find(t => t.id === req.teacherId);
          return (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    req.type === 'DINAS_LUAR'
                      ? 'bg-teal-100 text-teal-800'
                      : req.type === 'SAKIT'
                      ? 'bg-purple-100 text-purple-800'
                      : req.type === 'CUTI'
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {req.type === 'DINAS_LUAR' ? 'TUGAS DINAS LUAR' : req.type}
                  </span>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {req.status === 'APPROVED' ? 'Disetujui' : req.status}
                  </span>
                </div>

                <div className="mt-2.5">
                  <h3 className="font-bold text-sm text-zinc-900">
                    {teacher ? `${teacher.name}, ${teacher.title}` : 'Guru'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {teacher?.position}
                  </p>
                </div>

                <div className="mt-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{formatShortDate(req.startDate)} {req.startDate !== req.endDate ? `s.d ${formatShortDate(req.endDate)}` : ''}</span>
                  </div>
                  {req.letterNumber && (
                    <div className="text-[11px] text-zinc-500 font-mono">
                      No. Surat: <strong>{req.letterNumber}</strong>
                    </div>
                  )}
                  <p className="text-zinc-600 text-xs mt-1 italic">
                    "{req.reason}"
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>{req.status === 'APPROVED' ? `Disetujui oleh: ${req.approvedBy || profile.headmasterName}` : req.status === 'PENDING' ? 'Menunggu Persetujuan' : 'Pengajuan Ditolak'}</span>
                {!isGuru && req.status === 'PENDING' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onApproveLeaveRequest(req.id)}
                      title="Setujui Pengajuan"
                      className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1 font-bold text-[10px]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() => onRejectLeaveRequest(req.id)}
                      title="Tolak Pengajuan"
                      className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 flex items-center gap-1 font-bold text-[10px]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Form Pengajuan Izin / Surat Tugas</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Guru / GTK:</label>
                {isGuru && currentUser ? (
                  <div className="w-full px-3 py-2 rounded-xl border border-emerald-300 font-bold bg-emerald-50 text-emerald-950 flex items-center justify-between">
                    <span>{currentUser.name}, {currentUser.title || ''} ({currentUser.position})</span>
                    <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-normal">Akun Anda</span>
                  </div>
                ) : (
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-zinc-50"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}, {t.title} ({t.position})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Jenis Pengajuan:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-zinc-50"
                >
                  <option value="DINAS_LUAR">Tugas Dinas Luar (Pelatihan / MGMP / Lomba Kemenag)</option>
                  <option value="SAKIT">Sakit (Surat Dokter / Puskesmas)</option>
                  <option value="IZIN">Izin Keperluan Mendesak</option>
                  <option value="CUTI">Cuti Resmi (Melahirkan / Tahunan)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Tanggal Selesai:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Nomor Surat Tugas / Surat Dokter:</label>
                <input
                  type="text"
                  value={letterNumber}
                  onChange={(e) => setLetterNumber(e.target.value)}
                  placeholder="Contoh: ST/092/MI-MA/VIII/2026 atau SKD/..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Alasan / Uraian Tugas:</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Jelaskan keperluan atau agenda kegiatan..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
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
                  <span>Simpan Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
