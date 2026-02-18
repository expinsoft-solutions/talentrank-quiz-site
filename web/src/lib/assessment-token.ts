import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TTL_MS = 10 * 60 * 1000;

interface TokenPayload {
  assessmentId: string;
  clientToken: string;
  userId: string;
  exp: number;
}

export function createAssessmentToken(payload: Omit<TokenPayload, 'exp'>): string {
  const data: TokenPayload = { ...payload, exp: Date.now() + TTL_MS };
  const payloadStr = JSON.stringify(data);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyAssessmentToken(token: string): TokenPayload | null {
  if (!SECRET) return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payloadStr: string;
  try {
    payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const data = JSON.parse(payloadStr) as TokenPayload;
    if (typeof data.assessmentId !== 'string' || typeof data.clientToken !== 'string' || typeof data.userId !== 'string') return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
