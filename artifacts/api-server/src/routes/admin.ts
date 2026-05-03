import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const router: IRouter = Router();

const ADMIN_USER = "parshant";
const ADMIN_PASS = "Admin@2026";
const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");

const sessions = new Set<string>();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

router.get("/admin/content", (_req, res) => {
  ensureDir();
  try {
    if (!fs.existsSync(CONTENT_FILE)) { res.json({}); return; }
    res.json(JSON.parse(fs.readFileSync(CONTENT_FILE, "utf-8")));
  } catch { res.json({}); }
});

router.post("/admin/content", (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  ensureDir();
  try {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "content save failed");
    res.status(500).json({ error: "Save failed" });
  }
});

router.post("/admin/logout", (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  sessions.delete(token);
  res.json({ ok: true });
});

export default router;
