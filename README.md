# Health Log

A one-tap health tracker: headaches, back pain, exercise, or anything else you want to keep an eye on. It works offline, with no account.

Your data stays on your phone: no account, no analytics, and the app can't send it anywhere. See [Privacy & security](#privacy--security) for what that does and doesn't protect against.

## How it works

The app has two ideas:

- **Things you track** are buttons on the Log screen. Tap one when it happens. They can be symptoms (Headache), habits (Exercise), or anything else.
- **Factors** are short notes on what else might be connected when you log something, like Stress or Poor sleep. They're optional and attach to that one log.

### Screens

- **Setup (first launch):**
  - One question: what do you want to keep track of? It suggests Headache, Back pain and Exercise; nothing is pre-selected, and you can add your own. **Start logging** stays visible at the bottom at any text size. You can also import a backup file instead.
  - Install advice depends on the device. On iPhone, setup waits for a 3-step "Add to Home Screen" card, worded for Safari, Chrome or other browsers, because the Home Screen app keeps its own data. On Android, an optional "Install Health Log" card sits above setup, with an **Install** button where the browser offers one, since the browser and installed app share data. On a computer, a quiet "Install app" link appears only where the browser offers it.
  - Opened inside another app's built-in browser (a link tapped in Instagram, Facebook, Gmail...), a note above setup says to open the page in Safari or Chrome first: those browsers can't install apps and may not keep data.
- **Log:**
  - Tap a button to log it with the current time. A message confirms it with **Undo** and **Edit**.
  - Then tap any possible factors that apply, or add one in a couple of words. **Done** puts the box away. The first time, the box opens with a text field and a short explanation; starter factors (Stress, Poor sleep) are ready as choices. A long entry (more than three words) is checked first: add it anyway, shorten it, or save it as a note on that log instead.
  - Tapping the same button again within 10 minutes asks first ("Headache again? You logged it 2 minutes ago."), since a quick second tap is usually a slip.
  - Each button shows how many days you've logged it this month, or "Day 3 · tap for today" during a run of days.
  - **＋ Add new** adds a button. **+ Add past entry** backdates one.
- **History:** every entry, newest first. Tap a row to open and edit it (the pencil does the same); the trash deletes it right there, with Undo.
- **Patterns:**
  - Days this month and last month, and bar charts of days (not taps) by week, month or year.
  - Episodes for anything that lasts several days, with dates listed for multi-day episodes.
  - The most common factors for each thing you track, and **Show notes** at the bottom of a card (when it has notes): a sheet from the bottom with all of that thing's notes, newest first.
  - **What tends to come before it?** at the bottom compares what you track against each other, in plain sentences (see below).
