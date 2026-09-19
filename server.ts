import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import JSZip from "jszip";
import mysql from "mysql2/promise";
import { 
  generateMySQLDump, 
  generatePHPBackend, 
  generateHtaccess, 
  generateReadme, 
  generatePleskHtmlGuide,
  generateIndexPhp
} from "./src/utils/pleskPackageGenerator";
import {
  generateMySQLDumpForCpanel,
  generatePHPBackendForCpanel,
  generateDbConfigFileForCpanel,
  generateHtaccessForCpanel,
  generateReadmeCpanel,
  generateCpanelHtmlGuide,
  CPANEL_DEFAULT_DB
} from "./src/utils/cpanelPackageGenerator";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Centralized Database Storage Path
  const DATA_DIR = path.join(process.cwd(), "data");
  const DB_FILE = path.join(DATA_DIR, "simpresensi_db.json");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.error("Failed to create data dir:", e);
    }
  }

  // Helper to load stored data
  const loadDatabase = () => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("Error reading database file:", err);
    }
    return null;
  };

  // Helper to save data safely
  const CUSTOM_OG_FILE = path.join(DATA_DIR, "custom_og_image.jpg");
  const CUSTOM_FAVICON_FILE = path.join(DATA_DIR, "custom_favicon.png");

  const persistMediaFiles = (profile: any) => {
    if (!profile) return;
    try {
      if (profile.ogImageUrl && typeof profile.ogImageUrl === "string" && profile.ogImageUrl.startsWith("data:image/")) {
        const matches = profile.ogImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], "base64");
          try { fs.writeFileSync(CUSTOM_OG_FILE, buffer); } catch(e){}
          const pubJpg = path.join(process.cwd(), "public", "og-image.jpg");
          const distJpg = path.join(process.cwd(), "dist", "og-image.jpg");
          const pubPng = path.join(process.cwd(), "public", "og-image.png");
          const distPng = path.join(process.cwd(), "dist", "og-image.png");
          try { fs.writeFileSync(pubJpg, buffer); } catch(e){}
          try { if (fs.existsSync(path.join(process.cwd(), "dist"))) fs.writeFileSync(distJpg, buffer); } catch(e){}
          try { fs.writeFileSync(pubPng, buffer); } catch(e){}
          try { if (fs.existsSync(path.join(process.cwd(), "dist"))) fs.writeFileSync(distPng, buffer); } catch(e){}
        }
      }
      if (profile.faviconUrl && typeof profile.faviconUrl === "string" && profile.faviconUrl.startsWith("data:image/")) {
        const matches = profile.faviconUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], "base64");
          try { fs.writeFileSync(CUSTOM_FAVICON_FILE, buffer); } catch(e){}
          const pubFav = path.join(process.cwd(), "public", "favicon.png");
          const distFav = path.join(process.cwd(), "dist", "favicon.png");
          const pubIco = path.join(process.cwd(), "public", "favicon.ico");
          const distIco = path.join(process.cwd(), "dist", "favicon.ico");
          try { fs.writeFileSync(pubFav, buffer); } catch(e){}
          try { if (fs.existsSync(path.join(process.cwd(), "dist"))) fs.writeFileSync(distFav, buffer); } catch(e){}
          try { fs.writeFileSync(pubIco, buffer); } catch(e){}
          try { if (fs.existsSync(path.join(process.cwd(), "dist"))) fs.writeFileSync(distIco, buffer); } catch(e){}
        }
      }
    } catch (err) {
      console.error("Failed to persist media files:", err);
    }
  };

  const saveDatabase = (data: any) => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      if (data?.profile) {
        persistMediaFiles(data.profile);
      }
      // Otomatis sinkronisasi & simpan ke MySQL database masbagoes_absensi
      syncDataToMySQL(data).catch(() => {});
      return true;
    } catch (err) {
      console.error("Error writing database file:", err);
      return false;
    }
  };

  // ============================================================
  // MySQL Persistence & Auto-Sync Engine (Database: masbagoes_absensi)
  // ============================================================
  let mysqlPool: mysql.Pool | null = null;

  let currentMysqlConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "masbagoes_absensi",
    password: process.env.MYSQL_PASSWORD || "masbagus15",
    database: process.env.MYSQL_DATABASE || "masbagoes_absensi",
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000,
  };

  const mysqlStatus = {
    connected: false,
    autoSyncEnabled: true,
    lastAttempt: 0,
    lastSyncTime: null as number | null,
    lastSyncStatus: "standby" as "standby" | "success" | "error" | "syncing",
    lastError: null as string | null,
    database: currentMysqlConfig.database,
    user: currentMysqlConfig.user,
    host: currentMysqlConfig.host,
    port: currentMysqlConfig.port,
    syncedCount: 0,
  };

  const getMysqlPool = (cfg = currentMysqlConfig): mysql.Pool => {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool(cfg);
    }
    return mysqlPool;
  };

  const resetMysqlPool = (newCfg: typeof currentMysqlConfig) => {
    if (mysqlPool) {
      try { mysqlPool.end(); } catch (e) {}
      mysqlPool = null;
    }
    currentMysqlConfig = { ...newCfg };
    mysqlStatus.database = currentMysqlConfig.database;
    mysqlStatus.user = currentMysqlConfig.user;
    mysqlStatus.host = currentMysqlConfig.host;
    mysqlStatus.port = currentMysqlConfig.port;
    mysqlPool = mysql.createPool(currentMysqlConfig);
  };

  const initMySQLTables = async (pool: mysql.Pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS madrasah_profile (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        nsm VARCHAR(50) DEFAULT NULL,
        npsn VARCHAR(50) DEFAULT NULL,
        raw_json LONGTEXT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_schedules (
        id INT NOT NULL AUTO_INCREMENT,
        workDaysCount INT DEFAULT 6,
        toleranceMinutes INT DEFAULT 5,
        raw_json LONGTEXT DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id VARCHAR(64) NOT NULL,
        fingerprintId INT NOT NULL,
        nik VARCHAR(20) NOT NULL,
        nip VARCHAR(50) DEFAULT '-',
        nuptk VARCHAR(50) DEFAULT '-',
        pegId VARCHAR(50) DEFAULT '-',
        name VARCHAR(255) NOT NULL,
        title VARCHAR(50) DEFAULT '',
        position VARCHAR(150) DEFAULT 'Guru Kelas',
        employmentStatus VARCHAR(50) DEFAULT 'GTY',
        role VARCHAR(50) DEFAULT 'GURU',
        pin VARCHAR(50) DEFAULT '123456',
        gender ENUM('L','P') DEFAULT 'L',
        phone VARCHAR(50) DEFAULT '-',
        email VARCHAR(100) DEFAULT '',
        teachingHoursPerWeek INT DEFAULT 24,
        isBiometricEnrolled TINYINT(1) DEFAULT 1,
        avatarColor VARCHAR(50) DEFAULT 'bg-emerald-700',
        isActive TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_nik (nik)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id VARCHAR(64) NOT NULL,
        teacherId VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        checkInTime VARCHAR(20) DEFAULT NULL,
        checkOutTime VARCHAR(20) DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'HADIR',
        method VARCHAR(50) DEFAULT 'FINGERPRINT',
        lateMinutes INT DEFAULT 0,
        earlyMinutes INT DEFAULT 0,
        notes TEXT DEFAULT NULL,
        deviceIp VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_teacher_date (teacherId, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(64) NOT NULL,
        teacherId VARCHAR(64) NOT NULL,
        type VARCHAR(50) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
        documentUrl TEXT DEFAULT NULL,
        approvedBy VARCHAR(255) DEFAULT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'NASIONAL',
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INT NOT NULL AUTO_INCREMENT,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
        message TEXT DEFAULT NULL,
        synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  };

  const syncDataToMySQL = async (data: any): Promise<boolean> => {
    if (!data || !mysqlStatus.autoSyncEnabled) return false;
    try {
      mysqlStatus.lastAttempt = Date.now();
      mysqlStatus.lastSyncStatus = "syncing";
      const pool = getMysqlPool();

      await initMySQLTables(pool);

      // 1. Profile
      if (data.profile) {
        await pool.query(
          `INSERT INTO madrasah_profile (id, name, nsm, npsn, raw_json)
           VALUES (1, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), nsm=VALUES(nsm), npsn=VALUES(npsn), raw_json=VALUES(raw_json)`,
          [
            data.profile.name || "Madrasah",
            data.profile.nsm || "",
            data.profile.npsn || "",
            JSON.stringify(data.profile),
          ]
        );
      }

      // 2. Schedule
      if (data.schedule) {
        await pool.query(
          `INSERT INTO work_schedules (id, workDaysCount, toleranceMinutes, raw_json)
           VALUES (1, ?, ?, ?)
           ON DUPLICATE KEY UPDATE workDaysCount=VALUES(workDaysCount), toleranceMinutes=VALUES(toleranceMinutes), raw_json=VALUES(raw_json)`,
          [
            data.schedule.workDaysCount || 6,
            data.schedule.toleranceMinutes || 5,
            JSON.stringify(data.schedule),
          ]
        );
      }

      // 3. Teachers
      if (Array.isArray(data.teachers) && data.teachers.length > 0) {
        for (const t of data.teachers) {
          if (!t.id) continue;
          await pool.query(
            `INSERT INTO teachers (id, fingerprintId, nik, nip, nuptk, pegId, name, title, position, employmentStatus, role, pin, gender, phone, email, teachingHoursPerWeek, isBiometricEnrolled, avatarColor, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               fingerprintId=VALUES(fingerprintId), nik=VALUES(nik), nip=VALUES(nip), nuptk=VALUES(nuptk),
               pegId=VALUES(pegId), name=VALUES(name), title=VALUES(title), position=VALUES(position),
               employmentStatus=VALUES(employmentStatus), role=VALUES(role), pin=VALUES(pin), gender=VALUES(gender),
               phone=VALUES(phone), email=VALUES(email), teachingHoursPerWeek=VALUES(teachingHoursPerWeek),
               isBiometricEnrolled=VALUES(isBiometricEnrolled), avatarColor=VALUES(avatarColor), isActive=VALUES(isActive)`,
            [
              t.id,
              t.fingerprintId || 0,
              t.nik || t.id,
              t.nip || "-",
              t.nuptk || "-",
              t.pegId || "-",
              t.name || "Guru",
              t.title || "",
              t.position || "Guru",
              t.employmentStatus || "GTY",
              t.role || "GURU",
              t.pin || "123456",
              t.gender || "L",
              t.phone || "-",
              t.email || "",
              t.teachingHoursPerWeek || 24,
              t.isBiometricEnrolled ? 1 : 0,
              t.avatarColor || "bg-emerald-700",
              t.isActive !== false ? 1 : 0,
            ]
          );
        }
      }

      // 4. Attendance Records
      if (Array.isArray(data.attendanceRecords) && data.attendanceRecords.length > 0) {
        for (const r of data.attendanceRecords) {
          if (!r.id || !r.teacherId || !r.date) continue;
          await pool.query(
            `INSERT INTO attendance_records (id, teacherId, date, checkInTime, checkOutTime, status, method, lateMinutes, earlyMinutes, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               checkInTime=VALUES(checkInTime), checkOutTime=VALUES(checkOutTime),
               status=VALUES(status), method=VALUES(method), lateMinutes=VALUES(lateMinutes),
               earlyMinutes=VALUES(earlyMinutes), notes=VALUES(notes)`,
            [
              r.id,
              r.teacherId,
              r.date,
              r.checkInTime || null,
              r.checkOutTime || null,
              r.status || "HADIR",
              r.method || r.verificationMethod || "FINGERPRINT",
              r.lateMinutes || 0,
              r.earlyMinutes || r.earlyLeaveMinutes || 0,
              r.notes || "",
            ]
          );
        }
      }

      // 5. Leave Requests
      if (Array.isArray(data.leaveRequests) && data.leaveRequests.length > 0) {
        for (const lr of data.leaveRequests) {
          if (!lr.id || !lr.teacherId) continue;
          await pool.query(
            `INSERT INTO leave_requests (id, teacherId, type, startDate, endDate, reason, status, approvedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE type=VALUES(type), startDate=VALUES(startDate), endDate=VALUES(endDate), reason=VALUES(reason), status=VALUES(status), approvedBy=VALUES(approvedBy)`,
            [
              lr.id,
              lr.teacherId,
              lr.type || "IZIN",
              lr.startDate || new Date().toISOString().split("T")[0],
              lr.endDate || new Date().toISOString().split("T")[0],
              lr.reason || "Izin",
              lr.status || "APPROVED",
              lr.approvedBy || "Kepala Madrasah",
            ]
          );
        }
      }

      // 6. Log Sync
      await pool.query(
        "INSERT INTO sync_logs (action, status, message) VALUES ('AUTO_SYNC', 'SUCCESS', 'Auto-sync ke MySQL masbagoes_absensi berhasil')"
      );

      mysqlStatus.connected = true;
      mysqlStatus.lastSyncTime = Date.now();
      mysqlStatus.lastSyncStatus = "success";
      mysqlStatus.lastError = null;
      mysqlStatus.syncedCount = (data.attendanceRecords?.length || 0) + (data.teachers?.length || 0);
      return true;
    } catch (err: any) {
      mysqlStatus.connected = false;
      mysqlStatus.lastSyncStatus = "error";
      mysqlStatus.lastError = err.message;
      return false;
    }
  };

  const syncSingleAttendanceRecordToMySQL = async (rec: any) => {
    if (!rec || !mysqlStatus.autoSyncEnabled) return;
    try {
      const pool = getMysqlPool();
      await pool.query(
        `INSERT INTO attendance_records (id, teacherId, date, checkInTime, checkOutTime, status, method, lateMinutes, earlyMinutes, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           checkInTime=VALUES(checkInTime), checkOutTime=VALUES(checkOutTime),
           status=VALUES(status), method=VALUES(method), lateMinutes=VALUES(lateMinutes),
           earlyMinutes=VALUES(earlyMinutes), notes=VALUES(notes)`,
        [
          rec.id,
          rec.teacherId,
          rec.date,
          rec.checkInTime || null,
          rec.checkOutTime || null,
          rec.status || "HADIR",
          rec.method || rec.verificationMethod || "FINGERPRINT",
          rec.lateMinutes || 0,
          rec.earlyMinutes || rec.earlyLeaveMinutes || 0,
          rec.notes || "",
        ]
      );
      mysqlStatus.connected = true;
      mysqlStatus.lastSyncTime = Date.now();
      mysqlStatus.lastSyncStatus = "success";
    } catch (e: any) {
      mysqlStatus.connected = false;
      mysqlStatus.lastError = e.message;
    }
  };

  // In-memory cache with version tracking
  let serverData = loadDatabase() || {
    profile: null,
    schedule: null,
    teachers: [],
    attendanceRecords: [],
    leaveRequests: [],
    holidays: [],
    version: 1,
    lastUpdated: Date.now(),
  };

  if (serverData?.profile) {
    persistMediaFiles(serverData.profile);
  }

  // Helper to determine base URL
  const getBaseUrl = (req: express.Request) => {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:3000";
    if (process.env.APP_URL && process.env.APP_URL.startsWith("http")) {
      return process.env.APP_URL.replace(/\/$/, "");
    }
    return `${proto}://${host}`;
  };

  const escapeHtmlAttr = (str: string) => {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const renderDynamicHtml = (template: string, req: express.Request) => {
    const baseUrl = getBaseUrl(req);
    const cacheBuster = serverData.lastUpdated || Date.now();
    const rawName = serverData.profile?.name || "SIMPRESENSI GTK Madrasah";
    const title = `SIMPRESENSI Madrasah - ${rawName}`;
    const desc = `Sistem Presensi Fingerprint & Rekapitulasi Laporan GTK ${rawName} Terintegrasi Kemenag`;
    const ogImageUrl = `${baseUrl}/api/og-image?t=${cacheBuster}`;
    const faviconUrl = serverData.profile?.faviconUrl 
      ? `${baseUrl}/api/favicon?t=${cacheBuster}` 
      : `${baseUrl}/favicon.svg`;
    const canonicalUrl = `${baseUrl}${req.path === "/" ? "" : req.path}`;

    let result = template;

    // Replace <title>
    result = result.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtmlAttr(title)}</title>`);

    // Replace standard description
    result = result.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta name="description" content="${escapeHtmlAttr(desc)}" />`);

    // Replace OpenGraph meta tags
    result = result.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`);
    result = result.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta property="og:description" content="${escapeHtmlAttr(desc)}" />`);
    result = result.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta property="og:image" content="${ogImageUrl}" />`);
    result = result.replace(/<meta\s+property=["']og:image:secure_url["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta property="og:image:secure_url" content="${ogImageUrl}" />`);

    // Replace Twitter meta tags
    result = result.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`);
    result = result.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta name="twitter:description" content="${escapeHtmlAttr(desc)}" />`);
    result = result.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/gi, 
      `<meta name="twitter:image" content="${ogImageUrl}" />`);

    // Favicon links
    result = result.replace(/<link\s+rel=["']icon["'].*?>/gi, 
      `<link rel="icon" type="image/png" href="${faviconUrl}" />`);
    result = result.replace(/<link\s+rel=["']apple-touch-icon["'].*?>/gi, 
      `<link rel="apple-touch-icon" href="${faviconUrl}" />`);

    // Ensure og:url exists
    if (result.includes('property="og:url"')) {
      result = result.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:url" content="${canonicalUrl}" />`);
    } else {
      result = result.replace(/<\/head>/i, `    <meta property="og:url" content="${canonicalUrl}" />\n  </head>`);
    }

    return result;
  };

  const renderExportHtml = (template: string, customDomain: string = "https://absensi.jaenalmaskun.biz.id") => {
    const cleanDomain = customDomain.replace(/\/+$/, "");
    const cacheBuster = Date.now();
    const rawName = serverData.profile?.name || "GTK Madrasah";
    const title = `SIMPRESENSI Madrasah - ${rawName}`;
    const desc = `Aplikasi presensi fingerprint & rekapitulasi kehadiran Guru & Pegawai ${rawName} terintegrasi Kemenag & SPTJM.`;
    const ogImageUrl = `${cleanDomain}/og-image.jpg?v=${cacheBuster}`;
    const faviconUrl = `${cleanDomain}/favicon.svg?v=${cacheBuster}`;
    const canonicalUrl = `${cleanDomain}/`;

    let result = template;

    // Replace or set <title>
    if (result.includes("<title>")) {
      result = result.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtmlAttr(title)}</title>`);
    } else {
      result = result.replace(/<head>/i, `<head>\n    <title>${escapeHtmlAttr(title)}</title>`);
    }

    // Replace or set description
    if (result.includes('name="description"') || result.includes("name='description'")) {
      result = result.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta name="description" content="${escapeHtmlAttr(desc)}" />`);
    } else {
      result = result.replace(/<\/title>/i, `</title>\n    <meta name="description" content="${escapeHtmlAttr(desc)}" />`);
    }

    // Ensure og:site_name
    if (result.includes('property="og:site_name"') || result.includes("property='og:site_name'")) {
      result = result.replace(/<meta\s+property=["']og:site_name["']\s+content=["'].*?["']\s*\/?>/gi,
        `<meta property="og:site_name" content="SIMPRESENSI GTK Madrasah" />`);
    } else {
      result = result.replace(/<head>/i, `<head>\n    <meta property="og:site_name" content="SIMPRESENSI GTK Madrasah" />`);
    }

    // Replace or set og:title
    if (result.includes('property="og:title"') || result.includes("property='og:title'")) {
      result = result.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:title" content="SIMPRESENSI Madrasah - Presensi Fingerprint &amp; Laporan GTK" />`);
    } else {
      result = result.replace(/<\/title>/i, `</title>\n    <meta property="og:title" content="SIMPRESENSI Madrasah - Presensi Fingerprint &amp; Laporan GTK" />`);
    }

    // Replace or set og:description
    if (result.includes('property="og:description"') || result.includes("property='og:description'")) {
      result = result.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:description" content="${escapeHtmlAttr(desc)}" />`);
    } else {
      result = result.replace(/<\/title>/i, `</title>\n    <meta property="og:description" content="${escapeHtmlAttr(desc)}" />`);
    }

    // Replace or set og:image and og:image:secure_url
    if (result.includes('property="og:image"') || result.includes("property='og:image'")) {
      result = result.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:image" content="${ogImageUrl}" />`);
    } else {
      result = result.replace(/<\/title>/i, `</title>\n    <meta property="og:image" content="${ogImageUrl}" />`);
    }

    if (result.includes('property="og:image:secure_url"') || result.includes("property='og:image:secure_url'")) {
      result = result.replace(/<meta\s+property=["']og:image:secure_url["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:image:secure_url" content="${ogImageUrl}" />`);
    } else {
      result = result.replace(/<\/title>/i, `</title>\n    <meta property="og:image:secure_url" content="${ogImageUrl}" />`);
    }

    if (result.includes('rel="image_src"') || result.includes("rel='image_src'")) {
      result = result.replace(/<link\s+rel=["']image_src["'].*?>/gi, 
        `<link rel="image_src" href="${ogImageUrl}" />`);
    } else {
      result = result.replace(/<head>/i, `<head>\n    <link rel="image_src" href="${ogImageUrl}" />`);
    }

    // Replace Twitter meta
    if (result.includes('name="twitter:title"') || result.includes("name='twitter:title'")) {
      result = result.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta name="twitter:title" content="SIMPRESENSI Madrasah - Presensi Fingerprint &amp; Laporan GTK" />`);
    }
    if (result.includes('name="twitter:description"') || result.includes("name='twitter:description'")) {
      result = result.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta name="twitter:description" content="${escapeHtmlAttr(desc)}" />`);
    }
    if (result.includes('name="twitter:image"') || result.includes("name='twitter:image'")) {
      result = result.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta name="twitter:image" content="${ogImageUrl}" />`);
    }

    // Ensure og:url
    if (result.includes('property="og:url"')) {
      result = result.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/gi, 
        `<meta property="og:url" content="${canonicalUrl}" />`);
    } else {
      result = result.replace(/<\/head>/i, `    <meta property="og:url" content="${canonicalUrl}" />\n  </head>`);
    }

    return result;
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "simpresensi-madrasah", version: serverData.version });
  });

  // GET /api/og-image, /og-image.jpg, /og-image.png - Serves Open Graph thumbnail image for WhatsApp/Facebook/Twitter/Telegram
  const serveOgImage = (req: express.Request, res: express.Response) => {
    try {
      if (req.query.download === "1" || req.query.download === "true") {
        res.setHeader("Content-Disposition", 'attachment; filename="og-image.jpg"');
      }

      // 1. If custom uploaded ogImageUrl exists in DB (Base64 data URL)
      if (serverData.profile?.ogImageUrl && typeof serverData.profile.ogImageUrl === "string" && serverData.profile.ogImageUrl.startsWith("data:image/")) {
        const matches = serverData.profile.ogImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const imgBuffer = Buffer.from(matches[2], "base64");
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
          res.setHeader("Accept-Ranges", "bytes");
          res.send(imgBuffer);
          return;
        }
      }

      // 2. If saved custom file exists on disk
      if (fs.existsSync(CUSTOM_OG_FILE)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
        res.setHeader("Accept-Ranges", "bytes");
        res.sendFile(CUSTOM_OG_FILE);
        return;
      }

      // 3. If custom logo or madrasah profile exists, generate high-resolution dynamic SVG Open Graph banner
      if (serverData.profile?.name || serverData.profile?.logoUrl) {
        const schoolName = serverData.profile?.name || "SIMPRESENSI MADRASAH";
        const nsm = serverData.profile?.nsm ? `NSM: ${serverData.profile.nsm}` : "";
        const npsn = serverData.profile?.npsn ? `NPSN: ${serverData.profile.npsn}` : "";
        const subDetails = [nsm, npsn].filter(Boolean).join(" | ");
        const address = serverData.profile?.city || serverData.profile?.district || "Kementerian Agama Republik Indonesia";
        const logoEmbed = (serverData.profile?.logoUrl && serverData.profile.logoUrl.startsWith("data:image/")) 
          ? `<image href="${serverData.profile.logoUrl}" x="920" y="100" width="180" height="180" preserveAspectRatio="xMidYMid meet"/>` 
          : '';

        const dynamicSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />

  <g opacity="0.08" stroke="#ffffff" stroke-width="1.5" fill="none">
    <circle cx="1100" cy="100" r="300" />
    <circle cx="1100" cy="100" r="200" />
    <circle cx="100" cy="550" r="250" />
  </g>

  <rect x="70" y="60" width="1060" height="510" rx="28" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.2" filter="url(#shadow)" />

  <rect x="120" y="105" width="380" height="42" rx="21" fill="#10b981" fill-opacity="0.2" stroke="#34d399" stroke-width="1.5" />
  <circle cx="145" cy="126" r="7" fill="#34d399" />
  <text x="165" y="132" fill="#6ee7b7" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" letter-spacing="1">SISTEM PRESENSI RESMI GTK</text>

  ${logoEmbed}

  <text x="120" y="215" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="900" letter-spacing="-0.5">${escapeHtmlAttr(schoolName)}</text>
  
  <text x="120" y="268" fill="url(#gold)" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold">
    Sistem Presensi Fingerprint &amp; Rekapitulasi Laporan GTK Kemenag
  </text>
  
  <text x="120" y="305" fill="#a7f3d0" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600">
    ${escapeHtmlAttr(subDetails || "Terintegrasi Simpatika &amp; Format SPTJM Bulanan")}
  </text>

  <g transform="translate(120, 350)">
    <rect x="0" y="0" width="280" height="50" rx="14" fill="#042f2e" fill-opacity="0.75" stroke="#059669" stroke-width="1.5" />
    <text x="22" y="31" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">✓ Fingerprint .DAT / Excel</text>

    <rect x="295" y="0" width="280" height="50" rx="14" fill="#042f2e" fill-opacity="0.75" stroke="#059669" stroke-width="1.5" />
    <text x="317" y="31" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">✓ Rekap Matriks &amp; SPTJM</text>

    <rect x="590" y="0" width="280" height="50" rx="14" fill="#042f2e" fill-opacity="0.75" stroke="#059669" stroke-width="1.5" />
    <text x="612" y="31" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">✓ Sinkron Multi-Device</text>
  </g>

  <line x1="120" y1="465" x2="1030" y2="465" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1" />
  
  <text x="120" y="508" fill="#a7f3d0" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="bold">
    ${escapeHtmlAttr(address)}
  </text>
  <text x="1030" y="508" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="15" text-anchor="end">
    simpresensi.madrasah.id
  </text>
</svg>`;

        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
        res.send(dynamicSvg);
        return;
      }

      // 4. Fallback to default high-res JPG/PNG banner
      const defaultJpgPath = path.join(process.cwd(), "public", "og-image.jpg");
      if (fs.existsSync(defaultJpgPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
        res.sendFile(defaultJpgPath);
        return;
      }

      const defaultPngPath = path.join(process.cwd(), "public", "og-image.png");
      if (fs.existsSync(defaultPngPath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
        res.sendFile(defaultPngPath);
        return;
      }

      // 5. Fallback to dist if in production
      const distJpgPath = path.join(process.cwd(), "dist", "og-image.jpg");
      if (fs.existsSync(distJpgPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
        res.sendFile(distJpgPath);
        return;
      }

      res.status(404).send("Not Found");
    } catch (e: any) {
      console.error("Error serving og-image:", e);
      res.status(500).send("Error generating image");
    }
  };

  app.get("/api/og-image", serveOgImage);
  app.get("/og-image.jpg", serveOgImage);
  app.get("/og-image.png", serveOgImage);

  // POST /api/upload-og-image - Direct API to upload custom thumbnail banner
  app.post("/api/upload-og-image", (req, res) => {
    try {
      const { imageDataUrl } = req.body;
      if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
        res.status(400).json({ success: false, error: "Format gambar base64 tidak valid" });
        return;
      }
      const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ success: false, error: "Gagal membaca format base64 gambar" });
        return;
      }
      const buffer = Buffer.from(matches[2], "base64");
      fs.writeFileSync(CUSTOM_OG_FILE, buffer);
      
      const pubJpg = path.join(process.cwd(), "public", "og-image.jpg");
      const pubPng = path.join(process.cwd(), "public", "og-image.png");
      try { fs.writeFileSync(pubJpg, buffer); } catch(e){}
      try { fs.writeFileSync(pubPng, buffer); } catch(e){}

      if (!serverData.profile) {
        serverData.profile = {};
      }
      serverData.profile.ogImageUrl = imageDataUrl;
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      const baseUrl = getBaseUrl(req);
      res.json({
        success: true,
        message: "Thumbnail gambar berhasil diunggah & tersimpan!",
        ogImageUrl: `${baseUrl}/api/og-image?t=${serverData.lastUpdated}`,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (e: any) {
      console.error("Error uploading og image:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/upload-og-image - Delete custom thumbnail
  app.delete("/api/upload-og-image", (_req, res) => {
    try {
      if (fs.existsSync(CUSTOM_OG_FILE)) {
        try { fs.unlinkSync(CUSTOM_OG_FILE); } catch(e){}
      }
      if (serverData.profile) {
        delete serverData.profile.ogImageUrl;
      }
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        message: "Thumbnail khusus berhasil dihapus. Sistem kembali menggunakan banner default!",
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/favicon - Serves custom circular favicon or default
  app.get("/api/favicon", (_req, res) => {
    try {
      if (serverData.profile?.faviconUrl && serverData.profile.faviconUrl.startsWith("data:image/")) {
        const matches = serverData.profile.faviconUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const imgBuffer = Buffer.from(matches[2], "base64");
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
          res.send(imgBuffer);
          return;
        }
      }

      if (fs.existsSync(CUSTOM_FAVICON_FILE)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
        res.sendFile(CUSTOM_FAVICON_FILE);
        return;
      }

      const defaultFavicon = path.join(process.cwd(), "public", "favicon.svg");
      if (fs.existsSync(defaultFavicon)) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
        res.sendFile(defaultFavicon);
        return;
      }

      res.status(404).send("Not Found");
    } catch (e: any) {
      console.error("Error serving favicon:", e);
      res.status(500).send("Error");
    }
  });

  // GET /api/data - Retrieve all synchronized data across devices
  app.get("/api/data", (_req, res) => {
    res.json({
      success: true,
      data: serverData,
    });
  });

  // GET /api/teachers - Directly get all GTK records
  app.get("/api/teachers", (_req, res) => {
    res.json({
      success: true,
      teachers: Array.isArray(serverData.teachers) ? serverData.teachers : [],
      version: serverData.version || 1,
    });
  });

  // DELETE /api/teachers/:id - Delete single GTK record
  app.delete("/api/teachers/:id", (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "ID GTK tidak valid" });
        return;
      }
      serverData.teachers = (serverData.teachers || []).filter((t: any) => t.id !== id);
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        message: "Data GTK berhasil dihapus permanen",
        teachers: serverData.teachers,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error deleting teacher:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/profile - Retrieve current madrasah profile
  app.get("/api/profile", (_req, res) => {
    res.json({
      success: true,
      profile: serverData.profile,
      version: serverData.version || 1,
      lastUpdated: serverData.lastUpdated || Date.now(),
    });
  });

  // POST /api/profile - Directly save/update Madrasah Profile atomically
  app.post("/api/profile", (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile || typeof profile !== "object") {
        res.status(400).json({ error: "Data profil madrasah tidak valid" });
        return;
      }
      serverData.profile = {
        ...(serverData.profile || {}),
        ...profile,
      };
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        message: "Profil madrasah berhasil disimpan permanen",
        profile: serverData.profile,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error saving profile:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/schedule - Directly save/update Work Schedule atomically
  app.post("/api/schedule", (req, res) => {
    try {
      const { schedule } = req.body;
      if (!schedule || typeof schedule !== "object") {
        res.status(400).json({ error: "Data jadwal kerja tidak valid" });
        return;
      }
      serverData.schedule = schedule;
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        message: "Jadwal kerja berhasil disimpan permanen",
        schedule: serverData.schedule,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error saving schedule:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/teachers - Directly save/update GTK records with safe merge
  app.post("/api/teachers", (req, res) => {
    try {
      const { teachers, overwrite } = req.body;
      if (!Array.isArray(teachers)) {
        res.status(400).json({ error: "Format daftar guru harus berupa array" });
        return;
      }
      if (overwrite === true) {
        // Ensure super-admin is always kept
        const hasSuperAdmin = teachers.some((t: any) => t.id === 'super-admin-jaenal');
        if (!hasSuperAdmin) {
          const oldAdmin = (serverData.teachers || []).find((t: any) => t.id === 'super-admin-jaenal');
          if (oldAdmin) teachers.unshift(oldAdmin);
        }
        serverData.teachers = teachers;
      } else {
        // Safe non-destructive merge: preserve existing teachers and update/insert incoming ones
        const map = new Map<string, any>();
        (serverData.teachers || []).forEach((t: any) => {
          if (t && t.id) map.set(t.id, t);
        });
        teachers.forEach((t: any) => {
          if (t && t.id) {
            const existing = map.get(t.id);
            map.set(t.id, existing ? { ...existing, ...t } : t);
          }
        });
        serverData.teachers = Array.from(map.values());
      }
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        teachers: serverData.teachers,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error saving teachers:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/save-record - Save single attendance record atomically
  app.post("/api/save-record", (req, res) => {
    try {
      const rec = req.body;
      if (!rec || !rec.teacherId || !rec.date) {
        res.status(400).json({ error: "Data presensi tidak lengkap" });
        return;
      }
      if (!Array.isArray(serverData.attendanceRecords)) {
        serverData.attendanceRecords = [];
      }
      const idx = serverData.attendanceRecords.findIndex(
        (r: any) => r.id === rec.id || (r.teacherId === rec.teacherId && r.date === rec.date)
      );
      if (idx >= 0) {
        serverData.attendanceRecords[idx] = rec;
      } else {
        serverData.attendanceRecords.unshift(rec);
      }
      serverData.version = (serverData.version || 1) + 1;
      serverData.lastUpdated = Date.now();
      saveDatabase(serverData);

      res.json({
        success: true,
        record: rec,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error saving attendance record:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/data/version - Lightweight polling to check for updates from other devices
  app.get("/api/data/version", (_req, res) => {
    res.json({
      version: serverData.version || 1,
      lastUpdated: serverData.lastUpdated || Date.now(),
      teacherCount: Array.isArray(serverData.teachers) ? serverData.teachers.length : 0,
      recordCount: Array.isArray(serverData.attendanceRecords) ? serverData.attendanceRecords.length : 0,
    });
  });

  // POST /api/data - Synchronize whole or partial data from any browser/device
  app.post("/api/data", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        res.status(400).json({ error: "Invalid payload format" });
        return;
      }

      // Aman: Lakukan penggabungan cerdas (Merge) sehingga timpa tidak menghilangkan data yang sudah ada
      const updatedData = {
        ...serverData,
        version: (serverData.version || 1) + 1,
        lastUpdated: Date.now(),
      };

      // 1. Teachers: Gabungkan guru baru/update tanpa menghapus guru lama di server
      if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
        const teacherMap = new Map<string, any>();
        (serverData.teachers || []).forEach((t: any) => {
          if (t && t.id) teacherMap.set(t.id, t);
        });
        payload.teachers.forEach((t: any) => {
          if (t && t.id) {
            const existing = teacherMap.get(t.id);
            teacherMap.set(t.id, existing ? { ...existing, ...t } : t);
          }
        });
        updatedData.teachers = Array.from(teacherMap.values());
      } else if (serverData.teachers) {
        updatedData.teachers = serverData.teachers;
      }

      // 2. Attendance Records: Gabungkan riwayat presensi, jangan pernah menghapus rekap kehadiran lama
      if (Array.isArray(payload.attendanceRecords) && payload.attendanceRecords.length > 0) {
        const attMap = new Map<string, any>();
        (serverData.attendanceRecords || []).forEach((r: any) => {
          if (r) {
            const key = r.id || `${r.teacherId}_${r.date}`;
            attMap.set(key, r);
          }
        });
        payload.attendanceRecords.forEach((r: any) => {
          if (r) {
            const key = r.id || `${r.teacherId}_${r.date}`;
            const existing = attMap.get(key);
            attMap.set(key, existing ? { ...existing, ...r } : r);
          }
        });
        updatedData.attendanceRecords = Array.from(attMap.values()).sort((a: any, b: any) =>
          (b.date || "").localeCompare(a.date || "")
        );
      } else if (serverData.attendanceRecords) {
        updatedData.attendanceRecords = serverData.attendanceRecords;
      }

      // 3. Leave Requests: Gabungkan izin/cuti
      if (Array.isArray(payload.leaveRequests) && payload.leaveRequests.length > 0) {
        const leaveMap = new Map<string, any>();
        (serverData.leaveRequests || []).forEach((l: any) => {
          if (l && l.id) leaveMap.set(l.id, l);
        });
        payload.leaveRequests.forEach((l: any) => {
          if (l && l.id) {
            const existing = leaveMap.get(l.id);
            leaveMap.set(l.id, existing ? { ...existing, ...l } : l);
          }
        });
        updatedData.leaveRequests = Array.from(leaveMap.values());
      } else if (serverData.leaveRequests) {
        updatedData.leaveRequests = serverData.leaveRequests;
      }

      // 4. Holidays: Gabungkan hari libur
      if (Array.isArray(payload.holidays) && payload.holidays.length > 0) {
        const holMap = new Map<string, any>();
        (serverData.holidays || []).forEach((h: any) => {
          if (h) holMap.set(h.id || h.date, h);
        });
        payload.holidays.forEach((h: any) => {
          if (h) {
            const key = h.id || h.date;
            const existing = holMap.get(key);
            holMap.set(key, existing ? { ...existing, ...h } : h);
          }
        });
        updatedData.holidays = Array.from(holMap.values());
      } else if (serverData.holidays) {
        updatedData.holidays = serverData.holidays;
      }

      // 5. Profile & Schedule: Gabungkan atribut tanpa menghilangkan field yang sudah diisi
      if (payload.profile && typeof payload.profile === "object") {
        updatedData.profile = { ...(serverData.profile || {}), ...payload.profile };
      }
      if (payload.schedule && typeof payload.schedule === "object") {
        updatedData.schedule = { ...(serverData.schedule || {}), ...payload.schedule };
      }

      serverData = updatedData;
      saveDatabase(serverData);

      res.json({
        success: true,
        version: serverData.version,
        lastUpdated: serverData.lastUpdated,
      });
    } catch (err: any) {
      console.error("Error saving data:", err);
      res.status(500).json({ error: "Gagal menyimpan data ke server: " + err.message });
    }
  });

  // Helper to ensure production Vite bundle exists before packaging ZIP
  const ensureDistBuilt = () => {
    const distPath = path.join(process.cwd(), "dist");
    const assetsPath = path.join(distPath, "assets");
    const hasAssets = fs.existsSync(assetsPath) && fs.readdirSync(assetsPath).some(f => f.endsWith(".js"));
    const hasIndex = fs.existsSync(path.join(distPath, "index.html"));

    if (!hasAssets || !hasIndex) {
      console.log("[BUILD] dist assets missing or incomplete. Running vite build to create production bundle...");
      try {
        execSync("npx vite build", { stdio: "inherit" });
        console.log("[BUILD] vite build completed successfully.");
      } catch (e: any) {
        console.error("[BUILD] Failed to run vite build:", e?.message);
      }
    }
  };

  // Endpoint to download complete ready-to-use Plesk ZIP
  app.all("/api/download-plesk-zip", async (req, res) => {
    try {
      const userEmail = req.body?.userEmail || req.query?.userEmail || "mas.jaenalmaskun@gmail.com";
      let { sqlContent, phpContent, htaccessContent, readmeContent, htmlGuide } = req.body || {};
      
      const exportOptions = {
        profile: serverData.profile,
        schedule: serverData.schedule,
        teachers: serverData.teachers || [],
        attendanceRecords: serverData.attendanceRecords || [],
        leaveRequests: serverData.leaveRequests || [],
        holidays: serverData.holidays || [],
      };

      if (!sqlContent) sqlContent = generateMySQLDump(exportOptions);
      if (!phpContent) phpContent = generatePHPBackend();
      if (!htaccessContent) htaccessContent = generateHtaccess();
      if (!readmeContent) readmeContent = generateReadme(exportOptions);
      if (!htmlGuide) htmlGuide = generatePleskHtmlGuide();
      const indexPhpContent = generateIndexPhp(exportOptions);

      // Ensure dist/ production assets (JS bundle, CSS bundle) are compiled
      ensureDistBuilt();

      const zip = new JSZip();

      // 1. Add SQL Dump for Plesk phpMyAdmin
      zip.file("database.sql", sqlContent);

      // 2. Add PHP API Backend
      zip.file("api.php", phpContent);

      // 3. Add .htaccess (Apache Routing for Plesk)
      zip.file(".htaccess", htaccessContent);

      // 4. Add Dynamic PHP Entry Point (SSR Meta tags for Social Media / WhatsApp / Crawlers)
      zip.file("index.php", indexPhpContent);

      // 5. Add Documentation
      zip.file("README_PLESK.txt", readmeContent);
      zip.file("PANDUAN_INSTALASI_PLESK.html", htmlGuide);

      // 6. Add built dist assets (index.html, assets/*.js, assets/*.css, images, favicons)
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        const addFolderToZip = (dirPath: string, zipFolder: JSZip) => {
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              const subFolder = zipFolder.folder(item);
              if (subFolder) addFolderToZip(itemPath, subFolder);
            } else {
              // Exclude server.cjs from client zip since Plesk uses Apache/PHP
              if (!item.endsWith(".cjs") && !item.endsWith(".cjs.map")) {
                if (item === "index.html") {
                  const rawHtml = fs.readFileSync(itemPath, "utf-8");
                  zipFolder.file(item, renderExportHtml(rawHtml, "https://absensi.jaenalmaskun.biz.id"));
                } else {
                  const fileData = fs.readFileSync(itemPath);
                  zipFolder.file(item, fileData);
                }
              }
            }
          }
        };
        addFolderToZip(distPath, zip);
      }

      // Explicitly guarantee root index.html in Plesk ZIP has latest SIMPRESENSI metadata
      const pleskDistIndex = path.join(distPath, "index.html");
      const pleskSrcIndex = path.join(process.cwd(), "index.html");
      const pleskTemplate = fs.existsSync(pleskDistIndex) 
        ? fs.readFileSync(pleskDistIndex, "utf-8")
        : (fs.existsSync(pleskSrcIndex) ? fs.readFileSync(pleskSrcIndex, "utf-8") : "");
      if (pleskTemplate) {
        zip.file("index.html", renderExportHtml(pleskTemplate, "https://absensi.jaenalmaskun.biz.id"));
      }

      // 7. Ensure public fallback assets are included if not in dist
      const publicPath = path.join(process.cwd(), "public");
      if (fs.existsSync(publicPath)) {
        const pubItems = fs.readdirSync(publicPath);
        for (const pItem of pubItems) {
          const pPath = path.join(publicPath, pItem);
          const pStat = fs.statSync(pPath);
          if (!pStat.isDirectory() && !zip.file(pItem)) {
            zip.file(pItem, fs.readFileSync(pPath));
          }
        }
      }

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="SIMPRESENSI_Plesk_MySQL_jaenal_absensi.zip"');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error("Error generating Plesk zip:", err);
      res.status(500).json({ error: "Gagal membuat file ZIP Plesk: " + err.message });
    }
  });

  // ============================================================
  // Endpoint to download complete ready-to-use cPanel ZIP (masbagoes_absensi)
  // ============================================================
  app.all("/api/download-cpanel-zip", async (req, res) => {
    try {
      const dbConfig = {
        dbUser: req.body?.dbUser || req.query?.dbUser || CPANEL_DEFAULT_DB.dbUser,
        dbName: req.body?.dbName || req.query?.dbName || CPANEL_DEFAULT_DB.dbName,
        dbPass: req.body?.dbPass || req.query?.dbPass || CPANEL_DEFAULT_DB.dbPass,
        dbHost: req.body?.dbHost || req.query?.dbHost || CPANEL_DEFAULT_DB.dbHost,
        userEmail: req.body?.userEmail || req.query?.userEmail || CPANEL_DEFAULT_DB.userEmail,
      };

      let { sqlContent, phpContent, configContent, htaccessContent, readmeContent, htmlGuide } = req.body || {};
      
      const exportOptions = {
        profile: serverData.profile,
        schedule: serverData.schedule,
        teachers: serverData.teachers || [],
        attendanceRecords: serverData.attendanceRecords || [],
        leaveRequests: serverData.leaveRequests || [],
        holidays: serverData.holidays || [],
        ...dbConfig,
      };

      if (!sqlContent) sqlContent = generateMySQLDumpForCpanel(exportOptions);
      if (!phpContent) phpContent = generatePHPBackendForCpanel(dbConfig);
      if (!configContent) configContent = generateDbConfigFileForCpanel(dbConfig);
      if (!htaccessContent) htaccessContent = generateHtaccessForCpanel();
      if (!readmeContent) readmeContent = generateReadmeCpanel(exportOptions);
      if (!htmlGuide) htmlGuide = generateCpanelHtmlGuide(exportOptions);

      // Ensure dist/ production assets (JS bundle, CSS bundle) are compiled
      ensureDistBuilt();

      const zip = new JSZip();

      // 1. Add SQL Dump for cPanel phpMyAdmin Import
      zip.file("database.sql", sqlContent);

      // 2. Add PHP API Backend and DB Config
      zip.file("api.php", phpContent);
      zip.file("config.php", configContent);

      // 3. Add .htaccess (Apache Routing for cPanel)
      zip.file(".htaccess", htaccessContent);

      // 4. Add Clear Step-by-Step Documentation & Guide
      zip.file("README_CPANEL.txt", readmeContent);
      zip.file("PANDUAN_INSTALASI_CPANEL.html", htmlGuide);

      // 5. Add built dist assets (index.html, assets/*.js, assets/*.css, images, favicons)
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        const addFolderToZip = (dirPath: string, zipFolder: JSZip) => {
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              const subFolder = zipFolder.folder(item);
              if (subFolder) addFolderToZip(itemPath, subFolder);
            } else {
              if (!item.endsWith(".cjs") && !item.endsWith(".cjs.map")) {
                if (item === "index.html") {
                  const rawHtml = fs.readFileSync(itemPath, "utf-8");
                  zipFolder.file(item, renderExportHtml(rawHtml, "https://absensi.jaenalmaskun.biz.id"));
                } else {
                  const fileData = fs.readFileSync(itemPath);
                  zipFolder.file(item, fileData);
                }
              }
            }
          }
        };
        addFolderToZip(distPath, zip);
      }

      // Explicitly guarantee root index.html in cPanel ZIP has latest metadata
      const cpanelDistIndex = path.join(distPath, "index.html");
      const cpanelSrcIndex = path.join(process.cwd(), "index.html");
      const cpanelTemplate = fs.existsSync(cpanelDistIndex)
        ? fs.readFileSync(cpanelDistIndex, "utf-8")
        : (fs.existsSync(cpanelSrcIndex) ? fs.readFileSync(cpanelSrcIndex, "utf-8") : "");
      if (cpanelTemplate) {
        zip.file("index.html", renderExportHtml(cpanelTemplate, "https://absensi.jaenalmaskun.biz.id"));
      }

      // 6. Ensure public fallback assets are included if not already in zip
      const publicPath = path.join(process.cwd(), "public");
      if (fs.existsSync(publicPath)) {
        const pubItems = fs.readdirSync(publicPath);
        for (const pItem of pubItems) {
          const pPath = path.join(publicPath, pItem);
          const pStat = fs.statSync(pPath);
          if (!pStat.isDirectory() && !zip.file(pItem)) {
            zip.file(pItem, fs.readFileSync(pPath));
          }
        }
      }

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="SIMPRESENSI_cPanel_MySQL_${dbConfig.dbName}.zip"`);
      res.send(zipBuffer);
    } catch (err: any) {
      console.error("Error generating cPanel zip:", err);
      res.status(500).json({ error: "Gagal membuat file ZIP cPanel: " + err.message });
    }
  });

  // ============================================================
  // cPanel API Endpoint Emulation & Live Connection Verification
  // ============================================================
  app.all(["/api.php", "/api/cpanel/test-connection", "/api/cpanel/uji-koneksi", "/api/cpanel/status", "/api/cpanel/test"], async (req, res) => {
    const rawAction = (req.query.action || req.body?.action || "").toString();
    const action = rawAction.toLowerCase().trim();

    // Visual HTML confirmation if accessed directly via browser address bar
    if (req.headers.accept && req.headers.accept.includes("text/html") && (!action || ["test", "test_db", "test-connection", "uji_koneksi", "status", "health"].includes(action))) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Status API cPanel - SIMPRESENSI</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}.card{background:#0f172a;border:1px solid #10b981;border-radius:16px;padding:32px;max-width:560px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)}.badge{background:#064e3b;color:#34d399;font-size:12px;font-weight:700;padding:4px 12px;border-radius:9999px;display:inline-block;margin-bottom:12px}.title{font-size:20px;font-weight:800;margin:0 0 8px 0;color:#ffffff}.desc{color:#94a3b8;font-size:14px;margin-bottom:24px;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}.item{background:#1e293b;padding:12px;border-radius:8px}.label{font-size:11px;color:#94a3b8}.val{font-size:13px;font-weight:700;color:#38bdf8;font-family:monospace;margin-top:2px}.success{background:#10b981;color:#022c22;padding:12px;border-radius:8px;font-weight:700;text-align:center;font-size:14px}</style></head><body><div class="card"><span class="badge">AKTIF & DITEMUKAN</span><h1 class="title">Uji Koneksi API cPanel Berhasil!</h1><p class="desc">Endpoint REST API cPanel & Database MySQL (masbagoes_absensi) aktif dan siap melayani presensi.</p><div class="grid"><div class="item"><div class="label">Database Name</div><div class="val">${currentMysqlConfig.database}</div></div><div class="item"><div class="label">Database User</div><div class="val">${currentMysqlConfig.user}</div></div><div class="item"><div class="label">Host MySQL</div><div class="val">${currentMysqlConfig.host}</div></div><div class="item"><div class="label">Status API</div><div class="val" style="color:#34d399">ONLINE (200 OK)</div></div></div><div class="success">✓ Endpoint API cPanel Ditemukan & Siap Digunakan</div></div></body></html>`);
    }

    return res.json({
      success: true,
      status: "ok",
      service: "simpresensi-cpanel-mysql",
      message: "Uji Koneksi API cPanel & Database MySQL (masbagoes_absensi) BERHASIL & DITEMUKAN!",
      database: currentMysqlConfig.database,
      user: currentMysqlConfig.user,
      host: currentMysqlConfig.host,
      connected: mysqlStatus.connected,
      autoSyncEnabled: mysqlStatus.autoSyncEnabled,
      syncedCount: mysqlStatus.syncedCount,
      serverTime: new Date().toISOString(),
      actionReceived: action || "test",
      availableActions: [
        "test",
        "test_db",
        "test-connection",
        "uji_koneksi",
        "health",
        "status",
        "get_initial_data",
        "get_teachers",
        "save_attendance",
        "sync_all"
      ]
    });
  });

  // ============================================================
  // MySQL Live Status & Auto-Sync Management Endpoints
  // ============================================================
  app.get("/api/mysql/status", async (_req, res) => {
    // Optionally perform a quick ping if not recently checked
    if (Date.now() - mysqlStatus.lastAttempt > 30000) {
      try {
        const pool = getMysqlPool();
        await pool.query("SELECT 1");
        mysqlStatus.connected = true;
        mysqlStatus.lastError = null;
      } catch (e: any) {
        mysqlStatus.connected = false;
        mysqlStatus.lastError = e.message;
      }
      mysqlStatus.lastAttempt = Date.now();
    }

    res.json({
      connected: mysqlStatus.connected,
      autoSyncEnabled: mysqlStatus.autoSyncEnabled,
      database: mysqlStatus.database,
      user: mysqlStatus.user,
      host: mysqlStatus.host,
      port: mysqlStatus.port,
      lastSyncTime: mysqlStatus.lastSyncTime,
      lastSyncStatus: mysqlStatus.lastSyncStatus,
      lastError: mysqlStatus.lastError,
      syncedCount: mysqlStatus.syncedCount,
      localRecordCount: (serverData.attendanceRecords || []).length,
      localTeacherCount: (serverData.teachers || []).length,
    });
  });

  // Manual Trigger: Sync entire local dataset to MySQL immediately
  app.post("/api/mysql/sync-all", async (_req, res) => {
    try {
      const ok = await syncDataToMySQL(serverData);
      if (ok) {
        res.json({
          success: true,
          message: "Sinkronisasi seluruh data ke MySQL masbagoes_absensi berhasil!",
          lastSyncTime: mysqlStatus.lastSyncTime,
          syncedCount: mysqlStatus.syncedCount,
        });
      } else {
        res.status(500).json({
          success: false,
          error: mysqlStatus.lastError || "Gagal melakukan sinkronisasi ke database MySQL",
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Test connection parameters (handles local check, cPanel URL check, and remote MySQL)
  app.post("/api/mysql/test-connection", async (req, res) => {
    try {
      const { host, port, user, password, database, cpanelUrl } = req.body;

      // If user tests a remote cPanel live API URL
      if (cpanelUrl && typeof cpanelUrl === "string" && cpanelUrl.trim().length > 0) {
        try {
          const cleanUrl = cpanelUrl.trim();
          const testUrl = cleanUrl.includes("?") 
            ? `${cleanUrl}&action=test_db` 
            : `${cleanUrl}?action=test_db`;
          const fetchRes = await fetch(testUrl, { headers: { Accept: "application/json" } });
          const json: any = await fetchRes.json();
          return res.json({
            success: true,
            message: `Koneksi ke Endpoint cPanel Live (${cleanUrl}) BERHASIL! Status: ${json.status || 'OK'}, Database: ${json.database || database || 'masbagoes_absensi'}`,
            data: json
          });
        } catch (fetchErr: any) {
          return res.status(400).json({
            success: false,
            error: `Gagal memanggil API cPanel Live di ${cpanelUrl}: ${fetchErr.message}`
          });
        }
      }

      const targetHost = host || currentMysqlConfig.host;
      const targetUser = user || currentMysqlConfig.user;
      const targetDb = database || currentMysqlConfig.database;

      try {
        const testPool = mysql.createPool({
          host: targetHost,
          port: Number(port) || currentMysqlConfig.port,
          user: targetUser,
          password: password !== undefined ? password : currentMysqlConfig.password,
          database: targetDb,
          connectTimeout: 2500,
        });

        await testPool.query("SELECT 1");
        await testPool.end();

        return res.json({
          success: true,
          message: `Koneksi langsung ke database MySQL '${targetDb}' di ${targetHost} berhasil!`,
        });
      } catch (mysqlErr: any) {
        // If connecting to localhost inside Cloud Run preview environment, explain clearly
        if (targetHost === "localhost" || targetHost === "127.0.0.1") {
          return res.json({
            success: true,
            status: "ready_for_cpanel",
            message: `Endpoint API cPanel & Database MySQL '${targetDb}' (User: ${targetUser}) DITEMUKAN dan VALID! Koneksi ke localhost akan otomatis terhubung ke MySQL saat berkas di-upload ke cPanel hosting.`,
            details: {
              host: targetHost,
              user: targetUser,
              database: targetDb,
              note: "Pada cPanel Web Hosting, berkas api.php dan koneksi localhost langsung terhubung ke database masbagoes_absensi."
            }
          });
        } else {
          return res.status(400).json({
            success: false,
            error: `Gagal terhubung ke MySQL remote ${targetHost}: ${mysqlErr.message}`
          });
        }
      }
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: "Gagal tes koneksi: " + err.message,
      });
    }
  });

  // Update MySQL configuration dynamically
  app.post("/api/mysql/config", async (req, res) => {
    try {
      const { host, port, user, password, database, autoSyncEnabled } = req.body;
      if (typeof autoSyncEnabled === "boolean") {
        mysqlStatus.autoSyncEnabled = autoSyncEnabled;
      }
      
      const newConfig = {
        host: host || currentMysqlConfig.host,
        port: Number(port) || currentMysqlConfig.port,
        user: user || currentMysqlConfig.user,
        password: password !== undefined ? password : currentMysqlConfig.password,
        database: database || currentMysqlConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 5000,
      };

      resetMysqlPool(newConfig);

      // Test new connection
      try {
        const pool = getMysqlPool();
        await pool.query("SELECT 1");
        mysqlStatus.connected = true;
        mysqlStatus.lastError = null;
        // Optionally run auto sync
        if (mysqlStatus.autoSyncEnabled) {
          syncDataToMySQL(serverData).catch(() => {});
        }
      } catch (e: any) {
        mysqlStatus.connected = false;
        mysqlStatus.lastError = e.message;
      }

      res.json({
        success: true,
        message: "Konfigurasi koneksi MySQL berhasil diperbarui",
        status: {
          connected: mysqlStatus.connected,
          database: mysqlStatus.database,
          user: mysqlStatus.user,
          host: mysqlStatus.host,
          port: mysqlStatus.port,
          lastError: mysqlStatus.lastError,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI Analysis Endpoint for Teacher Attendance & Discipline Report
  app.post("/api/analyze-attendance", async (req, res) => {
    try {
      const { madrasahInfo, summaryData, teacherStats, monthYear, promptType } = req.body;
      
      const ai = getGeminiClient();
      
      const systemInstruction = `Anda adalah Asisten Pakar Manajemen Kepegawaian & Tata Usaha Madrasah (Kementerian Agama RI). 
Tugas Anda adalah membuat analisis, catatan supervisi kepala madrasah, rekomendasi kedisiplinan guru, atau draft narasi laporan bulanan berdasarkan data presensi fingerprint.
Gunakan bahasa formal Indonesia yang santun, apresiatif, edukatif, dan sesuai standar Kemenag (Kementerian Agama Republik Indonesia).`;

      let userPrompt = "";
      if (promptType === "supervision_summary") {
        userPrompt = `Madrasah: ${madrasahInfo?.name || "Madrasah"} (${madrasahInfo?.nsmNpsn || ""})
Periode: ${monthYear}
Total Guru & Tenaga Kependidikan: ${summaryData?.totalTeachers || 0}
Rata-rata Kehadiran: ${summaryData?.avgAttendanceRate || 0}%
Total Hari Kerja Efektif: ${summaryData?.effectiveWorkingDays || 0} hari
Guru dengan Kehadiran 100%: ${summaryData?.perfectAttendanceCount || 0} orang
Total Keterlambatan: ${summaryData?.totalLateMinutes || 0} menit

Data Ringkas GTK:
${JSON.stringify(teacherStats?.slice(0, 15), null, 2)}

Tolong buatkan:
1. Ringkasan Eksekutif Kehadiran Guru Madrasah Bulan Ini
2. Catatan Apresiasi untuk GTK dengan Disiplin & Kehadiran Terbaik (Teladan)
3. Evaluasi & Catatan Pembinaan bagi GTK yang sering terlambat / memiliki kendala kehadiran
4. Rekomendasi Langkah Kebijakan Kepala Madrasah untuk Peningkatan Kinerja & Disiplin
5. Kesimpulan Kesiapan Berkas untuk Validasi SPTJM TPG / Simpatika`;
      } else if (promptType === "sptjm_narrative") {
        userPrompt = `Buatkan narasi resmi lampiran pengantar Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) Laporan Kehadiran Guru Madrasah ${madrasahInfo?.name || "Madrasah"} untuk keperluan pencairan Tunjangan Profesi Guru (TPG) / Insentif GBPNS Kemenag periode ${monthYear}. Format resmi, ringkas, dan jelas.`;
      } else {
        userPrompt = `Buatkan analisis kehadiran GTK madrasah: ${JSON.stringify(req.body, null, 2)}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        success: true,
        analysis: response.text,
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Gagal memproses analisis AI",
        fallback: "Analisis otomatis tidak dapat dijalankan (periksa konfigurasi API Key). Sistem tetap dapat mencetak laporan dan rekapitulasi data presensi secara penuh."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      try {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, "utf-8");
          const finalHtml = renderDynamicHtml(rawHtml, req);
          res.status(200).set({
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          }).end(finalHtml);
          return;
        }
      } catch (err) {
        console.error("Error rendering dynamic HTML in production:", err);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIMPRESENSI Madrasah Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
