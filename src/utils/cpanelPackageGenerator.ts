import JSZip from 'jszip';
import { MadrasahProfile, WorkSchedule, Teacher, AttendanceRecord, LeaveRequest, HolidayItem } from '../types';

export interface CpanelExportOptions {
  profile: MadrasahProfile;
  schedule: WorkSchedule;
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  holidays: HolidayItem[];
  dbUser?: string;
  dbName?: string;
  dbPass?: string;
  dbHost?: string;
}

export const CPANEL_DEFAULT_DB = {
  user: 'masbagoes_absensi',
  name: 'masbagoes_absensi',
  pass: 'masbagus15',
  host: 'localhost',
  dbUser: 'masbagoes_absensi',
  dbName: 'masbagoes_absensi',
  dbPass: 'masbagus15',
  dbHost: 'localhost',
  userEmail: 'masbagoes_absensi@madrasah.id',
};

export function generateMySQLDumpForCpanel(options: CpanelExportOptions): string {
  const { profile, schedule, teachers, holidays, attendanceRecords, leaveRequests } = options;
  const dbName = options.dbName || CPANEL_DEFAULT_DB.name;
  const dbUser = options.dbUser || CPANEL_DEFAULT_DB.user;
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const escapeSql = (str: any) => {
    if (str === null || str === undefined) return 'NULL';
    const s = String(str);
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
  };

  let sql = `-- ============================================================
-- SIMPRESENSI GTK MADRASAH - DATABASE SCHEMA & SEED FOR cPanel
-- Database Name : ${dbName}
-- Database User : ${dbUser}
-- Database Host : localhost (atau IP Host cPanel)
-- Generated at  : ${nowStr}
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${dbName}\`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- ------------------------------------------------------------
-- Table structure for \`madrasah_profile\` (Aman Ditimpa: Data Lama Tetap Terjaga)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`madrasah_profile\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`nsm\` varchar(50) DEFAULT NULL,
  \`npsn\` varchar(50) DEFAULT NULL,
  \`level\` varchar(50) DEFAULT 'MI',
  \`status\` varchar(50) DEFAULT 'SWASTA',
  \`address\` text DEFAULT NULL,
  \`village\` varchar(100) DEFAULT NULL,
  \`district\` varchar(100) DEFAULT NULL,
  \`regency\` varchar(100) DEFAULT NULL,
  \`province\` varchar(100) DEFAULT NULL,
  \`postalCode\` varchar(20) DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`email\` varchar(100) DEFAULT NULL,
  \`website\` varchar(150) DEFAULT NULL,
  \`headmasterName\` varchar(255) DEFAULT NULL,
  \`headmasterNip\` varchar(50) DEFAULT '-',
  \`headmasterSignature\` longtext DEFAULT NULL,
  \`operatorName\` varchar(255) DEFAULT 'Jaenal Maskun',
  \`logoUrl\` longtext DEFAULT NULL,
  \`foundationLogoUrl\` longtext DEFAULT NULL,
  \`kemenagLogoUrl\` longtext DEFAULT NULL,
  \`raw_json\` longtext DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`work_schedules\`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`work_schedules\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`workDaysCount\` int(11) DEFAULT 6,
  \`toleranceMinutes\` int(11) DEFAULT 5,
  \`raw_json\` longtext DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`teachers\` (Master GTK)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`teachers\` (
  \`id\` varchar(64) NOT NULL,
  \`fingerprintId\` int(11) NOT NULL,
  \`nik\` varchar(20) NOT NULL,
  \`nip\` varchar(30) DEFAULT '-',
  \`nuptk\` varchar(30) DEFAULT '-',
  \`pegId\` varchar(30) DEFAULT '-',
  \`name\` varchar(255) NOT NULL,
  \`title\` varchar(50) DEFAULT '',
  \`position\` varchar(150) DEFAULT 'Guru Kelas',
  \`employmentStatus\` varchar(50) DEFAULT 'GTY',
  \`role\` varchar(50) DEFAULT 'GURU',
  \`pin\` varchar(50) DEFAULT '123456',
  \`gender\` enum('L','P') DEFAULT 'L',
  \`phone\` varchar(50) DEFAULT '-',
  \`email\` varchar(100) DEFAULT '',
  \`teachingHoursPerWeek\` int(11) DEFAULT 24,
  \`isBiometricEnrolled\` tinyint(1) DEFAULT 1,
  \`avatarColor\` varchar(50) DEFAULT 'bg-emerald-700',
  \`isActive\` tinyint(1) DEFAULT 1,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_nik\` (\`nik\`),
  KEY \`idx_fingerprint\` (\`fingerprintId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`attendance_records\`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`attendance_records\` (
  \`id\` varchar(64) NOT NULL,
  \`teacherId\` varchar(64) NOT NULL,
  \`date\` date NOT NULL,
  \`checkInTime\` varchar(20) DEFAULT NULL,
  \`checkOutTime\` varchar(20) DEFAULT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'HADIR',
  \`method\` varchar(50) DEFAULT 'FINGERPRINT',
  \`lateMinutes\` int(11) DEFAULT 0,
  \`earlyMinutes\` int(11) DEFAULT 0,
  \`notes\` text DEFAULT NULL,
  \`deviceIp\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_teacher_date\` (\`teacherId\`, \`date\`),
  KEY \`idx_date\` (\`date\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`leave_requests\`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`leave_requests\` (
  \`id\` varchar(64) NOT NULL,
  \`teacherId\` varchar(64) NOT NULL,
  \`type\` varchar(50) NOT NULL,
  \`startDate\` date NOT NULL,
  \`endDate\` date NOT NULL,
  \`reason\` text NOT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'APPROVED',
  \`documentUrl\` text DEFAULT NULL,
  \`approvedBy\` varchar(255) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_leave_teacher\` (\`teacherId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`holidays\`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`holidays\` (
  \`id\` varchar(64) NOT NULL,
  \`date\` date NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`type\` varchar(50) DEFAULT 'NASIONAL',
  PRIMARY KEY (\`id\`),
  KEY \`idx_holiday_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`sync_logs\`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`sync_logs\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`action\` varchar(100) NOT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'SUCCESS',
  \`message\` text DEFAULT NULL,
  \`synced_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SEED DATA (INSERT IGNORE: Tidak Menghilangkan Data yang Sudah Ada di Database)
-- ------------------------------------------------------------

-- 1. Madrasah Profile (Tidak menimpa jika sudah ada)
INSERT IGNORE INTO \`madrasah_profile\` (\`id\`, \`name\`, \`nsm\`, \`npsn\`, \`level\`, \`status\`, \`address\`, \`village\`, \`district\`, \`regency\`, \`province\`, \`postalCode\`, \`phone\`, \`email\`, \`website\`, \`headmasterName\`, \`headmasterNip\`, \`operatorName\`, \`raw_json\`)
VALUES (1, ${escapeSql(profile.name)}, ${escapeSql(profile.nsm)}, ${escapeSql(profile.npsn)}, ${escapeSql(profile.level)}, ${escapeSql(profile.status)}, ${escapeSql(profile.address)}, ${escapeSql(profile.village)}, ${escapeSql(profile.district)}, ${escapeSql(profile.city)}, ${escapeSql(profile.province)}, ${escapeSql(profile.postalCode)}, ${escapeSql(profile.phone)}, ${escapeSql(profile.email)}, ${escapeSql(profile.website)}, ${escapeSql(profile.headmasterName || '')}, ${escapeSql(profile.headmasterNip || '-')}, 'Jaenal Maskun', ${escapeSql(JSON.stringify(profile))});

-- 2. Work Schedule
INSERT IGNORE INTO \`work_schedules\` (\`id\`, \`workDaysCount\`,\`toleranceMinutes\`, \`raw_json\`)
VALUES (1, ${schedule.workDaysCount || 6}, ${schedule.toleranceMinutes || 5}, ${escapeSql(JSON.stringify(schedule))});

-- 3. Master GTK
INSERT IGNORE INTO \`teachers\` (\`id\`, \`fingerprintId\`, \`nik\`, \`nip\`, \`nuptk\`, \`pegId\`, \`name\`, \`title\`, \`position\`, \`employmentStatus\`, \`role\`, \`pin\`, \`gender\`, \`phone\`, \`email\`, \`teachingHoursPerWeek\`, \`isBiometricEnrolled\`, \`avatarColor\`, \`isActive\`)
VALUES 
('super-admin-jaenal', 999, '3302010000009999', '-', '-', '-', 'Jaenal Maskun', 'S.Pd.I.', 'Super Administrator SIMPRESENSI', 'TENAGA_KEPENDIDIKAN', 'ADMIN', 'masbagus', 'L', '081234567890', 'jaenalmaskun@gmail.com', 0, 1, 'bg-emerald-800', 1)
`;

  if (teachers && teachers.length > 0) {
    const additionalTeachers = teachers.filter(t => t.id !== 'super-admin-jaenal');
    if (additionalTeachers.length > 0) {
      sql += ',\n' + additionalTeachers.map(t => {
        return `(${escapeSql(t.id)}, ${t.fingerprintId || 0}, ${escapeSql(t.nik)}, ${escapeSql(t.nip || '-')}, ${escapeSql(t.nuptk || '-')}, ${escapeSql(t.pegId || '-')}, ${escapeSql(t.name)}, ${escapeSql(t.title || '')}, ${escapeSql(t.position || 'Guru')}, ${escapeSql(t.employmentStatus || 'GTY')}, ${escapeSql(t.role || 'GURU')}, ${escapeSql(t.pin || '123456')}, ${escapeSql(t.gender || 'L')}, ${escapeSql(t.phone || '-')}, ${escapeSql(t.email || '')}, ${t.teachingHoursPerWeek || 24}, ${t.isBiometricEnrolled ? 1 : 0}, ${escapeSql(t.avatarColor || 'bg-emerald-700')}, ${t.isActive ? 1 : 0})`;
      }).join(',\n');
    }
  }

  sql += `;\n\n`;

  // 4. Holidays
  if (holidays && holidays.length > 0) {
    sql += `-- 4. Holidays (INSERT IGNORE: Menjaga data libur yang sudah ada)\nINSERT IGNORE INTO \`holidays\` (\`id\`, \`date\`, \`name\`, \`type\`) VALUES\n`;
    sql += holidays.map(h => `(${escapeSql(h.id)}, ${escapeSql(h.date)}, ${escapeSql(h.name)}, ${escapeSql(h.type || 'NASIONAL')})`).join(',\n');
    sql += `;\n\n`;
  }

  // 5. Attendance Records (Sample / Current History - INSERT IGNORE agar riwayat presensi riil tidak tertimpa)
  if (attendanceRecords && attendanceRecords.length > 0) {
    const recentRecords = attendanceRecords.slice(0, 500);
    sql += `-- 5. Attendance Records (Sampel ${recentRecords.length} Riwayat Presensi - Tidak Menimpa Data Yang Ada)\n`;
    sql += `INSERT IGNORE INTO \`attendance_records\` (\`id\`, \`teacherId\`, \`date\`, \`checkInTime\`, \`checkOutTime\`, \`status\`, \`method\`, \`lateMinutes\`, \`earlyMinutes\`, \`notes\`)\nVALUES\n`;
    sql += recentRecords.map(r => {
      return `(${escapeSql(r.id)}, ${escapeSql(r.teacherId)}, ${escapeSql(r.date)}, ${escapeSql(r.checkInTime || null)}, ${escapeSql(r.checkOutTime || null)}, ${escapeSql(r.status || 'HADIR')}, ${escapeSql(r.verificationMethod || 'FINGERPRINT')}, ${r.lateMinutes || 0}, ${r.earlyLeaveMinutes || 0}, ${escapeSql(r.notes || '')})`;
    }).join(',\n');
    sql += `;\n\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sql;
}

export function generatePHPBackendForCpanel(options?: { dbUser?: string; dbName?: string; dbPass?: string; dbHost?: string }): string {
  const dbUser = options?.dbUser || CPANEL_DEFAULT_DB.user;
  const dbName = options?.dbName || CPANEL_DEFAULT_DB.name;
  const dbPass = options?.dbPass || CPANEL_DEFAULT_DB.pass;
  const dbHost = options?.dbHost || CPANEL_DEFAULT_DB.host;

  return `<?php
/**
 * SIMPRESENSI GTK MADRASAH - cPanel PHP & MySQL REST API Backend
 * Database User: ${dbUser}
 * Database Name: ${dbName}
 * Database Pass: ${dbPass}
 * Database Host: ${dbHost}
 */

// 1. CORS & Response Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Kredensial Database MySQL cPanel
define('DB_HOST', '${dbHost}');
define('DB_USER', '${dbUser}');
define('DB_PASS', '${dbPass}');
define('DB_NAME', '${dbName}');

// 3. Inisialisasi Koneksi PDO
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Koneksi Database MySQL cPanel Gagal. Pastikan database ${dbName} dan user ${dbUser} telah dibuat di cPanel MySQL Databases dan diberi ALL PRIVILEGES.',
        'error' => $e->getMessage()
    ]);
    exit;
}

