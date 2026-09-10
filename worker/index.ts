const ADMIN_COOKIE_NAME = 'firesighter_admin_session';
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_BYTES = 7 * 1024 * 1024;
const MAX_CITY_LENGTH = 120;
const MAX_LOCATION_DESCRIPTION_LENGTH = 600;
const FIRE_TYPES = ['residential', 'commercial', 'forest', 'other'] as const;

type FireType = (typeof FIRE_TYPES)[number];
type ReportStatus = 'pending' | 'verified';

interface ValidationIssue {
  field: string;
  message: string;
}

interface Report {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  locationDescription: string;
  lat: number;
  lng: number;
  photo: string;
  capturedAt: string;
  submittedAt: string;
  status: ReportStatus;
  fireType: FireType | null;
  otherDetail: string | null;
  verifiedAt: string | null;
  isDemo?: boolean;
  demoSeed?: string | null;
}

interface ReportRow {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  location_description: string;
  lat: number;
  lng: number;
  photo: string;
  evidence_key: string | null;
  captured_at: string;
  submitted_at: string;
  status: ReportStatus;
  fire_type: FireType | null;
  other_detail: string | null;
  verified_at: string | null;
  is_demo: number;
  demo_seed: string | null;
}

interface AnalyticsRow {
  address: string;
  city: string;
  lat: number;
  lng: number;
  captured_at: string;
  submitted_at: string;
  status: ReportStatus;
  fire_type: FireType | null;
}

interface SessionRow {
  username: string;
  expires_at: string;
}

interface DeleteRow {
  id: string;
  evidence_key: string | null;
}

interface RateLimitRow {
  hits: number;
}

interface ValidReportInput {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  locationDescription: string;
  lat: number;
  lng: number;
  capturedAt: string;
  photoMime: string;
  photoBytes: Uint8Array;
}

interface AdminSession {
  tokenHash: string;
  username: string;
  expiresAt: string;
}

const REPORT_SELECT = `
  SELECT id, first_name, last_name, address, city, location_description,
         lat, lng, photo, evidence_key, captured_at, submitted_at, status,
         fire_type, other_detail, verified_at, is_demo, demo_seed
  FROM reports
`;

const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ValidationIssue[];
  readonly headers?: HeadersInit;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ValidationIssue[],
    headers?: HeadersInit,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return '';
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function runtimeString(env: Cloudflare.Env, key: string): string {
  const value: unknown = Reflect.get(env, key);
  return typeof value === 'string' ? value.trim() : '';
}

function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(JSON.stringify(payload), { status, headers });
}

function errorResponse(error: HttpError): Response {
  const payload: { error: string; message: string; details?: ValidationIssue[] } = {
    error: error.code,
    message: error.message,
  };
  if (error.details) payload.details = error.details;
  return jsonResponse(payload, error.status, error.headers);
}

function secureAssetResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if ((headers.get('Content-Type') || '').toLowerCase().includes('text/html')) {
    headers.set('Cache-Control', 'no-cache');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function ensureSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, 'forbidden_origin', 'Cross-origin requests are not allowed.');
  }
}

function requireJsonContentType(request: Request): void {
  const mediaType = (request.headers.get('Content-Type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType !== 'application/json' && !mediaType.endsWith('+json')) {
    throw new HttpError(
      415,
      'unsupported_media_type',
      'Content-Type must be application/json.',
    );
  }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  requireJsonContentType(request);
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, 'payload_too_large', 'The request payload is too large.');
  }
  if (!request.body) {
    throw new HttpError(400, 'invalid_json', 'Request body contains invalid JSON.');
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'payload_too_large', 'The request payload is too large.');
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body contains invalid JSON.');
  }
  if (!isRecord(parsed)) {
    throw new HttpError(400, 'validation_error', 'A JSON object is required.', [
      { field: 'body', message: 'A JSON object is required.' },
    ]);
  }
  return parsed;
}

