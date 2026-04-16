import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'audio', 'custom');
    
    // Check if dir exists
    try {
      await fs.access(publicDir);
    } catch {
      return NextResponse.json({ files: [] });
    }

    const files = await fs.readdir(publicDir);
    // Only return audio files
    const audioFiles = files.filter(f => 
      f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg') || f.endsWith('.m4a')
    );

    return NextResponse.json({ files: audioFiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
