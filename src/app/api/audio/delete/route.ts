import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
    }

    // Safety: prevent path traversal
    const safeName = path.basename(fileName);
    const filePath = path.join(process.cwd(), 'public', 'audio', 'custom', safeName);
    
    // Check if file exists. If it doesn't, consider it successfully deleted to clear frontend ghost states.
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ success: true });
    }

    // Delete file
    await fs.unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
