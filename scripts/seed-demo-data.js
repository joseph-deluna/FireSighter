'use strict';

const path = require('path');
const { createReportStore } = require('../backend/server');

const DEMO_SEED_PREFIX = 'firesighter-demo-v1';
const DEFAULT_DATA_FILE = path.resolve(__dirname, '..', 'backend', 'data', 'reports.json');

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
  return Object.freeze({
    id: `${DEMO_SEED_PREFIX}-${suffix}`,
    firstName: 'Demo',
    lastName: `Reporter ${suffix}`,
    photo: DEMO_PHOTOS[number - 1],
    isDemo: true,
    demoSeed: DEMO_SEED_PREFIX,
    otherDetail: null,
    verifiedAt: null,
    ...values,
  });
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

function buildDemoReports() {
  return DEMO_REPORTS.map((report) => ({ ...report }));
}

async function seedDemoData(options = {}) {
  const dataFile = path.resolve(
    options.dataFile || process.env.REPORTS_DATA_FILE || DEFAULT_DATA_FILE,
  );
  const store = options.store || createReportStore(dataFile);
  const existingReports = await store.list();
  const existingById = new Map(existingReports.map((report) => [report && report.id, report]));
  const demoReports = buildDemoReports();
  const missingReports = demoReports.filter((report) => !existingById.has(report.id));
  const changedReports = demoReports.filter((report) => {
    const existing = existingById.get(report.id);
    return existing && Object.entries(report).some(([key, value]) => existing[key] !== value);
  });

  for (const report of missingReports) {
    await store.add(report);
  }

  for (const report of changedReports) {
    await store.update(report.id, () => report);
  }

  return {
    added: missingReports.length,
    updated: changedReports.length,
    skipped: DEMO_REPORTS.length - missingReports.length - changedReports.length,
    demoReports: DEMO_REPORTS.length,
    totalReports: existingReports.length + missingReports.length,
    dataFile,
  };
}

if (require.main === module) {
  seedDemoData()
    .then((result) => {
      console.log(
        `FireSighter demo seed complete: ${result.added} added, ${result.updated} refreshed, ${result.skipped} already current, ${result.totalReports} total reports.`,
      );
    })
    .catch((error) => {
      console.error(`FireSighter demo seed failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  DEMO_REPORTS,
  DEMO_PHOTOS,
  DEMO_SEED_PREFIX,
  buildDemoReports,
  seedDemoData,
};