// 4. Router API
$rawAction = $_GET['action'] ?? $_POST['action'] ?? $body['action'] ?? '';
$action = strtolower(trim($rawAction));
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Tampilan visual ramah browser jika diakses via web browser langsung untuk Uji Koneksi
if ($method === 'GET' && in_array($action, ['', 'test', 'test_db', 'test-connection', 'uji_koneksi', 'uji-koneksi', 'status', 'health']) && strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html') !== false) {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html lang='id'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Status API cPanel - SIMPRESENSI</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}.card{background:#0f172a;border:1px solid #10b981;border-radius:16px;padding:32px;max-width:560px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)}.badge{background:#064e3b;color:#34d399;font-size:12px;font-weight:700;padding:4px 12px;border-radius:9999px;display:inline-block;margin-bottom:12px}.title{font-size:20px;font-weight:800;margin:0 0 8px 0;color:#ffffff}.desc{color:#94a3b8;font-size:14px;margin-bottom:24px;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}.item{background:#1e293b;padding:12px;border-radius:8px}.label{font-size:11px;color:#94a3b8}.val{font-size:13px;font-weight:700;color:#38bdf8;font-family:monospace;margin-top:2px}.success{background:#10b981;color:#022c22;padding:12px;border-radius:8px;font-weight:700;text-align:center;font-size:14px}</style></head><body><div class='card'><span class='badge'>AKTIF & TERHUBUNG</span><h1 class='title'>Uji Koneksi API cPanel Berhasil!</h1><p class='desc'>Endpoint REST API backend PHP dan Database MySQL cPanel siap melayani aplikasi SIMPRESENSI Madrasah.</p><div class='grid'><div class='item'><div class='label'>Database Name</div><div class='val'>" . DB_NAME . "</div></div><div class='item'><div class='label'>Database User</div><div class='val'>" . DB_USER . "</div></div><div class='item'><div class='label'>Database Host</div><div class='val'>" . DB_HOST . "</div></div><div class='item'><div class='label'>Status Koneksi</div><div class='val' style='color:#34d399'>Terhubung (200 OK)</div></div></div><div class='success'>✓ Endpoint API cPanel Ditemukan & Siap Digunakan</div></div></body></html>";
    exit;
}

