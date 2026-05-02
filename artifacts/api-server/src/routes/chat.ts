import { Router, type IRouter } from "express";

const router: IRouter = Router();

const DIFY_API_KEY = "dm_0cfb3ba8c1663aa8_33492fce67bf6134d89fbc273b9c2184";
const DIFY_API_URL = "https://hirewise.parshantyadav.com/api/v1/chat";

router.post("/chat", async (req, res) => {
  try {
    const response = await fetch(DIFY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
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
      data = { answer: text };
    }

    res.json(data);
  } catch (err) {
    req.log.error(err, "chat proxy error");
    res.status(502).json({ error: "Failed to reach chat service" });
  }
});

export default router;
