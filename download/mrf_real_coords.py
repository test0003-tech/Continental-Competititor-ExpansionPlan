#!/usr/bin/env python3
"""
Scrape REAL lat/lng coordinates for MRF tyre dealers from dealers.mrftyres.com
Concurrent version with thread pool for speed.
"""

import requests
import json
import re
import html
import time
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

urllib3.disable_warnings()

BASE = 'https://dealers.mrftyres.com'
MASTER_OUTLET_ID = '353298'
DELAY = 0.1
TIMEOUT = 20

# Thread-local session
_thread_local = threading.local()

def get_session():
    if not hasattr(_thread_local, 'session'):
        _thread_local.session = requests.Session()
        _thread_local.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })
        _thread_local.session.verify = False
    return _thread_local.session

# ============================================================
# Step 1: Get all states
# ============================================================
print("Step 1: Getting states from main page...")
sess = get_session()
resp = sess.get(f'{BASE}/', verify=False, timeout=TIMEOUT)
states = re.findall(r'<option[^>]*value="([^"]+)"[^>]*>', resp.text)
states = [s for s in states if s and not s.lower().startswith('select')]
print(f"Found {len(states)} states")

# ============================================================
# Step 2: Get cities for each state
# ============================================================
print("\nStep 2: Getting cities per state...")
state_cities = {}

for state in states:
    try:
        resp = sess.get(
            f'{BASE}/getCitiesByMasterOutletIdAndStateName.php',
            params={'master_outlet_id': MASTER_OUTLET_ID, 'state_name': state},
            verify=False, timeout=TIMEOUT
        )
        cities_data = resp.json()
        state_cities[state] = cities_data
        print(f"  {state}: {len(cities_data)} cities")
        time.sleep(0.05)
    except Exception as e:
        print(f"  {state}: ERROR - {e}")
        state_cities[state] = {}

total_cities = sum(len(v) for v in state_cities.values())
print(f"\nTotal cities: {total_cities}")

# Save state_cities mapping
with open('/home/z/my-project/download/mrf_state_cities.json', 'w') as f:
    json.dump(state_cities, f, ensure_ascii=False, indent=2)
print("Saved state-cities mapping")

# ============================================================
# Step 3: Scrape city pages concurrently
# ============================================================
print(f"\nStep 3: Scraping {total_cities} city pages with 8 threads...")

all_outlets = []
seen_ids = set()
lock = threading.Lock()
progress = {'count': 0, 'errors': 0}

def scrape_city(state, city_slug, city_display):
    """Scrape all pages for a city and return list of outlet dicts."""
    outlets = []
    session = get_session()
    page = 1
    max_page = 1
    has_more = True
    
    while has_more:
        try:
            url = f'{BASE}/location/{state}/{city_slug}'
            if page > 1:
                url += f'?page={page}'
            
            resp = session.get(url, verify=False, timeout=TIMEOUT)
            content = resp.text
            
            # Extract data
            lats = re.findall(r'outlet-latitude"[^>]*value="([^"]*)"', content)
            lngs = re.findall(r'outlet-longitude"[^>]*value="([^"]*)"', content)
            names = re.findall(r'business_name"[^>]*value="([^"]*)"', content)
            addresses = re.findall(r'name="address"[^>]*value="([^"]*)"', content)
            phones = re.findall(r'name="phone"[^>]*value="([^"]*)"', content)
            emails = re.findall(r'business_email"[^>]*value="([^"]*)"', content)
            cities_html = re.findall(r'name="city"[^>]*value="([^"]*)"', content)
            states_html = re.findall(r'name="state"[^>]*value="([^"]*)"', content)
            
            for i in range(len(names)):
                name = html.unescape(names[i]) if i < len(names) else ''
                lat = lats[i].strip() if i < len(lats) else ''
                lng = lngs[i].strip() if i < len(lngs) else ''
                addr = html.unescape(addresses[i]) if i < len(addresses) else ''
                phone = phones[i] if i < len(phones) else ''
                email = emails[i] if i < len(emails) else ''
                city_name = html.unescape(cities_html[i]) if i < len(cities_html) else city_display
                state_name = html.unescape(states_html[i]) if i < len(states_html) else state
                
                if name:
                    outlets.append({
                        'name': name,
                        'address': addr,
                        'city': city_name,
                        'state': state_name,
                        'phone': phone,
                        'email': email,
                        'latitude': lat,
                        'longitude': lng,
                    })
            
            # Check pagination on first page
            if page == 1:
                page_nums = re.findall(rf'location/{re.escape(state)}/{re.escape(city_slug)}\?page=(\d+)', content)
                max_page = max(int(p) for p in page_nums) if page_nums else 1
            
            if page >= max_page or len(names) < 6:
                has_more = False
            else:
                page += 1
                time.sleep(0.05)
            
        except Exception as e:
            progress['errors'] += 1
            break
    
    return outlets

# Build list of (state, city_slug, city_display) tasks
tasks = []
for state, cities_dict in state_cities.items():
    for city_slug, city_display in cities_dict.items():
        tasks.append((state, city_slug, city_display))

print(f"Total tasks: {len(tasks)}")

# Execute with thread pool
with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {}
    for task in tasks:
        future = executor.submit(scrape_city, *task)
        futures[future] = task
    
    for future in as_completed(futures):
        task = futures[future]
        try:
            outlets = future.result()
            with lock:
                for o in outlets:
                    uid = f"{o['name']}_{o['latitude']}_{o['longitude']}"
                    if uid not in seen_ids:
                        seen_ids.add(uid)
                        all_outlets.append(o)
                progress['count'] += 1
                if progress['count'] % 50 == 0:
                    with_coords = sum(1 for o in all_outlets if o['latitude'] and o['longitude'])
                    print(f"  Progress: {progress['count']}/{len(tasks)} cities | {len(all_outlets)} outlets ({with_coords} with coords) | errors: {progress['errors']}")
        except Exception as e:
            progress['errors'] += 1

# ============================================================
# Final results
# ============================================================
print("\n" + "=" * 60)
print("FINAL RESULTS")
print("=" * 60)

with_coords = sum(1 for o in all_outlets if o['latitude'] and o['longitude'])
with_valid_coords = 0
for o in all_outlets:
    try:
        if o['latitude'] and o['longitude'] and float(o['latitude']) != 0 and float(o['longitude']) != 0:
            with_valid_coords += 1
    except:
        pass

print(f"Total unique outlets: {len(all_outlets)}")
print(f"Outlets with lat/lng: {with_coords}")
print(f"Outlets with non-zero lat/lng: {with_valid_coords}")
print(f"States covered: {len(state_cities)}")
print(f"Cities covered: {total_cities}")
print(f"Errors: {progress['errors']}")

# Save results
with open('/home/z/my-project/download/mrf_real_coords_from_dealers_site.json', 'w') as f:
    json.dump(all_outlets, f, ensure_ascii=False, indent=2)
print(f"\nSaved to mrf_real_coords_from_dealers_site.json")

# Sample
print("\nSample outlets:")
for o in all_outlets[:5]:
    print(f"  {o['name']} | {o['city']}, {o['state']} | lat={o['latitude']}, lng={o['longitude']}")

# State-wise summary
print("\nState-wise outlet counts:")
state_counts = {}
for o in all_outlets:
    st = o.get('state', 'Unknown')
    state_counts[st] = state_counts.get(st, 0) + 1
for st, cnt in sorted(state_counts.items(), key=lambda x: -x[1])[:15]:
    print(f"  {st}: {cnt}")
