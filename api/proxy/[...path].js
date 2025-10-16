export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).send("ok");

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not set on Vercel" });

  try {
    const path = (req.query.path || []).join("/");              // v1/chat/completions 등
    const targetUrl = `https://api.openai.com/${path}`;

    const bodyText =
      typeof req.body === "string" ? req.body
      : req.body ? JSON.stringify(req.body)
      : await new Promise((resolve) => {
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", () => resolve(data));
        });

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: req.method === "GET" ? undefined : bodyText,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    res.setHeader("Content-Type", contentType);
    res.status(upstream.status).send(text);
  } catch (e) {
    res.status(502).json({ error: "Proxy upstream error", detail: String(e) });
  }
}
