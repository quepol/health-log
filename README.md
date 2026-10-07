# Health Log

A one-tap symptom tracker. It's a static PWA written in plain HTML, CSS and JS: no build step, no dependencies, no backend, no network calls. All data stays in your browser's `localStorage` on the device you use it on.

## What it does

- **Log:** tap a big button to log it with the current time. A toast lets you **Undo** or **Edit**, and an optional row of trigger tags appears, which you can tap or ignore. Each button shows how many days you've logged that item this month. For an episode item it shows the current episode instead ("Day 3 · tap for today").
- **History:** every entry, newest first. Tap one to change its item, date/time, tags or note, or to delete it. The **+ Add past entry** button backdates an entry.
- **Patterns:**
  - Days per item this month and last month.
  - Bars of **days** with each item (not taps), switchable between week (last 12), month (last 12) and year.
  - For episode items: each flare-up with its dates and length, plus typical length, longest, typical time between episodes, and days since the last one.
  - The most frequent tags for each item.
  - **What comes before it?** for each item, how often it was logged on or just before a symptom day, compared with how often it appears on any day.
- **Settings:** add, rename, reorder and archive items and tags, choose how each item is tracked, and export or import CSV.

### Count days vs Episodes

Each item is tracked in one of two ways, chosen in Settings:

- **Count days** suits things that come and go within a day, like a headache.
- **Episodes** suits flare-ups that last several days, like a cold sore or a run of inhaler use. Tap the item **once each day it's there**; days in a row are grouped into one episode automatically. If you log after missing one or two days, the app asks whether you forgot. **Yes** fills in the missing days, marked "Filled in", so the episode stays whole. **No** keeps them as separate episodes. Multiple taps on one day are fine; for the inhaler, the log count works as a puff count.

Cold sore and Inhaler start as Episodes, and new items start as Count days.

For Episodes items, **What comes before it?** looks only at the **first day** of each episode. Exposures during day 5 of an outbreak aren't triggers. Cold sores can lag their trigger by several days, so try the ≤ 3 or ≤ 5 day windows for them.

### Getting real trigger signal

Tags only get recorded on symptom days. Tags therefore can't tell you whether "poor sleep" causes headaches or is just common. For anything you suspect, add it as its own **item** (Alcohol, Bad sleep, Skipped meal…) and tap it *every* time it happens, whether or not a symptom follows. **What comes before it?** in Patterns then compares symptom days against your baseline. A `2.0×` means the exposure shows up before symptom days twice as often as on a typical day. That is correlation, and you need a few weeks of data before it means much.

## Back up your data

Data lives only on the device, and Safari can clear website storage. Apps added to the Home Screen are mostly exempt, but Apple doesn't guarantee it. Use **Settings → Export CSV** regularly; on iPhone it opens the share sheet so you can save to Files or iCloud Drive. The Settings tab shows an orange dot when a backup is overdue. Importing the same file twice won't create duplicates.

The Count/Episodes setting isn't in the CSV. After restoring to a new device, set them again in Settings.

CSV format: `timestamp,item,tags,note`. Tags are separated by `;`. Timestamps look like `2026-10-06T14:32:00+01:00`. A plain `2026-10-06 14:32` also works on import and is read as the device's local time.

## Run locally

Any static file server works. The service worker requires `http://localhost` or HTTPS; opening the file directly with `file://` won't work offline.

```sh
cd health-log
python3 -m http.server 8000
# open http://localhost:8000
```

To try it on your phone over Wi-Fi, open `http://<your-computer's-LAN-IP>:8000`. Offline mode and installing need HTTPS, so for real phone use host it as described below.

## Host free on GitHub Pages

1. Push this repo to GitHub. Pages is free for public repos; private repos need a paid plan. The repo contains only code, and your health data never leaves your phone.
2. On GitHub, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, pick your branch, folder `/ (root)`, and click **Save**.
3. After a minute the app is live at `https://<username>.github.io/<repo>/`.

All paths are relative, so the app works from a sub-path like that. Netlify Drop and Cloudflare Pages also work: drag the folder in.

## Install on iPhone

1. Open the Pages URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the Home Screen icon. It opens full-screen and works offline.

Note: the Home Screen app keeps its storage separate from the Safari tab. Log from the icon, not the browser tab.

## Updating

The service worker serves the cached app instantly and fetches updates in the background. After you push a change, it takes effect the *second* time you open the app. If you add or remove files, update the `FILES` list in `sw.js` and bump `VERSION`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for all four screens and the edit dialog |
| `style.css` | Styles; light/dark mode via `prefers-color-scheme` |
| `app.js` | Storage, rendering, episodes, patterns and CSV (one file, about 600 lines) |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `*.png` | Install metadata and icons |
