import json
import re

print("Building clean data for all brands with real lat/lng only...")

# ============== BRIDGESTONE ==============
print("\n--- Bridgestone ---")
with open('bridgestone_dealers_raw.json') as f:
    bs_raw = json.load(f)

bridgestone = []
for d in bs_raw:
    lat = str(d.get('lat', '')).strip()
    lng = str(d.get('long', '')).strip()
    
    # Extract dealer type from name
    name = d.get('name', '')
    if 'Select' in name:
        dtype = 'Select'
    elif 'Shop' in name:
        dtype = 'Shop'
    elif 'Truck Center' in name:
        dtype = 'Truck Center'
    else:
        dtype = 'Dealer'
    
    bridgestone.append({
        'name': name,
        'address': d.get('address', ''),
        'city': d.get('city', '').title(),
        'state': d.get('state', '').title(),
        'pincode': d.get('pincode', ''),
        'phone': d.get('mobile', '') or d.get('landline', ''),
        'email': '',
        'latitude': lat,
        'longitude': lng,
        'dealer_type': dtype,
    })

has_lat = sum(1 for d in bridgestone if d['latitude'])
print(f"Total: {len(bridgestone)}, With real lat/lng: {has_lat}")

# ============== APOLLO ==============
print("\n--- Apollo ---")
with open('apollo_dealers_raw.json') as f:
    ap_raw = json.load(f)

apollo = []
for d in ap_raw:
    lat = str(d.get('latitude', '')).strip()
    lng = str(d.get('longitude', '')).strip()
    
    apollo.append({
        'name': d.get('name', ''),
        'address': d.get('address', ''),
        'city': d.get('city', ''),
        'state': d.get('state', ''),
        'pincode': d.get('pincode', ''),
        'phone': d.get('phone', ''),
        'email': d.get('email', ''),
        'latitude': lat,
        'longitude': lng,
        'dealer_type': d.get('dealer_type', ''),
    })

has_lat = sum(1 for d in apollo if d['latitude'])
print(f"Total: {len(apollo)}, With real lat/lng: {has_lat}")

# ============== YOKOHAMA ==============
print("\n--- Yokohama ---")
with open('yokohama_dealers_raw.json') as f:
    yk_raw = json.load(f)

yokohama = []
for d in yk_raw:
    ll = d.get('latlng', {})
    lat = str(ll.get('lat', '')).strip() if isinstance(ll, dict) else ''
    lng = str(ll.get('lng', '')).strip() if isinstance(ll, dict) else ''
    
    # Parse address for city, state, pincode
    addr = d.get('address', '')
    pin_match = re.search(r'(\d{6})', addr)
    pincode = pin_match.group(1) if pin_match else ''
    
    # City/state from locality
    locality = d.get('locality', '')
    city = locality.split(',')[0].strip() if locality else ''
    
    # Extract state from address
    state_match = re.search(r'(Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Delhi|Chandigarh|Puducherry)', addr)
    state = state_match.group(1) if state_match else ''
    
    # Dealer type from name
    name = d.get('cname', '')
    if 'Club Network' in name:
        dtype = 'Club Network'
    elif 'Tyre Express' in name:
        dtype = 'Tyre Express'
    else:
        dtype = 'Dealer'
    
    yokohama.append({
        'name': name,
        'address': addr,
        'city': city,
        'state': state,
        'pincode': pincode,
        'phone': d.get('phone', '').replace('+91', '').strip(),
        'email': '',
        'latitude': lat,
        'longitude': lng,
        'dealer_type': dtype,
    })

has_lat = sum(1 for d in yokohama if d['latitude'])
print(f"Total: {len(yokohama)}, With real lat/lng: {has_lat}")

# ============== MICHELIN ==============
print("\n--- Michelin ---")
with open('michelin_dealers_complete.json') as f:
    mc_raw = json.load(f)

michelin = []
for d in mc_raw:
    geo = d.get('geoLocation', {})
    lat = str(geo.get('latitude', '')).strip()
    lng = str(geo.get('longitude', '')).strip()
    
    addr_data = d.get('address', {})
    
    # Dealer type from networkName
    network = d.get('networkName', '')
    if 'Premium' in network:
        dtype = 'Premium'
    elif 'Express' in network:
        dtype = 'Express'
    else:
        dtype = network or 'Dealer'
    
    michelin.append({
        'name': d.get('name', ''),
        'address': addr_data.get('formatAddress', ''),
        'city': addr_data.get('city', ''),
        'state': addr_data.get('state', ''),
        'pincode': addr_data.get('postalCode', ''),
        'phone': d.get('internationalPhoneNumber', '').replace('+91', '').strip(),
        'email': '',
        'latitude': lat,
        'longitude': lng,
        'dealer_type': dtype,
    })

