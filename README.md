# FireSighter

FireSighter is a camera-first community fire reporting portal. Residents can detect their current location, add a landmark description, and submit a photo taken directly from their current camera view. Administrators can review reports in chronological order, delete invalid submissions, verify credible reports, and classify them as residential, commercial, forest, or another fire type. Verified reports become incident documents and feed the analytics dashboard.

## Run locally

Requirements: Node.js 22.13 or newer and a modern browser with camera support.

```bash
npm install
npm run dev
```

Open [http://localhost:5050](http://localhost:5050).

Camera access is permitted by browsers on `localhost`. A deployed copy must use HTTPS for live camera capture and geolocation.

### Default administrator

- Username: `admin`
- Password: `admin123`

These are demonstration credentials and are also shown subtly on the login page. Copy `.env.example` to `.env`, set a strong `ADMIN_USERNAME` and `ADMIN_PASSWORD`, and restart the server before using the local app with real reports. Production credentials must be stored in the deployment platform's encrypted runtime settings, never in source control.

## Location detection

The report form only accepts the browser's current geolocation; address search, manual coordinates, and click-to-pin editing are intentionally disabled. The detected address, city, and coordinates are locked after they are filled, while the reporter supplies a separate landmark description. A Google Maps link is provided for reviewing the detected point.

## Data and workflow

The local Express app stores reports in `backend/data/reports.json`, which is created automatically and excluded from Git. The hosted Worker stores report metadata and admin sessions in D1 and keeps camera evidence in private R2 object storage. A report keeps separate camera-capture, submission, and verification timestamps. Only verified reports are returned by the public incidents endpoint. Analytics responses contain aggregates and coordinates, not reporter names, descriptions, or photos.

The Worker migrations contain only the 10 clearly labeled demo reports. Local `backend/data/reports.json` content and user camera photos are deliberately never packaged or uploaded.

## Optional demo data

Stop the development server, then seed a complete sample dashboard with:

```bash
npm run seed
```

The command adds a fixed set of exactly 10 demo reports spanning several cities and months, pending and verified states, and every fire classification. It preserves every user report and refreshes only the stable demo IDs when sample content changes. If `REPORTS_DATA_FILE` is set, the command uses that file.

Seeded reports use illustrative city and location images from Wikimedia Commons. The interface identifies them as demo images—not submitted fire evidence—and displays the creator and license links.

## Commands

```bash
npm run dev      # start the app on port 5050
npm run dev:cloud # run the Worker with local D1/R2 bindings
npm start        # same production entry point
npm run seed     # add the 10 idempotent demo reports
npm run check    # syntax-check server and browser code
npm test         # run API integration tests
npm run types:worker # regenerate Cloudflare binding/runtime types
npm run build    # validate and create the Cloudflare Worker bundle
npm run smoke:worker -- http://127.0.0.1:5051 # test a running Worker preview
```

Optional environment variables are documented in `.env.example`.

## GitHub and production hosting

GitHub stores and reviews the complete source project. Pushes and pull requests run the automated test suite through `.github/workflows/ci.yml`.

The application cannot run as a GitHub Pages-only site because reporting, login, verification, incidents, and analytics require a server plus persistent data and private evidence storage. For a functional production deployment, connect this repository to a Cloudflare Worker and configure the `DB` D1 binding, the private `EVIDENCE` R2 binding, and encrypted `ADMIN_USERNAME` / `ADMIN_PASSWORD` variables. Do not commit those credentials or local report data.

## Main routes

- `#/report` — public fire reporting form
- `#/incidents` — verified incident records
- `#/analytics` — monthly, fire-type, and city analytics
- `#/admin/login` — administrator login
- `#/admin/home` — protected admin home
- `#/admin/reports` — chronological report review and verification queue
- `#/admin/incidents` — verified incident documents
- `#/admin/analytics` — admin analytics view
- `#/admin/staff` — sample station staff directory

The report form intentionally contains no file input. Photos can only be created through `navigator.mediaDevices.getUserMedia()` and a captured live video frame.