function decodePhotoDataUrl(value: unknown): {
  mime: string;
  bytes: Uint8Array;
  error?: string;
} {
  if (typeof value !== 'string') {
    return {
      mime: '',
      bytes: new Uint8Array(),
      error: 'A photo captured with the camera is required.',
    };
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    return {
      mime: '',
      bytes: new Uint8Array(),
      error: 'Photo must be a JPEG, PNG, or WebP camera image data URL.',
    };
  }

  const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0;
  const estimatedBytes = (match[2].length / 4) * 3 - padding;
  if (estimatedBytes < 1) {
    return { mime: '', bytes: new Uint8Array(), error: 'The captured photo is empty.' };
  }
  if (estimatedBytes > MAX_PHOTO_BYTES) {
    return {
      mime: '',
      bytes: new Uint8Array(),
      error: 'The captured photo must be smaller than 7 MB.',
    };
  }

  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return {
      mime: '',
      bytes: new Uint8Array(),
      error: 'Photo must be a JPEG, PNG, or WebP camera image data URL.',
    };
  }
  if (binary.length !== estimatedBytes) {
    return {
      mime: '',
      bytes: new Uint8Array(),
      error: 'Photo must be a JPEG, PNG, or WebP camera image data URL.',
    };
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { mime: match[1].toLowerCase(), bytes };
}

function validateReportInput(body: Record<string, unknown>): ValidReportInput {
  const errors: ValidationIssue[] = [];
  const location = isRecord(body.location) ? body.location : {};
  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const address = cleanString(firstString(body.address, location.address));
  const city = cleanString(firstString(body.city, location.city));
  const locationDescription = cleanString(body.locationDescription);
  const lat = parseCoordinate(body.lat ?? body.latitude ?? location.lat ?? location.latitude);
  const lng = parseCoordinate(body.lng ?? body.longitude ?? location.lng ?? location.longitude);
  const capturedAtInput = firstString(body.capturedAt, body.photoCapturedAt);
  const capturedDate = new Date(capturedAtInput);
  const photo = decodePhotoDataUrl(
    firstString(body.photo, body.photoDataUrl, body.imageDataUrl, body.image),
  );

  if (!firstName) errors.push({ field: 'firstName', message: 'First name is required.' });
  else if (firstName.length > 80) {
    errors.push({ field: 'firstName', message: 'First name is too long.' });
  }
  if (!lastName) errors.push({ field: 'lastName', message: 'Last name is required.' });
  else if (lastName.length > 80) {
    errors.push({ field: 'lastName', message: 'Last name is too long.' });
  }
  if (!address) {
    errors.push({ field: 'address', message: 'A fire location address is required.' });
  } else if (address.length > 300) {
    errors.push({ field: 'address', message: 'Address is too long.' });
  }
  if (!city) {
    errors.push({ field: 'city', message: 'A city or municipality is required.' });
  } else if (city.length > MAX_CITY_LENGTH) {
    errors.push({ field: 'city', message: 'City or municipality is too long.' });
  }
  if (!locationDescription) {
    errors.push({
      field: 'locationDescription',
      message: 'A brief description of the fire location is required.',
    });
  } else if (locationDescription.length > MAX_LOCATION_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'locationDescription',
      message: `Location description must be ${MAX_LOCATION_DESCRIPTION_LENGTH} characters or fewer.`,
    });
  }
  if (lat === null || lat < -90 || lat > 90) {
    errors.push({ field: 'lat', message: 'Latitude must be between -90 and 90.' });
  }
  if (lng === null || lng < -180 || lng > 180) {
    errors.push({ field: 'lng', message: 'Longitude must be between -180 and 180.' });
  }
  if (photo.error) errors.push({ field: 'photo', message: photo.error });
  if (!capturedAtInput || Number.isNaN(capturedDate.getTime())) {
    errors.push({
      field: 'capturedAt',
      message: 'A valid photo capture date and time is required.',
    });
  }

  if (errors.length > 0 || lat === null || lng === null) {
    throw new HttpError(
      400,
      'validation_error',
      'Please correct the report fields and try again.',
      errors,
    );
  }

  return {
    firstName,
    lastName,
    address,
    city,
    locationDescription,
    lat,
    lng,
    capturedAt: capturedDate.toISOString(),
    photoMime: photo.mime,
    photoBytes: photo.bytes,
  };
}

function normalizeFireType(value: unknown): string {
  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (normalized === 'forest fire') return 'forest';
  if (normalized === 'others') return 'other';
  return normalized;
}

