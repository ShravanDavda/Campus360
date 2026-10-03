import bcrypt from 'bcrypt';
import pool from '../config/db.js';

// Deterministic UUIDs for idempotent seeding
const IDS = {
  // Users
  USER_MEMBER: 'a0000000-0000-0000-0000-000000000001',
  USER_ORGANIZER: 'a0000000-0000-0000-0000-000000000002',
  USER_TREASURER: 'a0000000-0000-0000-0000-000000000003',
  USER_ADMIN: 'a0000000-0000-0000-0000-000000000004',

  // Membership
  MEMBERSHIP: 'b0000000-0000-0000-0000-000000000001',

  // Events
  EVENT_SUMMIT: 'c0000000-0000-0000-0000-000000000001',
  EVENT_HACKATHON: 'c0000000-0000-0000-0000-000000000002',
  EVENT_MEETUP: 'c0000000-0000-0000-0000-000000000003',
  EVENT_CULTURAL: 'c0000000-0000-0000-0000-000000000004',
  EVENT_ALUMNI: 'c0000000-0000-0000-0000-000000000005',

  // Ticket Types
  TT_SUMMIT_GEN: 'd0000000-0000-0000-0000-000000000001',
  TT_SUMMIT_VIP: 'd0000000-0000-0000-0000-000000000002',
  TT_HACK_PART: 'd0000000-0000-0000-0000-000000000003',
  TT_HACK_OBS: 'd0000000-0000-0000-0000-000000000004',
  TT_MEET_STD: 'd0000000-0000-0000-0000-000000000005',
  TT_CULT_STD: 'd0000000-0000-0000-0000-000000000006',
  TT_CULT_EARLY: 'd0000000-0000-0000-0000-000000000007',
  TT_ALUM_GEN: 'd0000000-0000-0000-0000-000000000008',

  // Tickets
  TICKET_SUMMIT: 'e0000000-0000-0000-0000-000000000001',
  TICKET_HACK: 'e0000000-0000-0000-0000-000000000002',

  // Products
  PROD_TSHIRT: 'f0000000-0000-0000-0000-000000000001',
  PROD_HOODIE: 'f0000000-0000-0000-0000-000000000002',
  PROD_CAP: 'f0000000-0000-0000-0000-000000000003',
  PROD_JOURNAL: 'f0000000-0000-0000-0000-000000000004',
  PROD_JACKET: 'f0000000-0000-0000-0000-000000000005',
  PROD_BOTTLE: 'f0000000-0000-0000-0000-000000000006',

  // Product Variants
  VAR_TSHIRT_S: '10000000-0000-0000-0000-000000000001',
  VAR_TSHIRT_M: '10000000-0000-0000-0000-000000000002',
  VAR_TSHIRT_L: '10000000-0000-0000-0000-000000000003',
  VAR_TSHIRT_XL: '10000000-0000-0000-0000-000000000004',
  VAR_HOODIE_S: '10000000-0000-0000-0000-000000000005',
  VAR_HOODIE_M: '10000000-0000-0000-0000-000000000006',
  VAR_HOODIE_L: '10000000-0000-0000-0000-000000000007',
  VAR_CAP_STD: '10000000-0000-0000-0000-000000000008',
  VAR_JOURNAL_A5: '10000000-0000-0000-0000-000000000009',
  VAR_JACKET_M: '10000000-0000-0000-0000-000000000010',
  VAR_JACKET_L: '10000000-0000-0000-0000-000000000011',
  VAR_BOTTLE_750: '10000000-0000-0000-0000-000000000012',

  // Orders & Items
  ORDER_1: '20000000-0000-0000-0000-000000000001',
  ORDER_ITEM_1: '21000000-0000-0000-0000-000000000001',
  ORDER_2: '20000000-0000-0000-0000-000000000002',
  ORDER_ITEM_2A: '21000000-0000-0000-0000-000000000002',
  ORDER_ITEM_2B: '21000000-0000-0000-0000-000000000003',

  // Announcements
  ANN_WELCOME: '30000000-0000-0000-0000-000000000001',
  ANN_MEMBERSHIP: '30000000-0000-0000-0000-000000000002',
  ANN_HACKATHON: '30000000-0000-0000-0000-000000000003',
  ANN_MERCH: '30000000-0000-0000-0000-000000000004',
  ANN_VOLUNTEER: '30000000-0000-0000-0000-000000000005',

  // Payments
  PAY_MEMBERSHIP: '40000000-0000-0000-0000-000000000001',
  PAY_TICKET_1: '40000000-0000-0000-0000-000000000002',
  PAY_TICKET_2: '40000000-0000-0000-0000-000000000003',
  PAY_ORDER_1: '40000000-0000-0000-0000-000000000004',
  PAY_ORDER_2: '40000000-0000-0000-0000-000000000005',
};

