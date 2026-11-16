import jwt, { JwtPayload } from 'jsonwebtoken';
import { tokenRepository } from '../repositories/token.repository';
import config from '../config/config';

export type AuthenticatedPayload = JwtPayload & {
  userId: string;
  email: string;
  profile: 'business_owner' | 'investor';
};

export type VerifyTokenResult =
  | { ok: true; payload: AuthenticatedPayload }
  | { ok: false; reason: string };

// Shared by the REST `authenticate` middleware and the Socket.io connection
// handler, so both doors into the app enforce exactly the same rule: a
// valid JWT signature AND a still-active token record (so logging out
// actually revokes access, instead of just waiting out the JWT's expiry).
export async function verifyAccessToken(token: string): Promise<VerifyTokenResult> {
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, config.accessTokenSecret);
  } catch {
    return { ok: false, reason: 'Invalid or expired access token' };
  }
  if (!decodedToken || typeof decodedToken === 'string') {
    return { ok: false, reason: 'Invalid access token' };
  }

  const tokenResult = await tokenRepository.findByToken(token);
  if (tokenResult.err) {
    return { ok: false, reason: tokenResult.err.message || 'Error verifying token' };
  }
  if (!tokenResult.value) {
    return { ok: false, reason: 'Token not found' };
  }
  if (tokenResult.value.expiresAt < new Date()) {
    return { ok: false, reason: 'Token has expired' };
  }

  return { ok: true, payload: decodedToken as AuthenticatedPayload };
}
