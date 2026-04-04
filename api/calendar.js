const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.forexfactory.com/',
        }
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(5000, () => { req.destroy(); resolve(''); });
      req.end();
    } catch(e) { resolve(''); }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const raw = await fetchUrl('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (!raw) { res.status(500).json({ error: 'No data from Forex Factory' }); return; }
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=300'); // cache 5 mins
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: 'Calendar fetch failed: ' + e.message });
  }
}
