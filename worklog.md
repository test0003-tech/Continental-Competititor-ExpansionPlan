---
Task ID: 1
Agent: Main
Task: Remove all geocoded lat/lng and keep only real lat/lng from source APIs

Work Log:
- Analyzed all brand data files for geocoded vs real lat/lng
- Found: MRF had 1749/1754 pincode-geocoded coords; Goodyear had 804/2010 pincode-geocoded coords
- Other brands (Bridgestone, Apollo, Yokohama, Michelin, Continental) had real source API lat/lng that weren't being extracted
- Discovered dealers.mrftyres.com (SingleInterface-powered) has real GPS coordinates for MRF dealers
- Scraped all 33 states / 807 cities from dealers.mrftyres.com - got 3,769 outlets with real lat/lng
- Matched and combined MRF data: 3,213 total MRF dealers (2,718 with real lat/lng, 495 without)
- Cleaned Goodyear: removed 804 pincode-geocoded entries, kept 1,206 real source coordinates
- Properly extracted lat/lng from Bridgestone (2,671), Yokohama (436), Michelin (442), Continental (150) source APIs
- Apollo already had real coordinates (2,133)
- Generated master Excel with 11,079 total dealers, 9,756 with real lat/lng (88.1%)

Stage Summary:
- All geocoded (pincode-level) lat/lng removed from dataset
- Real lat/lng preserved from source APIs with 5-8 decimal precision
- Master Excel: /home/z/my-project/download/India_Tyre_Dealers_All_Brands.xlsx
- CEAT and JK Tyre still blocked by WAF
- Coverage: Bridgestone 99%, Apollo 100%, Yokohama 100%, Michelin 100%, Continental 100%, Goodyear 60%, MRF 84%
