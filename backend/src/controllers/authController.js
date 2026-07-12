import { AuthService } from '../services/authService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { UserModel } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure:   env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge:   env.cookie.maxAge,
  path:     '/api/auth',         // only sent on auth endpoints
};

export const AuthController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const { user, accessToken, refreshToken } =
        await AuthService.register({ name, email, password });

      res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
      ApiResponse.success(res, 201, { user, accessToken }, 'Account created successfully');
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } =
        await AuthService.login({ email, password });

      res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
      ApiResponse.success(res, 200, { user, accessToken }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) throw new ApiError(401, 'No refresh token');

      const { accessToken, refreshToken, user } =
        await AuthService.refreshTokens(token);

      // Rotate — set the new refresh token cookie
      res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
      ApiResponse.success(res, 200, { user, accessToken }, 'Token refreshed');
    } catch (err) {
      // Clear the cookie on any refresh failure
      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      await AuthService.logout(token);

      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      ApiResponse.success(res, 200, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async logoutAll(req, res, next) {
    try {
      await AuthService.logoutAll(req.user.sub);
      res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
      ApiResponse.success(res, 200, null, 'Logged out from all devices');
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.sub);
      if (!user) throw ApiError.notFound('User not found');
      ApiResponse.success(res, 200, user, 'Authenticated user');
    } catch (err) {
      next(err);
    }
  },
};
