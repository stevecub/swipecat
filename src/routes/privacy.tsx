import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SwipeCat" },
      {
        name: "description",
        content:
          "SwipeCat privacy policy. We don't require accounts and don't sell personal data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border px-5 py-4">
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          ← Back
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: June 2026</p>
      </header>

      <main className="prose prose-sm mx-auto max-w-2xl px-5 py-6 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <p>
            SwipeCat ("we", "our", "the app") is a product-discovery app that lets you swipe
            through Amazon products. This page explains what we collect and what we don't.
          </p>
        </section>

        <h2 className="mt-8 text-lg font-bold">What we collect</h2>
        <p className="mt-2">
          <strong>Nothing personal.</strong> SwipeCat does not require an account, does not ask
          for your name, email, phone number, location, contacts, photos, or any other personal
          information.
        </p>

        <h2 className="mt-6 text-lg font-bold">What's stored on your device</h2>
        <p className="mt-2">
          Your liked, saved, and passed products are stored locally on your device using your
          browser's local storage (or the equivalent on iOS). This data never leaves your
          device and we cannot see it. You can clear it at any time by uninstalling the app or
          clearing site data.
        </p>

        <h2 className="mt-6 text-lg font-bold">Affiliate links</h2>
        <p className="mt-2">
          SwipeCat is a participant in the Amazon Services LLC Associates Program, an affiliate
          advertising program designed to provide a means for sites to earn advertising fees by
          advertising and linking to Amazon.com. <strong>As an Amazon Associate we earn from
          qualifying purchases.</strong> When you tap a product, you are taken to Amazon's
          website (in your browser or the Amazon app). Amazon's own privacy policy applies once
          you arrive there. We don't see what you buy.
        </p>

        <h2 className="mt-6 text-lg font-bold">Analytics</h2>
        <p className="mt-2">
          We do not use third-party advertising trackers or behavioral analytics SDKs. We may
          collect aggregate, anonymous crash reports through Apple's standard App Store
          diagnostics if you opt in to share them on your device.
        </p>

        <h2 className="mt-6 text-lg font-bold">Children</h2>
        <p className="mt-2">
          SwipeCat is not directed to children under 13 and we do not knowingly collect data
          from children.
        </p>

        <h2 className="mt-6 text-lg font-bold">Changes</h2>
        <p className="mt-2">
          If we materially change this policy, we'll update the date at the top of this page
          and, where appropriate, surface a notice in the app.
        </p>

        <h2 className="mt-6 text-lg font-bold">Contact</h2>
        <p className="mt-2">
          Questions? Email{" "}
          <a className="underline" href="mailto:stevecubberly@gmail.com">
            stevecubberly@gmail.com
          </a>
          .
        </p>

        <div className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link to="/about" className="underline">
            About SwipeCat
          </Link>
        </div>
      </main>
    </div>
  );
}
