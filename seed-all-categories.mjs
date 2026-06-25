/**
 * Seed script: fetches products from Rainforest API for all categories
 * and upserts them into Supabase with high-resolution images.
 *
 * Run with: node seed-all-categories.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
const env = readFileSync('.env', 'utf8');
function getEnv(key) {
  const m = env.match(new RegExp('^' + key + '=(.+)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : null;
}

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const SERVICE_KEY  = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const RAINFOREST   = getEnv('RAINFOREST_API_KEY');

if (!SUPABASE_URL || !SERVICE_KEY || !RAINFOREST) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAINFOREST_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Category definitions ──────────────────────────────────────────────────────
// Each entry: { label (stored in DB), searchTerm (sent to Rainforest) }
const CATEGORIES = [
  { label: "Women's Shoes",       searchTerm: "women's shoes bestsellers fashion" },
  { label: "Electronics",         searchTerm: "electronics gadgets bestsellers" },
  { label: "Women's Fashion",     searchTerm: "women's fashion clothing bestsellers" },
  { label: "Men's Fashion",       searchTerm: "men's fashion clothing bestsellers" },
  { label: "Beauty & Skincare",   searchTerm: "beauty skincare bestsellers makeup" },
  { label: "Home Decor",          searchTerm: "home decor bestsellers interior" },
  { label: "Kitchen Gadgets",     searchTerm: "kitchen gadgets tools bestsellers" },
  { label: "Fitness & Activewear",searchTerm: "fitness activewear workout gear bestsellers" },
  { label: "Jewelry & Accessories",searchTerm: "jewelry accessories fashion bestsellers" },
  { label: "Pet Supplies",        searchTerm: "pet supplies dog cat bestsellers" },
];

// ── Image URL upgrader ────────────────────────────────────────────────────────
// Amazon image URLs contain size codes like _SL160_, _SX300_, _AC_UL320_ etc.
// We replace them with _SL1500_ (highest quality available) for crisp display.
function upgradeImageUrl(url) {
  if (!url) return url;
  // Replace common size suffixes with high-res version
  return url
    .replace(/_SL\d+_/g, '_SL1500_')
    .replace(/_SX\d+_/g, '_SX1500_')
    .replace(/_AC_UL\d+_/g, '_AC_UL1500_')
    .replace(/_AC_SR\d+,\d+_/g, '_AC_SL1500_')
    .replace(/_SS\d+_/g, '_SL1500_')
    .replace(/_CR\d+,\d+,\d+,\d+_/g, '')  // remove crop params
    .replace(/\._[A-Z]{2}\d+_\./g, '.');   // remove other size codes
}

// ── Fetch from Rainforest ─────────────────────────────────────────────────────
async function fetchCategory(cat) {
  const url = new URL('https://api.rainforestapi.com/request');
  url.searchParams.set('api_key', RAINFOREST);
  url.searchParams.set('type', 'search');
  url.searchParams.set('amazon_domain', 'amazon.com');
  url.searchParams.set('search_term', cat.searchTerm);
  url.searchParams.set('sort_by', 'featured');
  url.searchParams.set('fields', [
    'search_results.asin',
    'search_results.title',
    'search_results.image',
    'search_results.images',
    'search_results.rating',
    'search_results.ratings_total',
    'search_results.price',
    'search_results.prices',
    'search_results.description',
    'search_results.snippet',
  ].join(','));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${cat.label}`);
  const json = await res.json();
  return json.search_results ?? [];
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`Seeding ${CATEGORIES.length} categories into ${SUPABASE_URL}\n`);

let totalInserted = 0;
const summary = [];

for (const cat of CATEGORIES) {
  process.stdout.write(`  ${cat.label.padEnd(25)} ... `);
  try {
    const results = await fetchCategory(cat);

    const rows = results
      .filter(r => r.asin && r.title && r.image)
      .map(r => {
        const price    = r.price?.value ?? r.prices?.[0]?.value ?? null;
        const currency = r.price?.currency ?? r.prices?.[0]?.currency ?? 'USD';
        const desc     = r.snippet ?? r.description ?? '';

        // Pick the highest-res image available
        let image = r.image;
        if (r.images && r.images.length > 0) {
          // images array often has higher-res variants
          image = r.images[r.images.length - 1] ?? r.image;
        }
        image = upgradeImageUrl(image);

        return {
          title:        r.title.slice(0, 300),
          description:  desc.slice(0, 1000),
          price:        price,
          currency,
          image,
          category:     cat.label,
          asin:         r.asin,
          rating:       r.rating ?? null,
          review_count: r.ratings_total ?? null,
          source:       'rainforest',
        };
      });

    if (rows.length === 0) {
      console.log(`0 products (no valid results from ${results.length} raw)`);
      summary.push({ category: cat.label, inserted: 0, error: 'no valid results' });
      continue;
    }

    const { error, count } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'asin', count: 'exact', ignoreDuplicates: true });

    if (error) {
      console.log(`ERROR: ${error.message}`);
      summary.push({ category: cat.label, inserted: 0, error: error.message });
    } else {
      const n = count ?? rows.length;
      console.log(`${n} products inserted (${results.length} fetched)`);
      summary.push({ category: cat.label, inserted: n });
      totalInserted += n;
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    summary.push({ category: cat.label, inserted: 0, error: e.message });
  }

  // Small delay to be polite to the API
  await new Promise(r => setTimeout(r, 500));
}

// Final count
const { count: total } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true });

console.log('\n─────────────────────────────────────────');
console.log(`Total products in database: ${total}`);
console.log(`Inserted this run: ${totalInserted}`);
console.log('\nSummary:');
for (const s of summary) {
  const status = s.error ? `ERROR: ${s.error}` : `${s.inserted} inserted`;
  console.log(`  ${s.category.padEnd(25)} ${status}`);
}
