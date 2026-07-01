#!/usr/bin/env node
/**
 * SwipeCat Product Refresh Script
 *
 * Fetches products from Rainforest API using rotated search terms and upserts
 * them into Supabase. Designed to run on a schedule via GitHub Actions.
 *
 * Usage:
 *   node scripts/refresh-products.mjs [--mode daily|weekly|full]
 *
 * Environment variables required:
 *   RAINFOREST_API_KEY    — Rainforest API key
 *   SUPABASE_URL          — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for server-side writes)
 *
 * Modes:
 *   daily  — 1 rotated search term per category, page 1 only (10 credits)
 *   weekly — Bestsellers + Deals for all categories (20 credits)
 *   full   — All search terms, 3 pages each (240 credits)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Configuration ────────────────────────────────────────────────────────────

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!RAINFOREST_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  if (!RAINFOREST_API_KEY) console.error("  - RAINFOREST_API_KEY");
  if (!SUPABASE_URL) console.error("  - SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Category → Label mapping ─────────────────────────────────────────────────

const CATEGORY_LABELS = {
  "womens-shoes": "Women's Shoes",
  "electronics": "Electronics",
  "womens-fashion": "Women's Fashion",
  "mens-fashion": "Men's Fashion",
  "beauty": "Beauty & Skincare",
  "home-decor": "Home Decor",
  "kitchen": "Kitchen Gadgets",
  "fitness": "Fitness & Activewear",
  "jewelry": "Jewelry & Accessories",
  "pets": "Pet Supplies",
};

// ── Search terms ─────────────────────────────────────────────────────────────

const SEARCH_TERMS = JSON.parse(
  readFileSync(join(__dirname, "search-terms.json"), "utf-8")
);

// ── Rotation state (persisted to file so it survives across runs) ────────────

const STATE_FILE = join(__dirname, ".rotation-state.json");

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  // Initialize: index 0 for every category
  const state = {};
  for (const catId of Object.keys(SEARCH_TERMS)) {
    state[catId] = 0;
  }
  return state;
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Rainforest API helpers ───────────────────────────────────────────────────

const DELAY_MS = 500; // Delay between requests to be respectful

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rainforestSearch(searchTerm, page = 1) {
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", RAINFOREST_API_KEY);
  url.searchParams.set("type", "search");
  url.searchParams.set("amazon_domain", "amazon.com");
  url.searchParams.set("search_term", searchTerm);
  url.searchParams.set("sort_by", "featured");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rainforest HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.search_results ?? [];
}

async function rainforestBestsellers(categoryUrl) {
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", RAINFOREST_API_KEY);
  url.searchParams.set("type", "bestsellers");
  url.searchParams.set("url", categoryUrl);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rainforest HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.bestsellers ?? [];
}

async function rainforestDeals(dealType = "trending") {
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", RAINFOREST_API_KEY);
  url.searchParams.set("type", "deals");
  url.searchParams.set("amazon_domain", "amazon.com");
  url.searchParams.set("deal_type", dealType);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rainforest HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.deals ?? [];
}

// ── Product normalization ────────────────────────────────────────────────────

function normalizeSearchResult(r, categoryLabel) {
  if (!r.asin || !r.title || !r.image) return null;
  return {
    asin: r.asin,
    title: r.title.slice(0, 300),
    image: r.image,
    price: r.price?.value ?? r.prices?.[0]?.value ?? null,
    currency: r.price?.currency ?? r.prices?.[0]?.currency ?? "USD",
    description: (r.snippet ?? "").slice(0, 1000),
    rating: r.rating ?? null,
    review_count: r.ratings_total ?? null,
    category: categoryLabel,
    source: "rainforest",
  };
}

function normalizeBestseller(r, categoryLabel) {
  if (!r.asin || !r.title || !r.image) return null;
  return {
    asin: r.asin,
    title: r.title.slice(0, 300),
    image: r.image,
    price: r.price?.value ?? null,
    currency: r.price?.currency ?? "USD",
    description: "",
    rating: r.rating ?? null,
    review_count: r.ratings_total ?? null,
    category: categoryLabel,
    source: "rainforest",
  };
}

function normalizeDeal(r) {
  if (!r.asin || !r.title || !r.image) return null;
  return {
    asin: r.asin,
    title: r.title.slice(0, 300),
    image: r.image,
    price: r.deal_price?.value ?? r.current_price?.value ?? null,
    currency: r.deal_price?.currency ?? "USD",
    description: (r.description ?? "").slice(0, 1000),
    rating: r.rating ?? null,
    review_count: r.ratings_total ?? null,
    category: "Deals",
    source: "rainforest",
  };
}

// ── Upsert to Supabase ───────────────────────────────────────────────────────

async function upsertProducts(products) {
  if (products.length === 0) return { inserted: 0, error: null };

  const { error, count } = await supabase
    .from("products")
    .upsert(products, { onConflict: "asin", count: "exact", ignoreDuplicates: true });

  if (error) return { inserted: 0, error: error.message };
  return { inserted: count ?? products.length, error: null };
}

// ── Modes ────────────────────────────────────────────────────────────────────

async function runDaily() {
  console.log("🐱 SwipeCat Daily Refresh");
  console.log("========================\n");

  const state = loadState();
  let totalFetched = 0;
  let totalInserted = 0;
  let creditsUsed = 0;

  for (const [catId, terms] of Object.entries(SEARCH_TERMS)) {
    const label = CATEGORY_LABELS[catId];
    const termIndex = state[catId] % terms.length;
    const searchTerm = terms[termIndex];

    console.log(`[${label}] Term ${termIndex + 1}/${terms.length}: "${searchTerm}"`);

    try {
      const results = await rainforestSearch(searchTerm);
      creditsUsed += 1;

      const products = results
        .map((r) => normalizeSearchResult(r, label))
        .filter(Boolean);

      const { inserted, error } = await upsertProducts(products);

      if (error) {
        console.log(`  ❌ Error: ${error}`);
      } else {
        console.log(`  ✅ Fetched ${products.length}, inserted ${inserted} new`);
        totalFetched += products.length;
        totalInserted += inserted;
      }
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }

    // Advance rotation
    state[catId] = termIndex + 1;

    await sleep(DELAY_MS);
  }

  saveState(state);

  console.log(`\n📊 Summary:`);
  console.log(`   Fetched: ${totalFetched} products`);
  console.log(`   Inserted: ${totalInserted} new`);
  console.log(`   Credits used: ~${creditsUsed}`);
}

async function runWeekly() {
  console.log("🐱 SwipeCat Weekly Refresh (Bestsellers + Deals)");
  console.log("================================================\n");

  // Bestseller URLs for each category (Amazon's bestseller pages)
  const BESTSELLER_URLS = {
    "womens-shoes": "https://www.amazon.com/Best-Sellers-Womens-Shoes/zgbs/fashion/679337011",
    "electronics": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
    "womens-fashion": "https://www.amazon.com/Best-Sellers-Womens-Fashion/zgbs/fashion/7147440011",
    "mens-fashion": "https://www.amazon.com/Best-Sellers-Mens-Fashion/zgbs/fashion/7147441011",
    "beauty": "https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty",
    "home-decor": "https://www.amazon.com/Best-Sellers-Home-Decor/zgbs/home-garden/10033434011",
    "kitchen": "https://www.amazon.com/Best-Sellers-Kitchen/zgbs/kitchen",
    "fitness": "https://www.amazon.com/Best-Sellers-Sports-Fitness/zgbs/sporting-goods",
    "jewelry": "https://www.amazon.com/Best-Sellers-Jewelry/zgbs/jewelry",
    "pets": "https://www.amazon.com/Best-Sellers-Pet-Supplies/zgbs/pet-supplies",
  };

  let totalFetched = 0;
  let totalInserted = 0;
  let creditsUsed = 0;

  // Fetch bestsellers for each category
  for (const [catId, bsUrl] of Object.entries(BESTSELLER_URLS)) {
    const label = CATEGORY_LABELS[catId];
    console.log(`[${label}] Fetching bestsellers...`);

    try {
      const results = await rainforestBestsellers(bsUrl);
      creditsUsed += 1;

      const products = results
        .map((r) => normalizeBestseller(r, label))
        .filter(Boolean);

      const { inserted, error } = await upsertProducts(products);

      if (error) {
        console.log(`  ❌ Error: ${error}`);
      } else {
        console.log(`  ✅ Fetched ${products.length}, inserted ${inserted} new`);
        totalFetched += products.length;
        totalInserted += inserted;
      }
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  // Fetch trending deals
  console.log(`\n[Deals] Fetching trending deals...`);
  try {
    const results = await rainforestDeals("trending");
    creditsUsed += 1;

    const products = results
      .map((r) => normalizeDeal(r))
      .filter(Boolean);

    const { inserted, error } = await upsertProducts(products);

    if (error) {
      console.log(`  ❌ Error: ${error}`);
    } else {
      console.log(`  ✅ Fetched ${products.length}, inserted ${inserted} new`);
      totalFetched += products.length;
      totalInserted += inserted;
    }
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fetched: ${totalFetched} products`);
  console.log(`   Inserted: ${totalInserted} new`);
  console.log(`   Credits used: ~${creditsUsed}`);
}

async function runFull() {
  console.log("🐱 SwipeCat Full Deep Crawl");
  console.log("===========================\n");

  let totalFetched = 0;
  let totalInserted = 0;
  let creditsUsed = 0;

  for (const [catId, terms] of Object.entries(SEARCH_TERMS)) {
    const label = CATEGORY_LABELS[catId];

    for (let termIdx = 0; termIdx < terms.length; termIdx++) {
      const searchTerm = terms[termIdx];

      for (let page = 1; page <= 3; page++) {
        console.log(`[${label}] "${searchTerm}" page ${page}`);

        try {
          const results = await rainforestSearch(searchTerm, page);
          creditsUsed += 1;

          const products = results
            .map((r) => normalizeSearchResult(r, label))
            .filter(Boolean);

          const { inserted, error } = await upsertProducts(products);

          if (error) {
            console.log(`  ❌ Error: ${error}`);
          } else {
            console.log(`  ✅ Fetched ${products.length}, inserted ${inserted} new`);
            totalFetched += products.length;
            totalInserted += inserted;
          }
        } catch (e) {
          console.log(`  ❌ ${e.message}`);
        }

        await sleep(DELAY_MS);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fetched: ${totalFetched} products`);
  console.log(`   Inserted: ${totalInserted} new`);
  console.log(`   Credits used: ~${creditsUsed}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const mode = process.argv.includes("--mode")
  ? process.argv[process.argv.indexOf("--mode") + 1]
  : "daily";

console.log(`Mode: ${mode}\n`);

switch (mode) {
  case "daily":
    await runDaily();
    break;
  case "weekly":
    await runWeekly();
    break;
  case "full":
    await runFull();
    break;
  default:
    console.error(`Unknown mode: ${mode}. Use daily, weekly, or full.`);
    process.exit(1);
}

console.log("\n✅ Done!");
