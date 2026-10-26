# Risk review: accessibility, IP, Amazon, and App Store

## Biggest risks found (in priority order)

1. **Amazon product data source (highest risk).** Amazon's Associates rules only allow product data, images and prices from their official product API (or SiteStripe). Our catalog was loaded through a third-party scraper (Rainforest). That can get the affiliate account closed and commissions forfeited. Fix: switch to Amazon's official API as soon as it's unlocked (it unlocks after 3 qualifying sales), and until then keep the catalog small.
2. **Prices shown without a date.** Amazon requires any displayed price to say when it was checked, and it must be refreshed at least every 24 hours, or prices hidden. Fix: show "Price as of [date/time]. Details" next to each price, and hide prices older than 24 hours.
3. **"Tinder" in the page description.** Using another company's trademark in our description/listing invites a complaint. Fix: reword to "Swipe to discover great products."
4. **Swipe-only actions (accessibility).** After removing the X/heart buttons, Like/Pass only work by swiping. Accessibility rules (WCAG 2.5.1/2.5.7) and VoiceOver users need a non-swipe way. Fix: add small, labeled Pass / Like buttons (or VoiceOver actions) under the card.
5. **Motion sensitivity.** Pulsing hints, jiggling badges and celebrations ignore the iPhone "Reduce Motion" setting. Fix: calm these down when Reduce Motion is on.
6. **Screen-reader labels and contrast.** Several icon-only buttons have no spoken label; some gray text on white and the white toggle knob are low contrast; tap targets under 44px. Fix: add labels, darken text, enlarge tap targets.
7. **App Store review items.** Make sure the privacy policy matches what we collect, the App Privacy answers in App Store Connect say "no data collected/linked" (if true), and the app clearly does more than a website wrapper (haptics, notifications, offline cache already help).

## Lower risk / fine as is
- The name "SwipeCat" and the cat icon are original; "swipe" itself is a common word. A quick trademark search on USPTO before launch is still wise.
- Affiliate disclosure is already in the right places.
- Product images are Amazon's; we must not crop, edit, or watermark them (we don't).

## What I'd build
- Price-as-of timestamp + 24-hour hide rule (with a small test).
- Reword the "Tinder" description.
- Labeled Pass/Like buttons for accessibility (compact, matches design).
- Reduce Motion support for hints, badges, celebrations.
- Accessibility labels, contrast, and tap-target fixes across screens.
- A short note in the admin page reminding to move to the official Amazon API.

Not legal advice — for the Amazon data question especially, it's worth a quick read of the Associates Operating Agreement.

## Technical details
- `useReducedMotion` from framer-motion in swipe-hints, streak-badge, level-up-celebration; CSS `@media (prefers-reduced-motion)` for `.animate-badge-jiggle`.
- Use stored `updated_at` on products for "as of" timestamp; helper `isPriceFresh()` with vitest test.
- Replace hardcoded gray/white classes with tokens in context menu and toggle.