function validateVerificationInput(body: Record<string, unknown>): {
  fireType: FireType;
  otherDetail: string | null;
} {
  const errors: ValidationIssue[] = [];
  const normalizedType = normalizeFireType(
    firstString(body.fireType, body.type, body.incidentType, body.category),
  );
  const otherDetail = cleanString(
    firstString(body.otherDetail, body.otherType, body.typeDetail, body.details),
  );

  if (!FIRE_TYPES.includes(normalizedType as FireType)) {
    errors.push({
      field: 'fireType',
      message: `Fire type must be one of: ${FIRE_TYPES.join(', ')}.`,
    });
  }
  if (normalizedType === 'other' && !otherDetail) {
    errors.push({ field: 'otherDetail', message: 'Please describe the other type of fire.' });
  }
  if (otherDetail.length > 160) {
    errors.push({ field: 'otherDetail', message: 'Other fire type detail is too long.' });
  }
  if (errors.length > 0) {
    throw new HttpError(
      400,
      'validation_error',
      'Choose a valid fire type before verifying the report.',
      errors,
    );
  }

  const fireType = normalizedType as FireType;
  return { fireType, otherDetail: fireType === 'other' ? otherDetail : null };
}

function reportFromRow(row: ReportRow): Report {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    address: row.address,
    city: row.city,
    locationDescription: row.location_description,
    lat: Number(row.lat),
    lng: Number(row.lng),
    photo: row.photo,
    capturedAt: row.captured_at,
    submittedAt: row.submitted_at,
    status: row.status,
    fireType: row.fire_type,
    otherDetail: row.other_detail,
    verifiedAt: row.verified_at,
    ...(row.is_demo ? { isDemo: true, demoSeed: row.demo_seed } : {}),
  };
}

function titleCaseFireType(type: FireType): string {
  if (type === 'forest') return 'Forest fire';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function aggregateAnalytics(rows: AnalyticsRow[]): Record<string, unknown> {
  const totals = { reports: rows.length, pending: 0, verified: 0, incidents: 0 };
  const months = new Map<string, { month: string; reports: number; incidents: number }>();
  const types = new Map<FireType, number>();
  const cities = new Map<string, { city: string; reports: number; incidents: number }>();
  const hotspotGroups = new Map<
    string,
    { address: string; lat: number | null; lng: number | null; reports: number; incidents: number }
  >();

  for (const row of rows) {
    const verified = row.status === 'verified';
    if (verified) {
      totals.verified += 1;
      totals.incidents += 1;
    } else {
      totals.pending += 1;
    }

    const reportDate = new Date(row.submitted_at || row.captured_at);
    if (!Number.isNaN(reportDate.getTime())) {
      const month = reportDate.toISOString().slice(0, 7);
      const current = months.get(month) || { month, reports: 0, incidents: 0 };
      current.reports += 1;
      if (verified) current.incidents += 1;
      months.set(month, current);
    }

    if (verified) {
      const fireType = FIRE_TYPES.includes(row.fire_type as FireType)
        ? (row.fire_type as FireType)
        : 'other';
      types.set(fireType, (types.get(fireType) || 0) + 1);
    }

    const city = cleanString(row.city) || 'Unknown city';
    const cityKey = city.toLowerCase();
    const cityCounts = cities.get(cityKey) || { city, reports: 0, incidents: 0 };
    cityCounts.reports += 1;
    if (verified) cityCounts.incidents += 1;
    cities.set(cityKey, cityCounts);

    const address = cleanString(row.address) || 'Unknown location';
    const lat = parseCoordinate(row.lat);
    const lng = parseCoordinate(row.lng);
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

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of String(header || '').split(';')) {
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

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

async function hashToken(token: string): Promise<string> {
  return bytesToHex(await sha256(token));
}

async function safeTextEqual(received: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(received), sha256(expected)]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

async function enforceRateLimit(
  request: Request,
  env: Cloudflare.Env,
  scope: string,
  maximumHits: number,
  windowSeconds: number,
): Promise<void> {
  const clientAddress = cleanString(request.headers.get('CF-Connecting-IP')) || 'unavailable';
  const fingerprint = bytesToHex(await sha256(clientAddress)).slice(0, 32);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const expiresAt = windowStart + windowSeconds;
  const key = `${scope}:${windowStart}:${fingerprint}`;

  await env.DB.prepare('DELETE FROM request_limits WHERE expires_at <= ?')
    .bind(nowSeconds)
    .run();
  const result = await env.DB.prepare(`
    INSERT INTO request_limits (key, hits, expires_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      hits = request_limits.hits + 1,
      expires_at = excluded.expires_at
    RETURNING hits
  `)
    .bind(key, expiresAt)
    .all<RateLimitRow>();
  const hits = Number(result.results?.[0]?.hits || 0);
  if (hits > maximumHits) {
    throw new HttpError(
      429,
      'rate_limit_exceeded',
      'Too many requests. Please wait before trying again.',
      undefined,
      { 'Retry-After': String(Math.max(1, expiresAt - nowSeconds)) },
    );
  }
}

function sessionTtlMs(env: Cloudflare.Env): number {
  const configured = Number(runtimeString(env, 'ADMIN_SESSION_TTL_MS'));
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SESSION_TTL_MS;
}

function sessionCookie(token: string, maxAgeMs: number, secure: boolean): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function clearSessionCookie(secure: boolean): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

async function currentSession(request: Request, env: Cloudflare.Env): Promise<AdminSession | null> {
  const token = parseCookies(request.headers.get('Cookie'))[ADMIN_COOKIE_NAME];
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare(
    'SELECT username, expires_at FROM admin_sessions WHERE token_hash = ?',
  )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row) return null;

  const expiresAtMs = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }
  return { tokenHash, username: row.username, expiresAt: row.expires_at };
}

async function requireAdmin(request: Request, env: Cloudflare.Env): Promise<AdminSession> {
  const session = await currentSession(request, env);
  if (!session) {
    throw new HttpError(
      401,
      'authentication_required',
      'Admin login is required.',
      undefined,
      { 'Set-Cookie': clearSessionCookie(new URL(request.url).protocol === 'https:') },
    );
  }
  return session;
}

function decodeRouteId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError(400, 'invalid_route_parameter', 'The report identifier is invalid.');
  }
}

