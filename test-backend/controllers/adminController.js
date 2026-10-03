import pool from "../config/db.js";

const createError = (statusCode, code, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
};

const isValidUUID = (id) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const isValidDate = (d) => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const date = new Date(d);
  return !isNaN(date.getTime());
};

const isValidTime = (t) => {
  if (typeof t !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t);
};

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
| GET /api/admin/dashboard
|--------------------------------------------------------------------------
*/
export const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      membersRes,
      eventsRes,
      ticketsRes,
      merchRes,
      volunteersRes,
      financeRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
        FROM users
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND status != 'CANCELLED')::int AS upcoming,
          COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int AS published
        FROM events
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(quantity), 0)::int AS sold,
          COALESCE(SUM(CASE WHEN check_in_status = 'CHECKED_IN' THEN quantity ELSE 0 END), 0)::int AS checked_in
        FROM tickets
        WHERE status = 'ACTIVE'
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM products) AS products,
          (SELECT COALESCE(SUM(available_quantity), 0)::int FROM product_variants) AS inventory_items,
          (SELECT COUNT(*)::int FROM orders) AS orders
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM fundraisers) AS fundraisers,
          (SELECT COUNT(*)::int FROM tasks) AS tasks,
          (SELECT COUNT(*)::int FROM tasks WHERE status = 'DONE') AS completed_tasks
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)::numeric AS total_income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)::numeric AS total_expenses
        FROM finance_transactions
      `),
    ]);

    const members = membersRes.rows[0];
    const events = eventsRes.rows[0];
    const tickets = ticketsRes.rows[0];
    const merch = merchRes.rows[0];
    const volunteers = volunteersRes.rows[0];
    const finance = financeRes.rows[0];

    const totalIncome = Number(finance.total_income);
    const totalExpenses = Number(finance.total_expenses);
    const balance = totalIncome - totalExpenses;

    return res.status(200).json({
      success: true,
      data: {
        members: {
          total: members.total,
          active: members.active,
          pending: members.pending,
        },
        events: {
          total: events.total,
          upcoming: events.upcoming,
          published: events.published,
        },
        tickets: {
          sold: tickets.sold,
          checkedIn: tickets.checked_in,
        },
        merchandise: {
          products: merch.products,
          inventoryItems: merch.inventory_items,
          orders: merch.orders,
        },
        volunteers: {
          fundraisers: volunteers.fundraisers,
          tasks: volunteers.tasks,
          completedTasks: volunteers.completed_tasks,
        },
        finance: {
          totalIncome,
          totalExpenses,
          balance,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| LIST MEMBERS
| GET /api/admin/members
|--------------------------------------------------------------------------
*/
export const listMembers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`status = $${values.length}`);
    }

    if (req.query.role) {
      values.push(req.query.role);
      conditions.push(`role = $${values.length}`);
    }

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    const query = `
      SELECT id, full_name, email, phone_number, role, status
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const result = await pool.query(query, [...values, limit, offset]);

    return res.status(200).json({
      success: true,
      data: {
        members: result.rows.map((row) => ({
          id: String(row.id),
          fullName: row.full_name,
          email: row.email,
          phoneNumber: row.phone_number,
          role: row.role,
          status: row.status,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| VIEW MEMBER
| GET /api/admin/members/:id
|--------------------------------------------------------------------------
*/
export const viewMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return next(createError(404, "MEMBER_NOT_FOUND", "Member not found."));
    }

    const userRes = await pool.query(
      `SELECT id, full_name, email, phone_number, role, status FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return next(createError(404, "MEMBER_NOT_FOUND", "Member not found."));
    }

    const user = userRes.rows[0];

    const membershipRes = await pool.query(
      `SELECT id, status, start_date, expiry_date, dues_amount, payment_status FROM memberships WHERE user_id = $1 LIMIT 1`,
      [id]
    );

    let membership = null;
    if (membershipRes.rows.length > 0) {
      const m = membershipRes.rows[0];
      membership = {
        membershipId: String(m.id),
        status: m.status,
        startDate: m.start_date instanceof Date ? m.start_date.toISOString().split("T")[0] : String(m.start_date),
        expiryDate: m.expiry_date instanceof Date ? m.expiry_date.toISOString().split("T")[0] : String(m.expiry_date),
        duesAmount: Number(m.dues_amount),
        paymentStatus: m.payment_status,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(user.id),
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        status: user.status,
        membership,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ACTIVATE MEMBER
| PATCH /api/admin/members/:id/status
|--------------------------------------------------------------------------
*/
export const activateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== "string" || status.toLowerCase() !== "active") {
      return next(createError(400, "VALIDATION_ERROR", "Invalid status value. Only activation is supported."));
    }

    if (!isValidUUID(id)) {
      return next(createError(404, "MEMBER_NOT_FOUND", "Member not found."));
    }

    const userRes = await pool.query(`SELECT id, status FROM users WHERE id = $1 LIMIT 1`, [id]);
    if (userRes.rows.length === 0) {
      return next(createError(404, "MEMBER_NOT_FOUND", "Member not found."));
    }

    const user = userRes.rows[0];

    if (user.status !== "pending") {
      return next(createError(409, "INVALID_STATUS_TRANSITION", "Only pending members can be activated."));
    }

    await pool.query(`UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    return res.status(200).json({
      success: true,
      message: "Member account activated.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE EVENT
| POST /api/admin/events
|--------------------------------------------------------------------------
*/
export const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, startTime, endTime, location, capacity } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Title is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }
    if (!isValidDate(date)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid date (YYYY-MM-DD) is required."));
    }
    if (!isValidTime(startTime)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid startTime (HH:MM) is required."));
    }
    if (!isValidTime(endTime)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid endTime (HH:MM) is required."));
    }
    if (endTime <= startTime) {
      return next(createError(400, "VALIDATION_ERROR", "endTime must be after startTime."));
    }
    if (!location || typeof location !== "string" || location.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Location is required."));
    }
    if (!Number.isInteger(capacity) || capacity <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Capacity must be a positive integer."));
    }

    const result = await pool.query(
      `
        INSERT INTO events (title, description, date, start_time, end_time, location, capacity, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8)
        RETURNING id, status
      `,
      [title.trim(), description.trim(), date, startTime, endTime, location.trim(), capacity, req.user.id]
    );

    const event = result.rows[0];

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      data: {
        eventId: String(event.id),
        status: event.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| EDIT EVENT
| PATCH /api/admin/events/:id
|--------------------------------------------------------------------------
*/
export const editEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const { title, description, date, startTime, endTime, location, capacity } = req.body;

    const existingRes = await pool.query(`SELECT * FROM events WHERE id = $1 LIMIT 1`, [id]);
    if (existingRes.rows.length === 0) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }
    const existing = existingRes.rows[0];

    const newDate = date !== undefined ? date : existing.date;
    const newStartTime = startTime !== undefined ? startTime : existing.start_time;
    const newEndTime = endTime !== undefined ? endTime : existing.end_time;
    const newCapacity = capacity !== undefined ? capacity : existing.capacity;

    if (date !== undefined && !isValidDate(date)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid date (YYYY-MM-DD) is required."));
    }
    if (startTime !== undefined && !isValidTime(startTime)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid startTime is required."));
    }
    if (endTime !== undefined && !isValidTime(endTime)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid endTime is required."));
    }
    if (newEndTime <= newStartTime) {
      return next(createError(400, "VALIDATION_ERROR", "endTime must be after startTime."));
    }
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
      return next(createError(400, "VALIDATION_ERROR", "Capacity must be a positive integer."));
    }

    await pool.query(
      `
        UPDATE events
        SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          date = COALESCE($3, date),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          location = COALESCE($6, location),
          capacity = COALESCE($7, capacity),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `,
      [
        title !== undefined ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        newDate,
        newStartTime,
        newEndTime,
        location !== undefined ? location.trim() : null,
        newCapacity,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Event updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| EVENT STATUS
| PATCH /api/admin/events/:id/status
|--------------------------------------------------------------------------
*/
export const updateEventStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "COMPLETED"];
    if (typeof status !== "string" || !allowed.includes(status.toUpperCase())) {
      return next(createError(400, "VALIDATION_ERROR", `Invalid status. Allowed: ${allowed.join(", ")}`));
    }

    if (!isValidUUID(id)) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const resCheck = await pool.query(`SELECT id FROM events WHERE id = $1 LIMIT 1`, [id]);
    if (resCheck.rows.length === 0) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    await pool.query(
      `UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status.toUpperCase(), id]
    );

    return res.status(200).json({
      success: true,
      message: "Event status updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| EVENT LIST
| GET /api/admin/events
|--------------------------------------------------------------------------
*/
export const getAdminEvents = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.date,
        e.start_time,
        e.end_time,
        e.location,
        e.capacity,
        e.status,
        COALESCE(SUM(t.quantity) FILTER (WHERE t.status != 'CANCELLED' AND t.status != 'REFUNDED'), 0)::int AS sold_tickets
      FROM events e
      LEFT JOIN tickets t ON t.event_id = e.id
      GROUP BY e.id
      ORDER BY e.date DESC, e.start_time DESC
    `);

    const events = result.rows.map((e) => {
      const soldTickets = e.sold_tickets;
      const remainingCapacity = Math.max(0, e.capacity - soldTickets);
      const dateStr = e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date);
      const startTimeStr = String(e.start_time).substring(0, 5);
      const endTimeStr = String(e.end_time).substring(0, 5);

      return {
        id: String(e.id),
        title: e.title,
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        location: e.location,
        capacity: e.capacity,
        soldTickets,
        remainingCapacity,
        status: e.status,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        events,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE TICKET TYPE
| POST /api/admin/events/:id/ticket-types
|--------------------------------------------------------------------------
*/
export const createTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const { name, memberPrice, nonMemberPrice } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Name is required."));
    }
    if (typeof memberPrice !== "number" || memberPrice < 0) {
      return next(createError(400, "VALIDATION_ERROR", "memberPrice must be >= 0."));
    }
    if (typeof nonMemberPrice !== "number" || nonMemberPrice < 0) {
      return next(createError(400, "VALIDATION_ERROR", "nonMemberPrice must be >= 0."));
    }

    const eventRes = await pool.query(`SELECT id, capacity FROM events WHERE id = $1 LIMIT 1`, [id]);
    if (eventRes.rows.length === 0) {
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const capacity = eventRes.rows[0].capacity;

    const result = await pool.query(
      `
        INSERT INTO ticket_types (event_id, name, member_price, non_member_price, available_quantity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [id, name.trim(), memberPrice, nonMemberPrice, capacity]
    );

    return res.status(201).json({
      success: true,
      message: "Ticket type created successfully.",
      data: {
        ticketTypeId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return next(createError(409, "CONFLICT", "A ticket type with this name already exists for this event."));
    }
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| EDIT TICKET TYPE
| PATCH /api/admin/events/:id/ticket-types/:ticketTypeId
|--------------------------------------------------------------------------
*/
export const editTicketType = async (req, res, next) => {
  try {
    const { id, ticketTypeId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(ticketTypeId)) {
      return next(createError(404, "TICKET_TYPE_NOT_FOUND", "Ticket type not found."));
    }

    const { name, memberPrice, nonMemberPrice } = req.body;

    const checkRes = await pool.query(
      `SELECT id FROM ticket_types WHERE id = $1 AND event_id = $2 LIMIT 1`,
      [ticketTypeId, id]
    );

    if (checkRes.rows.length === 0) {
      return next(createError(404, "TICKET_TYPE_NOT_FOUND", "Ticket type not found for this event."));
    }

    if (memberPrice !== undefined && (typeof memberPrice !== "number" || memberPrice < 0)) {
      return next(createError(400, "VALIDATION_ERROR", "memberPrice must be >= 0."));
    }
    if (nonMemberPrice !== undefined && (typeof nonMemberPrice !== "number" || nonMemberPrice < 0)) {
      return next(createError(400, "VALIDATION_ERROR", "nonMemberPrice must be >= 0."));
    }

    await pool.query(
      `
        UPDATE ticket_types
        SET
          name = COALESCE($1, name),
          member_price = COALESCE($2, member_price),
          non_member_price = COALESCE($3, non_member_price),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
      [
        name !== undefined ? name.trim() : null,
        memberPrice !== undefined ? memberPrice : null,
        nonMemberPrice !== undefined ? nonMemberPrice : null,
        ticketTypeId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Ticket type updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CHECK-IN
| POST /api/admin/events/:id/check-ins
|--------------------------------------------------------------------------
*/
export const checkInTicket = async (req, res, next) => {
  const { id } = req.params;
  const { ticketId } = req.body;

  if (!ticketId || !isValidUUID(ticketId)) {
    return next(createError(404, "TICKET_NOT_FOUND", "Valid ticketId is required."));
  }
  if (!isValidUUID(id)) {
    return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventRes = await client.query(`SELECT id FROM events WHERE id = $1 LIMIT 1`, [id]);
    if (eventRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const ticketRes = await client.query(
      `SELECT id, event_id, status, check_in_status FROM tickets WHERE id = $1 FOR UPDATE`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(createError(404, "TICKET_NOT_FOUND", "Ticket not found."));
    }

    const ticket = ticketRes.rows[0];

    if (ticket.event_id !== id) {
      await client.query("ROLLBACK");
      return next(createError(409, "CONFLICT", "Ticket does not belong to this event."));
    }

    if (ticket.status === "CANCELLED" || ticket.status === "REFUNDED") {
      await client.query("ROLLBACK");
      return next(createError(409, "CONFLICT", "Ticket is not valid for check-in."));
    }

    if (ticket.check_in_status === "CHECKED_IN") {
      await client.query("ROLLBACK");
      return next(createError(409, "CONFLICT", "Ticket is already checked in."));
    }

    const checkInRes = await client.query(
      `
        INSERT INTO check_ins (ticket_id, event_id, checked_in_by)
        VALUES ($1, $2, $3)
        RETURNING checked_in_at
      `,
      [ticketId, id, req.user.id]
    );

    await client.query(
      `UPDATE tickets SET check_in_status = 'CHECKED_IN' WHERE id = $1`,
      [ticketId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Ticket checked in successfully.",
      data: {
        ticketId: String(ticket.id),
        eventId: String(ticket.event_id),
        checkedInAt: checkInRes.rows[0].checked_in_at.toISOString(),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return next(createError(409, "CONFLICT", "Ticket is already checked in."));
    }
    return next(error);
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
| POST /api/admin/products
|--------------------------------------------------------------------------
*/
export const createProduct = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Name is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO products (name, description, base_price, is_member_available)
        VALUES ($1, $2, 0, TRUE)
        RETURNING id
      `,
      [name.trim(), description.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: {
        productId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT VARIANT
| POST /api/admin/products/:id/variants
|--------------------------------------------------------------------------
*/
export const createProductVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return next(createError(404, "PRODUCT_NOT_FOUND", "Product not found."));
    }

    const { name, price, stock } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Name is required."));
    }
    if (typeof price !== "number" || price < 0) {
      return next(createError(400, "VALIDATION_ERROR", "Price must be >= 0."));
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return next(createError(400, "VALIDATION_ERROR", "Stock must be an integer >= 0."));
    }

    const productRes = await pool.query(`SELECT id FROM products WHERE id = $1 LIMIT 1`, [id]);
    if (productRes.rows.length === 0) {
      return next(createError(404, "PRODUCT_NOT_FOUND", "Product not found."));
    }

    const result = await pool.query(
      `
        INSERT INTO product_variants (product_id, name, size, price, available_quantity, is_active)
        VALUES ($1, $2, $2, $3, $4, TRUE)
        RETURNING id
      `,
      [id, name.trim(), price, stock]
    );

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully.",
      data: {
        variantId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return next(createError(409, "CONFLICT", "A variant with this name already exists for this product."));
    }
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE INVENTORY
| PATCH /api/admin/products/:id/variants/:variantId/inventory
|--------------------------------------------------------------------------
*/
export const updateInventory = async (req, res, next) => {
  const { id, variantId } = req.params;
  const { stock } = req.body;

  if (!isValidUUID(id) || !isValidUUID(variantId)) {
    return next(createError(404, "VARIANT_NOT_FOUND", "Product variant not found."));
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return next(createError(400, "VALIDATION_ERROR", "Stock must be a non-negative integer."));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const variantRes = await client.query(
      `SELECT id, product_id FROM product_variants WHERE id = $1 AND product_id = $2 FOR UPDATE`,
      [variantId, id]
    );

    if (variantRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(createError(404, "VARIANT_NOT_FOUND", "Product variant not found."));
    }

    await client.query(
      `UPDATE product_variants SET available_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [stock, variantId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully.",
      data: {
        variantId: String(variantId),
        stock: Number(stock),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| CREATE FUNDRAISER
| POST /api/admin/fundraisers
|--------------------------------------------------------------------------
*/
export const createFundraiser = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Name is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO fundraisers (name, description, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [name.trim(), description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Fundraiser created successfully.",
      data: {
        fundraiserId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE TASK
| POST /api/admin/fundraisers/:id/tasks
|--------------------------------------------------------------------------
*/
export const createTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return next(createError(404, "FUNDRAISER_NOT_FOUND", "Fundraiser not found."));
    }

    const { title, description } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Title is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const fundRes = await pool.query(`SELECT id FROM fundraisers WHERE id = $1 LIMIT 1`, [id]);
    if (fundRes.rows.length === 0) {
      return next(createError(404, "FUNDRAISER_NOT_FOUND", "Fundraiser not found."));
    }

    const result = await pool.query(
      `
        INSERT INTO tasks (fundraiser_id, title, description, status, created_by)
        VALUES ($1, $2, $3, 'TODO', $4)
        RETURNING id, status
      `,
      [id, title.trim(), description.trim(), req.user.id]
    );

    const task = result.rows[0];

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: {
        taskId: String(task.id),
        status: task.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ASSIGN TASK
| PATCH /api/admin/tasks/:id/assignment
|--------------------------------------------------------------------------
*/
export const assignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { volunteerId } = req.body;

    if (!isValidUUID(id)) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }
    if (!volunteerId || !isValidUUID(volunteerId)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid volunteerId is required."));
    }

    const taskRes = await pool.query(`SELECT id FROM tasks WHERE id = $1 LIMIT 1`, [id]);
    if (taskRes.rows.length === 0) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }

    const userRes = await pool.query(`SELECT id, role FROM users WHERE id = $1 LIMIT 1`, [volunteerId]);
    if (userRes.rows.length === 0) {
      return next(createError(404, "USER_NOT_FOUND", "Volunteer user not found."));
    }

    if (userRes.rows[0].role !== "volunteer") {
      return next(createError(400, "VALIDATION_ERROR", "User must have volunteer role."));
    }

    await pool.query(
      `UPDATE tasks SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [volunteerId, id]
    );

    return res.status(200).json({
      success: true,
      message: "Task assigned successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN RECORD INCOME
| POST /api/admin/finance/income
|--------------------------------------------------------------------------
*/
export const recordIncome = async (req, res, next) => {
  try {
    const { amount, category, description } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Category is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO finance_transactions (type, amount, category, description, created_by)
        VALUES ('INCOME', $1, $2, $3, $4)
        RETURNING id
      `,
      [amount, category.trim(), description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Income transaction recorded successfully.",
      data: {
        transactionId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN RECORD EXPENSE
| POST /api/admin/finance/expenses
|--------------------------------------------------------------------------
*/
export const recordExpense = async (req, res, next) => {
  try {
    const { amount, category, description } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Category is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO finance_transactions (type, amount, category, description, created_by)
        VALUES ('EXPENSE', $1, $2, $3, $4)
        RETURNING id
      `,
      [amount, category.trim(), description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Expense transaction recorded successfully.",
      data: {
        transactionId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN RECORD REIMBURSEMENT
| POST /api/admin/finance/reimbursements
|--------------------------------------------------------------------------
*/
export const recordReimbursement = async (req, res, next) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !isValidUUID(userId)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid userId is required."));
    }
    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const userRes = await pool.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (userRes.rows.length === 0) {
      return next(createError(404, "USER_NOT_FOUND", "Referenced user not found."));
    }

    const result = await pool.query(
      `
        INSERT INTO reimbursements (user_id, amount, description, status, created_by)
        VALUES ($1, $2, $3, 'RECORDED', $4)
        RETURNING id
      `,
      [userId, amount, description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Reimbursement recorded successfully.",
      data: {
        reimbursementId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN FINANCIAL DASHBOARD
| GET /api/admin/finance/dashboard
|--------------------------------------------------------------------------
*/
export const getAdminFinanceDashboard = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)::numeric AS total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)::numeric AS total_expenses
      FROM finance_transactions
    `);

    const totalIncome = Number(result.rows[0].total_income);
    const totalExpenses = Number(result.rows[0].total_expenses);
    const balance = totalIncome - totalExpenses;

    return res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};
