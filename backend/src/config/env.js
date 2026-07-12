import 'dotenv/config';

const required = [
  'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port:    parseInt(process.env.PORT, 10) || 5000,
  isDev:   process.env.NODE_ENV !== 'production',

  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    poolMin:  parseInt(process.env.DB_POOL_MIN, 10) || 2,
    poolMax:  parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },

  jwt: {
    accessSecret:      process.env.JWT_ACCESS_SECRET,
    refreshSecret:     process.env.JWT_REFRESH_SECRET,
    accessExpiresIn:   process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
    refreshExpiresIn:  process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  cookie: {
    secret:   process.env.COOKIE_SECRET || 'cookie_secret_fallback',
    // httpOnly refresh token cookie lives for 7 days
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max:      parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};
