import { NextResponse } from 'next/server';
import { sendReportEmail } from '@/lib/email';

const EMAIL_API_SECRET = process.env.EMAIL_API_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!EMAIL_API_SECRET || bearer !== EMAIL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    to?: string;
    firstName?: string;
    reportText?: string;
    resultsUrl?: string;
    attachPdf?: boolean;
    mbti?: string | null;
    cognitivePercentile?: number | null;
    axisStrengths?: Record<string, number> | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : 'There';
  const reportText = typeof body.reportText === 'string' ? body.reportText : '';
  const resultsUrl = typeof body.resultsUrl === 'string' ? body.resultsUrl.trim() : '';
  const attachPdf = body.attachPdf === true;
  const mbti = typeof body.mbti === 'string' ? body.mbti : null;
  const cognitivePercentile =
    typeof body.cognitivePercentile === 'number' && Number.isFinite(body.cognitivePercentile)
      ? body.cognitivePercentile
      : null;
  const axisStrengths =
    body.axisStrengths && typeof body.axisStrengths === 'object'
      ? body.axisStrengths
      : null;

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Valid email address required' }, { status: 400 });
  }
  if (!resultsUrl || !resultsUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Valid results URL required' }, { status: 400 });
  }

  const result = await sendReportEmail({
    to,
    firstName,
    reportText,
    resultsUrl,
    attachPdf,
    mbti,
    cognitivePercentile,
    axisStrengths,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed to send email' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
