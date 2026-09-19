import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Login } from './components/Login';
import { KioskFingerprint } from './components/KioskFingerprint';
import { RekapBulanan } from './components/RekapBulanan';
import { LaporanHarian } from './components/LaporanHarian';
import { DataGuru } from './components/DataGuru';
import { CetakSPTJM } from './components/CetakSPTJM';
import { KartuPresensi } from './components/KartuPresensi';
import { PengajuanIzin } from './components/PengajuanIzin';
import { ImportMesinLog } from './components/ImportMesinLog';
import { AsistenAI } from './components/AsistenAI';
import { PengaturanMadrasah } from './components/PengaturanMadrasah';
import { PleskExportModal } from './components/PleskExportModal';
import { MenuGridLauncher } from './components/MenuGridLauncher';
import { InitialPageLoader } from './components/InitialPageLoader';

import { 
  Teacher, 
  AttendanceRecord, 
  LeaveRequest, 
  WorkSchedule, 
  MadrasahProfile, 
  HolidayItem 
} from './types';

import { 
  initialMadrasahProfile, 
  initialSchedule, 
  initialTeachers, 
  initialHolidays, 
  initialLeaveRequests,
  generateInitialAttendanceHistory
} from './data/initialData';
import { getLocalDateString, isTeacherRecordMatch } from './utils/attendanceUtils';

