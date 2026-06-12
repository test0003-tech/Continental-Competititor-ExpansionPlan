const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://www.tyreplex.com/includes/ajax/gfend.php';
const BRAND_ID = 2; // CEAT

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = new URLSearchParams(data).toString();
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tyreplex.com/ceat-tyre-dealers-in-india',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.tyreplex.com',
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (body.startsWith('<') || body.includes('<html')) {
          reject(new Error('Rate limited or error page'));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await postRequest(API_URL, params);
      return result;
    } catch (e) {
      if (attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 3000; // 3s, 6s, 9s
        await sleep(delay);
      } else {
        throw e;
      }
    }
  }
}

async function scrapeAllDealers() {
  const allDealers = new Map(); // Use Map to deduplicate by dealer_id
  
  // Load any previously scraped data
  const existingPath = '/home/z/my-project/download/ceat_tyreplex_all_dealers.json';
  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath));
    for (const d of existing) {
      allDealers.set(d.dealer_id, d);
    }
    console.log(`Loaded ${allDealers.size} existing dealers`);
  }
  
  console.log(`Starting CEAT dealer scrape from TyrePlex...`);
  
  // Try fetching page by page with longer delays
  let page = 2;
  let emptyPages = 0;
  let lastSaveTime = Date.now();
  
  while (emptyPages < 3 && page <= 1200) {
    try {
      const params = {
        perform_action: 'getMoreTyreDealers',
        t: '9287',
        p: page.toString(),
        c: '',
        m: BRAND_ID.toString(),
        city_slug: '',
      };
      
      const result = await scrapeWithRetry(params);
      
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) {
          console.log(`3 consecutive empty pages at page ${page}. Stopping.`);
          break;
        }
        page++;
        await sleep(1000);
        continue;
      }
      
      emptyPages = 0;
      
      for (const dealer of result.data) {
        allDealers.set(dealer.dealer_id, {
          dealer_id: dealer.dealer_id,
          name: dealer.dealer_name || dealer.name,
          address: dealer.address,
          phone: dealer.mobile || dealer.phone_number || '',
          contact_person: dealer.contact_person || '',
          city_id: dealer.city_id || '',
          verified: dealer.verified || '0',
          slug: dealer.dealer_slug || '',
        });
      }
      
      if (page % 20 === 0) {
        console.log(`Page ${page}: +${result.data.length} dealers. Total unique: ${allDealers.size}`);
      }
      
      // Save progress every 100 pages or 30 seconds
      if (page % 100 === 0 || Date.now() - lastSaveTime > 30000) {
        fs.writeFileSync(existingPath, JSON.stringify([...allDealers.values()], null, 2));
        lastSaveTime = Date.now();
      }
      
      page++;
      
      // Rate limiting: wait between requests
      await sleep(800 + Math.random() * 400); // 800-1200ms
      
    } catch (error) {
      console.error(`Page ${page}: Error - ${error.message}`);
      // On rate limit, wait longer
      await sleep(10000);
      // Don't increment page, retry same page
    }
  }
  
  console.log(`\nScraping complete! Total unique dealers: ${allDealers.size}`);
  
  // Save final data
  const dealers = [...allDealers.values()];
  fs.writeFileSync(existingPath, JSON.stringify(dealers, null, 2));
  console.log(`Data saved to: ${existingPath}`);
  
  return dealers;
}

scrapeAllDealers().catch(console.error);
