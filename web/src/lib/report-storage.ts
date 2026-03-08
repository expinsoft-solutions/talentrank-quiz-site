import { randomBytes } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function getS3Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
  const region = (process.env.AWS_REGION?.trim() || process.env.S3_REGION?.trim()) ?? '';
  const bucket = (process.env.AWS_S3_BUCKET?.trim() || process.env.S3_BUCKET_NAME?.trim()) ?? '';
  if (!accessKeyId || !secretAccessKey || !region || !bucket) return null;
  return { accessKeyId, secretAccessKey, sessionToken, region, bucket };
}

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'user';
}

export async function uploadReportPdfToS3(
  firstName: string,
  pdfBuffer: Buffer
) {
  const cfg = getS3Config();
  if (!cfg) {
    throw new Error('S3 not configured for report PDF upload');
  }
  const client = new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      ...(cfg.sessionToken ? { sessionToken: cfg.sessionToken } : {}),
    },
  });
  const date = new Date();
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const key = `report-pdfs/${yyyy}/${mm}/${dd}/${slug(firstName)}-${randomBytes(8).toString('hex')}.pdf`;
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    })
  );
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}
