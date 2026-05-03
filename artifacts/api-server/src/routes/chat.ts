import { Router, type IRouter } from "express";

const router: IRouter = Router();

const DOCUMIND_API_KEY = process.env.DOCUMIND_API_KEY ?? "";
const DOCUMIND_API_URL = "https://documind.parshantyadav.com/api/v1/chat";

router.post("/chat", async (req, res) => {
  if (!DOCUMIND_API_KEY) {
    res.status(503).json({ error: "Chat service not configured" });
    return;
  }
  try {
    const response = await fetch(DOCUMIND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DOCUMIND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();

    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream error ${response.status}`, detail: text });
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { reply: text };
    }

    res.json(data);
  } catch (err) {
    req.log.error(err, "chat proxy error");
    res.status(502).json({ error: "Failed to reach chat service" });
  }
});

export default router;
