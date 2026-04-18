import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'backgrounds');
    
    // Check if dir exists
    try {
      await fs.access(publicDir);
    } catch {
      return NextResponse.json({ files: [] });
    }

    const files = await fs.readdir(publicDir);
    // Return audio-visual files
    const mediaFiles = files.filter(f => 
      /\.(mp4|webm|gif|jpg|jpeg|png|webp)$/i.test(f)
    );

    return NextResponse.json({ files: mediaFiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
