# Health Log

A one-tap symptom tracker. It's a static PWA written in plain HTML, CSS and JS: no build step, no dependencies, no backend, no network calls. All data stays in your browser's `localStorage` on the device you use it on.

## What it does

- **First launch:** on a device with no data, a one-screen setup asks **What do you want to track?** It suggests Headache, Migraine, Heartburn, Nausea, Back pain, Allergies, Anxiety, Fatigue and Period, and you can add your own. Below that is a list of trigger tags: Poor sleep and Stress start selected, Caffeine is one tap away, and you can add your own. On an iPhone in the browser it first asks you to add the app to the Home Screen and set it up from there.

- **Log:** tap a big button to log it with the current time. A toast lets you **Undo** or **Edit**, and an optional row of trigger tags appears, which you can tap or ignore. That row also has an **Edit triggers** link to Settings. Each button shows how many days you've logged that item this month, or the current run while one is going ("Day 3 · tap for today"). The last tile, **＋ Add new**, adds an item right there.
- **History:** every entry, newest first. Tap one to change its item, date/time, tags or note, or to delete it. The **+ Add past entry** button backdates an entry.
- **Patterns:**
  - Days per item this month and last month.
  - Bars of **days** with each item (not taps), switchable between week (last 12), month (last 12) and year.
  - For episode items: each flare-up with its dates and length, plus typical length, longest, typical time between episodes, and days since the last one.
  - The most frequent tags for each item.
  - **What comes before it?** for each item, how often it was logged on or just before a symptom day, compared with how often it appears on any day.
- **Settings:** add, rename, reorder and hide items and tags (hidden ones leave the Log screen but keep their history), plus CSV export and import.

### Episodes

Every item is logged the same way: one tap. Patterns groups days in a row into **episodes**, so a 5-day cold sore shows up as one episode lasting 5 days. Headaches that come and go show up as one-day episodes. For anything that lasts several days, tap it once each day it's there. Extra taps on the same day are fine; for the inhaler, the log count works as a puff count.

**If you log after missing one or two days**, the app asks whether it was still there. **Yes** fills in the missing days, marked "Filled in", so the episode stays whole. **No** keeps them as separate episodes. The app learns: once an item has 3 finished episodes that typically last one day (headaches, drinks), it stops asking about that item.

While an item has been logged for 2 or more days in a row, its button shows "Day 3 · tap for today". Items that have had multi-day runs get an episode list in Patterns, showing length, typical and longest duration, and time between episodes.

**What comes before it?** looks only at the **first day** of each episode. Exposures during day 5 of an outbreak aren't triggers. Cold sores can lag their trigger by several days, so try the ≤ 3 or ≤ 5 day windows for them.

### Getting real trigger signal

Tags only get recorded on symptom days. Tags therefore can't tell you whether "poor sleep" causes headaches or is just common. For anything you suspect, add it as its own **item** (Alcohol, Bad sleep, Skipped meal…) and tap it *every* time it happens, whether or not a symptom follows. **What comes before it?** in Patterns then compares symptom days against your baseline. A `2.0×` means the exposure shows up before symptom days twice as often as on a typical day. That is correlation, and you need a few weeks of data before it means much.

## Back up your data

**Settings → Delete all data** erases everything on the device, after a confirmation step, and returns to the first-launch setup.

Data lives only on the device, and Safari can clear website storage. Apps added to the Home Screen are mostly exempt, but Apple doesn't guarantee it. Use **Settings → Export CSV** regularly; on iPhone it opens the share sheet so you can save to Files or iCloud Drive. The Settings tab shows an orange dot when a backup is overdue. Importing the same file twice won't create duplicates.

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

## Sharing with family

Everyone uses the same link on their own phone, and each person's data stays on that phone. To pre-select what someone tracks, add `?track=` to the link, for example:

```
https://<username>.github.io/<repo>/?track=Heartburn,Spicy+food,Coffee
```

Names that match a suggestion get pre-selected; any others are added as their own items. They can still change the selection before tapping **Start logging**.

The setup has to happen inside the Home Screen app, because iPhone keeps that app's data separate from Safari's. For the pre-selection to carry over, the Home Screen icon has to keep the link's `?track=` part. The manifest leaves `start_url` unset so that iOS keeps it, but this hasn't been verified on a real device. If it doesn't carry over, the setup screen simply opens with nothing selected.

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
| `style.css` | Styles; light/dark mode via `prefers-color-scheme`; all sizes in `rem`, so text follows the phone's text-size setting |
| `app.js` | Storage, rendering, episodes, patterns and CSV (one file, about 600 lines) |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `*.png` | Install metadata and icons |
