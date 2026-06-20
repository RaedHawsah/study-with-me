import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

export async function GET() {
  try {
    const s3 = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME || 'audio',
      Prefix: 'custom/',
    });

    const data = await s3.send(command);
    const contents = data.Contents || [];

    const audioFiles = contents
      .map((item) => {
        // Strip the prefix 'custom/' from the name
        return item.Key ? item.Key.replace(/^custom\//, '') : '';
      })
      .filter((name) => name && /\.(mp3|wav|ogg|m4a)$/i.test(name));

    return NextResponse.json({ files: audioFiles });
  } catch (error: any) {
    console.error('List audio error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
