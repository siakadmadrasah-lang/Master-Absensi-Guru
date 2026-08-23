import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Teacher, AttendanceRecord, MadrasahProfile, WorkSchedule, HolidayItem } from '../types';
import { 
  INDONESIAN_MONTHS, 
  formatIndonesianDate,
  getScheduleTimesForDay,
  getTelatCepatCalc,
  getPswLewatCalc,
  getTeacherMonthlyDailyRows,
  getTeacherSignatureId,
  TeacherMonthlyDailyRow,
  TeacherMonthlyStats
} from './attendanceUtils';

// Helper to draw clean Indonesian Madrasah Kop Surat (Letterhead) with Logo support
function drawMadrasahKop(doc: jsPDF, profile: MadrasahProfile, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Render Left Logo if available
  if (profile.logoUrl) {
    try {
      const imgFormat = profile.logoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(profile.logoUrl, imgFormat, 15, 10, 20, 20);
    } catch {
      // Fallback if image failed to load into PDF
    }
  }

  // Render Right Secondary Logo if available
  if (profile.secondaryLogoUrl) {
    try {
      const secFormat = profile.secondaryLogoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(profile.secondaryLogoUrl, secFormat, pageWidth - 35, 10, 20, 20);
    } catch {
      // Fallback
    }
  }
  
  // Header 1: Yayasan / Lembaga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(profile.letterHeader1 || "LEMBAGA PENDIDIKAN MA'ARIF NU", pageWidth / 2, 12, { align: 'center' });
  
  // Header 2: Kemenag / Satker
  doc.setFontSize(8);
  doc.text(profile.letterHeader2 || "KEMENTERIAN AGAMA REPUBLIK INDONESIA", pageWidth / 2, 16, { align: 'center' });
  
  // Madrasah Name
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(profile.name.toUpperCase(), pageWidth / 2, 22, { align: 'center' });
  
  // Address & Contacts
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const addressText = `${profile.address}, ${profile.village}, ${profile.district}, ${profile.city} - Telp: ${profile.phone}`;
  doc.text(addressText, pageWidth / 2, 26, { align: 'center' });
  
  const identText = `NSM: ${profile.nsm} | NPSN: ${profile.npsn} | Email: ${profile.email}`;
  doc.text(identText, pageWidth / 2, 30, { align: 'center' });
  
  // Double line divider
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(14, 33, pageWidth - 14, 33);
  doc.setLineWidth(0.3);
  doc.line(14, 34, pageWidth - 14, 34);
  
  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), pageWidth / 2, 41, { align: 'center' });
  
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(subtitle, pageWidth / 2, 45.5, { align: 'center' });
  }
}