- **Settings:**
  - **What you track** and **Factors**: rename and reorder. Adding a factor of more than three words asks first (add it anyway, or shorten it).
  - **Hide**: takes it off the Log screen and Patterns; past entries stay. Hidden ones move to the bottom of the list.
  - **Merge**: rename one to match another (Headaches → Headache).
  - **Delete**: on hidden rows only.
  - **Backup**: Export to a file, or Import from a file (it shows what's new before adding anything).
  - **Storage**: how many entries are on this phone, and Delete all data.
  - **Theme**: Auto (follow the phone), Dark or Light.
  - At the bottom: the app's version and **Check for updates**. The same line sits at the bottom of the Log screen.

### Episodes

Days in a row count as one **episode**. A 5-day flare is one episode, not five separate days, so Patterns can show how long each one lasts and how far apart they are, which is what a doctor will ask.
- **Tap it each day it's there.** Extra taps on the same day are fine.
- **Missed a day or two?** The app asks if it was still there. **Yes** fills the gap; **No** keeps them separate. It stops asking for things that usually last a day, like headaches.

### Factors or a button?

Factors only show what comes up most often. To test whether something comes *before* a symptom, such as a late meal, make it a button and tap it every time it happens, even on good days. **What tends to come before it?** then shows, for each thing, how often your symptom started on the days you logged it (and the day after) compared with all other days. For example: "Headache started on 25% of days you logged Inhaler (2 of 8) and 2% of all other days (1 of 44)." If the first number is much higher than the second, it may be linked.
- **Each thing is compared only since you first logged it.** Days before that aren't counted as "without it", which would make a newly tracked thing look more telling than it is.
- **A plain verdict:** with fewer than 5 episodes it says **Too soon to tell**; after that, **Looks linked**, **Might be linked** or **No clear link**. A link shows up together, not that one causes the other, and needs a few weeks of data.
- **For your doctor:** a short written summary of the same facts, with a **Copy summary** button.
- **The window** (the same day, or up to 5 days before) can be changed; use a longer one for slow-onset things.

## Install on iPhone

1. Open the link in Safari (or Chrome).
2. Tap **Share** (bottom of the screen in Safari, top right in Chrome), then **Add to Home Screen**.
3. Open **Health Log** from the Home Screen. It runs full-screen and works offline.

Set it up and log from the Home Screen icon, not the browser tab: the two keep separate data.

## Back up your data

Data lives only on the device, and browsers can clear website storage. Home Screen apps are mostly exempt, but Apple doesn't guarantee it.
- **Persistent storage:** the app asks the browser to mark its storage as persistent, so it isn't cleared to free up space. If the browser says no, Settings shows a short warning under Storage.
- **Export:** use **Settings → Export to a file** regularly. On iPhone it opens the share sheet so you can save to Files or iCloud Drive. The app only says "Backup saved" once the share sheet has finished; when it falls back to a download, it asks you to check the file is there.
- **Reminder:** when a backup is overdue, the Settings tab shows an orange dot and the Backup status turns orange.
- **Import:** in Settings, the app first shows how many entries are new and adds nothing until you confirm. Importing the same file twice won't create duplicates. Importing an older backup brings back anything you've deleted since.

**CSV format:** `timestamp,item,tags,note`.
- `item` is the thing you tracked, and `tags` are its factors, separated by `;`. The column names are unchanged from earlier versions, so older backups still import.
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

## Accessibility and text size

- **Text size:** follows the phone's setting. On iPhone that's **Settings → Display & Brightness → Text Size** (and **Accessibility → Larger Text**).
- **Layout:** Log buttons stay two across, and Settings rows stay on one line, until a name genuinely doesn't fit. A button with a name too long for half the width takes a full row while the others stay two across; at the largest text sizes that means one per row. Nothing clips or scrolls sideways.
- **Fixed sizes:** chart axis labels and the bottom tab bar cap their size so they always fit.
- **Theme:** follows the phone's setting by default (Auto). The round button at the top right switches between light and dark in one tap; **Settings → Theme** offers Auto, Dark and Light. The choice is remembered on that device.

## Privacy & security

Health data is sensitive, so here is plainly what the app does and doesn't protect against.

**What it does**
- **Your data stays on your phone.** Everything you log is stored in the browser's local storage on that device. There is no server, account, sync or analytics, so there is nowhere for it to go.
- **The app can't send data anywhere.** Its code makes no network requests, and a Content-Security-Policy (`connect-src 'none'`) blocks them even if one were added by mistake. The only network activity is downloading the app's own files (and later updates) from the site it's hosted on.
- **No third-party code.** No analytics, ads, fonts, CDNs or libraries. Every file is in this repo, and the policy above only allows the app's own files.

**What it doesn't protect against**
- **A compromised hosting site or GitHub account.** The app's code is delivered from GitHub Pages and updates install automatically. If this repo or the account behind it were compromised, a malicious update could read your stored data and send it elsewhere; it could also remove the Content-Security-Policy, which lives in the app's own HTML. You are trusting whoever controls the site. To avoid that, you can [host your own copy](#host-your-own-copy); [control over updates](https://github.com/quepol/health-log/issues/15) for the shared copy is planned.
- **Someone with your unlocked phone.** There's no separate passcode, so anyone who can unlock the phone can open the app and see your log. Your phone's passcode and device encryption are the protection.
- **Exported backups.** **Export to a file** creates a plain, unencrypted CSV file. Once you save or share it (Files, iCloud Drive, email), it's protected only by wherever you put it.
- **Pre-filled links.** A link like `?track=Heartburn` shows what someone is tracking to anyone who sees it, and the hosting site can see it too, because the link loads the page.
- **The host seeing visits.** GitHub can see that a device downloaded the app (an IP address and browser type, like any website), but never what you log.
- **Losing data.** The browser can clear website storage, and removing the app from the Home Screen can remove its data too. See [Back up your data](#back-up-your-data).

## For developers

It's a static PWA in plain HTML, CSS and JS: no build step, no dependencies, no backend.

### Host your own copy

Using the shared copy means trusting this repo and whoever controls it (see [Privacy & security](#privacy--security)). With your own copy, you only trust your own GitHub account, and the app only changes when you decide.

#### Set it up (free, about 5 minutes)

1. Sign in to GitHub (a free account is fine) and open this repo.
2. Click **Fork** (top right), then **Create fork**. You now have your own copy at `github.com/<you>/health-log`. Forks of public repos are public, which is fine: the repo only holds code, never anyone's health data.
3. In your fork, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
4. After a minute or two, the Pages screen shows **Your site is live at** `https://<you>.github.io/health-log/`. If nothing appears, open your fork's **Actions** tab: new forks sometimes ask you to enable workflows first.
5. Open your URL on your phone and [install it](#install-on-iphone). Pre-filled `?track=` links work on your URL too.

#### Updates: your choice

Your installed app only checks *your* site for updates, so it won't change unless your fork does.

- **Take updates:** when this repo has changed, your fork's main page says it's behind. Click **Sync fork**, then **Update branch**. Your site rebuilds within a minute or two, and the app picks it up next time it opens.
- **Review first:** click **Sync fork**, then **Compare**, to see exactly what changed before you update.
- **Stay as you are:** don't sync. Your copy keeps working exactly as it is.

#### Move your data across

Each copy has its own web address, so each keeps its own separate data. Nothing moves across by itself.

1. In the app you've been using: **Settings → Export to a file**, and save the file.
2. Install your copy. On its setup screen, tap **Moving from another phone? Import a backup file** and choose the file.
3. The CSV holds your entries, so everything you've logged comes across. Things you track that have never been logged, and which ones are hidden, aren't in it. Re-add or re-hide those in **Settings**.
4. Once you've checked everything is there, clear the old copy (**Settings → Delete all data**) and remove its icon.

#### Without a GitHub account

Download the code (**Code → Download ZIP**), unzip it, and drag the folder onto [Netlify Drop](https://app.netlify.com/drop) or Cloudflare Pages. All paths are relative, so it works at any address. Updates are then manual: download and upload again.

### Run locally

Any static file server works. The service worker needs `http://localhost` or HTTPS, so opening the file with `file://` won't work offline.

```sh
cd health-log
python3 -m http.server 8000
# open http://localhost:8000
```

To try it on a phone over Wi-Fi, open `http://<your-computer's-LAN-IP>:8000`. Installing and offline mode need HTTPS, so for real use, [host your own copy](#host-your-own-copy).

### Updating

- **How updates arrive:** the app opens instantly from its saved copy, then checks for a new version (at launch and whenever it comes back to the foreground). If one arrives before you've touched anything, it reloads once to show it. If you've already started tapping, it waits until next time. iPhone sometimes resumes a recently used app instead of relaunching it; closing it from the app switcher forces a fresh launch. **Settings → Check for updates** checks straight away.
- **Cache version:** bump `VERSION` in `sw.js` with each release, keeping the `v` + number format. A changed `sw.js` is how the app notices an update, and Settings shows that number as the version.
- **Adding or removing files:** also update the `FILES` list in `sw.js`.

### Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for setup, the four screens and the edit sheet |
| `style.css` | Styles. Light/dark via `prefers-color-scheme`; sizes in `rem` so text follows the system setting |
| `theme.js` | Applies a saved light/dark choice before the page draws, so it never flashes the other theme |
| `app.js` | Storage, rendering, episodes, patterns, layout fitting and CSV (one file, about 1,000 lines) |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `*.png` | Install metadata and icons |
