# SwipeCat — iOS Build Guide

This document walks you through wrapping the SwipeCat web app as a native iOS
app using Capacitor and submitting it to the App Store.

All Capacitor config and dependencies are already wired up. On the Mac, you
only need to run a handful of commands and click through a few Xcode screens.

---

## One-time prerequisites (you have these already)

- macOS with Xcode installed and signed in to your Apple ID in Xcode
- Apple Developer Program membership (active)
- Node.js 20+ and npm
- CocoaPods (`sudo gem install cocoapods` if not installed — Xcode usually
  prompts you the first time)
- A Rainforest API key (get one free at https://app.rainforestapi.com/)

---

## Step 1 — Configure environment variables

Before building, copy `.env` to `.env.local` (or edit `.env` directly) and
fill in your secrets:

```
RAINFOREST_API_KEY="your-key-here"
```

The Rainforest key is **server-side only** — it is never bundled into the
iOS app. It is used exclusively by the admin seeding function to populate the
Supabase product catalog. The iOS app reads products from Supabase.

You will also need your Supabase service role key for the admin seeding to
work. Add it to `.env`:

```
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

---

## Step 2 — Seed the product catalog (one-time, then refresh as needed)

1. Deploy the app to your hosting environment (or run `npm run dev` locally).
2. Navigate to `/admin` in a browser.
3. Sign up for an admin account and click **Claim admin**.
4. Select the categories you want and click **Seed categories**.
   - Each category costs 1 Rainforest API credit (~16 products per category).
   - 10 categories = 10 credits total.
5. Products are fetched from Rainforest and stored in Supabase.
   The iOS app reads from Supabase — no Rainforest calls happen on-device.

Re-run this step whenever you want to refresh the catalog with new listings.

---

## Step 6 — Pull the project to your Mac

```bash
git clone <your-repo-url> swipecat
cd swipecat
npm install
npm run build:capacitor  # ⚠️ IMPORTANT: use build:capacitor, NOT npm run build
npx cap add ios          # creates the ios/ folder — only on first run
npx cap sync ios         # copies the latest web build into the iOS shell
npx cap open ios         # opens Xcode
```

If `npx cap add ios` says "ios platform already exists", skip it and continue
with `npx cap sync ios`. You'll re-run `npm run build:capacitor && npx cap sync ios`
every time you pull new web changes from Lovable.

---

## Step 7 — Xcode setup (one-time)

When Xcode opens:

1. **Select the App target** in the left sidebar (top of the file tree).
2. Open the **Signing & Capabilities** tab.
   - Check **Automatically manage signing**.
   - Pick your **Team** from the dropdown (your Apple Developer account).
   - Confirm **Bundle Identifier** is `app.swipecat`. If Xcode reports the
     bundle ID is already taken, change it to something unique like
     `app.swipecat.ios`.
3. Open the **General** tab.
   - Set **Display Name** to `SwipeCat`.
   - Set **Version** to `1.0.0` and **Build** to `1`.
   - **Deployment Target**: iOS 14.0 or later.
4. **Drop in the app icon set**: In Finder, open `ios-assets/AppIcon.appiconset/`
   from this repo. In Xcode, open `App/Assets.xcassets`, delete the existing
   empty `AppIcon` entry, then drag `AppIcon.appiconset` from Finder into the
   Assets catalog. Xcode will register all sizes automatically.
5. Hit **Cmd+R** to run on the iOS Simulator and verify the app launches,
   swipes work, and the disclosure shows under the header.

If you change anything in the web app afterwards, run from the project root:

```bash
npm run build:capacitor && npx cap sync ios
```

Then re-build in Xcode.

---

## Step 10 — Archive & upload

1. In Xcode's top bar, set the run destination to **Any iOS Device (arm64)**.
2. Menu: **Product → Archive**. Wait for it to finish (a few minutes).
3. The **Organizer** window opens. Select the new archive and click
   **Distribute App → App Store Connect → Upload**. Accept the defaults.
4. Wait for the "Upload Successful" message.

Then in your browser at <https://appstoreconnect.apple.com>:

1. **My Apps → +** → **New App**.
2. Platform: iOS. Name: `SwipeCat`. Primary language: English (U.S.).
   Bundle ID: `app.swipecat`. SKU: `swipecat-ios-001`.
3. Fill every field using the copy block in `APPSTORE-LISTING.md`.
4. Under **Build**, attach the build you just uploaded (it may take 15–30
   minutes to appear after upload).
5. Click **Submit for Review**.

---

## Re-building after Lovable changes

```bash
git pull
npm install                          # only if dependencies changed
npm run build:capacitor              # ⚠️ NOT npm run build — that's the SSR/web build
npx cap sync ios
# In Xcode: bump Build number (1 → 2 → 3 …), Product → Archive, upload.
```

---

## Rainforest API — Architecture Notes

SwipeCat uses a **cache-first** architecture for product data:

```
Rainforest API
     │
     │  (admin seeds catalog — server-side only)
     ▼
Supabase (products table)
     │
     │  (iOS app reads products — fast, no API credits used)
     ▼
SwipeCat iOS App
```

This means:
- The iOS app never calls Rainforest directly — no API key is needed on-device.
- Products are always fast to load (Supabase read, not a live scrape).
- You control the catalog: seed it, refresh it, or curate it from the admin panel.
- Rainforest credits are only consumed when you explicitly seed from the admin panel.