// 1. Download Daily Attendance PDF (With departure/arrival times)
export function downloadDailyAttendancePDF(
  profile: MadrasahProfile,
  dateStr: string,
  dailyList: Array<{ teacher: Teacher; record?: AttendanceRecord; hasScanned: boolean }>,
  schedule: WorkSchedule
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const formattedDate = formatIndonesianDate(dateStr);
  drawMadrasahKop(
    doc,
    profile,
    'LAPORAN JURNAL PRESENSI HARIAN GTK (BERANGKAT & PULANG)',
    `Hari / Tanggal: ${formattedDate} | Jadwal Masuk Normal: ${schedule.mondayThursday.checkInLimit} WIB`
  );

  // Table Body Rows
  const tableRows = dailyList.map((item, index) => {
    const rec = item.record;
    const checkIn = rec?.checkInTime ? `${rec.checkInTime} WIB` : '-';
    const checkOut = rec?.checkOutTime ? `${rec.checkOutTime} WIB` : '-';
    
    let durationStr = '-';
    if (rec?.workDurationMinutes) {
      const h = Math.floor(rec.workDurationMinutes / 60);
      const m = rec.workDurationMinutes % 60;
      durationStr = `${h}j ${m}m`;
    }

    let statusText = 'BELUM SCAN';
    if (rec) {
      if (rec.status === 'HADIR') statusText = 'HADIR (Tepat)';
      else if (rec.status === 'TERLAMBAT') statusText = `TERLAMBAT (${rec.lateMinutes} m)`;
      else statusText = rec.status;
    }

    return [
      (index + 1).toString(),
      `#${item.teacher.fingerprintId}`,
      `${item.teacher.name}, ${item.teacher.title}\nNIP: ${item.teacher.nip || item.teacher.nuptk || '-'}`,
      item.teacher.position,
      item.teacher.employmentStatus,
      checkIn,
      checkOut,
      durationStr,
      statusText,
      rec?.verificationMethod || '-',
      rec?.notes || '-'
    ];
  });

  autoTable(doc, {
    startY: 49,
    head: [[
      'No',
      'ID',
      'Nama GTK & NIP',
      'Jabatan / Tugas',
      'Status',
      'Waktu Berangkat (Masuk)',
      'Waktu Pulang (Keluar)',
      'Durasi Kerja',
      'Status Presensi',
      'Metode Verifikasi',
      'Keterangan'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 110, 68], // emerald-800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 10 },
      2: { cellWidth: 48 },
      3: { cellWidth: 36 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [16, 110, 68], cellWidth: 28 }, // Check-In Highlight
      6: { halign: 'center', fontStyle: 'bold', textColor: [30, 64, 175], cellWidth: 28 }, // Check-Out Highlight
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
      9: { halign: 'center', cellWidth: 22 },
      10: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.includes('HADIR')) {
          data.cell.styles.fillColor = [240, 253, 244];
        } else if (text.includes('TERLAMBAT')) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
        } else if (text.includes('BELUM')) {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [159, 18, 57];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 28 },
  });

  // Calculate summary counts
  const totalCount = dailyList.length;
  const hadirCount = dailyList.filter(i => i.record?.status === 'HADIR').length;
  const telatCount = dailyList.filter(i => i.record?.status === 'TERLAMBAT').length;
  const izinCount = dailyList.filter(i => ['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(i.record?.status || '')).length;
  const belumCount = Math.max(0, totalCount - (hadirCount + telatCount + izinCount));

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If table is close to bottom, add new page for signature block
  if (finalY > pageHeight - 38) {
    doc.addPage();
  }

  const currentY = finalY > pageHeight - 38 ? 20 : finalY;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Summary box
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Ringkasan: Total GTK: ${totalCount} | Hadir Tepat: ${hadirCount} | Terlambat: ${telatCount} | Izin/Sakit/DL: ${izinCount} | Belum Presensi: ${belumCount}`, 14, currentY);

  // Signatures
  const sigY = currentY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Left: Tata Usaha
  doc.text('Mengetahui / Mengesahkan,', 25, sigY);
  doc.text('Kepala Tata Usaha / Operator Simpatika', 25, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.tuAdminName, 25, sigY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.tuAdminNip || '-'}`, 25, sigY + 26);

  // Right: Kepala Madrasah
  doc.text(`${profile.village}, ${formattedDate}`, pageWidth - 80, sigY);
  doc.text(profile.headmasterSignatureTitle || 'Kepala Madrasah', pageWidth - 80, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.headmasterName, pageWidth - 80, sigY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.headmasterNip || '-'}`, pageWidth - 80, sigY + 26);

  doc.save(`Jurnal_Presensi_GTK_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`);
}

// Helper to render one full page of teacher monthly fingerprint slip
export function renderTeacherSlipPage(
  doc: jsPDF,
  profile: MadrasahProfile,
  teacher: Teacher,
  year: number,
  month: number,
  dailyRows: TeacherMonthlyDailyRow[],
  stats: TeacherMonthlyStats,
  schedule?: WorkSchedule
) {
  const monthName = INDONESIAN_MONTHS[month - 1];
  drawMadrasahKop(
    doc,
    profile,
    'LAPORAN LOG PRESENSI FINGERPRINT GTK',
    `Periode Bulan: ${monthName} ${year} | Format Standar Simpatika & Mesin Presensi`
  );

  // Teacher Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 49, 182, 19, 2, 2, 'FD');

  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Nama Lengkap', 18, 54);
  doc.text('NIP / NUPTK', 18, 59);
  doc.text('NPK / PegID', 18, 64);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${teacher.name}, ${teacher.title}`, 42, 54);
  doc.text(`: ${teacher.nip || teacher.nuptk || '-'}`, 42, 59);
  doc.text(`: ${teacher.npk || teacher.pegId || '-'}`, 42, 64);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Jabatan / Mapel', 110, 54);
  doc.text('Status Pegawai', 110, 59);
  doc.text('ID Mesin Finger', 110, 64);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${teacher.position}`, 136, 54);
  doc.text(`: ${teacher.employmentStatus} (JTM: ${teacher.teachingHoursPerWeek} Jam)`, 136, 59);
  doc.text(`: #${teacher.fingerprintId}`, 136, 64);

  // Table of all 1..31 days with exact requested columns:
  // TANGGAL, HARI, JAM MASUK, ABSEN MASUK, TELAT/ CEPAT (Menit), JAM PULANG, ABSEN PULANG, PSW/ LEWAT WAKTU (Menit), KETERANGAN
  const tableRows = dailyRows.map((row) => {
    const rec = row.record;
    const d = new Date(year, month - 1, row.day);
    const dayOfWeek = d.getDay();

    let jamMasuk = row.jamMasuk;
    let jamPulang = row.jamPulang;

    if (!jamMasuk || !jamPulang) {
      if (schedule) {
        const schedTimes = getScheduleTimesForDay(schedule, dayOfWeek);
        jamMasuk = schedTimes.jamMasuk;
        jamPulang = schedTimes.jamPulang;
      } else {
        jamMasuk = dayOfWeek === 0 ? '-' : '07:00';
        jamPulang = dayOfWeek === 0 ? '-' : (dayOfWeek === 5 ? '11:30' : (dayOfWeek === 6 ? '13:00' : '14:00'));
      }
    }

    const absenMasuk = row.absenMasuk || (rec?.checkInTime ? rec.checkInTime : '-');
    const absenPulang = row.absenPulang || (rec?.checkOutTime ? rec.checkOutTime : '-');

    let telatCepat = row.telatCepat;
    if (!telatCepat) {
      if (rec?.checkInTime && jamMasuk !== '-') {
        const res = getTelatCepatCalc(rec.checkInTime, jamMasuk);
        telatCepat = res.text;
      } else {
        telatCepat = '-';
      }
    }

    let pswLewat = row.pswLewat;
    if (!pswLewat) {
      if (rec?.checkOutTime && jamPulang !== '-') {
        const res = getPswLewatCalc(rec.checkOutTime, jamPulang);
        pswLewat = res.text;
      } else {
        pswLewat = '-';
      }
    }

    let keterangan = row.keterangan;
    if (!keterangan) {
      if (row.isSunday) {
        keterangan = 'Libur Akhir Pekan (Ahad)';
      } else if (row.holiday) {
        keterangan = `Libur: ${row.holiday.name}`;
      } else if (rec) {
        if (rec.notes) {
          keterangan = `${rec.status}: ${rec.notes}`;
        } else if (rec.status === 'HADIR') {
          keterangan = 'Hadir (Fingerprint)';
        } else if (rec.status === 'TERLAMBAT') {
          keterangan = `Terlambat (${rec.lateMinutes || 0} mnt)`;
        } else {
          keterangan = rec.status;
        }
      } else {
        keterangan = '-';
      }
    }

    return [
      row.day.toString(),
      row.dayName,
      jamMasuk || '-',
      absenMasuk || '-',
      telatCepat || '-',
      jamPulang || '-',
      absenPulang || '-',
      pswLewat || '-',
      keterangan || '-'
    ];
  });

  autoTable(doc, {
    startY: 71,
    head: [[
      'TANGGAL',
      'HARI',
      'JAM MASUK',
      'ABSEN MASUK',
      'TELAT/ CEPAT\n(Menit)',
      'JAM PULANG',
      'ABSEN PULANG',
      'PSW/ LEWAT WAKTU\n(Menit)',
      'KETERANGAN'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 6.4,
      textColor: [30, 41, 59],
      cellPadding: 1.1,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', fontStyle: 'bold', textColor: [16, 110, 68], cellWidth: 18 },
      4: { halign: 'center', cellWidth: 23 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', fontStyle: 'bold', textColor: [30, 64, 175], cellWidth: 18 },
      7: { halign: 'center', cellWidth: 26 },
      8: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.includes('Telat') || text.includes('PSW')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Cepat') || text.includes('Lewat')) {
          data.cell.styles.textColor = [16, 110, 68];
        } else if (text.includes('Libur')) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (finalY > pageHeight - 36) {
    doc.addPage();
  }

  const currentY = finalY > pageHeight - 36 ? 18 : finalY;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Summary Banner
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kalkulasi Bulanan: Hadir Tepat: ${stats.countHadir} | Terlambat: ${stats.countTelat} (${stats.totalLateMinutes} mnt) | Izin: ${stats.countIzin} | Sakit: ${stats.countSakit} | DL: ${stats.countDL} | Alpa: ${stats.countAlpa} | Persentase: ${stats.attendanceRate}%`, 14, currentY);

  // Signatures
  const sigY = currentY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const placeName = profile.signaturePlace || profile.village;
  const isKepalaLeft = profile.signaturePosition !== 'GURU_KIRI_KEPALA_KANAN'; // Default: Kepala Kiri, Guru Kanan

  if (isKepalaLeft) {
    // LEFT: Kepala Madrasah
    const leftTitleLines = (profile.signatureLeftTitle || 'Mengetahui,\nKepala Madrasah').split('\n');
    leftTitleLines.forEach((l, i) => {
      doc.text(l, 25, sigY + (i * 4));
    });
    doc.setFont('helvetica', 'bold');
    doc.text(profile.headmasterName, 25, sigY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${profile.headmasterNip || '-'}`, 25, sigY + 22);

    // RIGHT: Guru Yang Bersangkutan (dengan Titimangsa)
    doc.text(`${placeName}, ${dailyRows.length} ${monthName} ${year}`, pageWidth - 75, sigY);
    const rightTitleLines = (profile.signatureRightTitle || 'Guru Yang Bersangkutan').split('\n');
    rightTitleLines.forEach((l, i) => {
      doc.text(l, pageWidth - 75, sigY + 4 + (i * 4));
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`${teacher.name}, ${teacher.title}`, pageWidth - 75, sigY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(getTeacherSignatureId(teacher), pageWidth - 75, sigY + 22);
  } else {
    // GURU KIRI, KEPALA KANAN
    const leftTitleLines = (profile.signatureRightTitle || 'Guru Yang Bersangkutan').split('\n');
    leftTitleLines.forEach((l, i) => {
      doc.text(l, 25, sigY + (i * 4));
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`${teacher.name}, ${teacher.title}`, 25, sigY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(getTeacherSignatureId(teacher), 25, sigY + 22);

    doc.text(`${placeName}, ${dailyRows.length} ${monthName} ${year}`, pageWidth - 75, sigY);
    const rightTitleLines = (profile.signatureLeftTitle || 'Mengetahui,\nKepala Madrasah').split('\n');
    rightTitleLines.forEach((l, i) => {
      doc.text(l, pageWidth - 75, sigY + 4 + (i * 4));
    });
    doc.setFont('helvetica', 'bold');
    doc.text(profile.headmasterName, pageWidth - 75, sigY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${profile.headmasterNip || '-'}`, pageWidth - 75, sigY + 22);
  }
}

// 2. Download Individual Teacher Attendance Slip / Card PDF (Format Log Mesin Fingerprint)
export function downloadIndividualTeacherSlipPDF(
  profile: MadrasahProfile,
  teacher: Teacher,
  year: number,
  month: number,
  dailyRows: TeacherMonthlyDailyRow[],
  stats: TeacherMonthlyStats,
  schedule?: WorkSchedule
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  renderTeacherSlipPage(doc, profile, teacher, year, month, dailyRows, stats, schedule);

  const monthName = INDONESIAN_MONTHS[month - 1];
  doc.save(`Slip_Presensi_${teacher.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.pdf`);
}

// 2b. Download Batch Monthly Attendance Slips for All Teachers (Multi-page PDF)
export function downloadBatchTeacherSlipsPDF(
  profile: MadrasahProfile,
  teachers: Teacher[],
  year: number,
  month: number,
  attendanceRecords: AttendanceRecord[],
  holidays: HolidayItem[],
  schedule: WorkSchedule
) {
  if (teachers.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  teachers.forEach((teacher, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'portrait');
    }
    const { dailyRows, stats } = getTeacherMonthlyDailyRows(
      year,
      month,
      teacher,
      attendanceRecords,
      holidays,
      schedule
    );
    renderTeacherSlipPage(doc, profile, teacher, year, month, dailyRows, stats, schedule);
  });

  const monthName = INDONESIAN_MONTHS[month - 1];
  doc.save(`Laporan_Presensi_Bulanan_Seluruh_Guru_${monthName}_${year}.pdf`);
}

// 3. Download Monthly Summary Matrix PDF
export function downloadMonthlyMatrixPDF(
  profile: MadrasahProfile,
  year: number,
  month: number,
  matrix: {
    summaries: any[];
    effectiveDaysCount: number;
    daysCount: number;
  }
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const monthName = INDONESIAN_MONTHS[month - 1];
  drawMadrasahKop(
    doc,
    profile,
    'REKAPITULASI PRESENSI KEHADIRAN GURU & TENAGA KEPENDIDIKAN (GTK)',
    `Periode Bulan: ${monthName} ${year} | Hari Efektif: ${matrix.effectiveDaysCount} Hari | Standar Simpatika & EMIS`
  );

  const tableRows = matrix.summaries.map((s, idx) => {
    return [
      (idx + 1).toString(),
      `${s.teacher.name}, ${s.teacher.title}\nNIP: ${s.teacher.nip || s.teacher.nuptk || '-'}`,
      s.teacher.position,
      s.teacher.employmentStatus,
      s.teacher.teachingHoursPerWeek?.toString() || '0',
      s.hadir.toString(),
      s.terlambat.toString(),
      s.izin.toString(),
      s.sakit.toString(),
      s.cuti.toString(),
      s.dinasLuar.toString(),
      s.alpa.toString(),
      s.totalHadir.toString(),
      `${s.attendancePercentage}%`,
      `${s.totalLateMinutes} m`,
      `${s.totalWorkHours} Jam`
    ];
  });

  autoTable(doc, {
    startY: 49,
    head: [[
      'No',
      'Nama GTK & NIP/NUPTK',
      'Jabatan / Tugas',
      'Status',
      'JTM',
      'Hadir Tepat',
      'Telat',
      'Izin',
      'Sakit',
      'Cuti',
      'DL',
      'Alpa',
      'Total Hadir',
      '% Hadir',
      'Total Telat',
      'Total Jam'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [16, 110, 68], cellWidth: 15 },
      6: { halign: 'center', textColor: [146, 64, 14], cellWidth: 12 },
      7: { halign: 'center', cellWidth: 10 },
      8: { halign: 'center', cellWidth: 10 },
      9: { halign: 'center', cellWidth: 10 },
      10: { halign: 'center', cellWidth: 10 },
      11: { halign: 'center', textColor: [159, 18, 57], cellWidth: 10 },
      12: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      13: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      14: { halign: 'center', cellWidth: 16 },
      15: { halign: 'center', cellWidth: 16 }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  if (finalY > pageHeight - 34) {
    doc.addPage();
  }

  const currentY = finalY > pageHeight - 34 ? 18 : finalY;
  const sigY = currentY + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text('Mengetahui,', 25, sigY);
  doc.text(profile.headmasterSignatureTitle || 'Kepala Madrasah', 25, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.headmasterName, 25, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.headmasterNip || '-'}`, 25, sigY + 24);

  doc.text(`${profile.village}, ${matrix.daysCount} ${monthName} ${year}`, pageWidth - 80, sigY);
  doc.text('Kepala Tata Usaha / Operator Simpatika', pageWidth - 80, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.tuAdminName, pageWidth - 80, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.tuAdminNip || '-'}`, pageWidth - 80, sigY + 24);

  doc.save(`Rekap_Presensi_Bulanan_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.pdf`);
}

// 4. Download Official SPTJM PDF
export function downloadSptjmPDF(
  profile: MadrasahProfile,
  letterNumber: string,
  purpose: string,
  monthName: string,
  year: number,
  summaries: any[],
  effectiveDaysCount: number
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawMadrasahKop(
    doc,
    profile,
    'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)',
    `Nomor: ${letterNumber}`
  );

  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  let curY = 51;
  doc.text('Yang bertanda tangan di bawah ini:', 14, curY);

  curY += 5;
  const idFields = [
    ['Nama Lengkap', `: ${profile.headmasterName}`],
    ['NIP / NUPTK', `: ${profile.headmasterNip || profile.headmasterNuptk || '-'}`],
    ['Jabatan', `: ${profile.headmasterSignatureTitle || 'Kepala Madrasah'}`],
    ['Nama Madrasah', `: ${profile.name}`],
    ['NSM / NPSN', `: ${profile.nsm} / ${profile.npsn}`],
    ['Alamat Madrasah', `: ${profile.address}, ${profile.city}`]
  ];

  idFields.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(k, 18, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(v, 55, curY);
    curY += 4.2;
  });

  curY += 2;
  doc.text('Dengan ini menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:', 14, curY);

  curY += 4.5;
  const points = [
    `1. Data kehadiran Guru & Tenaga Kependidikan pada ${profile.name} untuk bulan ${monthName} ${year} (Hari Efektif: ${effectiveDaysCount} hari) adalah BENAR dan sesuai rekaman mesin fingerprint.`,
    `2. Seluruh guru telah melaksanakan tugas pembelajaran/tambahan sesuai beban kerja guru (JTM) yang dipersyaratkan.`,
    `3. Laporan kehadiran ini dipergunakan sebagai dasar kelengkapan administrasi ${purpose}.`,
    `4. Apabila di kemudian hari terbukti manipulasi data, saya bersedia bertanggung jawab penuh secara hukum.`
  ];

  points.forEach(pt => {
    const splitLines = doc.splitTextToSize(pt, 182);
    doc.text(splitLines, 14, curY);
    curY += (splitLines.length * 3.8) + 1.5;
  });

  doc.text('Demikian Surat Pernyataan Tanggung Jawab Mutlak ini saya buat dengan sadar untuk dipergunakan sebagaimana mestinya.', 14, curY);

  // Attached Table
  const tableRows = summaries.map((s, idx) => [
    (idx + 1).toString(),
    `${s.teacher.name}, ${s.teacher.title}\nNIP: ${s.teacher.nip || s.teacher.nuptk || '-'}`,
    s.teacher.position,
    s.teacher.employmentStatus,
    s.totalHadir.toString(),
    (s.izin + s.sakit + s.cuti).toString(),
    s.dinasLuar.toString(),
    s.alpa.toString(),
    `${s.attendancePercentage}%`,
    s.attendancePercentage >= 85 ? 'MEMENUHI' : 'BELUM'
  ]);

  autoTable(doc, {
    startY: curY + 4,
    head: [[
      'No',
      'Nama GTK / NIP',
      'Jabatan',
      'Status',
      'Hadir',
      'I/S/C',
      'DL',
      'Alpa',
      '% Hadir',
      'Ket. TPG'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 50 },
      2: { cellWidth: 38 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 10 },
      7: { halign: 'center', cellWidth: 10 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 14 }
    },
    margin: { left: 14, right: 14, bottom: 28 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  if (finalY > pageHeight - 34) {
    doc.addPage();
  }

  const currentYAfter = finalY > pageHeight - 34 ? 18 : finalY;
  const sigY = currentYAfter + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.text('Mengetahui / Menyetujui,', 25, sigY);
  doc.text('Ketua Yayasan / Pengawas Madrasah', 25, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('....................................................', 25, sigY + 20);

  doc.text(`${profile.village}, ${summaries.length > 0 ? '31' : '30'} ${monthName} ${year}`, pageWidth - 75, sigY);
  doc.text(profile.headmasterSignatureTitle || 'Kepala Madrasah', pageWidth - 75, sigY + 4);

  // Materai box
  doc.setDrawColor(150, 150, 150);
  doc.roundedRect(pageWidth - 75, sigY + 6, 20, 10, 1, 1);
  doc.setFontSize(5.5);
  doc.text('MATERAI 10000', pageWidth - 74, sigY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.headmasterName, pageWidth - 75, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.headmasterNip || '-'}`, pageWidth - 75, sigY + 24);

  doc.save(`SPTJM_Presensi_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.pdf`);
}

// 7. Download Biodata & Profil GTK PDF (With auto teacher & headmaster signatures)
export function downloadTeacherBiodataPDF(
  profile: MadrasahProfile,
  teacher: Teacher
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawMadrasahKop(
    doc,
    profile,
    'BIODATA & PROFIL RESMI GURU / TENAGA KEPENDIDIKAN (GTK)',
    `Tahun Pelajaran ${profile.academicYear || '2025/2026'}`
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 52;

  const dataRows = [
    ['1', 'Nama Lengkap GTK', `${teacher.name}${teacher.title ? `, ${teacher.title}` : ''}`],
    ['2', 'Nomor Induk Kependudukan (NIK)', teacher.nik || '-'],
    ['3', 'Nomor Induk Pegawai (NIP)', teacher.nip || '-'],
    ['4', 'Nomor Unik Pendidik & Tenaga Kependidikan (NUPTK)', teacher.nuptk || '-'],
    ['5', 'NPK Kemenag / PegID Simpatika', teacher.npk || teacher.pegId || '-'],
    ['6', 'Jabatan / Tugas Utama', teacher.position || 'Guru'],
    ['7', 'Status Kepegawaian', teacher.employmentStatus || 'GTY'],
    ['8', 'Beban Jam Mengajar (JTM)', `${teacher.teachingHoursPerWeek || 24} Jam / Minggu`],
    ['9', 'Jenis Kelamin', teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
    ['10', 'No. WhatsApp / HP', teacher.phone || '-'],
    ['11', 'Alamat Email', teacher.email || '-'],
    ['12', 'ID Biometrik Mesin Fingerprint', `#${teacher.fingerprintId} (Terdaftar & Aktif)`],
    ['13', 'Unit Kerja / Madrasah', profile.name],
    ['14', 'NSM / NPSN', `${profile.nsm} / ${profile.npsn}`],
  ];

  autoTable(doc, {
    startY: curY,
    head: [['No', 'Komponen Data GTK', 'Keterangan & Rincian']],
    body: dataRows,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 102 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const sigY = finalY > 230 ? 230 : finalY;

  const todayStr = formatIndonesianDate(new Date().toISOString().split('T')[0]);

  // Signatures
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  // Left: Mengetahui Kepala Madrasah
  doc.text('Mengetahui,', 25, sigY);
  doc.text(profile.headmasterSignatureTitle || 'Kepala Madrasah', 25, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.headmasterName, 25, sigY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile.headmasterNip || profile.headmasterNuptk || '-'}`, 25, sigY + 26);

  // Right: Guru yang bersangkutan
  doc.text(`${profile.village || profile.city || 'Sanggreman'}, ${todayStr}`, pageWidth - 78, sigY);
  doc.text('Guru / Tenaga Kependidikan,', pageWidth - 78, sigY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`${teacher.name}${teacher.title ? `, ${teacher.title}` : ''}`, pageWidth - 78, sigY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(getTeacherSignatureId(teacher), pageWidth - 78, sigY + 26);

  doc.save(`Biodata_GTK_${teacher.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

