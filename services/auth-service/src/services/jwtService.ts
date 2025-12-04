import jwt, { SignOptions } from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'hrm_saas_access_secret_2024';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'hrm_saas_refresh_secret_2024';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateTokens = (payload: JwtPayload): TokenPair => {
  const accessOptions: SignOptions = { expiresIn: ACCESS_EXPIRES as string };
  const refreshOptions: SignOptions = { expiresIn: REFRESH_EXPIRES as string };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, accessOptions);
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, refreshOptions);

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES as string };
  return jwt.sign(payload, ACCESS_SECRET, options);
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};
