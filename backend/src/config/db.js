import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/**
 * Shared PostgreSQL connection pool.
 * Import `pool` wherever you need to run queries,
 * or use the `query` helper for a fire-and-forget style.
 */
export const pool = new Pool({
  host:     env.db.host,
  port:     env.db.port,
  database: env.db.name,
  user:     env.db.user,
  password: env.db.password,
  min:      env.db.poolMin,
  max:      env.db.poolMax,
  idleTimeoutMillis:    30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

/**
 * Run a parameterised query.
 *
 * @param {string} text   - SQL statement
 * @param {any[]}  params - Bound parameters
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Verify the DB connection on startup.
 */
export const connectDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info(`PostgreSQL connected — ${env.db.host}:${env.db.port}/${env.db.name}`);
  } finally {
    client.release();
  }
};
