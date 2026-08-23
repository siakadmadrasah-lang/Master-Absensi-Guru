import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Clock, 
  Calendar, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Image as ImageIcon,
  FileSignature,
  Eye,
  X,
  FileText,
  ArrowRightLeft,
  FileSpreadsheet,
  Users,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Info,
  HelpCircle
} from 'lucide-react';
import { MadrasahProfile, WorkSchedule, HolidayItem, Teacher } from '../types';
import { downloadGTKTemplateExcel, exportTeachersListToExcel } from '../utils/attendanceUtils';

interface PengaturanMadrasahProps {
  profile: MadrasahProfile;
  schedule: WorkSchedule;
  holidays: HolidayItem[];
  teachers?: Teacher[];
  onUpdateProfile: (profile: MadrasahProfile) => void;
  onUpdateSchedule: (schedule: WorkSchedule) => void;
  onAddHoliday: (holiday: HolidayItem) => void;
  onDeleteHoliday: (id: string) => void;
  onExportAllData: () => void;
  onImportAllData: (jsonData: string) => void;
  onResetSampleData: () => void;
  onBatchImportTeachers?: (teachers: Teacher[], mode: 'append' | 'replace') => void;
}

export const PengaturanMadrasah: React.FC<PengaturanMadrasahProps> = ({
  profile,
  schedule,
  holidays,
  teachers = [],
  onUpdateProfile,
  onUpdateSchedule,
  onAddHoliday,
  onDeleteHoliday,
  onExportAllData,
  onImportAllData,
  onResetSampleData,
  onBatchImportTeachers,
}) => {
  const [formProfile, _setFormProfile] = useState<MadrasahProfile>(() => ({
    ...profile,
    signaturePosition: profile.signaturePosition || 'KEPALA_KIRI_GURU_KANAN',
    signaturePlace: profile.signaturePlace || profile.village || 'Sanggreman',
    signatureLeftTitle: profile.signatureLeftTitle || 'Mengetahui,\nKepala Madrasah',
    signatureRightTitle: profile.signatureRightTitle || 'Guru Yang Bersangkutan',
  }));
  const [formSchedule, _setFormSchedule] = useState<WorkSchedule>(() => schedule);
  const [isDirtyProfile, setIsDirtyProfile] = useState<boolean>(false);
  const [isDirtySchedule, setIsDirtySchedule] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'KOP_SURAT' | 'LOGO_APLIKASI' | 'TANDA_TANGAN' | 'JAM_KERJA' | 'LIBUR' | 'BRANDING' | 'BACKUP'>('KOP_SURAT');

  // Intercept state setters to mark dirty and prevent race conditions with background sync
  const setFormProfile: React.Dispatch<React.SetStateAction<MadrasahProfile>> = (action) => {
    setIsDirtyProfile(true);
    _setFormProfile(action);
  };

  const setFormSchedule: React.Dispatch<React.SetStateAction<WorkSchedule>> = (action) => {
    setIsDirtySchedule(true);
    _setFormSchedule(action);
  };

  // Synchronize local form state ONLY when user is NOT currently editing (not dirty)
  useEffect(() => {
    if (!isDirtyProfile) {
      _setFormProfile(prev => ({
        ...prev,
        ...profile,
        signaturePosition: profile.signaturePosition || prev.signaturePosition || 'KEPALA_KIRI_GURU_KANAN',
        signaturePlace: profile.signaturePlace || prev.signaturePlace || profile.village || 'Sanggreman',
        signatureLeftTitle: profile.signatureLeftTitle || prev.signatureLeftTitle || 'Mengetahui,\nKepala Madrasah',
        signatureRightTitle: profile.signatureRightTitle || prev.signatureRightTitle || 'Guru Yang Bersangkutan',
      }));
    }
  }, [profile, isDirtyProfile]);

  useEffect(() => {
    if (!isDirtySchedule) {
      _setFormSchedule(schedule);
    }
  }, [schedule, isDirtySchedule]);

  // Handle Favicon Upload & Circular Mask Compression (128x128 high-DPI circular favicon)
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar ikon (PNG, ICO, JPG, atau WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          
          // Create perfect circular clipping path
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          // Calculate center crop covering full circle
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const dataUrl = canvas.toDataURL('image/png');
          const updated = { ...formProfile, faviconUrl: dataUrl };
          setFormProfile(updated);
          onUpdateProfile(updated);
          setSaveMessage('Favicon Bulat Berhasil Diunggah & Disimpan!');
          setTimeout(() => setSaveMessage(''), 3500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);

  const handleDownloadOgImage = () => {
    try {
      const imgData = formProfile.ogImageUrl;
      if (imgData && imgData.startsWith('data:image')) {
        const a = document.createElement('a');
        a.href = imgData;
        a.download = 'og-image.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open('/api/og-image?download=1', '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [shareVersion, setShareVersion] = useState<string>('3');

  const getShareUrl = (customVer?: string) => {
    const v = customVer !== undefined ? customVer : shareVersion;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin.includes('localhost') || window.location.origin.includes('ais-')
        ? (formProfile.website || 'https://absensi.jaenalmaskun.biz.id')
        : window.location.origin;
      return `${origin.replace(/\/$/, '')}/?v=${v}`;
    }
    return `https://absensi.jaenalmaskun.biz.id/?v=${v}`;
  };

  const handleCopyShareLink = (customVer?: string) => {
    try {
      const shareUrl = getShareUrl(customVer);
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareToWhatsApp = (customVer?: string) => {
    const shareUrl = getShareUrl(customVer);
    const text = `*SIMPRESENSI Madrasah - ${formProfile.name || 'GTK'}*\nSistem Presensi Fingerprint & Rekapitulasi Laporan GTK Terintegrasi Kemenag\n\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Handle Thumbnail / Social Share Image Upload (1200x630 compressed)
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar banner/thumbnail (JPG, PNG, atau WEBP)');
      return;
    }
    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const targetW = 1200;
        const targetH = 630;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill background emerald
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(0, 0, targetW, targetH);

          // Center and scale image
          const scale = Math.max(targetW / img.width, targetH / img.height);
          const x = (targetW / 2) - (img.width / 2) * scale;
          const y = (targetH / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
          const updated = { ...formProfile, ogImageUrl: dataUrl };
          setFormProfile(updated);
          onUpdateProfile(updated);

          try {
            const resp = await fetch('/api/upload-og-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageDataUrl: dataUrl }),
            });
            if (!resp.ok) {
              await fetch('api.php?action=upload_og_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl: dataUrl }),
              });
            }
          } catch (err) {
            try {
              await fetch('api.php?action=upload_og_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl: dataUrl }),
              });
            } catch (err2) {
              console.error('Failed to sync og image to server:', err2);
            }
          }

          setIsUploadingBanner(false);
          setSaveMessage('Thumbnail Banner Berhasil Diunggah & Disimpan Permanen!');
          setTimeout(() => setSaveMessage(''), 3500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteThumbnail = async () => {
    if (!window.confirm('Hapus thumbnail khusus dan kembali ke banner default sistem?')) return;
    const updated = { ...formProfile, ogImageUrl: undefined };
    setFormProfile(updated);
    onUpdateProfile(updated);
    try {
      await fetch('/api/upload-og-image', { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    setSaveMessage('Thumbnail khusus berhasil dihapus (Kembali ke banner default)!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleGenerateAutomaticBanner = async () => {
    setIsGeneratingBanner(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#022c22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // Decorative circles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1100, 100, 260, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(100, 550, 220, 0, Math.PI * 2);
      ctx.stroke();

      // Card container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(70, 60, 1060, 510, 24);
      ctx.fill();
      ctx.stroke();

      // Badge top
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(120, 105, 380, 42, 21);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(145, 126, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('SISTEM PRESENSI RESMI GTK', 165, 132);

      // School Name
      const schoolName = formProfile.name || 'MADRASAH ALIYAH / TSANAWIYAH';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px sans-serif';
      ctx.fillText(schoolName.length > 32 ? schoolName.slice(0, 32) + '...' : schoolName, 120, 215);

      // Gold Subtitle
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK Kemenag', 120, 265);

      // NSM & NPSN
      const nsmNpsn = [
        formProfile.nsm ? `NSM: ${formProfile.nsm}` : '',
        formProfile.npsn ? `NPSN: ${formProfile.npsn}` : '',
        formProfile.city || formProfile.district || 'Kemenag RI'
      ].filter(Boolean).join('  |  ');

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(nsmNpsn, 120, 305);

      // Feature pills
      const drawPill = (text: string, xPos: number) => {
        ctx.fillStyle = 'rgba(4, 47, 46, 0.75)';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(xPos, 350, 280, 50, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 16px sans-serif';
        ctx.fillText(text, xPos + 22, 381);
      };

      drawPill('✓ Fingerprint .DAT / Excel', 120);
      drawPill('✓ Rekap Matriks & SPTJM', 415);
      drawPill('✓ Sinkron Multi-Device', 710);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(120, 465);
      ctx.lineTo(1030, 465);
      ctx.stroke();

      // Footer
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(formProfile.address || 'Kementerian Agama Republik Indonesia', 120, 508);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('simpresensi.madrasah.id', 1030, 508);
      ctx.textAlign = 'left';

      // If school logo exists, embed it
      if (formProfile.logoUrl && formProfile.logoUrl.startsWith('data:image/')) {
        const logoImg = new Image();
        logoImg.onload = async () => {
          ctx.drawImage(logoImg, 910, 100, 170, 170);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
          const updated = { ...formProfile, ogImageUrl: dataUrl };
          setFormProfile(updated);
          onUpdateProfile(updated);
          try {
            const resp = await fetch('/api/upload-og-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageDataUrl: dataUrl }),
            });
            if (!resp.ok) {
              await fetch('api.php?action=upload_og_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl: dataUrl }),
              });
            }
          } catch (e) {
            try {
              await fetch('api.php?action=upload_og_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl: dataUrl }),
              });
            } catch (err2) {}
          }
          setIsGeneratingBanner(false);
          setSaveMessage('Banner Otomatis Berhasil Dibuat & Disimpan!');
          setTimeout(() => setSaveMessage(''), 3500);
        };
        logoImg.src = formProfile.logoUrl;
        return;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      const updated = { ...formProfile, ogImageUrl: dataUrl };
      setFormProfile(updated);
      onUpdateProfile(updated);
      try {
        const resp = await fetch('/api/upload-og-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        });
        if (!resp.ok) {
          await fetch('api.php?action=upload_og_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: dataUrl }),
          });
        }
      } catch (e) {
        try {
          await fetch('api.php?action=upload_og_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: dataUrl }),
          });
        } catch (err2) {}
      }
      setIsGeneratingBanner(false);
      setSaveMessage('Banner Otomatis Berhasil Dibuat & Disimpan!');
      setTimeout(() => setSaveMessage(''), 3500);
    } catch (e) {
      console.error(e);
      setIsGeneratingBanner(false);
    }
  };

  // New Holiday state
  const [holidayDate, setHolidayDate] = useState<string>('2026-08-17');
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidayType, setHolidayType] = useState<'NASIONAL' | 'MADRASAH' | 'CUTI_BERSAMA'>('MADRASAH');

  const handleSaveProfileAndSchedule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsDirtyProfile(false);
    setIsDirtySchedule(false);
    onUpdateProfile(formProfile);
    onUpdateSchedule(formSchedule);
    setSaveMessage('Seluruh Pengaturan (Kop Surat, Tanda Tangan, & Jam Kerja) Berhasil Disimpan!');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) return;

    const newH: HolidayItem = {
      id: `hol-${Date.now()}`,
      date: holidayDate,
      name: holidayName.trim(),
      type: holidayType,
    };
    onAddHoliday(newH);
    setHolidayName('');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      onImportAllData(text);
      setSaveMessage('Data Backup Berhasil Dipulihkan (Restore)!');
      setTimeout(() => setSaveMessage(''), 3000);
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'MADRASAH_UTAMA' | 'MADRASAH_SEKUNDER' | 'APP_LOGIN' = 'MADRASAH_UTAMA') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar format JPG, JPEG, PNG, atau WEBP!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (target === 'APP_LOGIN') {
          // Automatic Circular Crop with Canvas for Application Logo
          const circleCanvas = document.createElement('canvas');
          const circleSize = 360;
          circleCanvas.width = circleSize;
          circleCanvas.height = circleSize;
          const circleCtx = circleCanvas.getContext('2d');
          if (circleCtx) {
            circleCtx.clearRect(0, 0, circleSize, circleSize);
            circleCtx.beginPath();
            circleCtx.arc(circleSize / 2, circleSize / 2, circleSize / 2, 0, Math.PI * 2);
            circleCtx.closePath();
            circleCtx.clip();

            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            circleCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, circleSize, circleSize);
            const circleDataUrl = circleCanvas.toDataURL('image/png', 0.95);
            setFormProfile(prev => ({ ...prev, appLogoUrl: circleDataUrl }));
            setSaveMessage('Logo Aplikasi berhasil dipotong bulat otomatis!');
            setTimeout(() => setSaveMessage(''), 3500);
            return;
          }
        }

        // Compress & scale to max 350px for fast PDF generation and compact storage
        const canvas = document.createElement('canvas');
        const maxDim = 350;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
          if (target === 'MADRASAH_SEKUNDER') {
            setFormProfile(prev => ({ ...prev, secondaryLogoUrl: dataUrl }));
          } else {
            setFormProfile(prev => ({ ...prev, logoUrl: dataUrl }));
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCropCurrentAppLogoToCircle = () => {
    const currentUrl = formProfile.appLogoUrl || formProfile.logoUrl;
    if (!currentUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const circleCanvas = document.createElement('canvas');
      const circleSize = 360;
      circleCanvas.width = circleSize;
      circleCanvas.height = circleSize;
      const circleCtx = circleCanvas.getContext('2d');
      if (circleCtx) {
        circleCtx.clearRect(0, 0, circleSize, circleSize);
        circleCtx.beginPath();
        circleCtx.arc(circleSize / 2, circleSize / 2, circleSize / 2, 0, Math.PI * 2);
        circleCtx.closePath();
        circleCtx.clip();

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        circleCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, circleSize, circleSize);
        const circleDataUrl = circleCanvas.toDataURL('image/png', 0.95);
        setFormProfile(prev => ({ ...prev, appLogoUrl: circleDataUrl }));
        setSaveMessage('Logo saat ini berhasil diubah menjadi bulat otomatis!');
        setTimeout(() => setSaveMessage(''), 3500);
      }
    };
    img.src = currentUrl;
  };

  const handleRemoveLogo = (target: 'MADRASAH_UTAMA' | 'MADRASAH_SEKUNDER' | 'APP_LOGIN' = 'MADRASAH_UTAMA') => {
    if (target === 'MADRASAH_SEKUNDER') {
      setFormProfile(prev => ({ ...prev, secondaryLogoUrl: undefined }));
    } else if (target === 'APP_LOGIN') {
      setFormProfile(prev => ({ ...prev, appLogoUrl: undefined }));
    } else {
      setFormProfile(prev => ({ ...prev, logoUrl: undefined }));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-700" />
              <span>Pengaturan Kop Surat, Kolom Penandatangan & Sistem</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sesuaikan identitas kop surat resmi, unggah logo madrasah (JPG/PNG), atur posisi tanda tangan Kepala Madrasah di sebelah kiri & Guru di sebelah kanan.
            </p>
          </div>

          {saveMessage && (
            <div className="px-3.5 py-2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{saveMessage}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-100 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('KOP_SURAT')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'KOP_SURAT'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kop Surat & Cetak Berkas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGO_APLIKASI')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'LOGO_APLIKASI'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Logo Khusus Aplikasi (Login & Navbar)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TANDA_TANGAN')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'TANDA_TANGAN'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Kolom Penandatangan (Tanda Tangan)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('JAM_KERJA')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'JAM_KERJA'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal Jam Kerja & Toleransi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LIBUR')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'LIBUR'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Kalender Libur ({holidays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BRANDING')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'BRANDING'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Favicon & Thumbnail Aplikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BACKUP')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'BACKUP'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Backup & Restore Data</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KOP SURAT & UNGGAH LOGO */}
      {activeTab === 'KOP_SURAT' && (
        <form onSubmit={handleSaveProfileAndSchedule} className="space-y-6">
          
          {/* Live Preview Box of Kop Surat */}
          <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/70 rounded-2xl p-6 shadow-sm border border-zinc-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-xs text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span>Pratinjau Langsung (Live Preview) Kop Surat Cetak Resmi</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                Sesuai PDF & Format A4
              </span>
            </div>

            <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-4 justify-between">
                {/* Left Logo */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-zinc-50 rounded-lg border border-dashed border-zinc-300 overflow-hidden">
                  {formProfile.logoUrl ? (
                    <img
                      src={formProfile.logoUrl}
                      alt="Logo Madrasah"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-[10px] text-zinc-400 text-center font-bold px-1">
                      Logo Madrasah (JPG)
                    </div>
                  )}
                </div>

                {/* Header Text Center */}
                <div className="flex-1 text-center space-y-0.5">
                  <p className="text-[11px] font-bold text-zinc-700 tracking-wide uppercase">
                    {formProfile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
                  </p>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase">
                    {formProfile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
                  </p>
                  <h4 className="text-base font-black text-zinc-950 uppercase tracking-wide">
                    {formProfile.name || "NAMA RESMI MADRASAH"}
                  </h4>
                  <p className="text-[10px] text-zinc-600 leading-tight">
                    {formProfile.address}, {formProfile.village}, {formProfile.district}, {formProfile.city} - Telp: {formProfile.phone}
                  </p>
                  <p className="text-[9.5px] font-mono text-zinc-500">
                    NSM: {formProfile.nsm} | NPSN: {formProfile.npsn} | Email: {formProfile.email}
                  </p>
                </div>

                {/* Right Logo (if present or placeholder) */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-zinc-50 rounded-lg border border-dashed border-zinc-300 overflow-hidden">
                  {formProfile.secondaryLogoUrl ? (
                    <img
                      src={formProfile.secondaryLogoUrl}
                      alt="Logo Sekunder"
                      className="w-full h-full object-contain"
                    />
                  ) : formProfile.logoUrl ? (
                    <img
                      src={formProfile.logoUrl}
                      alt="Logo Kanan"
                      className="w-full h-full object-contain opacity-40 grayscale"
                    />
                  ) : (
                    <div className="text-[10px] text-zinc-400 text-center font-bold px-1">
                      Logo Kemenag / Yayasan
                    </div>
                  )}
                </div>
              </div>

              {/* Official Double Divider Line */}
              <div className="mt-3 pt-1 border-b-2 border-zinc-950"></div>
              <div className="mt-0.5 border-b border-zinc-800"></div>
            </div>
          </div>

          {/* Upload Logo Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>Unggah Logo Madrasah (Format JPG / PNG / WEBP)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Primary Logo */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
                <div className="font-bold text-zinc-800 flex items-center justify-between">
                  <span>Logo Utama Madrasah (Kiri):</span>
                  {formProfile.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo('MADRASAH_UTAMA')}
                      className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-xl border border-zinc-300 flex items-center justify-center p-1 overflow-hidden shadow-inner">
                    {formProfile.logoUrl ? (
                      <img src={formProfile.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm">
                      <Upload className="w-4 h-4" />
                      <span>Pilih Foto Logo JPG / PNG</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleLogoUpload(e, 'MADRASAH_UTAMA')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Disarankan file gambar logo transparan atau putih (persegi), maks 2 MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Logo (Optional) */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
                <div className="font-bold text-zinc-800 flex items-center justify-between">
                  <span>Logo Sekunder (Kanan - Opsional):</span>
                  {formProfile.secondaryLogoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo('MADRASAH_SEKUNDER')}
                      className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-xl border border-zinc-300 flex items-center justify-center p-1 overflow-hidden shadow-inner">
                    {formProfile.secondaryLogoUrl ? (
                      <img src={formProfile.secondaryLogoUrl} alt="Logo Preview 2" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm">
                      <Upload className="w-4 h-4" />
                      <span>Unggah Logo Kemenag / Yayasan</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleLogoUpload(e, 'MADRASAH_SEKUNDER')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Logo instansi pembina atau lambang yayasan (LP Ma'arif / Kemenag RI).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Kop Surat Lengkap */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Teks & Identitas Lengkap Kop Surat</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Baris Header 1 (Yayasan / Lembaga):</label>
                <input
                  type="text"
                  value={formProfile.letterHeader1 || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, letterHeader1: e.target.value })}
                  placeholder="Contoh: LEMBAGA PENDIDIKAN MA'ARIF NU"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Baris Header 2 (Instansi / Kemenag):</label>
                <input
                  type="text"
                  value={formProfile.letterHeader2 || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, letterHeader2: e.target.value })}
                  placeholder="Contoh: KEMENTERIAN AGAMA REPUBLIK INDONESIA"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">Nama Resmi Madrasah:</label>
                <input
                  type="text"
                  value={formProfile.name}
                  onChange={(e) => setFormProfile({ ...formProfile, name: e.target.value })}
                  required
                  placeholder="MI MA'ARIF NU 02 SANGGREMAN"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-black text-zinc-900"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Jenjang Madrasah:</label>
                <select
                  value={formProfile.level}
                  onChange={(e) => setFormProfile({ ...formProfile, level: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                >
                  <option value="RA">RA (Raudhatul Athfal)</option>
                  <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                  <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                  <option value="MA">MA (Madrasah Aliyah)</option>
                  <option value="MAK">MAK (Madrasah Aliyah Kejuruan)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Nomor Statistik (NSM):</label>
                <input
                  type="text"
                  value={formProfile.nsm}
                  onChange={(e) => setFormProfile({ ...formProfile, nsm: e.target.value })}
                  placeholder="111233..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">NPSN Kemdikbud:</label>
                <input
                  type="text"
                  value={formProfile.npsn}
                  onChange={(e) => setFormProfile({ ...formProfile, npsn: e.target.value })}
                  placeholder="6071..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Status Kelembagaan:</label>
                <select
                  value={formProfile.status}
                  onChange={(e) => setFormProfile({ ...formProfile, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                >
                  <option value="SWASTA">Swasta (LP Ma'arif / Yayasan)</option>
                  <option value="NEGERI">Negeri (MIN / MTsN / MAN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Nama Yayasan / Badan:</label>
                <input
                  type="text"
                  value={formProfile.foundationName || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, foundationName: e.target.value })}
                  placeholder="LP Ma'arif NU Banyumas"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">Alamat Jalan & RT/RW:</label>
                <input
                  type="text"
                  value={formProfile.address}
                  onChange={(e) => setFormProfile({ ...formProfile, address: e.target.value })}
                  placeholder="Jl. Lapangan Desa Sanggreman No. 04"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Desa / Kelurahan:</label>
                <input
                  type="text"
                  value={formProfile.village}
                  onChange={(e) => setFormProfile({ ...formProfile, village: e.target.value })}
                  placeholder="Sanggreman"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Kecamatan:</label>
                <input
                  type="text"
                  value={formProfile.district}
                  onChange={(e) => setFormProfile({ ...formProfile, district: e.target.value })}
                  placeholder="Rawalo"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Kabupaten / Kota:</label>
                <input
                  type="text"
                  value={formProfile.city}
                  onChange={(e) => setFormProfile({ ...formProfile, city: e.target.value })}
                  placeholder="Kabupaten Banyumas"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Provinsi:</label>
                <input
                  type="text"
                  value={formProfile.province}
                  onChange={(e) => setFormProfile({ ...formProfile, province: e.target.value })}
                  placeholder="Jawa Tengah"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Kode Pos:</label>
                <input
                  type="text"
                  value={formProfile.postalCode}
                  onChange={(e) => setFormProfile({ ...formProfile, postalCode: e.target.value })}
                  placeholder="53173"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Nomor Telepon / WA Madrasah:</label>
                <input
                  type="text"
                  value={formProfile.phone}
                  onChange={(e) => setFormProfile({ ...formProfile, phone: e.target.value })}
                  placeholder="(0281) 6841234"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Email Resmi Madrasah:</label>
                <input
                  type="email"
                  value={formProfile.email}
                  onChange={(e) => setFormProfile({ ...formProfile, email: e.target.value })}
                  placeholder="mimaarifnu2sanggreman@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Website / Portal Informasi:</label>
                <input
                  type="text"
                  value={formProfile.website || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, website: e.target.value })}
                  placeholder="www.mimaarifnu2sanggreman.sch.id"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Seluruh Pengaturan Kop Surat</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB: LOGO KHUSUS APLIKASI (LOGIN & NAVBAR) */}
      {activeTab === 'LOGO_APLIKASI' && (
        <form onSubmit={handleSaveProfileAndSchedule} className="space-y-6">
          
          {/* Info Card Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>Pengaturan Terpisah: Logo Khusus Aplikasi (Halaman Login & Navbar)</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Fitur ini memisahkan <strong>Logo Aplikasi Sistem</strong> (untuk Halaman Login & Header Navbar) dari <strong>Logo Kop Surat</strong> (untuk Cetak PDF SPTJM Kemenag, Rekap Bulanan, & Slip).
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold shrink-0">
                Fitur Mandiri (Terpisah)
              </div>
            </div>

            {/* Comparison Cards: Logo Aplikasi vs Logo Kop Surat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-900 text-white space-y-1.5 shadow-sm">
                <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Logo Khusus Aplikasi (Digital):</span>
                </div>
                <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                  Ditampilkan di <strong>Halaman Login</strong> (bagian tengah atas) dan <strong>Header Navbar</strong> portal GTK & Admin saat login.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-100 text-zinc-800 space-y-1.5 border border-zinc-200">
                <div className="text-xs font-bold flex items-center gap-1.5 text-zinc-700">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Logo Kop Surat Madrasah (Cetak Berkas):</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Ditampilkan khusus pada <strong>Kop Surat Cetak PDF</strong>, Lembar SPTJM Kemenag, Rekap Presensi Bulanan, dan Slip Presensi.
                </p>
              </div>
            </div>
          </div>

          {/* Upload & Management Card for Application Logo */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-6">
            <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Unggah & Kelola Logo Khusus Aplikasi SIMPRESENSI</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-zinc-50/80 p-5 rounded-2xl border border-zinc-200">
              
              {/* Logo Preview Frame */}
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-28 h-28 bg-white rounded-full border-2 border-emerald-500/40 flex items-center justify-center p-0 overflow-hidden shadow-lg ring-4 ring-emerald-50">
                  {formProfile.appLogoUrl ? (
                    <img 
                      src={formProfile.appLogoUrl} 
                      alt="Logo Khusus Aplikasi" 
                      className="w-full h-full object-cover rounded-full" 
                    />
                  ) : formProfile.logoUrl ? (
                    <img 
                      src={formProfile.logoUrl} 
                      alt="Logo Madrasah (Fallback)" 
                      className="w-full h-full object-cover rounded-full" 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400">
                      <Building2 className="w-10 h-10 text-emerald-700/60" />
                      <span className="text-[10px] font-bold mt-1 text-zinc-500">Badge Standar</span>
                    </div>
                  )}
                </div>

                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  formProfile.appLogoUrl 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : formProfile.logoUrl 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {formProfile.appLogoUrl 
                    ? 'Logo Kustom Aplikasi Aktif (Bulat)' 
                    : formProfile.logoUrl 
                    ? 'Menggunakan Logo Kop Surat (Bulat)' 
                    : 'Menggunakan Emblem Standar'}
                </span>
              </div>

              {/* Upload Controls & Actions */}
              <div className="md:col-span-8 space-y-3">
                <div className="space-y-1">
                  <h5 className="font-bold text-sm text-zinc-900">Pilih File Logo Aplikasi (JPG / PNG / WEBP)</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Sistem otomatis memotong & menyesuaikan gambar menjadi bentuk lingkaran bulat sempurna tanpa distorsi.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {/* Upload Button */}
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Unggah File Logo Baru (Otomatis Bulat)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => handleLogoUpload(e, 'APP_LOGIN')}
                      className="hidden"
                    />
                  </label>

                  {/* Auto-Crop / Round Button */}
                  {(formProfile.appLogoUrl || formProfile.logoUrl) && (
                    <button
                      type="button"
                      onClick={handleCropCurrentAppLogoToCircle}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      title="Potong logo saat ini menjadi format bulat sempurna"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Bulatkan Logo Sekarang</span>
                    </button>
                  )}

                  {/* Copy from Kop Surat Button */}
                  {formProfile.logoUrl && formProfile.logoUrl !== formProfile.appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormProfile(prev => ({ ...prev, appLogoUrl: prev.logoUrl }));
                        setSaveMessage('Logo Kop Surat disalin ke Logo Aplikasi!');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <Copy className="w-4 h-4 text-zinc-600" />
                      <span>Samakan dengan Logo Kop Surat</span>
                    </button>
                  )}

                  {/* Remove Button */}
                  {formProfile.appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo('APP_LOGIN')}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Logo Kustom</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Box: Login Page & Header Navbar */}
            <div className="space-y-4 pt-2">
              <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span>Pratinjau Langsung (Live Interactive Preview) di Antarmuka</span>
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* 1. Preview Login Page Card */}
                <div className="bg-gradient-to-b from-emerald-800 to-emerald-950 p-4 rounded-2xl text-white shadow-md border border-emerald-700/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2 text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    <span>Simulasi Halaman Login</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-600/40">
                      Tengah Atas
                    </span>
                  </div>

                  {/* Centered Logo Preview */}
                  <div className="flex justify-center pt-1">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-emerald-400/60 ring-4 ring-emerald-500/20 overflow-hidden">
                      {(formProfile.appLogoUrl || formProfile.logoUrl) ? (
                        <img 
                          src={formProfile.appLogoUrl || formProfile.logoUrl} 
                          alt="Preview Login Logo" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-emerald-800" />
                      )}
                    </div>
                  </div>

                  {/* Fingerprint + Madrasah Name */}
                  <div className="flex items-center space-x-2.5 bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-600/30">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                      <span className="text-emerald-300 text-xs font-black">FP</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 block">
                        SIMPRESENSI GTK
                      </span>
                      <h5 className="text-xs font-bold text-white tracking-tight leading-tight line-clamp-1">
                        {formProfile.name}
                      </h5>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-300/80 text-center italic">
                    * Logo aplikasi tampil bulat di tengah atas, ikon sidik jari di sebelah kiri nama madrasah.
                  </p>
                </div>

                {/* 2. Preview Header Navbar Card */}
                <div className="bg-emerald-900 p-4 rounded-2xl text-white shadow-md border border-emerald-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-2 text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    <span>Simulasi Header Navbar Sistem</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-700/60">
                      Header Utama
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-emerald-600 shrink-0 overflow-hidden ring-2 ring-emerald-400/20">
                      {(formProfile.appLogoUrl || formProfile.logoUrl) ? (
                        <img 
                          src={formProfile.appLogoUrl || formProfile.logoUrl} 
                          alt="Preview Navbar Logo" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-emerald-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded">
                        PORTAL GTK
                      </span>
                      <h5 className="text-xs font-bold text-white tracking-tight leading-tight truncate mt-1">
                        {formProfile.name}
                      </h5>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-300/80 text-center italic">
                    * Logo aplikasi otomatis tampil bulat di pojok kiri atas navbar setelah pengguna login.
                  </p>
                </div>

              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Logo Khusus Aplikasi</span>
              </button>
            </div>

          </div>

        </form>
      )}

      {/* TAB 2: EDIT KOLOM PENANDATANGAN */}
      {activeTab === 'TANDA_TANGAN' && (
        <form onSubmit={handleSaveProfileAndSchedule} className="space-y-6">
          
          {/* Posisi Penandatangan Selection Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <FileSignature className="w-4 h-4 text-emerald-700" />
              <span>Tata Letak Posisi Kolom Penandatangan Dokumen Presensi</span>
            </h3>

            <p className="text-xs text-zinc-600">
              Pilih susunan letak tanda tangan untuk Laporan Log Presensi Bulanan Guru, Lembar Matriks, dan Jurnal Harian:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Kepala Madrasah di Kiri, Guru di Kanan */}
              <label 
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  (formProfile.signaturePosition || 'KEPALA_KIRI_GURU_KANAN') === 'KEPALA_KIRI_GURU_KANAN'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="signaturePosition"
                      value="KEPALA_KIRI_GURU_KANAN"
                      checked={(formProfile.signaturePosition || 'KEPALA_KIRI_GURU_KANAN') === 'KEPALA_KIRI_GURU_KANAN'}
                      onChange={() => setFormProfile({ ...formProfile, signaturePosition: 'KEPALA_KIRI_GURU_KANAN' })}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="font-bold text-xs text-zinc-900">
                      Kepala Madrasah di KIRI, Guru di KANAN (Rekomendasi)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                    Aktif
                  </span>
                </div>

                <div className="mt-3 p-3 bg-white rounded-xl border border-zinc-200 text-[11px] grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="font-bold text-zinc-700">SEBELAH KIRI:</div>
                    <div className="text-zinc-600 mt-1">Mengetahui,</div>
                    <div className="font-bold text-emerald-800">Kepala Madrasah</div>
                    <div className="text-zinc-400 mt-4 text-[9px]">[Tanda Tangan]</div>
                    <div className="font-bold text-zinc-800 mt-1">{formProfile.headmasterName}</div>
                    <div className="text-[9.5px] font-mono text-zinc-500">NIP. {formProfile.headmasterNip || '-'}</div>
                  </div>

                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="font-bold text-zinc-700">SEBELAH KANAN:</div>
                    <div className="text-zinc-600 mt-1">{formProfile.signaturePlace || formProfile.village}, Tanggal</div>
                    <div className="font-bold text-emerald-800">Guru Yang Bersangkutan</div>
                    <div className="text-zinc-400 mt-4 text-[9px]">[Tanda Tangan]</div>
                    <div className="font-bold text-zinc-800 mt-1">Nama GTK / Guru</div>
                    <div className="text-[9.5px] font-mono text-zinc-500">NIP / NUPTK / Peg ID</div>
                  </div>
                </div>
              </label>

              {/* Option B: Guru di Kiri, Kepala Madrasah di Kanan */}
              <label 
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  formProfile.signaturePosition === 'GURU_KIRI_KEPALA_KANAN'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="signaturePosition"
                      value="GURU_KIRI_KEPALA_KANAN"
                      checked={formProfile.signaturePosition === 'GURU_KIRI_KEPALA_KANAN'}
                      onChange={() => setFormProfile({ ...formProfile, signaturePosition: 'GURU_KIRI_KEPALA_KANAN' })}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="font-bold text-xs text-zinc-900">
                      Guru di KIRI, Kepala Madrasah di KANAN
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-white rounded-xl border border-zinc-200 text-[11px] grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="font-bold text-zinc-700">SEBELAH KIRI:</div>
                    <div className="font-bold text-emerald-800 mt-1">Guru Yang Bersangkutan</div>
                    <div className="text-zinc-400 mt-4 text-[9px]">[Tanda Tangan]</div>
                    <div className="font-bold text-zinc-800 mt-1">Nama GTK / Guru</div>
                    <div className="text-[9.5px] font-mono text-zinc-500">NIP / NUPTK / Peg ID</div>
                  </div>

                  <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="font-bold text-zinc-700">SEBELAH KANAN:</div>
                    <div className="text-zinc-600 mt-1">{formProfile.signaturePlace || formProfile.village}, Tanggal</div>
                    <div className="text-zinc-600">Mengetahui,</div>
                    <div className="font-bold text-emerald-800">Kepala Madrasah</div>
                    <div className="text-zinc-400 mt-4 text-[9px]">[Tanda Tangan]</div>
                    <div className="font-bold text-zinc-800 mt-1">{formProfile.headmasterName}</div>
                    <div className="text-[9.5px] font-mono text-zinc-500">NIP. {formProfile.headmasterNip || '-'}</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Form Detail Kolom Penandatangan */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Settings className="w-4 h-4 text-emerald-700" />
              <span>Detail Teks & Nama Pejabat Penandatangan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Titimangsa Kota / Desa Penandatangan:</label>
                <input
                  type="text"
                  value={formProfile.signaturePlace || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, signaturePlace: e.target.value })}
                  placeholder="Contoh: Sanggreman, Rawalo, Banyumas"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold"
                />
                <span className="text-[11px] text-zinc-500 mt-0.5 block">
                  Akan tercetak sebelum tanggal (cth: "{formProfile.signaturePlace || formProfile.village}, 31 Agustus 2026")
                </span>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Judul Kolom Kiri:</label>
                <input
                  type="text"
                  value={formProfile.signatureLeftTitle || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, signatureLeftTitle: e.target.value })}
                  placeholder="Mengetahui,&#10;Kepala Madrasah"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Judul Kolom Kanan:</label>
                <input
                  type="text"
                  value={formProfile.signatureRightTitle || ''}
                  onChange={(e) => setFormProfile({ ...formProfile, signatureRightTitle: e.target.value })}
                  placeholder="Guru Yang Bersangkutan"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold"
                />
              </div>
            </div>

            {/* Identitas Kepala Madrasah */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <div className="font-bold text-xs text-zinc-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Data Kepala Madrasah (Penandatangan Utama)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nama Kepala Madrasah & Gelar:</label>
                  <input
                    type="text"
                    value={formProfile.headmasterName}
                    onChange={(e) => setFormProfile({ ...formProfile, headmasterName: e.target.value })}
                    required
                    placeholder="Nama Kepala Madrasah, S.Pd.I."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NIP Kepala Madrasah:</label>
                  <input
                    type="text"
                    value={formProfile.headmasterNip || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, headmasterNip: e.target.value })}
                    placeholder="19780512..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NUPTK Kepala Madrasah:</label>
                  <input
                    type="text"
                    value={formProfile.headmasterNuptk || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, headmasterNuptk: e.target.value })}
                    placeholder="7435756..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Sebutan Jabatan Tanda Tangan:</label>
                  <input
                    type="text"
                    value={formProfile.headmasterSignatureTitle || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, headmasterSignatureTitle: e.target.value })}
                    placeholder="Kepala Madrasah / Plt. Kepala Madrasah"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold bg-white"
                  />
                </div>
                <div className="flex items-center text-[11px] text-zinc-500 pt-5">
                  Teks ini muncul tepat di bawah kata "Mengetahui" pada lembar dokumen cetak.
                </div>
              </div>
            </div>

            {/* Identitas Kepala Tata Usaha / Operator */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <div className="font-bold text-xs text-zinc-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Data Kepala Tata Usaha / Petugas Presensi (Untuk Laporan Matriks & Jurnal)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nama Kepala TU / Petugas:</label>
                  <input
                    type="text"
                    value={formProfile.tuAdminName}
                    onChange={(e) => setFormProfile({ ...formProfile, tuAdminName: e.target.value })}
                    placeholder="Nurul Hidayati, S.Kom."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">NIP Kepala TU / Petugas:</label>
                  <input
                    type="text"
                    value={formProfile.tuAdminNip || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, tuAdminNip: e.target.value })}
                    placeholder="19891024..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-mono font-bold bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Kolom Penandatangan</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB 3: JADWAL JAM KERJA & TOLERANSI */}
      {activeTab === 'JAM_KERJA' && (
        <form onSubmit={handleSaveProfileAndSchedule} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Aturan Jam Masuk, Batas Keterlambatan, & Jam Pulang</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Senin - Kamis */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="font-bold text-zinc-900">Senin – Kamis</div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Batas Masuk Normal:</label>
                  <input
                    type="time"
                    value={formSchedule.mondayThursday.checkInLimit}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      mondayThursday: { ...formSchedule.mondayThursday, checkInLimit: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Jam Pulang Normal:</label>
                  <input
                    type="time"
                    value={formSchedule.mondayThursday.checkOutStart}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      mondayThursday: { ...formSchedule.mondayThursday, checkOutStart: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Jumat */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-950">Jumat (Pulang Awal)</div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Batas Masuk Jumat:</label>
                  <input
                    type="time"
                    value={formSchedule.friday.checkInLimit}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      friday: { ...formSchedule.friday, checkInLimit: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Jam Pulang Jumat:</label>
                  <input
                    type="time"
                    value={formSchedule.friday.checkOutStart}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      friday: { ...formSchedule.friday, checkOutStart: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Sabtu */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="font-bold text-zinc-900">Sabtu</div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Batas Masuk Sabtu:</label>
                  <input
                    type="time"
                    value={formSchedule.saturday.checkInLimit}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      saturday: { ...formSchedule.saturday, checkInLimit: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block">Jam Pulang Sabtu:</label>
                  <input
                    type="time"
                    value={formSchedule.saturday.checkOutStart}
                    onChange={(e) => setFormSchedule({
                      ...formSchedule,
                      saturday: { ...formSchedule.saturday, checkOutStart: e.target.value }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Toleransi Keterlambatan (Menit):</label>
                <input
                  type="number"
                  value={formSchedule.toleranceMinutes}
                  onChange={(e) => setFormSchedule({ ...formSchedule, toleranceMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold"
                />
                <span className="text-[11px] text-zinc-500 mt-0.5 block">
                  Jika toleransi 5 menit, masuk pukul 07:18 tidak dihitung terlambat (bila batas 07:15).
                </span>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Hari Kerja Efektif Mingguan:</label>
                <select
                  value={formSchedule.workDaysCount}
                  onChange={(e) => setFormSchedule({ ...formSchedule, workDaysCount: Number(e.target.value) as any })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-bold"
                >
                  <option value={6}>6 Hari Kerja (Senin – Sabtu)</option>
                  <option value={5}>5 Hari Kerja (Senin – Jumat)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Jam Kerja & Toleransi</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: KALENDER LIBUR */}
      {activeTab === 'LIBUR' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Kalender Hari Libur Nasional & Hari Libur Khusus Madrasah</span>
          </h3>

          {/* Add Holiday Form */}
          <form onSubmit={handleAddHolidaySubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Tanggal Libur:</label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-700 mb-1">Nama Hari Libur:</label>
              <input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                required
                placeholder="Contoh: Hari Santri Nasional / HAB Kemenag..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Libur</span>
              </button>
            </div>
          </form>

          {/* Holidays List */}
          <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto pr-1">
            {holidays.map(h => (
              <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {h.date}
                  </span>
                  <span className="font-bold text-zinc-800">{h.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-semibold">
                    {h.type}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteHoliday(h.id)}
                  className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                  title="Hapus Hari Libur"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: BRANDING & FAVICON / THUMBNAIL */}
      {activeTab === 'BRANDING' && (
        <form onSubmit={handleSaveProfileAndSchedule} className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-3">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>Pengaturan Favicon (Ikon Tab Browser) & Thumbnail Aplikasi</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Ubah ikon tab browser (Favicon) dan gambar sampul/banner thumbnail saat tautan web presensi dibagikan ke WhatsApp, Telegram, atau media sosial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Favicon Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>1. Favicon (Ikon Tab Browser)</span>
                  </h4>
                  {formProfile.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...formProfile, faviconUrl: undefined };
                        setFormProfile(updated);
                        onUpdateProfile(updated);
                        setSaveMessage('Favicon khusus berhasil dihapus (Kembali ke default)!');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Favicon</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center p-0.5 shadow-md shrink-0 overflow-hidden ring-4 ring-emerald-50">
                    {formProfile.faviconUrl ? (
                      <img src={formProfile.faviconUrl} alt="Favicon Bulat Preview" className="w-full h-full rounded-full object-cover" />
                    ) : formProfile.logoUrl ? (
                      <img src={formProfile.logoUrl} alt="Default Favicon" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-emerald-700" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto Favicon Bulat</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/x-icon,image/svg+xml,image/webp"
                        onChange={handleFaviconUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Ikon otomatis dipotong <strong>berbentuk bulat melingkar (circle)</strong> untuk tab browser.
                    </p>
                  </div>
                </div>

                {/* Mock Browser Tab Preview */}
                <div className="bg-zinc-800 text-zinc-300 p-2.5 rounded-xl text-xs space-y-1.5">
                  <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    Simulasi Tab Browser:
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700 max-w-xs">
                    {formProfile.faviconUrl ? (
                      <img src={formProfile.faviconUrl} alt="Tab Icon" className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-white/30" />
                    ) : (
                      <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate text-[11px] font-medium text-zinc-200">
                      SIMPRESENSI GTK - {formProfile.name || 'Madrasah'}
                    </span>
                    <X className="w-3 h-3 text-zinc-500 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Thumbnail / Banner Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>2. Thumbnail / Banner Pratinjau Web (Medsos / WhatsApp)</span>
                  </h4>
                  {formProfile.ogImageUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteThumbnail}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Thumbnail</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Thumbnail Image Box */}
                  <div className="w-full h-36 rounded-xl bg-zinc-900 border border-zinc-300 flex items-center justify-center overflow-hidden shadow-inner relative group">
                    {formProfile.ogImageUrl ? (
                      <img 
                        src={formProfile.ogImageUrl} 
                        alt="Thumbnail Preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src="/api/og-image" 
                        alt="Default System OG Banner" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/20">
                      {formProfile.ogImageUrl ? 'Thumbnail Kustom Aktif' : 'Banner Otomatis Aktif'}
                    </div>
                  </div>

                  {/* Buttons Action Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingBanner ? 'Mengunggah...' : 'Unggah Foto Thumbnail'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleGenerateAutomaticBanner}
                      disabled={isGeneratingBanner}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingBanner ? 'Membuat...' : 'Buat Banner Otomatis'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadOgImage}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
                      title="Download file og-image.jpg untuk diunggah langsung ke folder httpdocs Plesk"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Berkas og-image.jpg</span>
                    </button>

                    <a
                      href={`/api/og-image?t=${Date.now()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all border border-zinc-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka URL Gambar</span>
                    </a>
                  </div>
                </div>

                {/* WhatsApp preview mockup */}
                <div className="bg-emerald-950/10 p-4 rounded-xl text-xs space-y-3 border border-emerald-800/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-emerald-900 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Bagikan Tautan Web (WhatsApp / Medsos)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-zinc-600 font-medium flex items-center gap-1">
                        <span>Kode Versi:</span>
                        <input
                          type="text"
                          value={shareVersion}
                          onChange={(e) => setShareVersion(e.target.value)}
                          className="w-12 px-1.5 py-0.5 bg-white border border-zinc-300 rounded font-mono text-center font-bold text-emerald-800"
                          placeholder="3"
                        />
                      </label>
                    </div>
                  </div>

                  {/* URL Display & Action Buttons */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-300/80 shadow-2xs space-y-2">
                    <div className="text-[11px] font-mono text-zinc-700 bg-zinc-50 p-2 rounded border border-zinc-200 break-all select-all font-semibold">
                      {getShareUrl()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareToWhatsApp()}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Buka &amp; Bagikan ke WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyShareLink()}
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-zinc-50 text-emerald-800 border border-emerald-400 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedLink ? 'Tautan Tersalin!' : 'Salin Link (?v=' + shareVersion + ')'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const autoVer = Date.now().toString().slice(-4);
                          setShareVersion(autoVer);
                          handleCopyShareLink(autoVer);
                        }}
                        title="Buat kode versi baru otomatis agar cache WhatsApp langsung refresh"
                        className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Salin Link Anti-Cache Baru</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs text-left max-w-sm mx-auto">
                    <div className="h-32 w-full bg-zinc-900 relative flex items-center justify-center overflow-hidden">
                      {formProfile.ogImageUrl ? (
                        <img src={formProfile.ogImageUrl} alt="OG Banner" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/api/og-image" alt="Dynamic OG Banner" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="font-bold text-xs text-zinc-900 line-clamp-1">
                        SIMPRESENSI Madrasah - {formProfile.name || 'Sistem Presensi GTK'}
                      </div>
                      <div className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                        Sistem Presensi Fingerprint &amp; Rekapitulasi Laporan GTK {formProfile.name || 'Madrasah'} Terintegrasi Kemenag
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono pt-1">
                        {getShareUrl()}
                      </div>
                    </div>
                  </div>

                  {/* Tips Accordion */}
                  <div className="pt-2 border-t border-emerald-800/15">
                    <button
                      type="button"
                      onClick={() => setShowShareGuide(!showShareGuide)}
                      className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 hover:text-emerald-900 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showShareGuide ? 'Sembunyikan Tips WhatsApp Cache' : 'Tips Agar Thumbnail Selalu Muncul Sempurna di WhatsApp / FB'}</span>
                    </button>

                    {showShareGuide && (
                      <div className="mt-2 p-3 bg-white/90 rounded-lg border border-emerald-200 text-[11px] text-zinc-700 space-y-1.5 leading-relaxed animate-fadeIn">
                        <p><strong>1. Mengapa Perlu Kode Versi (?v=3):</strong> WhatsApp dan media sosial secara agresif menyimpan cache (ingatan) link lama. Dengan menyertakan kode versi seperti <code className="bg-zinc-100 px-1 py-0.5 rounded text-emerald-800 font-mono">?v=3</code>, WhatsApp akan menganggapnya sebagai tautan baru dan seketika mengunduh gambar banner terbaru Anda.</p>
                        <p><strong>2. Cara Bagikan:</strong> Klik tombol hijau <strong>"Buka &amp; Bagikan ke WhatsApp"</strong> di atas, lalu tunggu 1-2 detik di WhatsApp hingga kartu gambar banner muncul sebelum menekan tombol kirim.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Favicon & Thumbnail</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-6">
          {/* Data GTK Excel Management Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Manajemen Berkas Excel Data GTK (Guru & Karyawan)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => downloadGTKTemplateExcel(profile)}
                className="p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left space-y-1 group"
              >
                <Download className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-all" />
                <div className="font-bold text-xs text-zinc-900">Unduh Format Template Excel GTK (.xlsx)</div>
                <p className="text-[11px] text-zinc-500">
                  Unduh formulir Excel resmi dengan petunjuk pengisian NIK, PIN, NIP, NPK, PegID, jabatan, dan beban JTM.
                </p>
              </button>

              {teachers.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportTeachersListToExcel(profile, teachers)}
                  className="p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left space-y-1 group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-all" />
                  <div className="font-bold text-xs text-zinc-900">Ekspor Seluruh Data GTK Saat Ini (.xlsx)</div>
                  <p className="text-[11px] text-zinc-500">
                    Ekspor seluruh data ({teachers.length} guru/GTK) ke dalam berkas spreadsheet terstruktur.
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Full System Backup & Restore */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Cadangkan (Backup) & Pemulihan (Restore) Seluruh Data Sistem</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={onExportAllData}
                className="p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left space-y-1 group"
              >
                <Download className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-all" />
                <div className="font-bold text-xs text-zinc-900">Backup Data Sistem (.JSON)</div>
                <p className="text-[11px] text-zinc-500">
                  Download seluruh data guru, log presensi, kop surat, logo, dan jadwal untuk disimpan aman di laptop/komputer.
                </p>
              </button>

              <label className="p-4 rounded-xl border border-zinc-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left space-y-1 group cursor-pointer block">
                <Upload className="w-5 h-5 text-blue-700 group-hover:scale-110 transition-all" />
                <div className="font-bold text-xs text-zinc-900">Restore Data Backup</div>
                <p className="text-[11px] text-zinc-500">
                  Pilih file .JSON backup sebelumnya untuk memulihkan seluruh data madrasah.
                </p>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>

              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin me-reset ke Data Sampel Madrasah default? Data yang belum di-backup akan ditimpa.")) {
                    onResetSampleData();
                  }
                }}
                className="p-4 rounded-xl border border-zinc-200 hover:border-rose-500 hover:bg-rose-50/50 transition-all text-left space-y-1 group"
              >
                <RotateCcw className="w-5 h-5 text-rose-700 group-hover:scale-110 transition-all" />
                <div className="font-bold text-xs text-zinc-900">Reset ke Data Sampel Standar</div>
                <p className="text-[11px] text-zinc-500">
                  Muat kembali data GTK sampel, rekap presensi lengkap, dan jadwal standar madrasah.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Unsaved Changes */}
      {(isDirtyProfile || isDirtySchedule) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-emerald-700/60 max-w-lg w-[92%] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-zinc-100">Perubahan belum disimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDirtyProfile(false);
                setIsDirtySchedule(false);
                _setFormProfile({
                  ...profile,
                  signaturePosition: profile.signaturePosition || 'KEPALA_KIRI_GURU_KANAN',
                  signaturePlace: profile.signaturePlace || profile.village || 'Sanggreman',
                  signatureLeftTitle: profile.signatureLeftTitle || 'Mengetahui,\nKepala Madrasah',
                  signatureRightTitle: profile.signatureRightTitle || 'Guru Yang Bersangkutan',
                });
                _setFormSchedule(schedule);
              }}
              className="px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-xs font-semibold rounded-xl text-zinc-300 hover:text-white transition-all"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={() => handleSaveProfileAndSchedule()}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
