/**
 * Seed the database with initial data for development.
 * Run via: npm run db:seed
 */

import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const seeds = [
  {
    table: 'users',
    rows: [
      {
        name: 'Admin User',
        email: 'admin@odoo.com',
        password: await bcrypt.hash('admin1234', 12),
        role: 'admin',
      },
      {
        name: 'Test User',
        email: 'user@example.com',
        password: await bcrypt.hash('User@1234', 12),
        role: 'user',
      },
    ],
  },
];

(async () => {
  logger.info('Seeding database…');
  const client = await pool.connect();
  try {
    for (const { table, rows } of seeds) {
      for (const row of rows) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const cols = keys.join(', ');
        const params = keys.map((_, i) => `$${i + 1}`).join(', ');

        await client.query(
          `INSERT INTO ${table} (${cols})
           VALUES (${params})
           ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name`,
          values
        );
      }
      logger.info(`Seeded table: ${table}`);
    }
    logger.info('Database seeded successfully.');
  } catch (err) {
    logger.error('Seed failed', { error: err.message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
