import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
function getEnv(key) {
  const m = env.match(new RegExp('^' + key + '=(.+)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : null;
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

console.log('URL:', supabaseUrl);
console.log('Key length:', serviceKey?.length);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const { data, error } = await supabase
  .from('products')
  .select('id, category, image, title')
  .order('category');

if (error) {
  console.error('Supabase error:', error.message, error.details, error.hint);
  process.exit(1);
}

const counts = {};
for (const row of data) {
  counts[row.category] = (counts[row.category] || 0) + 1;
}

console.log('\nDistinct categories in Supabase:');
for (const [cat, count] of Object.entries(counts).sort()) {
  console.log(`  "${cat}": ${count} products`);
}
console.log(`\nTotal: ${data.length} products`);

// Sample image URLs to check resolution hints
console.log('\nSample image URLs (first 2 per category):');
const seen = {};
for (const row of data) {
  if (!seen[row.category]) seen[row.category] = [];
  if (seen[row.category].length < 2) seen[row.category].push(row.image);
}
for (const [cat, urls] of Object.entries(seen)) {
  console.log(`\n  ${cat}:`);
  for (const u of urls) console.log(`    ${u}`);
}
