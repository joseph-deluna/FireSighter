# FireSighter

FireSighter is a camera-first community fire reporting demo. Residents can detect their current location, add a landmark description, and save a photo taken directly from their current camera view. Administrators can review reports in chronological order, delete invalid submissions, verify credible reports, and classify them as residential, commercial, forest, or another fire type. Verified reports become incident documents and feed the analytics dashboard.

The deployed demo is available at [joseph-deluna.github.io/FireSighter](https://joseph-deluna.github.io/FireSighter/).

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

These are demonstration credentials and are also shown subtly on the login page. Authentication is simulated in the browser and is not a security boundary. Do not use this static demo for real emergency operations or confidential reports.

## Location detection

The report form only accepts the browser's current geolocation; address search, manual coordinates, and click-to-pin editing are intentionally disabled. The detected address, city, and coordinates are locked after they are filled, while the reporter supplies a separate landmark description. A Google Maps link is provided for reviewing the detected point.

## Device-local data and workflow

The static demo stores reports, live camera frames, verification decisions, and incident classifications in the browser's `localStorage` for the current site. Every device and browser profile has its own independent copy. Data remains after refreshes, but clearing site data removes it. Private browsing may discard it when the private session closes. The demo administrator session is kept in `sessionStorage`.

No submitted report or captured photo is uploaded to FireSighter, GitHub, or a shared database. Location detection uses the browser geolocation API; reverse-geocoding sends the coordinates to OpenStreetMap Nominatim, and choosing a Google Maps link opens that location at Google. The 10 illustrative sample images load from Wikimedia Commons.

A report keeps separate camera-capture, submission, and verification timestamps. Only verified reports appear on the public Incidents page. The analytics page is calculated from the reports stored on that device.

The repository still contains optional Express and Cloudflare Worker implementations for development reference, but the included browser interface uses `frontend/demo-store.js` and does not call those server databases.

## Included demo data

On first visit, the browser automatically creates exactly 10 sample reports spanning several cities and months, pending and verified states, and every fire classification. Deleting or verifying them persists on that device. Clearing the site's browser data restores a fresh demo database on the next visit.

Sample reports use illustrative city and location images from Wikimedia Commons. The interface identifies them as demo images—not submitted fire evidence—and displays the creator and license links. `npm run seed` remains available only for the optional Express implementation.

## Commands

```bash
npm run dev      # start the app on port 5050
npm run dev:cloud # run the Worker with local D1/R2 bindings
npm start        # same production entry point
npm run seed     # add demo data to the optional Express implementation
npm run check    # syntax-check server and browser demo code
npm test         # test the localStorage workflow and optional API
npm run types:worker # regenerate Cloudflare binding/runtime types
npm run build    # validate and create the Cloudflare Worker bundle
npm run smoke:worker -- http://127.0.0.1:5051 # test a running Worker preview
```

Optional environment variables are documented in `.env.example`.

## GitHub Pages hosting

GitHub stores and reviews the complete source project. Pushes and pull requests run the automated test suite through `.github/workflows/ci.yml`. The repository-root `index.html` forwards to the static app in `frontend/`, so the existing GitHub Pages branch deployment can serve the complete browser demo.

This architecture is appropriate for a presentation demo only: reports cannot sync between devices, browser data can be edited by the device owner, and the visible demo credentials do not protect sensitive information. A real emergency reporting system requires server-side authentication, access controls, audit logs, encrypted storage, abuse protection, retention rules, and an operational response process.

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
