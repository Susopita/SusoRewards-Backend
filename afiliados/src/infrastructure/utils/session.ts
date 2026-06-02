import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'super-secret-suso-rewards-key-123456';

export interface Session {
  id: string;
  email: string;
  role: 'empresa' | 'restaurante' | 'cliente';
  code?: string;
  empresasId?: string[];
  exp?: number;
}

export function generateToken(session: Session): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const sessionWithExp = { ...session, exp };
  const payload = Buffer.from(JSON.stringify(sessionWithExp)).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): Session | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (signature !== expectedSignature) {
      return null;
    }
    const raw = Buffer.from(payload, 'base64').toString('utf-8');
    const session = JSON.parse(raw) as Session;
    if (session.exp && Date.now() > session.exp) {
      return null; // Expired
    }
    return session;
  } catch {
    return null;
  }
}
