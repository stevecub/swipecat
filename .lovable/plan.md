
# Swipe-to-Shop iPhone App — Plan

## How "iPhone native" works on Lovable

Lovable builds web apps. To ship a real iPhone app to the App Store, we build a polished mobile-first React app, then wrap it with **Capacitor** — the standard way to package a web app as a native iOS binary. The wrapped app runs natively on iPhone, can use native gestures/haptics, and is what gets submitted to the App Store. This is the same approach used by many production iOS apps.

You will need a Mac with Xcode and an Apple Developer account ($99/year) for the final build + submission step. I'll walk you through it at the end.

## Scope (v1 — what I'll build now)

### Screens
1. **Discover (home)** — one product card at a time, swipeable
2. **Saved** — grid/list of liked + saved products
3. **Product Detail** — full image, description, price, "Buy" CTA (will become Amazon affiliate link later)
4. **Bottom tab nav** — Discover / Saved

### Swipe card
- Large product image, title, short description, price
- Drag/swipe gestures (right = like, left = pass, up = save for later)
- Tap buttons below card: Pass · Save · Like · Details
- Smooth spring animations, rotation on drag, color tint overlay (green right / red left)
- Haptic-style visual feedback
- **Onboarding hint overlay** on first 2–3 cards: animated "swipe right to like, left to pass" coachmarks that auto-dismiss after the user swipes a couple of times (persisted in localStorage so it doesn't reappear)

### Data
- Placeholder product feed (10–20 sample products with real-looking imagery)
- Liked/saved state persisted in localStorage for v1
- Product data structured behind a single `getProducts()` adapter so we can swap the source later without touching UI

### Design
- Mobile-first, iPhone viewport
- Clean ecommerce aesthetic — lots of whitespace, large imagery, minimal chrome
- Rounded card with subtle shadow, single accent color for primary CTA
- Tailwind tokens defined in `src/styles.css` (no hardcoded colors)

## Roadmap (planned, not built in v1)

### Phase 2 — Amazon affiliate integration
- Add your **Amazon Associate tag** (e.g. `yourtag-20`) as configurable setting
- Swap placeholder products for real Amazon products via one of:
  - **Amazon Product Advertising API (PA-API 5.0)** — official, requires Associate account with qualifying sales, server-side calls (we'd enable Lovable Cloud for a secure proxy)
  - **Rainforest API / Keepa** — third-party scrapers, easier to start, paid
- All "Buy" / "View Details" links append `?tag=yourtag-20` so you get affiliate credit
- Cache products server-side to respect API rate limits

### Phase 3 — iOS native wrap & App Store
I'll guide you through:
1. Export the Lovable project to GitHub
2. Clone locally, run `npm install`
3. `npm install @capacitor/core @capacitor/ios && npx cap init && npx cap add ios`
4. `npm run build && npx cap sync ios`
5. `npx cap open ios` — opens Xcode
6. In Xcode: set bundle ID, signing team, app icon, launch screen
7. Test on iPhone Simulator, then physical device
8. Apple Developer enrollment ($99/year)
9. Create App Store Connect listing (screenshots, description, privacy policy — required because of affiliate links)
10. Archive & upload via Xcode → TestFlight → App Store submission
11. Apple review (~24–72 hrs typically). Note: Apple is strict about affiliate apps — the app must offer real user value beyond redirect-to-Amazon. Our swipe discovery UX qualifies, but we'll need a clear privacy policy and a "Sign in with Apple" option if we add accounts.

## Technical notes
- Stack: TanStack Start + React + Tailwind v4 + Framer Motion (for swipe gestures and card animations)
- Routes: `/` (discover), `/saved`, `/product/$id`
- Components: `SwipeCard`, `SwipeDeck`, `ActionButtons`, `SwipeHints`, `BottomNav`, `ProductDetail`
- State: localStorage hook for liked/saved/passed; product adapter in `src/lib/products.ts`
- No backend in v1 — enabled in Phase 2 when we wire Amazon

## What I need from you to start Phase 2 later
- Your Amazon Associate tag
- Whether you've qualified for PA-API (3 sales in 180 days) or want to start with a third-party API
