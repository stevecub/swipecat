# Ship SwipeCat to the App Store — Step-by-Step

Since you've got Mac + Xcode + Apple Developer Program ready, here's the lean step-by-step. I do all code, config, assets, and copy. You only step in for short tasks that need your Mac or Apple ID.

We go **one step at a time**. After each step I'll stop, tell you exactly what (if anything) you need to do, and wait for your "done" before moving on.

---

## Step 1 — Decisions (2 min, you)
I ask 4 short questions: bundle ID, support email, app name/subtitle, icon direction.

## Step 2 — App polish for iOS (me)
- Safe-area insets (notch / Dynamic Island / home indicator)
- Disable iOS pull-to-refresh, double-tap zoom, text-selection on cards
- Status bar styling
- Hide `/admin` in production
- Tap-target + mobile-viewport audit

## Step 3 — Required legal pages (me)
- `/privacy` — privacy policy (no accounts, local storage only, affiliate disclosure, contact)
- `/about` — long-form affiliate disclosure + app description (reviewers read this)

## Step 4 — App icon + launch screen (me)
- Generate icon at 1024×1024 and the full iOS icon set
- Generate launch screen
- Drop into `ios-assets/` ready for Xcode

## Step 5 — Capacitor wiring (me)
- `capacitor.config.ts` with your bundle ID + app name
- Add `@capacitor/core`, `ios`, `status-bar`, `splash-screen`, `haptics`
- Wire native haptics into swipe gestures
- Write `IOS-BUILD.md` with the exact commands you'll run

## Step 6 — Export to your Mac (~5 min, you, I guide)
Exact commands I'll give you:
```
git clone <repo-url>
cd swipecat
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

## Step 7 — Xcode setup (~10 min, you, I guide click-by-click)
- Select signing team
- Confirm bundle ID
- Drag in the icon set
- Set version `1.0.0`, build `1`
- Run in Simulator to verify

## Step 8 — Screenshots for the App Store (me)
Generate the required 6.9" and 6.5" iPhone screenshots from the running preview.

## Step 9 — App Store Connect listing (me writes, you paste, ~15 min)
Ready-to-paste copy for every field:
- Name, subtitle, promo text, description, keywords, what's new
- Category, age rating answers, privacy "nutrition label" answers
- **Review notes** — pre-written explanation of the affiliate model so reviewers don't flag it
- Support URL + privacy policy URL (live pages from Step 3)

## Step 10 — Archive & submit (~10 min, you, I guide)
Xcode → Product → Archive → Distribute → Upload. Then in App Store Connect: attach build, Submit for Review.

## Step 11 — Review wait + reply (Apple, 24–72 hrs)
If Apple comes back with questions, forward me the message and I'll draft your reply.

---

## Kicking off now

Approve and I'll send the 4 Step 1 questions in the very next message. After your answers, I dive straight into Step 2.