async function listReports(env: Cloudflare.Env, verifiedOnly = false): Promise<Report[]> {
  const where = verifiedOnly ? "WHERE status = 'verified'" : '';
  const result = await env.DB.prepare(
    `${REPORT_SELECT} ${where} ORDER BY submitted_at DESC, id DESC`,
  ).all<ReportRow>();
  return (result.results || []).map(reportFromRow);
}

async function handleLogin(request: Request, env: Cloudflare.Env): Promise<Response> {
  ensureSameOrigin(request);
  await enforceRateLimit(request, env, 'admin-login', 10, 15 * 60);
  const body = await readJsonObject(request);
  const expectedUsername = runtimeString(env, 'ADMIN_USERNAME');
  const expectedPassword = runtimeString(env, 'ADMIN_PASSWORD');
  if (!expectedUsername || !expectedPassword) {
    throw new HttpError(
      503,
      'configuration_error',
      'Admin login is not configured for this deployment.',
    );
  }

  const username = cleanString(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  const [usernameMatches, passwordMatches] = await Promise.all([
    safeTextEqual(username, expectedUsername),
    safeTextEqual(password, expectedPassword),
  ]);
  if (!usernameMatches || !passwordMatches) {
    throw new HttpError(401, 'invalid_credentials', 'Invalid username or password.');
  }

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = encodeBase64Url(tokenBytes);
  const tokenHash = await hashToken(token);
  const ttlMs = sessionTtlMs(env);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  await env.DB.batch([
    env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now.toISOString()),
    env.DB.prepare(
      'INSERT INTO admin_sessions (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)',
    ).bind(tokenHash, expectedUsername, expiresAt, now.toISOString()),
  ]);

  return jsonResponse(
    { authenticated: true, username: expectedUsername, expiresAt },
    200,
    {
      'Set-Cookie': sessionCookie(
        token,
        ttlMs,
        new URL(request.url).protocol === 'https:',
      ),
    },
  );
}

