export default async function (req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).send('');
  }

  try {
    const resp = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await resp.text();
    res.set('Content-Type', 'application/json');
    res.status(resp.status).send(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
