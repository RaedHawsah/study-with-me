import { createBrowserClient } from '@supabase/ssr';

// Note: we support both _ANON_KEY and _PUBLISHABLE_KEY for compatibility with different supabase docs
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
  
  return supabaseInstance;
};
