import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials missing:', { apiKey: !!apiKey, apiSecret: !!apiSecret });
      return NextResponse.json(
        { error: 'LiveKit credentials not configured on the server' },
        { status: 500 }
      );
    }

    const identity = userId || crypto.randomUUID();

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: username,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: String(error) },
      { status: 500 }
    );
  }
}
