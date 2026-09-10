'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const test = require('node:test');

const { aggregateAnalytics, createApp } = require('../backend/server');
const {
  DEMO_SEED_PREFIX,
  buildDemoReports,
  seedDemoData,
} = require('../scripts/seed-demo-data');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const CAMERA_PHOTO = `data:image/jpeg;base64,${Buffer.from('camera frame').toString('base64')}`;

async function startTestServer(options = {}) {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'firesighter-test-'));
  const app = createApp({
    dataFile: path.join(temporaryDirectory, 'reports.json'),
    publicDir: FRONTEND_DIR,
    adminUsername: 'test-admin',
    adminPassword: 'test-password',
    secureCookies: false,
    logger: { error() {} },
    ...options,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    },
  };
}

async function request(context, pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body !== undefined && typeof body !== 'string' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${context.baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body,
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return { response, payload, text };
}

function reportPayload(overrides = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    address: '100 Ember Street, Manila',
    city: 'Manila',
    locationDescription: 'Across from the barangay hall.',
    lat: 14.5995,
    lng: 120.9842,
    photo: CAMERA_PHOTO,
    capturedAt: '2026-09-09T01:02:03.000Z',
    ...overrides,
  };
}

async function login(context) {
  const result = await request(context, '/api/admin/login', {
    method: 'POST',
    body: { username: 'test-admin', password: 'test-password' },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.authenticated, true);
  const setCookie = result.response.headers.get('set-cookie');
  assert.ok(setCookie, 'login should set an admin session cookie');
  return { cookie: setCookie.split(';', 1)[0], setCookie };
}

test('validates camera reports and stamps trusted submission fields on the server', async (t) => {
  const submittedAt = new Date('2026-09-09T04:05:06.000Z');
  const context = await startTestServer({
    now: () => new Date(submittedAt),
    idGenerator: () => 'report-server-id',
  });
  t.after(() => context.close());

  const wrongMediaType = await request(context, '/api/reports', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify(reportPayload()),
  });
  assert.equal(wrongMediaType.response.status, 415);
  assert.equal(wrongMediaType.payload.error, 'unsupported_media_type');

  const malformedJson = await request(context, '/api/reports', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not valid json',
  });
  assert.equal(malformedJson.response.status, 400);
  assert.equal(malformedJson.payload.error, 'invalid_json');

  const missingFields = await request(context, '/api/reports', {
    method: 'POST',
    body: {},
  });
  assert.equal(missingFields.response.status, 400);
  assert.equal(missingFields.payload.error, 'validation_error');
  assert.deepEqual(
    new Set(missingFields.payload.details.map(({ field }) => field)),
    new Set([
      'firstName',
      'lastName',
      'address',
      'city',
      'locationDescription',
      'lat',
      'lng',
      'photo',
      'capturedAt',
    ]),
  );

  const invalidLocationText = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({
      city: 'C'.repeat(121),
      locationDescription: 'L'.repeat(601),
    }),
  });
  assert.equal(invalidLocationText.response.status, 400);
  assert.deepEqual(
    new Set(invalidLocationText.payload.details.map(({ field }) => field)),
    new Set(['city', 'locationDescription']),
  );

  const fileUploadInsteadOfCameraFrame = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({ photo: 'https://example.test/uploaded-fire.jpg' }),
  });
  assert.equal(fileUploadInsteadOfCameraFrame.response.status, 400);
  assert.ok(
    fileUploadInsteadOfCameraFrame.payload.details.some(({ field }) => field === 'photo'),
  );

  const created = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
      city: '  Manila  ',
      locationDescription: '  Across from the barangay hall.  ',
      lat: '14.5995',
      lng: '120.9842',
      id: 'client-controlled-id',
      status: 'verified',
      fireType: 'commercial',
      submittedAt: '1999-01-01T00:00:00.000Z',
    }),
  });

  assert.equal(created.response.status, 201);
  assert.match(created.payload.message, /submitted/i);
  assert.deepEqual(
    {
      id: created.payload.report.id,
      firstName: created.payload.report.firstName,
      lastName: created.payload.report.lastName,
      city: created.payload.report.city,
      locationDescription: created.payload.report.locationDescription,
      lat: created.payload.report.lat,
      lng: created.payload.report.lng,
      submittedAt: created.payload.report.submittedAt,
      status: created.payload.report.status,
      fireType: created.payload.report.fireType,
    },
    {
      id: 'report-server-id',
      firstName: 'Ada',
      lastName: 'Lovelace',
      city: 'Manila',
      locationDescription: 'Across from the barangay hall.',
      lat: 14.5995,
      lng: 120.9842,
      submittedAt: submittedAt.toISOString(),
      status: 'pending',
      fireType: null,
    },
  );
  assert.equal(created.payload.report.capturedAt, '2026-09-09T01:02:03.000Z');
});

