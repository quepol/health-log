# Health Log

A one-tap health tracker: headaches, back pain, exercise, or anything else you want to keep an eye on. It's a static PWA written in plain HTML, CSS and JS: no build step, no dependencies, no backend, no accounts. Your data never leaves the phone you use it on.

## Privacy & security

Health data is sensitive, so here is plainly what the app does and doesn't protect against.

**What it does**
- **Your data stays on your phone.** Everything you log is stored in the browser's local storage on that device. There is no server, account, sync or analytics, so there is nowhere for it to go.
- **The app can't send data anywhere.** Its code makes no network requests, and a Content-Security-Policy (`connect-src 'none'`) blocks them even if one were added by mistake. The only network activity is downloading the app's own files (and later updates) from the site it's hosted on.
- **No third-party code.** No analytics, ads, fonts, CDNs or libraries. Every file is in this repo, and the policy above only allows the app's own files.

**What it doesn't protect against**
- **A compromised hosting site or GitHub account.** The app's code is delivered from GitHub Pages and updates install automatically. If this repo or the account behind it were compromised, a malicious update could read your stored data and send it elsewhere; it could also remove the Content-Security-Policy, which lives in the app's own HTML. You are trusting whoever controls the site. To avoid that, you can [host your own copy](#host-your-own-copy); [control over updates](https://github.com/quepol/health-log/issues/15) for the shared copy is planned.
- **Someone with your unlocked phone.** There's no separate passcode, so anyone who can unlock the phone can open the app and see your log. Your phone's passcode and device encryption are the protection.
- **Exported backups.** **Export CSV** creates a plain, unencrypted text file. Once you save or share it (Files, iCloud Drive, email), it's protected only by wherever you put it.
- **Pre-filled links.** A link like `?track=Heartburn` shows what someone is tracking to anyone who sees it, and the hosting site can see it too, because the link loads the page.
- **The host seeing visits.** GitHub can see that a device downloaded the app (an IP address and browser type, like any website), but never what you log.
- **Losing data.** The browser can clear website storage, and removing the app from the Home Screen can remove its data too. See [Back up your data](#back-up-your-data).

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
  - **What else was going on?** then offers your details. Tap any that apply (each saves as you tap) or ignore it; **+ Add** creates a new one and adds it to what you just logged. **Done** puts the box away; it also goes when you switch tabs or log something else.
  - Each button shows how many days you've logged it this month, or "Day 3 · tap for today" during a run of days.
  - **＋ Add new** adds a button right there. **+ Add past entry** backdates one.
- **History:**
  - Every entry, newest first.
  - Tap one to change what it was, its date, time, details or note, or to delete it. **+ Add** under Details adds a new detail there too.
- **Patterns:**
  - Days this month and last month for each thing you track.
  - Bar charts of **days** (not taps), switchable between Week, Month and Year.
  - For anything that runs over several days, its episodes: dates, length, typical and longest, time between, and days since the last one.
  - The most common details for each thing you track.
  - **What tends to come before it?** compares what you track against each other.
- **Settings:**
  - **What you track** and **Details**: rename, reorder (↑ ↓), **Hide** or **Show**. Hidden ones are struck through and leave the Log screen and Patterns, but their entries stay in History and exports. Show brings them back. Next time you open Settings, they move to the bottom of the list.
  - **Merge duplicates** by renaming one to the other's name (Headaches → Headache). The app offers to merge them: the entries move over and the renamed one goes.
  - **Delete** appears on hidden rows only, so deleting always takes two deliberate steps. Something never logged is deleted at once, with Undo. Otherwise a confirmation says what goes: deleting something you track deletes its entries too; removing a detail takes it off its entries but keeps them.
  - **Data**: Export CSV, Import CSV, and **Delete all data** (with a confirmation step).

### Episodes

Counting days treats one 5-day flare and five separate headaches the same: 5 days. Episodes tell them apart, and answer the questions a doctor usually asks: how long does each one last, how often does it come back, and is that changing (say, after starting a new medicine)?

Patterns groups days in a row into **episodes**, so a 5-day flare shows up as one episode lasting 5 days, while headaches that come and go show up as one-day episodes. For anything that lasts several days, tap it once each day it's there. Extra taps on the same day are fine; for an inhaler, the log count works as a puff count.

Until something has run for two days or more, its Patterns card explains this where the episodes will appear. That note goes away once there are episodes to show, or once it has 3 finished episodes that typically last one day, like headaches (the same rule as the missed-days question).

**Missed days:** if you log after missing one or two days, the app asks whether it was still there.
- **Yes** fills in the missing days, marked "Filled in", so the episode stays whole.
- **No** keeps them as separate episodes.
- It stops asking for anything that has 3 finished episodes that typically last one day, such as headaches.

### Details or a button?

Details are only recorded alongside a log, so they show what comes up most often, not whether something comes *before* what you track.

To test a hunch, make it a button instead (Exercise, Medicine, Late meal…) and tap it *every* time it happens, including on good days. **What tends to come before it?** then compares it against your baseline:
- **`2.0×`** means it shows up beforehand twice as often as on a typical day.
- **First days only:** it looks at the first day of each episode, since what happened on day 5 of a flare didn't cause it.
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
- **Import:** importing the same file twice won't create duplicates. Importing an older backup brings back anything you've deleted since.

**CSV format:** `timestamp,item,tags,note`.
- `item` is the thing you tracked, and `tags` are its details, separated by `;`. The column names are unchanged from earlier versions, so older backups still import.
- Timestamps look like `2026-10-06T14:32:00+01:00`. A plain `2026-10-06 14:32` also works and is read as the device's local time.

## Share a link

Anyone can use the app: send them the link and they open it on their own phone. There's no account to create and nothing to download from an app store. Each person's data stays on their own phone; sharing the link never shares anyone's log.

```
https://<username>.github.io/health-log/
```

**A ready-made setup:** add `?track=` to pre-select what they'll track:

```
https://<username>.github.io/health-log/?track=Heartburn,Late+meal
```

- Names that match a suggestion are pre-selected, and others are added as new ones. They can still change the selection before tapping **Start logging**.
- Anyone who sees a pre-filled link can read what's in it, so only include what you're happy for others to see (see [Privacy & security](#privacy--security)).
- For the pre-selection to survive "Add to Home Screen", the icon has to keep the `?track=` part. The manifest leaves `start_url` unset so iOS keeps it, but this hasn't been verified on a real device. If it doesn't carry over, setup just opens with nothing selected.

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

## Host your own copy

Using the shared copy means trusting this repo and whoever controls it (see [Privacy & security](#privacy--security)). With your own copy, you only trust your own GitHub account, and the app only changes when you decide.

### Set it up (free, about 5 minutes)

1. Sign in to GitHub (a free account is fine) and open this repo.
2. Click **Fork** (top right), then **Create fork**. You now have your own copy at `github.com/<you>/health-log`. Forks of public repos are public, which is fine: the repo only holds code, never anyone's health data.
3. In your fork, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
4. After a minute or two, the Pages screen shows **Your site is live at** `https://<you>.github.io/health-log/`. If nothing appears, open your fork's **Actions** tab: new forks sometimes ask you to enable workflows first.
5. Open your URL on your phone and [install it](#install-on-iphone). Pre-filled `?track=` links work on your URL too.

### Updates: your choice

Your installed app only checks *your* site for updates, so it won't change unless your fork does.

- **Take updates:** when this repo has changed, your fork's main page says it's behind. Click **Sync fork**, then **Update branch**. Your site rebuilds within a minute or two, and the app picks it up next time it opens.
- **Review first:** click **Sync fork**, then **Compare**, to see exactly what changed before you update.
- **Stay as you are:** don't sync. Your copy keeps working exactly as it is.

### Move your data across

Each copy has its own web address, so each keeps its own separate data. Nothing moves across by itself.

1. In the app you've been using: **Settings → Export CSV**, and save the file.
2. Install your copy. On its setup screen, tap **Moving from another phone? Import a CSV backup** and choose the file.
3. The CSV holds your entries, so everything you've logged comes across. Things you track that have never been logged, and which ones are hidden, aren't in it. Re-add or re-hide those in **Settings**.
4. Once you've checked everything is there, clear the old copy (**Settings → Delete all data**) and remove its icon.

### Without a GitHub account

Download the code (**Code → Download ZIP**), unzip it, and drag the folder onto [Netlify Drop](https://app.netlify.com/drop) or Cloudflare Pages. All paths are relative, so it works at any address. Updates are then manual: download and upload again.

## Updating

- **How updates arrive:** the app opens instantly from its saved copy, then checks for a new version (at launch and whenever it comes back to the foreground). If one arrives before you've touched anything, it reloads once to show it. If you've already started tapping, it waits until next time. iPhone sometimes resumes a recently used app instead of relaunching it; closing it from the app switcher forces a fresh launch.
- **Cache version:** bump `VERSION` in `sw.js` with each release. A changed `sw.js` is how the app notices an update.
- **Adding or removing files:** also update the `FILES` list in `sw.js`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for setup, the four screens and the edit sheet |
| `style.css` | Styles. Light/dark via `prefers-color-scheme`; sizes in `rem` so text follows the system setting |
| `app.js` | Storage, rendering, episodes, patterns, layout fitting and CSV (one file, about 800 lines) |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `*.png` | Install metadata and icons |
