const BASE_URL = 'http://localhost:5000';

async function testApi() {
  console.log('--- Testing Campus360 Member APIs ---');

  // 1. Authenticate Demo Member
  console.log('\n[1] Testing Authentication: POST /api/auth/login');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.member@campus360.local',
      password: 'Demo@123456',
    }),
  });

  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.data?.token) {
    console.error('Authentication FAILED:', loginRes.status, loginData);
    process.exit(1);
  }

  const token = loginData.data.token;
  console.log('Authentication PASS (HTTP 200, JWT token acquired)');
  console.log(`User: ${loginData.data.user.fullName} (${loginData.data.user.email}, role: ${loginData.data.user.role})`);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const results = [];

  async function checkEndpoint(name, url, method = 'GET', body = null) {
    const opts = { method, headers: authHeaders };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const passed = (res.status === 200 || res.status === 201) && data?.success === true;
    results.push({ name, url, method, status: res.status, passed, data });
    console.log(`${passed ? '✓' : '✗'} ${method} ${url.replace(BASE_URL, '')} -> HTTP ${res.status} (${passed ? 'PASS' : 'FAIL'})`);
    return data;
  }

  // 2. Dashboard
  const dashData = await checkEndpoint('Dashboard', `${BASE_URL}/api/member/dashboard`);
  console.log('   Dashboard Member:', dashData?.data?.member?.name);
  console.log('   Dashboard Membership:', dashData?.data?.membership?.status);
  console.log('   Dashboard Upcoming Events Count:', dashData?.data?.upcomingEvents?.length);
  console.log('   Dashboard Active Tickets Count:', dashData?.data?.activeTickets?.length);
  console.log('   Dashboard Recent Orders Count:', dashData?.data?.recentOrders?.length);
  console.log('   Dashboard Latest Announcements Count:', dashData?.data?.latestAnnouncements?.length);

  // 3. Profile
  await checkEndpoint('Profile', `${BASE_URL}/api/member/profile`);

  // 4. Membership
  await checkEndpoint('Membership', `${BASE_URL}/api/member/membership`);

  // 5. Events List & Details
  const eventsData = await checkEndpoint('Events List', `${BASE_URL}/api/member/events`);
  const firstEventId = eventsData?.data?.events?.[0]?.id;
  if (firstEventId) {
    await checkEndpoint('Event Details', `${BASE_URL}/api/member/events/${firstEventId}`);
  }

  // 6. Tickets List & Details
  const ticketsData = await checkEndpoint('Tickets List', `${BASE_URL}/api/member/tickets`);
  const firstTicketId = ticketsData?.data?.tickets?.[0]?.ticketId;
  if (firstTicketId) {
    await checkEndpoint('Ticket Details', `${BASE_URL}/api/member/tickets/${firstTicketId}`);
  }

  // 7. Products List & Details
  const productsData = await checkEndpoint('Products List', `${BASE_URL}/api/member/products`);
  const firstProductId = productsData?.data?.products?.[0]?.productId;
  if (firstProductId) {
    await checkEndpoint('Product Details', `${BASE_URL}/api/member/products/${firstProductId}`);
  }

  // 8. Orders List & Details
  const ordersData = await checkEndpoint('Orders List', `${BASE_URL}/api/member/orders`);
  const firstOrderId = ordersData?.data?.orders?.[0]?.orderId;
  if (firstOrderId) {
    await checkEndpoint('Order Details', `${BASE_URL}/api/member/orders/${firstOrderId}`);
  }

  // 9. Announcements List & Details
  const annData = await checkEndpoint('Announcements List', `${BASE_URL}/api/member/announcements`);
  const firstAnnId = annData?.data?.announcements?.[0]?.announcementId;
  if (firstAnnId) {
    await checkEndpoint('Announcement Details', `${BASE_URL}/api/member/announcements/${firstAnnId}`);
  }

  // 10. Payments List
  await checkEndpoint('Payments List', `${BASE_URL}/api/member/payments`);

  // Summary
  console.log('\n--- API Verification Summary ---');
  const allPassed = results.every((r) => r.passed);
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length}`);
  console.log(`Failed: ${results.filter((r) => !r.passed).length}`);
  console.log(`Final Status: ${allPassed ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

testApi().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
