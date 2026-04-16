'use client';

/**
 * SplashScreen — A premium initialization screen.
 * It shows while the audio engine is pre-loading sounds and the app is booting.
 * 
 * Design: High-fidelity dark mode with a pulsing logo and progress indicator.
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Simulate initial loading sequence (audio pre-loading)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setExit(true);
            setTimeout(onComplete, 800); // Wait for exit animation
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (!mounted) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#050505] transition-all duration-700 ease-in-out
        ${exit ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}
      `}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-2xl relative z-10">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          {/* Echo Rings */}
          <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-xl animate-ping opacity-20" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter text-white uppercase sm:text-3xl">
            Study <span className="text-primary">With Me</span>
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            Initializing Engine
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center gap-1 opacity-20">
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase">Powered By</span>
        <span className="text-sm font-black tracking-tighter">0xREX CYBERNETICS</span>
      </div>
    </div>
  );
}
