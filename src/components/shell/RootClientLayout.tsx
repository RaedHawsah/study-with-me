'use client';

import { useState } from 'react';
import { SplashScreen } from '@/components/ui/SplashScreen';

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {/*
       * Render children ALWAYS so the browser can paint the real LCP element
       * immediately. The splash overlays on top (z-[1000]) rather than
       * hiding the content — this is critical for a good LCP score.
       */}
      {children}
      {loading && <SplashScreen onComplete={() => setLoading(false)} />}
    </>
  );
}
