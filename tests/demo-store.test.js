'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const test = require('node:test');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEMO_STORE_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'frontend', 'demo-store.js'),
  'utf8',
);

class MemoryStorage {
  constructor(values = new Map()) {
    this.values = values;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function loadDemoStore(localValues = new Map(), sessionValues = new Map()) {
  const window = {
    crypto: webcrypto,
    localStorage: new MemoryStorage(localValues),
    sessionStorage: new MemoryStorage(sessionValues),
  };
  const context = vm.createContext({ window });
  vm.runInContext(DEMO_STORE_SOURCE, context, {
    filename: 'frontend/demo-store.js',
  });
  return {
    database: window.FireSighterDemoDB,
    localValues,
    sessionValues,
  };
}

function reportPayload(overrides = {}) {
  return {
    firstName: 'Grace',
    lastName: 'Reporter',
    address: 'Demo coordinates near Pasay City Hall',
    city: 'Pasay',
    locationDescription: 'Beside the blue gate facing the service road.',
    lat: 14.5378,
    lng: 120.9896,
    photo: 'data:image/jpeg;base64,Y2FtZXJhLWZyYW1l',
    capturedAt: '2026-09-10T10:20:30.000Z',
    ...overrides,
  };
}

test('device-local demo database supports the complete report and verification workflow', async () => {
  const localValues = new Map();
  const sessionValues = new Map();
  const firstLoad = loadDemoStore(localValues, sessionValues);
  const database = firstLoad.database;

  const incidentsBefore = await database.request('/api/incidents');
  assert.equal(incidentsBefore.count, 7);

  const analyticsBefore = await database.request('/api/analytics');
  assert.equal(analyticsBefore.totals.reports, 10);
  assert.equal(analyticsBefore.totals.pending, 3);
  assert.equal(analyticsBefore.totals.verified, 7);
  assert.deepEqual(
    Array.from(analyticsBefore.byType, (item) => [item.type, item.count]),
    [
      ['residential', 2],
      ['commercial', 2],
      ['forest', 2],
      ['other', 1],
    ],
  );

  await assert.rejects(
    database.request('/api/admin/reports'),
    (error) => error.status === 401 && error.code === 'authentication_required',
  );
  await assert.rejects(
    database.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    }),
    (error) => error.status === 401,
  );

  const login = await database.request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert.equal(login.authenticated, true);

  const created = await database.request('/api/reports', {
    method: 'POST',
    body: JSON.stringify(reportPayload()),
  });
  assert.equal(created.report.status, 'pending');
  assert.equal(created.report.city, 'Pasay');
  assert.ok(created.report.id);

  const reportsAfterCreate = await database.request('/api/admin/reports');
  assert.equal(reportsAfterCreate.count, 11);
  assert.equal(reportsAfterCreate.reports[0].id, created.report.id);

  const verified = await database.request(
    '/api/admin/reports/' + encodeURIComponent(created.report.id) + '/verify',
    {
      method: 'PATCH',
      body: JSON.stringify({ fireType: 'others', otherDetail: 'Vehicle fire' }),
    },
  );
  assert.equal(verified.report.status, 'verified');
  assert.equal(verified.report.fireType, 'other');
  assert.equal(verified.report.otherDetail, 'Vehicle fire');

  const incidentsAfter = await database.request('/api/incidents');
  assert.equal(incidentsAfter.count, 8);
  assert.ok(incidentsAfter.incidents.some((report) => report.id === created.report.id));

  const analyticsAfter = await database.request('/api/analytics');
  assert.equal(analyticsAfter.totals.reports, 11);
  assert.equal(analyticsAfter.totals.verified, 8);
  assert.equal(
    analyticsAfter.byCity.find((item) => item.city === 'Pasay').incidents,
    1,
  );

  const secondLoad = loadDemoStore(localValues, new Map());
  const persistedIncidents = await secondLoad.database.request('/api/incidents');
  assert.ok(persistedIncidents.incidents.some((report) => report.id === created.report.id));

  await secondLoad.database.request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  await secondLoad.database.request(
    '/api/admin/reports/' + encodeURIComponent(created.report.id),
    { method: 'DELETE' },
  );
  const reportsAfterDelete = await secondLoad.database.request('/api/admin/reports');
  assert.equal(reportsAfterDelete.count, 10);
});

test('device-local demo rejects uploaded URLs and keeps project-page assets relative', async () => {
  const database = loadDemoStore().database;

  await assert.rejects(
    database.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportPayload({ photo: 'https://example.test/uploaded.jpg' })),
    }),
    (error) => (
      error.status === 400
      && error.details.some((detail) => detail.field === 'photo')
    ),
  );

  await assert.rejects(
    database.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportPayload({ lat: '', lng: null })),
    }),
    (error) => (
      error.status === 400
      && error.details.some((detail) => detail.field === 'lat')
      && error.details.some((detail) => detail.field === 'lng')
    ),
  );

  const frontendHtml = fs.readFileSync(
    path.join(PROJECT_ROOT, 'frontend', 'index.html'),
    'utf8',
  );
  const demoStorePosition = frontendHtml.indexOf('./demo-store.js');
  const appPosition = frontendHtml.indexOf('./app.js');
  assert.ok(demoStorePosition > -1 && demoStorePosition < appPosition);
  assert.doesNotMatch(frontendHtml, /(?:src|href)="\//);

  const rootHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  assert.match(rootHtml, /.\/frontend\/#\/report/);
});
