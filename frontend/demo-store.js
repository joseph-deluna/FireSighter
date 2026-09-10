(() => {
  'use strict';

  const DATABASE_KEY = 'firesighter.demo.database';
  const SESSION_KEY = 'firesighter.demo.admin-session';
  const DATABASE_VERSION = 1;
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
  const MAX_PHOTO_DATA_URL_LENGTH = 1_600_000;
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const FIRE_TYPES = ['residential', 'commercial', 'forest', 'other'];
  const DEMO_SEED = 'firesighter-demo-v1';

  const DEMO_PHOTOS = Object.freeze([
    'https://upload.wikimedia.org/wikipedia/commons/2/20/Plaza_de_roma.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/f/fe/Overview_of_the_Quezon_Memorial_Circle.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/a/ae/Hinulugang_Taktak_Falls%2C_Antipolo%2C_Rizal_%282%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/1/1d/Pasig_City_Hall%2C_Feb_2024.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/4c/Ayala_Triangle_Skyline%2C_Makati%2C_Feb_2026.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/0/07/Bonifacio_High_Street%2C_Metro_Manila.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/3/3d/0611jf_Marikina_River_Park_fvf_18.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/3/35/Caloocan_City_Hall%2C_June_2023_%282%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/b/b0/Manila%2C_Rizal_Park_skyline%2C_Philippines.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/9b/View_of_Araneta_City_from_MRT-3_Cubao%2C_Q.C.%2C_Mar_2026.jpg',
  ]);

  function demoReport(number, values) {
    const suffix = String(number).padStart(2, '0');
    return {
      id: DEMO_SEED + '-' + suffix,
      firstName: 'Demo',
      lastName: 'Reporter ' + suffix,
      photo: DEMO_PHOTOS[number - 1],
      isDemo: true,
      demoSeed: DEMO_SEED,
      otherDetail: null,
      verifiedAt: null,
      ...values,
    };
  }

  const DEMO_REPORTS = Object.freeze([
    demoReport(1, {
      address: 'Demo pin near Plaza Roma, Intramuros, Manila',
      city: 'Manila',
      locationDescription: 'Smoke visible from a two-storey residence beside the demo plaza marker.',
      lat: 14.5915,
      lng: 120.9736,
      capturedAt: '2026-04-08T01:13:00.000Z',
      submittedAt: '2026-04-08T01:15:00.000Z',
      status: 'verified',
      fireType: 'residential',
      verifiedAt: '2026-04-08T01:24:00.000Z',
    }),
    demoReport(2, {
      address: 'Demo pin near Quezon Memorial Circle, Quezon City',
      city: 'Quezon City',
      locationDescription: 'Flames reported behind a demonstration commercial kiosk area.',
      lat: 14.6517,
      lng: 121.0493,
      capturedAt: '2026-05-03T08:40:00.000Z',
      submittedAt: '2026-05-03T08:42:00.000Z',
      status: 'verified',
      fireType: 'commercial',
      verifiedAt: '2026-05-03T08:55:00.000Z',
    }),
    demoReport(3, {
      address: 'Demo pin near Hinulugang Taktak area, Antipolo',
      city: 'Antipolo',
      locationDescription: 'A small brush fire is visible beyond the marked roadside clearing.',
      lat: 14.6003,
      lng: 121.1682,
      capturedAt: '2026-05-24T05:05:00.000Z',
      submittedAt: '2026-05-24T05:07:00.000Z',
      status: 'verified',
      fireType: 'forest',
      verifiedAt: '2026-05-24T05:18:00.000Z',
    }),
    demoReport(4, {
      address: 'Demo pin near Pasig City Hall, Pasig',
      city: 'Pasig',
      locationDescription: 'Smoke coming from a parked demonstration vehicle near the service road.',
      lat: 14.5607,
      lng: 121.076,
      capturedAt: '2026-06-11T10:27:00.000Z',
      submittedAt: '2026-06-11T10:29:00.000Z',
      status: 'verified',
      fireType: 'other',
      otherDetail: 'Vehicle fire',
      verifiedAt: '2026-06-11T10:41:00.000Z',
    }),
    demoReport(5, {
      address: 'Demo pin near Ayala Triangle, Makati',
      city: 'Makati',
      locationDescription: 'Smoke seen at a demonstration apartment balcony facing the gardens.',
      lat: 14.5567,
      lng: 121.0232,
      capturedAt: '2026-07-02T03:18:00.000Z',
      submittedAt: '2026-07-02T03:20:00.000Z',
      status: 'verified',
      fireType: 'residential',
      verifiedAt: '2026-07-02T03:34:00.000Z',
    }),
    demoReport(6, {
      address: 'Demo pin near Bonifacio High Street, Taguig',
      city: 'Taguig',
      locationDescription: 'Fire visible in a demonstration restaurant service area near the corner.',
      lat: 14.5508,
      lng: 121.0503,
      capturedAt: '2026-08-09T12:01:00.000Z',
      submittedAt: '2026-08-09T12:03:00.000Z',
      status: 'verified',
      fireType: 'commercial',
      verifiedAt: '2026-08-09T12:15:00.000Z',
    }),
    demoReport(7, {
      address: 'Demo pin near Marikina River Park, Marikina',
      city: 'Marikina',
      locationDescription: 'Grass and brush burning near the demonstration riverside marker.',
      lat: 14.6325,
      lng: 121.0965,
      capturedAt: '2026-08-22T06:46:00.000Z',
      submittedAt: '2026-08-22T06:48:00.000Z',
      status: 'verified',
      fireType: 'forest',
      verifiedAt: '2026-08-22T07:00:00.000Z',
    }),
    demoReport(8, {
      address: 'Demo pin near Caloocan City Hall, Caloocan',
      city: 'Caloocan',
      locationDescription: 'Unverified smoke sighting behind the demonstration transport bay.',
      lat: 14.6495,
      lng: 120.983,
      capturedAt: '2026-09-02T00:35:00.000Z',
      submittedAt: '2026-09-02T00:37:00.000Z',
      status: 'pending',
      fireType: null,
    }),
    demoReport(9, {
      address: 'Demo pin near Rizal Park, Manila',
      city: 'Manila',
      locationDescription: 'Unverified flame glow near a demonstration maintenance enclosure.',
      lat: 14.5826,
      lng: 120.9787,
      capturedAt: '2026-09-06T11:09:00.000Z',
      submittedAt: '2026-09-06T11:11:00.000Z',
      status: 'pending',
      fireType: null,
    }),
    demoReport(10, {
      address: 'Demo pin near Araneta City, Quezon City',
      city: 'Quezon City',
      locationDescription: 'Unverified smoke seen above a demonstration loading area on the east side.',
      lat: 14.6207,
      lng: 121.0534,
      capturedAt: '2026-09-08T14:20:00.000Z',
      submittedAt: '2026-09-08T14:22:00.000Z',
      status: 'pending',
      fireType: null,
    }),
  ]);

  function createMemoryStorage() {
    const values = new Map();
    return {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
    };
  }

  function resolveStorage(candidate) {
    try {
      const key = '__firesighter_storage_test__';
      candidate.setItem(key, '1');
      candidate.removeItem(key);
      return { storage: candidate, persistent: true };
    } catch (_error) {
      return { storage: createMemoryStorage(), persistent: false };
    }
  }

  function browserStorage(name) {
    try {
      return window[name];
    } catch (_error) {
      return createMemoryStorage();
    }
  }

  const local = resolveStorage(browserStorage('localStorage'));
  const session = resolveStorage(browserStorage('sessionStorage'));

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createError(status, code, message, details) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    if (details) error.details = details;
    return error;
  }

  function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function parseCoordinate(value) {
    if (value === null || value === undefined) return Number.NaN;
    if (typeof value === 'string' && !value.trim()) return Number.NaN;
    return Number(value);
  }

  function parseDatabase(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.reports)) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function saveDatabase(database) {
    try {
      local.storage.setItem(DATABASE_KEY, JSON.stringify(database));
    } catch (_error) {
      throw createError(
        507,
        'device_storage_full',
        'This device does not have enough browser storage for another photo. Delete an older demo report or clear site data, then try again.',
      );
    }
  }

  function freshDatabase(existingReports = []) {
    const userReports = existingReports.filter(
      (report) => report && report.demoSeed !== DEMO_SEED && !String(report.id || '').startsWith(DEMO_SEED),
    );
    return {
      version: DATABASE_VERSION,
      createdAt: new Date().toISOString(),
      reports: [...clone(DEMO_REPORTS), ...clone(userReports)],
    };
  }

  function loadDatabase() {
    const raw = local.storage.getItem(DATABASE_KEY);
    const database = parseDatabase(raw);
    if (database && database.version === DATABASE_VERSION) return database;
    const upgraded = freshDatabase(database?.reports || []);
    saveDatabase(upgraded);
    return upgraded;
  }

  function sortNewestFirst(reports) {
    return [...reports].sort((left, right) => {
      const leftTime = Date.parse(left?.submittedAt) || 0;
      const rightTime = Date.parse(right?.submittedAt) || 0;
      return rightTime - leftTime || String(right?.id || '').localeCompare(String(left?.id || ''));
    });
  }

  function validationError(errors, message = 'Please correct the report fields and try again.') {
    throw createError(400, 'validation_error', message, errors);
  }

  function validateReport(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      validationError([{ field: 'body', message: 'A report object is required.' }]);
    }

    const value = {
      firstName: cleanString(body.firstName),
      lastName: cleanString(body.lastName),
      address: cleanString(body.address),
      city: cleanString(body.city),
      locationDescription: cleanString(body.locationDescription),
      lat: parseCoordinate(body.lat),
      lng: parseCoordinate(body.lng),
      photo: typeof body.photo === 'string' ? body.photo : '',
      capturedAt: cleanString(body.capturedAt),
    };
    const errors = [];
    const requiredText = [
      ['firstName', 'First name is required.', 80],
      ['lastName', 'Last name is required.', 80],
      ['address', 'Detected address is required.', 300],
      ['city', 'Detected city is required.', 120],
      ['locationDescription', 'Location description is required.', 600],
    ];

    for (const [field, requiredMessage, maximum] of requiredText) {
      if (!value[field]) {
        errors.push({ field, message: requiredMessage });
      } else if (value[field].length > maximum) {
        errors.push({ field, message: 'This value is too long.' });
      }
    }

    if (!Number.isFinite(value.lat) || value.lat < -90 || value.lat > 90) {
      errors.push({ field: 'lat', message: 'Latitude must be between -90 and 90.' });
    }
    if (!Number.isFinite(value.lng) || value.lng < -180 || value.lng > 180) {
      errors.push({ field: 'lng', message: 'Longitude must be between -180 and 180.' });
    }
    if (!/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value.photo)) {
      errors.push({ field: 'photo', message: 'Take a new photo with the live camera before submitting.' });
    } else if (value.photo.length > MAX_PHOTO_DATA_URL_LENGTH) {
      errors.push({ field: 'photo', message: 'The captured photo is too large for this device demo.' });
    }
    const capturedDate = new Date(value.capturedAt);
    if (Number.isNaN(capturedDate.getTime())) {
      errors.push({ field: 'capturedAt', message: 'Take a current camera photo before submitting.' });
    } else {
      value.capturedAt = capturedDate.toISOString();
    }

    if (errors.length) validationError(errors);
    return value;
  }

  function parseBody(options) {
    if (options.body === undefined || options.body === null || options.body === '') return {};
    if (typeof options.body === 'object') return options.body;
    try {
      const parsed = JSON.parse(options.body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object');
      }
      return parsed;
    } catch (_error) {
      throw createError(400, 'invalid_json', 'The request data is not valid JSON.');
    }
  }

  function createId() {
    try {
      if (typeof window.crypto?.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (_error) {
      // A time-based fallback is sufficient for this single-device demonstration.
    }
    return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function readSession() {
    try {
      const value = JSON.parse(session.storage.getItem(SESSION_KEY) || 'null');
      if (!value || value.expiresAt <= Date.now()) {
        session.storage.removeItem(SESSION_KEY);
        return null;
      }
      return value;
    } catch (_error) {
      session.storage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function requireAdmin() {
    const activeSession = readSession();
    if (!activeSession) {
      throw createError(401, 'authentication_required', 'Admin login is required.');
    }
    return activeSession;
  }

  function normalizeFireType(value) {
    const normalized = cleanString(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (normalized === 'forest fire') return 'forest';
    if (normalized === 'others') return 'other';
    return normalized;
  }

  function titleCaseFireType(type) {
    if (type === 'forest') return 'Forest fire';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function aggregateAnalytics(reports) {
    const totals = { reports: reports.length, pending: 0, verified: 0, incidents: 0, thisMonth: 0 };
    const months = new Map();
    const types = new Map();
    const cities = new Map();
    const hotspotGroups = new Map();
    const currentMonth = new Date().toISOString().slice(0, 7);

    for (const report of reports) {
      const verified = report.status === 'verified';
      if (verified) {
        totals.verified += 1;
        totals.incidents += 1;
      } else {
        totals.pending += 1;
      }

      const reportDate = new Date(report.submittedAt || report.capturedAt);
      if (!Number.isNaN(reportDate.getTime())) {
        const month = reportDate.toISOString().slice(0, 7);
        const monthly = months.get(month) || { month, reports: 0, incidents: 0 };
        monthly.reports += 1;
        if (verified) monthly.incidents += 1;
        months.set(month, monthly);
        if (month === currentMonth) totals.thisMonth += 1;
      }

      if (verified) {
        const type = FIRE_TYPES.includes(report.fireType) ? report.fireType : 'other';
        types.set(type, (types.get(type) || 0) + 1);
      }

      const city = cleanString(report.city) || 'Unknown city';
      const cityKey = city.toLowerCase();
      const cityEntry = cities.get(cityKey) || { city, reports: 0, incidents: 0 };
      cityEntry.reports += 1;
      if (verified) cityEntry.incidents += 1;
      cities.set(cityKey, cityEntry);

      const address = cleanString(report.address) || 'Unknown location';
      const lat = Number.isFinite(Number(report.lat)) ? Number(Number(report.lat).toFixed(4)) : null;
      const lng = Number.isFinite(Number(report.lng)) ? Number(Number(report.lng).toFixed(4)) : null;
      const hotspotKey = address.toLowerCase() + '|' + (lat ?? '') + '|' + (lng ?? '');
      const hotspot = hotspotGroups.get(hotspotKey) || {
        address,
        lat,
        lng,
        reports: 0,
        incidents: 0,
      };
      hotspot.reports += 1;
      if (verified) hotspot.incidents += 1;
      hotspotGroups.set(hotspotKey, hotspot);
    }

    const monthly = [...months.values()]
      .sort((left, right) => left.month.localeCompare(right.month))
      .slice(-12);
    const byType = FIRE_TYPES.map((type) => ({
      type,
      label: titleCaseFireType(type),
      count: types.get(type) || 0,
    }));
    const byCity = [...cities.values()].sort(
      (left, right) => right.reports - left.reports
        || right.incidents - left.incidents
        || left.city.localeCompare(right.city),
    );
    const hotspots = [...hotspotGroups.values()].sort(
      (left, right) => right.reports - left.reports
        || right.incidents - left.incidents
        || left.address.localeCompare(right.address),
    );

    return {
      totals,
      monthly,
      byType,
      byCity,
      hotspots,
      reportsPerMonth: monthly.map((item) => ({ month: item.month, count: item.reports })),
      incidentsByType: byType.map((item) => ({ ...item })),
    };
  }

  function verifyReport(pathname, body) {
    requireAdmin();
    const match = pathname.match(/^\/api\/admin\/reports\/([^/]+)\/verify$/);
    const id = decodeURIComponent(match[1]);
    const fireType = normalizeFireType(body.fireType);
    const otherDetail = cleanString(body.otherDetail);
    const errors = [];
    if (!FIRE_TYPES.includes(fireType)) {
      errors.push({ field: 'fireType', message: 'Choose a valid fire type.' });
    }
    if (fireType === 'other' && !otherDetail) {
      errors.push({ field: 'otherDetail', message: 'Describe the other type of fire.' });
    }
    if (otherDetail.length > 160) {
      errors.push({ field: 'otherDetail', message: 'Other fire type detail is too long.' });
    }
    if (errors.length) {
      validationError(errors, 'Choose a valid fire type before verifying the report.');
    }

    const database = loadDatabase();
    const index = database.reports.findIndex((report) => report.id === id);
    if (index < 0) throw createError(404, 'report_not_found', 'Report not found.');
    const report = {
      ...database.reports[index],
      status: 'verified',
      fireType,
      otherDetail: fireType === 'other' ? otherDetail : null,
      verifiedAt: new Date().toISOString(),
    };
    database.reports[index] = report;
    saveDatabase(database);
    return { message: 'Report verified and published as an incident.', report: clone(report) };
  }

  function deleteReport(pathname) {
    requireAdmin();
    const match = pathname.match(/^\/api\/admin\/reports\/([^/]+)$/);
    const id = decodeURIComponent(match[1]);
    const database = loadDatabase();
    const index = database.reports.findIndex((report) => report.id === id);
    if (index < 0) throw createError(404, 'report_not_found', 'Report not found.');
    database.reports.splice(index, 1);
    saveDatabase(database);
    return { message: 'Report deleted from this device.', id };
  }

  async function request(path, options = {}) {
    await Promise.resolve();
    const pathname = String(path || '').split('?', 1)[0];
    const method = String(options.method || 'GET').toUpperCase();

    if (method === 'GET' && pathname === '/api/config') {
      return {
        googleMapsApiKey: '',
        demoMode: true,
        storage: 'localStorage',
        persistent: local.persistent,
      };
    }

    if (method === 'POST' && pathname === '/api/reports') {
      const value = validateReport(parseBody(options));
      const report = {
        id: createId(),
        ...value,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        fireType: null,
        otherDetail: null,
        verifiedAt: null,
        isDemo: false,
      };
      const database = loadDatabase();
      database.reports.push(report);
      saveDatabase(database);
      return {
        message: 'Fire report saved on this device for admin verification.',
        report: clone(report),
      };
    }

    if (method === 'POST' && pathname === '/api/admin/login') {
      const body = parseBody(options);
      if (cleanString(body.username) !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
        throw createError(401, 'invalid_credentials', 'Invalid username or password.');
      }
      const activeSession = {
        username: ADMIN_USERNAME,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      session.storage.setItem(SESSION_KEY, JSON.stringify(activeSession));
      return {
        authenticated: true,
        username: activeSession.username,
        expiresAt: new Date(activeSession.expiresAt).toISOString(),
      };
    }

    if (method === 'GET' && pathname === '/api/admin/session') {
      const activeSession = readSession();
      return activeSession
        ? {
            authenticated: true,
            username: activeSession.username,
            expiresAt: new Date(activeSession.expiresAt).toISOString(),
          }
        : { authenticated: false };
    }

    if (method === 'POST' && pathname === '/api/admin/logout') {
      session.storage.removeItem(SESSION_KEY);
      return { authenticated: false };
    }

    if (method === 'GET' && pathname === '/api/admin/reports') {
      requireAdmin();
      const reports = sortNewestFirst(loadDatabase().reports);
      return { reports: clone(reports), count: reports.length };
    }

    if (
      method === 'PATCH'
      && /^\/api\/admin\/reports\/[^/]+\/verify$/.test(pathname)
    ) {
      return verifyReport(pathname, parseBody(options));
    }

    if (
      method === 'DELETE'
      && /^\/api\/admin\/reports\/[^/]+$/.test(pathname)
    ) {
      return deleteReport(pathname);
    }

    if (method === 'GET' && pathname === '/api/incidents') {
      const incidents = sortNewestFirst(loadDatabase().reports).filter(
        (report) => report.status === 'verified',
      );
      return { incidents: clone(incidents), count: incidents.length };
    }

    if (method === 'GET' && pathname === '/api/analytics') {
      return clone(aggregateAnalytics(loadDatabase().reports));
    }

    throw createError(404, 'not_found', 'The requested FireSighter demo action was not found.');
  }

  // Initialize the versioned browser database before the application asks for data.
  loadDatabase();

  window.FireSighterDemoDB = Object.freeze({
    request,
    mode: 'device-local-demo',
    persistent: local.persistent,
    maxPhotoDataUrlLength: MAX_PHOTO_DATA_URL_LENGTH,
  });
})();
