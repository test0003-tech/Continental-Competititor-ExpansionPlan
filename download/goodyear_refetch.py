import requests
import json
import re
import time
import urllib3
urllib3.disable_warnings()

base_url = "https://www.goodyear.co.in/wp-json/goodyearforward/v1/stores"

# Get a fresh nonce
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# First get nonce from the main page
page = session.get('https://www.goodyear.co.in/store', verify=False, timeout=30)
nonce_match = re.search(r'"nonce":"([a-f0-9]+)"', page.text)
nonce = nonce_match.group(1) if nonce_match else ''
print(f"Got nonce: {nonce}")

all_markers = []
page_num = 1
total_pages = None

while total_pages is None or page_num <= total_pages:
    try:
        resp = session.get(
            base_url,
            params={'per_page': 100, 'page': page_num},
            headers={'X-WP-Nonce': nonce},
            verify=False,
            timeout=30
        )
        data = resp.json()
        
        if total_pages is None:
            total_pages = data.get('data', {}).get('total_pages', 1)
            print(f"Total pages: {total_pages}")
        
        markers = data.get('data', {}).get('storeMarkers', [])
        if not markers:
            print(f"Page {page_num}: No markers, stopping")
            break
        
        all_markers.extend(markers)
        print(f"Page {page_num}/{total_pages}: Got {len(markers)} markers (total: {len(all_markers)})")
        
        # Check if nonce expired (403 response)
        if resp.status_code == 403:
            print("Nonce expired, refreshing...")
            page = session.get('https://www.goodyear.co.in/store', verify=False, timeout=30)
            nonce_match = re.search(r'"nonce":"([a-f0-9]+)"', page.text)
            nonce = nonce_match.group(1) if nonce_match else nonce
            continue
        
        page_num += 1
        time.sleep(0.3)
        
    except Exception as e:
        print(f"Error on page {page_num}: {e}")
        # Try refreshing nonce
        try:
            page = session.get('https://www.goodyear.co.in/store', verify=False, timeout=30)
            nonce_match = re.search(r'"nonce":"([a-f0-9]+)"', page.text)
            nonce = nonce_match.group(1) if nonce_match else nonce
            page_num += 1
        except:
            break

print(f"\nTotal markers fetched: {len(all_markers)}")

# Analyze lat/lng
has_lat = sum(1 for m in all_markers if str(m.get('latitude', '')).strip())
empty_lat = sum(1 for m in all_markers if not str(m.get('latitude', '')).strip())
print(f"With latitude: {has_lat}")
print(f"Empty latitude: {empty_lat}")

# Save raw markers
with open('/home/z/my-project/download/goodyear_markers_fresh.json', 'w') as f:
    json.dump(all_markers, f, ensure_ascii=False, indent=2)

print("Saved to goodyear_markers_fresh.json")
