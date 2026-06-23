import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SwipeCat" },
      {
        name: "description",
        content:
          "SwipeCat is a swipe-to-shop discovery app for Amazon products. As an Amazon Associate we earn from qualifying purchases.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border px-5 py-4">
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          ← Back
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight">About SwipeCat</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold">What it is</h2>
          <p className="mt-2">
            SwipeCat is a product-discovery app. Instead of scrolling through endless search
            results, you swipe a stack of curated cards — right to like, left to pass — to
            quickly find things you'd actually buy. Tap a card to view the full listing on
            Amazon.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Affiliate disclosure</h2>
          <p className="mt-2">
            <strong>
              As an Amazon Associate we earn from qualifying purchases.
            </strong>
          </p>
          <p className="mt-2">
            SwipeCat is a participant in the Amazon Services LLC Associates Program, an affiliate
            advertising program designed to provide a means for sites to earn advertising fees by
            advertising and linking to Amazon.com. Product links in this app include our Amazon
            Associates tracking tag. If you purchase a product after tapping through, Amazon may
            pay us a small commission at no extra cost to you. We are not paid by individual
            sellers to promote their products, and a commission does not change the price you
            pay or your relationship with Amazon.
          </p>
          <p className="mt-2">
            Prices, availability, and product details shown in SwipeCat are pulled from Amazon
            and may change at any time. The price you see on Amazon at checkout is the
            authoritative one.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">No account required</h2>
          <p className="mt-2">
            SwipeCat doesn't ask you to sign up. Your liked and saved items live only on your
            device. See our{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Support</h2>
          <p className="mt-2">
            Bug? Suggestion? Email{" "}
            <a className="underline" href="mailto:stevecubberly@gmail.com">
              stevecubberly@gmail.com
            </a>
            .
          </p>
        </section>

        <p className="pt-4 text-xs text-muted-foreground">
          Amazon and the Amazon logo are trademarks of Amazon.com, Inc., or its affiliates.
          SwipeCat is not affiliated with or endorsed by Amazon.
        </p>
      </main>
    </div>
  );
}
