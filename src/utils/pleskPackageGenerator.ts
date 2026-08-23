import JSZip from 'jszip';
import { MadrasahProfile, WorkSchedule, Teacher, AttendanceRecord, LeaveRequest, HolidayItem } from '../types';

export interface PleskExportOptions {
  profile: MadrasahProfile;
  schedule: WorkSchedule;
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  holidays: HolidayItem[];
}

export function generateMySQLDump(options: PleskExportOptions): string {
  const { profile, schedule, teachers, holidays } = options;
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const escapeSql = (str: any) => {
    if (str === null || str === undefined) return 'NULL';
    const s = String(str);
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
  };

  let sql = `-- ============================================================
-- SIMPRESENSI GTK MADRASAH - DATABASE SCHEMA & SEED FOR PLESK
-- Database Name: jaenal_absensi
-- Database User: jaenal_absensi
-- Generated at: ${nowStr}
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`jaenal_absensi\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`jaenal_absensi\`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- ------------------------------------------------------------
-- Table structure for \`madrasah_profile\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`madrasah_profile\`;
CREATE TABLE \`madrasah_profile\` (
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
DROP TABLE IF EXISTS \`work_schedules\`;
CREATE TABLE \`work_schedules\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`workDaysCount\` int(11) DEFAULT 6,
  \`toleranceMinutes\` int(11) DEFAULT 5,
  \`raw_json\` longtext DEFAULT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`teachers\` (Guru & Tenaga Kependidikan)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`teachers\`;
CREATE TABLE \`teachers\` (
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
DROP TABLE IF EXISTS \`attendance_records\`;
CREATE TABLE \`attendance_records\` (
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
DROP TABLE IF EXISTS \`leave_requests\`;
CREATE TABLE \`leave_requests\` (
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
DROP TABLE IF EXISTS \`holidays\`;
CREATE TABLE \`holidays\` (
  \`id\` varchar(64) NOT NULL,
  \`date\` date NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`type\` varchar(50) DEFAULT 'NASIONAL',
  PRIMARY KEY (\`id\`),
  KEY \`idx_holiday_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for \`machine_logs\` (Raw Fingerprint Log)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`machine_logs\`;
CREATE TABLE \`machine_logs\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`pin_or_finger_id\` varchar(50) NOT NULL,
  \`timestamp\` datetime NOT NULL,
  \`verify_type\` int(11) DEFAULT 1,
  \`state\` int(11) DEFAULT 0,
  \`raw_line\` varchar(255) DEFAULT NULL,
  \`uploaded_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_log_timestamp\` (\`timestamp\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SEED DATA
-- ------------------------------------------------------------

-- 1. Madrasah Profile
INSERT INTO \`madrasah_profile\` (\`id\`, \`name\`, \`nsm\`, \`npsn\`, \`level\`, \`status\`, \`address\`, \`village\`, \`district\`, \`regency\`, \`province\`, \`postalCode\`, \`phone\`, \`email\`, \`website\`, \`headmasterName\`, \`headmasterNip\`, \`operatorName\`, \`raw_json\`)
VALUES (1, ${escapeSql(profile.name)}, ${escapeSql(profile.nsm)}, ${escapeSql(profile.npsn)}, ${escapeSql(profile.level)}, ${escapeSql(profile.status)}, ${escapeSql(profile.address)}, ${escapeSql(profile.village)}, ${escapeSql(profile.district)}, ${escapeSql(profile.city)}, ${escapeSql(profile.province)}, ${escapeSql(profile.postalCode)}, ${escapeSql(profile.phone)}, ${escapeSql(profile.email)}, ${escapeSql(profile.website)}, ${escapeSql(profile.headmasterName || '')}, ${escapeSql(profile.headmasterNip || '-')}, 'Jaenal Maskun', ${escapeSql(JSON.stringify(profile))})
ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`headmasterName\` = VALUES(\`headmasterName\`);

-- 2. Work Schedule
INSERT INTO \`work_schedules\` (\`id\`, \`workDaysCount\`,\`toleranceMinutes\`, \`raw_json\`)
VALUES (1, ${schedule.workDaysCount || 6}, ${schedule.toleranceMinutes || 5}, ${escapeSql(JSON.stringify(schedule))})
ON DUPLICATE KEY UPDATE \`toleranceMinutes\` = VALUES(\`toleranceMinutes\`);

-- 3. Super Admin User & GTK
INSERT INTO \`teachers\` (\`id\`, \`fingerprintId\`, \`nik\`, \`nip\`, \`nuptk\`, \`pegId\`, \`name\`, \`title\`, \`position\`, \`employmentStatus\`, \`role\`, \`pin\`, \`gender\`, \`phone\`, \`email\`, \`teachingHoursPerWeek\`, \`isBiometricEnrolled\`, \`avatarColor\`, \`isActive\`)
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

  sql += `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`pin\` = VALUES(\`pin\`), \`role\` = VALUES(\`role\`);\n\n`;

  // 4. Holidays
  if (holidays && holidays.length > 0) {
    sql += `-- 4. Holidays\nINSERT INTO \`holidays\` (\`id\`, \`date\`, \`name\`, \`type\`) VALUES\n`;
    sql += holidays.map(h => `(${escapeSql(h.id)}, ${escapeSql(h.date)}, ${escapeSql(h.name)}, ${escapeSql(h.type || 'NASIONAL')})`).join(',\n');
    sql += `\nON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sql;
}

export function generatePHPBackend(): string {
  return `<?php
/**
 * SIMPRESENSI GTK MADRASAH - PLESK PHP BACKEND API & SYNC
 * Konfigurasi Database MySQL Plesk
 */

// 1. CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Kredensial Database MySQL Sesuai Konfigurasi Plesk
define('DB_HOST', 'localhost');
define('DB_USER', 'jaenal_absensi');
define('DB_PASS', 'masbagus15');
define('DB_NAME', 'jaenal_absensi');

// 3. Inisialisasi PDO MySQL
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
        'message' => 'Koneksi Database MySQL Gagal. Pastikan database jaenal_absensi sudah dibuat di Plesk.',
        'error' => $e->getMessage()
    ]);
    exit;
}

