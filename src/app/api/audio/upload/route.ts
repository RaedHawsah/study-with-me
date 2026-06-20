import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'edge';

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const buffer = await file.arrayBuffer();
    const s3 = getS3Client();

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'audio',
      Key: `custom/${fileName}`,
      Body: new Uint8Array(buffer),
      ContentType: file.type || 'audio/mpeg',
    });

    await s3.send(command);

    return NextResponse.json({ success: true, fileName });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
