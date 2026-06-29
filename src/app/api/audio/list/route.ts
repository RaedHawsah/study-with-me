import { NextResponse } from 'next/server';
import soundsList from '@/lib/sounds-list.json';

export const runtime = 'edge';

export async function GET() {
  try {
    return NextResponse.json({ files: soundsList.files });
  } catch (error: any) {
    console.error('List audio error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