switch ($action) {
    case '':
    case 'test':
    case 'test_db':
    case 'test-connection':
    case 'test_connection':
    case 'uji_koneksi':
    case 'uji-koneksi':
    case 'uji':
    case 'koneksi':
    case 'health':
    case 'ping':
    case 'status':
    case 'check':
        try {
            $stmt = $pdo->query("SELECT 1 as test, NOW() as server_time, DATABASE() as current_db");
            $res = $stmt->fetch();
            echo json_encode([
                'success' => true,
                'status' => 'ok',
                'service' => 'simpresensi-cpanel-mysql',
                'message' => 'Uji Koneksi API cPanel & Database MySQL (${dbName}) BERHASIL & DITEMUKAN!',
                'database' => $res['current_db'] ?: '${dbName}',
                'user' => '${dbUser}',
                'host' => '${dbHost}',
                'server_time' => $res['server_time']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal koneksi database MySQL: ' . $e->getMessage()
            ]);
        }
        break;

    case 'version':
        try {
            $stmt = $pdo->query("SELECT MAX(updated_at) as last_updated FROM madrasah_profile");
            $res = $stmt->fetch();
            $lastUp = $res && $res['last_updated'] ? strtotime($res['last_updated']) : time();
            echo json_encode([
                'success' => true,
                'version' => $lastUp,
                'lastUpdated' => $lastUp * 1000
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => true, 'version' => time(), 'lastUpdated' => time() * 1000]);
        }
        break;

    case 'get_initial_data':
    case 'data':
        if ($method === 'POST') {
            goto do_sync_save;
        }
        try {
            $profileStmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
            $profile = $profileStmt->fetch();
            $profileData = ($profile && !empty($profile['raw_json'])) ? json_decode($profile['raw_json'], true) : $profile;

            $scheduleStmt = $pdo->query("SELECT * FROM work_schedules LIMIT 1");
            $sched = $scheduleStmt->fetch();
            $scheduleData = ($sched && !empty($sched['raw_json'])) ? json_decode($sched['raw_json'], true) : null;

            $teachersStmt = $pdo->query("SELECT * FROM teachers ORDER BY role DESC, name ASC");
            $teachers = $teachersStmt->fetchAll();

            $holidaysStmt = $pdo->query("SELECT * FROM holidays ORDER BY date ASC");
            $holidays = $holidaysStmt->fetchAll();

            $attendanceStmt = $pdo->query("SELECT id, teacherId, date, checkInTime, checkOutTime, status, method as verificationMethod, lateMinutes, earlyMinutes as earlyLeaveMinutes, notes FROM attendance_records ORDER BY date DESC, checkInTime DESC LIMIT 5000");
            $attendance = $attendanceStmt->fetchAll();

            $leaveStmt = $pdo->query("SELECT * FROM leave_requests ORDER BY createdAt DESC");
            $leaves = $leaveStmt->fetchAll();

            echo json_encode([
                'success' => true,
                'data' => [
                    'profile' => $profileData,
                    'schedule' => $scheduleData,
                    'teachers' => $teachers,
                    'holidays' => $holidays,
                    'attendanceRecords' => $attendance,
                    'leaveRequests' => $leaves,
                    'version' => time()
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'attendance':
    case 'save_attendance':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method Not Allowed']);
            exit;
        }
        try {
            $record = $body['record'] ?? $body;
            if (empty($record['id']) || empty($record['teacherId']) || empty($record['date'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Data presensi tidak lengkap']);
                exit;
            }

            $sql = "INSERT INTO attendance_records 
                    (id, teacherId, date, checkInTime, checkOutTime, status, method, lateMinutes, earlyMinutes, notes)
                    VALUES (:id, :teacherId, :date, :checkInTime, :checkOutTime, :status, :method, :lateMinutes, :earlyMinutes, :notes)
                    ON DUPLICATE KEY UPDATE 
                    checkInTime = VALUES(checkInTime),
                    checkOutTime = VALUES(checkOutTime),
                    status = VALUES(status),
                    method = VALUES(method),
                    lateMinutes = VALUES(lateMinutes),
                    earlyMinutes = VALUES(earlyMinutes),
                    notes = VALUES(notes)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $record['id'],
                ':teacherId' => $record['teacherId'],
                ':date' => $record['date'],
                ':checkInTime' => $record['checkInTime'] ?? null,
                ':checkOutTime' => $record['checkOutTime'] ?? null,
                ':status' => $record['status'] ?? 'HADIR',
                ':method' => $record['method'] ?? $record['verificationMethod'] ?? 'FINGERPRINT',
                ':lateMinutes' => $record['lateMinutes'] ?? 0,
                ':earlyMinutes' => $record['earlyMinutes'] ?? $record['earlyLeaveMinutes'] ?? 0,
                ':notes' => $record['notes'] ?? ''
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Presensi berhasil disimpan permanen di MySQL cPanel',
                'record' => $record
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Gagal simpan presensi: ' . $e->getMessage()]);
        }
        break;

    case 'sync':
    case 'save_all_data':
        do_sync_save:
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
            exit;
        }
        try {
            $pdo->beginTransaction();

            // 1. Profile
            if (!empty($body['profile'])) {
                $p = $body['profile'];
                $pSql = "INSERT INTO madrasah_profile (id, name, nsm, npsn, level, status, address, village, district, regency, province, postalCode, phone, email, website, headmasterName, headmasterNip, operatorName, raw_json)
                         VALUES (1, :name, :nsm, :npsn, :level, :status, :address, :village, :district, :regency, :province, :postalCode, :phone, :email, :website, :headmasterName, :headmasterNip, 'Jaenal Maskun', :raw_json)
                         ON DUPLICATE KEY UPDATE 
                         name=VALUES(name), nsm=VALUES(nsm), npsn=VALUES(npsn), headmasterName=VALUES(headmasterName), raw_json=VALUES(raw_json)";
                $pStmt = $pdo->prepare($pSql);
                $pStmt->execute([
                    ':name' => $p['name'] ?? 'Madrasah',
                    ':nsm' => $p['nsm'] ?? '',
                    ':npsn' => $p['npsn'] ?? '',
                    ':level' => $p['level'] ?? 'MI',
                    ':status' => $p['status'] ?? 'SWASTA',
                    ':address' => $p['address'] ?? '',
                    ':village' => $p['village'] ?? '',
                    ':district' => $p['district'] ?? '',
                    ':regency' => $p['city'] ?? $p['regency'] ?? '',
                    ':province' => $p['province'] ?? '',
                    ':postalCode' => $p['postalCode'] ?? '',
                    ':phone' => $p['phone'] ?? '',
                    ':email' => $p['email'] ?? '',
                    ':website' => $p['website'] ?? '',
                    ':headmasterName' => $p['headmasterName'] ?? 'Kepala Madrasah',
                    ':headmasterNip' => $p['headmasterNip'] ?? '-',
                    ':raw_json' => json_encode($p)
                ]);
            }

            // 2. Teachers
            if (isset($body['teachers']) && is_array($body['teachers'])) {
                $teachersList = $body['teachers'];
                $validIds = [];
                foreach ($teachersList as $t) {
                    if (!empty($t['id'])) $validIds[] = $t['id'];
                }

                // Aman: Hanya lakukan INSERT atau UPDATE (Upsert), tidak menghapus guru lama yang sudah ada di database
                $tSql = "INSERT INTO teachers (id, fingerprintId, nik, nip, nuptk, pegId, name, title, position, employmentStatus, role, pin, gender, phone, email, teachingHoursPerWeek, isBiometricEnrolled, avatarColor, isActive)
                         VALUES (:id, :fingerprintId, :nik, :nip, :nuptk, :pegId, :name, :title, :position, :employmentStatus, :role, :pin, :gender, :phone, :email, :teachingHoursPerWeek, :isBiometricEnrolled, :avatarColor, :isActive)
                         ON DUPLICATE KEY UPDATE 
                         fingerprintId=VALUES(fingerprintId), nik=VALUES(nik), nip=VALUES(nip), nuptk=VALUES(nuptk), pegId=VALUES(pegId), name=VALUES(name), title=VALUES(title), position=VALUES(position), employmentStatus=VALUES(employmentStatus), role=VALUES(role), pin=VALUES(pin), gender=VALUES(gender), phone=VALUES(phone), email=VALUES(email), teachingHoursPerWeek=VALUES(teachingHoursPerWeek), isBiometricEnrolled=VALUES(isBiometricEnrolled), avatarColor=VALUES(avatarColor), isActive=VALUES(isActive)";
                $tStmt = $pdo->prepare($tSql);
                foreach ($teachersList as $t) {
                    if (empty($t['id'])) continue;
                    $tStmt->execute([
                        ':id' => $t['id'],
                        ':fingerprintId' => $t['fingerprintId'] ?? 0,
                        ':nik' => $t['nik'] ?? $t['id'],
                        ':nip' => $t['nip'] ?? '-',
                        ':nuptk' => $t['nuptk'] ?? '-',
                        ':pegId' => $t['pegId'] ?? '-',
                        ':name' => $t['name'] ?? 'Guru',
                        ':title' => $t['title'] ?? '',
                        ':position' => $t['position'] ?? 'Guru',
                        ':employmentStatus' => $t['employmentStatus'] ?? 'GTY',
                        ':role' => $t['role'] ?? 'GURU',
                        ':pin' => $t['pin'] ?? '123456',
                        ':gender' => $t['gender'] ?? 'L',
                        ':phone' => $t['phone'] ?? '-',
                        ':email' => $t['email'] ?? '',
                        ':teachingHoursPerWeek' => $t['teachingHoursPerWeek'] ?? 24,
                        ':isBiometricEnrolled' => !empty($t['isBiometricEnrolled']) ? 1 : 0,
                        ':avatarColor' => $t['avatarColor'] ?? 'bg-emerald-700',
                        ':isActive' => isset($t['isActive']) && !$t['isActive'] ? 0 : 1
                    ]);
                }
            }

            // 3. Work Schedule
            if (!empty($body['schedule'])) {
                $s = $body['schedule'];
                $sSql = "INSERT INTO work_schedules (id, workDaysCount, toleranceMinutes, raw_json)
                         VALUES (1, :workDaysCount, :toleranceMinutes, :raw_json)
                         ON DUPLICATE KEY UPDATE 
                         workDaysCount=VALUES(workDaysCount), toleranceMinutes=VALUES(toleranceMinutes), raw_json=VALUES(raw_json)";
                $sStmt = $pdo->prepare($sSql);
                $sStmt->execute([
                    ':workDaysCount' => $s['workDaysCount'] ?? 6,
                    ':toleranceMinutes' => $s['toleranceMinutes'] ?? 5,
                    ':raw_json' => json_encode($s)
                ]);
            }

            // 4. Attendance Records
            if (isset($body['attendanceRecords']) && is_array($body['attendanceRecords'])) {
                $attSql = "INSERT INTO attendance_records 
                           (id, teacherId, date, checkInTime, checkOutTime, status, method, lateMinutes, earlyMinutes, notes)
                           VALUES (:id, :teacherId, :date, :checkInTime, :checkOutTime, :status, :method, :lateMinutes, :earlyMinutes, :notes)
                           ON DUPLICATE KEY UPDATE 
                           checkInTime = VALUES(checkInTime),
                           checkOutTime = VALUES(checkOutTime),
                           status = VALUES(status),
                           method = VALUES(method),
                           lateMinutes = VALUES(lateMinutes),
                           earlyMinutes = VALUES(earlyMinutes),
                           notes = VALUES(notes)";
                $attStmt = $pdo->prepare($attSql);
                foreach ($body['attendanceRecords'] as $att) {
                    if (empty($att['id']) || empty($att['teacherId']) || empty($att['date'])) continue;
                    $attStmt->execute([
                        ':id' => $att['id'],
                        ':teacherId' => $att['teacherId'],
                        ':date' => $att['date'],
                        ':checkInTime' => $att['checkInTime'] ?? null,
                        ':checkOutTime' => $att['checkOutTime'] ?? null,
                        ':status' => $att['status'] ?? 'HADIR',
                        ':method' => $att['verificationMethod'] ?? $att['method'] ?? 'FINGERPRINT',
                        ':lateMinutes' => $att['lateMinutes'] ?? 0,
                        ':earlyMinutes' => $att['earlyLeaveMinutes'] ?? $att['earlyMinutes'] ?? 0,
                        ':notes' => $att['notes'] ?? ''
                    ]);
                }
            }

            // 5. Leave Requests
            if (isset($body['leaveRequests']) && is_array($body['leaveRequests'])) {
                $leaveSql = "INSERT INTO leave_requests 
                             (id, teacherId, type, startDate, endDate, reason, status, approvedBy)
                             VALUES (:id, :teacherId, :type, :startDate, :endDate, :reason, :status, :approvedBy)
                             ON DUPLICATE KEY UPDATE 
                             type = VALUES(type), startDate = VALUES(startDate), endDate = VALUES(endDate),
                             reason = VALUES(reason), status = VALUES(status), approvedBy = VALUES(approvedBy)";
                $leaveStmt = $pdo->prepare($leaveSql);
                foreach ($body['leaveRequests'] as $lr) {
                    if (empty($lr['id']) || empty($lr['teacherId'])) continue;
                    $leaveStmt->execute([
                        ':id' => $lr['id'],
                        ':teacherId' => $lr['teacherId'],
                        ':type' => $lr['type'] ?? 'IZIN',
                        ':startDate' => $lr['startDate'] ?? date('Y-m-d'),
                        ':endDate' => $lr['endDate'] ?? date('Y-m-d'),
                        ':reason' => $lr['reason'] ?? 'Izin',
                        ':status' => $lr['status'] ?? 'APPROVED',
                        ':approvedBy' => $lr['approvedBy'] ?? 'Kepala Madrasah'
                    ]);
                }
            }

            // 6. Log Sync
            $pdo->exec("INSERT INTO sync_logs (action, status, message) VALUES ('SYNC_ALL', 'SUCCESS', 'Sinkronisasi menyeluruh dari browser berhasil')");

            $pdo->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Semua data SIMPRESENSI berhasil disinkronkan ke database MySQL cPanel (${dbName})',
                'timestamp' => time()
            ]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Gagal sinkronisasi: ' . $e->getMessage()]);
        }
        break;

    default:
        try {
            $stmt = $pdo->query("SELECT 1 as test, NOW() as server_time, DATABASE() as current_db");
            $res = $stmt->fetch();
            echo json_encode([
                'success' => true,
                'status' => 'ok',
                'service' => 'simpresensi-cpanel-mysql',
                'message' => 'Endpoint API cPanel Ditemukan & Database MySQL (${dbName}) Terhubung!',
                'database' => $res['current_db'] ?: '${dbName}',
                'user' => '${dbUser}',
                'host' => '${dbHost}',
                'server_time' => $res['server_time'],
                'action_received' => $action,
                'available_actions' => ['test_db', 'uji_koneksi', 'get_initial_data', 'get_teachers', 'save_attendance', 'sync_all', 'get_profile']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'API cPanel ditemukan namun database error: ' . $e->getMessage(),
                'action' => $action
            ]);
        }
        break;
}
`;
}

export function generateDbConfigFileForCpanel(options?: { dbUser?: string; dbName?: string; dbPass?: string; dbHost?: string }): string {
  const dbUser = options?.dbUser || CPANEL_DEFAULT_DB.user;
  const dbName = options?.dbName || CPANEL_DEFAULT_DB.name;
  const dbPass = options?.dbPass || CPANEL_DEFAULT_DB.pass;
  const dbHost = options?.dbHost || CPANEL_DEFAULT_DB.host;

  return `<?php
/**
 * SIMPRESENSI MADRASAH - FILE KONFIGURASI DATABASE CPANEL
 * Disesuaikan otomatis dengan kredensial cPanel MySQL
 */

return [
    'db_host' => '${dbHost}',
    'db_name' => '${dbName}',
    'db_user' => '${dbUser}',
    'db_pass' => '${dbPass}',
    'db_charset' => 'utf8mb4',
    'app_name' => 'SIMPRESENSI GTK Madrasah',
    'installed_at' => date('Y-m-d H:i:s'),
];
`;
}

export function generateHtaccessForCpanel(): string {
  return `# ============================================================
# SIMPRESENSI GTK MADRASAH - KONFIGURASI APACHE CPANEL (.htaccess)
# ============================================================

Options -Indexes
Options +FollowSymLinks

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Pastikan Protokol HTTPS jika didukung
  # RewriteCond %{HTTPS} off
  # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # 2. Routing API ke api.php (Forward REST Request)
  RewriteRule ^api/(.*)$ api.php?action=$1 [QSA,L]
  RewriteRule ^api$ api.php [QSA,L]

  # 3. Proteksi file sensitif
  <FilesMatch "(database\\.sql|\\.env|composer\\.json|config\\.php|package\\.json)$">
    Order allow,deny
    Deny from all
  </FilesMatch>

  # 4. Single Page Application (SPA Fallback ke index.html)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# 5. GZIP & Deflate Compression untuk Kecepatan Loading
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# 6. Browser Caching & No-Cache for HTML
<IfModule mod_headers.c>
  <FilesMatch "\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
}

export function generateReadmeCpanel(options: CpanelExportOptions): string {
  const dbName = options.dbName || CPANEL_DEFAULT_DB.name;
  const dbUser = options.dbUser || CPANEL_DEFAULT_DB.user;
  const dbPass = options.dbPass || CPANEL_DEFAULT_DB.pass;

  return `================================================================================
SIMPRESENSI GTK MADRASAH - PAKET CPANEL & DATABASE MYSQL
================================================================================
Kredensial Database Terkonfigurasi:
- Database Name : ${dbName}
- Database User : ${dbUser}
- Password      : ${dbPass}
- Database Host : localhost (atau IP Host Database cPanel)
- Port          : 3306
- Madrasah      : ${options.profile?.name || 'Madrasah'}
- Total GTK     : ${options.teachers?.length || 0} Tenaga Pendidik & Kependidikan

CARA INSTALASI CEPAT DI CPANEL:
1. BUAT DATABASE DI CPANEL:
   - Masuk ke cPanel -> Menu "MySQL® Databases"
   - Buat Database Baru dengan nama: ${dbName}
   - Buat Pengguna MySQL Baru:
     Username: ${dbUser}
     Password: ${dbPass}
   - Tambahkan Pengguna Ke Database:
     Pilih User: ${dbUser} | Database: ${dbName}
     Klik "Add" -> Centang "ALL PRIVILEGES" -> Klik "Make Changes".

2. IMPORT STRUKTUR & DATA DATABASE (phpMyAdmin):
   - Masuk ke cPanel -> Menu "phpMyAdmin"
   - Klik nama database "${dbName}" di panel kiri
   - Klik tab menu "Import" di atas
   - Klik "Choose File" / "Browse", pilih file "database.sql" dari paket ini
   - Klik tombol "Import" / "Kirim" di bagian bawah.

3. UPLOAD FILE WEBSITE KE FILE MANAGER CPANEL:
   - Masuk ke cPanel -> Menu "File Manager"
   - Buka direktori "public_html" (atau direktori subdomain Anda)
   - Unggah file ZIP ini ("SIMPRESENSI_cPanel_MySQL_${dbName}.zip")
   - Klik kanan file ZIP -> Klik "Extract"
   - Pastikan file .htaccess, index.html, api.php, dan folder assets/ berada di root public_html.

4. SELESAI & UJI COBA:
   - Buka domain madrasah Anda di browser (contoh: https://absensi.madrasah.sch.id)
   - Uji coba terminal presensi sidik jari / PIN
   - Semua presensi langsung tersimpan otomatis ke database MySQL ${dbName}!
================================================================================
`;
}

export function generateCpanelHtmlGuide(_options?: any): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panduan Instalasi SIMPRESENSI di cPanel & MySQL</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 32px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 26px; }
    .badge { display: inline-block; background: #10b981; color: #064e3b; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px; }
    .content { padding: 32px; }
    .box-info { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .step { display: flex; margin-bottom: 28px; gap: 16px; }
    .step-num { width: 36px; height: 36px; border-radius: 50%; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; font-size: 16px; }
    .step-body h3 { margin: 0 0 8px; color: #065f46; font-size: 18px; }
    .code-block { background: #0f172a; color: #38bdf8; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 8px 0; overflow-x: auto; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Panduan Resmi cPanel Hosting</span>
      <h1>Panduan Instalasi SIMPRESENSI Madrasah</h1>
      <p>Langkah mudah deploy sistem presensi fingerprint & MySQL di cPanel Web Hosting</p>
    </div>
    <div class="content">
      <div class="box-info">
        <h4 style="margin: 0 0 8px; color: #065f46;">Informasi Akun Database MySQL yang Dikonfigurasi:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Database Name :</strong> <code>masbagoes_absensi</code></li>
          <li><strong>Database User :</strong> <code>masbagoes_absensi</code></li>
          <li><strong>Database Password :</strong> <code>masbagus15</code></li>
          <li><strong>Host :</strong> <code>localhost</code></li>
        </ul>
      </div>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <h3>Buat Database & User di cPanel MySQL® Databases</h3>
          <p>Buka cPanel Anda &rarr; cari menu <strong>MySQL® Databases</strong>.</p>
          <ul>
            <li>Di bagian <strong>Create New Database</strong>, masukkan: <code>masbagoes_absensi</code> &rarr; Klik <em>Create Database</em>.</li>
            <li>Di bagian <strong>Add New User</strong>, masukkan Username: <code>masbagoes_absensi</code> dan Password: <code>masbagus15</code> &rarr; Klik <em>Create User</em>.</li>
            <li>Di bagian <strong>Add User To Database</strong>, pilih User <code>masbagoes_absensi</code> dan Database <code>masbagoes_absensi</code> &rarr; Klik <em>Add</em> &rarr; Centang <strong>ALL PRIVILEGES</strong> &rarr; Klik <em>Make Changes</em>.</li>
          </ul>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <h3>Import Struktur Tabel di phpMyAdmin</h3>
          <p>Buka menu <strong>phpMyAdmin</strong> di cPanel.</p>
          <ul>
            <li>Pilih database <strong>masbagoes_absensi</strong> di sisi kiri.</li>
            <li>Klik tab <strong>Import</strong> di bagian menu atas.</li>
            <li>Klik <em>Choose File</em> dan pilih file <strong>database.sql</strong> dari paket ZIP ini.</li>
            <li>Scroll ke bawah dan klik tombol <strong>Import / Kirim</strong>. Semua tabel GTK, presensi, profil, dan jadwal otomatis terisi!</li>
          </ul>
        </div>
      </div>

      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <h3>Unggah & Extract File di File Manager cPanel</h3>
          <p>Buka menu <strong>File Manager</strong> di cPanel &rarr; Buka folder <code>public_html</code>.</p>
          <ul>
            <li>Klik tombol <strong>Upload</strong> dan unggah file ZIP SIMPRESENSI ini.</li>
            <li>Setelah upload selesai, klik kanan file ZIP tersebut &rarr; Pilih <strong>Extract</strong>.</li>
            <li>Pastikan file <code>index.html</code>, <code>api.php</code>, <code>config.php</code>, <code>.htaccess</code>, dan folder <code>assets/</code> berada di dalam folder domain yang dituju.</li>
          </ul>
        </div>
      </div>

      <div class="step">
        <div class="step-num">4</div>
        <div class="step-body">
          <h3>Selesai & Uji Coba Aplikasi</h3>
          <p>Akses domain madrasah Anda di browser. Coba lakukan presensi di Kiosk atau login sebagai Administrator. Semua data langsung tersinkronkan dan tersimpan secara otomatis di database MySQL cPanel!</p>
        </div>
      </div>
    </div>
    <div class="footer">
      SIMPRESENSI GTK Madrasah &bull; Sistem Presensi Fingerprint & Laporan GTK Resmi Kemenag
    </div>
  </div>
</body>
</html>
`;
}

export function generateIndexPhpForCpanel(options: CpanelExportOptions): string {
  const schoolName = options.profile?.name || "MI MA'ARIF NU 02 SANGGREMAN";
  const dbUser = options?.dbUser || CPANEL_DEFAULT_DB.user;
  const dbName = options?.dbName || CPANEL_DEFAULT_DB.name;
  const dbPass = options?.dbPass || CPANEL_DEFAULT_DB.pass;
  const dbHost = options?.dbHost || CPANEL_DEFAULT_DB.host;

  return `<?php
// ============================================================
// SIMPRESENSI MADRASAH - DYNAMIC SSR OPEN GRAPH & ENTRY POINT (cPanel MySQL)
// ============================================================
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on');

$protocol = $isHttps ? "https" : "http";
$host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $protocol . '://' . $host;
$currentUrl = $baseUrl . ($_SERVER['REQUEST_URI'] ?? '');

$schoolName = "${schoolName.replace(/"/g, '\\"')}";
$cacheBuster = time();

// Fetch latest profile from MySQL (cPanel ${dbName})
try {
    require_once __DIR__ . '/config.php';
    $dsn = "mysql:host=" . (defined('DB_HOST') ? DB_HOST : '${dbHost}') . ";dbname=" . (defined('DB_NAME') ? DB_NAME : '${dbName}') . ";charset=utf8mb4";
    $user = defined('DB_USER') ? DB_USER : '${dbUser}';
    $pass = defined('DB_PASS') ? DB_PASS : '${dbPass}';
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_SILENT,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 2,
    ]);
    $stmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
    $row = $stmt ? $stmt->fetch() : null;
    if ($row && !empty($row['name'])) {
        $schoolName = $row['name'];
    }
} catch (Throwable $e) {
    // Abaikan jika database belum siap, fallback aman ke nama madrasah default
}

// Dynamically locate compiled JS and CSS with highest mtime / from index.html
$latestJs = '';
$latestCss = '';

// 1. Try reading the exact bundle hashes from index.html if present
$indexHtmlPath = __DIR__ . '/index.html';
if (file_exists($indexHtmlPath)) {
    $htmlContent = file_get_contents($indexHtmlPath);
    if (preg_match('/<script[^>]+src=["\']\.?\/assets\/(index-[^"\']+\.js)["\']/', $htmlContent, $m)) {
        $latestJs = $m[1];
    }
    if (preg_match('/<link[^>]+href=["\']\.?\/assets\/(index-[^"\']+\.css)["\']/', $htmlContent, $m)) {
        $latestCss = $m[1];
    }
}

// 2. Fallback or scan assets directory to always pick the newest file by filemtime (prevents loading stale cached bundles)
$assetsDir = __DIR__ . '/assets';
if (is_dir($assetsDir)) {
    $files = scandir($assetsDir);
    $newestJsMtime = 0;
    $newestCssMtime = 0;
    foreach ($files as $f) {
        $full = $assetsDir . '/' . $f;
        if (!is_file($full)) continue;
        $mtime = filemtime($full);
        if (preg_match('/^index-.*\\.js$/', $f)) {
            if ($mtime > $newestJsMtime || empty($latestJs)) {
                $latestJs = $f;
                $newestJsMtime = $mtime;
            }
        } else if (preg_match('/^index-.*\\.css$/', $f)) {
            if ($mtime > $newestCssMtime || empty($latestCss)) {
                $latestCss = $f;
                $newestCssMtime = $mtime;
            }
        }
    }
}

// 3. Construct tag with anti-cache timestamp parameter
$jsMtime = (!empty($latestJs) && file_exists($assetsDir . '/' . $latestJs)) ? filemtime($assetsDir . '/' . $latestJs) : time();
$cssMtime = (!empty($latestCss) && file_exists($assetsDir . '/' . $latestCss)) ? filemtime($assetsDir . '/' . $latestCss) : time();

$jsScriptTag = !empty($latestJs) 
    ? '<script type="module" crossorigin src="./assets/' . htmlspecialchars($latestJs) . '?v=' . $jsMtime . '"></script>' 
    : '<script type="module" crossorigin src="./assets/index.js?v=' . time() . '"></script>';

$cssLinkTag = !empty($latestCss) 
    ? '<link rel="stylesheet" crossorigin href="./assets/' . htmlspecialchars($latestCss) . '?v=' . $cssMtime . '">' 
    : '';

$pageTitle = "SIMPRESENSI Madrasah - " . htmlspecialchars($schoolName);
$pageDesc = "Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK " . htmlspecialchars($schoolName) . " Terintegrasi Kemenag & SPTJM";
$ogImageUrl = $baseUrl . "/og-image.jpg";
$ogImageSecureUrl = "https://" . $host . "/og-image.jpg";
$faviconUrl = $baseUrl . "/favicon.svg";
?>
<!doctype html>
<html lang="id" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="alternate icon" type="image/png" href="<?php echo $faviconUrl; ?>" />
    <link rel="apple-touch-icon" href="<?php echo $faviconUrl; ?>" />
    <link rel="image_src" href="<?php echo $ogImageUrl; ?>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo $pageTitle; ?></title>
    <meta name="description" content="<?php echo $pageDesc; ?>" />
    
    <!-- Open Graph / WhatsApp / Facebook / Telegram Crawler Meta Tags -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="SIMPRESENSI GTK Madrasah" />
    <meta property="og:title" content="<?php echo $pageTitle; ?>" />
    <meta property="og:description" content="<?php echo $pageDesc; ?>" />
    <meta property="og:image" content="<?php echo $ogImageUrl; ?>" />
    <meta property="og:image:secure_url" content="<?php echo $ogImageSecureUrl; ?>" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="<?php echo htmlspecialchars($schoolName); ?>" />

    <!-- Twitter Card Preview -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo $pageTitle; ?>" />
    <meta name="twitter:description" content="<?php echo $pageDesc; ?>" />
    <meta name="twitter:image" content="<?php echo $ogImageUrl; ?>" />
    <meta name="twitter:image:alt" content="<?php echo htmlspecialchars($schoolName); ?>" />

    <?php if (!empty($cssLinkTag)): ?>
    <?php echo $cssLinkTag . "\n"; ?>
    <?php endif; ?>
  </head>
  <body class="bg-zinc-100 text-zinc-900 antialiased min-h-screen">
    <div id="root"></div>
    <?php if (!empty($jsScriptTag)): ?>
    <?php echo $jsScriptTag . "\n"; ?>
    <?php else: ?>
    <script type="module" crossorigin src="./assets/index.js"></script>
    <?php endif; ?>
  </body>
</html>`;
}

export function generateIndexHtmlForCpanel(options: CpanelExportOptions): string {
  const madrasahName = options.profile?.name || "GTK Madrasah";
  const nowTs = Date.now();
  const domain = "https://absensi.jaenalmaskun.biz.id";
  const ogImageUrl = `${domain}/og-image.jpg?v=${nowTs}`;

  return `<!doctype html>
<html lang="id" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="alternate icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="apple-touch-icon" href="./favicon.svg" />
    <link rel="image_src" href="${ogImageUrl}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SIMPRESENSI Madrasah - ${madrasahName}</title>
    <meta name="description" content="Sistem Presensi Fingerprint &amp; Rekapitulasi Laporan Kehadiran GTK ${madrasahName} Terintegrasi Kemenag &amp; SPTJM" />
    
    <!-- Open Graph / WhatsApp / Telegram / Facebook Preview -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="SIMPRESENSI GTK Madrasah" />
    <meta property="og:title" content="SIMPRESENSI Madrasah - Presensi Fingerprint &amp; Laporan GTK" />
    <meta property="og:description" content="Sistem Presensi Fingerprint &amp; Rekapitulasi Laporan Kehadiran GTK ${madrasahName} Terintegrasi Kemenag &amp; SPTJM" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:secure_url" content="${ogImageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="SIMPRESENSI GTK Madrasah Banner" />
    <meta property="og:url" content="${domain}/" />

    <!-- Twitter Card Preview -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="SIMPRESENSI Madrasah - Presensi Fingerprint &amp; Laporan GTK" />
    <meta name="twitter:description" content="Sistem Presensi Fingerprint &amp; Rekapitulasi Laporan Kehadiran GTK ${madrasahName} Terintegrasi Kemenag &amp; SPTJM" />
    <meta name="twitter:image" content="${ogImageUrl}" />
  </head>
  <body class="bg-zinc-100 text-zinc-900 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" crossorigin src="./assets/index.js"></script>
  </body>
</html>`;
}

export async function createCpanelZip(options: CpanelExportOptions): Promise<Blob> {
  const zip = new JSZip();

  const sqlContent = generateMySQLDumpForCpanel(options);
  const phpContent = generatePHPBackendForCpanel(options);
  const configContent = generateDbConfigFileForCpanel(options);
  const htaccessContent = generateHtaccessForCpanel();
  const readmeContent = generateReadmeCpanel(options);
  const htmlGuide = generateCpanelHtmlGuide(options);
  const indexHtml = generateIndexHtmlForCpanel(options);
  const indexPhp = generateIndexPhpForCpanel(options);

  // Root files
  zip.file("database.sql", sqlContent);
  zip.file("api.php", phpContent);
  zip.file("config.php", configContent);
  zip.file(".htaccess", htaccessContent);
  zip.file("index.html", indexHtml);
  zip.file("index.php", indexPhp);
  zip.file("README_CPANEL.txt", readmeContent);
  zip.file("PANDUAN_INSTALASI_CPANEL.html", htmlGuide);

  // SVG Favicon
  const circularFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgGrad)" />
  <circle cx="32" cy="32" r="28.5" fill="none" stroke="url(#goldRing)" stroke-width="1.8" />
  <circle cx="32" cy="32" r="26" fill="none" stroke="#065f46" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.6" />
  <g fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 37 C21 24, 43 24, 43 37" />
    <path d="M26 38 C26 28, 38 28, 38 38" />
    <path d="M30 40 C30 33, 34 33, 34 40" />
    <path d="M19 41 C19 47, 26 50, 32 50 C38 50, 45 47, 45 41" />
    <path d="M23 44 C27 47.5, 37 47.5, 41 44" />
  </g>
  <path d="M32 13 L33.2 16.8 L37 16.8 L34 19 L35.1 22.8 L32 20.5 L28.9 22.8 L30 19 L27 16.8 L30.8 16.8 Z" fill="#fbbf24" />
</svg>`;
  zip.file('favicon.svg', circularFaviconSvg);

  return await zip.generateAsync({ type: "blob" });
}