has_lat = sum(1 for d in michelin if d['latitude'])
print(f"Total: {len(michelin)}, With real lat/lng: {has_lat}")

# ============== CONTINENTAL ==============
print("\n--- Continental ---")
with open('continental_dealers_complete.json') as f:
    ct_raw = json.load(f)

continental = []
for d in ct_raw:
    loc = d.get('location', {})
    lat = str(loc.get('lat', '')).strip()
    lng = str(loc.get('lng', '')).strip()
    
    addr_data = d.get('address', {})
    
    continental.append({
        'name': d.get('name', ''),
        'address': addr_data.get('street', ''),
        'city': addr_data.get('city', ''),
        'state': addr_data.get('state', ''),
        'pincode': addr_data.get('zip_code', ''),
        'phone': d.get('phone', ''),
        'email': d.get('email', '') or '',
        'latitude': lat,
        'longitude': lng,
        'dealer_type': d.get('network_name', ''),
    })

has_lat = sum(1 for d in continental if d['latitude'])
print(f"Total: {len(continental)}, With real lat/lng: {has_lat}")

# ============== GOODYEAR ==============
print("\n--- Goodyear ---")
with open('goodyear_markers_clean.json') as f:
    gy_raw = json.load(f)

goodyear = []
for d in gy_raw:
    lat = str(d.get('latitude', '')).strip()
    lng = str(d.get('longitude', '')).strip()
    
    goodyear.append({
        'name': d.get('title', ''),
        'address': d.get('address', ''),
        'city': d.get('area', ''),  # area field has city-like data
        'state': d.get('state', ''),
        'pincode': d.get('postal_code', ''),
        'phone': d.get('phone_number1', '').replace('+91', '').strip(),
        'email': '',
        'latitude': lat,
        'longitude': lng,
        'dealer_type': '',
    })

has_lat = sum(1 for d in goodyear if d['latitude'])
print(f"Total: {len(goodyear)}, With real lat/lng: {has_lat}")

# ============== MRF ==============
print("\n--- MRF ---")
with open('mrf_dealers_clean.json') as f:
    mrf_raw = json.load(f)

mrf = []
for d in mrf_raw:
    lat = str(d.get('latitude', '')).strip()
    lng = str(d.get('longitude', '')).strip()
    
    mrf.append({
        'name': d.get('name', ''),
        'address': d.get('address', ''),
        'city': d.get('city', ''),
        'state': d.get('state', ''),
        'pincode': d.get('pincode', ''),
        'phone': d.get('phone', ''),
        'email': d.get('email', ''),
        'latitude': lat,
        'longitude': lng,
        'dealer_type': d.get('dealer_type', ''),
    })

has_lat = sum(1 for d in mrf if d['latitude'])
print(f"Total: {len(mrf)}, With real lat/lng: {has_lat}")

# ============== SUMMARY ==============
print("\n" + "="*60)
print("SUMMARY - All Brands with Real Lat/Lng Only")
print("="*60)

all_brands = {
    'Bridgestone': bridgestone,
    'Apollo': apollo,
    'Yokohama': yokohama,
    'Michelin': michelin,
    'Continental': continental,
    'Goodyear': goodyear,
    'MRF': mrf,
}

total_dealers = 0
total_with_coords = 0
for brand, data in all_brands.items():
    count = len(data)
    with_coords = sum(1 for d in data if d.get('latitude') and d.get('longitude'))
    total_dealers += count
    total_with_coords += with_coords
    print(f"{brand:15s}: {count:5d} dealers, {with_coords:5d} with real lat/lng ({with_coords*100//count if count else 0}%)")

print(f"{'TOTAL':15s}: {total_dealers:5d} dealers, {total_with_coords:5d} with real lat/lng")

# Save each brand's clean data
for brand, data in all_brands.items():
    fname = f'{brand.lower()}_dealers_clean.json'
    with open(fname, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {fname}")

print("\nDone! All data cleaned and saved.")
