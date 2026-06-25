import subprocess, json, re

# Read .env
env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
url = "https://sqwjprhcophxlmmygwsk.supabase.co"

result = subprocess.run([
    'curl', '-s',
    f'{url}/rest/v1/products?select=title,price&limit=30',
    '-H', f'apikey: {key}',
    '-H', f'Authorization: Bearer {key}'
], capture_output=True, text=True, timeout=15)

data = json.loads(result.stdout)
if isinstance(data, dict):
    print("Error:", data)
else:
    print(f"Total returned: {len(data)}")
    for r in data:
        print(f"  price={repr(r['price']):15}  title={r['title'][:50]}")
    
    # Count nulls and check decimal places
    nulls = sum(1 for r in data if r['price'] is None)
    bad_decimals = [r for r in data if r['price'] is not None and 
                    len(str(r['price']).split('.')[-1]) == 1]
    print(f"\nNull prices: {nulls}/{len(data)}")
    print(f"Single-decimal prices (like 9.5): {len(bad_decimals)}")
    for r in bad_decimals:
        print(f"  {r['price']} | {r['title'][:50]}")
