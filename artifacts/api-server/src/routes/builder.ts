import { Router, type Router as RouterType } from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const router = Router();
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "builder-users.json");
const PORTFOLIOS_DIR = path.join(DATA_DIR, "portfolios");

/* ── helpers ── */
async function loadUsers(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(USERS_FILE, "utf8")); } catch { return {}; }
}
async function saveUsers(u: Record<string, any>) {
  await fs.writeFile(USERS_FILE, JSON.stringify(u, null, 2));
}
async function loadPortfolio(username: string) {
  try { return JSON.parse(await fs.readFile(path.join(PORTFOLIOS_DIR, `${username}.json`), "utf8")); } catch { return null; }
}
async function savePortfolio(username: string, data: any) {
  await fs.mkdir(PORTFOLIOS_DIR, { recursive: true });
  await fs.writeFile(path.join(PORTFOLIOS_DIR, `${username}.json`), JSON.stringify(data, null, 2));
}
function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => e ? rej(e) : res(`${salt}:${k.toString("hex")}`)));
}
function verifyPassword(pw: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => e ? rej(e) : res(k.toString("hex") === key)));
}
function genToken() { return crypto.randomBytes(32).toString("hex"); }
async function authMiddleware(req: any, res: any, next: any) {
  const t = req.headers.authorization?.replace("Bearer ", "");
  if (!t) return res.status(401).json({ error: "Unauthorized" });
  const users = await loadUsers();
  const user = Object.values(users).find((u: any) => u.token === t) as any;
  if (!user) return res.status(401).json({ error: "Invalid token" });
  req.builderUser = user;
  next();
}

