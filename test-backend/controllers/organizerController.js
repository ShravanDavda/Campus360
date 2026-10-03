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

// Helper to check event ownership
const getOwnedEvent = async (eventId, userId) => {
  if (!isValidUUID(eventId)) {
    throw createError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  const result = await pool.query(
    `SELECT * FROM events WHERE id = $1 LIMIT 1`,
    [eventId]
  );

  if (result.rows.length === 0) {
    throw createError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  const event = result.rows[0];
  if (event.created_by && String(event.created_by) !== String(userId)) {
    throw createError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return event;
};

/*
|--------------------------------------------------------------------------
| ORGANIZER CREATE EVENT
| POST /api/organizer/events
|--------------------------------------------------------------------------
*/
export const createOrganizerEvent = async (req, res, next) => {
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
| ORGANIZER EDIT EVENT
| PATCH /api/organizer/events/:id
|--------------------------------------------------------------------------
*/
export const editOrganizerEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getOwnedEvent(id, req.user.id);

    const { title, description, date, startTime, endTime, location, capacity } = req.body;

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
| ORGANIZER EVENT STATUS
| PATCH /api/organizer/events/:id/status
|--------------------------------------------------------------------------
*/
export const updateOrganizerEventStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "COMPLETED"];
    if (typeof status !== "string" || !allowed.includes(status.toUpperCase())) {
      return next(createError(400, "VALIDATION_ERROR", `Invalid status. Allowed: ${allowed.join(", ")}`));
    }

    await getOwnedEvent(id, req.user.id);

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
| ORGANIZER EVENT LIST
| GET /api/organizer/events
|--------------------------------------------------------------------------
*/
export const getOrganizerEvents = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
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
        WHERE e.created_by = $1
        GROUP BY e.id
        ORDER BY e.date DESC, e.start_time DESC
      `,
      [req.user.id]
    );

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
| ORGANIZER CREATE TICKET TYPE
| POST /api/organizer/events/:id/ticket-types
|--------------------------------------------------------------------------
*/
export const createOrganizerTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await getOwnedEvent(id, req.user.id);

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

    const result = await pool.query(
      `
        INSERT INTO ticket_types (event_id, name, member_price, non_member_price, available_quantity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [id, name.trim(), memberPrice, nonMemberPrice, event.capacity]
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
| ORGANIZER EDIT TICKET TYPE
| PATCH /api/organizer/events/:id/ticket-types/:ticketTypeId
|--------------------------------------------------------------------------
*/
export const editOrganizerTicketType = async (req, res, next) => {
  try {
    const { id, ticketTypeId } = req.params;
    if (!isValidUUID(ticketTypeId)) {
      return next(createError(404, "TICKET_TYPE_NOT_FOUND", "Ticket type not found."));
    }

    await getOwnedEvent(id, req.user.id);

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
| ORGANIZER EVENT OPERATIONS
| GET /api/organizer/events/:id/operations
|--------------------------------------------------------------------------
*/
export const getOrganizerEventOperations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await getOwnedEvent(id, req.user.id);

    const statsRes = await pool.query(
      `
        SELECT
          COALESCE(SUM(quantity) FILTER (WHERE status != 'CANCELLED' AND status != 'REFUNDED'), 0)::int AS sold,
          COALESCE(SUM(CASE WHEN check_in_status = 'CHECKED_IN' THEN quantity ELSE 0 END), 0)::int AS checked_in,
          COALESCE(SUM(price_paid) FILTER (WHERE status != 'CANCELLED' AND status != 'REFUNDED'), 0)::numeric AS total_revenue
        FROM tickets
        WHERE event_id = $1
      `,
      [id]
    );

    const stats = statsRes.rows[0];
    const sold = stats.sold;
    const remaining = Math.max(0, event.capacity - sold);
    const checkedIn = stats.checked_in;
    const totalRevenue = Number(stats.total_revenue);

    return res.status(200).json({
      success: true,
      data: {
        event: {
          id: String(event.id),
          title: event.title,
          capacity: event.capacity,
          status: event.status,
        },
        tickets: {
          sold,
          remaining,
        },
        attendance: {
          checkedIn,
        },
        revenue: {
          total: totalRevenue,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| ORGANIZER CHECK-IN
| POST /api/organizer/events/:id/check-ins
|--------------------------------------------------------------------------
*/
export const organizerCheckInTicket = async (req, res, next) => {
  const { id } = req.params;
  const { ticketId } = req.body;

  if (!ticketId || !isValidUUID(ticketId)) {
    return next(createError(404, "TICKET_NOT_FOUND", "Valid ticketId is required."));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (!isValidUUID(id)) {
      await client.query("ROLLBACK");
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const eventRes = await client.query(`SELECT id, created_by FROM events WHERE id = $1 LIMIT 1`, [id]);
    if (eventRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(createError(404, "EVENT_NOT_FOUND", "Event not found."));
    }

    const event = eventRes.rows[0];
    if (event.created_by && String(event.created_by) !== String(req.user.id)) {
      await client.query("ROLLBACK");
      return next(createError(403, "FORBIDDEN", "You do not have permission to perform this action."));
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