export default function App() {
  // State with LocalStorage fallbacks
  const [profile, setProfile] = useState<MadrasahProfile>(() => {
    const saved = localStorage.getItem('simpresensi_profile');
    if (saved) {
      try {
        const parsed: MadrasahProfile = JSON.parse(saved);
        return parsed;
      } catch (e) {
        return initialMadrasahProfile;
      }
    }
    return initialMadrasahProfile;
  });

  const [schedule, setSchedule] = useState<WorkSchedule>(() => {
    const saved = localStorage.getItem('simpresensi_schedule');
    return saved ? JSON.parse(saved) : initialSchedule;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('simpresensi_teachers');
    if (saved) {
      try {
        const parsed: Teacher[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out old mock / legacy system accounts
          const cleaned = parsed.filter(t => 
            t.id !== 'gtk-01' && 
            t.id !== 'gtk-02' && 
            t.id !== 'gtk-03' && 
            t.id !== 'gtk-04' && 
            t.id !== 'gtk-001' &&
            t.id !== 'admin-madrasah' &&
            t.id !== 'gtk-siti-rochimah' &&
            t.name !== 'Siti Rochimah, S.Pd.I.' &&
            t.name !== 'Ahmad Fauzi, M.Pd.' &&
            t.name !== 'Nurul Hidayati, S.Kom.' &&
            t.name !== 'Muhammad Ridwan, S.Pd.'
          );
          localStorage.setItem('simpresensi_teachers', JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {
        // Fallback to initialTeachers
      }
    }
    return initialTeachers;
  });

  // Current Logged In User State (Requires login when accessing for the first time)
  const [currentUser, setCurrentUser] = useState<Teacher | null>(() => {
    const savedUser = localStorage.getItem('simpresensi_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return parsed;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('simpresensi_records');
    return saved ? JSON.parse(saved) : generateInitialAttendanceHistory();
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('simpresensi_leaves');
    return saved ? JSON.parse(saved) : initialLeaveRequests;
  });

  const [holidays, setHolidays] = useState<HolidayItem[]>(() => {
    const saved = localStorage.getItem('simpresensi_holidays');
    return saved ? JSON.parse(saved) : initialHolidays;
  });

  const [activeTab, setActiveTab] = useState<string>('kiosk');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isPleskModalOpen, setIsPleskModalOpen] = useState<boolean>(false);
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastServerVersion, setLastServerVersion] = useState<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  const isGuru = currentUser?.role === 'GURU';
  const isKepalaMadrasah = currentUser?.role === 'KEPALA_MADRASAH';
  const isSuperAdmin = 
    currentUser?.email === 'jaenalmaskun@gmail.com' || 
    currentUser?.id === 'super-admin-jaenal' || 
    currentUser?.nik === '3302010000009999';

  // Function to push updates to centralized server backend (Supports Node.js Express & Plesk PHP MySQL)
  const pushToServer = async (overrideData?: any) => {
    try {
      setServerSyncStatus('syncing');
      isSyncingRef.current = true;
      const payload = {
        profile,
        schedule,
        teachers,
        attendanceRecords,
        leaveRequests,
        holidays,
        ...(overrideData || {}),
      };

      // 1. Try Node.js Express endpoint
      let pushed = false;
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
          const json = await res.json();
          if (json.version) setLastServerVersion(json.version);
          setServerSyncStatus('synced');
          pushed = true;
        }
      } catch (nodeErr) {
        // Continue to PHP fallback
      }

      // 2. Fallback to Plesk/cPanel PHP MySQL endpoint
      if (!pushed) {
        try {
          const phpRes = await fetch('api.php?action=sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const cType = phpRes.headers.get('content-type') || '';
          if (phpRes.ok && cType.includes('application/json')) {
            const json = await phpRes.json();
            if (json.version) setLastServerVersion(json.version);
            setServerSyncStatus('synced');
            pushed = true;
          }
        } catch (phpErr) {
          // Log fallback failure
        }
      }

      if (!pushed) {
        setServerSyncStatus('offline');
      }
    } catch (e) {
      console.warn('Sync to server failed:', e);
      setServerSyncStatus('offline');
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 500);
    }
  };

  // Helper to fetch data from either Node.js or Plesk PHP backend
  const fetchUniversalServerData = async () => {
    // Try Node.js first
    try {
      const res = await fetch('/api/data');
      const cType = res.headers.get('content-type') || '';
      if (res.ok && cType.includes('application/json')) {
        const json = await res.json();
        if (json?.data) return json.data;
      }
    } catch (e) {}

    // Fallback to Plesk PHP MySQL
    try {
      const phpRes = await fetch('api.php?action=get_initial_data');
      const cType = phpRes.headers.get('content-type') || '';
      if (phpRes.ok && cType.includes('application/json')) {
        const json = await phpRes.json();
        if (json?.data) return json.data;
      }
    } catch (e) {}

    return null;
  };

  // Helper function to safely merge remote attendance records with local attendance records
  const mergeAttendanceWithLocal = (serverRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach(r => {
        const key = r.id || `${r.teacherId}_${r.date}`;
        map.set(key, r);
      });
      serverRecords.forEach(r => {
        const key = r.id || `${r.teacherId}_${r.date}`;
        map.set(key, r);
      });
      const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      localStorage.setItem('simpresensi_records', JSON.stringify(merged));
      return merged;
    });
  };

  // Initial Sync from Server on Mount with Bidirectional Merge
  useEffect(() => {
    let isMounted = true;

    async function initialFetchAndMerge() {
      try {
        setServerSyncStatus('syncing');
        const sData = await fetchUniversalServerData();

        if (sData && isMounted) {
          // 1. Authoritative Teachers sync from server
          if (Array.isArray(sData.teachers)) {
            setTeachers(sData.teachers);
            localStorage.setItem('simpresensi_teachers', JSON.stringify(sData.teachers));
          }

          // 2. Attendance with smart local merge
          if (Array.isArray(sData.attendanceRecords)) {
            mergeAttendanceWithLocal(sData.attendanceRecords);
          }
          if (Array.isArray(sData.leaveRequests)) setLeaveRequests(sData.leaveRequests);
          if (Array.isArray(sData.holidays)) setHolidays(sData.holidays);
          if (sData.profile) setProfile(sData.profile);
          if (sData.schedule) setSchedule(sData.schedule);

          setLastServerVersion(sData.version || 1);
          setServerSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Initial server fetch error:', err);
        setServerSyncStatus('offline');
      }
    }

    initialFetchAndMerge();

    // Fast sync when browser tab gains focus or visibility
    const handleFocusSync = async () => {
      const fresh = await fetchUniversalServerData();
      if (fresh) {
        if (Array.isArray(fresh.teachers)) {
          setTeachers(fresh.teachers);
          localStorage.setItem('simpresensi_teachers', JSON.stringify(fresh.teachers));
        }
        if (Array.isArray(fresh.attendanceRecords)) {
          mergeAttendanceWithLocal(fresh.attendanceRecords);
        }
        if (Array.isArray(fresh.leaveRequests)) setLeaveRequests(fresh.leaveRequests);
        if (Array.isArray(fresh.holidays)) setHolidays(fresh.holidays);
        if (fresh.profile && activeTab !== 'pengaturan') setProfile(fresh.profile);
        if (fresh.schedule && activeTab !== 'pengaturan') setSchedule(fresh.schedule);
        setLastServerVersion(fresh.version || 1);
        setServerSyncStatus('synced');
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocusSync();
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusSync);
    };
  }, [activeTab]);

  // Multi-Device Real-Time Polling Sync (Checks every 3s for data changes made on other devices)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSyncingRef.current) return;

      try {
        let remoteVersion: number | null = null;

        // Try Node.js version
        try {
          const vRes = await fetch('/api/data/version');
          const cType = vRes.headers.get('content-type') || '';
          if (vRes.ok && cType.includes('application/json')) {
            const vJson = await vRes.json();
            if (vJson.version) remoteVersion = vJson.version;
          }
        } catch (e) {}

        // Try PHP MySQL version
        if (remoteVersion === null) {
          try {
            const phpV = await fetch('api.php?action=version');
            const cType = phpV.headers.get('content-type') || '';
            if (phpV.ok && cType.includes('application/json')) {
              const vJson = await phpV.json();
              if (vJson.version) remoteVersion = vJson.version;
            }
          } catch (e) {}
        }
        
        // If server version is newer, pull the fresh state
        if (remoteVersion && remoteVersion > lastServerVersion) {
          const fresh = await fetchUniversalServerData();
          if (fresh) {
            if (Array.isArray(fresh.teachers)) {
              setTeachers(fresh.teachers);
              localStorage.setItem('simpresensi_teachers', JSON.stringify(fresh.teachers));
            }
            if (Array.isArray(fresh.attendanceRecords)) {
              mergeAttendanceWithLocal(fresh.attendanceRecords);
            }
            if (Array.isArray(fresh.leaveRequests)) setLeaveRequests(fresh.leaveRequests);
            if (Array.isArray(fresh.holidays)) setHolidays(fresh.holidays);
            if (fresh.profile && activeTab !== 'pengaturan') setProfile(fresh.profile);
            if (fresh.schedule && activeTab !== 'pengaturan') setSchedule(fresh.schedule);
            setLastServerVersion(fresh.version || remoteVersion);
            setServerSyncStatus('synced');
          }
        }
      } catch (e) {
        // Silent error for background polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lastServerVersion, activeTab]);

  // Role Tab Protection: Hide Pengaturan from GURU and KEPALA_MADRASAH
  useEffect(() => {
    if (isGuru && !['kiosk', 'guru', 'kartu', 'rekap', 'izin'].includes(activeTab)) {
      setActiveTab('kiosk');
    } else if (isKepalaMadrasah && activeTab === 'pengaturan') {
      setActiveTab('kiosk');
    }
  }, [isGuru, isKepalaMadrasah, activeTab]);

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('simpresensi_profile', JSON.stringify(profile));

    // Dynamic Title & Favicon Update
    if (profile.name) {
      document.title = `SIMPRESENSI GTK - ${profile.name}`;
    }

    const faviconTarget = profile.faviconUrl || profile.logoUrl || '/favicon.svg';
    const iconLinks = document.querySelectorAll("link[rel*='icon']");
    if (iconLinks.length > 0) {
      iconLinks.forEach((el) => {
        (el as HTMLLinkElement).href = faviconTarget;
      });
    } else {
      let link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconTarget;
      document.head.appendChild(link);
    }

    if (profile.ogImageUrl) {
      let ogImgMeta: HTMLMetaElement | null = document.querySelector("meta[property='og:image']");
      if (!ogImgMeta) {
        ogImgMeta = document.createElement('meta');
        ogImgMeta.setAttribute('property', 'og:image');
        document.head.appendChild(ogImgMeta);
      }
      ogImgMeta.content = profile.ogImageUrl;
    }
  }, [profile]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('simpresensi_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('simpresensi_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('simpresensi_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('simpresensi_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('simpresensi_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('simpresensi_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('simpresensi_holidays', JSON.stringify(holidays));
  }, [holidays]);

  // Today statistics
  const todayStr = getLocalDateString();
  const todayRecords = (attendanceRecords || []).filter(r => r && r.date === todayStr);
  const countHadir = todayRecords.filter(r => r && r.status === 'HADIR').length;
  const countTelat = todayRecords.filter(r => r && r.status === 'TERLAMBAT').length;
  const countIzin = todayRecords.filter(r => r && ['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(r.status)).length;
  const countBelum = Math.max(0, (teachers || []).length - (countHadir + countTelat + countIzin));

  // Strict role-based datasets for teacher vs admin views
  const visibleTeachers = React.useMemo(() => {
    if (isGuru && currentUser) {
      const match = (teachers || []).find(
        (t) =>
          t.id === currentUser.id ||
          (currentUser.nik && t.nik === currentUser.nik) ||
          (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
      );
      return match ? [match] : [currentUser];
    }
    return teachers;
  }, [isGuru, currentUser, teachers]);

  const visibleAttendanceRecords = React.useMemo(() => {
    if (isGuru && currentUser) {
      const targetTeacher = visibleTeachers[0] || currentUser;
      return (attendanceRecords || []).filter((r) => 
        isTeacherRecordMatch(r.teacherId, targetTeacher) ||
        (targetTeacher.nik && r.teacherId === targetTeacher.nik) ||
        (targetTeacher.fingerprintId && r.teacherId === String(targetTeacher.fingerprintId))
      );
    }
    return attendanceRecords;
  }, [isGuru, currentUser, attendanceRecords, visibleTeachers]);

  const visibleLeaveRequests = React.useMemo(() => {
    if (isGuru && currentUser) {
      const targetTeacher = visibleTeachers[0] || currentUser;
      return (leaveRequests || []).filter((l) => 
        isTeacherRecordMatch(l.teacherId, targetTeacher) ||
        (targetTeacher.nik && l.teacherId === targetTeacher.nik)
      );
    }
    return leaveRequests;
  }, [isGuru, currentUser, leaveRequests, visibleTeachers]);

  // Personalized stats for Navbar & Menu
  const userTodayRecord = (visibleAttendanceRecords || []).find(r => r && r.date === todayStr);
  const displayStats = isGuru
    ? {
        total: 1,
        present: userTodayRecord?.status === 'HADIR' ? 1 : 0,
        late: userTodayRecord?.status === 'TERLAMBAT' ? 1 : 0,
        permission: ['IZIN', 'SAKIT', 'CUTI', 'DINAS_LUAR'].includes(userTodayRecord?.status || '') ? 1 : 0,
        absent: !userTodayRecord ? 1 : 0,
      }
    : {
        total: (teachers || []).length,
        present: countHadir,
        late: countTelat,
        permission: countIzin,
        absent: countBelum,
      };

  const handleUpdateProfile = async (updatedProfile: MadrasahProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('simpresensi_profile', JSON.stringify(updatedProfile));
    
    // Update logged in admin account info if matching
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.id === 'admin-madrasah')) {
      if (updatedProfile.headmasterName) {
        const updatedAdminUser: Teacher = {
          ...currentUser,
          name: updatedProfile.headmasterName,
          email: updatedProfile.email || currentUser.email,
          phone: updatedProfile.phone || currentUser.phone,
        };
        setCurrentUser(updatedAdminUser);
        localStorage.setItem('simpresensi_current_user', JSON.stringify(updatedAdminUser));
      }
    }

    // Atomic direct save to server endpoint
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile }),
      });
    } catch (e) {
      console.warn('Direct profile POST failed:', e);
    }

    pushToServer({ profile: updatedProfile });
  };

  const handleUpdateSchedule = async (updatedSchedule: WorkSchedule) => {
    setSchedule(updatedSchedule);
    localStorage.setItem('simpresensi_schedule', JSON.stringify(updatedSchedule));

    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: updatedSchedule }),
      });
    } catch (e) {
      console.warn('Direct schedule POST failed:', e);
    }

    pushToServer({ schedule: updatedSchedule });
  };

  // Handlers with automatic cloud synchronization across devices
  const handleRecordAttendance = (newRecord: AttendanceRecord) => {
    setAttendanceRecords(prev => {
      const idx = prev.findIndex(r => r.id === newRecord.id || (r.teacherId === newRecord.teacherId && r.date === newRecord.date));
      let updated: AttendanceRecord[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = newRecord;
      } else {
        updated = [newRecord, ...prev];
      }
      localStorage.setItem('simpresensi_records', JSON.stringify(updated));
      pushToServer({ attendanceRecords: updated });
      return updated;
    });

    // Immediate atomic push to server endpoints
    try {
      fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});
      fetch('api.php?action=save_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});
    } catch (e) {}
  };

  const handleBatchAddOrUpdateRecords = (newRecords: AttendanceRecord[]) => {
    if (!newRecords || newRecords.length === 0) return;
    setAttendanceRecords(prev => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach(r => {
        const key = `${r.teacherId}_${r.date}`;
        map.set(key, r);
      });
      newRecords.forEach(r => {
        const key = `${r.teacherId}_${r.date}`;
        map.set(key, r);
      });
      const updated = Array.from(map.values());
      localStorage.setItem('simpresensi_records', JSON.stringify(updated));
      pushToServer({ attendanceRecords: updated });
      return updated;
    });

    try {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceRecords: newRecords }),
      }).catch(() => {});
      fetch('api.php?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceRecords: newRecords }),
      }).catch(() => {});
    } catch (e) {}
  };

  const handleAddTeacher = (newTeacher: Teacher) => {
    setTeachers(prev => {
      const updated = [...prev, newTeacher];
      pushToServer({ teachers: updated });
      return updated;
    });
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers(prev => {
      const updated = prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
      pushToServer({ teachers: updated });
      return updated;
    });
  };

  const handleDeleteTeacher = async (id: string) => {
    const updated = teachers.filter(t => t.id !== id);
    setTeachers(updated);
    localStorage.setItem('simpresensi_teachers', JSON.stringify(updated));
    await pushToServer({ teachers: updated });

    // Explicit delete call to ensure removal from Node.js & MySQL backend
    try {
      fetch(`/api/teachers/${id}`, { method: 'DELETE' }).catch(() => {});
      fetch(`api.php?action=delete_teacher&id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
  };

  const handleBatchImportTeachers = (importedTeachers: Teacher[], _mode: 'append' | 'replace') => {
    // Permintaan user: "Terapkan agar timpa tidak menghilangkan data yang sudah ada"
    // Baik mode 'append' maupun 'replace' (timpa), lakukan smart upsert:
    // Menimpa/memperbarui data guru yang cocok, menambahkan guru baru, dan tetap menjaga guru lama yang sudah ada.
    setTeachers(prev => {
      const merged = [...prev];
      importedTeachers.forEach(newT => {
        const existingIdx = merged.findIndex(
          t => (newT.id && t.id === newT.id) ||
               (newT.nik && t.nik === newT.nik) ||
               (newT.fingerprintId && t.fingerprintId === newT.fingerprintId) ||
               (t.name.toLowerCase().trim() === newT.name.toLowerCase().trim())
        );
        if (existingIdx >= 0) {
          // Timpa nilai atribut yang cocok tanpa menghapus identitas atau relasi data lama
          merged[existingIdx] = { ...merged[existingIdx], ...newT };
        } else {
          merged.push(newT);
        }
      });

      // Pastikan akun super administrator Jaenal Maskun selalu terjaga
      const hasSuperAdmin = merged.some(t => t.id === 'super-admin-jaenal');
      if (!hasSuperAdmin) {
        const oldAdmin = prev.find(t => t.id === 'super-admin-jaenal');
        if (oldAdmin) merged.unshift(oldAdmin);
      }

      localStorage.setItem('simpresensi_teachers', JSON.stringify(merged));
      pushToServer({ teachers: merged });
      return merged;
    });
  };

  const handleAddLeaveRequest = (newLeave: LeaveRequest) => {
    setLeaveRequests(prev => {
      const updatedLeaves = [newLeave, ...prev];

      // If auto approved, also populate attendance records for those dates!
      if (newLeave.status === 'APPROVED') {
        const start = new Date(newLeave.startDate);
        const end = new Date(newLeave.endDate);
        const newAttendanceList: AttendanceRecord[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const statusMap: any = {
            'DINAS_LUAR': 'DINAS_LUAR',
            'SAKIT': 'SAKIT',
            'IZIN': 'IZIN',
            'CUTI': 'CUTI',
          };

          newAttendanceList.push({
            id: `att-${newLeave.teacherId}-${dateStr}`,
            teacherId: newLeave.teacherId,
            date: dateStr,
            status: statusMap[newLeave.type] || 'IZIN',
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            workDurationMinutes: newLeave.type === 'DINAS_LUAR' ? 420 : 0,
            verificationMethod: 'MANUAL_ADMIN',
            notes: `${newLeave.type}: ${newLeave.reason} ${newLeave.letterNumber ? `(${newLeave.letterNumber})` : ''}`,
          });
        }

        setAttendanceRecords(prevAtt => {
          const filtered = prevAtt.filter(r => 
            !(r.teacherId === newLeave.teacherId && r.date >= newLeave.startDate && r.date <= newLeave.endDate)
          );
          const updatedAtt = [...newAttendanceList, ...filtered];
          pushToServer({ leaveRequests: updatedLeaves, attendanceRecords: updatedAtt });
          return updatedAtt;
        });
      } else {
        pushToServer({ leaveRequests: updatedLeaves });
      }

      return updatedLeaves;
    });
  };

  const handleApproveLeave = (id: string) => {
    setLeaveRequests(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, status: 'APPROVED' as const } : r);
      pushToServer({ leaveRequests: updated });
      return updated;
    });
  };

  const handleRejectLeave = (id: string) => {
    setLeaveRequests(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, status: 'REJECTED' as const } : r);
      pushToServer({ leaveRequests: updated });
      return updated;
    });
  };

  const handleImportRecords = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach(r => map.set(`${r.teacherId}_${r.date}`, r));
      newRecords.forEach(r => map.set(`${r.teacherId}_${r.date}`, r));
      const updated = Array.from(map.values());
      pushToServer({ attendanceRecords: updated });
      return updated;
    });
  };

  const handleAddHoliday = (holiday: HolidayItem) => {
    setHolidays(prev => {
      const updated = [...prev, holiday];
      pushToServer({ holidays: updated });
      return updated;
    });
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays(prev => {
      const updated = prev.filter(h => h.id !== id);
      pushToServer({ holidays: updated });
      return updated;
    });
  };

  const handleExportAllData = () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile,
      schedule,
      teachers,
      attendanceRecords,
      leaveRequests,
      holidays,
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIMPRESENSI_BACKUP_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAllData = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.profile) setProfile(data.profile);
      if (data.schedule) setSchedule(data.schedule);
      if (data.teachers) setTeachers(data.teachers);
      if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
      if (data.leaveRequests) setLeaveRequests(data.leaveRequests);
      if (data.holidays) setHolidays(data.holidays);
      pushToServer(data);
    } catch (e) {
      alert('Format file JSON backup tidak valid!');
    }
  };

  const handleResetSampleData = () => {
    setProfile(initialMadrasahProfile);
    setSchedule(initialSchedule);
    setTeachers(initialTeachers);
    setAttendanceRecords(generateInitialAttendanceHistory());
    setLeaveRequests(initialLeaveRequests);
    setHolidays(initialHolidays);
    localStorage.clear();
    pushToServer({
      profile: initialMadrasahProfile,
      schedule: initialSchedule,
      teachers: initialTeachers,
      attendanceRecords: generateInitialAttendanceHistory(),
      leaveRequests: initialLeaveRequests,
      holidays: initialHolidays,
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('simpresensi_current_user');
      sessionStorage.removeItem('simpresensi_current_user');
    } catch (e) {
      console.warn('Gagal menghapus sesi login:', e);
    }
    setCurrentUser(null);
    setActiveTab('launcher');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, currentUser]);

  if (!currentUser) {
    return (
      <>
        {isInitialLoading && (
          <InitialPageLoader
            profile={profile}
            onFinish={() => setIsInitialLoading(false)}
          />
        )}
        <Login
          profile={profile}
          teachers={teachers}
          serverSyncStatus={serverSyncStatus}
          onManualSync={() => pushToServer()}
          onLogin={(loggedInTeacher) => {
            setCurrentUser(loggedInTeacher);
            setActiveTab('kiosk');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 font-sans flex flex-col antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {isInitialLoading && (
        <InitialPageLoader
          profile={profile}
          onFinish={() => setIsInitialLoading(false)}
        />
      )}
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPleskExport={() => setIsPleskModalOpen(true)}
        todayStats={displayStats}
      />

      {/* Super Admin Exclusive Plesk Package Modal */}
      <PleskExportModal
        isOpen={isPleskModalOpen}
        onClose={() => setIsPleskModalOpen(false)}
        currentUser={currentUser}
        profile={profile}
        schedule={schedule}
        teachers={teachers}
        attendanceRecords={attendanceRecords}
        leaveRequests={leaveRequests}
        holidays={holidays}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {/* Iconic Minimalist Grid Menu */}
        <MenuGridLauncher
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          currentUser={currentUser}
          teachers={visibleTeachers}
          attendanceRecords={visibleAttendanceRecords}
          leaveRequests={visibleLeaveRequests}
          serverSyncStatus={serverSyncStatus}
          onManualSync={() => pushToServer()}
          onLogout={handleLogout}
          todayStats={displayStats}
        />

        {/* Active Module Content Section */}
        <div id="active-module-content" className="transition-all duration-200">
          {activeTab === 'kiosk' && (
            <KioskFingerprint
              teachers={teachers}
              attendanceRecords={attendanceRecords}
              schedule={schedule}
              profile={profile}
              currentUser={currentUser}
              onRecordAttendance={handleRecordAttendance}
            />
          )}

          {activeTab === 'rekap' && (
            <RekapBulanan
              teachers={visibleTeachers}
              attendanceRecords={visibleAttendanceRecords}
              holidays={holidays}
              schedule={schedule}
              profile={profile}
              currentUser={currentUser}
              onUpdateRecord={handleRecordAttendance}
              onBatchAddOrUpdateRecords={handleBatchAddOrUpdateRecords}
            />
          )}

        {activeTab === 'harian' && (
          !isGuru ? (
            <LaporanHarian
              teachers={teachers}
              attendanceRecords={attendanceRecords}
              schedule={schedule}
              profile={profile}
              holidays={holidays}
              onAddOrUpdateRecord={handleRecordAttendance}
              onBatchAddOrUpdateRecords={handleBatchAddOrUpdateRecords}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-amber-200">
              <p className="text-amber-800 font-bold">Akses Dibatasi: Menu ini hanya untuk Administrator & Kepala Madrasah.</p>
            </div>
          )
        )}

        {activeTab === 'guru' && (
          <DataGuru
            teachers={visibleTeachers}
            profile={profile}
            currentUser={currentUser}
            serverSyncStatus={serverSyncStatus}
            onManualSync={() => pushToServer()}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onBatchImportTeachers={handleBatchImportTeachers}
            onClearAllTeachers={() => {
              setTeachers([]);
              setAttendanceRecords([]);
              setLeaveRequests([]);
              localStorage.removeItem('simpresensi_teachers');
              localStorage.removeItem('simpresensi_records');
              localStorage.removeItem('simpresensi_leaves');
              pushToServer({ teachers: [], attendanceRecords: [], leaveRequests: [] });
            }}
          />
        )}

        {activeTab === 'sptjm' && (
          !isGuru ? (
            <CetakSPTJM
              teachers={teachers}
              attendanceRecords={attendanceRecords}
              holidays={holidays}
              schedule={schedule}
              profile={profile}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-amber-200">
              <p className="text-amber-800 font-bold">Akses Dibatasi: Penerbitan SPTJM hanya oleh Kepala Madrasah.</p>
            </div>
          )
        )}

        {activeTab === 'kartu' && (
          <KartuPresensi
            teachers={visibleTeachers}
            attendanceRecords={visibleAttendanceRecords}
            holidays={holidays}
            schedule={schedule}
            profile={profile}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'izin' && (
          <PengajuanIzin
            teachers={visibleTeachers}
            leaveRequests={visibleLeaveRequests}
            profile={profile}
            currentUser={currentUser}
            onAddLeaveRequest={handleAddLeaveRequest}
            onApproveLeaveRequest={handleApproveLeave}
            onRejectLeaveRequest={handleRejectLeave}
          />
        )}

        {activeTab === 'import' && (
          !isGuru ? (
            <ImportMesinLog
              teachers={teachers}
              schedule={schedule}
              onImportRecords={handleImportRecords}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-amber-200">
              <p className="text-amber-800 font-bold">Akses Dibatasi: Import log mesin hanya oleh Operator / Administrator.</p>
            </div>
          )
        )}

        {activeTab === 'ai' && (
          !isGuru ? (
            <AsistenAI
              teachers={teachers}
              attendanceRecords={attendanceRecords}
              holidays={holidays}
              schedule={schedule}
              profile={profile}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-amber-200">
              <p className="text-amber-800 font-bold">Akses Dibatasi: Supervisi AI hanya untuk Kepala Madrasah.</p>
            </div>
          )
        )}

        {activeTab === 'pengaturan' && (
          (!isGuru && !isKepalaMadrasah) ? (
            <PengaturanMadrasah
              profile={profile}
              schedule={schedule}
              holidays={holidays}
              teachers={teachers}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSchedule={handleUpdateSchedule}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              onExportAllData={handleExportAllData}
              onImportAllData={handleImportAllData}
              onResetSampleData={handleResetSampleData}
              onBatchImportTeachers={handleBatchImportTeachers}
              onOpenCpanelExport={() => setIsPleskModalOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-amber-200">
              <p className="text-amber-800 font-bold">Akses Dibatasi: Pengaturan Madrasah hanya dapat dikelola oleh Administrator & Operator TU.</p>
            </div>
          )
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 px-4 text-center text-xs text-zinc-500 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>SIMPRESENSI Madrasah</strong> — Sistem Manajemen Presensi Sidik Jari & Laporan GTK Terpadu
          </div>
          <div className="text-[11px] text-zinc-400">
            {profile.name} • NSM: {profile.nsm} • Format Standar Kemenag RI, Simpatika & EMIS
          </div>
        </div>
      </footer>

    </div>
  );
}