test('enforces admin auth across report verification, deletion, incidents, and analytics', async (t) => {
  let currentTime = new Date('2026-08-20T08:00:00.000Z');
  let nextId = 0;
  const context = await startTestServer({
    now: () => new Date(currentTime),
    idGenerator: () => `report-${++nextId}`,
  });
  t.after(() => context.close());

  const first = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({
      firstName: 'Alice',
      lastName: 'Santos',
      address: 'Alpha Road, Manila',
      city: 'Manila',
      locationDescription: 'Beside engine bay seven.',
      lat: 14.6,
      lng: 120.98,
      capturedAt: '2026-08-20T07:59:00.000Z',
    }),
  });
  assert.equal(first.response.status, 201);

  currentTime = new Date('2026-09-05T10:30:00.000Z');
  const second = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({
      firstName: 'Ben',
      lastName: 'Reyes',
      address: 'Bravo Avenue, Quezon City',
      city: 'Quezon City',
      locationDescription: 'Warehouse gate with a red awning.',
      lat: 14.676,
      lng: 121.0437,
      capturedAt: '2026-09-05T10:29:00.000Z',
    }),
  });
  assert.equal(second.response.status, 201);

  currentTime = new Date('2026-09-05T11:30:00.000Z');
  const third = await request(context, '/api/reports', {
    method: 'POST',
    body: reportPayload({
      firstName: 'Cara',
      lastName: 'Dela Cruz',
      address: 'Charlie Lane, Manila',
      city: 'manila',
      locationDescription: 'Near the canal-side footbridge marker.',
      lat: 14.61,
      lng: 120.99,
      capturedAt: '2026-09-05T11:29:00.000Z',
    }),
  });
  assert.equal(third.response.status, 201);

  const anonymousSession = await request(context, '/api/admin/session');
  assert.deepEqual(anonymousSession.payload, { authenticated: false });

  const anonymousReports = await request(context, '/api/admin/reports');
  assert.equal(anonymousReports.response.status, 401);
  assert.equal(anonymousReports.payload.error, 'authentication_required');

  const wrongLogin = await request(context, '/api/admin/login', {
    method: 'POST',
    body: { username: 'test-admin', password: 'wrong-password' },
  });
  assert.equal(wrongLogin.response.status, 401);
  assert.equal(wrongLogin.payload.error, 'invalid_credentials');

  const { cookie, setCookie } = await login(context);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const authenticatedSession = await request(context, '/api/admin/session', {
    headers: { cookie },
  });
  assert.equal(authenticatedSession.payload.authenticated, true);
  assert.equal(authenticatedSession.payload.username, 'test-admin');

  const reports = await request(context, '/api/admin/reports', {
    headers: { cookie },
  });
  assert.equal(reports.response.status, 200);
  assert.equal(reports.payload.count, 3);
  assert.deepEqual(
    reports.payload.reports.map(({ id }) => id),
    [third.payload.report.id, second.payload.report.id, first.payload.report.id],
    'admin reports should be newest first',
  );
  assert.deepEqual(
    {
      city: reports.payload.reports[2].city,
      locationDescription: reports.payload.reports[2].locationDescription,
    },
    {
      city: 'Manila',
      locationDescription: 'Beside engine bay seven.',
    },
    'city and landmark context should survive persistence',
  );

  const invalidVerification = await request(
    context,
    `/api/admin/reports/${first.payload.report.id}/verify`,
    {
      method: 'PATCH',
      headers: { cookie },
      body: { fireType: 'kitchen' },
    },
  );
  assert.equal(invalidVerification.response.status, 400);
  assert.equal(invalidVerification.payload.error, 'validation_error');

  const unspecifiedOther = await request(
    context,
    `/api/admin/reports/${first.payload.report.id}/verify`,
    {
      method: 'PATCH',
      headers: { cookie },
      body: { fireType: 'other' },
    },
  );
  assert.equal(unspecifiedOther.response.status, 400);
  assert.ok(unspecifiedOther.payload.details.some(({ field }) => field === 'otherDetail'));

  currentTime = new Date('2026-09-06T11:00:00.000Z');
  const verified = await request(
    context,
    `/api/admin/reports/${first.payload.report.id}/verify`,
    {
      method: 'PATCH',
      headers: { cookie },
      body: { fireType: 'forest fire' },
    },
  );
  assert.equal(verified.response.status, 200);
  assert.equal(verified.payload.report.status, 'verified');
  assert.equal(verified.payload.report.fireType, 'forest');
  assert.equal(verified.payload.report.verifiedAt, currentTime.toISOString());

  const incidents = await request(context, '/api/incidents');
  assert.equal(incidents.response.status, 200);
  assert.equal(incidents.payload.count, 1);
  assert.equal(incidents.payload.incidents[0].id, first.payload.report.id);

  const incidentDetail = await request(
    context,
    `/api/incidents/${first.payload.report.id}`,
  );
  assert.equal(incidentDetail.response.status, 200);
  assert.equal(incidentDetail.payload.incident.fireType, 'forest');
  assert.equal(incidentDetail.payload.incident.city, 'Manila');
  assert.equal(
    incidentDetail.payload.incident.locationDescription,
    'Beside engine bay seven.',
  );

  const pendingIncidentDetail = await request(
    context,
    `/api/incidents/${second.payload.report.id}`,
  );
  assert.equal(pendingIncidentDetail.response.status, 404);
  assert.equal(pendingIncidentDetail.payload.error, 'incident_not_found');

  const analytics = await request(context, '/api/analytics');
  assert.equal(analytics.response.status, 200);
  assert.deepEqual(analytics.payload.totals, {
    reports: 3,
    pending: 2,
    verified: 1,
    incidents: 1,
  });
  assert.deepEqual(analytics.payload.monthly, [
    { month: '2026-08', reports: 1, incidents: 1 },
    { month: '2026-09', reports: 2, incidents: 0 },
  ]);
  assert.deepEqual(analytics.payload.reportsPerMonth, [
    { month: '2026-08', count: 1 },
    { month: '2026-09', count: 2 },
  ]);
  assert.equal(
    analytics.payload.byType.find(({ type }) => type === 'forest').count,
    1,
  );
  assert.equal(
    analytics.payload.hotspots.find(({ address }) => address === 'Alpha Road, Manila').incidents,
    1,
  );
  assert.deepEqual(analytics.payload.byCity, [
    { city: 'Manila', reports: 2, incidents: 1 },
    { city: 'Quezon City', reports: 1, incidents: 0 },
  ]);
  const serializedAnalytics = JSON.stringify(analytics.payload);
  assert.doesNotMatch(
    serializedAnalytics,
    /Alice|Santos|Beside engine bay seven|red awning|footbridge marker/i,
  );
  assert.equal(serializedAnalytics.includes(CAMERA_PHOTO), false);

  const deleted = await request(
    context,
    `/api/admin/reports/${second.payload.report.id}`,
    { method: 'DELETE', headers: { cookie } },
  );
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.payload.id, second.payload.report.id);

  const deleteAgain = await request(
    context,
    `/api/admin/reports/${second.payload.report.id}`,
    { method: 'DELETE', headers: { cookie } },
  );
  assert.equal(deleteAgain.response.status, 404);
  assert.equal(deleteAgain.payload.error, 'report_not_found');

  const remainingReports = await request(context, '/api/admin/reports', {
    headers: { cookie },
  });
  assert.equal(remainingReports.payload.count, 2);

  const logout = await request(context, '/api/admin/logout', {
    method: 'POST',
    headers: { cookie },
  });
  assert.deepEqual(logout.payload, { authenticated: false });

  const oldSession = await request(context, '/api/admin/reports', {
    headers: { cookie },
  });
  assert.equal(oldSession.response.status, 401);
});

