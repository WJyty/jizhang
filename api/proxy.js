export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  const r = await fetch("https://tokenhub.tencentmaas.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": req.headers.authorization || "" },
    body: JSON.stringify(req.body)
  });
  const d = await r.text();
  res.status(r.status).send(d);
}
