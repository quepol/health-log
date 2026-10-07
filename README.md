# Health Log

A one-tap health tracker: headaches, back pain, exercise, or anything else you want to keep an eye on. It's a static PWA written in plain HTML, CSS and JS: no build step, no dependencies, no backend, no accounts, no network calls. All data stays in `localStorage` on the phone you use it on.

## How it works

The app has two ideas:

- **Things you track** are buttons on the Log screen. Tap one when it happens. They can be symptoms (Headache), habits (Exercise), or anything else.
- **Details** note what else was going on when you log something, like Stress or Poor sleep. They're optional and attach to that one log.

### Screens

- **Setup (first launch):** shown on a device with no data.
  - **What do you want to keep track of?** suggests Headache, Back pain and Exercise. You can add your own.
  - **Details you can add** suggests Stress, Poor sleep and Dehydrated. You can add your own.
  - Nothing is pre-selected.
  - **Moving from another phone?** imports a CSV backup instead.
  - **iPhone browser:** opened in the browser on an iPhone, the app first explains what it is and shows 3 steps to add it to the Home Screen, because the Home Screen app keeps its own data.
- **Log:**
  - Tap a button to log it with the current time. A message confirms it with **Undo** and **Edit**.
  - **What else was going on?** then offers your details. Tap any that apply or ignore it; **Edit details** jumps to Settings.
  - Each button shows how many days you've logged it this month, or "Day 3 · tap for today" during a run of days.
  - **＋ Add new** adds a button right there. **+ Add past entry** backdates one.
- **History:**
  - Every entry, newest first.
  - Tap one to change what it was, its date, time, details or note, or to delete it.
- **Patterns:**
  - Days this month and last month for each thing you track.
  - Bar charts of **days** (not taps), switchable between Week, Month and Year.
  - For anything that runs over several days, its episodes: dates, length, typical and longest, time between, and days since the last one.
  - The most common details for each thing you track.
  - **What tends to come before it?** compares what you track against each other.
- **Settings:**
  - **What you track** and **Details**: rename, reorder (↑ ↓), **Hide** or **Show**. Hidden ones are struck through and leave the Log screen, but past entries keep them.
  - **Data**: Export CSV, Import CSV, and **Delete all data** (with a confirmation step).

### Episodes

Patterns groups days in a row into **episodes**, so a 5-day cold sore shows up as one episode lasting 5 days, while headaches that come and go show up as one-day episodes. For anything that lasts several days, tap it once each day it's there. Extra taps on the same day are fine; for an inhaler, the log count works as a puff count.

**Missed days:** if you log after missing one or two days, the app asks whether it was still there.
- **Yes** fills in the missing days, marked "Filled in", so the episode stays whole.
- **No** keeps them as separate episodes.
- It stops asking for anything that has 3 finished episodes that typically last one day, such as headaches.

### Details or a button?

Details are only recorded alongside a log, so they show what comes up most often, not whether something comes *before* what you track.

To test a hunch, make it a button instead (Exercise, Medicine, Late meal…) and tap it *every* time it happens, including on good days. **What tends to come before it?** then compares it against your baseline:
- **`2.0×`** means it shows up beforehand twice as often as on a typical day.
- **First days only:** it looks at the first day of each episode, since what happened on day 5 of an outbreak didn't cause it.
- **Delayed effects:** for slow-onset things, try the ≤ 3 or ≤ 5 day windows.
- **Correlation, not proof:** it needs a few weeks of data before it means much.

## Accessibility and text size

- **Text size:** follows the phone's setting. On iPhone that's **Settings → Display & Brightness → Text Size** (and **Accessibility → Larger Text**).
- **Layout:** Log buttons stay two across, and Settings rows stay on one line, until a name genuinely doesn't fit. Then they reflow rather than clip or scroll sideways.
- **Fixed sizes:** chart axis labels and the bottom tab bar cap their size so they always fit.
- **Theme:** light and dark mode follow the system.

## Back up your data

Data lives only on the device, and browsers can clear website storage. Home Screen apps are mostly exempt, but Apple doesn't guarantee it.
- **Export:** use **Settings → Export CSV** regularly. On iPhone it opens the share sheet so you can save to Files or iCloud Drive.
- **Reminder:** the Settings tab shows an orange dot when a backup is overdue.
- **Import:** importing the same file twice won't create duplicates.

**CSV format:** `timestamp,item,tags,note`.
- `item` is the thing you tracked, and `tags` are its details, separated by `;`. The column names are unchanged from earlier versions, so older backups still import.
- Timestamps look like `2026-10-06T14:32:00+01:00`. A plain `2026-10-06 14:32` also works and is read as the device's local time.

## Sharing with family

Everyone uses the same link on their own phone; each person's data stays on their phone. To pre-select what someone tracks, add `?track=` to the link:

```
https://<username>.github.io/<repo>/?track=Heartburn,Late+meal
```

Names that match a suggestion are pre-selected, and others are added as new ones. They can still change the selection before tapping **Start logging**.

For the pre-selection to survive "Add to Home Screen", the icon has to keep the `?track=` part. The manifest leaves `start_url` unset so iOS keeps it, but this hasn't been verified on a real device. If it doesn't carry over, setup just opens with nothing selected.

## Install on iPhone

1. Open the link in Safari (or Chrome).
2. Tap **Share** (bottom of the screen in Safari, top right in Chrome), then **Add to Home Screen**.
3. Open **Health Log** from the Home Screen. It runs full-screen and works offline.

Set it up and log from the Home Screen icon, not the browser tab: the two keep separate data.

## Run locally

Any static file server works. The service worker needs `http://localhost` or HTTPS, so opening the file with `file://` won't work offline.

```sh
cd health-log
python3 -m http.server 8000
# open http://localhost:8000
```

To try it on a phone over Wi-Fi, open `http://<your-computer's-LAN-IP>:8000`. Installing and offline mode need HTTPS, so for real use host it as below.

## Host free on GitHub Pages

1. Push this repo to GitHub. Pages is free for public repos; private repos need a paid plan. The repo contains only code. Health data never leaves the phone.
2. On GitHub, go to **Settings → Pages → Build and deployment**. Set **Source: Deploy from a branch**, then choose `main` and the `/ (root)` folder, and click **Save**.
3. After a minute the app is live at `https://<username>.github.io/<repo>/`.

All paths are relative, so it works from a sub-path. Netlify Drop and Cloudflare Pages also work: drag the folder in.

## Updating

- **How updates arrive:** the service worker serves the cached app instantly and fetches updates in the background, so a pushed change takes effect the *second* time the app is opened.
- **Cache version:** bump `VERSION` in `sw.js` with each release.
- **Adding or removing files:** also update the `FILES` list in `sw.js`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for setup, the four screens and the edit sheet |
| `style.css` | Styles. Light/dark via `prefers-color-scheme`; sizes in `rem` so text follows the system setting |
| `app.js` | Storage, rendering, episodes, patterns, layout fitting and CSV (one file, about 800 lines) |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `*.png` | Install metadata and icons |