async function handleLogout(request: Request, env: Cloudflare.Env): Promise<Response> {
  ensureSameOrigin(request);
  const token = parseCookies(request.headers.get('Cookie'))[ADMIN_COOKIE_NAME];
  if (token) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
      .bind(await hashToken(token))
      .run();
  }
  return jsonResponse(
    { authenticated: false },
    200,
    { 'Set-Cookie': clearSessionCookie(new URL(request.url).protocol === 'https:') },
  );
}

async function handleSession(request: Request, env: Cloudflare.Env): Promise<Response> {
  const session = await currentSession(request, env);
  if (!session) {
    return jsonResponse(
      { authenticated: false },
      200,
      { 'Set-Cookie': clearSessionCookie(new URL(request.url).protocol === 'https:') },
    );
  }
  return jsonResponse({
    authenticated: true,
    username: session.username,
    expiresAt: session.expiresAt,
  });
}

async function handleCreateReport(request: Request, env: Cloudflare.Env): Promise<Response> {
  ensureSameOrigin(request);
  await enforceRateLimit(request, env, 'public-report', 12, 10 * 60);
  const input = validateReportInput(await readJsonObject(request));
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const extension = input.photoMime === 'image/jpeg' ? 'jpg' : input.photoMime.split('/')[1];
  const evidenceKey = `reports/${id}/evidence.${extension}`;
  const photo = `/api/evidence/${encodeURIComponent(id)}`;

  await env.EVIDENCE.put(evidenceKey, input.photoBytes, {
    httpMetadata: { contentType: input.photoMime, cacheControl: 'private, no-store' },
    customMetadata: { reportId: id },
  });

  try {
    await env.DB.prepare(`
      INSERT INTO reports (
        id, first_name, last_name, address, city, location_description, lat, lng,
        photo, evidence_key, captured_at, submitted_at, status, fire_type,
        other_detail, verified_at, is_demo, demo_seed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, 0, NULL)
    `)
      .bind(
        id,
        input.firstName,
        input.lastName,
        input.address,
        input.city,
        input.locationDescription,
        input.lat,
        input.lng,
        photo,
        evidenceKey,
        input.capturedAt,
        submittedAt,
      )
      .run();
  } catch (error) {
    await env.EVIDENCE.delete(evidenceKey);
    throw error;
  }

  const report: Report = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    address: input.address,
    city: input.city,
    locationDescription: input.locationDescription,
    lat: input.lat,
    lng: input.lng,
    photo,
    capturedAt: input.capturedAt,
    submittedAt,
    status: 'pending',
    fireType: null,
    otherDetail: null,
    verifiedAt: null,
  };
  return jsonResponse(
    { message: 'Fire report submitted for admin verification.', report },
    201,
  );
}

