import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { room, username, userId } = await req.json();

    if (!room || !username) {
      return NextResponse.json(
        { error: 'Missing "room" or "username"' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured on the server' },
        { status: 500 }
      );
    }

    const identity = userId || crypto.randomUUID();
    const secret = new TextEncoder().encode(apiSecret);

    const token = await new SignJWT({
      name: username,
      video: {
        roomJoin: true,
        room: room,
        canPublish: true,
        canSubscribe: true,
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(apiKey)
      .setSubject(identity)
      .setNotBefore('0s')
      .setExpirationTime('4h')
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