async function seed() {
  const client = await pool.connect();
  console.log('--- Starting Campus360 Database Seed ---');

  try {
    await client.query('BEGIN');

    // 1. Password hashing (bcrypt cost factor 12, as used by authController.js)
    const demoPasswordHash = await bcrypt.hash('Demo@123456', 12);

    // 2. Users
    console.log('Seeding users...');
    const users = [
      {
        id: IDS.USER_MEMBER,
        full_name: 'Demo Member',
        email: 'demo.member@campus360.local',
        password_hash: demoPasswordHash,
        phone_number: '9000000001',
        role: 'volunteer',
        status: 'active',
      },
      {
        id: IDS.USER_ORGANIZER,
        full_name: 'Demo Organizer',
        email: 'demo.organizer@campus360.local',
        password_hash: demoPasswordHash,
        phone_number: '9000000002',
        role: 'eventOrganizer',
        status: 'active',
      },
      {
        id: IDS.USER_TREASURER,
        full_name: 'Demo Treasurer',
        email: 'demo.treasurer@campus360.local',
        password_hash: demoPasswordHash,
        phone_number: '9000000003',
        role: 'treasurer',
        status: 'active',
      },
      {
        id: IDS.USER_ADMIN,
        full_name: 'Demo Admin',
        email: 'demo.admin@campus360.local',
        password_hash: demoPasswordHash,
        phone_number: '9000000004',
        role: 'admin',
        status: 'active',
      },
    ];

    for (const u of users) {
      await client.query(
        `
          INSERT INTO users (id, full_name, email, password_hash, phone_number, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash,
              phone_number = EXCLUDED.phone_number,
              role = EXCLUDED.role,
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
        `,
        [u.id, u.full_name, u.email, u.password_hash, u.phone_number, u.role, u.status]
      );
    }

    // 3. Membership for Demo Member
    console.log('Seeding membership...');
    await client.query(
      `
        INSERT INTO memberships (id, user_id, status, start_date, expiry_date, dues_amount, payment_status)
        VALUES ($1, $2, 'ACTIVE', '2026-01-01', '2026-12-31', 500.00, 'PAID')
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            start_date = EXCLUDED.start_date,
            expiry_date = EXCLUDED.expiry_date,
            dues_amount = EXCLUDED.dues_amount,
            payment_status = EXCLUDED.payment_status,
            updated_at = CURRENT_TIMESTAMP
      `,
      [IDS.MEMBERSHIP, IDS.USER_MEMBER]
    );

    // 4. Events
    console.log('Seeding events...');
    const events = [
      {
        id: IDS.EVENT_SUMMIT,
        title: 'Campus Tech Summit 2026',
        description: 'Annual technology summit featuring keynote sessions from industry leaders, workshops, and student tech exhibits.',
        date: '2026-10-15',
        start_time: '09:00:00',
        end_time: '17:00:00',
        location: 'Main Auditorium, Campus Center',
        capacity: 300,
        status: 'PUBLISHED',
        is_member_visible: true,
        created_by: IDS.USER_ORGANIZER,
      },
      {
        id: IDS.EVENT_HACKATHON,
        title: 'Hackathon 2026 — 24-Hour Codefest',
        description: 'Overnight collaborative hackathon solving real-world campus and social problems with prizes and mentor feedback.',
        date: '2026-10-24',
        start_time: '10:00:00',
        end_time: '18:00:00',
        location: 'Computer Science Lab Hall 3',
        capacity: 120,
        status: 'PUBLISHED',
        is_member_visible: true,
        created_by: IDS.USER_ORGANIZER,
      },
      {
        id: IDS.EVENT_MEETUP,
        title: 'Developer Meetup: Modern Web & Cloud',
        description: 'Interactive developer session exploring full-stack engineering, cloud architecture, and open-source contribution.',
        date: '2026-11-05',
        start_time: '14:00:00',
        end_time: '17:00:00',
        location: 'Seminar Hall B, Engineering Block',
        capacity: 80,
        status: 'PUBLISHED',
        is_member_visible: true,
        created_by: IDS.USER_ORGANIZER,
      },
      {
        id: IDS.EVENT_CULTURAL,
        title: 'Annual Cultural & Music Night',
        description: 'An evening of student performances, live acoustic band sets, dance troupes, and campus awards.',
        date: '2026-11-20',
        start_time: '18:30:00',
        end_time: '22:00:00',
        location: 'Open Air Amphitheatre',
        capacity: 400,
        status: 'PUBLISHED',
        is_member_visible: true,
        created_by: IDS.USER_ORGANIZER,
      },
      {
        id: IDS.EVENT_ALUMNI,
        title: 'Alumni Connect & Career Networking',
        description: 'Network with distinguished alumni across tech, finance, and research. Includes 1-on-1 breakout mentoring.',
        date: '2026-12-05',
        start_time: '11:00:00',
        end_time: '15:00:00',
        location: 'Conference Hall 1, Student Union',
        capacity: 100,
        status: 'PUBLISHED',
        is_member_visible: true,
        created_by: IDS.USER_ORGANIZER,
      },
    ];

    for (const ev of events) {
      await client.query(
        `
          INSERT INTO events (id, title, description, date, start_time, end_time, location, capacity, status, is_member_visible, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              description = EXCLUDED.description,
              date = EXCLUDED.date,
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              location = EXCLUDED.location,
              capacity = EXCLUDED.capacity,
              status = EXCLUDED.status,
              is_member_visible = EXCLUDED.is_member_visible,
              created_by = EXCLUDED.created_by,
              updated_at = CURRENT_TIMESTAMP
        `,
        [ev.id, ev.title, ev.description, ev.date, ev.start_time, ev.end_time, ev.location, ev.capacity, ev.status, ev.is_member_visible, ev.created_by]
      );
    }

    // 5. Ticket Types
    console.log('Seeding ticket types...');
    const ticketTypes = [
      { id: IDS.TT_SUMMIT_GEN, event_id: IDS.EVENT_SUMMIT, name: 'General Admission', member_price: 100.00, available_quantity: 150, is_active: true },
      { id: IDS.TT_SUMMIT_VIP, event_id: IDS.EVENT_SUMMIT, name: 'VIP Access Pass', member_price: 250.00, available_quantity: 50, is_active: true },
      { id: IDS.TT_HACK_PART, event_id: IDS.EVENT_HACKATHON, name: 'Hacker Participant Pass', member_price: 150.00, available_quantity: 79, is_active: true },
      { id: IDS.TT_HACK_OBS, event_id: IDS.EVENT_HACKATHON, name: 'Observer Pass', member_price: 50.00, available_quantity: 20, is_active: true },
      { id: IDS.TT_MEET_STD, event_id: IDS.EVENT_MEETUP, name: 'Standard RSVP', member_price: 0.00, available_quantity: 50, is_active: true },
      { id: IDS.TT_CULT_STD, event_id: IDS.EVENT_CULTURAL, name: 'Student Entry Pass', member_price: 75.00, available_quantity: 250, is_active: true },
      { id: IDS.TT_CULT_EARLY, event_id: IDS.EVENT_CULTURAL, name: 'Early Bird Pass', member_price: 50.00, available_quantity: 0, is_active: true },
      { id: IDS.TT_ALUM_GEN, event_id: IDS.EVENT_ALUMNI, name: 'General Entry', member_price: 50.00, available_quantity: 60, is_active: true },
    ];

    for (const tt of ticketTypes) {
      await client.query(
        `
          INSERT INTO ticket_types (id, event_id, name, member_price, available_quantity, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              member_price = EXCLUDED.member_price,
              available_quantity = EXCLUDED.available_quantity,
              is_active = EXCLUDED.is_active,
              updated_at = CURRENT_TIMESTAMP
        `,
        [tt.id, tt.event_id, tt.name, tt.member_price, tt.available_quantity, tt.is_active]
      );
    }

    // 6. Tickets for Demo Member
    console.log('Seeding member tickets...');
    const tickets = [
      {
        id: IDS.TICKET_SUMMIT,
        user_id: IDS.USER_MEMBER,
        event_id: IDS.EVENT_SUMMIT,
        ticket_type_id: IDS.TT_SUMMIT_GEN,
        quantity: 1,
        price_paid: 100.00,
        purchase_date: '2026-10-02 14:20:00+00',
        status: 'ACTIVE',
        check_in_status: 'NOT_CHECKED_IN',
      },
      {
        id: IDS.TICKET_HACK,
        user_id: IDS.USER_MEMBER,
        event_id: IDS.EVENT_HACKATHON,
        ticket_type_id: IDS.TT_HACK_PART,
        quantity: 1,
        price_paid: 150.00,
        purchase_date: '2026-10-02 16:45:00+00',
        status: 'ACTIVE',
        check_in_status: 'CHECKED_IN', // Demonstrates checked in ticket
      },
    ];

    for (const t of tickets) {
      await client.query(
        `
          INSERT INTO tickets (id, user_id, event_id, ticket_type_id, quantity, price_paid, purchase_date, status, check_in_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE
          SET quantity = EXCLUDED.quantity,
              price_paid = EXCLUDED.price_paid,
              status = EXCLUDED.status,
              check_in_status = EXCLUDED.check_in_status
        `,
        [t.id, t.user_id, t.event_id, t.ticket_type_id, t.quantity, t.price_paid, t.purchase_date, t.status, t.check_in_status]
      );
    }

    // 7. Products
    console.log('Seeding products...');
    const products = [
      {
        id: IDS.PROD_TSHIRT,
        name: 'Campus360 Classic Purple T-Shirt',
        description: 'Premium 100% combed cotton jersey t-shirt in official signature purple with embroidered emblem.',
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
        base_price: 399.00,
        is_member_available: true,
      },
      {
        id: IDS.PROD_HOODIE,
        name: 'Campus360 Zip-Up Fleece Hoodie',
        description: 'Heavyweight 360 GSM fleece hoodie with brass zipper, kangaroo pocket, and gold accent inner hood lining.',
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
        base_price: 899.00,
        is_member_available: true,
      },
      {
        id: IDS.PROD_CAP,
        name: 'Developer Embroidered Dad Cap',
        description: 'Structured 6-panel unstructured dad cap with curved brim, adjustable antique brass buckle strap.',
        image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80',
        base_price: 249.00,
        is_member_available: true,
      },
      {
        id: IDS.PROD_JOURNAL,
        name: 'Campus360 Hardcover Dotted Journal',
        description: '192-page 120 GSM bleed-proof ivory paper notebook with elastic closure band and ribbon bookmark.',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
        base_price: 199.00,
        is_member_available: true,
      },
      {
        id: IDS.PROD_JACKET,
        name: 'Skyline Varsity Club Jacket',
        description: 'Collegiate varsity bomber jacket with wool-blend body, faux-leather sleeves, and custom chenille patches.',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80',
        base_price: 1499.00,
        is_member_available: true,
      },
      {
        id: IDS.PROD_BOTTLE,
        name: 'Insulated Stainless Steel Water Bottle',
        description: '750ml double-wall vacuum insulated flask. Keeps beverages cold for 24h or hot for 12h. Matte finish.',
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80',
        base_price: 349.00,
        is_member_available: true,
      },
    ];

    for (const p of products) {
      await client.query(
        `
          INSERT INTO products (id, name, description, image, base_price, is_member_available)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              image = EXCLUDED.image,
              base_price = EXCLUDED.base_price,
              is_member_available = EXCLUDED.is_member_available,
              updated_at = CURRENT_TIMESTAMP
        `,
        [p.id, p.name, p.description, p.image, p.base_price, p.is_member_available]
      );
    }

    // 8. Product Variants & Inventory
    console.log('Seeding product variants & inventory...');
    const variants = [
      { id: IDS.VAR_TSHIRT_S, product_id: IDS.PROD_TSHIRT, size: 'S', price: 399.00, available_quantity: 25, is_active: true },
      { id: IDS.VAR_TSHIRT_M, product_id: IDS.PROD_TSHIRT, size: 'M', price: 399.00, available_quantity: 39, is_active: true },
      { id: IDS.VAR_TSHIRT_L, product_id: IDS.PROD_TSHIRT, size: 'L', price: 399.00, available_quantity: 35, is_active: true },
      { id: IDS.VAR_TSHIRT_XL, product_id: IDS.PROD_TSHIRT, size: 'XL', price: 429.00, available_quantity: 15, is_active: true },

      { id: IDS.VAR_HOODIE_S, product_id: IDS.PROD_HOODIE, size: 'S', price: 899.00, available_quantity: 10, is_active: true },
      { id: IDS.VAR_HOODIE_M, product_id: IDS.PROD_HOODIE, size: 'M', price: 899.00, available_quantity: 20, is_active: true },
      { id: IDS.VAR_HOODIE_L, product_id: IDS.PROD_HOODIE, size: 'L', price: 899.00, available_quantity: 15, is_active: true },

      { id: IDS.VAR_CAP_STD, product_id: IDS.PROD_CAP, size: 'Standard', price: 249.00, available_quantity: 49, is_active: true },
      { id: IDS.VAR_JOURNAL_A5, product_id: IDS.PROD_JOURNAL, size: 'A5', price: 199.00, available_quantity: 44, is_active: true },

      { id: IDS.VAR_JACKET_M, product_id: IDS.PROD_JACKET, size: 'M', price: 1499.00, available_quantity: 12, is_active: true },
      { id: IDS.VAR_JACKET_L, product_id: IDS.PROD_JACKET, size: 'L', price: 1499.00, available_quantity: 18, is_active: true },

      { id: IDS.VAR_BOTTLE_750, product_id: IDS.PROD_BOTTLE, size: '750ml', price: 349.00, available_quantity: 30, is_active: true },
    ];

    for (const v of variants) {
      await client.query(
        `
          INSERT INTO product_variants (id, product_id, size, price, available_quantity, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE
          SET size = EXCLUDED.size,
              price = EXCLUDED.price,
              available_quantity = EXCLUDED.available_quantity,
              is_active = EXCLUDED.is_active,
              updated_at = CURRENT_TIMESTAMP
        `,
        [v.id, v.product_id, v.size, v.price, v.available_quantity, v.is_active]
      );
    }

    // 9. Orders for Demo Member
    console.log('Seeding orders...');
    const orders = [
      {
        id: IDS.ORDER_1,
        user_id: IDS.USER_MEMBER,
        order_date: '2026-10-02 18:10:00+00',
        total_amount: 399.00,
        status: 'PLACED',
        payment_status: 'PAID',
      },
      {
        id: IDS.ORDER_2,
        user_id: IDS.USER_MEMBER,
        order_date: '2026-10-03 12:30:00+00',
        total_amount: 448.00,
        status: 'PLACED',
        payment_status: 'PAID',
      },
    ];

    for (const o of orders) {
      await client.query(
        `
          INSERT INTO orders (id, user_id, order_date, total_amount, status, payment_status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE
          SET total_amount = EXCLUDED.total_amount,
              status = EXCLUDED.status,
              payment_status = EXCLUDED.payment_status
        `,
        [o.id, o.user_id, o.order_date, o.total_amount, o.status, o.payment_status]
      );
    }

    // 10. Order Items
    console.log('Seeding order items...');
    const orderItems = [
      {
        id: IDS.ORDER_ITEM_1,
        order_id: IDS.ORDER_1,
        product_id: IDS.PROD_TSHIRT,
        variant_id: IDS.VAR_TSHIRT_M,
        quantity: 1,
        unit_price: 399.00,
        subtotal: 399.00,
      },
      {
        id: IDS.ORDER_ITEM_2A,
        order_id: IDS.ORDER_2,
        product_id: IDS.PROD_CAP,
        variant_id: IDS.VAR_CAP_STD,
        quantity: 1,
        unit_price: 249.00,
        subtotal: 249.00,
      },
      {
        id: IDS.ORDER_ITEM_2B,
        order_id: IDS.ORDER_2,
        product_id: IDS.PROD_JOURNAL,
        variant_id: IDS.VAR_JOURNAL_A5,
        quantity: 1,
        unit_price: 199.00,
        subtotal: 199.00,
      },
    ];

    for (const oi of orderItems) {
      await client.query(
        `
          INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, unit_price, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              subtotal = EXCLUDED.subtotal
        `,
        [oi.id, oi.order_id, oi.product_id, oi.variant_id, oi.quantity, oi.unit_price, oi.subtotal]
      );
    }

    // 11. Announcements
    console.log('Seeding announcements...');
    const announcements = [
      {
        id: IDS.ANN_WELCOME,
        title: 'Welcome to Campus360 — Skyline Student Association Platform',
        content: 'We are proud to introduce Campus360, your central hub for event passes, merchandise orders, membership records, and official announcements. Explore the platform and connect with our student operating community.',
        author_id: IDS.USER_ORGANIZER,
        published_date: '2026-10-01 10:00:00+00',
        status: 'PUBLISHED',
        is_member_visible: true,
      },
      {
        id: IDS.ANN_MEMBERSHIP,
        title: 'Annual Membership Dues & Validity Confirmation',
        content: 'Membership renewals for the 2026 academic calendar have been recorded. Active club members receive preferential member pricing on all club-hosted technical conferences and limited merchandise drops.',
        author_id: IDS.USER_TREASURER,
        published_date: '2026-10-02 11:30:00+00',
        status: 'PUBLISHED',
        is_member_visible: true,
      },
      {
        id: IDS.ANN_HACKATHON,
        title: 'Hackathon 2026 Team Registrations Now Open',
        content: 'Registrations are live for Hackathon 2026. Teams of 2 to 4 members may register through the Events tab. Hardware kits, cloud sandbox credits, and catering are included for all confirmed attendees.',
        author_id: IDS.USER_ORGANIZER,
        published_date: '2026-10-03 09:15:00+00',
        status: 'PUBLISHED',
        is_member_visible: true,
      },
      {
        id: IDS.ANN_MERCH,
        title: 'Official Autumn Apparel & Merchandise Collection Drop',
        content: 'The official autumn merchandise collection featuring hoodies, varsity jackets, and notebooks is now available in the Merchandise catalog. Pickups can be arranged at the student union desk after order placement.',
        author_id: IDS.USER_ORGANIZER,
        published_date: '2026-10-03 14:00:00+00',
        status: 'PUBLISHED',
        is_member_visible: true,
      },
      {
        id: IDS.ANN_VOLUNTEER,
        title: 'Volunteer Operations Orientation Briefing',
        content: 'All registered student volunteers are invited to attend our operational orientation session ahead of upcoming campus summit events. Check your registered email for schedule updates.',
        author_id: IDS.USER_ORGANIZER,
        published_date: '2026-10-03 15:30:00+00',
        status: 'PUBLISHED',
        is_member_visible: true,
      },
    ];

    for (const a of announcements) {
      await client.query(
        `
          INSERT INTO announcements (id, title, content, author_id, published_date, status, is_member_visible)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              content = EXCLUDED.content,
              author_id = EXCLUDED.author_id,
              published_date = EXCLUDED.published_date,
              status = EXCLUDED.status,
              is_member_visible = EXCLUDED.is_member_visible,
              updated_at = CURRENT_TIMESTAMP
        `,
        [a.id, a.title, a.content, a.author_id, a.published_date, a.status, a.is_member_visible]
      );
    }

    // 12. Payments
    console.log('Seeding payments...');
    const payments = [
      {
        id: IDS.PAY_MEMBERSHIP,
        user_id: IDS.USER_MEMBER,
        payment_type: 'MEMBERSHIP_DUES',
        reference_id: IDS.MEMBERSHIP,
        amount: 500.00,
        status: 'PAID',
        payment_date: '2026-01-01 10:00:00+00',
      },
      {
        id: IDS.PAY_TICKET_1,
        user_id: IDS.USER_MEMBER,
        payment_type: 'EVENT_TICKET',
        reference_id: IDS.TICKET_SUMMIT,
        amount: 100.00,
        status: 'PAID',
        payment_date: '2026-10-02 14:20:00+00',
      },
      {
        id: IDS.PAY_TICKET_2,
        user_id: IDS.USER_MEMBER,
        payment_type: 'EVENT_TICKET',
        reference_id: IDS.TICKET_HACK,
        amount: 150.00,
        status: 'PAID',
        payment_date: '2026-10-02 16:45:00+00',
      },
      {
        id: IDS.PAY_ORDER_1,
        user_id: IDS.USER_MEMBER,
        payment_type: 'MERCHANDISE_ORDER',
        reference_id: IDS.ORDER_1,
        amount: 399.00,
        status: 'PAID',
        payment_date: '2026-10-02 18:10:00+00',
      },
      {
        id: IDS.PAY_ORDER_2,
        user_id: IDS.USER_MEMBER,
        payment_type: 'MERCHANDISE_ORDER',
        reference_id: IDS.ORDER_2,
        amount: 448.00,
        status: 'PAID',
        payment_date: '2026-10-03 12:30:00+00',
      },
    ];

    for (const p of payments) {
      await client.query(
        `
          INSERT INTO payments (id, user_id, payment_type, reference_id, amount, status, payment_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET amount = EXCLUDED.amount,
              status = EXCLUDED.status,
              payment_date = EXCLUDED.payment_date
        `,
        [p.id, p.user_id, p.payment_type, p.reference_id, p.amount, p.status, p.payment_date]
      );
    }

    await client.query('COMMIT');
    console.log('--- Database Seed Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SEED ERROR:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
