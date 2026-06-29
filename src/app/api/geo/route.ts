import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'SA';
  return NextResponse.json({ country });
}
