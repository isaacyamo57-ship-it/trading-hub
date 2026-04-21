const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'TradingHub/1.0' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Invalid JSON')); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { date, interval = '5min', symbol = 'NQ1!' } = req.query;
  if (!date) return res.status(400).json({ error: 'date param required' });

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'TWELVEDATA_API_KEY not configured in Vercel env vars' });

  const url = 'https://api.twelvedata.com/time_series?' +
    'symbol=' + encodeURIComponent(symbol) +
    '&interval=' + interval +
    '&start_date=' + encodeURIComponent(date + ' 08:00:00') +
    '&end_date=' + encodeURIComponent(date + ' 17:30:00') +
    '&order=asc' +
    '&format=JSON' +
    '&apikey=' + apiKey;

  try {
    const data = await fetchJson(url);

    if (data.status === 'error') {
      return res.status(400).json({ error: data.message || 'TwelveData error' });
    }
    if (!data.values || data.values.length === 0) {
      return res.status(404).json({ error: 'No candles for this date — market may be closed' });
    }

    // Treat datetimes as UTC so chart displays market-local times (09:30 etc)
    const candles = data.values.map(v => ({
      time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ candles, count: candles.length, symbol: (data.meta && data.meta.symbol) || symbol });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
