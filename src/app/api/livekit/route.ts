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

    const apiKey = process.env.LIVEKIT_API_KEY?.replace(/^["']|["']$/g, '');
    const apiSecret = process.env.LIVEKIT_API_SECRET?.replace(/^["']|["']$/g, '');

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials missing');
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    const identity = userId || crypto.randomUUID();
    const secret = new TextEncoder().encode(apiSecret);
    const now = Math.floor(Date.now() / 1000);

    // LiveKit JWT format — must match exactly what livekit-server-sdk generates
    const token = await new SignJWT({
      sub: identity,
      iss: apiKey,
      nbf: now,
      exp: now + 4 * 60 * 60, // 4 hours
      iat: now,
      jti: crypto.randomUUID(),
      name: username,
      video: {
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      metadata: '',
      sha256: '',
    })
      .setProtectedHeader({ alg: 'HS256' })
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
