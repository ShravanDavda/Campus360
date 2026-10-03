import pool from '../config/db.js';

async function main() {
  try {
    const constraints = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);

    for (const c of constraints.rows) {
      console.log(`${c.table_name} | ${c.constraint_name} | ${c.constraint_type} | ${c.column_name || ''} | ${c.check_clause || ''}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

main();