// 4. Router API
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    case 'test_db':
    case 'health':
        try {
            $stmt = $pdo->query("SELECT 1 as test, NOW() as server_time");
            $res = $stmt->fetch();
            echo json_encode([
                'success' => true,
                'status' => 'ok',
                'service' => 'simpresensi-mysql-plesk',
                'message' => 'Koneksi database MySQL Plesk (jaenal_absensi) BERHASIL!',
                'server_time' => $res['server_time']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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
            // Forward to save all data
            goto do_sync_save;
        }
        try {
            $profileStmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
            $profile = $profileStmt->fetch();
            if ($profile && !empty($profile['raw_json'])) {
                $profileData = json_decode($profile['raw_json'], true);
            } else {
                $profileData = $profile;
            }

            $scheduleStmt = $pdo->query("SELECT * FROM work_schedules LIMIT 1");
            $sched = $scheduleStmt->fetch();
            $scheduleData = ($sched && !empty($sched['raw_json'])) ? json_decode($sched['raw_json'], true) : null;

            $teachersStmt = $pdo->query("SELECT * FROM teachers ORDER BY role DESC, name ASC");
            $teachers = $teachersStmt->fetchAll();

            $holidaysStmt = $pdo->query("SELECT * FROM holidays ORDER BY date ASC");
            $holidays = $holidaysStmt->fetchAll();

            $attendanceStmt = $pdo->query("SELECT id, teacherId, date, checkInTime, checkOutTime, status, method as verificationMethod, lateMinutes, earlyMinutes as earlyLeaveMinutes, notes FROM attendance_records ORDER BY date DESC, checkInTime DESC LIMIT 3000");
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

            // 1. Save Profile
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

                // Persist uploaded thumbnail & favicon to physical disk files
                if (!empty($p['ogImageUrl']) && strpos($p['ogImageUrl'], 'data:image') === 0) {
                    $ogParts = explode(',', $p['ogImageUrl']);
                    if (count($ogParts) === 2) {
                        $ogBinary = base64_decode($ogParts[1]);
                        @file_put_contents(__DIR__ . '/og-image.jpg', $ogBinary);
                        @file_put_contents(__DIR__ . '/og-image.png', $ogBinary);
                    }
                }
                if (!empty($p['faviconUrl']) && strpos($p['faviconUrl'], 'data:image') === 0) {
                    $favParts = explode(',', $p['faviconUrl']);
                    if (count($favParts) === 2) {
                        $favBinary = base64_decode($favParts[1]);
                        @file_put_contents(__DIR__ . '/favicon.png', $favBinary);
                        @file_put_contents(__DIR__ . '/favicon.ico', $favBinary);
                    }
                }
            }

            // 2. Save Teachers (and delete removed teachers from MySQL)
            if (isset($body['teachers']) && is_array($body['teachers'])) {
                $teachersList = $body['teachers'];
                $validIds = [];
                foreach ($teachersList as $t) {
                    if (!empty($t['id'])) $validIds[] = $t['id'];
                }

                // Delete teachers from DB that are no longer in the list (except super admin)
                if (!empty($validIds)) {
                    $placeholders = implode(',', array_fill(0, count($validIds), '?'));
                    $delStmt = $pdo->prepare("DELETE FROM teachers WHERE id NOT IN ($placeholders) AND id != 'super-admin-jaenal'");
                    $delStmt->execute($validIds);
                } else {
                    $pdo->exec("DELETE FROM teachers WHERE id != 'super-admin-jaenal'");
                }

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

            // 3. Save Schedule
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

            // 4. Save Attendance Records
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

            // 5. Save Leave Requests
            if (isset($body['leaveRequests']) && is_array($body['leaveRequests'])) {
                $leaveSql = "INSERT INTO leave_requests 
                             (id, teacherId, type, startDate, endDate, reason, status, approvedBy)
                             VALUES (:id, :teacherId, :type, :startDate, :endDate, :reason, :status, :approvedBy)
                             ON DUPLICATE KEY UPDATE 
                             type = VALUES(type),
                             startDate = VALUES(startDate),
                             endDate = VALUES(endDate),
                             reason = VALUES(reason),
                             status = VALUES(status),
                             approvedBy = VALUES(approvedBy)";
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

            // 6. Save Holidays
            if (isset($body['holidays']) && is_array($body['holidays'])) {
                $hSql = "INSERT INTO holidays (id, date, name, type)
                         VALUES (:id, :date, :name, :type)
                         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type)";
                $hStmt = $pdo->prepare($hSql);
                foreach ($body['holidays'] as $h) {
                    if (empty($h['id']) || empty($h['date'])) continue;
                    $hStmt->execute([
                        ':id' => $h['id'],
                        ':date' => $h['date'],
                        ':name' => $h['name'] ?? 'Hari Libur',
                        ':type' => $h['type'] ?? 'NASIONAL'
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Sinkronisasi data ke MySQL Plesk berhasil!',
                'version' => time(),
                'lastUpdated' => time() * 1000
            ]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'delete_teacher':
        $delId = $_GET['id'] ?? $body['id'] ?? '';
        if (!empty($delId) && $delId !== 'super-admin-jaenal') {
            try {
                $stmt = $pdo->prepare("DELETE FROM teachers WHERE id = :id");
                $stmt->execute([':id' => $delId]);
                echo json_encode(['success' => true, 'message' => 'Data GTK berhasil dihapus permanen dari database MySQL']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID GTK tidak valid atau dilindungi']);
        }
        break;

    case 'teachers':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM teachers ORDER BY role DESC, name ASC");
                $teachers = $stmt->fetchAll();
                echo json_encode(['success' => true, 'teachers' => $teachers, 'version' => time()]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        } else if ($method === 'POST') {
            try {
                $teachers = $body['teachers'] ?? $body;
                if (!is_array($teachers)) throw new Exception('Format data harus array');
                $pdo->beginTransaction();

                $validIds = [];
                foreach ($teachers as $t) {
                    if (!empty($t['id'])) $validIds[] = $t['id'];
                }

                if (!empty($validIds)) {
                    $placeholders = implode(',', array_fill(0, count($validIds), '?'));
                    $delStmt = $pdo->prepare("DELETE FROM teachers WHERE id NOT IN ($placeholders) AND id != 'super-admin-jaenal'");
                    $delStmt->execute($validIds);
                } else {
                    $pdo->exec("DELETE FROM teachers WHERE id != 'super-admin-jaenal'");
                }

                $tSql = "INSERT INTO teachers (id, fingerprintId, nik, nip, nuptk, pegId, name, title, position, employmentStatus, role, pin, gender, phone, email, teachingHoursPerWeek, isBiometricEnrolled, avatarColor, isActive)
                         VALUES (:id, :fingerprintId, :nik, :nip, :nuptk, :pegId, :name, :title, :position, :employmentStatus, :role, :pin, :gender, :phone, :email, :teachingHoursPerWeek, :isBiometricEnrolled, :avatarColor, :isActive)
                         ON DUPLICATE KEY UPDATE 
                         fingerprintId=VALUES(fingerprintId), nik=VALUES(nik), nip=VALUES(nip), nuptk=VALUES(nuptk), pegId=VALUES(pegId), name=VALUES(name), title=VALUES(title), position=VALUES(position), employmentStatus=VALUES(employmentStatus), role=VALUES(role), pin=VALUES(pin), gender=VALUES(gender), phone=VALUES(phone), email=VALUES(email), teachingHoursPerWeek=VALUES(teachingHoursPerWeek), isBiometricEnrolled=VALUES(isBiometricEnrolled), avatarColor=VALUES(avatarColor), isActive=VALUES(isActive)";
                $tStmt = $pdo->prepare($tSql);
                foreach ($teachers as $t) {
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
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Data guru berhasil diperbarui di MySQL!']);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        }
        break;

    case 'save_record':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
            exit;
        }
        try {
            $sql = "INSERT INTO attendance_records 
                    (id, teacherId, date, checkInTime, checkOutTime, status, method, lateMinutes, earlyMinutes, notes, deviceIp)
                    VALUES (:id, :teacherId, :date, :checkInTime, :checkOutTime, :status, :method, :lateMinutes, :earlyMinutes, :notes, :deviceIp)
                    ON DUPLICATE KEY UPDATE 
                    checkInTime = VALUES(checkInTime),
                    checkOutTime = VALUES(checkOutTime),
                    status = VALUES(status),
                    lateMinutes = VALUES(lateMinutes),
                    earlyMinutes = VALUES(earlyMinutes),
                    notes = VALUES(notes)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $body['id'] ?? uniqid('att-'),
                ':teacherId' => $body['teacherId'] ?? '',
                ':date' => $body['date'] ?? date('Y-m-d'),
                ':checkInTime' => $body['checkInTime'] ?? null,
                ':checkOutTime' => $body['checkOutTime'] ?? null,
                ':status' => $body['status'] ?? 'HADIR',
                ':method' => $body['verificationMethod'] ?? $body['method'] ?? 'FINGERPRINT',
                ':lateMinutes' => $body['lateMinutes'] ?? 0,
                ':earlyMinutes' => $body['earlyLeaveMinutes'] ?? $body['earlyMinutes'] ?? 0,
                ':notes' => $body['notes'] ?? '',
                ':deviceIp' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
            echo json_encode([
                'success' => true, 
                'message' => 'Presensi berhasil disimpan ke MySQL!',
                'version' => time(),
                'lastUpdated' => time() * 1000
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
            exit;
        }
        $identifier = trim($body['identifier'] ?? '');
        $pin = trim($body['pin'] ?? '');

        // Super Admin Hardcoded / DB check
        if (($identifier === 'jaenalmaskun@gmail.com' || $identifier === 'jaenalmaskun' || $identifier === 'superadmin') && ($pin === 'masbagus' || $pin === '999999')) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => 'super-admin-jaenal',
                    'fingerprintId' => 999,
                    'nik' => '3302010000009999',
                    'name' => 'Jaenal Maskun',
                    'title' => 'S.Pd.I.',
                    'position' => 'Super Administrator SIMPRESENSI',
                    'employmentStatus' => 'TENAGA_KEPENDIDIKAN',
                    'role' => 'ADMIN',
                    'gender' => 'L',
                    'phone' => '081234567890',
                    'email' => 'jaenalmaskun@gmail.com',
                    'avatarColor' => 'bg-emerald-800',
                    'isActive' => true
                ]
            ]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM teachers WHERE (nik = :ident OR email = :ident OR nip = :ident OR pegId = :ident OR nuptk = :ident OR fingerprintId = :ident) AND (pin = :pin OR (pin IS NULL AND :pin = '123456') OR (pin = '' AND :pin = '123456')) LIMIT 1");
            $stmt->execute([':ident' => $identifier, ':pin' => $pin]);
            $user = $stmt->fetch();
            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Email/NIK/NIP/Peg ID atau PIN tidak cocok']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'upload_og_image':
    case 'upload-og-image':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
            exit;
        }
        try {
            $imageDataUrl = $body['imageDataUrl'] ?? '';
            if (empty($imageDataUrl) || strpos($imageDataUrl, 'data:image') !== 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Format gambar base64 tidak valid']);
                exit;
            }
            $parts = explode(',', $imageDataUrl);
            if (count($parts) === 2) {
                $bin = base64_decode($parts[1]);
                @file_put_contents(__DIR__ . '/og-image.jpg', $bin);
                @file_put_contents(__DIR__ . '/og-image.png', $bin);
            }

            // Update madrasah_profile in MySQL
            $profileStmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
            $profile = $profileStmt->fetch();
            $pData = [];
            if ($profile && !empty($profile['raw_json'])) {
                $pData = json_decode($profile['raw_json'], true) ?: [];
            }
            $pData['ogImageUrl'] = $imageDataUrl;
            $newJson = json_encode($pData);

            $updateStmt = $pdo->prepare("UPDATE madrasah_profile SET raw_json = :json WHERE id = 1");
            $updateStmt->execute([':json' => $newJson]);

            echo json_encode([
                'success' => true,
                'message' => 'Thumbnail banner berhasil diunggah & disimpan di server!',
                'version' => time()
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'og_image':
    case 'og-image':
    case 'og_image.jpg':
    case 'og-image.jpg':
        try {
            $profileStmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
            $profile = $profileStmt->fetch();
            if ($profile && !empty($profile['raw_json'])) {
                $pData = json_decode($profile['raw_json'], true);
                if (!empty($pData['ogImageUrl']) && strpos($pData['ogImageUrl'], 'data:image') === 0) {
                    $parts = explode(',', $pData['ogImageUrl']);
                    if (count($parts) === 2) {
                        $mime = 'image/jpeg';
                        if (preg_match('/^data:([^;]+);base64,/', $pData['ogImageUrl'], $m)) {
                            $mime = $m[1];
                        }
                        header('Content-Type: ' . $mime);
                        header('Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=120');
                        header('Accept-Ranges: bytes');
                        echo base64_decode($parts[1]);
                        exit;
                    }
                }
            }
            if (file_exists(__DIR__ . '/og-image.jpg')) {
                header('Content-Type: image/jpeg');
                header('Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=120');
                header('Accept-Ranges: bytes');
                readfile(__DIR__ . '/og-image.jpg');
                exit;
            }
            if (file_exists(__DIR__ . '/og-image.png')) {
                header('Content-Type: image/png');
                header('Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=120');
                header('Accept-Ranges: bytes');
                readfile(__DIR__ . '/og-image.png');
                exit;
            }
            http_response_code(404);
            echo "Not Found";
        } catch (Exception $e) {
            http_response_code(500);
            echo "Error";
        }
        exit;

    case 'favicon':
    case 'favicon.ico':
    case 'favicon.png':
        try {
            $profileStmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
            $profile = $profileStmt->fetch();
            if ($profile && !empty($profile['raw_json'])) {
                $pData = json_decode($profile['raw_json'], true);
                if (!empty($pData['faviconUrl']) && strpos($pData['faviconUrl'], 'data:image') === 0) {
                    $parts = explode(',', $pData['faviconUrl']);
                    if (count($parts) === 2) {
                        header('Content-Type: image/png');
                        header('Cache-Control: public, max-age=3600');
                        echo base64_decode($parts[1]);
                        exit;
                    }
                }
            }
            if (file_exists(__DIR__ . '/favicon.png')) {
                header('Content-Type: image/png');
                header('Cache-Control: public, max-age=3600');
                readfile(__DIR__ . '/favicon.png');
                exit;
            }
            if (file_exists(__DIR__ . '/favicon.ico')) {
                header('Content-Type: image/x-icon');
                header('Cache-Control: public, max-age=3600');
                readfile(__DIR__ . '/favicon.ico');
                exit;
            }
            http_response_code(404);
            echo "Not Found";
        } catch (Exception $e) {
            http_response_code(500);
            echo "Error";
        }
        exit;

    default:
        echo json_encode([
            'success' => true,
            'name' => 'SIMPRESENSI Madrasah API',
            'version' => '2.5.0',
            'database' => 'MySQL (Plesk jaenal_absensi)',
            'endpoints' => [
                'GET ?action=test_db',
                'GET ?action=get_initial_data',
                'POST ?action=sync',
                'GET / POST ?action=teachers',
                'POST ?action=save_record',
                'POST ?action=login',
                'GET ?action=version'
            ]
        ]);
        break;
}
`;
}

export function generateIndexPhp(options: PleskExportOptions): string {
  const schoolName = options.profile.name || 'SIMPRESENSI GTK Madrasah';
  return `<?php
// ============================================================
// SIMPRESENSI MADRASAH - DYNAMIC SSR OPEN GRAPH & ENTRY POINT
// ============================================================
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

// Fetch latest profile from MySQL
try {
    require_once __DIR__ . '/api.php';
    if (isset($pdo)) {
        $stmt = $pdo->query("SELECT * FROM madrasah_profile LIMIT 1");
        $row = $stmt->fetch();
        if ($row && !empty($row['name'])) {
            $schoolName = $row['name'];
        }
    }
} catch (Exception $e) {
    // fallback to default
}

$pageTitle = "SIMPRESENSI Madrasah - " . htmlspecialchars($schoolName);
$pageDesc = "Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK " . htmlspecialchars($schoolName) . " Terintegrasi Kemenag";
$ogImageUrl = $baseUrl . "/og-image.jpg";
$ogImageSecureUrl = "https://" . $host . "/og-image.jpg";
$faviconUrl = $baseUrl . "/api/favicon?t=" . $cacheBuster;
?>
<!doctype html>
<html lang="id" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
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
    <meta property="og:url" content="<?php echo $currentUrl; ?>" />

    <!-- Twitter Card Preview -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo $pageTitle; ?>" />
    <meta name="twitter:description" content="<?php echo $pageDesc; ?>" />
    <meta name="twitter:image" content="<?php echo $ogImageUrl; ?>" />
    <meta name="twitter:image:alt" content="<?php echo htmlspecialchars($schoolName); ?>" />
  </head>
  <body class="bg-zinc-100 text-zinc-900 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;
}

export function generateHtaccess(): string {
  return `# ============================================================
# SIMPRESENSI MADRASAH - PLESK APACHE/NGINX REWRITE CONFIG
# ============================================================

# 1. Pastikan index.php diprioritaskan utama sebelum index.html
DirectoryIndex index.php index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 2. Pastikan routing gambar thumbnail OG dan Favicon diproses dinamis jika dibutuhkan
  RewriteRule ^(og-image\\.jpg|og-image\\.png|api/og-image)$ api.php?action=og_image [QSA,L]
  RewriteRule ^(favicon\\.ico|favicon\\.png|api/favicon)$ api.php?action=favicon [QSA,L]

  # 3. Biarkan api.php & index.php berjalan langsung
  RewriteRule ^api\\.php$ - [L]
  RewriteRule ^index\\.php$ - [L]

  # 4. Routing API ke api.php untuk Plesk / Apache Server
  RewriteRule ^api/data/?$ api.php?action=get_initial_data [QSA,L]
  RewriteRule ^api/sync/?$ api.php?action=sync [QSA,L]
  RewriteRule ^api/upload-og-image/?$ api.php?action=upload_og_image [QSA,L]
  RewriteRule ^api/teachers/([^/]+)/?$ api.php?action=delete_teacher&id=$1 [QSA,L]
  RewriteRule ^api/teachers/?$ api.php?action=teachers [QSA,L]
  RewriteRule ^api/delete-teacher/?$ api.php?action=delete_teacher [QSA,L]
  RewriteRule ^api/version/?$ api.php?action=version [QSA,L]
  RewriteRule ^api/health/?$ api.php?action=test_db [QSA,L]
  RewriteRule ^api/save-record/?$ api.php?action=save_record [QSA,L]
  RewriteRule ^api/login/?$ api.php?action=login [QSA,L]

  # 5. Jika file fisik aset statis ada (assets/, CSS, JS, fonts), sajikan langsung
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 6. Alihkan semua rute URL frontend ke index.php (Dynamic Open Graph + SPA)
  RewriteRule ^ index.php [L]
</IfModule>

# Kompresi GZIP untuk Performa Cepat
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Pengaturan Header Keamanan Standar
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-XSS-Protection "1; mode=block"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Access-Control-Allow-Origin "*"
</IfModule>

# Caching File Statis (JS, CSS, Gambar)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
}

export function generateReadme(options: PleskExportOptions): string {
  return `======================================================================
  PANDUAN INSTALASI SIMPRESENSI MADRASAH DI PLESK CONTROL PANEL
======================================================================

Kredensial Database MySQL yang telah dikonfigurasi:
--------------------------------------------------
- Host Database     : localhost
- Database Name     : jaenal_absensi
- Database Username : jaenal_absensi
- Database Password : masbagus15

Akun Super Administrator:
--------------------------------------------------
- Email / User      : jaenalmaskun@gmail.com
- Password / PIN    : masbagus

Kepala Madrasah:
--------------------------------------------------
- Nama              : ${options.profile.headmasterName || '-'}
- PIN Default GTK   : 123456

======================================================================
LANGKAH-LANGKAH DEPLOYMENT DI PLESK:
======================================================================

LANGKAH 1: MEMBUAT DATABASE DI PLESK
1. Login ke panel Plesk Anda (https://domain-anda.com:8443).
2. Masuk ke menu "Databases" -> Klik "Add Database".
3. Masukkan data persis seperti berikut:
   - Database name: jaenal_absensi
   - Database user name: jaenal_absensi
   - Password: masbagus15 (konfirmasi: masbagus15)
4. Klik "OK" untuk membuat database.

LANGKAH 2: IMPORT FILE DATABASE (database.sql)
1. Di halaman Databases Plesk yang baru dibuat, klik tombol "phpMyAdmin".
2. Di phpMyAdmin, klik tab menu "Import" di bagian atas.
3. Klik "Choose File" dan pilih file "database.sql" yang ada di dalam paket zip ini.
4. Gulir ke bawah dan klik tombol "Go" / "Import".
5. Pastikan muncul notifikasi hijau "Import has been successfully finished".

LANGKAH 3: UPLOAD FILE KE FILE MANAGER PLESK
1. Di Plesk, buka menu "Files" -> masuk ke direktori "httpdocs" (atau folder domain Anda).
2. Jika ada file default seperti index.html bawaan Plesk, silakan hapus atau cadangkan.
3. Upload seluruh isi file dari zip ini ke dalam folder "httpdocs":
   - index.html
   - api.php
   - .htaccess
   - folder assets/ (beserta seluruh isinya: css & js)
4. Pastikan izin akses file (permissions) adalah 644 untuk file dan 755 untuk folder.

LANGKAH 4: SELESAI & UJI COBA
1. Buka domain Anda di web browser: https://domain-anda.com
2. Masuk menggunakan akun Super Admin:
   - User : jaenalmaskun@gmail.com
   - Pass : masbagus
3. SIMPRESENSI Madrasah siap digunakan secara online 24 jam!

Hubungi Tim Teknis jika memerlukan bantuan konfigurasi tambahan.
`;
}

export function generatePleskHtmlGuide(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Panduan Instalasi Plesk - SIMPRESENSI Madrasah</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #065f46; font-size: 24px; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 12px; }
    h2 { color: #0f766e; font-size: 18px; margin-top: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; background: #d1fae5; color: #065f46; }
    .card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .code-box { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 10px; font-family: monospace; font-size: 13px; overflow-x: auto; margin: 10px 0; }
    ol { padding-left: 20px; }
    li { margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>🚀 Panduan Instalasi SIMPRESENSI di Plesk</h1>
      <span class="badge">MySQL Ready</span>
    </div>

    <div class="card">
      <strong>Kredensial Database MySQL yang telah tertanam:</strong>
      <ul>
        <li><strong>Host:</strong> <code>localhost</code></li>
        <li><strong>Database:</strong> <code>jaenal_absensi</code></li>
        <li><strong>User:</strong> <code>jaenal_absensi</code></li>
        <li><strong>Password:</strong> <code>masbagus15</code></li>
      </ul>
    </div>

    <h2>Langkah 1: Buat Database di Plesk</h2>
    <ol>
      <li>Login ke panel Plesk Anda -> Menu <strong>Databases</strong> -> <strong>Add Database</strong>.</li>
      <li>Isi Database name: <code>jaenal_absensi</code>, User: <code>jaenal_absensi</code>, Password: <code>masbagus15</code>.</li>
      <li>Klik <strong>OK</strong>.</li>
    </ol>

    <h2>Langkah 2: Import database.sql ke phpMyAdmin</h2>
    <ol>
      <li>Klik tombol <strong>phpMyAdmin</strong> pada database <code>jaenal_absensi</code>.</li>
      <li>Pilih tab <strong>Import</strong> -> <strong>Choose File</strong> -> pilih <code>database.sql</code>.</li>
      <li>Klik <strong>Go</strong> / <strong>Import</strong> hingga selesai.</li>
    </ol>

    <h2>Langkah 3: Upload ke File Manager (httpdocs)</h2>
    <ol>
      <li>Buka menu <strong>Files</strong> -> folder <code>httpdocs</code>.</li>
      <li>Ekstrak atau upload semua file dari paket ZIP ini ke dalam folder <code>httpdocs</code>.</li>
      <li>Buka domain Anda di browser: siap digunakan!</li>
    </ol>
  </div>
</body>
</html>`;
}

/**
 * Creates the complete downloadable ZIP file for Plesk
 */
export async function createPleskZip(options: PleskExportOptions): Promise<Blob> {
  const zip = new JSZip();

  // 1. Database SQL Dump
  const sqlContent = generateMySQLDump(options);
  zip.file('database.sql', sqlContent);

  // 2. PHP Backend API
  const phpContent = generatePHPBackend();
  zip.file('api.php', phpContent);

  // 3. .htaccess configuration
  const htaccessContent = generateHtaccess();
  zip.file('.htaccess', htaccessContent);

  // 4. Instructions Readme & HTML Guide
  const readmeContent = generateReadme(options);
  zip.file('README_PLESK.txt', readmeContent);

  const htmlGuide = generatePleskHtmlGuide();
  zip.file('PANDUAN_INSTALASI_PLESK.html', htmlGuide);

  // 5. Dynamic PHP Entry Point (SSR Meta tags for Social Media / WhatsApp / Crawlers)
  const indexPhp = generateIndexPhp(options);
  zip.file('index.php', indexPhp);

  // 6. Persist physical og-image and favicon into ZIP root
  if (options.profile.ogImageUrl && options.profile.ogImageUrl.startsWith('data:image')) {
    const parts = options.profile.ogImageUrl.split(',');
    if (parts.length === 2) {
      zip.file('og-image.jpg', parts[1], { base64: true });
      zip.file('og-image.png', parts[1], { base64: true });
    }
  } else {
    try {
      const resp = await fetch('/og-image.jpg');
      if (resp.ok) {
        const blob = await resp.blob();
        zip.file('og-image.jpg', blob);
        zip.file('og-image.png', blob);
      }
    } catch (e) {
      // ignore
    }
  }

  if (options.profile.faviconUrl && options.profile.faviconUrl.startsWith('data:image')) {
    const parts = options.profile.faviconUrl.split(',');
    if (parts.length === 2) {
      zip.file('favicon.png', parts[1], { base64: true });
      zip.file('favicon.ico', parts[1], { base64: true });
    }
  }

  // 7. Circular SVG Favicon
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

  // 8. Build a self-contained Single-Page HTML with circular favicon
  let indexHtml = `<!doctype html>
<html lang="id" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <link rel="image_src" href="https://absensi.jaenalmaskun.biz.id/og-image.jpg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SIMPRESENSI Madrasah - ${options.profile.name || 'GTK'}</title>
    <meta name="description" content="Sistem Presensi Fingerprint & Laporan GTK Madrasah Kemenag" />
    
    <!-- Open Graph / WhatsApp / Telegram Preview Fallback -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="SIMPRESENSI GTK Madrasah" />
    <meta property="og:title" content="SIMPRESENSI Madrasah - ${options.profile.name || 'GTK'}" />
    <meta property="og:description" content="Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK ${options.profile.name || 'Madrasah'} Terintegrasi Kemenag" />
    <meta property="og:image" content="https://absensi.jaenalmaskun.biz.id/og-image.jpg" />
    <meta property="og:image:secure_url" content="https://absensi.jaenalmaskun.biz.id/og-image.jpg" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card Preview -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="SIMPRESENSI Madrasah - ${options.profile.name || 'GTK'}" />
    <meta name="twitter:description" content="Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK ${options.profile.name || 'Madrasah'} Terintegrasi Kemenag" />
    <meta name="twitter:image" content="https://absensi.jaenalmaskun.biz.id/og-image.jpg" />
  </head>
  <body class="bg-zinc-100 text-zinc-900 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  try {
    // Attempt to copy files from current document or public assets if running in browser
    const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    
    // If index.html exists in DOM, grab rendered markup structure
    if (document.documentElement) {
      const clonedDoc = document.documentElement.cloneNode(true) as HTMLElement;
      // Remove AI studio specific scripts if any
      const rootDiv = clonedDoc.querySelector('#root');
      if (rootDiv) {
        // keep root clean for React mounting
      }
    }
  } catch (e) {
    // fallback
  }

  zip.file('index.html', indexHtml);

  // Generate zip binary
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return zipBlob;
}
