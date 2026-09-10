import assert from 'node:assert/strict';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:5051').replace(/\/$/, '');
const parsedBaseUrl = new URL(baseUrl);
const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
const isLocalPreview = localHosts.has(parsedBaseUrl.hostname);
const remoteOptIn = process.argv.includes('--allow-remote');

if (!isLocalPreview && !remoteOptIn) {
  throw new Error('Refusing to mutate a non-local Worker. Pass --allow-remote explicitly.');
}
if (
  !isLocalPreview &&
  (!process.env.SMOKE_ADMIN_USERNAME || !process.env.SMOKE_ADMIN_PASSWORD)
) {
  throw new Error('Remote smoke tests require explicit SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD.');
}

const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'admin123';
const cameraFrame = `data:image/jpeg;base64,${Buffer.from('FireSighter smoke camera frame').toString('base64')}`;

let cookie = '';
let createdId = '';

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // A static HTML response is expected for the shell check.
  }
  return { response, payload, text };
}

async function jsonRequest(pathname, method, body) {
  return request(pathname, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

try {
  const shell = await request('/');
  assert.equal(shell.response.status, 200);
  assert.match(shell.text, /FireSighter/i);
  assert.equal(shell.response.headers.get('x-content-type-options'), 'nosniff');

  const analyticsBefore = await request('/api/analytics');
  assert.equal(analyticsBefore.response.status, 200);
  assert.equal(analyticsBefore.payload.totals.reports, 10);

  const login = await jsonRequest('/api/admin/login', 'POST', {
    username: adminUsername,
    password: adminPassword,
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.payload.authenticated, true);
  const setCookie = login.response.headers.get('set-cookie');
  assert.ok(setCookie);
  cookie = setCookie.split(';', 1)[0];

  const created = await jsonRequest('/api/reports', 'POST', {
    firstName: 'Smoke',
    lastName: 'Test',
    address: 'Local Worker smoke-test location, Manila',
    city: 'Manila',
    locationDescription: 'Temporary automated report removed before the smoke test exits.',
    lat: 14.5995,
    lng: 120.9842,
    photo: cameraFrame,
    capturedAt: new Date().toISOString(),
    id: 'client-cannot-control-this',
    status: 'verified',
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.report.status, 'pending');
  assert.notEqual(created.payload.report.id, 'client-cannot-control-this');
  createdId = created.payload.report.id;

  const adminReports = await request('/api/admin/reports');
  assert.equal(adminReports.response.status, 200);
  assert.equal(adminReports.payload.count, 11);
  assert.equal(adminReports.payload.reports[0].id, createdId);

  const verified = await jsonRequest(
    `/api/admin/reports/${encodeURIComponent(createdId)}/verify`,
    'PATCH',
    { fireType: 'forest fire' },
  );
  assert.equal(verified.response.status, 200);
  assert.equal(verified.payload.report.fireType, 'forest');

  const publicLogout = await request('/api/admin/logout', { method: 'POST' });
  assert.equal(publicLogout.response.status, 200);
  cookie = '';
  const incident = await request(`/api/incidents/${encodeURIComponent(createdId)}`);
  assert.equal(incident.response.status, 200);
  assert.equal(incident.payload.incident.id, createdId);

  const evidence = await request(`/api/evidence/${encodeURIComponent(createdId)}`);
  assert.equal(evidence.response.status, 200);
  assert.match(evidence.response.headers.get('content-type') || '', /^image\/jpeg/i);

  const unknownApi = await request('/api/not-a-real-route');
  assert.equal(unknownApi.response.status, 404);
  assert.equal(unknownApi.payload.error, 'api_route_not_found');

  const relogin = await jsonRequest('/api/admin/login', 'POST', {
    username: adminUsername,
    password: adminPassword,
  });
  assert.equal(relogin.response.status, 200);
  cookie = relogin.response.headers.get('set-cookie').split(';', 1)[0];

  const deleted = await request(`/api/admin/reports/${encodeURIComponent(createdId)}`, {
    method: 'DELETE',
  });
  assert.equal(deleted.response.status, 200);
  createdId = '';

  const analyticsAfter = await request('/api/analytics');
  assert.equal(analyticsAfter.response.status, 200);
  assert.equal(analyticsAfter.payload.totals.reports, 10);

  const logout = await request('/api/admin/logout', { method: 'POST' });
  assert.equal(logout.response.status, 200);
  assert.equal(logout.payload.authenticated, false);

  console.log('Worker smoke test passed: static shell, reports, auth, verification, evidence, analytics, deletion, and JSON 404.');
} finally {
  if (createdId) {
    if (!cookie) {
      const cleanupLogin = await jsonRequest('/api/admin/login', 'POST', {
        username: adminUsername,
        password: adminPassword,
      });
      const cleanupCookie = cleanupLogin.response.headers.get('set-cookie');
      if (cleanupLogin.response.ok && cleanupCookie) {
        cookie = cleanupCookie.split(';', 1)[0];
      }
    }
    assert.ok(cookie, 'A cleanup admin session is required to remove the smoke report.');
    await request(`/api/admin/reports/${encodeURIComponent(createdId)}`, { method: 'DELETE' });
  }
}
