/**
 * Seed the database with realistic AssetFlow data.
 * Run via: npm run db:seed
 */

import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

(async () => {
  logger.info('Seeding database…');
  const client = await pool.connect();

  try {
    // ─── Users ────────────────────────────────────────────────────────────────
    logger.info('Seeding users…');

    const adminHash   = await bcrypt.hash('Admin@1234', 12);
    const managerHash = await bcrypt.hash('Manager@1234', 12);
    const headHash    = await bcrypt.hash('Head@1234', 12);
    const empHash     = await bcrypt.hash('Employee@1234', 12);

    // Insert each user separately to avoid parameter mismatch with multi-row VALUES
    const userSeeds = [
      { name: 'Super Admin',  email: 'admin@assetflow.com',  hash: adminHash,   role: 'admin' },
      { name: 'Raj Mehta',    email: 'raj@assetflow.com',    hash: managerHash, role: 'asset_manager' },
      { name: 'Priya Shah',   email: 'priya@assetflow.com',  hash: managerHash, role: 'asset_manager' },
      { name: 'Aditi Rao',    email: 'aditi@assetflow.com',  hash: headHash,    role: 'department_head' },
      { name: 'Rohan Mehta',  email: 'rohan@assetflow.com',  hash: headHash,    role: 'department_head' },
      { name: 'Sana Iqbal',   email: 'sana@assetflow.com',   hash: headHash,    role: 'department_head' },
      { name: 'Arjun Nair',   email: 'arjun@assetflow.com',  hash: empHash,     role: 'employee' },
      { name: 'Meena Pillai', email: 'meena@assetflow.com',  hash: empHash,     role: 'employee' },
      { name: 'Vikram Das',   email: 'vikram@assetflow.com', hash: empHash,     role: 'employee' },
      { name: 'Divya Kumar',  email: 'divya@assetflow.com',  hash: empHash,     role: 'employee' },
    ];

    for (const u of userSeeds) {
      await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
           SET password = EXCLUDED.password,
               role     = EXCLUDED.role,
               name     = EXCLUDED.name`,
        [u.name, u.email, u.hash, u.role]
      );
    }

    // ─── Departments ──────────────────────────────────────────────────────────
    logger.info('Seeding departments…');

    // Get head user IDs
    const { rows: users } = await client.query(
      `SELECT id, email FROM users WHERE email IN ($1,$2,$3)`,
      ['aditi@assetflow.com','rohan@assetflow.com','sana@assetflow.com']
    );
    const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));

    await client.query(`
      INSERT INTO departments (name, description, head_id, status) VALUES
        ('Engineering',      'Software & hardware engineering team',  $1, 'active'),
        ('Facilities',       'Facilities and infrastructure',         $2, 'active'),
        ('Field Operations', 'Field operations and logistics',        $3, 'active'),
        ('HR',               'Human resources department',            NULL, 'active'),
        ('Finance',          'Finance and accounting',                NULL, 'active')
      ON CONFLICT (name) DO NOTHING
    `, [userMap['aditi@assetflow.com'], userMap['rohan@assetflow.com'], userMap['sana@assetflow.com']]);

    // Add sub-department
    const { rows: depts } = await client.query(`SELECT id, name FROM departments`);
    const deptMap = Object.fromEntries(depts.map(d => [d.name, d.id]));

    await client.query(`
      INSERT INTO departments (name, description, parent_id, status) VALUES
        ('Field Ops (East)', 'Eastern region field operations', $1, 'inactive')
      ON CONFLICT (name) DO NOTHING
    `, [deptMap['Field Operations']]);

    // Assign employees to departments
    const { rows: allUsers } = await client.query(`SELECT id, email FROM users`);
    const allUserMap = Object.fromEntries(allUsers.map(u => [u.email, u.id]));

    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'aditi@assetflow.com'`, [deptMap['Engineering']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'arjun@assetflow.com'`, [deptMap['Engineering']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'meena@assetflow.com'`, [deptMap['Engineering']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'rohan@assetflow.com'`, [deptMap['Facilities']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'vikram@assetflow.com'`, [deptMap['Facilities']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'sana@assetflow.com'`, [deptMap['Field Operations']]);
    await client.query(`UPDATE users SET department_id = $1 WHERE email = 'divya@assetflow.com'`, [deptMap['HR']]);

    // ─── Asset Categories ─────────────────────────────────────────────────────
    logger.info('Seeding asset categories…');

    await client.query(`
      INSERT INTO asset_categories (name, description, custom_fields) VALUES
        ('Electronics', 'Laptops, monitors, projectors, cameras', '[{"field":"warranty_period","label":"Warranty Period (months)","type":"number"},{"field":"brand","label":"Brand","type":"text"}]'),
        ('Furniture',   'Desks, chairs, cabinets',                '[{"field":"material","label":"Material","type":"text"}]'),
        ('Vehicles',    'Cars, vans, forklifts',                  '[{"field":"plate_number","label":"Plate Number","type":"text"},{"field":"fuel_type","label":"Fuel Type","type":"text"}]'),
        ('Tools',       'Power tools and hand tools',             '[{"field":"max_load","label":"Max Load (kg)","type":"number"}]'),
        ('Networking',  'Routers, switches, access points',       '[{"field":"ip_range","label":"IP Range","type":"text"}]')
      ON CONFLICT (name) DO NOTHING
    `);

    const { rows: cats } = await client.query(`SELECT id, name FROM asset_categories`);
    const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

    // ─── Assets ───────────────────────────────────────────────────────────────
    logger.info('Seeding assets…');

    const adminId = allUserMap['admin@assetflow.com'];

    const assetRows = [
      // Electronics
      ['AF-0001', 'Dell Laptop Pro',        catMap['Electronics'], 'SN-DELL-001', 'good',      'available',        'Desk E12',   deptMap['Engineering'],  false, adminId],
      ['AF-0002', 'MacBook Air M2',         catMap['Electronics'], 'SN-APPLE-001','good',      'allocated',        'Desk E14',   deptMap['Engineering'],  false, adminId],
      ['AF-0003', 'Projector BenQ HT2050', catMap['Electronics'], 'SN-BNQ-001',  'fair',      'under_maintenance','HQ Floor 2', deptMap['Facilities'],   true,  adminId],
      ['AF-0004', 'Sony Camera A7III',      catMap['Electronics'], 'SN-SONY-001', 'good',      'available',        'Storage A1', deptMap['Engineering'],  true,  adminId],
      ['AF-0005', 'HP Monitor 27"',         catMap['Electronics'], 'SN-HP-001',   'good',      'available',        'Desk E16',   deptMap['Engineering'],  false, adminId],
      ['AF-0006', 'iPad Pro 12.9',          catMap['Electronics'], 'SN-APPLE-002','new',       'available',        'Cabinet B2', deptMap['Engineering'],  false, adminId],
      // Furniture
      ['AF-0007', 'Office Chair Herman Miller', catMap['Furniture'], null,         'good',      'allocated',        'Desk E14',   deptMap['Engineering'],  false, adminId],
      ['AF-0008', 'Standing Desk',          catMap['Furniture'],   null,           'good',      'available',        'Warehouse',  null,                    false, adminId],
      ['AF-0009', 'Conference Table 10-Seat', catMap['Furniture'], null,           'fair',      'available',        'Room B2',    deptMap['Facilities'],   false, adminId],
      // Vehicles
      ['AF-0010', 'Toyota HiAce Van',       catMap['Vehicles'],    'TN-47-9821',  'good',      'available',        'Parking B1', deptMap['Field Operations'], false, adminId],
      ['AF-0011', 'Forklift Cat DP25N',     catMap['Vehicles'],    'FL-001',       'fair',      'available',        'Warehouse',  deptMap['Facilities'],   false, adminId],
      // Tools
      ['AF-0012', 'DeWalt Power Drill Set', catMap['Tools'],       null,           'good',      'available',        'Tool Room',  deptMap['Facilities'],   true,  adminId],
      // Networking
      ['AF-0013', 'Cisco Router 2911',      catMap['Networking'],  'CISCO-001',    'good',      'available',        'Server Room',deptMap['Engineering'],  false, adminId],
      // Shared resources (bookable)
      ['AF-0014', 'Conference Room B2',     catMap['Furniture'],   null,           'good',      'available',        'Floor 2',    deptMap['Facilities'],   true,  adminId],
      ['AF-0015', 'Training Room A1',       catMap['Furniture'],   null,           'good',      'available',        'Floor 1',    deptMap['Facilities'],   true,  adminId],
    ];

    for (const [tag, name, cat, sn, cond, status, loc, dept, bookable, creator] of assetRows) {
      await client.query(`
        INSERT INTO assets
          (asset_tag, name, category_id, serial_number, condition, status,
           location, department_id, is_bookable, created_by, acquisition_date, acquisition_cost)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CURRENT_DATE - INTERVAL '1 year', 50000)
        ON CONFLICT (asset_tag) DO NOTHING
      `, [tag, name, cat, sn, cond, status, loc, dept, bookable, creator]);
    }

    // ─── Active Allocation ────────────────────────────────────────────────────
    logger.info('Seeding allocations…');

    const { rows: assetRows2 } = await client.query(`SELECT id, asset_tag FROM assets WHERE asset_tag IN ('AF-0002','AF-0007')`);
    const assetTagMap = Object.fromEntries(assetRows2.map(a => [a.asset_tag, a.id]));

    if (assetTagMap['AF-0002'] && allUserMap['arjun@assetflow.com']) {
      await client.query(`
        INSERT INTO allocations (asset_id, assigned_to_user, allocated_by, expected_return_at, is_active)
        VALUES ($1, $2, $3, CURRENT_DATE + 30, true)
        ON CONFLICT DO NOTHING
      `, [assetTagMap['AF-0002'], allUserMap['arjun@assetflow.com'], adminId]);
    }

    if (assetTagMap['AF-0007'] && allUserMap['meena@assetflow.com']) {
      await client.query(`
        INSERT INTO allocations (asset_id, assigned_to_user, allocated_by, expected_return_at, is_active)
        VALUES ($1, $2, $3, CURRENT_DATE + 90, true)
        ON CONFLICT DO NOTHING
      `, [assetTagMap['AF-0007'], allUserMap['meena@assetflow.com'], adminId]);
    }

    // ─── Maintenance Request ──────────────────────────────────────────────────
    logger.info('Seeding maintenance requests…');

    const { rows: projector } = await client.query(`SELECT id FROM assets WHERE asset_tag = 'AF-0003' LIMIT 1`);
    if (projector[0]) {
      await client.query(`
        INSERT INTO maintenance_requests (asset_id, raised_by, issue_desc, priority, status, approved_by, approved_at)
        VALUES ($1, $2, 'Projector bulb not turning on', 'high', 'approved', $3, NOW())
        ON CONFLICT DO NOTHING
      `, [projector[0].id, allUserMap['arjun@assetflow.com'], adminId]);
    }

    // ─── Bookings ─────────────────────────────────────────────────────────────
    logger.info('Seeding bookings…');

    const { rows: room } = await client.query(`SELECT id FROM assets WHERE asset_tag = 'AF-0014' LIMIT 1`);
    if (room[0]) {
      await client.query(`
        INSERT INTO bookings (asset_id, booked_by, title, start_time, end_time, status)
        VALUES
          ($1, $2, 'Procurement Team Meeting',   NOW() + INTERVAL '1 hour',  NOW() + INTERVAL '2 hours',  'upcoming'),
          ($1, $3, 'Engineering Sprint Planning', NOW() + INTERVAL '3 hours', NOW() + INTERVAL '4 hours',  'upcoming'),
          ($1, $2, 'Past Booking',                NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours',  'completed')
        ON CONFLICT DO NOTHING
      `, [room[0].id, allUserMap['arjun@assetflow.com'], allUserMap['meena@assetflow.com']]);
    }

    // ─── Audit Cycle ──────────────────────────────────────────────────────────
    logger.info('Seeding audit cycle…');

    const { rows: auditInsert } = await client.query(`
      INSERT INTO audit_cycles (title, scope_dept, start_date, end_date, created_by, status)
      VALUES ('Q3 Audit: Engineering Dept', $1, CURRENT_DATE, CURRENT_DATE + 15, $2, 'open')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [deptMap['Engineering'], adminId]);

    if (auditInsert[0]) {
      const auditId = auditInsert[0].id;
      // Add auditors
      await client.query(`
        INSERT INTO audit_auditors (audit_id, user_id) VALUES ($1, $2), ($1, $3)
        ON CONFLICT DO NOTHING
      `, [auditId, allUserMap['aditi@assetflow.com'], allUserMap['raj@assetflow.com']]);

      // Add some items
      const { rows: engAssets } = await client.query(
        `SELECT id FROM assets WHERE department_id = $1 LIMIT 3`, [deptMap['Engineering']]
      );
      for (const a of engAssets) {
        await client.query(
          `INSERT INTO audit_items (audit_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [auditId, a.id]
        );
      }
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
