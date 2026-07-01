import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRatings() {
  let allProducts = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("category, rating, review_count")
      .range(from, from + PAGE - 1);
    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const total = allProducts.length;
  const hasRating = allProducts.filter(p => p.rating != null && p.rating > 0).length;
  const hasReviews = allProducts.filter(p => p.review_count != null && p.review_count > 0).length;

  console.log(`\nTotal products: ${total}`);
  console.log(`Has rating:     ${hasRating} (${((hasRating/total)*100).toFixed(1)}%)`);
  console.log(`Has reviews:    ${hasReviews} (${((hasReviews/total)*100).toFixed(1)}%)`);

  // Per-category breakdown
  const cats = {};
  for (const p of allProducts) {
    const c = p.category || "unknown";
    if (!cats[c]) cats[c] = { total: 0, rated: 0 };
    cats[c].total++;
    if (p.rating != null && p.rating > 0) cats[c].rated++;
  }

  console.log("\nPer-category rating coverage:");
  for (const [cat, { total, rated }] of Object.entries(cats).sort((a,b) => b[1].total - a[1].total)) {
    console.log(`  ${cat.padEnd(28)} ${rated}/${total} (${((rated/total)*100).toFixed(0)}%)`);
  }

  // Sample some rated products
  const samples = allProducts.filter(p => p.rating > 0).slice(0, 5);
  console.log("\nSample rated products:");
  for (const p of samples) {
    console.log(`  rating=${p.rating}  reviews=${p.review_count}  category=${p.category}`);
  }
}

checkRatings();
