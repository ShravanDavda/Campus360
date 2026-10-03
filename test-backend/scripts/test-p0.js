process.env.NODE_ENV = "test";

import pool from "../config/db.js";
import app from "../server.js";
import jwt from "jsonwebtoken";

const PASS = "Demo@123456";

let server;
let BASE_URL;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, name, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${name}`);
  } else {
    failedCount++;
    console.error(`  ✗ ${name} FAIL ${details}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING P0 BACKEND INTEGRATION & CONTRACT TESTS");
  console.log("==================================================");

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://localhost:${port}`;
      console.log(`Test server running at ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    console.log("\n--- [1] Authentication & Tokens ---");

    // Login Admin
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "demo.admin@campus360.local", password: PASS },
    });
    assert(adminLogin.status === 200, "Admin login HTTP 200");
    const adminToken = adminLogin.data?.data?.token;
    assert(!!adminToken, "Admin token received");

    // Login Organizer
    const orgLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "demo.organizer@campus360.local", password: PASS },
    });
    assert(orgLogin.status === 200, "Organizer login HTTP 200");
    const orgToken = orgLogin.data?.data?.token;

    // Login Treasurer
    const treasLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "demo.treasurer@campus360.local", password: PASS },
    });
    assert(treasLogin.status === 200, "Treasurer login HTTP 200");
    const treasToken = treasLogin.data?.data?.token;

    // Login Volunteer
    const volLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "demo.member@campus360.local", password: PASS },
    });
    assert(volLogin.status === 200, "Volunteer login HTTP 200");
    const volToken = volLogin.data?.data?.token;
    const volUserId = volLogin.data?.data?.user?.id;

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const orgHeaders = { Authorization: `Bearer ${orgToken}` };
    const treasHeaders = { Authorization: `Bearer ${treasToken}` };
    const volHeaders = { Authorization: `Bearer ${volToken}` };

    // Missing token
    const noTokenRes = await request("/api/admin/dashboard");
    assert(noTokenRes.status === 401, "Missing token returns 401");
    assert(noTokenRes.data?.error?.code === "UNAUTHORIZED", "Missing token error code is UNAUTHORIZED");
    assert(noTokenRes.data?.error?.message === "Authentication is required.", "Contract error message for unauthorized");

    // Invalid token
    const badTokenRes = await request("/api/admin/dashboard", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    assert(badTokenRes.status === 401, "Invalid token returns 401");

    // Inactive account check
    // Create temporary inactive user
    const inactiveUserRes = await pool.query(`
      INSERT INTO users (id, full_name, email, password_hash, phone_number, role, status)
      VALUES (gen_random_uuid(), 'Inactive User', 'inactive@campus360.local', 'hash', '9999999999', 'volunteer', 'inactive')
      RETURNING id
    `);
    const inactiveUserId = inactiveUserRes.rows[0].id;
    const inactiveToken = jwt.sign(
      { sub: String(inactiveUserId), role: "volunteer", status: "inactive" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const inactiveRes = await request("/api/volunteer/tasks", {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    assert(inactiveRes.status === 403, "Inactive account returns 403");
    assert(inactiveRes.data?.error?.code === "ACCOUNT_INACTIVE", "Inactive error code is ACCOUNT_INACTIVE");
    assert(inactiveRes.data?.error?.message === "Your account is not active.", "Inactive error message exact match");

    // Clean up temporary inactive user
    await pool.query(`DELETE FROM users WHERE id = $1`, [inactiveUserId]);

    // ----------------------------------------------------
    // RBAC AUTHORIZATION
    // ----------------------------------------------------
    console.log("\n--- [2] RBAC Authorization ---");

    // Non-admin accessing admin endpoint
    const volOnAdmin = await request("/api/admin/dashboard", { headers: volHeaders });
    assert(volOnAdmin.status === 403, "Volunteer accessing admin endpoint returns 403");
    assert(volOnAdmin.data?.error?.code === "FORBIDDEN", "Wrong role error code is FORBIDDEN");
    assert(volOnAdmin.data?.error?.message === "You do not have permission to perform this action.", "Forbidden error message exact match");

    // Volunteer accessing organizer endpoint
    const volOnOrg = await request("/api/organizer/events", { headers: volHeaders });
    assert(volOnOrg.status === 403, "Volunteer accessing organizer endpoint returns 403");

    // Organizer accessing volunteer endpoint
    const orgOnVol = await request("/api/volunteer/tasks", { headers: orgHeaders });
    assert(orgOnVol.status === 403, "Organizer accessing volunteer endpoint returns 403");

    // Organizer accessing treasurer endpoint
    const orgOnTreas = await request("/api/treasurer/dashboard", { headers: orgHeaders });
    assert(orgOnTreas.status === 403, "Organizer accessing treasurer endpoint returns 403");

    // ----------------------------------------------------
    // ADMIN ENDPOINTS
    // ----------------------------------------------------
    console.log("\n--- [3] Admin Endpoints ---");

    // GET /api/admin/dashboard
    const adminDash = await request("/api/admin/dashboard", { headers: adminHeaders });
    assert(adminDash.status === 200, "GET /api/admin/dashboard HTTP 200");
    assert(typeof adminDash.data?.data?.members?.total === "number", "Dashboard members.total is number");
    assert(typeof adminDash.data?.data?.events?.total === "number", "Dashboard events.total is number");
    assert(typeof adminDash.data?.data?.tickets?.sold === "number", "Dashboard tickets.sold is number");
    assert(typeof adminDash.data?.data?.merchandise?.products === "number", "Dashboard merchandise.products is number");
    assert(typeof adminDash.data?.data?.volunteers?.tasks === "number", "Dashboard volunteers.tasks is number");
    assert(typeof adminDash.data?.data?.finance?.balance === "number", "Dashboard finance.balance is number");

    // GET /api/admin/members
    const membersList = await request("/api/admin/members?page=1&limit=5", { headers: adminHeaders });
    assert(membersList.status === 200, "GET /api/admin/members HTTP 200");
    assert(Array.isArray(membersList.data?.data?.members), "Members array returned");
    assert(typeof membersList.data?.data?.pagination?.totalPages === "number", "Pagination totalPages is number");

    // GET /api/admin/members/:id
    const memberView = await request(`/api/admin/members/${volUserId}`, { headers: adminHeaders });
    assert(memberView.status === 200, "GET /api/admin/members/:id HTTP 200");
    assert(memberView.data?.data?.fullName === "Demo Member", "Member fullName matches");
    assert(memberView.data?.data?.role === "volunteer", "Member role matches");

    // PATCH /api/admin/members/:id/status (activation)
    // Create a pending member first with unique email & phone
    const pendingSuffix = Math.floor(100000 + Math.random() * 900000);
    const pendingMemberRes = await pool.query(
      `
        INSERT INTO users (id, full_name, email, password_hash, phone_number, role, status)
        VALUES (gen_random_uuid(), 'Pending Member', $1, 'hash', $2, 'volunteer', 'pending')
        RETURNING id
      `,
      [`pending.${pendingSuffix}@campus360.local`, `91${pendingSuffix}00`]
    );
    const pendingId = pendingMemberRes.rows[0].id;

    const activateRes = await request(`/api/admin/members/${pendingId}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { status: "active" },
    });
    assert(activateRes.status === 200, "Activate member returns HTTP 200");
    assert(activateRes.data?.message === "Member account activated.", "Activation success message match");

    // Re-activating active member should fail with 409 INVALID_STATUS_TRANSITION
    const reactivateRes = await request(`/api/admin/members/${pendingId}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { status: "active" },
    });
    assert(reactivateRes.status === 409, "Re-activation of already active member returns 409");
    assert(reactivateRes.data?.error?.code === "INVALID_STATUS_TRANSITION", "Error code INVALID_STATUS_TRANSITION");

    // POST /api/admin/events
    const createEventRes = await request("/api/admin/events", {
      method: "POST",
      headers: adminHeaders,
      body: {
        title: "Annual Tech Fest",
        description: "Annual student organization event.",
        date: "2026-11-15",
        startTime: "10:00",
        endTime: "17:00",
        location: "Main Auditorium",
        capacity: 500,
      },
    });
    assert(createEventRes.status === 201, "Create event HTTP 201");
    assert(createEventRes.data?.data?.status === "DRAFT", "New event status is DRAFT");
    const adminEventId = createEventRes.data?.data?.eventId;

    // PATCH /api/admin/events/:id
    const editEventRes = await request(`/api/admin/events/${adminEventId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: {
        title: "Annual Tech Fest Updated",
        description: "Updated description.",
        date: "2026-11-15",
        startTime: "10:00",
        endTime: "18:00",
        location: "Main Auditorium",
        capacity: 500,
      },
    });
    assert(editEventRes.status === 200, "Edit event HTTP 200");
    assert(editEventRes.data?.message === "Event updated successfully.", "Edit event message match");

    // PATCH /api/admin/events/:id/status
    const statusEventRes = await request(`/api/admin/events/${adminEventId}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { status: "PUBLISHED" },
    });
    assert(statusEventRes.status === 200, "Update event status HTTP 200");

    // GET /api/admin/events
    const adminEventsRes = await request("/api/admin/events", { headers: adminHeaders });
    assert(adminEventsRes.status === 200, "GET /api/admin/events HTTP 200");
    const foundAdminEvent = adminEventsRes.data?.data?.events?.find((e) => e.id === adminEventId);
    assert(!!foundAdminEvent, "Created event present in list");
    assert(foundAdminEvent?.soldTickets === 0, "Initial soldTickets is 0");
    assert(foundAdminEvent?.remainingCapacity === 500, "Initial remainingCapacity is 500");

    // POST /api/admin/events/:id/ticket-types
    const createTTRes = await request(`/api/admin/events/${adminEventId}/ticket-types`, {
      method: "POST",
      headers: adminHeaders,
      body: {
        name: "General",
        memberPrice: 100,
        nonMemberPrice: 150,
      },
    });
    assert(createTTRes.status === 201, "Create ticket type HTTP 201");
    const adminTicketTypeId = createTTRes.data?.data?.ticketTypeId;
    assert(!!adminTicketTypeId, "ticketTypeId returned");

    // PATCH /api/admin/events/:id/ticket-types/:ticketTypeId
    const editTTRes = await request(`/api/admin/events/${adminEventId}/ticket-types/${adminTicketTypeId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: {
        name: "General Updated",
        memberPrice: 120,
        nonMemberPrice: 180,
      },
    });
    assert(editTTRes.status === 200, "Edit ticket type HTTP 200");

    // POST /api/admin/products
    const createProdRes = await request("/api/admin/products", {
      method: "POST",
      headers: adminHeaders,
      body: {
        name: "Club Hoodie",
        description: "Official organization hoodie.",
      },
    });
    assert(createProdRes.status === 201, "Create product HTTP 201");
    const prodId = createProdRes.data?.data?.productId;

    // POST /api/admin/products/:id/variants
    const createVarRes = await request(`/api/admin/products/${prodId}/variants`, {
      method: "POST",
      headers: adminHeaders,
      body: {
        name: "Medium",
        price: 800,
        stock: 20,
      },
    });
    assert(createVarRes.status === 201, "Create product variant HTTP 201");
    const varId = createVarRes.data?.data?.variantId;

    // PATCH /api/admin/products/:id/variants/:variantId/inventory
    const updateInvRes = await request(`/api/admin/products/${prodId}/variants/${varId}/inventory`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { stock: 25 },
    });
    assert(updateInvRes.status === 200, "Update inventory HTTP 200");
    assert(updateInvRes.data?.data?.stock === 25, "Updated stock is 25");

    // POST /api/admin/fundraisers
    const createFundRes = await request("/api/admin/fundraisers", {
      method: "POST",
      headers: adminHeaders,
      body: {
        name: "Bake Sale",
        description: "Fundraiser for the annual event.",
      },
    });
    assert(createFundRes.status === 201, "Create fundraiser HTTP 201");
    const fundraiserId = createFundRes.data?.data?.fundraiserId;

    // POST /api/admin/fundraisers/:id/tasks
    const createTaskRes = await request(`/api/admin/fundraisers/${fundraiserId}/tasks`, {
      method: "POST",
      headers: adminHeaders,
      body: {
        title: "Buy ingredients",
        description: "Purchase ingredients for the bake sale.",
      },
    });
    assert(createTaskRes.status === 201, "Create task HTTP 201");
    assert(createTaskRes.data?.data?.status === "TODO", "Task initial status is TODO");
    const taskId = createTaskRes.data?.data?.taskId;

    // PATCH /api/admin/tasks/:id/assignment
    const assignTaskRes = await request(`/api/admin/tasks/${taskId}/assignment`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { volunteerId: volUserId },
    });
    assert(assignTaskRes.status === 200, "Assign task HTTP 200");

    // Finance: Income, Expense, Reimbursement, Dashboard
    const incRes = await request("/api/admin/finance/income", {
      method: "POST",
      headers: adminHeaders,
      body: {
        amount: 5000,
        category: "EVENT_TICKET",
        description: "Annual Tech Fest ticket sales",
      },
    });
    assert(incRes.status === 201, "Admin record income HTTP 201");
    const adminIncomeTxId = incRes.data?.data?.transactionId;

    const expRes = await request("/api/admin/finance/expenses", {
      method: "POST",
      headers: adminHeaders,
      body: {
        amount: 2500,
        category: "EVENT_EXPENSE",
        description: "Event decoration expenses",
      },
    });
    assert(expRes.status === 201, "Admin record expense HTTP 201");

    const reimbRes = await request("/api/admin/finance/reimbursements", {
      method: "POST",
      headers: adminHeaders,
      body: {
        userId: volUserId,
        amount: 1000,
        description: "Reimbursement for fundraiser supplies",
      },
    });
    assert(reimbRes.status === 201, "Admin record reimbursement HTTP 201");

    const finDash = await request("/api/admin/finance/dashboard", { headers: adminHeaders });
    assert(finDash.status === 200, "Admin finance dashboard HTTP 200");
    assert(finDash.data?.data?.totalIncome >= 5000, "Total income >= 5000");
    assert(finDash.data?.data?.totalExpenses >= 2500, "Total expenses >= 2500");
    assert(
      finDash.data?.data?.balance === finDash.data?.data?.totalIncome - finDash.data?.data?.totalExpenses,
      "balance = totalIncome - totalExpenses"
    );

    // ----------------------------------------------------
    // CHECK-IN & CONCURRENCY
    // ----------------------------------------------------
    console.log("\n--- [4] Check-in Workflow & Concurrency ---");

    // Create a ticket for the admin event
    const ticketRes = await pool.query(
      `
        INSERT INTO tickets (id, user_id, event_id, ticket_type_id, quantity, price_paid, status, check_in_status)
        VALUES (gen_random_uuid(), $1, $2, $3, 1, 120, 'ACTIVE', 'NOT_CHECKED_IN')
        RETURNING id
      `,
      [volUserId, adminEventId, adminTicketTypeId]
    );
    const testTicketId = ticketRes.rows[0].id;

    // Check-in with wrong event -> 409 CONFLICT
    const wrongEventRes = await request(`/api/admin/events/${fundraiserId}/check-ins`, {
      method: "POST",
      headers: adminHeaders,
      body: { ticketId: testTicketId },
    });
    assert(wrongEventRes.status === 409 || wrongEventRes.status === 404, "Wrong event check-in returns 409/404");

    // Check-in valid ticket -> 201
    const checkInRes = await request(`/api/admin/events/${adminEventId}/check-ins`, {
      method: "POST",
      headers: adminHeaders,
      body: { ticketId: testTicketId },
    });
    assert(checkInRes.status === 201, "Valid check-in returns HTTP 201");
    assert(checkInRes.data?.data?.ticketId === String(testTicketId), "Check-in data contains ticketId");

    // Duplicate check-in -> 409 CONFLICT
    const dupCheckInRes = await request(`/api/admin/events/${adminEventId}/check-ins`, {
      method: "POST",
      headers: adminHeaders,
      body: { ticketId: testTicketId },
    });
    assert(dupCheckInRes.status === 409, "Duplicate check-in returns HTTP 409");
    assert(dupCheckInRes.data?.error?.code === "CONFLICT", "Duplicate check-in code CONFLICT");

    // Concurrency test: create another ticket and run parallel check-ins
    const ticketRes2 = await pool.query(
      `
        INSERT INTO tickets (id, user_id, event_id, ticket_type_id, quantity, price_paid, status, check_in_status)
        VALUES (gen_random_uuid(), $1, $2, $3, 1, 120, 'ACTIVE', 'NOT_CHECKED_IN')
        RETURNING id
      `,
      [volUserId, adminEventId, adminTicketTypeId]
    );
    const concurrentTicketId = ticketRes2.rows[0].id;

    const [c1, c2, c3] = await Promise.all([
      request(`/api/admin/events/${adminEventId}/check-ins`, {
        method: "POST",
        headers: adminHeaders,
        body: { ticketId: concurrentTicketId },
      }),
      request(`/api/admin/events/${adminEventId}/check-ins`, {
        method: "POST",
        headers: adminHeaders,
        body: { ticketId: concurrentTicketId },
      }),
      request(`/api/admin/events/${adminEventId}/check-ins`, {
        method: "POST",
        headers: adminHeaders,
        body: { ticketId: concurrentTicketId },
      }),
    ]);

    const successes = [c1, c2, c3].filter((r) => r.status === 201);
    const conflicts = [c1, c2, c3].filter((r) => r.status === 409);
    assert(successes.length === 1, "Exactly one concurrent check-in succeeded (201)");
    assert(conflicts.length === 2, "Other concurrent check-ins received 409 CONFLICT");

    // ----------------------------------------------------
    // ORGANIZER ENDPOINTS & OWNERSHIP
    // ----------------------------------------------------
    console.log("\n--- [5] Organizer Endpoints & Ownership ---");

    // Organizer creates event
    const orgEventRes = await request("/api/organizer/events", {
      method: "POST",
      headers: orgHeaders,
      body: {
        title: "Organizer Tech Meetup",
        description: "Organized by Demo Organizer.",
        date: "2026-11-20",
        startTime: "14:00",
        endTime: "18:00",
        location: "Room 101",
        capacity: 100,
      },
    });
    assert(orgEventRes.status === 201, "Organizer create event HTTP 201");
    const orgEventId = orgEventRes.data?.data?.eventId;

    // Organizer lists own events
    const orgEventsList = await request("/api/organizer/events", { headers: orgHeaders });
    assert(orgEventsList.status === 200, "Organizer get events HTTP 200");
    const foundOrgEvent = orgEventsList.data?.data?.events?.find((e) => e.id === orgEventId);
    assert(!!foundOrgEvent, "Organizer event found in list");

    // Organizer updates event status
    const orgStatusRes = await request(`/api/organizer/events/${orgEventId}/status`, {
      method: "PATCH",
      headers: orgHeaders,
      body: { status: "PUBLISHED" },
    });
    assert(orgStatusRes.status === 200, "Organizer update status HTTP 200");

    // Organizer ticket type
    const orgTTRes = await request(`/api/organizer/events/${orgEventId}/ticket-types`, {
      method: "POST",
      headers: orgHeaders,
      body: {
        name: "Standard",
        memberPrice: 50,
        nonMemberPrice: 75,
      },
    });
    assert(orgTTRes.status === 201, "Organizer create ticket type HTTP 201");
    const orgTTId = orgTTRes.data?.data?.ticketTypeId;

    // Organizer event operations
    const orgOpsRes = await request(`/api/organizer/events/${orgEventId}/operations`, {
      headers: orgHeaders,
    });
    assert(orgOpsRes.status === 200, "Organizer event operations HTTP 200");
    assert(orgOpsRes.data?.data?.event?.id === orgEventId, "Event operations id matches");
    assert(typeof orgOpsRes.data?.data?.tickets?.sold === "number", "Operations sold is number");
    assert(typeof orgOpsRes.data?.data?.attendance?.checkedIn === "number", "Operations checkedIn is number");
    assert(typeof orgOpsRes.data?.data?.revenue?.total === "number", "Operations revenue is number");

    // Organizer ownership rejection: Organizer trying to edit Admin's event
    const hijackRes = await request(`/api/organizer/events/${adminEventId}`, {
      method: "PATCH",
      headers: orgHeaders,
      body: { title: "Hijacked Title" },
    });
    assert(hijackRes.status === 403, "Organizer modifying another's event rejected with 403 FORBIDDEN");

    // ----------------------------------------------------
    // VOLUNTEER ENDPOINTS & ISOLATION
    // ----------------------------------------------------
    console.log("\n--- [6] Volunteer Endpoints & Isolation ---");

    // List assigned tasks
    const volTasksRes = await request("/api/volunteer/tasks", { headers: volHeaders });
    assert(volTasksRes.status === 200, "Volunteer GET tasks HTTP 200");
    assert(Array.isArray(volTasksRes.data?.data?.tasks), "Tasks array returned");
    const assignedTask = volTasksRes.data?.data?.tasks?.find((t) => t.id === taskId);
    assert(!!assignedTask, "Assigned task is present in volunteer tasks");

    // View task by ID
    const volTaskView = await request(`/api/volunteer/tasks/${taskId}`, { headers: volHeaders });
    assert(volTaskView.status === 200, "Volunteer GET task by ID HTTP 200");
    assert(volTaskView.data?.data?.title === "Buy ingredients", "Task title matches");

    // Volunteer update task status
    const updateTaskRes = await request(`/api/volunteer/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: volHeaders,
      body: { status: "IN_PROGRESS" },
    });
    assert(updateTaskRes.status === 200, "Volunteer update task status HTTP 200");

    // Volunteer fundraisers list
    const volFundRes = await request("/api/volunteer/fundraisers", { headers: volHeaders });
    assert(volFundRes.status === 200, "Volunteer GET fundraisers HTTP 200");
    const foundFund = volFundRes.data?.data?.fundraisers?.find((f) => f.id === fundraiserId);
    assert(!!foundFund, "Fundraiser with assigned task is present in volunteer fundraisers");

    // Create task assigned to someone else and verify volunteer cannot access it
    const otherSuffix = Math.floor(100000 + Math.random() * 900000);
    const otherVolRes = await pool.query(
      `
        INSERT INTO users (id, full_name, email, password_hash, phone_number, role, status)
        VALUES (gen_random_uuid(), 'Other Volunteer', $1, 'hash', $2, 'volunteer', 'active')
        RETURNING id
      `,
      [`other.${otherSuffix}@campus360.local`, `92${otherSuffix}00`]
    );
    const otherVolId = otherVolRes.rows[0].id;

    const otherTaskRes = await pool.query(
      `
        INSERT INTO tasks (fundraiser_id, title, description, status, assigned_to)
        VALUES ($1, 'Private Task', 'For someone else', 'TODO', $2)
        RETURNING id
      `,
      [fundraiserId, otherVolId]
    );
    const otherTaskId = otherTaskRes.rows[0].id;

    const accessDeniedTask = await request(`/api/volunteer/tasks/${otherTaskId}`, { headers: volHeaders });
    assert(accessDeniedTask.status === 403, "Access to another volunteer's task returns 403 FORBIDDEN");

    const updateDeniedTask = await request(`/api/volunteer/tasks/${otherTaskId}/status`, {
      method: "PATCH",
      headers: volHeaders,
      body: { status: "DONE" },
    });
    assert(updateDeniedTask.status === 403, "Updating another volunteer's task returns 403 FORBIDDEN");

    // ----------------------------------------------------
    // TREASURER ENDPOINTS
    // ----------------------------------------------------
    console.log("\n--- [7] Treasurer Endpoints ---");

    // Dashboard
    const tDash = await request("/api/treasurer/dashboard", { headers: treasHeaders });
    assert(tDash.status === 200, "Treasurer dashboard HTTP 200");
    assert(typeof tDash.data?.data?.balance === "number", "Treasurer balance is number");

    // Record income
    const tInc = await request("/api/treasurer/finance/income", {
      method: "POST",
      headers: treasHeaders,
      body: {
        amount: 3000,
        category: "SPONSORSHIP",
        description: "Hackathon title sponsorship",
      },
    });
    assert(tInc.status === 201, "Treasurer record income HTTP 201");
    const tIncomeId = tInc.data?.data?.transactionId;

    // List income
    const tIncList = await request("/api/treasurer/finance/income", { headers: treasHeaders });
    assert(tIncList.status === 200, "Treasurer list income HTTP 200");
    const foundIncome = tIncList.data?.data?.transactions?.find((t) => t.id === tIncomeId);
    assert(!!foundIncome, "Recorded income found in listing");

    // Record expense
    const tExp = await request("/api/treasurer/finance/expenses", {
      method: "POST",
      headers: treasHeaders,
      body: {
        amount: 1500,
        category: "LOGISTICS",
        description: "Venue sound system rental",
      },
    });
    assert(tExp.status === 201, "Treasurer record expense HTTP 201");
    const tExpenseId = tExp.data?.data?.transactionId;

    // List expenses
    const tExpList = await request("/api/treasurer/finance/expenses", { headers: treasHeaders });
    assert(tExpList.status === 200, "Treasurer list expenses HTTP 200");
    const foundExpense = tExpList.data?.data?.transactions?.find((t) => t.id === tExpenseId);
    assert(!!foundExpense, "Recorded expense found in listing");

    // Record reimbursement
    const tReimb = await request("/api/treasurer/finance/reimbursements", {
      method: "POST",
      headers: treasHeaders,
      body: {
        userId: volUserId,
        amount: 450,
        description: "Snacks reimbursement",
      },
    });
    assert(tReimb.status === 201, "Treasurer record reimbursement HTTP 201");
    const tReimbId = tReimb.data?.data?.reimbursementId;

    // List reimbursements
    const tReimbList = await request("/api/treasurer/finance/reimbursements", { headers: treasHeaders });
    assert(tReimbList.status === 200, "Treasurer list reimbursements HTTP 200");
    const foundReimb = tReimbList.data?.data?.reimbursements?.find((r) => r.id === tReimbId);
    assert(!!foundReimb, "Recorded reimbursement found in listing");

    // Get transaction by ID
    const tTxRes = await request(`/api/treasurer/finance/transactions/${tIncomeId}`, { headers: treasHeaders });
    assert(tTxRes.status === 200, "Treasurer GET transaction by ID HTTP 200");
    assert(tTxRes.data?.data?.id === tIncomeId, "Transaction ID matches");
    assert(tTxRes.data?.data?.type === "INCOME", "Transaction type is INCOME");
    assert(tTxRes.data?.data?.amount === 3000, "Transaction amount is 3000");

    // ----------------------------------------------------
    // CLEANUP & SUMMARY
    // ----------------------------------------------------
    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with unhandled error:", err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
}

runTests();
