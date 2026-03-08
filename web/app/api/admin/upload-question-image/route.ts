import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 };
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

function getEnv() {
  const accessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = (process.env.AWS_REGION?.trim() || process.env.S3_REGION?.trim()) ?? '';
  const bucket = (process.env.AWS_S3_BUCKET?.trim() || process.env.S3_BUCKET_NAME?.trim()) ?? '';
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  const missing = [
    !accessKey && 'AWS_ACCESS_KEY_ID',
    !secretKey && 'AWS_SECRET_ACCESS_KEY',
    !region && 'AWS_REGION',
    !bucket && 'AWS_S3_BUCKET',
  ].filter(Boolean) as string[];

  return { accessKey, secretKey, region, bucket, sessionToken, missing };
}

function createS3Client(env: ReturnType<typeof getEnv>) {
  return new S3Client({
    region: env.region,
    credentials: {
      accessKeyId: env.accessKey as string,
      secretAccessKey: env.secretKey as string,
      ...(env.sessionToken ? { sessionToken: env.sessionToken } : {}),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const env = getEnv();
  if (env.missing.length > 0) {
    return NextResponse.json(
      {
        error: 'S3 not configured.',
        missing: env.missing,
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
  }

  const s3 = createS3Client(env);

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1] || 'bin';
  const key = `question-images/${randomBytes(8).toString('hex')}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: key,
        Body: buf,
        ContentType: file.type,
      })
    );
    const url = `https://${env.bucket}.s3.${env.region}.amazonaws.com/${key}`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Failed to upload to S3' }, { status: 500 });
  }
}

function extractKeyFromUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(bucket)) return null;
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!key.startsWith('question-images/')) return null;
    return key;
  } catch {
    return null;
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const env = getEnv();
  if (env.missing.length > 0) {
    return NextResponse.json({ error: 'S3 not configured.', missing: env.missing }, { status: 503 });
  }

  let body: { url?: string; key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const keyFromBody = typeof body.key === 'string' ? body.key.trim() : '';
  const keyFromUrl = typeof body.url === 'string' ? extractKeyFromUrl(body.url, env.bucket) : null;
  const key = keyFromBody || keyFromUrl || '';

  if (!key || !key.startsWith('question-images/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const s3 = createS3Client(env);
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.bucket,
        Key: key,
      })
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete from S3' }, { status: 500 });
  }
}
