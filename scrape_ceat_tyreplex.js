const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// TyrePlex AJAX API for loading dealers
const API_URL = 'https://www.tyreplex.com/includes/ajax/gfend.php';
const BRAND_ID = 2; // CEAT brand ID on TyrePlex
const TOTAL_DEALERS = 9287;
const PAGE_SIZE = 8; // Dealers per page
const MAX_PAGES = Math.ceil(TOTAL_DEALERS / PAGE_SIZE) + 5; // Extra pages for safety

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
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}, body: ${body.substring(0, 200)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Also get the initial page's dealers (first 8 are in the HTML)
function getInitialDealers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.tyreplex.com',
      port: 443,
      path: '/ceat-tyre-dealers-in-india',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Extract dealer data from HTML
        const dealers = [];
        const dealerRegex = /class="col-sm-4 col-12 items rec-rows-cont dealer-item[^"]*"[^>]*data-dealer_name="([^"]*)"[^>]*>[\s\S]*?<p class="dealer-address">([^<]*)<\/p>/g;
        let match;
        while ((match = dealerRegex.exec(body)) !== null) {
          dealers.push({
            dealer_name: match[1],
            address: match[2].trim(),
          });
        }
        resolve(dealers);
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function scrapeAllDealers() {
  const allDealers = [];
  let consecutiveErrors = 0;
  
  console.log(`Starting CEAT dealer scrape from TyrePlex...`);
  console.log(`Expected total: ~${TOTAL_DEALERS} dealers`);
  
  // Start from page 2 (page 1 data is in the initial HTML load, but we'll also fetch it via API)
  for (let page = 2; page <= MAX_PAGES; page++) {
    try {
      const params = {
        perform_action: 'getMoreTyreDealers',
        t: TOTAL_DEALERS.toString(),
        p: page.toString(),
        c: '',
        m: BRAND_ID.toString(),
        city_slug: '',
      };
      
      const result = await postRequest(API_URL, params);
      
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.log(`Page ${page}: No more data. Stopping.`);
        break;
      }
      
      for (const dealer of result.data) {
        allDealers.push({
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
      
      consecutiveErrors = 0;
      
      if (page % 50 === 0 || allDealers.length >= TOTAL_DEALERS - 10) {
        console.log(`Page ${page}: ${result.data.length} dealers. Total so far: ${allDealers.length}`);
      }
      
      // Check if we've got all dealers
      if (result.p && parseInt(result.p) <= page) {
        // We've gone past the last page
      }
      
      // Small delay to be respectful
      if (page % 100 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
      
    } catch (error) {
      consecutiveErrors++;
      console.error(`Page ${page}: Error - ${error.message}`);
      if (consecutiveErrors >= 5) {
        console.log('Too many consecutive errors. Stopping.');
        break;
      }
      // Wait and retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log(`\nScraping complete! Total dealers: ${allDealers.length}`);
  
  // Save raw data
  const outputPath = '/home/z/my-project/download/ceat_tyreplex_all_dealers.json';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allDealers, null, 2));
  console.log(`Raw data saved to: ${outputPath}`);
  
  return allDealers;
}

scrapeAllDealers().catch(console.error);
