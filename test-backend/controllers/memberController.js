import { randomUUID } from "crypto";

import pool from "../config/db.js";

const createError = (statusCode, code, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
};

const notFound = () =>
  createError(404, "RESOURCE_NOT_FOUND", "The requested resource was not found.");

const validatePositiveInteger = (value) =>
  Number.isInteger(value) && value > 0;

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [userResult, membershipResult, eventsResult, ticketsResult, ordersResult, announcementsResult] =
      await Promise.all([
        pool.query(
          `SELECT id, full_name, email FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        ),
        pool.query(
          `
            SELECT
              CASE WHEN status = 'ACTIVE' AND expiry_date < CURRENT_DATE THEN 'EXPIRED' ELSE status END AS status,
              start_date, expiry_date
            FROM memberships
            WHERE user_id = $1
            LIMIT 1
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT id, title, date, start_time, end_time, location
            FROM events
            WHERE status = 'PUBLISHED'
              AND is_member_visible = TRUE
              AND date >= CURRENT_DATE
            ORDER BY date ASC, start_time ASC
            LIMIT 5
          `
        ),
        pool.query(
          `
            SELECT
              t.id AS ticket_id,
              e.id AS event_id,
              e.title AS event_name,
              e.date,
              t.quantity,
              t.price_paid,
              t.status,
              t.check_in_status
            FROM tickets t
            JOIN events e ON e.id = t.event_id
            WHERE t.user_id = $1
              AND t.status = 'ACTIVE'
            ORDER BY e.date ASC
            LIMIT 5
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT id, order_date, total_amount, status, payment_status
            FROM orders
            WHERE user_id = $1
            ORDER BY order_date DESC
            LIMIT 5
          `,
          [userId]
        ),
        pool.query(
          `
            SELECT id, title, content, published_date
            FROM announcements
            WHERE status = 'PUBLISHED'
              AND is_member_visible = TRUE
            ORDER BY published_date DESC
            LIMIT 5
          `
        ),
      ]);

    if (userResult.rows.length === 0) return next(notFound());

    const user = userResult.rows[0];
    const membership = membershipResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        member: {
          id: String(user.id),
          name: user.full_name,
          email: user.email,
        },
        membership: membership
          ? {
              status: membership.status,
              startDate: membership.start_date,
              expiryDate: membership.expiry_date,
            }
          : null,
        upcomingEvents: eventsResult.rows.map((event) => ({
          id: String(event.id),
          title: event.title,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
        })),
        activeTickets: ticketsResult.rows.map((ticket) => ({
          ticketId: String(ticket.ticket_id),
          eventId: String(ticket.event_id),
          eventName: ticket.event_name,
          date: ticket.date,
          quantity: ticket.quantity,
          pricePaid: Number(ticket.price_paid),
          status: ticket.status,
          checkInStatus: ticket.check_in_status,
        })),
        recentOrders: ordersResult.rows.map((order) => ({
          orderId: String(order.id),
          orderDate: order.order_date,
          totalAmount: Number(order.total_amount),
          status: order.status,
          paymentStatus: order.payment_status,
        })),
        latestAnnouncements: announcementsResult.rows.map((announcement) => ({
          announcementId: String(announcement.id),
          title: announcement.title,
          content: announcement.content,
          publishedDate: announcement.published_date,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, full_name, email, phone_number, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) return next(notFound());

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        id: String(user.id),
        name: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phoneNumber } = req.body;
    const details = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.length < 2 || name.length > 100) {
        details.name = "Name must be between 2 and 100 characters.";
      } else if (!/^[A-Za-z ]+$/.test(name)) {
        details.name = "Name may contain only letters and spaces.";
      }
    }

    if (phoneNumber !== undefined) {
      if (typeof phoneNumber !== "string" || !/^\d{10}$/.test(phoneNumber)) {
        details.phoneNumber = "Phone number must contain exactly 10 digits.";
      }
    }

    if (Object.keys(details).length > 0) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid request data.", details)
      );
    }

    if (name === undefined && phoneNumber === undefined) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid request data.", {
          field: "body",
          reason: "At least one editable profile field is required.",
        })
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (name !== undefined) {
        await client.query(
          `UPDATE users SET full_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [name, req.user.id]
        );
      }

      if (phoneNumber !== undefined) {
        await client.query(
          `UPDATE users SET phone_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [phoneNumber, req.user.id]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505" && error.constraint === "users_phone_number_key") {
        return next(
          createError(
            409,
            "PHONE_ALREADY_EXISTS",
            "An account with this phone number already exists."
          )
        );
      }

      throw error;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

export const getMembership = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          CASE WHEN status = 'ACTIVE' AND expiry_date < CURRENT_DATE THEN 'EXPIRED' ELSE status END AS status,
          start_date,
          expiry_date,
          dues_amount,
          payment_status
        FROM memberships
        WHERE user_id = $1
        LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) return next(notFound());

    const membership = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        membershipId: String(membership.id),
        status: membership.status,
        startDate: membership.start_date,
        expiryDate: membership.expiry_date,
        duesAmount: Number(membership.dues_amount),
        paymentStatus: membership.payment_status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getEvents = async (req, res, next) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);

    if (!validatePositiveInteger(page) || !validatePositiveInteger(limit) || limit > 100) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid request data.", {
          field: "page/limit",
          reason: "Page must be positive and limit must be between 1 and 100.",
        })
      );
    }

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
        SELECT
          e.id,
          e.title,
          e.description,
          e.date,
          e.start_time,
          e.end_time,
          e.location,
          e.capacity,
          e.status,
          COALESCE(SUM(tt.available_quantity), 0)::int AS remaining_capacity
        FROM events e
        LEFT JOIN ticket_types tt ON tt.event_id = e.id AND tt.is_active = TRUE
        WHERE e.status = 'PUBLISHED'
          AND e.is_member_visible = TRUE
        GROUP BY e.id
        ORDER BY e.date ASC, e.start_time ASC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const eventIds = result.rows.map((row) => row.id);
    let ticketTypes = [];

    if (eventIds.length > 0) {
      const ticketResult = await pool.query(
        `
          SELECT id, event_id, name, member_price, available_quantity
          FROM ticket_types
          WHERE event_id = ANY($1::uuid[])
            AND is_active = TRUE
          ORDER BY name ASC
        `,
        [eventIds]
      );
      ticketTypes = ticketResult.rows;
    }

    return res.status(200).json({
      success: true,
      data: {
        events: result.rows.map((event) => ({
          id: String(event.id),
          title: event.title,
          description: event.description,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          capacity: event.capacity,
          remainingCapacity: Number(event.remaining_capacity),
          status: event.status,
          ticketTypes: ticketTypes
            .filter((ticket) => String(ticket.event_id) === String(event.id))
            .map((ticket) => ({
              id: String(ticket.id),
              name: ticket.name,
              memberPrice: Number(ticket.member_price),
              availability: Number(ticket.available_quantity) > 0 ? "AVAILABLE" : "SOLD_OUT",
              availableQuantity: ticket.available_quantity,
            })),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getEventDetails = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, title, description, date, start_time, end_time, location, capacity, status
        FROM events
        WHERE id = $1
          AND status = 'PUBLISHED'
          AND is_member_visible = TRUE
        LIMIT 1
      `,
      [req.params.eventId]
    );

    if (result.rows.length === 0) return next(notFound());

    const event = result.rows[0];

    const ticketResult = await pool.query(
      `
        SELECT id, name, member_price, available_quantity
        FROM ticket_types
        WHERE event_id = $1
          AND is_active = TRUE
        ORDER BY name ASC
      `,
      [event.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        event: {
          id: String(event.id),
          title: event.title,
          description: event.description,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          capacity: event.capacity,
          remainingCapacity: ticketResult.rows.reduce(
            (sum, ticket) => sum + Number(ticket.available_quantity),
            0
          ),
          status: event.status,
        },
        ticketTypes: ticketResult.rows.map((ticket) => ({
          id: String(ticket.id),
          name: ticket.name,
          memberPrice: Number(ticket.member_price),
          availability: Number(ticket.available_quantity) > 0 ? "AVAILABLE" : "SOLD_OUT",
          availableQuantity: ticket.available_quantity,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const purchaseTicket = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { eventId, ticketTypeId, quantity } = req.body;

    if (!eventId || !ticketTypeId || !validatePositiveInteger(quantity)) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid request data.", {
          field: "quantity",
          reason: "Quantity must be greater than zero.",
        })
      );
    }

    await client.query("BEGIN");

    const membershipResult = await client.query(
      `
        SELECT id, status, expiry_date
        FROM memberships
        WHERE user_id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [req.user.id]
    );

    if (
      membershipResult.rows.length === 0 ||
      membershipResult.rows[0].status !== "ACTIVE" ||
      new Date(membershipResult.rows[0].expiry_date).getTime() < Date.now()
    ) {
      await client.query("ROLLBACK");
      return next(
        createError(409, "MEMBERSHIP_NOT_ELIGIBLE", "Your membership is not eligible for this purchase.")
      );
    }

    const ticketResult = await client.query(
      `
        SELECT
          tt.id,
          tt.event_id,
          tt.member_price,
          tt.available_quantity,
          e.status AS event_status,
          e.is_member_visible
        FROM ticket_types tt
        JOIN events e ON e.id = tt.event_id
        WHERE tt.id = $1
          AND e.id = $2
          AND tt.is_active = TRUE
        FOR UPDATE
      `,
      [ticketTypeId, eventId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(notFound());
    }

    const ticketType = ticketResult.rows[0];

    if (ticketType.event_status !== "PUBLISHED" || !ticketType.is_member_visible) {
      await client.query("ROLLBACK");
      return next(notFound());
    }

    if (ticketType.available_quantity < quantity) {
      await client.query("ROLLBACK");
      return next(
        createError(
          409,
          "INSUFFICIENT_CAPACITY",
          "There is not enough capacity available for this purchase."
        )
      );
    }

    const totalAmount = Number(ticketType.member_price) * quantity;
    const ticketId = randomUUID();
    const paymentId = randomUUID();

    await client.query(
      `
        INSERT INTO tickets (
          id, user_id, event_id, ticket_type_id, quantity, price_paid, status, check_in_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', 'NOT_CHECKED_IN')
      `,
      [ticketId, req.user.id, eventId, ticketTypeId, quantity, totalAmount]
    );

    await client.query(
      `
        INSERT INTO payments (
          id, user_id, payment_type, reference_id, amount, status
        )
        VALUES ($1, $2, 'EVENT_TICKET', $3, $4, 'PAID')
      `,
      [paymentId, req.user.id, ticketId, totalAmount]
    );

    await client.query(
      `
        UPDATE ticket_types
        SET available_quantity = available_quantity - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [quantity, ticketTypeId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Ticket purchased successfully.",
      data: {
        ticketId,
        eventId: String(eventId),
        ticketTypeId: String(ticketTypeId),
        quantity,
        pricePaid: totalAmount,
        status: "ACTIVE",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};

export const getTickets = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          t.id AS ticket_id,
          e.id AS event_id,
          e.title AS event_name,
          e.date,
          e.start_time,
          e.end_time,
          e.location,
          tt.name AS ticket_type,
          t.quantity,
          t.price_paid,
          t.purchase_date,
          t.status,
          t.check_in_status
        FROM tickets t
        JOIN events e ON e.id = t.event_id
        JOIN ticket_types tt ON tt.id = t.ticket_type_id
        WHERE t.user_id = $1
        ORDER BY t.purchase_date DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        tickets: result.rows.map((ticket) => ({
          ticketId: String(ticket.ticket_id),
          event: {
            id: String(ticket.event_id),
            name: ticket.event_name,
            date: ticket.date,
            startTime: ticket.start_time,
            endTime: ticket.end_time,
            location: ticket.location,
          },
          ticketType: ticket.ticket_type,
          quantity: ticket.quantity,
          pricePaid: Number(ticket.price_paid),
          purchaseDate: ticket.purchase_date,
          status: ticket.status,
          checkInStatus: ticket.check_in_status,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getTicketDetails = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          t.id AS ticket_id,
          e.id AS event_id,
          e.title AS event_name,
          e.date,
          e.start_time,
          e.end_time,
          e.location,
          tt.name AS ticket_type,
          t.quantity,
          t.price_paid,
          t.purchase_date,
          t.status,
          t.check_in_status
        FROM tickets t
        JOIN events e ON e.id = t.event_id
        JOIN ticket_types tt ON tt.id = t.ticket_type_id
        WHERE t.id = $1
          AND t.user_id = $2
        LIMIT 1
      `,
      [req.params.ticketId, req.user.id]
    );

    if (result.rows.length === 0) return next(notFound());

    const ticket = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        ticketId: String(ticket.ticket_id),
        event: {
          id: String(ticket.event_id),
          name: ticket.event_name,
          date: ticket.date,
          startTime: ticket.start_time,
          endTime: ticket.end_time,
          location: ticket.location,
        },
        ticketType: ticket.ticket_type,
        quantity: ticket.quantity,
        pricePaid: Number(ticket.price_paid),
        purchaseDate: ticket.purchase_date,
        status: ticket.status,
        checkInStatus: ticket.check_in_status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, description, image, base_price,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM product_variants pv
              WHERE pv.product_id = products.id
                AND pv.is_active = TRUE
                AND pv.available_quantity > 0
            ) THEN 'AVAILABLE'
            ELSE 'SOLD_OUT'
          END AS availability_status
        FROM products
        WHERE is_member_available = TRUE
        ORDER BY name ASC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        products: result.rows.map((product) => ({
          productId: String(product.id),
          name: product.name,
          description: product.description,
          image: product.image,
          basePrice: Number(product.base_price),
          availabilityStatus: product.availability_status,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const productResult = await pool.query(
      `
        SELECT id, name, description, image, base_price
        FROM products
        WHERE id = $1
          AND is_member_available = TRUE
        LIMIT 1
      `,
      [req.params.productId]
    );

    if (productResult.rows.length === 0) return next(notFound());

    const product = productResult.rows[0];

    const variantsResult = await pool.query(
      `
        SELECT id, size, price, available_quantity
        FROM product_variants
        WHERE product_id = $1
          AND is_active = TRUE
        ORDER BY size ASC
      `,
      [product.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        productId: String(product.id),
        name: product.name,
        description: product.description,
        image: product.image,
        price: Number(product.base_price),
        variants: variantsResult.rows.map((variant) => ({
          variantId: String(variant.id),
          size: variant.size,
          price: Number(variant.price),
          availableQuantity: variant.available_quantity,
          availabilityStatus:
            Number(variant.available_quantity) > 0 ? "AVAILABLE" : "SOLD_OUT",
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const createOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid request data.", {
          field: "items",
          reason: "At least one item is required.",
        })
      );
    }

    await client.query("BEGIN");

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item || !item.productId || !item.variantId || !validatePositiveInteger(item.quantity)) {
        await client.query("ROLLBACK");
        return next(
          createError(400, "VALIDATION_ERROR", "Invalid request data.", {
            field: "items",
            reason: "Each item requires productId, variantId, and a quantity greater than zero.",
          })
        );
      }

      const variantResult = await client.query(
        `
          SELECT
            pv.id,
            pv.product_id,
            pv.price,
            pv.available_quantity,
            p.is_member_available
          FROM product_variants pv
          JOIN products p ON p.id = pv.product_id
          WHERE pv.id = $1
            AND p.id = $2
            AND pv.is_active = TRUE
          FOR UPDATE
        `,
        [item.variantId, item.productId]
      );

      if (variantResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return next(notFound());
      }

      const variant = variantResult.rows[0];

      if (!variant.is_member_available) {
        await client.query("ROLLBACK");
        return next(notFound());
      }

      if (variant.available_quantity < item.quantity) {
        await client.query("ROLLBACK");
        return next(
          createError(409, "INSUFFICIENT_STOCK", "There is not enough merchandise stock available for this purchase.")
        );
      }

      const unitPrice = Number(variant.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });
    }

    const orderId = randomUUID();
    const paymentId = randomUUID();

    await client.query(
      `
        INSERT INTO orders (id, user_id, total_amount, status, payment_status)
        VALUES ($1, $2, $3, 'PLACED', 'PAID')
      `,
      [orderId, req.user.id, totalAmount]
    );

    for (const item of validatedItems) {
      await client.query(
        `
          INSERT INTO order_items (
            id, order_id, product_id, variant_id, quantity, unit_price, subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          orderId,
          item.productId,
          item.variantId,
          item.quantity,
          item.unitPrice,
          item.subtotal,
        ]
      );

      await client.query(
        `
          UPDATE product_variants
          SET available_quantity = available_quantity - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [item.quantity, item.variantId]
      );
    }

    await client.query(
      `
        INSERT INTO payments (id, user_id, payment_type, reference_id, amount, status)
        VALUES ($1, $2, 'MERCHANDISE_ORDER', $3, $4, 'PAID')
      `,
      [paymentId, req.user.id, orderId, totalAmount]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: {
        orderId,
        totalAmount,
        status: "PLACED",
        paymentStatus: "PAID",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const ordersResult = await pool.query(
      `
        SELECT id, order_date, total_amount, status, payment_status
        FROM orders
        WHERE user_id = $1
        ORDER BY order_date DESC
      `,
      [req.user.id]
    );

    const orders = [];

    for (const order of ordersResult.rows) {
      const itemsResult = await pool.query(
        `
          SELECT
            oi.product_id,
            p.name AS product_name,
            pv.size AS variant,
            oi.quantity,
            oi.unit_price,
            oi.subtotal
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN product_variants pv ON pv.id = oi.variant_id
          WHERE oi.order_id = $1
          ORDER BY p.name ASC
        `,
        [order.id]
      );

      orders.push({
        orderId: String(order.id),
        orderDate: order.order_date,
        totalAmount: Number(order.total_amount),
        status: order.status,
        paymentStatus: order.payment_status,
        items: itemsResult.rows.map((item) => ({
          productId: String(item.product_id),
          productName: item.product_name,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        })),
      });
    }

    return res.status(200).json({ success: true, data: { orders } });
  } catch (error) {
    return next(error);
  }
};

export const getOrderDetails = async (req, res, next) => {
  try {
    const orderResult = await pool.query(
      `
        SELECT id, order_date, status, payment_status, total_amount
        FROM orders
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [req.params.orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) return next(notFound());

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `
        SELECT
          oi.product_id,
          p.name AS product_name,
          pv.size AS variant,
          oi.quantity,
          oi.unit_price,
          oi.subtotal
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN product_variants pv ON pv.id = oi.variant_id
        WHERE oi.order_id = $1
        ORDER BY p.name ASC
      `,
      [order.id]
    );

    const subtotal = itemsResult.rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        orderId: String(order.id),
        orderDate: order.order_date,
        status: order.status,
        paymentStatus: order.payment_status,
        items: itemsResult.rows.map((item) => ({
          productId: String(item.product_id),
          productName: item.product_name,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          subtotal: Number(item.subtotal),
        })),
        subtotal,
        totalAmount: Number(order.total_amount),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT a.id, a.title, a.content, a.published_date, u.id AS author_id, u.full_name AS author_name
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        WHERE a.status = 'PUBLISHED'
          AND a.is_member_visible = TRUE
        ORDER BY a.published_date DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        announcements: result.rows.map((announcement) => ({
          announcementId: String(announcement.id),
          title: announcement.title,
          content: announcement.content,
          publishedDate: announcement.published_date,
          author: {
            id: String(announcement.author_id),
            name: announcement.author_name,
          },
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAnnouncementDetails = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT a.id, a.title, a.content, a.published_date, u.id AS author_id, u.full_name AS author_name
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        WHERE a.id = $1
          AND a.status = 'PUBLISHED'
          AND a.is_member_visible = TRUE
        LIMIT 1
      `,
      [req.params.announcementId]
    );

    if (result.rows.length === 0) return next(notFound());

    const announcement = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        announcementId: String(announcement.id),
        title: announcement.title,
        content: announcement.content,
        publishedDate: announcement.published_date,
        author: {
          id: String(announcement.author_id),
          name: announcement.author_name,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, payment_type, reference_id, amount, status, payment_date
        FROM payments
        WHERE user_id = $1
        ORDER BY payment_date DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        payments: result.rows.map((payment) => ({
          paymentId: String(payment.id),
          paymentType: payment.payment_type,
          referenceId: String(payment.reference_id),
          amount: Number(payment.amount),
          status: payment.status,
          date: payment.payment_date,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};
