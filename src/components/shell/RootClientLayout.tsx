'use client';

import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/ui/SplashScreen';

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  // Initial app load logic
  useEffect(() => {
    // The SplashScreen component handles its own internal timing 
    // and calls onComplete when the "simulation" (preloading) is done.
  }, []);

  return (
    <>
      {loading && <SplashScreen onComplete={() => setLoading(false)} />}
      <div className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}>
        {children}
      </div>
    </>
  );
}
