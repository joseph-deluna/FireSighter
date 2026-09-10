CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  location_description TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  photo TEXT NOT NULL,
  evidence_key TEXT,
  captured_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  fire_type TEXT CHECK (fire_type IS NULL OR fire_type IN ('residential', 'commercial', 'forest', 'other')),
  other_detail TEXT,
  verified_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  demo_seed TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_reports_submitted_at
  ON reports (submitted_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_reports_verified_submitted
  ON reports (submitted_at DESC, id DESC)
  WHERE status = 'verified';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_reports_city
  ON reports (city COLLATE NOCASE);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);
--> statement-breakpoint
INSERT OR IGNORE INTO reports (
  id, first_name, last_name, address, city, location_description, lat, lng,
  photo, evidence_key, captured_at, submitted_at, status, fire_type,
  other_detail, verified_at, is_demo, demo_seed
) VALUES
  ('firesighter-demo-v1-01', 'Demo', 'Reporter 01', 'Demo pin near Plaza Roma, Intramuros, Manila', 'Manila', 'Smoke visible from a two-storey residence beside the demo plaza marker.', 14.5915, 120.9736, '/assets/demo-fire-evidence.svg', NULL, '2026-04-08T01:13:00.000Z', '2026-04-08T01:15:00.000Z', 'verified', 'residential', NULL, '2026-04-08T01:24:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-02', 'Demo', 'Reporter 02', 'Demo pin near Quezon Memorial Circle, Quezon City', 'Quezon City', 'Flames reported behind a demonstration commercial kiosk area.', 14.6517, 121.0493, '/assets/demo-fire-evidence.svg', NULL, '2026-05-03T08:40:00.000Z', '2026-05-03T08:42:00.000Z', 'verified', 'commercial', NULL, '2026-05-03T08:55:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-03', 'Demo', 'Reporter 03', 'Demo pin near Hinulugang Taktak area, Antipolo', 'Antipolo', 'A small brush fire is visible beyond the marked roadside clearing.', 14.6003, 121.1682, '/assets/demo-fire-evidence.svg', NULL, '2026-05-24T05:05:00.000Z', '2026-05-24T05:07:00.000Z', 'verified', 'forest', NULL, '2026-05-24T05:18:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-04', 'Demo', 'Reporter 04', 'Demo pin near Pasig City Hall, Pasig', 'Pasig', 'Smoke coming from a parked demonstration vehicle near the service road.', 14.5607, 121.076, '/assets/demo-fire-evidence.svg', NULL, '2026-06-11T10:27:00.000Z', '2026-06-11T10:29:00.000Z', 'verified', 'other', 'Vehicle fire', '2026-06-11T10:41:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-05', 'Demo', 'Reporter 05', 'Demo pin near Ayala Triangle, Makati', 'Makati', 'Smoke seen at a demonstration apartment balcony facing the gardens.', 14.5567, 121.0232, '/assets/demo-fire-evidence.svg', NULL, '2026-07-02T03:18:00.000Z', '2026-07-02T03:20:00.000Z', 'verified', 'residential', NULL, '2026-07-02T03:34:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-06', 'Demo', 'Reporter 06', 'Demo pin near Bonifacio High Street, Taguig', 'Taguig', 'Fire visible in a demonstration restaurant service area near the corner.', 14.5508, 121.0503, '/assets/demo-fire-evidence.svg', NULL, '2026-08-09T12:01:00.000Z', '2026-08-09T12:03:00.000Z', 'verified', 'commercial', NULL, '2026-08-09T12:15:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-07', 'Demo', 'Reporter 07', 'Demo pin near Marikina River Park, Marikina', 'Marikina', 'Grass and brush burning near the demonstration riverside marker.', 14.6325, 121.0965, '/assets/demo-fire-evidence.svg', NULL, '2026-08-22T06:46:00.000Z', '2026-08-22T06:48:00.000Z', 'verified', 'forest', NULL, '2026-08-22T07:00:00.000Z', 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-08', 'Demo', 'Reporter 08', 'Demo pin near Caloocan City Hall, Caloocan', 'Caloocan', 'Unverified smoke sighting behind the demonstration transport bay.', 14.6495, 120.983, '/assets/demo-fire-evidence.svg', NULL, '2026-09-02T00:35:00.000Z', '2026-09-02T00:37:00.000Z', 'pending', NULL, NULL, NULL, 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-09', 'Demo', 'Reporter 09', 'Demo pin near Rizal Park, Manila', 'Manila', 'Unverified flame glow near a demonstration maintenance enclosure.', 14.5826, 120.9787, '/assets/demo-fire-evidence.svg', NULL, '2026-09-06T11:09:00.000Z', '2026-09-06T11:11:00.000Z', 'pending', NULL, NULL, NULL, 1, 'firesighter-demo-v1'),
  ('firesighter-demo-v1-10', 'Demo', 'Reporter 10', 'Demo pin near Araneta City, Quezon City', 'Quezon City', 'Unverified smoke seen above a demonstration loading area on the east side.', 14.6207, 121.0534, '/assets/demo-fire-evidence.svg', NULL, '2026-09-08T14:20:00.000Z', '2026-09-08T14:22:00.000Z', 'pending', NULL, NULL, NULL, 1, 'firesighter-demo-v1');
--> statement-breakpoint
PRAGMA optimize;
