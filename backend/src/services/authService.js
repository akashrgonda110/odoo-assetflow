import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';
import { RefreshTokenModel } from '../models/refreshTokenModel.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Short-lived access token (15 min) */
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

/** Opaque random refresh token — stored as SHA-256 hash in DB */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiresAt() {
  const ms = parseDuration(env.jwt.refreshExpiresIn);
  return new Date(Date.now() + ms);
}

/** Parse simple duration strings like "7d", "15m", "1h" → milliseconds */
function parseDuration(str) {
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${str}`);
  return parseInt(match[1], 10) * map[match[2]];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const AuthService = {
  async register({ name, email, password }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) throw ApiError.badRequest('Email is already registered');

    const hashed = await bcrypt.hash(password, 12);
    const user   = await UserModel.create({ name, email, password: hashed });

    const { accessToken, refreshToken } = await _issueTokenPair(user);
    return { user, accessToken, refreshToken };
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    // Same error for wrong email OR wrong password — prevents user enumeration
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.is_active) throw ApiError.forbidden('Account is deactivated');

    const { password: _, ...safeUser } = user;
    const { accessToken, refreshToken } = await _issueTokenPair(safeUser);
    return { user: safeUser, accessToken, refreshToken };
  },

  async refreshTokens(incomingRefreshToken) {
    if (!incomingRefreshToken) throw ApiError.unauthorized('Refresh token required');

    const tokenHash = hashToken(incomingRefreshToken);
    const record    = await RefreshTokenModel.findValid(tokenHash);

    if (!record) throw ApiError.unauthorized('Invalid or expired refresh token');
    if (!record.is_active) throw ApiError.forbidden('Account is deactivated');

    // Token rotation — revoke the used token and issue a fresh pair
    await RefreshTokenModel.revoke(tokenHash);

    const user = {
      id:    record.user_id,
      email: record.email,
      role:  record.role,
      name:  record.name,
    };

    const { accessToken, refreshToken: newRefreshToken } = await _issueTokenPair(user);
    return { accessToken, refreshToken: newRefreshToken, user };
  },

  async logout(refreshToken) {
    if (!refreshToken) return; // Already logged out — idempotent
    const tokenHash = hashToken(refreshToken);
    await RefreshTokenModel.revoke(tokenHash);
  },

  async logoutAll(userId) {
    await RefreshTokenModel.revokeAllForUser(userId);
  },
};

// ─── Internal helper ─────────────────────────────────────────────────────────

async function _issueTokenPair(user) {
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);
  const expiresAt    = refreshTokenExpiresAt();

  await RefreshTokenModel.create({ userId: user.id, tokenHash, expiresAt });

  return { accessToken, refreshToken };
}
