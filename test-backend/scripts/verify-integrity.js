import pool from '../config/db.js';

async function main() {
  console.log('--- Verifying Data Integrity ---');

  // Check 1: Orphan tickets
  const orphanTickets = await pool.query(`
    SELECT t.id FROM tickets t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN events e ON e.id = t.event_id
    LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
    WHERE u.id IS NULL OR e.id IS NULL OR tt.id IS NULL
  `);
  console.log(`Orphan tickets: ${orphanTickets.rows.length}`);

  // Check 2: Orphan memberships
  const orphanMemberships = await pool.query(`
    SELECT m.id FROM memberships m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE u.id IS NULL
  `);
  console.log(`Orphan memberships: ${orphanMemberships.rows.length}`);

  // Check 3: Orphan orders & order_items
  const orphanOrders = await pool.query(`
    SELECT o.id FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE u.id IS NULL
  `);
  console.log(`Orphan orders: ${orphanOrders.rows.length}`);

  const orphanOrderItems = await pool.query(`
    SELECT oi.id FROM order_items oi
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    WHERE o.id IS NULL OR p.id IS NULL OR pv.id IS NULL
  `);
  console.log(`Orphan order items: ${orphanOrderItems.rows.length}`);

  // Check 4: Orphan announcements
  const orphanAnnouncements = await pool.query(`
    SELECT a.id FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    WHERE u.id IS NULL
  `);
  console.log(`Orphan announcements: ${orphanAnnouncements.rows.length}`);

  // Check 5: Negative quantities
  const negInventory = await pool.query(`
    SELECT id, available_quantity FROM product_variants WHERE available_quantity < 0
  `);
  console.log(`Negative inventory in variants: ${negInventory.rows.length}`);

  const negTickets = await pool.query(`
    SELECT id, available_quantity FROM ticket_types WHERE available_quantity < 0
  `);
  console.log(`Negative ticket availability: ${negTickets.rows.length}`);

  // Check 6: Mathematical consistency of orders
  const orders = await pool.query(`
    SELECT o.id, o.total_amount, SUM(oi.subtotal) AS item_sum
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, o.total_amount
  `);
  let orderMathValid = true;
  for (const o of orders.rows) {
    if (Number(o.total_amount) !== Number(o.item_sum)) {
      console.error(`Order ${o.id} math mismatch: total ${o.total_amount} vs sum ${o.item_sum}`);
      orderMathValid = false;
    }
  }
  console.log(`Order math consistency: ${orderMathValid ? 'PASS' : 'FAIL'}`);

  const allPassed =
    orphanTickets.rows.length === 0 &&
    orphanMemberships.rows.length === 0 &&
    orphanOrders.rows.length === 0 &&
    orphanOrderItems.rows.length === 0 &&
    orphanAnnouncements.rows.length === 0 &&
    negInventory.rows.length === 0 &&
    negTickets.rows.length === 0 &&
    orderMathValid;

  console.log(`Integrity Check Result: ${allPassed ? 'ALL INTEGRITY CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

main();