/* ── auth routes ── */
router.post("/builder/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (!/^[a-z0-9_-]{3,20}$/i.test(username)) return res.status(400).json({ error: "Username must be 3–20 chars (letters, numbers, _ -)" });
    const users = await loadUsers();
    if (users[username.toLowerCase()]) return res.status(409).json({ error: "Username taken" });
    const token = genToken();
    users[username.toLowerCase()] = { username: username.toLowerCase(), displayName: displayName || username, passwordHash: await hashPassword(password), token, created: Date.now() };
    await saveUsers(users);
    res.json({ token, username: username.toLowerCase(), displayName: displayName || username });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

router.post("/builder/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const users = await loadUsers();
    const user = users[username.toLowerCase()];
    if (!user || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: "Invalid credentials" });
    user.token = genToken();
    await saveUsers(users);
    res.json({ token: user.token, username: user.username, displayName: user.displayName });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

router.get("/builder/me", authMiddleware, (req: any, res) => {
  const { username, displayName } = req.builderUser;
  res.json({ username, displayName });
});

/* ── AI chat wizard ── */
const SYSTEM_PROMPT = `You are a friendly, enthusiastic portfolio creation assistant. Your goal is to collect information to build a stunning professional portfolio.

Ask ONE question at a time in a warm, conversational way. Collect:
1. Full name
2. Professional title/role (e.g. "Full Stack Developer", "AI/ML Engineer")
3. Short bio — 2-3 sentences describing who they are and what they do
4. Location (optional — can skip)
5. Work experience — for each: role, company, duration, 1-2 sentence description, key skills used (up to 3 entries)
6. Projects — for each: name, description, GitHub URL (if any), live URL (if any), tech tags (up to 3 entries)
7. Skills — a list of their technical skills grouped loosely
8. Contact links — email, GitHub profile, LinkedIn, website

When you have collected: name, title, bio, skills, and at least one experience OR one project, you can wrap up.

When ready, output ONLY this JSON block (nothing else after it):
\`\`\`json
{"complete":true,"data":{"name":"...","title":"...","bio":"...","location":"...","email":"...","links":{"github":"...","linkedin":"...","website":"..."},"experience":[{"role":"...","company":"...","period":"...","description":"...","skills":["..."]}],"projects":[{"name":"...","description":"...","githubUrl":"...","liveUrl":"...","tags":["..."]}],"skills":["..."]}}
\`\`\`

Be encouraging and keep it brief. If a user wants to skip something, that's fine.`;

router.post("/builder/chat", authMiddleware, async (req: any, res) => {
  try {
    const { messages } = req.body;
    const apiRes = await fetch(`${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-5.1", max_completion_tokens: 1024, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages] }),
    });
    if (!apiRes.ok) return res.status(500).json({ error: "AI error" });
    const data = await apiRes.json() as any;
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    res.json({ content, complete: !!jsonMatch, portfolioData: jsonMatch ? JSON.parse(jsonMatch[1]) : null });
  } catch (e) { res.status(500).json({ error: "AI chat failed" }); }
});

/* ── Portfolio generation ── */
router.post("/builder/create", authMiddleware, async (req: any, res) => {
  try {
    const { data } = req.body;
    const { username } = req.builderUser;
    await savePortfolio(username, { ...data, username, updatedAt: Date.now() });
    res.json({ success: true, username, url: `/p/${username}` });
  } catch (e) { res.status(500).json({ error: "Failed to create portfolio" }); }
});

router.get("/builder/portfolio", authMiddleware, async (req: any, res) => {
  const p = await loadPortfolio(req.builderUser.username);
  res.json(p || {});
});

/* ── Separate router for /p/:username (mounted directly on app, not under /api) ── */
export const portfolioServeRouter: RouterType = Router();
portfolioServeRouter.get("/:username", async (req, res) => {
  try {
    const data = await loadPortfolio(req.params.username);
    if (!data) return res.status(404).send(notFoundPage(req.params.username));
    const t = parseInt(req.query.t as string) || data.template || 1;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderTemplate(data, t));
  } catch (e) { res.status(500).send("Error loading portfolio"); }
});

function notFoundPage(username: string) {
  return `<!DOCTYPE html><html><head><title>Portfolio not found</title><style>body{background:#0a0a0a;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}a{color:#4ade80;text-decoration:none}</style></head><body><h2>Portfolio not found</h2><p>@${username} hasn't created a portfolio yet.</p><a href="/">Create yours →</a></body></html>`;
}

/* ── TEMPLATES ── */
function renderTemplate(d: any, t: number): string {
  if (t === 2) return template2(d);
  if (t === 3) return template3(d);
  return template1(d);
}

function expHtml(exp: any[]): string {
  if (!exp?.length) return "";
  return exp.map(e => `
    <div class="exp-item">
      <div class="exp-dot"></div>
      <div class="exp-body">
        <div class="exp-head"><strong>${e.role}</strong><span class="period">${e.period || ""}</span></div>
        <div class="company">${e.company || ""}</div>
        <p>${e.description || ""}</p>
        <div class="tags">${(e.skills || []).map((s: string) => `<span class="tag">${s}</span>`).join("")}</div>
      </div>
    </div>`).join("");
}
function projHtml(projects: any[], accent: string): string {
  if (!projects?.length) return "";
  return projects.map(p => `
    <div class="proj-card">
      <div class="proj-head"><h3>${p.name}</h3>
        <div class="proj-links">
          ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener">GitHub ↗</a>` : ""}
          ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noopener">Live ↗</a>` : ""}
        </div>
      </div>
      <p>${p.description || ""}</p>
      <div class="tags">${(p.tags || []).map((s: string) => `<span class="tag">${s}</span>`).join("")}</div>
    </div>`).join("");
}
function skillsHtml(skills: string[]): string {
  if (!skills?.length) return "";
  return skills.map(s => `<span class="skill-tag">${s}</span>`).join("");
}
function socialLinks(d: any, accent: string): string {
  const links = [];
  if (d.links?.github) links.push(`<a href="${d.links.github}" target="_blank">GitHub</a>`);
  if (d.links?.linkedin) links.push(`<a href="${d.links.linkedin}" target="_blank">LinkedIn</a>`);
  if (d.links?.website) links.push(`<a href="${d.links.website}" target="_blank">Website</a>`);
  if (d.email) links.push(`<a href="mailto:${d.email}">Email</a>`);
  return links.join("");
}
function createBanner(username: string): string {
  return `<div style="text-align:center;padding:24px;border-top:1px solid rgba(255,255,255,0.07);margin-top:48px"><a href="/" style="font-size:12px;opacity:0.4;text-decoration:none;font-family:monospace">✦ built with parshant.portfolio — create yours</a></div>`;
}

/* Template 1 – Dark Minimal (matches current portfolio) */
function template1(d: any): string {
  const acc = "hsl(142 71% 45%)";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.name} — Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a0a;--s:hsl(0 0% 9%);--b:hsl(0 0% 15%);--fg:hsl(0 0% 92%);--mu:hsl(0 0% 50%);--ac:${acc}}
body{background:var(--bg);color:var(--fg);font-family:'Inter',sans-serif;line-height:1.6}
a{color:var(--ac);text-decoration:none}a:hover{text-decoration:underline}
.container{max-width:760px;margin:0 auto;padding:48px 24px}
header{display:flex;align-items:flex-start;gap:28px;padding-bottom:40px;border-bottom:1px solid var(--b);margin-bottom:40px}
.avatar-wrap{width:72px;height:72px;border-radius:50%;background:var(--ac);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#000;flex-shrink:0}
.name{font-size:26px;font-weight:700;margin-bottom:4px}
.title{color:var(--ac);font-family:'JetBrains Mono',monospace;font-size:13px;margin-bottom:8px}
.loc{color:var(--mu);font-size:13px;font-family:'JetBrains Mono',monospace}
.bio{color:var(--mu);font-size:15px;line-height:1.7;margin-top:12px}
.soc{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}
.soc a{font-size:12px;font-family:'JetBrains Mono',monospace;padding:5px 12px;border:1px solid var(--b);border-radius:6px;color:var(--fg);transition:.15s}
.soc a:hover{border-color:var(--ac);color:var(--ac);text-decoration:none}
.section{margin-bottom:48px}
.section-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;color:var(--mu);margin-bottom:24px}
.exp-item{display:flex;gap:16px;margin-bottom:28px}
.exp-dot{width:8px;height:8px;border-radius:50%;background:var(--ac);margin-top:8px;flex-shrink:0}
.exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.exp-head strong{font-size:15px;font-weight:600}
.period{font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--mu)}
.company{font-size:13px;color:var(--ac);font-family:'JetBrains Mono',monospace;margin:2px 0 6px}
.exp-body p{font-size:14px;color:var(--mu);line-height:1.65}
.proj-card{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:20px;margin-bottom:16px}
.proj-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.proj-head h3{font-size:15px;font-weight:600}
.proj-links{display:flex;gap:10px}
.proj-links a{font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--ac)}
.proj-card p{font-size:14px;color:var(--mu);line-height:1.65;margin-bottom:12px}
.tags,.skills-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tag{font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;background:rgba(74,222,128,.07);color:var(--ac);border:1px solid rgba(74,222,128,.15);border-radius:4px}
.skill-tag{font-size:12px;font-family:'JetBrains Mono',monospace;padding:5px 12px;background:var(--s);border:1px solid var(--b);border-radius:6px;color:var(--fg)}
</style>
</head>
<body>
<div class="container">
<header>
  <div class="avatar-wrap">${(d.name||"?")[0].toUpperCase()}</div>
  <div>
    <div class="name">${d.name||""}</div>
    <div class="title">${d.title||""}</div>
    ${d.location ? `<div class="loc">📍 ${d.location}</div>` : ""}
    <p class="bio">${d.bio||""}</p>
    <div class="soc">${socialLinks(d, acc)}</div>
  </div>
</header>
${d.experience?.length ? `<div class="section"><div class="section-label">Work Experience.</div>${expHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><div class="section-label">Projects.</div>${projHtml(d.projects, acc)}</div>` : ""}
${d.skills?.length ? `<div class="section"><div class="section-label">Skills.</div><div class="skills-wrap">${skillsHtml(d.skills)}</div></div>` : ""}
${createBanner(d.username)}
</div>
</body></html>`;
}

/* Template 2 – Light Professional */
function template2(d: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.name} — Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f8f9fb;color:#1a1a2e;font-family:'Inter',sans-serif;line-height:1.6}
a{color:#3b5bdb;text-decoration:none}a:hover{text-decoration:underline}
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);color:#fff;padding:60px 24px}
.hero-inner{max-width:760px;margin:0 auto;display:flex;gap:32px;align-items:center}
.avatar-wrap{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#3b5bdb,#74c0fc);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 0 0 4px rgba(255,255,255,.15)}
.name{font-family:'Fraunces',serif;font-size:32px;font-weight:700;margin-bottom:4px}
.title{font-size:14px;color:#74c0fc;letter-spacing:.04em;margin-bottom:10px}
.bio{font-size:15px;color:rgba(255,255,255,.75);line-height:1.7;max-width:520px}
.soc{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.soc a{font-size:12px;padding:5px 14px;border:1px solid rgba(255,255,255,.25);border-radius:20px;color:rgba(255,255,255,.8);transition:.15s}
.soc a:hover{border-color:#74c0fc;color:#74c0fc;text-decoration:none}
.main{max-width:760px;margin:0 auto;padding:48px 24px}
.section{margin-bottom:48px}
.section h2{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#1a1a2e;margin-bottom:24px;padding-bottom:10px;border-bottom:2px solid #3b5bdb}
.exp-item{display:flex;gap:0;margin-bottom:28px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.exp-dot{width:4px;background:#3b5bdb;border-radius:2px;margin-right:20px;flex-shrink:0}
.exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}
.exp-head strong{font-size:15px;font-weight:600}
.period{font-size:12px;color:#868e96}
.company{font-size:13px;color:#3b5bdb;font-weight:500;margin-bottom:8px}
.exp-body p{font-size:14px;color:#495057;line-height:1.65}
.proj-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #3b5bdb}
.proj-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.proj-head h3{font-size:16px;font-weight:600;color:#1a1a2e}
.proj-links{display:flex;gap:10px}
.proj-links a{font-size:12px;color:#3b5bdb;padding:3px 10px;border:1px solid #3b5bdb;border-radius:12px}
.proj-card p{font-size:14px;color:#495057;line-height:1.65;margin-bottom:12px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tag{font-size:11px;padding:3px 10px;background:#e7f5ff;color:#1971c2;border-radius:12px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:8px}
.skill-tag{font-size:13px;padding:6px 14px;background:#fff;border:1px solid #dee2e6;border-radius:20px;color:#343a40;font-weight:500}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-inner">
    <div class="avatar-wrap">${(d.name||"?")[0].toUpperCase()}</div>
    <div>
      <div class="name">${d.name||""}</div>
      <div class="title">${d.title||""} ${d.location ? `· ${d.location}` : ""}</div>
      <p class="bio">${d.bio||""}</p>
      <div class="soc">${socialLinks(d, "#74c0fc")}</div>
    </div>
  </div>
</div>
<div class="main">
${d.experience?.length ? `<div class="section"><h2>Experience</h2>${expHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><h2>Projects</h2>${projHtml(d.projects, "#3b5bdb")}</div>` : ""}
${d.skills?.length ? `<div class="section"><h2>Skills</h2><div class="skills-wrap">${skillsHtml(d.skills)}</div></div>` : ""}
${createBanner(d.username)}
</div>
</body></html>`;
}

/* Template 3 – Creative Bold */
function template3(d: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.name} — Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d0d;color:#f0f0f0;font-family:'Inter',sans-serif;line-height:1.6}
a{color:#e879f9;text-decoration:none}a:hover{text-decoration:underline}
.hero{min-height:65vh;display:flex;align-items:center;background:radial-gradient(ellipse at top left,#7c3aed33 0%,transparent 50%),radial-gradient(ellipse at bottom right,#db277733 0%,transparent 50%);border-bottom:1px solid #1f1f1f;padding:60px 24px}
.hero-inner{max-width:800px;margin:0 auto;width:100%}
.avatar-wrap{width:80px;height:80px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#db2777);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;font-family:'Syne',sans-serif;color:#fff;margin-bottom:28px}
.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#a855f7;margin-bottom:12px}
.name{font-family:'Syne',sans-serif;font-size:clamp(36px,6vw,64px);font-weight:800;line-height:1.1;margin-bottom:12px;background:linear-gradient(135deg,#f0f0f0,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.title{font-size:18px;color:#a1a1aa;margin-bottom:20px}
.bio{font-size:16px;color:#71717a;line-height:1.75;max-width:600px;margin-bottom:28px}
.soc{display:flex;gap:12px;flex-wrap:wrap}
.soc a{font-size:13px;padding:8px 18px;border:1px solid #2d2d2d;border-radius:8px;color:#d4d4d4;transition:.15s;background:#141414}
.soc a:hover{border-color:#a855f7;color:#e879f9;text-decoration:none}
.main{max-width:800px;margin:0 auto;padding:64px 24px}
.section{margin-bottom:56px}
.section-label{font-family:'Syne',sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#52525b;margin-bottom:28px;display:flex;align-items:center;gap:12px}
.section-label::after{content:'';flex:1;height:1px;background:#1f1f1f}
.exp-item{display:grid;grid-template-columns:1fr;margin-bottom:24px;padding:24px;background:#111;border-radius:16px;border:1px solid #1f1f1f;transition:.2s}
.exp-item:hover{border-color:#2d2d2d}
.exp-dot{display:none}
.exp-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.exp-head strong{font-family:'Syne',sans-serif;font-size:16px;font-weight:700}
.period{font-size:12px;color:#52525b;padding:3px 10px;background:#1a1a1a;border-radius:20px}
.company{font-size:13px;color:#a855f7;margin-bottom:10px}
.exp-body p{font-size:14px;color:#71717a;line-height:1.7}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.tag{font-size:11px;padding:3px 10px;background:#1a0533;color:#c084fc;border:1px solid #3d1a6e;border-radius:4px}
.proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.proj-card{background:#111;border:1px solid #1f1f1f;border-radius:16px;padding:24px;transition:.2s}
.proj-card:hover{border-color:#3d1a6e;transform:translateY(-2px)}
.proj-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.proj-head h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:700}
.proj-links{display:flex;gap:8px;flex-direction:column;align-items:flex-end}
.proj-links a{font-size:11px;color:#a855f7;padding:2px 8px;border:1px solid #3d1a6e;border-radius:4px;white-space:nowrap}
.proj-card p{font-size:13px;color:#71717a;line-height:1.65;margin-bottom:12px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:10px}
.skill-tag{font-size:13px;padding:7px 16px;background:#111;border:1px solid #2d2d2d;border-radius:8px;color:#d4d4d4;transition:.15s}
.skill-tag:hover{border-color:#a855f7;color:#e879f9}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-inner">
    <div class="avatar-wrap">${(d.name||"?")[0].toUpperCase()}</div>
    <div class="eyebrow">Portfolio</div>
    <div class="name">${d.name||""}</div>
    <div class="title">${d.title||""} ${d.location ? `· ${d.location}` : ""}</div>
    <p class="bio">${d.bio||""}</p>
    <div class="soc">${socialLinks(d, "#e879f9")}</div>
  </div>
</div>
<div class="main">
${d.experience?.length ? `<div class="section"><div class="section-label">Experience</div>${expHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><div class="section-label">Projects</div><div class="proj-grid">${projHtml(d.projects, "#a855f7")}</div></div>` : ""}
${d.skills?.length ? `<div class="section"><div class="section-label">Skills</div><div class="skills-wrap">${skillsHtml(d.skills)}</div></div>` : ""}
${createBanner(d.username)}
</div>
</body></html>`;
}

export default router;
