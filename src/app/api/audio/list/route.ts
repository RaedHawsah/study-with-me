import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from('audio')
      .list('custom', { limit: 200, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      return NextResponse.json({ files: [] });
    }

    const audioFiles = (data || [])
      .map((f) => f.name)
      .filter((name) => /\.(mp3|wav|ogg|m4a)$/i.test(name));

    return NextResponse.json({ files: audioFiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
