(() => {
  'use strict';

  const pageRoot = document.querySelector('#page-root');
  const mainContent = document.querySelector('#main-content');
  const toastRegion = document.querySelector('#toast-region');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  const FIRE_TYPES = {
    residential: 'Residential fire',
    commercial: 'Commercial fire',
    forest: 'Forest fire',
    other: 'Other',
  };

  const DEMO_PHOTO_CREDITS = Object.freeze({
    'firesighter-demo-v1-01': { creator: 'Gerswin', source: 'https://commons.wikimedia.org/wiki/File%3APlaza_de_roma.JPG', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File%3APlaza_de_roma.JPG#Licensing' },
    'firesighter-demo-v1-02': { creator: 'Arius1998', source: 'https://commons.wikimedia.org/wiki/File%3AOverview_of_the_Quezon_Memorial_Circle.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    'firesighter-demo-v1-03': { creator: 'Ralff Nestor Nacor', source: 'https://commons.wikimedia.org/wiki/File%3AHinulugang_Taktak_Falls%2C_Antipolo%2C_Rizal_%282%29.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    'firesighter-demo-v1-04': { creator: 'Ralff Nestor Nacor', source: 'https://commons.wikimedia.org/wiki/File%3APasig_City_Hall%2C_Feb_2024.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    'firesighter-demo-v1-05': { creator: 'Ralff Nestor Nacor', source: 'https://commons.wikimedia.org/wiki/File%3AAyala_Triangle_Skyline%2C_Makati%2C_Feb_2026.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    'firesighter-demo-v1-06': { creator: 'Hans Olav Lien', source: 'https://commons.wikimedia.org/wiki/File%3ABonifacio_High_Street%2C_Metro_Manila.jpg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File%3ABonifacio_High_Street%2C_Metro_Manila.jpg#Licensing' },
    'firesighter-demo-v1-07': { creator: 'Judgefloro', source: 'https://commons.wikimedia.org/wiki/File%3A0611jf_Marikina_River_Park_fvf_18.jpg', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    'firesighter-demo-v1-08': { creator: 'Ralff Nestor Nacor', source: 'https://commons.wikimedia.org/wiki/File%3ACaloocan_City_Hall%2C_June_2023_%282%29.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    'firesighter-demo-v1-09': { creator: 'Vyacheslav Argenberg', source: 'https://commons.wikimedia.org/wiki/File%3AManila%2C_Rizal_Park_skyline%2C_Philippines.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    'firesighter-demo-v1-10': { creator: 'Ralff Nestor Nacor', source: 'https://commons.wikimedia.org/wiki/File%3AView_of_Araneta_City_from_MRT-3_Cubao%2C_Q.C.%2C_Mar_2026.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  });

  const STAFF = [
    { initials: 'ER', name: 'Elena Ramos', role: 'Station Commander', station: 'Central Fire Station', shift: 'Day command', extension: '101' },
    { initials: 'MS', name: 'Miguel Santos', role: 'Operations Officer', station: 'Central Fire Station', shift: 'Alpha shift', extension: '114' },
    { initials: 'LV', name: 'Lara Villanueva', role: 'Incident Verification Lead', station: 'North Fire Station', shift: 'Bravo shift', extension: '208' },
    { initials: 'CM', name: 'Carlo Mendoza', role: 'Dispatch & Communications', station: 'Central Fire Station', shift: 'Alpha shift', extension: '120' },
    { initials: 'NB', name: 'Nina Bautista', role: 'Emergency Medical Responder', station: 'South Fire Station', shift: 'Charlie shift', extension: '305' },
    { initials: 'RC', name: 'Ramon Cruz', role: 'Fire Prevention Officer', station: 'East Fire Station', shift: 'Community desk', extension: '412' },
  ];

  const state = {
    config: null,
    authenticated: false,
    cameraStream: null,
    capturedPhoto: '',
    capturedAt: '',
    selectedLocation: null,
    reports: [],
    routeVersion: 0,
  };

  const icons = {
    alert: '<path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    camera: '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    flame: '<path d="M12 22c4.4 0 8-3.1 8-7.5 0-3.1-1.7-5.8-4.8-8.2.1 2.2-.6 3.7-1.7 4.8.1-3.7-1.9-6.5-5-9.1.1 3.1-1.7 5.1-3 7.1C4.2 10.8 4 12.4 4 14.5 4 18.9 7.6 22 12 22Z"/><path d="M9.5 18.5c0-1.8 1-3.1 2.5-4.5 1.5 1.4 2.5 2.7 2.5 4.5"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2V0M12 24v-2M2 12H0M24 12h-2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    trash: '<path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  };

  function icon(name, className = '') {
    return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value, options = {}) {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not recorded';
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: options.short ? 'short' : 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...options,
    }).format(date);
  }

  function formatMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(month || '')) return month || '';
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`));
  }

  function formatDateOnly(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  function formatTimeOnly(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)} PHT`;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-PH').format(Number(value) || 0);
  }

  function fireTypeLabel(reportOrType) {
    if (typeof reportOrType === 'string') return FIRE_TYPES[reportOrType] || reportOrType;
    const report = reportOrType || {};
    if (report.fireType === 'other' && (report.otherFireType || report.otherDetail)) {
      return report.otherFireType || report.otherDetail;
    }
    return FIRE_TYPES[report.fireType] || 'Awaiting classification';
  }

  function reportId(value) {
    if (!value) return '—';
    return String(value).toUpperCase();
  }

  function demoPhotoCredit(report, compact = false) {
    const credit = DEMO_PHOTO_CREDITS[report?.id];
    if (!credit) return '';
    const context = compact ? 'Demo location image' : 'Illustrative demo location image — not submitted fire evidence';
    return `<span class="demo-photo-credit">${context}: <a href="${credit.source}" target="_blank" rel="noopener">${escapeHtml(credit.creator)}</a> · <a href="${credit.licenseUrl}" target="_blank" rel="noopener">${escapeHtml(credit.license)}</a></span>`;
  }

  function reportPhotoAlt(report) {
    if (DEMO_PHOTO_CREDITS[report?.id]) {
      return `Demo location view of ${report.city || report.address || 'the report area'}`;
    }
    return `Fire evidence from ${report.firstName || ''} ${report.lastName || ''}`.trim();
  }

  function mapsUrl(item) {
    const lat = Number(item?.lat ?? item?.latitude);
    const lng = Number(item?.lng ?? item?.longitude);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  async function api(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetch(path, { credentials: 'same-origin', ...options, headers });
    } catch (_error) {
      throw new Error('FireSighter could not reach the server. Check your connection and try again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.details = payload?.details;
      throw error;
    }
    return payload;
  }

  function toast(message, tone = 'success') {
    const node = document.createElement('div');
    node.className = `toast toast-${tone}`;
    node.innerHTML = `${icon(tone === 'success' ? 'check' : 'alert')}<span>${escapeHtml(message)}</span>`;
    toastRegion.append(node);
    requestAnimationFrame(() => node.classList.add('toast-visible'));
    window.setTimeout(() => {
      node.classList.remove('toast-visible');
      window.setTimeout(() => node.remove(), 250);
    }, 4200);
  }

  function loadingPage(message = 'Loading…') {
    pageRoot.innerHTML = `
      <div class="page container loading-state">
        <div class="spinner" aria-hidden="true"></div>
        <p>${escapeHtml(message)}</p>
      </div>`;
  }

  function errorPage(title, message, retryHash = '') {
    pageRoot.innerHTML = `
      <section class="page container narrow-page">
        <div class="error-state card">
          <span class="state-icon">${icon('alert')}</span>
          <p class="eyebrow">Something went wrong</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
          ${retryHash ? `<a class="button button-primary" href="${escapeHtml(retryHash)}">Try again</a>` : ''}
        </div>
      </section>`;
  }

  function emptyState(title, message, action = '') {
    return `
      <div class="empty-state card">
        <span class="state-icon">${icon('file')}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        ${action}
      </div>`;
  }

  function updateNavigation(section) {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      const key = link.dataset.nav;
      const active = key === section || (key === 'admin' && section === 'admin');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    const adminLink = document.querySelector('.admin-nav-link');
    if (adminLink) {
      adminLink.textContent = state.authenticated ? 'Admin home' : 'Admin login';
      adminLink.href = state.authenticated ? '#/admin/home' : '#/admin/login';
    }
  }

  function closeMobileNavigation() {
    navToggle?.setAttribute('aria-expanded', 'false');
    navLinks?.classList.remove('nav-open');
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
    }
  }

  function cleanupPage() {
    stopCamera();
    state.capturedPhoto = '';
    state.capturedAt = '';
    state.selectedLocation = null;
  }

  async function ensureConfig() {
    if (state.config) return state.config;
    try {
      state.config = (await api('/api/config')) || {};
    } catch (_error) {
      state.config = {};
    }
    return state.config;
  }

  async function refreshSession() {
    try {
      const session = await api('/api/admin/session');
      state.authenticated = Boolean(session?.authenticated);
    } catch (_error) {
      state.authenticated = false;
    }
  }

  function reportPageTemplate() {
    return `
      <section class="page report-section report-page">
        <div class="container">
          <div class="report-layout">
          <form id="report-form" class="report-form" novalidate>
            <div class="form-heading">
              <div>
                <p class="eyebrow">New fire report</p>
                <h2>Tell us what you can see</h2>
                <p>Fields marked <span aria-hidden="true">*</span><span class="sr-only">required</span> are required.</p>
              </div>
              <span class="secure-note">${icon('shield')} Evidence protected</span>
            </div>

            <div class="report-form-columns">
              <div class="report-form-column report-form-column-primary">
            <fieldset class="form-step card">
              <legend><span class="step-number">1</span><span><strong>Reporter details</strong><small>Who is sending this report?</small></span></legend>
              <div class="form-grid two-columns">
                <label class="field">
                  <span>First name <b aria-hidden="true">*</b></span>
                  <input id="first-name" name="firstName" type="text" autocomplete="given-name" maxlength="60" required placeholder="Juan" />
                </label>
                <label class="field">
                  <span>Last name <b aria-hidden="true">*</b></span>
                  <input id="last-name" name="lastName" type="text" autocomplete="family-name" maxlength="60" required placeholder="Dela Cruz" />
                </label>
              </div>
            </fieldset>

            <fieldset class="form-step card">
              <legend><span class="step-number">2</span><span><strong>Fire location</strong><small>Detect the location from this device.</small></span></legend>
              <div id="detected-location-panel" class="detected-location-panel">
                <div class="detected-location-header">
                  <div>
                    <h3>Detect current location</h3>
                    <p>Allow location access to automatically fill the address, city, and coordinates.</p>
                  </div>
                  <button id="use-location" class="button button-secondary" type="button">${icon('locate')} Use my location</button>
                </div>
                <p id="location-message" class="field-message" aria-live="polite">Location has not been detected yet.</p>
                <div class="detected-location-fields">
                  <label class="field">
                    <span>Detected address</span>
                    <input id="detected-address" type="text" readonly placeholder="Filled after using your location" />
                  </label>
                  <label class="field">
                    <span>City / municipality</span>
                    <input id="detected-city" type="text" readonly placeholder="Filled automatically" />
                  </label>
                  <label class="field">
                    <span>Coordinates</span>
                    <input id="coordinates-display" type="text" readonly placeholder="Latitude, longitude" />
                  </label>
                </div>
                <a id="detected-maps-link" class="text-link detected-location-note" href="#" target="_blank" rel="noopener" hidden>${icon('pin')} Review detected point in Google Maps ${icon('arrow')}</a>
              </div>
              <label class="field location-description full-width">
                <span>Location description <b aria-hidden="true">*</b></span>
                <input id="location-description" name="locationDescription" type="text" maxlength="600" required placeholder="e.g. Behind the public market, beside the blue warehouse" />
                <small>Describe a nearby landmark or where the fire can be seen.</small>
              </label>
              <input id="latitude" name="lat" type="hidden" />
              <input id="longitude" name="lng" type="hidden" />
              <input id="resolved-address" name="address" type="hidden" />
              <input id="resolved-city" name="city" type="hidden" />
            </fieldset>

              </div>
              <div class="report-form-column report-form-column-evidence">

            <fieldset class="form-step card">
              <legend><span class="step-number">3</span><span><strong>Live fire photo</strong><small>Capture what the camera sees right now.</small></span></legend>
              <div class="camera-policy">${icon('shield')} For report integrity, gallery uploads are disabled. FireSighter only captures a live camera frame.</div>
              <div id="camera-stage" class="camera-stage">
                <div id="camera-placeholder" class="camera-placeholder">
                  <span>${icon('camera')}</span>
                  <strong>Camera is off</strong>
                  <p>Allow camera access, frame what the camera currently sees, then take the photo.</p>
                </div>
                <video id="camera-preview" playsinline autoplay muted hidden></video>
                <img id="captured-photo" alt="Your captured fire evidence" hidden />
                <canvas id="capture-canvas" hidden></canvas>
              </div>
              <div class="camera-actions">
                <button id="start-camera" class="button button-secondary" type="button">${icon('camera')} Open camera</button>
                <button id="capture-photo" class="button button-primary" type="button" hidden>${icon('camera')} Take photo</button>
                <button id="retake-photo" class="button button-secondary" type="button" hidden>Retake photo</button>
              </div>
              <p id="camera-message" class="field-message" aria-live="polite"></p>
              <div class="capture-date-time">
                <label class="field capture-time-field">
                  <span>Date captured</span>
                  <span class="input-with-icon">${icon('clock')}<input id="capture-date" type="text" readonly placeholder="Filled after taking a photo" /></span>
                </label>
                <label class="field capture-time-field">
                  <span>Time captured</span>
                  <span class="input-with-icon">${icon('clock')}<input id="capture-time" type="text" readonly placeholder="Filled after taking a photo" /></span>
                </label>
              </div>
            </fieldset>

              </div>
            </div>

            <div class="report-consent card">
              <label class="checkbox-field">
                <input id="accuracy-check" type="checkbox" required />
                <span>I confirm this report is accurate to the best of my knowledge and the photo was captured just now.</span>
              </label>
              <button id="submit-report" class="button button-primary button-large" type="submit">
                ${icon('flame')} Submit fire report
              </button>
            </div>
          </form>
          </div>
        </div>
      </section>`;
  }

  function renderReportPage() {
    updateNavigation('report');
    pageRoot.innerHTML = reportPageTemplate();
    bindReportForm();
  }

  async function reverseGeocodeDetails(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Reverse geocoding failed.');
      const result = await response.json();
      const addressParts = result.address || {};
      const city = addressParts.city
        || addressParts.municipality
        || addressParts.town
        || addressParts.village
        || addressParts.county
        || addressParts.state_district
        || addressParts.state
        || 'Unknown city';
      return {
        address: result.display_name || `Coordinates ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city,
      };
    } catch (_error) {
      return {
        address: `Coordinates ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: 'Unknown city',
      };
    }
  }

  function applyDetectedLocation({ lat, lng, address, city }) {
    state.selectedLocation = { lat, lng, address, city };
    document.querySelector('#detected-address').value = address;
    document.querySelector('#detected-city').value = city;
    document.querySelector('#coordinates-display').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.querySelector('#latitude').value = String(lat);
    document.querySelector('#longitude').value = String(lng);
    document.querySelector('#resolved-address').value = address;
    document.querySelector('#resolved-city').value = city;
    const link = document.querySelector('#detected-maps-link');
    link.href = mapsUrl({ lat, lng });
    link.hidden = false;
    document.querySelector('#detected-location-panel')?.classList.add('location-selected');
    const message = document.querySelector('#location-message');
    message.textContent = 'Location detected and locked to this device position.';
    message.className = 'field-message success-message';
  }

  function useCurrentLocation() {
    const button = document.querySelector('#use-location');
    const message = document.querySelector('#location-message');
    if (!navigator.geolocation) {
      message.textContent = 'Location access is not supported by this browser.';
      message.className = 'field-message error-message';
      return;
    }
    button.disabled = true;
    button.innerHTML = `${icon('locate')} Locating…`;
    message.textContent = 'Requesting your current location…';
    message.className = 'field-message';
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = Number(coords.latitude);
        const lng = Number(coords.longitude);
        const details = await reverseGeocodeDetails(lat, lng);
        applyDetectedLocation({ lat, lng, ...details });
        button.disabled = false;
        button.innerHTML = `${icon('locate')} Refresh my location`;
      },
      (error) => {
        message.textContent = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Enable it in your browser settings, then try again.'
          : 'Your current location could not be determined. Check location services, then try again.';
        message.className = 'field-message error-message';
        button.disabled = false;
        button.innerHTML = `${icon('locate')} Use my location`;
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function openCamera() {
    const video = document.querySelector('#camera-preview');
    const placeholder = document.querySelector('#camera-placeholder');
    const openButton = document.querySelector('#start-camera');
    const captureButton = document.querySelector('#capture-photo');
    const retakeButton = document.querySelector('#retake-photo');
    const photo = document.querySelector('#captured-photo');
    const message = document.querySelector('#camera-message');

    if (!navigator.mediaDevices?.getUserMedia) {
      message.textContent = 'Live camera capture requires HTTPS or localhost and a browser with camera support.';
      message.className = 'field-message error-message';
      return;
    }

    stopCamera();
    state.capturedPhoto = '';
    state.capturedAt = '';
    const dateInput = document.querySelector('#capture-date');
    const timeInput = document.querySelector('#capture-time');
    if (dateInput) dateInput.value = '';
    if (timeInput) timeInput.value = '';
    openButton.disabled = true;
    openButton.textContent = 'Opening camera…';
    message.textContent = '';
    try {
      state.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      video.srcObject = state.cameraStream;
      await video.play();
      placeholder.hidden = true;
      photo.hidden = true;
      video.hidden = false;
      openButton.hidden = true;
      openButton.disabled = false;
      openButton.innerHTML = `${icon('camera')} Open camera`;
      captureButton.hidden = false;
      retakeButton.hidden = true;
      message.textContent = 'Camera ready. Take the photo when the current view is framed.';
      message.className = 'field-message success-message';
    } catch (error) {
      openButton.hidden = false;
      openButton.disabled = false;
      openButton.innerHTML = `${icon('camera')} Try camera again`;
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      message.textContent = denied
        ? 'Camera permission was denied. Allow camera access in your browser settings, then try again.'
        : 'No usable camera was found. Check that another app is not using it, then try again.';
      message.className = 'field-message error-message';
    }
  }

  function capturePhoto() {
    const video = document.querySelector('#camera-preview');
    const canvas = document.querySelector('#capture-canvas');
    const photo = document.querySelector('#captured-photo');
    const captureButton = document.querySelector('#capture-photo');
    const retakeButton = document.querySelector('#retake-photo');
    const dateInput = document.querySelector('#capture-date');
    const timeInput = document.querySelector('#capture-time');
    const message = document.querySelector('#camera-message');

    if (!video || video.readyState < 2 || !video.videoWidth) {
      message.textContent = 'The camera is still starting. Wait a moment and try again.';
      message.className = 'field-message error-message';
      return;
    }
    const maxWidth = 1440;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d', { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
    state.capturedPhoto = canvas.toDataURL('image/jpeg', 0.82);
    state.capturedAt = new Date().toISOString();
    photo.src = state.capturedPhoto;
    photo.hidden = false;
    video.hidden = true;
    captureButton.hidden = true;
    retakeButton.hidden = false;
    dateInput.value = formatDateOnly(state.capturedAt);
    timeInput.value = formatTimeOnly(state.capturedAt);
    message.textContent = 'Live photo captured. Use Retake if the fire is not clearly visible.';
    message.className = 'field-message success-message';
    stopCamera();
  }

  function bindReportForm() {
    const form = document.querySelector('#report-form');
    document.querySelector('#use-location')?.addEventListener('click', useCurrentLocation);
    document.querySelector('#start-camera')?.addEventListener('click', openCamera);
    document.querySelector('#capture-photo')?.addEventListener('click', capturePhoto);
    document.querySelector('#retake-photo')?.addEventListener('click', openCamera);
    form?.addEventListener('submit', submitReport);
  }

  async function submitReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!state.selectedLocation) {
      toast('Use your current location before submitting.', 'error');
      document.querySelector('#detected-location-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!state.capturedPhoto || !state.capturedAt) {
      toast('Open the camera and take a current photo before submitting.', 'error');
      document.querySelector('#camera-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const button = document.querySelector('#submit-report');
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Sending report…';
    try {
      const payload = {
        firstName: document.querySelector('#first-name').value.trim(),
        lastName: document.querySelector('#last-name').value.trim(),
        address: state.selectedLocation.address || `${state.selectedLocation.lat.toFixed(6)}, ${state.selectedLocation.lng.toFixed(6)}`,
        city: state.selectedLocation.city || 'Unknown city',
        locationDescription: document.querySelector('#location-description').value.trim(),
        lat: state.selectedLocation.lat,
        lng: state.selectedLocation.lng,
        photo: state.capturedPhoto,
        capturedAt: state.capturedAt,
      };
      const result = await api('/api/reports', { method: 'POST', body: JSON.stringify(payload) });
      cleanupPage();
      renderReportSuccess(result.report);
    } catch (error) {
      toast(error.message || 'The report could not be submitted.', 'error');
      button.disabled = false;
      button.innerHTML = `${icon('flame')} Submit fire report`;
    }
  }

  function renderReportSuccess(report) {
    pageRoot.innerHTML = `
      <section class="page container narrow-page submission-success">
        <div class="success-card card">
          <span class="success-mark">${icon('check')}</span>
          <p class="eyebrow">Report received</p>
          <h1>Thank you for helping your community.</h1>
          <p>Your report is now in the admin review queue. It will only appear on the Incidents page after verification.</p>
          <div class="reference-box">
            <span>Report reference</span>
            <strong>${escapeHtml(reportId(report?.id))}</strong>
            <small>Submitted ${escapeHtml(formatDate(report?.submittedAt || new Date().toISOString()))} PHT</small>
          </div>
          <div class="success-actions">
            <button id="another-report" class="button button-primary" type="button">Submit another report</button>
            <a class="button button-secondary" href="#/incidents">View verified incidents</a>
          </div>
        </div>
      </section>`;
    document.querySelector('#another-report')?.addEventListener('click', renderReportPage);
  }

  function adminShell(activePage, content) {
    const links = [
      ['home', 'home', 'Home'],
      ['reports', 'file', 'Reports'],
      ['incidents', 'shield', 'Incidents'],
      ['analytics', 'chart', 'Analytics'],
      ['staff', 'users', 'Staff'],
    ];
    return `
      <section class="admin-shell">
        <aside class="admin-sidebar" aria-label="Admin navigation">
          <div class="admin-sidebar-brand">
            <img src="/assets/firesighter-logo.webp" alt="" />
            <span><strong>FireSighter</strong><small>Admin operations</small></span>
          </div>
          <nav class="admin-sidebar-nav">
            ${links.map(([key, iconName, label]) => `<a href="#/admin/${key}" class="${activePage === key ? 'active' : ''}" ${activePage === key ? 'aria-current="page"' : ''}>${icon(iconName)} ${label}</a>`).join('')}
          </nav>
          <div class="admin-sidebar-footer">
            <button class="button admin-signout-button" type="button" data-admin-logout>${icon('logout')} Sign out</button>
          </div>
        </aside>
        <div class="admin-content">
          <div class="admin-content-inner">${content}</div>
        </div>
      </section>`;
  }

  function bindAdminShell() {
    document.querySelector('[data-admin-logout]')?.addEventListener('click', logout);
  }

  async function confirmAdminSession() {
    try {
      const session = await api('/api/admin/session');
      state.authenticated = Boolean(session?.authenticated);
    } catch (_error) {
      state.authenticated = false;
    }
    if (!state.authenticated) {
      window.location.hash = '#/admin/login';
      return false;
    }
    return true;
  }

  function renderAdminLogin() {
    updateNavigation('admin');
    if (state.authenticated) {
      window.location.hash = '#/admin/home';
      return;
    }
    pageRoot.innerHTML = `
      <section class="page admin-login-page">
        <div class="container admin-login-shell">
          <div class="admin-login-brand">
            <img src="/assets/firesighter-logo.webp" alt="FireSighter" />
            <p class="eyebrow">Operations portal</p>
            <h1>Turn eyewitness reports into verified intelligence.</h1>
            <p>Authorized administrators can assess evidence, classify incidents, and keep the public record accurate.</p>
            <ul class="feature-checks">
              <li>${icon('check')} Chronological report queue</li>
              <li>${icon('check')} Evidence and location verification</li>
              <li>${icon('check')} Incident classification and analytics</li>
            </ul>
          </div>
          <div class="admin-login-card card">
            <span class="login-icon">${icon('lock')}</span>
            <h2>Admin sign in</h2>
            <p>Use your FireSighter administrator credentials.</p>
            <form id="login-form" class="login-form">
              <label class="field"><span>Username</span><span class="input-with-icon">${icon('user')}<input id="admin-username" name="username" autocomplete="username" required autofocus /></span></label>
              <label class="field"><span>Password</span><span class="input-with-icon">${icon('lock')}<input id="admin-password" name="password" type="password" autocomplete="current-password" required /></span></label>
              <p id="login-message" class="field-message" role="alert"></p>
              <button id="login-button" class="button button-primary button-large" type="submit">Sign in securely ${icon('arrow')}</button>
            </form>
            <p class="demo-credentials demo-credentials-subtle" aria-label="Demo login credentials">Demo access: <code>admin</code> / <code>admin123</code></p>
            <a class="back-link" href="#/report">← Return to public reporting</a>
          </div>
        </div>
      </section>`;
    document.querySelector('#login-form')?.addEventListener('submit', handleLogin);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const button = document.querySelector('#login-button');
    const message = document.querySelector('#login-message');
    button.disabled = true;
    button.textContent = 'Signing in…';
    message.textContent = '';
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.querySelector('#admin-username').value.trim(),
          password: document.querySelector('#admin-password').value,
        }),
      });
      state.authenticated = true;
      toast('Welcome to the FireSighter admin portal.');
      window.location.hash = '#/admin/home';
    } catch (error) {
      message.textContent = error.status === 401 ? 'The username or password is incorrect.' : error.message;
      message.className = 'field-message error-message';
      button.disabled = false;
      button.textContent = 'Sign in securely';
    }
  }

  async function renderAdminHome() {
    updateNavigation('admin');
    loadingPage('Loading the admin home page…');
    try {
      const [reportResult, analyticsResult] = await Promise.all([
        api('/api/admin/reports'),
        api('/api/analytics'),
      ]);
      state.authenticated = true;
      state.reports = Array.isArray(reportResult) ? reportResult : reportResult?.reports || [];
      const verified = state.reports.filter((report) => report.status === 'verified').length;
      const analytics = normalizeAnalytics(analyticsResult);
      pageRoot.innerHTML = adminShell('home', `
        <header class="page-header compact-page-header admin-page-header">
          <div><p class="eyebrow">Admin operations</p><h1>Home</h1><p>Choose an area to review FireSighter activity and station information.</p></div>
        </header>
        <div class="admin-home-grid" aria-label="Admin sections">
          <a class="admin-home-tile" href="#/admin/reports">${icon('file')}<h2>Reports</h2><p>Review, verify, or delete submissions.</p><span class="tile-count">${formatNumber(state.reports.length)}</span></a>
          <a class="admin-home-tile" href="#/admin/incidents">${icon('shield')}<h2>Incidents</h2><p>Open verified incident records.</p><span class="tile-count">${formatNumber(verified)}</span></a>
          <a class="admin-home-tile" href="#/admin/analytics">${icon('chart')}<h2>Analytics</h2><p>Explore reporting and incident trends.</p><span class="tile-count">${formatNumber(analytics.totals.thisMonth)}</span></a>
          <a class="admin-home-tile" href="#/admin/staff">${icon('users')}<h2>Staff</h2><p>View the demo fire-station directory.</p><span class="tile-count">${formatNumber(STAFF.length)}</span></a>
        </div>`);
      bindAdminShell();
    } catch (error) {
      if (error.status === 401) {
        state.authenticated = false;
        window.location.hash = '#/admin/login';
        return;
      }
      errorPage('Could not load admin home', error.message, '#/admin/home');
    }
  }

  async function renderAdminReports() {
    updateNavigation('admin');
    loadingPage('Loading the report queue…');
    try {
      const result = await api('/api/admin/reports');
      state.authenticated = true;
      state.reports = Array.isArray(result) ? result : result?.reports || [];
      drawReportsPage();
    } catch (error) {
      if (error.status === 401) {
        state.authenticated = false;
        window.location.hash = '#/admin/login';
        return;
      }
      errorPage('Could not load reports', error.message, '#/admin/reports');
    }
  }

  function dashboardRows(reports) {
    return reports.map((report) => `
      <tr data-report-row="${escapeHtml(report.id)}">
        <td class="photo-cell"><button class="photo-thumb" type="button" data-action="view-photo" data-id="${escapeHtml(report.id)}" aria-label="View report photo"><img src="${escapeHtml(report.photo)}" alt="${escapeHtml(reportPhotoAlt(report))}" loading="lazy" decoding="async" /></button></td>
        <td><strong>${escapeHtml(report.firstName)} ${escapeHtml(report.lastName)}</strong><small class="table-subtext">${escapeHtml(reportId(report.id))}</small></td>
        <td><span class="location-cell">${icon('pin')}<span><strong>${escapeHtml(report.city || 'Unknown city')}</strong><small>${escapeHtml(report.address)}</small><small>${escapeHtml(report.locationDescription || 'No location description')}</small><a href="${mapsUrl(report)}" target="_blank" rel="noopener">Google Maps</a></span></span></td>
        <td><strong>${escapeHtml(formatDate(report.submittedAt, { short: true }))}</strong><small class="table-subtext">Captured ${escapeHtml(formatDate(report.capturedAt, { short: true }))}</small></td>
        <td><span class="status-badge status-${escapeHtml(report.status)}">${report.status === 'verified' ? icon('check') : icon('clock')}${escapeHtml(report.status)}</span>${report.status === 'verified' ? `<small class="table-subtext">${escapeHtml(fireTypeLabel(report))}</small>` : ''}</td>
        <td class="actions-cell">
          ${report.status !== 'verified' ? `<button class="button button-primary button-small" type="button" data-action="verify" data-id="${escapeHtml(report.id)}">${icon('check')} Verify</button>` : `<a class="button button-quiet button-small" href="#/admin/incidents/${encodeURIComponent(report.id)}">${icon('file')} View</a>`}
          <button class="icon-button danger-button" type="button" data-action="delete" data-id="${escapeHtml(report.id)}" aria-label="Delete report ${escapeHtml(reportId(report.id))}">${icon('trash')}</button>
        </td>
      </tr>`).join('');
  }

  function drawReportsPage() {
    const pending = state.reports.filter((report) => report.status !== 'verified').length;
    const verified = state.reports.length - pending;
    pageRoot.innerHTML = adminShell('reports', `
          <header class="page-header dashboard-header">
            <div><p class="eyebrow">Report management</p><h1>Reports</h1><p>Review newest submissions first, verify credible reports, and maintain the incident record.</p></div>
          </header>
          <div class="dashboard-summary">
            <div class="summary-stat"><span>All reports</span><strong>${formatNumber(state.reports.length)}</strong></div>
            <div class="summary-stat pending"><span>Awaiting review</span><strong>${formatNumber(pending)}</strong></div>
            <div class="summary-stat verified"><span>Verified</span><strong>${formatNumber(verified)}</strong></div>
          </div>
          <div class="dashboard-toolbar card">
            <label class="table-search input-with-icon">${icon('search')}<input id="report-search" type="search" placeholder="Search name, location, or report ID" aria-label="Search reports" /></label>
            <div class="filter-group" role="group" aria-label="Filter report status">
              <button class="filter-chip active" type="button" data-status-filter="all">All <span>${state.reports.length}</span></button>
              <button class="filter-chip" type="button" data-status-filter="pending">Pending <span>${pending}</span></button>
              <button class="filter-chip" type="button" data-status-filter="verified">Verified <span>${verified}</span></button>
            </div>
          </div>
          <div id="reports-container" class="table-card card">
            ${state.reports.length ? `
              <div class="table-heading"><div><h2>Community reports</h2><p>Newest submissions appear first.</p></div><span id="visible-count">${state.reports.length} reports</span></div>
              <div class="table-scroll"><table class="reports-table data-table"><thead><tr><th>Evidence</th><th>Reporter</th><th>Location</th><th>Timeline</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="reports-body">${dashboardRows(state.reports)}</tbody></table></div>
              <div id="filtered-empty" class="empty-state compact-empty" hidden><h3>No matching reports</h3><p>Clear the search or choose a different status.</p></div>`
              : emptyState('No reports yet', 'New community reports will appear here as soon as they are submitted.', '<a class="button button-secondary" href="#/report">Open public report form</a>')}
          </div>`) + dashboardDialogs();
    bindDashboard();
  }

  function dashboardDialogs() {
    return `
      <dialog id="verify-dialog" class="modal">
        <form id="verify-form" class="modal-card">
          <div class="modal-header"><span class="modal-icon">${icon('shield')}</span><div><p class="eyebrow">Admin verification</p><h2>Classify this fire</h2></div><button class="icon-button modal-close" type="button" aria-label="Close">×</button></div>
          <p>Confirm the evidence and choose the incident type. Verification publishes this report to the public Incidents page.</p>
          <input id="verify-report-id" type="hidden" />
          <fieldset class="type-options">
            <legend>Fire type <span aria-hidden="true">*</span></legend>
            <label><input type="radio" name="fireType" value="residential" required /><span>${icon('flame')}<strong>Residential</strong><small>Home, apartment, or dwelling</small></span></label>
            <label><input type="radio" name="fireType" value="commercial" /><span>${icon('flame')}<strong>Commercial</strong><small>Business or industrial property</small></span></label>
            <label><input type="radio" name="fireType" value="forest" /><span>${icon('flame')}<strong>Forest fire</strong><small>Grassland, brush, or woodland</small></span></label>
            <label><input type="radio" name="fireType" value="other" /><span>${icon('flame')}<strong>Other</strong><small>Another incident category</small></span></label>
          </fieldset>
          <label id="other-type-field" class="field" hidden><span>Specify fire type</span><input id="other-fire-type" maxlength="80" placeholder="e.g. Vehicle fire" /></label>
          <p id="verify-message" class="field-message" role="alert"></p>
          <div class="modal-actions"><button class="button button-secondary modal-cancel" type="button">Cancel</button><button id="confirm-verify" class="button button-primary" type="submit">${icon('check')} Verify and publish</button></div>
        </form>
      </dialog>
      <dialog id="delete-dialog" class="modal">
        <div class="modal-card compact-modal">
          <span class="modal-icon danger-icon">${icon('trash')}</span><p class="eyebrow">Permanent action</p><h2>Delete this report?</h2><p>This removes the submission and any verified incident created from it. This action cannot be undone.</p>
          <input id="delete-report-id" type="hidden" />
          <p id="delete-message" class="field-message" role="alert"></p>
          <div class="modal-actions"><button class="button button-secondary modal-cancel" type="button">Keep report</button><button id="confirm-delete" class="button button-danger" type="button">Delete report</button></div>
        </div>
      </dialog>
      <dialog id="photo-dialog" class="modal photo-modal"><div class="modal-card"><button class="icon-button modal-close" type="button" aria-label="Close">×</button><img id="large-report-photo" alt="Fire report evidence" /><div id="photo-caption" class="photo-caption"></div></div></dialog>`;
  }

  function bindDashboard() {
    bindAdminShell();
    document.querySelector('#report-search')?.addEventListener('input', filterDashboard);
    document.querySelectorAll('[data-status-filter]').forEach((button) => button.addEventListener('click', () => {
      document.querySelectorAll('[data-status-filter]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      filterDashboard();
    }));
    document.querySelector('#reports-body')?.addEventListener('click', dashboardAction);
    document.querySelectorAll('.modal-close, .modal-cancel').forEach((button) => button.addEventListener('click', () => button.closest('dialog')?.close()));
    document.querySelectorAll('input[name="fireType"]').forEach((radio) => radio.addEventListener('change', () => {
      const otherField = document.querySelector('#other-type-field');
      const otherInput = document.querySelector('#other-fire-type');
      const isOther = radio.checked && radio.value === 'other';
      otherField.hidden = !isOther;
      otherInput.required = isOther;
      if (!isOther) otherInput.value = '';
    }));
    document.querySelector('#verify-form')?.addEventListener('submit', verifyReport);
    document.querySelector('#confirm-delete')?.addEventListener('click', deleteReport);
  }

  function filterDashboard() {
    const query = document.querySelector('#report-search')?.value.trim().toLowerCase() || '';
    const status = document.querySelector('[data-status-filter].active')?.dataset.statusFilter || 'all';
    const filtered = state.reports.filter((report) => {
      const haystack = `${report.id} ${report.firstName} ${report.lastName} ${report.address} ${fireTypeLabel(report)}`.toLowerCase();
      return (!query || haystack.includes(query)) && (status === 'all' || report.status === status);
    });
    const body = document.querySelector('#reports-body');
    const empty = document.querySelector('#filtered-empty');
    const count = document.querySelector('#visible-count');
    if (body) body.innerHTML = dashboardRows(filtered);
    if (empty) empty.hidden = filtered.length > 0;
    if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'report' : 'reports'}`;
  }

  function dashboardAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const report = state.reports.find((item) => item.id === button.dataset.id);
    if (!report) return;
    if (button.dataset.action === 'verify') {
      const dialog = document.querySelector('#verify-dialog');
      document.querySelector('#verify-report-id').value = report.id;
      document.querySelector('#verify-form').reset();
      document.querySelector('#other-type-field').hidden = true;
      document.querySelector('#verify-message').textContent = '';
      dialog.showModal();
    } else if (button.dataset.action === 'delete') {
      document.querySelector('#delete-report-id').value = report.id;
      document.querySelector('#delete-message').textContent = '';
      document.querySelector('#delete-dialog').showModal();
    } else if (button.dataset.action === 'view-photo') {
      document.querySelector('#large-report-photo').src = report.photo;
      document.querySelector('#large-report-photo').alt = reportPhotoAlt(report);
      document.querySelector('#photo-caption').innerHTML = `<span><strong>${escapeHtml(report.firstName)} ${escapeHtml(report.lastName)}</strong><small>${escapeHtml(report.address)}</small></span>${demoPhotoCredit(report, true)}`;
      document.querySelector('#photo-dialog').showModal();
    }
  }

  async function verifyReport(event) {
    event.preventDefault();
    const id = document.querySelector('#verify-report-id').value;
    const selected = document.querySelector('input[name="fireType"]:checked');
    const otherFireType = document.querySelector('#other-fire-type').value.trim();
    const message = document.querySelector('#verify-message');
    if (!selected) {
      message.textContent = 'Choose a fire type before publishing.';
      message.className = 'field-message error-message';
      return;
    }
    if (selected.value === 'other' && !otherFireType) {
      message.textContent = 'Specify the other fire type.';
      message.className = 'field-message error-message';
      document.querySelector('#other-fire-type').focus();
      return;
    }
    const button = document.querySelector('#confirm-verify');
    button.disabled = true;
    button.textContent = 'Verifying…';
    try {
      await api(`/api/admin/reports/${encodeURIComponent(id)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ fireType: selected.value, otherDetail: otherFireType }),
      });
      document.querySelector('#verify-dialog').close();
      toast('Report verified and published as an incident.');
      await renderAdminReports();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'field-message error-message';
      button.disabled = false;
      button.innerHTML = `${icon('check')} Verify and publish`;
    }
  }

  async function deleteReport() {
    const id = document.querySelector('#delete-report-id').value;
    const button = document.querySelector('#confirm-delete');
    const message = document.querySelector('#delete-message');
    button.disabled = true;
    button.textContent = 'Deleting…';
    try {
      await api(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
      document.querySelector('#delete-dialog').close();
      toast('Report deleted.');
      await renderAdminReports();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'field-message error-message';
      button.disabled = false;
      button.textContent = 'Delete report';
    }
  }

  async function logout() {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch (_error) {
      // The local session is still cleared to avoid leaving the protected UI open.
    }
    state.authenticated = false;
    toast('You have been signed out.');
    window.location.hash = '#/admin/login';
  }

  async function renderIncidents() {
    updateNavigation('incidents');
    loadingPage('Loading verified incidents…');
    try {
      const result = await api('/api/incidents');
      const incidents = Array.isArray(result) ? result : result?.incidents || [];
      pageRoot.innerHTML = `
        <section class="page incidents-page">
          <div class="container">
            <header class="page-header split-header"><div><p class="eyebrow">Verified public record</p><h1>Fire incidents</h1><p>Each incident below was reviewed and classified by a FireSighter administrator.</p></div><div class="record-seal">${icon('shield')}<span><strong>${incidents.length}</strong> verified ${incidents.length === 1 ? 'record' : 'records'}</span></div></header>
            ${incidents.length ? `<div class="incident-list">${incidents.map((incident) => incidentCard(incident)).join('')}</div>` : emptyState('No verified incidents yet', 'Submitted reports appear here after an administrator verifies and classifies them.', '<a class="button button-primary" href="#/report">Report a fire</a>')}
          </div>
        </section>`;
    } catch (error) {
      errorPage('Could not load incidents', error.message, '#/incidents');
    }
  }

  async function renderAdminIncidents() {
    updateNavigation('admin');
    loadingPage('Loading verified incidents…');
    try {
      const result = await api('/api/admin/reports');
      state.authenticated = true;
      state.reports = Array.isArray(result) ? result : result?.reports || [];
      const incidents = state.reports.filter((report) => report.status === 'verified');
      pageRoot.innerHTML = adminShell('incidents', `
        <header class="page-header split-header admin-page-header">
          <div><p class="eyebrow">Verified records</p><h1>Incidents</h1><p>Open the document-style record for every verified and classified report.</p></div>
          <div class="record-seal">${icon('shield')}<span><strong>${incidents.length}</strong> verified ${incidents.length === 1 ? 'record' : 'records'}</span></div>
        </header>
        ${incidents.length ? `<div class="incident-list">${incidents.map((incident) => incidentCard(incident, '#/admin/incidents')).join('')}</div>` : emptyState('No verified incidents yet', 'Verify a report from the Reports page to publish its incident record.', '<a class="button button-primary" href="#/admin/reports">Review reports</a>')}`);
      bindAdminShell();
    } catch (error) {
      if (error.status === 401) {
        state.authenticated = false;
        window.location.hash = '#/admin/login';
        return;
      }
      errorPage('Could not load incidents', error.message, '#/admin/incidents');
    }
  }

  async function renderStaff() {
    updateNavigation('admin');
    loadingPage('Loading station staff…');
    if (!(await confirmAdminSession())) return;
    pageRoot.innerHTML = adminShell('staff', `
      <header class="page-header split-header admin-page-header">
        <div><p class="eyebrow">Fire-station directory</p><h1>Staff</h1><p>Sample personnel information for the FireSighter demonstration.</p></div>
        <span class="demo-data-badge">Demo directory · ${STAFF.length} staff</span>
      </header>
      <div class="staff-grid">
        ${STAFF.map((member) => `
          <article class="staff-card">
            <span class="staff-avatar" aria-hidden="true">${escapeHtml(member.initials)}</span>
            <div class="staff-meta">
              <h2>${escapeHtml(member.name)}</h2>
              <span>${escapeHtml(member.role)}</span>
              <small>${escapeHtml(member.station)}</small>
            </div>
            <div class="staff-card-actions"><span class="staff-shift">${escapeHtml(member.shift)}</span><span>Extension ${escapeHtml(member.extension)}</span></div>
          </article>`).join('')}
      </div>`);
    bindAdminShell();
  }

  function incidentCard(incident, basePath = '#/incidents') {
    const incidentHref = `${basePath}/${encodeURIComponent(incident.id)}`;
    return `
      <article class="incident-card card">
        <a class="incident-photo" href="${incidentHref}"><img src="${escapeHtml(incident.photo)}" alt="${escapeHtml(reportPhotoAlt(incident))}" loading="lazy" decoding="async" /><span class="verified-stamp">${icon('check')} Verified</span></a>
        ${demoPhotoCredit(incident, true)}
        <div class="incident-card-body">
          <div class="incident-meta-row"><span class="type-badge">${icon('flame')} ${escapeHtml(fireTypeLabel(incident))}</span><span>${escapeHtml(formatDate(incident.verifiedAt, { short: true }))}</span></div>
          <h2>${escapeHtml(incident.address || 'Pinned fire location')}</h2>
          <p>${icon('pin')} ${escapeHtml(incident.city || 'Unknown city')} · ${Number(incident.lat).toFixed(5)}, ${Number(incident.lng).toFixed(5)}</p>
          <div class="incident-card-footer"><span>Record ${escapeHtml(reportId(incident.id))}</span><a class="text-link" href="${incidentHref}">Open incident file ${icon('arrow')}</a></div>
        </div>
      </article>`;
  }

  async function renderIncidentDocument(id, adminMode = false) {
    updateNavigation(adminMode ? 'admin' : 'incidents');
    loadingPage('Opening incident record…');
    try {
      const result = await api(adminMode ? '/api/admin/reports' : '/api/incidents');
      if (adminMode) state.authenticated = true;
      const allRecords = Array.isArray(result) ? result : result?.reports || result?.incidents || [];
      const incidents = allRecords.filter((item) => item.status === 'verified');
      const incident = incidents.find((item) => item.id === id);
      if (!incident) {
        errorPage('Incident not found', 'This incident may not exist, may still be awaiting verification, or may have been removed.', adminMode ? '#/admin/incidents' : '#/incidents');
        return;
      }
      const documentMarkup = `
        <section class="page document-page">
          <div class="container document-toolbar"><a class="button button-secondary" href="${adminMode ? '#/admin/incidents' : '#/incidents'}">← Back to incidents</a><button id="print-incident" class="button button-primary" type="button">${icon('print')} Print incident file</button></div>
          <article class="container incident-document">
            <header class="document-header">
              <div class="document-brand"><img src="/assets/firesighter-logo.webp" alt="" /><div><p>FireSighter public record</p><h1>Verified Fire Incident</h1></div></div>
              <div class="document-status">${icon('shield')}<strong>VERIFIED</strong><span>${escapeHtml(formatDate(incident.verifiedAt, { short: true }))} PHT</span></div>
            </header>
            <div class="document-rule"></div>
            <section class="document-summary">
              <div><span>Incident classification</span><strong>${escapeHtml(fireTypeLabel(incident))}</strong></div>
              <div><span>Record number</span><strong>${escapeHtml(reportId(incident.id))}</strong></div>
              <div><span>Status</span><strong>Verified incident</strong></div>
            </section>
            <figure class="document-evidence"><img src="${escapeHtml(incident.photo)}" alt="${escapeHtml(reportPhotoAlt(incident))}" /><figcaption>${demoPhotoCredit(incident) || `Original camera evidence captured ${escapeHtml(formatDate(incident.capturedAt))} PHT`}</figcaption></figure>
            <section class="document-section"><h2>Incident location</h2><div class="document-location"><span>${icon('pin')}</span><div><strong>${escapeHtml(incident.address)}</strong><p>${escapeHtml(incident.city || 'Unknown city')} · Latitude ${Number(incident.lat).toFixed(6)} · Longitude ${Number(incident.lng).toFixed(6)}</p><p>${escapeHtml(incident.locationDescription || 'No additional location description.')}</p><a href="${mapsUrl(incident)}" target="_blank" rel="noopener">Open exact point in Google Maps ↗</a></div></div></section>
            <section class="document-section"><h2>Report information</h2><dl class="document-details"><div><dt>Reported by</dt><dd>${escapeHtml(incident.firstName)} ${escapeHtml(incident.lastName)}</dd></div><div><dt>Photo captured</dt><dd>${escapeHtml(formatDate(incident.capturedAt))} PHT</dd></div><div><dt>Report received</dt><dd>${escapeHtml(formatDate(incident.submittedAt))} PHT</dd></div><div><dt>Admin verified</dt><dd>${escapeHtml(formatDate(incident.verifiedAt))} PHT</dd></div></dl></section>
            <section class="document-section document-timeline"><h2>Verification trail</h2><ol><li class="complete"><span></span><div><strong>Live evidence captured</strong><small>${escapeHtml(formatDate(incident.capturedAt))}</small></div></li><li class="complete"><span></span><div><strong>Community report submitted</strong><small>${escapeHtml(formatDate(incident.submittedAt))}</small></div></li><li class="complete"><span></span><div><strong>Evidence reviewed and classified</strong><small>${escapeHtml(formatDate(incident.verifiedAt))}</small></div></li></ol></section>
            <footer class="document-footer"><div>${icon('shield')}<span><strong>Integrity note</strong>This document reflects the current FireSighter verification record.</span></div><span>Generated ${escapeHtml(formatDate(new Date().toISOString()))} PHT</span></footer>
          </article>
        </section>`;
      pageRoot.innerHTML = adminMode ? adminShell('incidents', documentMarkup) : documentMarkup;
      if (adminMode) bindAdminShell();
      document.querySelector('#print-incident')?.addEventListener('click', () => window.print());
    } catch (error) {
      if (adminMode && error.status === 401) {
        state.authenticated = false;
        window.location.hash = '#/admin/login';
        return;
      }
      errorPage('Could not open incident', error.message, adminMode ? '#/admin/incidents' : '#/incidents');
    }
  }

  function normalizeAnalytics(raw) {
    const totals = raw?.totals || {};
    const monthly = Array.isArray(raw?.monthly) ? raw.monthly : [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthEntry = monthly.find((item) => item.month === currentMonth);
    return {
      totals: {
        reports: Number(totals.reports ?? totals.totalReports ?? raw?.totalReports) || 0,
        pending: Number(totals.pending ?? raw?.pendingReports) || 0,
        verified: Number(totals.verified ?? raw?.verifiedReports) || 0,
        thisMonth: Number(totals.thisMonth ?? raw?.thisMonth ?? currentMonthEntry?.reports ?? currentMonthEntry?.total) || 0,
      },
      monthly,
      byType: Array.isArray(raw?.byType) ? raw.byType : [],
      byCity: Array.isArray(raw?.byCity) ? raw.byCity : [],
    };
  }

  async function renderAnalytics(adminMode = false) {
    updateNavigation(adminMode ? 'admin' : 'analytics');
    loadingPage('Calculating report analytics…');
    try {
      if (adminMode && !(await confirmAdminSession())) return;
      const data = normalizeAnalytics(await api('/api/analytics'));
      const maxMonthly = Math.max(1, ...data.monthly.map((item) => Number(item.total ?? item.reports) || 0));
      const maxType = Math.max(1, ...data.byType.map((item) => Number(item.count) || 0));
      const maxCity = Math.max(1, ...data.byCity.map((item) => Number(item.reports) || 0));
      const content = `
        <header class="page-header split-header"><div><p class="eyebrow">Community intelligence</p><h1>Fire analytics</h1><p>Live statistics derived from submitted reports and administrator-verified incidents.</p></div><span class="live-data-badge"><i></i> Live report data</span></header>
        <div class="analytics-stats">
          ${statCard('All reports', data.totals.reports, 'Since tracking began', 'file')}
          ${statCard('Awaiting review', data.totals.pending, 'Pending admin verification', 'clock')}
          ${statCard('Verified incidents', data.totals.verified, 'Published public records', 'shield')}
          ${statCard('Reports this month', data.totals.thisMonth, formatMonth(new Date().toISOString().slice(0, 7)), 'chart')}
        </div>
        <div class="analytics-grid">
          <section class="analytics-card card monthly-card"><div class="card-heading"><div><p class="eyebrow">Reporting trend</p><h2>Reports by month</h2></div><span>Most recent 12 months</span></div>
            ${data.monthly.length ? `<div class="bar-chart" role="img" aria-label="Monthly fire report bar chart">${data.monthly.map((item) => {
              const total = Number(item.total ?? item.reports) || 0;
              const verified = Number(item.verified ?? item.incidents) || 0;
              return `<div class="bar-row"><span class="bar-label">${escapeHtml(formatMonth(item.month))}</span><div class="bar-track"><span class="bar-fill" style="width:${(total / maxMonthly) * 100}%"><i style="width:${total ? (verified / total) * 100 : 0}%"></i></span></div><strong>${total}</strong></div>`;
            }).join('')}</div><div class="chart-legend"><span><i class="legend-total"></i>All reports</span><span><i class="legend-verified"></i>Verified</span></div>` : `<div class="chart-empty">${icon('chart')}<p>Monthly activity will appear after the first report.</p></div>`}
          </section>
          <section class="analytics-card card type-card"><div class="card-heading"><div><p class="eyebrow">Incident mix</p><h2>Verified fire types</h2></div></div>
            ${data.byType.some((item) => Number(item.count) > 0) ? `<div class="type-chart-layout"><div class="donut-chart" style="${donutStyle(data.byType)}"><div><strong>${formatNumber(data.totals.verified)}</strong><span>incidents</span></div></div><div class="type-legend">${data.byType.map((item, index) => `<div><i style="--legend-color:${chartColors[index % chartColors.length]}"></i><span>${escapeHtml(fireTypeLabel(item.type || item.fireType))}</span><strong>${formatNumber(item.count)}</strong></div>`).join('')}</div></div><div class="category-bars">${data.byType.map((item, index) => `<div><span>${escapeHtml(fireTypeLabel(item.type || item.fireType))}</span><div><i style="width:${((Number(item.count) || 0) / maxType) * 100}%;--bar-color:${chartColors[index % chartColors.length]}"></i></div><strong>${formatNumber(item.count)}</strong></div>`).join('')}</div>` : `<div class="chart-empty">${icon('flame')}<p>Classifications will appear after reports are verified.</p></div>`}
          </section>
          <section class="analytics-card card city-card hotspot-card"><div class="card-heading"><div><p class="eyebrow">Geographic activity</p><h2>Reports per city</h2></div><span>Ranked by report volume</span></div>
            ${data.byCity.length ? `<ol class="city-list">${data.byCity.map((item, index) => {
              const reportCount = Number(item.reports) || 0;
              const incidentCount = Number(item.incidents) || 0;
              return `<li class="city-row"><span class="city-rank">${index + 1}</span><span class="city-row-label"><strong>${escapeHtml(item.city || 'Unknown city')}</strong><small>${formatNumber(incidentCount)} verified ${incidentCount === 1 ? 'incident' : 'incidents'}</small></span><span class="city-meter" aria-hidden="true"><i style="--value:${(reportCount / maxCity) * 100}%"></i></span><strong>${formatNumber(reportCount)} ${reportCount === 1 ? 'report' : 'reports'}</strong></li>`;
            }).join('')}</ol>` : `<div class="chart-empty">${icon('pin')}<p>City totals will appear after a location-based report is submitted.</p></div>`}
          </section>
        </div>`;
      pageRoot.innerHTML = adminMode
        ? adminShell('analytics', content)
        : `<section class="page analytics-page"><div class="container">${content}</div></section>`;
      if (adminMode) bindAdminShell();
    } catch (error) {
      errorPage('Could not load analytics', error.message, adminMode ? '#/admin/analytics' : '#/analytics');
    }
  }

  function statCard(label, value, note, iconName) {
    return `<article class="stat-card card"><span class="stat-icon">${icon(iconName)}</span><div><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong><small>${escapeHtml(note)}</small></div></article>`;
  }

  const chartColors = ['#ef4d2f', '#f59f00', '#243447', '#6e7f6c', '#9c4dcc', '#3c7caa'];

  function donutStyle(items) {
    const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0) || 1;
    let cursor = 0;
    const segments = items.map((item, index) => {
      const start = cursor;
      cursor += ((Number(item.count) || 0) / total) * 100;
      return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
    });
    return `background:conic-gradient(${segments.join(',')})`;
  }

  async function route() {
    const version = ++state.routeVersion;
    cleanupPage();
    closeMobileNavigation();
    const routePath = (window.location.hash.replace(/^#\/?/, '') || 'report').split('?')[0];
    const parts = routePath.split('/').filter(Boolean).map(decodeURIComponent);
    const adminWorkspace = parts[0] === 'admin';
    document.body.classList.toggle('admin-workspace', adminWorkspace);
    window.scrollTo({ top: 0, behavior: 'auto' });

    try {
      if (parts[0] === 'report') await renderReportPage();
      else if (parts[0] === 'incidents' && parts[1]) await renderIncidentDocument(parts[1]);
      else if (parts[0] === 'incidents') await renderIncidents();
      else if (parts[0] === 'analytics') await renderAnalytics();
      else if (parts[0] === 'admin' && parts[1] === 'dashboard') {
        window.location.hash = '#/admin/reports';
        return;
      }
      else if (parts[0] === 'admin' && parts[1] === 'home') await renderAdminHome();
      else if (parts[0] === 'admin' && parts[1] === 'reports') await renderAdminReports();
      else if (parts[0] === 'admin' && parts[1] === 'incidents' && parts[2]) await renderIncidentDocument(parts[2], true);
      else if (parts[0] === 'admin' && parts[1] === 'incidents') await renderAdminIncidents();
      else if (parts[0] === 'admin' && parts[1] === 'analytics') await renderAnalytics(true);
      else if (parts[0] === 'admin' && parts[1] === 'staff') await renderStaff();
      else if (parts[0] === 'admin') renderAdminLogin();
      else {
        window.location.hash = '#/report';
        return;
      }
    } catch (error) {
      errorPage('Page unavailable', error.message || 'An unexpected error occurred.', '#/report');
    }
    if (version === state.routeVersion) {
      mainContent?.focus({ preventScroll: true });
      document.title = `${document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || 'FireSighter'} | FireSighter`;
    }
  }

  navToggle?.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!open));
    navLinks?.classList.toggle('nav-open', !open);
  });
  navLinks?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMobileNavigation();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', stopCamera);

  (async function init() {
    await Promise.all([ensureConfig(), refreshSession()]);
    if (!window.location.hash) window.location.hash = '#/report';
    else route();
  }());
})();
