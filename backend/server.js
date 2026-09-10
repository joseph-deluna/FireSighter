'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_BODY_LIMIT = '10mb';
const DEFAULT_MAX_PHOTO_BYTES = 7 * 1024 * 1024;
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_PORT = 5050;
const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'reports.json');
const DEFAULT_PUBLIC_DIR = path.resolve(__dirname, '..', 'frontend');
const ADMIN_COOKIE_NAME = 'firesighter_admin_session';
const MAX_CITY_LENGTH = 120;
const MAX_LOCATION_DESCRIPTION_LENGTH = 600;
const FIRE_TYPES = Object.freeze(['residential', 'commercial', 'forest', 'other']);

const MIME_TYPES = Object.freeze({
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return '';
}

function parseCoordinate(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addValidationError(errors, field, message) {
  errors.push({ field, message });
}

function validatePhotoDataUrl(value, maxPhotoBytes = DEFAULT_MAX_PHOTO_BYTES) {
  if (typeof value !== 'string') {
    return { valid: false, message: 'A photo captured with the camera is required.' };
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    return {
      valid: false,
      message: 'Photo must be a JPEG, PNG, or WebP camera image data URL.',
    };
  }

  const byteLength = Buffer.byteLength(match[2], 'base64');
  if (byteLength < 1) {
    return { valid: false, message: 'The captured photo is empty.' };
  }
  if (byteLength > maxPhotoBytes) {
    return {
      valid: false,
      message: `The captured photo must be smaller than ${Math.floor(maxPhotoBytes / 1024 / 1024)} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validate and normalize a public report payload. Only explicitly supported
 * fields are copied, so extra client input cannot overwrite server fields.
 */
function validateReportInput(body, options = {}) {
  const errors = [];
  if (!isPlainObject(body)) {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'A JSON object is required.' }],
    };
  }

  const location = isPlainObject(body.location) ? body.location : {};
  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const address = cleanString(firstString(body.address, location.address));
  const city = cleanString(firstString(body.city, location.city));
  const locationDescription = cleanString(body.locationDescription);
  const lat = parseCoordinate(body.lat ?? body.latitude ?? location.lat ?? location.latitude);
  const lng = parseCoordinate(body.lng ?? body.longitude ?? location.lng ?? location.longitude);
  const photo = firstString(body.photo, body.photoDataUrl, body.imageDataUrl, body.image);
  const capturedAtInput = firstString(body.capturedAt, body.photoCapturedAt);
  const capturedDate = new Date(capturedAtInput);

  if (!firstName) addValidationError(errors, 'firstName', 'First name is required.');
  else if (firstName.length > 80) addValidationError(errors, 'firstName', 'First name is too long.');

  if (!lastName) addValidationError(errors, 'lastName', 'Last name is required.');
  else if (lastName.length > 80) addValidationError(errors, 'lastName', 'Last name is too long.');

  if (!address) addValidationError(errors, 'address', 'A fire location address is required.');
  else if (address.length > 300) addValidationError(errors, 'address', 'Address is too long.');

  if (!city) addValidationError(errors, 'city', 'A city or municipality is required.');
  else if (city.length > MAX_CITY_LENGTH) {
    addValidationError(errors, 'city', 'City or municipality is too long.');
  }

  if (!locationDescription) {
    addValidationError(
      errors,
      'locationDescription',
      'A brief description of the fire location is required.',
    );
  } else if (locationDescription.length > MAX_LOCATION_DESCRIPTION_LENGTH) {
    addValidationError(
      errors,
      'locationDescription',
      `Location description must be ${MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  if (lat === null || lat < -90 || lat > 90) {
    addValidationError(errors, 'lat', 'Latitude must be between -90 and 90.');
  }
  if (lng === null || lng < -180 || lng > 180) {
    addValidationError(errors, 'lng', 'Longitude must be between -180 and 180.');
  }

  const photoValidation = validatePhotoDataUrl(
    photo,
    options.maxPhotoBytes ?? DEFAULT_MAX_PHOTO_BYTES,
  );
  if (!photoValidation.valid) addValidationError(errors, 'photo', photoValidation.message);

  if (!capturedAtInput || Number.isNaN(capturedDate.getTime())) {
    addValidationError(errors, 'capturedAt', 'A valid photo capture date and time is required.');
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    value: {
      firstName,
      lastName,
      address,
      city,
      locationDescription,
      lat,
      lng,
      photo,
      capturedAt: capturedDate.toISOString(),
    },
  };
}

function normalizeFireType(value) {
  const normalized = cleanString(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (normalized === 'forest fire') return 'forest';
  if (normalized === 'others') return 'other';
  return normalized;
}

function validateVerificationInput(body) {
  const errors = [];
  if (!isPlainObject(body)) {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'A JSON object is required.' }],
    };
  }

  const fireType = normalizeFireType(
    firstString(body.fireType, body.type, body.incidentType, body.category),
  );
  const otherDetail = cleanString(
    firstString(body.otherDetail, body.otherType, body.typeDetail, body.details),
  );

  if (!FIRE_TYPES.includes(fireType)) {
    addValidationError(
      errors,
      'fireType',
      `Fire type must be one of: ${FIRE_TYPES.join(', ')}.`,
    );
  }
  if (fireType === 'other' && !otherDetail) {
    addValidationError(errors, 'otherDetail', 'Please describe the other type of fire.');
  }
  if (otherDetail.length > 160) {
    addValidationError(errors, 'otherDetail', 'Other fire type detail is too long.');
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    value: {
      fireType,
      otherDetail: fireType === 'other' ? otherDetail : null,
    },
  };
}

function timeValue(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortReportsNewestFirst(reports) {
  return [...reports].sort((left, right) => {
    const dateDifference = timeValue(right.submittedAt) - timeValue(left.submittedAt);
    if (dateDifference !== 0) return dateDifference;
    return String(right.id || '').localeCompare(String(left.id || ''));
  });
}

function titleCaseFireType(type) {
  if (type === 'forest') return 'Forest fire';
  return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : 'Unknown';
}

/**
 * Return aggregate-only public data. This deliberately never copies reporter
 * names or photo data into the analytics response.
 */
function aggregateAnalytics(reports) {
  const safeReports = Array.isArray(reports) ? reports : [];
  const totals = { reports: safeReports.length, pending: 0, verified: 0, incidents: 0 };
  const months = new Map();
  const types = new Map();
  const cities = new Map();
  const hotspotGroups = new Map();

  for (const report of safeReports) {
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
      const current = months.get(month) || { month, reports: 0, incidents: 0 };
      current.reports += 1;
      if (verified) current.incidents += 1;
      months.set(month, current);
    }

    if (verified) {
      const fireType = FIRE_TYPES.includes(report.fireType) ? report.fireType : 'other';
      types.set(fireType, (types.get(fireType) || 0) + 1);
    }

    // Records from before city collection remain visible as an explicit
    // aggregate instead of being dropped or guessed from a free-form address.
    const city = cleanString(report.city) || 'Unknown city';
    const cityKey = city.toLowerCase();
    const cityCounts = cities.get(cityKey) || { city, reports: 0, incidents: 0 };
    cityCounts.reports += 1;
    if (verified) cityCounts.incidents += 1;
    cities.set(cityKey, cityCounts);

    const address = cleanString(report.address) || 'Unknown location';
    const lat = parseCoordinate(report.lat ?? report.latitude);
    const lng = parseCoordinate(report.lng ?? report.longitude);
    const roundedLat = lat === null ? null : Number(lat.toFixed(4));
    const roundedLng = lng === null ? null : Number(lng.toFixed(4));
    const key = `${address.toLocaleLowerCase()}|${roundedLat ?? ''}|${roundedLng ?? ''}`;
    const hotspot = hotspotGroups.get(key) || {
      address,
      lat: roundedLat,
      lng: roundedLng,
      reports: 0,
      incidents: 0,
    };
    hotspot.reports += 1;
    if (verified) hotspot.incidents += 1;
    hotspotGroups.set(key, hotspot);
  }

  const monthly = [...months.values()].sort((left, right) => left.month.localeCompare(right.month));
  const byType = FIRE_TYPES.map((type) => ({
    type,
    label: titleCaseFireType(type),
    count: types.get(type) || 0,
  }));
  const byCity = [...cities.values()].sort(
    (left, right) =>
      right.reports - left.reports ||
      right.incidents - left.incidents ||
      left.city.localeCompare(right.city),
  );
  const hotspots = [...hotspotGroups.values()].sort(
    (left, right) =>
      right.reports - left.reports ||
      right.incidents - left.incidents ||
      left.address.localeCompare(right.address),
  );

  return {
    totals,
    monthly,
    byType,
    byCity,
    hotspots,
    reportsPerMonth: monthly.map(({ month, reports: count }) => ({ month, count })),
    incidentsByType: byType.map(({ type, label, count }) => ({ type, label, count })),
  };
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of String(header).split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}

function safeTextEqual(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const receivedDigest = crypto.createHash('sha256').update(received).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(receivedDigest, expectedDigest);
}

function sendError(res, status, code, message, details) {
  const payload = { error: code, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

function createReportStore(filePath = DEFAULT_DATA_FILE) {
  const resolvedFile = path.resolve(filePath);
  let operationQueue = Promise.resolve();

  async function writeReports(reports) {
    const directory = path.dirname(resolvedFile);
    await fs.promises.mkdir(directory, { recursive: true });
    const temporaryFile = path.join(
      directory,
      `.${path.basename(resolvedFile)}.${process.pid}.${crypto.randomUUID()}.tmp`,
    );
    const json = `${JSON.stringify(reports, null, 2)}\n`;

    try {
      await fs.promises.writeFile(temporaryFile, json, { encoding: 'utf8', mode: 0o600 });
      await fs.promises.rename(temporaryFile, resolvedFile);
    } catch (error) {
      await fs.promises.unlink(temporaryFile).catch(() => {});
      throw error;
    }
  }

  async function readReportsFromDisk() {
    try {
      const raw = await fs.promises.readFile(resolvedFile, 'utf8');
      if (!raw.trim()) return [];
      const parsed = JSON.parse(raw);
      const reports = Array.isArray(parsed) ? parsed : parsed && parsed.reports;
      if (!Array.isArray(reports)) {
        const error = new Error('Report data must be a JSON array.');
        error.code = 'INVALID_REPORT_DATA';
        throw error;
      }
      return reports;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await writeReports([]);
      return [];
    }
  }

  function enqueue(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.catch(() => {});
    return result;
  }

  return {
    filePath: resolvedFile,
    list() {
      return enqueue(() => readReportsFromDisk());
    },
    add(report) {
      return enqueue(async () => {
        const reports = await readReportsFromDisk();
        reports.push(report);
        await writeReports(reports);
        return report;
      });
    },
    update(id, updater) {
      return enqueue(async () => {
        const reports = await readReportsFromDisk();
        const index = reports.findIndex((report) => report.id === id);
        if (index < 0) return null;
        const updated = updater({ ...reports[index] });
        reports[index] = updated;
        await writeReports(reports);
        return updated;
      });
    },
    remove(id) {
      return enqueue(async () => {
        const reports = await readReportsFromDisk();
        const index = reports.findIndex((report) => report.id === id);
        if (index < 0) return null;
        const [removed] = reports.splice(index, 1);
        await writeReports(reports);
        return removed;
      });
    },
  };
}

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createApp(options = {}) {
  const app = express();
  const dataFile = options.dataFile || process.env.REPORTS_DATA_FILE || DEFAULT_DATA_FILE;
  const publicDir = path.resolve(options.publicDir || DEFAULT_PUBLIC_DIR);
  const store = options.store || createReportStore(dataFile);
  const now = typeof options.now === 'function' ? options.now : () => new Date();
  const idGenerator =
    typeof options.idGenerator === 'function' ? options.idGenerator : () => crypto.randomUUID();
  const adminUsername = options.adminUsername ?? process.env.ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const cookieName = options.cookieName || ADMIN_COOKIE_NAME;
  const sessionTtlMs = Number(
    options.sessionTtlMs ?? process.env.ADMIN_SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS,
  );
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === 'production';
  const sessions = options.sessions || new Map();
  const logger = options.logger || console;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.locals.reportStore = store;
  app.locals.sessions = sessions;
  app.locals.config = {
    dataFile: path.resolve(dataFile),
    publicDir,
    usingDefaultCredentials:
      adminUsername === DEFAULT_ADMIN_USERNAME && adminPassword === DEFAULT_ADMIN_PASSWORD,
  };

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Keep the origin on HTTPS cross-origin map requests so referrer-restricted
    // Google Maps keys continue to work without disclosing a full report URL.
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: options.bodyLimit || DEFAULT_BODY_LIMIT, strict: true }));

  function cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(secureCookies),
      path: '/',
      maxAge:
        Number.isFinite(sessionTtlMs) && sessionTtlMs > 0
          ? sessionTtlMs
          : DEFAULT_SESSION_TTL_MS,
    };
  }

  function clearSessionCookie(res) {
    const { maxAge: _maxAge, ...clearOptions } = cookieOptions();
    res.clearCookie(cookieName, clearOptions);
  }

  function requireJson(req, res, next) {
    if (!req.is('application/json')) {
      return sendError(
        res,
        415,
        'unsupported_media_type',
        'Content-Type must be application/json.',
      );
    }
    return next();
  }

  function currentSession(req) {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    return { token, ...session };
  }

  function requireAdmin(req, res, next) {
    const session = currentSession(req);
    if (!session) {
      clearSessionCookie(res);
      return sendError(res, 401, 'authentication_required', 'Admin login is required.');
    }
    req.adminSession = session;
    return next();
  }

  app.post('/api/admin/login', requireJson, (req, res) => {
    const username = cleanString(req.body && req.body.username);
    const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
    if (!safeTextEqual(username, adminUsername) || !safeTextEqual(password, adminPassword)) {
      return sendError(res, 401, 'invalid_credentials', 'Invalid username or password.');
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const maxAge = cookieOptions().maxAge;
    const expiresAt = Date.now() + maxAge;
    sessions.set(token, { username: adminUsername, expiresAt });
    res.cookie(cookieName, token, cookieOptions());
    return res.json({
      authenticated: true,
      username: adminUsername,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (token) sessions.delete(token);
    clearSessionCookie(res);
    res.json({ authenticated: false });
  });

  app.get('/api/admin/session', (req, res) => {
    const session = currentSession(req);
    if (!session) {
      clearSessionCookie(res);
      return res.json({ authenticated: false });
    }
    return res.json({
      authenticated: true,
      username: session.username,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  app.post(
    '/api/reports',
    requireJson,
    asyncRoute(async (req, res) => {
      const validation = validateReportInput(req.body, { maxPhotoBytes: options.maxPhotoBytes });
      if (!validation.valid) {
        return sendError(
          res,
          400,
          'validation_error',
          'Please correct the report fields and try again.',
          validation.errors,
        );
      }

      const submittedAt = now();
      if (!(submittedAt instanceof Date) || Number.isNaN(submittedAt.getTime())) {
        throw new Error('The configured clock returned an invalid date.');
      }
      const report = {
        id: String(idGenerator()),
        ...validation.value,
        submittedAt: submittedAt.toISOString(),
        status: 'pending',
        fireType: null,
        otherDetail: null,
        verifiedAt: null,
      };
      await store.add(report);
      return res.status(201).json({
        message: 'Fire report submitted for admin verification.',
        report,
      });
    }),
  );

  app.get(
    '/api/admin/reports',
    requireAdmin,
    asyncRoute(async (_req, res) => {
      const reports = sortReportsNewestFirst(await store.list());
      res.json({ reports, count: reports.length });
    }),
  );

  app.patch(
    '/api/admin/reports/:id/verify',
    requireAdmin,
    requireJson,
    asyncRoute(async (req, res) => {
      const validation = validateVerificationInput(req.body);
      if (!validation.valid) {
        return sendError(
          res,
          400,
          'validation_error',
          'Choose a valid fire type before verifying the report.',
          validation.errors,
        );
      }

      const verifiedAt = now();
      if (!(verifiedAt instanceof Date) || Number.isNaN(verifiedAt.getTime())) {
        throw new Error('The configured clock returned an invalid date.');
      }
      const report = await store.update(req.params.id, (existing) => ({
        ...existing,
        status: 'verified',
        fireType: validation.value.fireType,
        otherDetail: validation.value.otherDetail,
        verifiedAt: verifiedAt.toISOString(),
      }));
      if (!report) return sendError(res, 404, 'report_not_found', 'Report not found.');
      return res.json({ message: 'Report verified and published as an incident.', report });
    }),
  );

  app.delete(
    '/api/admin/reports/:id',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const removed = await store.remove(req.params.id);
      if (!removed) return sendError(res, 404, 'report_not_found', 'Report not found.');
      return res.json({ message: 'Report deleted.', id: removed.id });
    }),
  );

  app.get(
    '/api/incidents',
    asyncRoute(async (_req, res) => {
      const incidents = sortReportsNewestFirst(await store.list()).filter(
        (report) => report.status === 'verified',
      );
      res.json({ incidents, count: incidents.length });
    }),
  );

  app.get(
    '/api/incidents/:id',
    asyncRoute(async (req, res) => {
      const incident = (await store.list()).find(
        (report) => report.id === req.params.id && report.status === 'verified',
      );
      if (!incident) return sendError(res, 404, 'incident_not_found', 'Incident not found.');
      return res.json({ incident });
    }),
  );

  app.get(
    '/api/analytics',
    asyncRoute(async (_req, res) => {
      res.json(aggregateAnalytics(await store.list()));
    }),
  );

  app.get('/api/config', (_req, res) => {
    res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
  });

  app.use('/api', (req, res) => {
    sendError(res, 404, 'api_route_not_found', `No API route exists for ${req.method} ${req.path}.`);
  });

  app.use(
    express.static(publicDir, {
      dotfiles: 'deny',
      fallthrough: true,
      index: 'index.html',
      redirect: false,
      setHeaders(res, filePath) {
        const mime = MIME_TYPES[path.extname(filePath).toLowerCase()];
        if (mime) res.setHeader('Content-Type', mime);
        if (path.basename(filePath) === 'index.html') res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (path.extname(req.path) || !req.accepts('html')) return next();
    const indexFile = path.join(publicDir, 'index.html');
    return res.sendFile(indexFile, (error) => {
      if (error) next(error.status === 404 ? Object.assign(error, { exposeAs404: true }) : error);
    });
  });

  app.use((req, res) => {
    sendError(res, 404, 'not_found', `No route exists for ${req.method} ${req.path}.`);
  });

  app.use((error, _req, res, _next) => {
    if (error && error.type === 'entity.too.large') {
      return sendError(res, 413, 'payload_too_large', 'The request payload is too large.');
    }
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return sendError(res, 400, 'invalid_json', 'Request body contains invalid JSON.');
    }
    if (error && error.exposeAs404) {
      return sendError(res, 404, 'not_found', 'Application page not found.');
    }

    if (logger && typeof logger.error === 'function') {
      logger.error('FireSighter request failed:', error && error.stack ? error.stack : error);
    }
    return sendError(res, 500, 'internal_error', 'An unexpected server error occurred.');
  });

  return app;
}

const app = createApp();

function createServer(options = {}) {
  return http.createServer(options.app || createApp(options));
}

function startServer(options = {}) {
  const targetApp = options.app || createApp(options);
  const server = http.createServer(targetApp);
  const requestedPort = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT);
  const port = Number.isInteger(requestedPort) && requestedPort >= 0 ? requestedPort : DEFAULT_PORT;
  const host = options.host ?? process.env.HOST;
  const listenArgs = host ? [port, host] : [port];

  server.listen(...listenArgs, () => {
    if (options.silent) return;
    const address = server.address();
    const boundPort = address && typeof address === 'object' ? address.port : port;
    console.log(`FireSighter is running on port ${boundPort}.`);
    if (targetApp.locals.config && targetApp.locals.config.usingDefaultCredentials) {
      console.warn(
        'FireSighter is using demo admin credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD for deployment.',
      );
    }
  });

  return server;
}

if (require.main === module) startServer({ app });

// Export the default app directly for Express tooling, with named helpers for
// isolated tests and alternate launchers.
module.exports = app;
Object.assign(module.exports, {
  app,
  createApp,
  createServer,
  startServer,
  createReportStore,
  validateReportInput,
  validateVerificationInput,
  validatePhotoDataUrl,
  aggregateAnalytics,
  sortReportsNewestFirst,
  parseCookies,
  safeTextEqual,
  FIRE_TYPES,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  MAX_CITY_LENGTH,
  MAX_LOCATION_DESCRIPTION_LENGTH,
});
