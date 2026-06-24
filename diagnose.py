import os, re

assets = os.listdir('dist-capacitor/assets/')
main_bundle = [f for f in assets if f.startswith('index.capacitor') and f.endswith('.js')][0]

with open(f'dist-capacitor/assets/{main_bundle}') as f:
    content = f.read()

# Check dynamic imports - these could fail on capacitor://
dyn_import_idxs = [m.start() for m in re.finditer(r'\bimport\(', content)]
print(f"Dynamic imports ({len(dyn_import_idxs)}):")
for idx in dyn_import_idxs:
    print(f"  ...{content[idx:idx+100]}...")

# Check localhost references
localhost_checks = re.findall(r'localhost[^"\'\`\s]*', content)
print(f"\nlocalhosts in bundle: {len(localhost_checks)}")
for l in list(set(localhost_checks))[:10]:
    print(f"  {l}")

# Check for any Lovable-specific code that might fail
lovable_refs = re.findall(r'lovable[^"\'\`\s]*', content, re.IGNORECASE)
print(f"\nLovable references: {len(lovable_refs)}")
for l in list(set(lovable_refs))[:5]:
    print(f"  {l}")

# Check for any imports from the other assets (esm, web, definitions)
esm_ref = re.search(r'esm-', content)
web_ref = re.search(r'web-', content)
defs_ref = re.search(r'definitions-', content)
print(f"\nReferences to other asset files:")
print(f"  esm-: {bool(esm_ref)}")
print(f"  web-: {bool(web_ref)}")
print(f"  definitions-: {bool(defs_ref)}")

# Check what the other small JS files are
print(f"\nOther JS assets:")
for f in assets:
    if f.endswith('.js') and not f.startswith('index.capacitor'):
        size = os.path.getsize(f'dist-capacitor/assets/{f}')
        with open(f'dist-capacitor/assets/{f}') as fh:
            first_100 = fh.read(200)
        print(f"  {f} ({size} bytes): {first_100[:100]}")

# Check for the Capacitor bridge script reference
# Capacitor injects capacitor.js into the WebView - the app shouldn't need it
# but let's check if there's a reference
cap_bridge = re.search(r'capacitor\.js|capacitor-bridge', content)
print(f"\nCapacitor bridge reference in bundle: {bool(cap_bridge)}")

# Check if there's any code that checks for Capacitor being available
# and fails if it's not
cap_check = re.search(r'window\.Capacitor', content)
if cap_check:
    print(f"\nwindow.Capacitor check at {cap_check.start()}:")
    print(content[max(0,cap_check.start()-50):cap_check.start()+150])

# Check for any syntax errors or issues in the bundle by looking at the end
print(f"\nLast 200 chars of bundle:")
print(repr(content[-200:]))

# Check the CSS file
css_files = [f for f in assets if f.endswith('.css')]
print(f"\nCSS files: {css_files}")
for cf in css_files:
    size = os.path.getsize(f'dist-capacitor/assets/{cf}')
    print(f"  {cf}: {size} bytes")
