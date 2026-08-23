import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Fingerprint } from 'lucide-react';
import { MadrasahProfile } from '../types';

interface InitialPageLoaderProps {
  profile: MadrasahProfile;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const InitialPageLoader: React.FC<InitialPageLoaderProps> = ({
  profile,
  onFinish,
  minDurationMs = 1800,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Memuat Konfigurasi Madrasah...');
  const [isDone, setIsDone] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Prioritize Application Logo -> Madrasah Logo -> SVG Favicon / App Vector Logo
  const effectiveAppLogo = profile.appLogoUrl || profile.logoUrl || '/favicon.svg';

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(48);
      setStatusText('Sinkronisasi Database Presensi & GTK...');
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(82);
      setStatusText('Menyiapkan Terminal Kiosk & Master Data...');
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Sistem Siap Digunakan');
    }, 1500);

    const tEnd = setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tEnd);
    };
  }, [minDurationMs, onFinish]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          id="initial-page-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950 text-white select-none overflow-hidden"
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Background Grid Accent */}
          <div 
            className="absolute inset-0 opacity-[0.035] pointer-events-none" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, 
              backgroundSize: '32px 32px' 
            }} 
          />

          {/* Centered Main Content Container */}
          <div className="relative z-10 flex flex-col items-center max-w-lg sm:max-w-xl w-full px-4 sm:px-6 text-center">
            {/* Logo Wrapper with Outer Glow & Ripple Aura */}
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6"
            >
              {/* Outer Pulsing Aura */}
              <motion.div
                animate={{
                  scale: [1, 1.18, 1],
                  opacity: [0.35, 0.7, 0.35],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl -m-2"
              />

              {/* Logo Emblem Frame (Circular Matching App Logo & Navbar style) */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/95 border-2 border-emerald-400/80 p-2 shadow-2xl backdrop-blur-md flex items-center justify-center overflow-hidden ring-4 ring-emerald-500/30">
                {/* Subtle Sheen overlay */}
                <motion.div
                  initial={{ x: '-150%' }}
                  animate={{ x: '250%' }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut", repeatDelay: 1.2 }}
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 pointer-events-none z-10"
                />

                {!imageError ? (
                  <img
                    src={effectiveAppLogo}
                    alt={profile.name || "SIMPRESENSI Logo"}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-contain filter drop-shadow rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 flex flex-col items-center justify-center text-white">
                    <Fingerprint className="w-10 h-10 text-emerald-100" />
                    <span className="text-[9px] font-extrabold tracking-widest text-emerald-200 uppercase mt-0.5">
                      SIMPRESENSI
                    </span>
                  </div>
                )}
              </div>

              {/* Decorative Verified Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 20 }}
                className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-slate-900 flex items-center justify-center z-20"
                title="Sistem Terverifikasi"
              >
                <Sparkles className="w-4 h-4 fill-current" />
              </motion.div>
            </motion.div>

            {/* Institution Typography */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="w-full space-y-1.5 mb-7 flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/25 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                SIMPRESENSI MADRASAH
              </div>
              <h1 
                className="w-full text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis px-2"
                title={profile.name || "MI MA'ARIF NU 02 SANGGREMAN"}
              >
                {profile.name || "MI MA'ARIF NU 02 SANGGREMAN"}
              </h1>
              <p className="w-full text-xs sm:text-sm text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis px-2">
                {profile.foundationName || "LP Ma'arif NU Kabupaten Banyumas"}
              </p>
              {profile.nsm && (
                <div className="text-[11px] text-emerald-400/80 font-mono whitespace-nowrap">
                  NSM: {profile.nsm} • NPSN: {profile.npsn || '-'}
                </div>
              )}
            </motion.div>

            {/* Dynamic Progress Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.45 }}
              className="w-full space-y-2.5"
            >
              {/* Progress Track */}
              <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 p-[1px]">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              {/* Status and Percentage Details */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                <span className="text-slate-300 font-sans tracking-wide truncate max-w-[260px] text-left">
                  {statusText}
                </span>
                <span className="text-emerald-400 font-bold">{progress}%</span>
              </div>
            </motion.div>

            {/* Bottom Footer Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 text-[11px] text-slate-500 tracking-wide font-sans"
            >
              Sistem Manajemen Presensi GTK Kemenag RI & SIAGA/Simpatika
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