async function handleVerifyReport(
  request: Request,
  env: Cloudflare.Env,
  routeId: string,
): Promise<Response> {
  ensureSameOrigin(request);
  await requireAdmin(request, env);
  const input = validateVerificationInput(await readJsonObject(request));
  const id = decodeRouteId(routeId);
  const verifiedAt = new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE reports
       SET status = 'verified', fire_type = ?, other_detail = ?, verified_at = ?
     WHERE id = ?
     RETURNING id, first_name, last_name, address, city, location_description,
               lat, lng, photo, evidence_key, captured_at, submitted_at, status,
               fire_type, other_detail, verified_at, is_demo, demo_seed
  `)
    .bind(input.fireType, input.otherDetail, verifiedAt, id)
    .all<ReportRow>();
  const row = result.results?.[0];
  if (!row) throw new HttpError(404, 'report_not_found', 'Report not found.');
  return jsonResponse({
    message: 'Report verified and published as an incident.',
    report: reportFromRow(row),
  });
}

async function handleDeleteReport(
  request: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  routeId: string,
): Promise<Response> {
  ensureSameOrigin(request);
  await requireAdmin(request, env);
  const id = decodeRouteId(routeId);
  const result = await env.DB.prepare(
    'DELETE FROM reports WHERE id = ? RETURNING id, evidence_key',
  )
    .bind(id)
    .all<DeleteRow>();
  const removed = result.results?.[0];
  if (!removed) throw new HttpError(404, 'report_not_found', 'Report not found.');
  if (removed.evidence_key) {
    ctx.waitUntil(
      env.EVIDENCE.delete(removed.evidence_key).catch((error: unknown) => {
        console.error(
          JSON.stringify({
            event: 'evidence_cleanup_failed',
            reportId: id,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }),
    );
  }
  return jsonResponse({ message: 'Report deleted.', id: removed.id });
}

async function handleIncidentDetail(env: Cloudflare.Env, routeId: string): Promise<Response> {
  const id = decodeRouteId(routeId);
  const row = await env.DB.prepare(
    `${REPORT_SELECT} WHERE id = ? AND status = 'verified'`,
  )
    .bind(id)
    .first<ReportRow>();
  if (!row) throw new HttpError(404, 'incident_not_found', 'Incident not found.');
  return jsonResponse({ incident: reportFromRow(row) });
}

async function handleEvidence(
  request: Request,
  env: Cloudflare.Env,
  routeId: string,
): Promise<Response> {
  const id = decodeRouteId(routeId);
  const row = await env.DB.prepare(
    'SELECT status, evidence_key FROM reports WHERE id = ?',
  )
    .bind(id)
    .first<{ status: ReportStatus; evidence_key: string | null }>();
  if (!row?.evidence_key) {
    throw new HttpError(404, 'evidence_not_found', 'Evidence image not found.');
  }
  if (row.status !== 'verified' && !(await currentSession(request, env))) {
    throw new HttpError(404, 'evidence_not_found', 'Evidence image not found.');
  }

  const object = await env.EVIDENCE.get(row.evidence_key);
  if (!object) throw new HttpError(404, 'evidence_not_found', 'Evidence image not found.');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Length', String(object.size));
  headers.set('ETag', object.httpEtag);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(object.body, { headers });
}

async function handleAnalytics(env: Cloudflare.Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT address, city, lat, lng, captured_at, submitted_at, status, fire_type
      FROM reports
  `).all<AnalyticsRow>();
  return jsonResponse(aggregateAnalytics(result.results || []));
}

async function dispatch(
  request: Request,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method === 'POST' && pathname === '/api/admin/login') return handleLogin(request, env);
  if (method === 'POST' && pathname === '/api/admin/logout') return handleLogout(request, env);
  if (method === 'GET' && pathname === '/api/admin/session') return handleSession(request, env);
  if (method === 'POST' && pathname === '/api/reports') return handleCreateReport(request, env);

  if (method === 'GET' && pathname === '/api/admin/reports') {
    await requireAdmin(request, env);
    const reports = await listReports(env);
    return jsonResponse({ reports, count: reports.length });
  }

  const verifyMatch = /^\/api\/admin\/reports\/([^/]+)\/verify$/.exec(pathname);
  if (method === 'PATCH' && verifyMatch) {
    return handleVerifyReport(request, env, verifyMatch[1]);
  }
  const reportMatch = /^\/api\/admin\/reports\/([^/]+)$/.exec(pathname);
  if (method === 'DELETE' && reportMatch) {
    return handleDeleteReport(request, env, ctx, reportMatch[1]);
  }

  if (method === 'GET' && pathname === '/api/incidents') {
    const incidents = await listReports(env, true);
    return jsonResponse({ incidents, count: incidents.length });
  }
  const incidentMatch = /^\/api\/incidents\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && incidentMatch) return handleIncidentDetail(env, incidentMatch[1]);

  const evidenceMatch = /^\/api\/evidence\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && evidenceMatch) {
    return handleEvidence(request, env, evidenceMatch[1]);
  }
  if (method === 'GET' && pathname === '/api/analytics') return handleAnalytics(env);
  if (method === 'GET' && pathname === '/api/config') {
    return jsonResponse({ googleMapsApiKey: runtimeString(env, 'GOOGLE_MAPS_API_KEY') });
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    throw new HttpError(
      404,
      'api_route_not_found',
      `No API route exists for ${method} ${pathname}.`,
    );
  }

  return secureAssetResponse(await env.ASSETS.fetch(request));
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const requestId = crypto.randomUUID();
    try {
      return await dispatch(request, env, ctx);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      const url = new URL(request.url);
      console.error(
        JSON.stringify({
          event: 'request_failed',
          requestId,
          method: request.method,
          pathname: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return errorResponse(
        new HttpError(500, 'internal_error', 'An unexpected server error occurred.'),
      );
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
