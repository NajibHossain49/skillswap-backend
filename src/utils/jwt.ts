import jwt from 'jsonwebtoken';
import ms from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UnauthorizedError } from './errors';
import { Role } from '@prisma/client';

const JWT_ISSUER = 'skillswap';
const JWT_AUDIENCE = 'skillswap-api';

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  jti: string;
  tokenVersion: number;
}

type GenerateTokenInput = Omit<TokenPayload, 'type' | 'jti' | 'tokenVersion'> & {
  tokenVersion?: number;
};

const baseSignOptions: jwt.SignOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

const baseVerifyOptions: jwt.VerifyOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

export const generateAccessToken = (payload: GenerateTokenInput): string => {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
      type: 'access',
      jti: uuidv4(),
    },
    config.jwt.accessSecret,
    { ...baseSignOptions, expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions,
  );
};

export const generateRefreshToken = (payload: GenerateTokenInput): string => {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
      type: 'refresh',
      jti: uuidv4(),
    },
    config.jwt.refreshSecret,
    { ...baseSignOptions, expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions,
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, config.jwt.accessSecret, baseVerifyOptions) as TokenPayload;
  if (payload.type !== 'access') {
    throw new UnauthorizedError('Invalid token type');
  }
  return payload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, config.jwt.refreshSecret, baseVerifyOptions) as TokenPayload;
  if (payload.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type');
  }
  return payload;
};

export const getRefreshTokenExpiry = (): Date => {
  return new Date(Date.now() + ms(config.jwt.refreshExpiresIn as ms.StringValue));
};
