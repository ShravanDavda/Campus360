import pool from '../config/db.js';

async function main() {
  try {
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('TABLES_IN_CAMPUS360:', tablesRes.rows.map((r) => r.table_name));

    for (const row of tablesRes.rows) {
      const colsRes = await pool.query(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
        [row.table_name]
      );
      console.log(`\n--- TABLE: ${row.table_name} ---`);
      for (const col of colsRes.rows) {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      }

      const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM ${row.table_name}`);
      console.log(`  Count: ${countRes.rows[0].count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('INSPECT ERROR:', err);
    process.exit(1);
  }
}

main();
