import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Safe filename: remove spaces and special chars
    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const publicDir = path.join(process.cwd(), 'public', 'audio', 'custom');
    
    // Ensure dir exists
    await fs.mkdir(publicDir, { recursive: true });
    
    const filePath = path.join(publicDir, fileName);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ success: true, fileName });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