test('serves the application shell and keeps unknown API routes JSON-safe', async (t) => {
  const context = await startTestServer();
  t.after(() => context.close());

  const home = await request(context, '/');
  assert.equal(home.response.status, 200);
  assert.match(home.response.headers.get('content-type'), /^text\/html/);
  assert.match(home.text, /FireSighter/i);
  assert.equal(home.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(home.response.headers.get('x-frame-options'), 'DENY');

  const stylesheet = await request(context, '/styles.css');
  assert.equal(stylesheet.response.status, 200);
  assert.match(stylesheet.response.headers.get('content-type'), /^text\/css/);

  const spaFallback = await request(context, '/incidents', {
    headers: { accept: 'text/html' },
  });
  assert.equal(spaFallback.response.status, 200);
  assert.match(spaFallback.text, /FireSighter/i);

  const config = await request(context, '/api/config');
  assert.equal(config.response.status, 200);
  assert.equal(typeof config.payload.googleMapsApiKey, 'string');

  const missingApiRoute = await request(context, '/api/not-a-real-route');
  assert.equal(missingApiRoute.response.status, 404);
  assert.equal(missingApiRoute.payload.error, 'api_route_not_found');
});

test('seeds ten varied demo reports once without changing existing data', async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'firesighter-seed-test-'));
  const dataFile = path.join(temporaryDirectory, 'reports.json');
  t.after(() => fs.rm(temporaryDirectory, { recursive: true, force: true }));

  const existingReport = {
    id: 'existing-user-report',
    ...reportPayload({
      firstName: 'Existing',
      lastName: 'Reporter',
      address: 'Existing report address',
      city: 'Cebu City',
      locationDescription: 'This record must remain byte-for-byte equivalent.',
    }),
    submittedAt: '2026-03-01T00:00:00.000Z',
    status: 'pending',
    fireType: null,
    otherDetail: null,
    verifiedAt: null,
  };
  await fs.writeFile(dataFile, `${JSON.stringify([existingReport], null, 2)}\n`, 'utf8');

  const firstRun = await seedDemoData({ dataFile });
  assert.deepEqual(
    {
      added: firstRun.added,
      updated: firstRun.updated,
      skipped: firstRun.skipped,
      demoReports: firstRun.demoReports,
      totalReports: firstRun.totalReports,
    },
    { added: 10, updated: 0, skipped: 0, demoReports: 10, totalReports: 11 },
  );

  const secondRun = await seedDemoData({ dataFile });
  assert.deepEqual(
    {
      added: secondRun.added,
      updated: secondRun.updated,
      skipped: secondRun.skipped,
      demoReports: secondRun.demoReports,
      totalReports: secondRun.totalReports,
    },
    { added: 0, updated: 0, skipped: 10, demoReports: 10, totalReports: 11 },
  );

  const persisted = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  assert.equal(persisted.length, 11, 'running the seed twice must not create duplicates');
  assert.deepEqual(
    persisted.find(({ id }) => id === existingReport.id),
    existingReport,
    'seeding must not rewrite pre-existing user reports',
  );

  const demoReports = persisted.filter(({ id }) => id.startsWith(`${DEMO_SEED_PREFIX}-`));
  assert.equal(demoReports.length, 10);
  assert.equal(new Set(demoReports.map(({ id }) => id)).size, 10);
  assert.equal(new Set(demoReports.map(({ photo }) => photo)).size, 10);
  assert.ok(demoReports.every(({ photo }) => /^https:\/\/upload\.wikimedia\.org\//.test(photo)));
  assert.ok(
    demoReports.every(
      ({ city, locationDescription }) =>
        typeof city === 'string' && city.length > 0 &&
        typeof locationDescription === 'string' && locationDescription.length > 0,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      ['pending', 'verified'].map((status) => [
        status,
        demoReports.filter((report) => report.status === status).length,
      ]),
    ),
    { pending: 3, verified: 7 },
  );
  assert.equal(new Set(demoReports.map(({ city }) => city)).size, 8);
  assert.equal(new Set(demoReports.map(({ submittedAt }) => submittedAt.slice(0, 7))).size, 6);
  assert.deepEqual(
    new Set(demoReports.filter(({ status }) => status === 'verified').map(({ fireType }) => fireType)),
    new Set(['residential', 'commercial', 'forest', 'other']),
  );

  const analytics = aggregateAnalytics(demoReports);
  assert.deepEqual(analytics.totals, {
    reports: 10,
    pending: 3,
    verified: 7,
    incidents: 7,
  });
  assert.deepEqual(
    analytics.monthly.map(({ month, reports }) => [month, reports]),
    [
      ['2026-04', 1],
      ['2026-05', 2],
      ['2026-06', 1],
      ['2026-07', 1],
      ['2026-08', 2],
      ['2026-09', 3],
    ],
  );
  assert.deepEqual(analytics.byCity.slice(0, 2), [
    { city: 'Manila', reports: 2, incidents: 1 },
    { city: 'Quezon City', reports: 2, incidents: 1 },
  ]);

  const independentlyBuilt = buildDemoReports();
  independentlyBuilt[0].city = 'Mutated only in this test copy';
  assert.notEqual(buildDemoReports()[0].city, independentlyBuilt[0].city);
});
