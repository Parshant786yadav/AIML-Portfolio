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
function genAdminPass(): string {
  const a = ['Sky','Red','Blue','Gold','Star','Fire','Ice','Wind','Sea','Sun','Ace','Neo','Zen','Arc','Max'];
  const n = ['Bear','Wolf','Fox','Lion','Eagle','Hawk','Tiger','Crane','Oak','Rock','Sage','Bolt','Flux','Byte','Core'];
  return `${a[Math.floor(Math.random()*15)]}-${n[Math.floor(Math.random()*15)]}-${Math.floor(Math.random()*900)+100}`;
}
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
    const adminPassword = genAdminPass();
    users[username.toLowerCase()] = { username: username.toLowerCase(), displayName: displayName || username, passwordHash: await hashPassword(password), adminPassword, token, created: Date.now() };
    await saveUsers(users);
    res.json({ token, username: username.toLowerCase(), displayName: displayName || username, adminPassword });
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
    res.json({ token: user.token, username: user.username, displayName: user.displayName, adminPassword: user.adminPassword || '' });
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

router.get("/builder/my-portfolio", authMiddleware, async (req: any, res) => {
  const data = await loadPortfolio(req.builderUser.username);
  res.json({ data: data || {} });
});

router.post("/builder/my-portfolio", authMiddleware, async (req: any, res) => {
  try {
    const { data } = req.body;
    const existing = await loadPortfolio(req.builderUser.username) || {};
    await savePortfolio(req.builderUser.username, { ...data, username: req.builderUser.username, contacts: existing.contacts || [], updatedAt: Date.now() });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to save" }); }
});

router.get("/builder/contacts", authMiddleware, async (req: any, res) => {
  const data = await loadPortfolio(req.builderUser.username);
  res.json({ contacts: (data?.contacts || []).reverse() });
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

portfolioServeRouter.post("/:username/contact", async (req, res) => {
  try {
    const data = await loadPortfolio(req.params.username);
    if (!data) return res.status(404).json({ error: "Not found" });
    if (!data.contacts) data.contacts = [];
    data.contacts.push({ name: req.body.name || '', email: req.body.email || '', message: req.body.message || '', date: new Date().toISOString() });
    await savePortfolio(req.params.username, data);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

portfolioServeRouter.get("/:username/admin", async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(adminPanelPage(req.params.username));
});

function adminPanelPage(username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin — @${username}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e0e0e0;font-family:'Inter',system-ui,sans-serif;line-height:1.5;min-height:100vh}
a{color:#4ade80;text-decoration:none}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.login-card{background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:40px;max-width:400px;width:100%}
.login-logo{font-family:monospace;font-size:13px;color:#4ade80;margin-bottom:24px}
.login-title{font-size:22px;font-weight:700;margin-bottom:4px}
.login-sub{font-size:13px;color:#666;margin-bottom:28px}
.f{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.f label{font-size:11px;color:#666;font-weight:500;text-transform:uppercase;letter-spacing:.06em}
.f input{background:#0a0a0a;border:1px solid #1e1e1e;border-radius:8px;padding:10px 12px;font-size:13px;color:#e0e0e0;font-family:inherit;transition:border-color .15s;width:100%}
.f input:focus{outline:none;border-color:#4ade80}
.btn-primary{width:100%;background:#4ade80;color:#000;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;transition:.15s}
.btn-primary:hover{background:#22c55e}
.err{font-size:12px;color:#ef4444;margin-top:8px;min-height:18px}
.panel{display:none;flex-direction:column;min-height:100vh}
.phdr{display:flex;align-items:center;gap:12px;padding:0 24px;height:56px;background:#111;border-bottom:1px solid #1a1a1a;flex-shrink:0;flex-wrap:wrap}
.plogo{font-family:monospace;font-size:12px;color:#4ade80}
.puser{font-size:12px;color:#555;font-family:monospace}
.ptabs{display:flex;gap:4px;margin-left:auto}
.tbtn{font-size:12px;font-family:monospace;padding:6px 14px;background:transparent;border:1px solid transparent;border-radius:6px;color:#666;cursor:pointer;transition:.15s}
.tbtn.active,.tbtn:hover{border-color:#1e1e1e;color:#e0e0e0}.tbtn.active{background:#1a1a1a;color:#4ade80}
.vbtn{font-size:12px;font-family:monospace;padding:6px 12px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);border-radius:6px;color:#4ade80;text-decoration:none}
.lbtn{font-size:12px;font-family:monospace;padding:6px 12px;background:transparent;border:1px solid #1e1e1e;border-radius:6px;color:#666;cursor:pointer}
.edit-wrap{max-width:780px;margin:0 auto;padding:28px 20px}
.sbar{position:sticky;top:0;z-index:10;background:#0a0a0ae0;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:24px;border-bottom:1px solid #1a1a1a}
.sbar-r{display:flex;align-items:center;gap:12px}
.save-st{font-size:12px;color:#4ade80;font-family:monospace}
.btn-save{background:#4ade80;color:#000;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer}
.btn-save:disabled{opacity:.5;cursor:not-allowed}
.shdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1a1a1a}
.stitle{font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;color:#555;font-weight:600}
.sblk{margin-bottom:26px}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
@media(max-width:600px){.fr{grid-template-columns:1fr}}
.fld{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.fld label{font-size:11px;color:#555;font-weight:500}
.fld input,.fld textarea,.fld select{background:#111;border:1px solid #1a1a1a;border-radius:8px;padding:8px 11px;font-size:13px;color:#e0e0e0;font-family:inherit;width:100%;transition:border-color .15s;resize:vertical}
.fld input:focus,.fld textarea:focus{outline:none;border-color:#4ade80}
.dyn-item{background:#111;border:1px solid #1a1a1a;border-radius:10px;padding:14px;margin-bottom:8px}
.dyn-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.dyn-lbl{font-size:11px;font-family:monospace;color:#555;font-weight:600}
.btn-rm{font-size:11px;color:#ef4444;background:transparent;border:1px solid #3a1a1a;border-radius:6px;padding:3px 8px;cursor:pointer}
.btn-add{font-size:12px;font-family:monospace;color:#4ade80;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.18);border-radius:8px;padding:5px 12px;cursor:pointer}
.btn-add:hover{background:rgba(74,222,128,.14)}
.li{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.lbadge{font-size:11px;font-family:monospace;background:#1a1a1a;border:1px solid #252525;border-radius:6px;padding:4px 8px;color:#888;white-space:nowrap;min-width:72px;text-align:center}
.linput{flex:1;background:#111;border:1px solid #1a1a1a;border-radius:8px;padding:7px 11px;font-size:13px;color:#e0e0e0;font-family:inherit;transition:border-color .15s}
.linput:focus{outline:none;border-color:#4ade80}
.ladd{display:flex;gap:8px;margin-top:6px}
.ladd select{background:#111;border:1px solid #1a1a1a;border-radius:8px;padding:8px 11px;font-size:13px;color:#e0e0e0;flex:1;cursor:pointer}
.contacts-wrap{max-width:780px;margin:0 auto;padding:28px 20px}
.ct{font-size:18px;font-weight:700;margin-bottom:4px}
.cs{font-size:13px;color:#555;margin-bottom:22px}
.ccard{background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:16px;margin-bottom:10px}
.cchdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.ccname{font-size:14px;font-weight:600}
.ccdate{font-size:11px;font-family:monospace;color:#555}
.ccemail{font-size:12px;color:#4ade80;margin-bottom:6px;font-family:monospace}
.ccmsg{font-size:14px;color:#aaa;line-height:1.6}
.empty{text-align:center;padding:48px 24px;color:#555;font-size:14px}
</style>
</head>
<body>
<div class="login-wrap" id="ls">
  <div class="login-card">
    <div class="login-logo">✦ portfolio.admin</div>
    <h1 class="login-title">Admin Panel</h1>
    <p class="login-sub">@${username}</p>
    <form onsubmit="doLogin(event)">
      <div class="f"><label>Username</label><input type="text" id="lu" value="${username}" required /></div>
      <div class="f"><label>Password</label><input type="password" id="lp" placeholder="Your builder password" required /></div>
      <button type="submit" class="btn-primary" id="lbtn">Sign in →</button>
      <div class="err" id="lerr"></div>
    </form>
  </div>
</div>
<div class="panel" id="panel">
  <div class="phdr">
    <span class="plogo">✦ portfolio.admin</span>
    <span class="puser">@${username}</span>
    <div class="ptabs">
      <button class="tbtn active" onclick="showTab('edit')" id="tb-edit">Edit Portfolio</button>
      <button class="tbtn" onclick="showTab('contacts')" id="tb-contacts">Contacts</button>
    </div>
    <a href="/p/${username}" target="_blank" class="vbtn">View Live ↗</a>
    <button class="lbtn" onclick="logout()">Logout</button>
  </div>
  <div id="edit-pane">
    <div class="edit-wrap">
      <div class="sbar">
        <div><div style="font-size:14px;font-weight:600">Edit Portfolio</div><div style="font-size:11px;color:#555;margin-top:2px">Changes saved when you click Save</div></div>
        <div class="sbar-r"><span class="save-st" id="sst"></span><button class="btn-save" onclick="saveP()">Save Changes</button></div>
      </div>
      <div class="sblk"><div class="shdr"><div class="stitle">Personal Info</div></div>
        <div class="fr"><div class="fld"><label>Full Name</label><input type="text" id="pn" /></div><div class="fld"><label>Title / Role</label><input type="text" id="pt" /></div></div>
        <div class="fr"><div class="fld"><label>Location</label><input type="text" id="pl" /></div><div class="fld"><label>Email</label><input type="email" id="pe" /></div></div>
        <div class="fld"><label>Bio</label><textarea id="pb" rows="4"></textarea></div>
      </div>
      <div class="sblk"><div class="shdr"><div class="stitle">Links</div></div>
        <div id="llist"></div>
        <div class="ladd">
          <select id="lsel"><option value="">Platform...</option><option>GitHub</option><option>LinkedIn</option><option>WhatsApp</option><option>Twitter</option><option>LeetCode</option><option>Website</option><option>YouTube</option><option>Instagram</option><option>Medium</option><option>Dev.to</option><option>Custom</option></select>
          <button class="btn-add" onclick="addL()">+ Add</button>
        </div>
      </div>
      <div class="sblk"><div class="shdr"><div class="stitle">Work Experience</div><button class="btn-add" onclick="addE()">+ Add</button></div><div id="elist"></div></div>
      <div class="sblk"><div class="shdr"><div class="stitle">Projects</div><button class="btn-add" onclick="addPr()">+ Add</button></div><div id="prlist"></div></div>
      <div class="sblk"><div class="shdr"><div class="stitle">Skills</div></div>
        <div class="fld"><label>Comma separated</label><input type="text" id="psk" placeholder="Python, React, AWS, ..." /></div>
      </div>
      <div class="sblk"><div class="shdr"><div class="stitle">Education</div><button class="btn-add" onclick="addEd()">+ Add</button></div><div id="edlist"></div></div>
      <div class="sblk"><div class="shdr"><div class="stitle">Certifications</div><button class="btn-add" onclick="addCe()">+ Add</button></div><div id="celist"></div></div>
      <div class="sblk"><div class="shdr"><div class="stitle">LeetCode / Competitive Programming</div></div>
        <div class="fr"><div class="fld"><label>LeetCode Username</label><input type="text" id="lcu" /></div><div class="fld"><label>Total Solved</label><input type="number" id="lct" /></div></div>
        <div class="fr"><div class="fld"><label>Hard Solved</label><input type="number" id="lch" /></div><div class="fld"><label>Medium Solved</label><input type="number" id="lcm" /></div></div>
        <div class="fr"><div class="fld"><label>Easy Solved</label><input type="number" id="lce" /></div><div class="fld"><label>Contest Rating</label><input type="number" id="lcr" /></div></div>
      </div>
      <div class="sblk"><div class="shdr"><div class="stitle">Template (1–15)</div></div>
        <div class="fld"><label>Template Number</label><input type="number" id="ptmpl" min="1" max="15" /></div>
      </div>
    </div>
  </div>
  <div id="contacts-pane" style="display:none">
    <div class="contacts-wrap">
      <div class="ct">Contact Form Submissions</div>
      <div class="cs">Messages sent via the contact form on your portfolio.</div>
      <div id="clist"><div class="empty">Loading…</div></div>
    </div>
  </div>
</div>
<script>
let tok=sessionStorage.getItem('adm_${username}');
let pd={};
async function doLogin(e){
  e.preventDefault();const b=document.getElementById('lbtn');
  b.disabled=true;b.textContent='…';document.getElementById('lerr').textContent='';
  try{
    const r=await fetch('/api/builder/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('lu').value,password:document.getElementById('lp').value})});
    const d=await r.json();
    if(!r.ok||d.username!=='${username}'){document.getElementById('lerr').textContent=d.error||'Access denied.';return;}
    tok=d.token;sessionStorage.setItem('adm_${username}',tok);
    showPanel();loadPD();
  }catch{document.getElementById('lerr').textContent='Network error.';}
  finally{b.disabled=false;b.textContent='Sign in →';}
}
function showPanel(){document.getElementById('ls').style.display='none';const p=document.getElementById('panel');p.style.display='flex';p.style.flexDirection='column';}
function logout(){sessionStorage.removeItem('adm_${username}');location.reload();}
function showTab(t){
  document.getElementById('edit-pane').style.display=t==='edit'?'block':'none';
  document.getElementById('contacts-pane').style.display=t==='contacts'?'block':'none';
  document.getElementById('tb-edit').classList.toggle('active',t==='edit');
  document.getElementById('tb-contacts').classList.toggle('active',t==='contacts');
  if(t==='contacts')loadC();
}
function g(id){return document.getElementById(id)?.value?.trim()||'';}
async function loadPD(){
  try{
    const r=await fetch('/api/builder/my-portfolio',{headers:{'Authorization':'Bearer '+tok}});
    const d=await r.json();pd=d.data||{};popForm(pd);
  }catch{}
}
function popForm(d){
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('pn',d.name);set('pt',d.title);set('pb',d.bio);set('pl',d.location);set('pe',d.email);
  set('psk',(d.skills||[]).join(', '));
  set('lcu',d.leetcode?.username);set('lct',d.leetcode?.solved);set('lch',d.leetcode?.hard);
  set('lcm',d.leetcode?.medium);set('lce',d.leetcode?.easy);set('lcr',d.leetcode?.rating);
  set('ptmpl',d.template||1);
  // links
  const ll=document.getElementById('llist');ll.innerHTML='';
  const links=Array.isArray(d.links)?d.links:bldLinks(d.links,d.email);
  links.forEach(l=>rndLink(l.platform,l.url));
  // exp
  const el=document.getElementById('elist');el.innerHTML='';
  (d.experience||[]).forEach(e=>{addE();const i=el.lastElementChild;i.querySelector('[name=role]').value=e.role||'';i.querySelector('[name=co]').value=e.company||'';i.querySelector('[name=per]').value=e.period||'';i.querySelector('[name=desc]').value=e.description||'';i.querySelector('[name=sk]').value=(e.skills||[]).join(', ');});
  // proj
  const pl=document.getElementById('prlist');pl.innerHTML='';
  (d.projects||[]).forEach(p=>{addPr();const i=pl.lastElementChild;i.querySelector('[name=nm]').value=p.name||'';i.querySelector('[name=desc]').value=p.description||'';i.querySelector('[name=gh]').value=p.githubUrl||'';i.querySelector('[name=lv]').value=p.liveUrl||'';i.querySelector('[name=tg]').value=(p.tags||[]).join(', ');});
  // edu
  const edl=document.getElementById('edlist');edl.innerHTML='';
  (d.education||[]).forEach(e=>{addEd();const i=edl.lastElementChild;i.querySelector('[name=ins]').value=e.institution||'';i.querySelector('[name=deg]').value=e.degree||'';i.querySelector('[name=fld]').value=e.field||'';i.querySelector('[name=per]').value=e.period||'';i.querySelector('[name=cgpa]').value=e.cgpa||'';});
  // cert
  const cl=document.getElementById('celist');cl.innerHTML='';
  (d.certifications||[]).forEach(c=>{addCe();const i=cl.lastElementChild;i.querySelector('[name=nm]').value=c.name||'';i.querySelector('[name=iss]').value=c.issuer||'';i.querySelector('[name=dt]').value=c.date||'';i.querySelector('[name=url]').value=c.url||'';});
}
function bldLinks(obj,email){
  const a=[];if(!obj){if(email)a.push({platform:'Email',url:'mailto:'+email});return a;}
  if(obj.github)a.push({platform:'GitHub',url:obj.github});
  if(obj.linkedin)a.push({platform:'LinkedIn',url:obj.linkedin});
  if(obj.website)a.push({platform:'Website',url:obj.website});
  if(email)a.push({platform:'Email',url:'mailto:'+email});
  return a;
}
function rndLink(platform,url){
  const ll=document.getElementById('llist');const div=document.createElement('div');div.className='li';
  div.innerHTML=\`<span class="lbadge">\${platform}</span><input type="url" class="linput" data-platform="\${platform}" placeholder="https://..." value="\${url||''}" /><button class="btn-rm" onclick="this.parentElement.remove()">×</button>\`;
  ll.appendChild(div);
}
function addL(){const s=document.getElementById('lsel');if(!s.value)return;rndLink(s.value,'');s.value='';}
function tmpl(content){const d=document.createElement('div');d.className='dyn-item';d.innerHTML=content;return d;}
function rm(btn){btn.closest('.dyn-item').remove();}
function addE(){
  const d=tmpl(\`<div class="dyn-hdr"><span class="dyn-lbl">Experience</span><button class="btn-rm" onclick="rm(this)">✕ Remove</button></div>
  <div class="fr"><div class="fld"><label>Role</label><input type="text" name="role" placeholder="Software Engineer" /></div><div class="fld"><label>Company</label><input type="text" name="co" placeholder="Company Name" /></div></div>
  <div class="fr"><div class="fld"><label>Period</label><input type="text" name="per" placeholder="Jan 2023 — Present" /></div><div class="fld"><label>Skills Used</label><input type="text" name="sk" placeholder="Python, React, ..." /></div></div>
  <div class="fld"><label>Description</label><textarea name="desc" rows="3"></textarea></div>\`);
  document.getElementById('elist').appendChild(d);
}
function addPr(){
  const d=tmpl(\`<div class="dyn-hdr"><span class="dyn-lbl">Project</span><button class="btn-rm" onclick="rm(this)">✕ Remove</button></div>
  <div class="fr"><div class="fld"><label>Project Name</label><input type="text" name="nm" /></div><div class="fld"><label>Tags</label><input type="text" name="tg" placeholder="Python, React, ..." /></div></div>
  <div class="fld"><label>Description</label><textarea name="desc" rows="3"></textarea></div>
  <div class="fr"><div class="fld"><label>GitHub URL</label><input type="url" name="gh" /></div><div class="fld"><label>Live URL</label><input type="url" name="lv" /></div></div>\`);
  document.getElementById('prlist').appendChild(d);
}
function addEd(){
  const d=tmpl(\`<div class="dyn-hdr"><span class="dyn-lbl">Education</span><button class="btn-rm" onclick="rm(this)">✕ Remove</button></div>
  <div class="fr"><div class="fld"><label>Institution</label><input type="text" name="ins" /></div><div class="fld"><label>Degree</label><input type="text" name="deg" /></div></div>
  <div class="fr"><div class="fld"><label>Field of Study</label><input type="text" name="fld" /></div><div class="fld"><label>Period</label><input type="text" name="per" /></div></div>
  <div class="fld"><label>CGPA / Grade</label><input type="text" name="cgpa" /></div>\`);
  document.getElementById('edlist').appendChild(d);
}
function addCe(){
  const d=tmpl(\`<div class="dyn-hdr"><span class="dyn-lbl">Certification</span><button class="btn-rm" onclick="rm(this)">✕ Remove</button></div>
  <div class="fr"><div class="fld"><label>Certificate Name</label><input type="text" name="nm" /></div><div class="fld"><label>Issuing Org</label><input type="text" name="iss" /></div></div>
  <div class="fr"><div class="fld"><label>Date</label><input type="text" name="dt" /></div><div class="fld"><label>URL</label><input type="url" name="url" /></div></div>\`);
  document.getElementById('celist').appendChild(d);
}
function collectF(){
  const links=[...document.querySelectorAll('#llist .li')].map(i=>({platform:i.querySelector('.lbadge').textContent,url:i.querySelector('.linput').value.trim()})).filter(l=>l.url);
  const experience=[...document.querySelectorAll('#elist .dyn-item')].map(el=>({role:el.querySelector('[name=role]')?.value?.trim()||'',company:el.querySelector('[name=co]')?.value?.trim()||'',period:el.querySelector('[name=per]')?.value?.trim()||'',description:el.querySelector('[name=desc]')?.value?.trim()||'',skills:(el.querySelector('[name=sk]')?.value||'').split(',').map(s=>s.trim()).filter(Boolean)})).filter(e=>e.role||e.company);
  const projects=[...document.querySelectorAll('#prlist .dyn-item')].map(el=>({name:el.querySelector('[name=nm]')?.value?.trim()||'',description:el.querySelector('[name=desc]')?.value?.trim()||'',githubUrl:el.querySelector('[name=gh]')?.value?.trim()||'',liveUrl:el.querySelector('[name=lv]')?.value?.trim()||'',tags:(el.querySelector('[name=tg]')?.value||'').split(',').map(s=>s.trim()).filter(Boolean)})).filter(p=>p.name);
  const education=[...document.querySelectorAll('#edlist .dyn-item')].map(el=>({institution:el.querySelector('[name=ins]')?.value?.trim()||'',degree:el.querySelector('[name=deg]')?.value?.trim()||'',field:el.querySelector('[name=fld]')?.value?.trim()||'',period:el.querySelector('[name=per]')?.value?.trim()||'',cgpa:el.querySelector('[name=cgpa]')?.value?.trim()||''})).filter(e=>e.institution||e.degree);
  const certifications=[...document.querySelectorAll('#celist .dyn-item')].map(el=>({name:el.querySelector('[name=nm]')?.value?.trim()||'',issuer:el.querySelector('[name=iss]')?.value?.trim()||'',date:el.querySelector('[name=dt]')?.value?.trim()||'',url:el.querySelector('[name=url]')?.value?.trim()||''})).filter(c=>c.name);
  const lcUser=g('lcu'),lcTotal=parseInt(g('lct'))||0;
  const leetcode=(lcUser||lcTotal)?{username:lcUser,solved:lcTotal,hard:parseInt(g('lch'))||0,medium:parseInt(g('lcm'))||0,easy:parseInt(g('lce'))||0,rating:parseInt(g('lcr'))||0}:null;
  return{name:g('pn'),title:g('pt'),bio:g('pb'),location:g('pl'),email:g('pe'),skills:g('psk').split(',').map(s=>s.trim()).filter(Boolean),links,experience,projects,education,certifications,leetcode,template:parseInt(g('ptmpl'))||pd.template||1};
}
async function saveP(){
  const b=document.querySelector('.btn-save');const s=document.getElementById('sst');
  b.disabled=true;b.textContent='Saving…';s.textContent='';
  try{
    const r=await fetch('/api/builder/my-portfolio',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({data:collectF()})});
    if(r.ok){s.textContent='✓ Saved!';setTimeout(()=>s.textContent='',3000);}else s.textContent='✗ Failed';
  }catch{s.textContent='✗ Network error';}
  finally{b.disabled=false;b.textContent='Save Changes';}
}
async function loadC(){
  const cl=document.getElementById('clist');cl.innerHTML='<div class="empty">Loading…</div>';
  try{
    const r=await fetch('/api/builder/contacts',{headers:{'Authorization':'Bearer '+tok}});
    const d=await r.json();const contacts=d.contacts||[];
    if(!contacts.length){cl.innerHTML='<div class="empty">No contact form submissions yet.</div>';return;}
    cl.innerHTML=contacts.map(c=>\`<div class="ccard"><div class="cchdr"><div class="ccname">\${c.name||'Anonymous'}</div><div class="ccdate">\${new Date(c.date).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div><div class="ccemail">\${c.email||''}</div><div class="ccmsg">\${c.message||''}</div></div>\`).join('');
  }catch{cl.innerHTML='<div class="empty">Failed to load.</div>';}
}
if(tok){showPanel();loadPD();}
</script>
</body></html>`;
}

function notFoundPage(username: string) {
  return `<!DOCTYPE html><html><head><title>Portfolio not found</title><style>body{background:#0a0a0a;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}a{color:#4ade80;text-decoration:none}</style></head><body><h2>Portfolio not found</h2><p>@${username} hasn't created a portfolio yet.</p><a href="/">Create yours →</a></body></html>`;
}

/* ── TEMPLATES ── */
function renderTemplate(d: any, t: number): string {
  if (t === 2) return template2(d);
  if (t === 3) return template3(d);
  if (t >= 4 && t <= 15) return factoryTemplate(d, THEME_CFGS[t]);
  return template1(d);
}

interface ThemeCfg {
  bg: string; s: string; b: string; fg: string; mu: string; ac: string;
  font: string; mono: string; gf: string;
  tBg: string; tFg: string; tBd: string;
  avBg: string; avFg: string;
  extra?: string;
}
const THEME_CFGS: Record<number, ThemeCfg> = {
  4: { bg:'#060e1c',s:'#0d1f38',b:'#1e3550',fg:'#deeeff',mu:'#5580a0',ac:'#38bdf8',
    font:"'Inter',sans-serif",mono:"'JetBrains Mono',monospace",
    gf:'family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    tBg:'rgba(56,189,248,.08)',tFg:'#38bdf8',tBd:'rgba(56,189,248,.2)',avBg:'#38bdf8',avFg:'#000' },
  5: { bg:'#100d05',s:'#1c1708',b:'#2e2610',fg:'#f0e6c8',mu:'#7a6840',ac:'#f59e0b',
    font:"'Inter',sans-serif",mono:"'JetBrains Mono',monospace",
    gf:'family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    tBg:'rgba(245,158,11,.08)',tFg:'#f59e0b',tBd:'rgba(245,158,11,.2)',avBg:'#f59e0b',avFg:'#000' },
  6: { bg:'#000',s:'#080808',b:'#1a2a1a',fg:'#00ff41',mu:'#006820',ac:'#00ff41',
    font:"'JetBrains Mono',monospace",mono:"'JetBrains Mono',monospace",
    gf:'family=JetBrains+Mono:wght@400;500;700',
    tBg:'rgba(0,255,65,.08)',tFg:'#00ff41',tBd:'rgba(0,255,65,.2)',avBg:'#001a08',avFg:'#00ff41',
    extra:`body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.05) 2px,rgba(0,0,0,.05) 4px);pointer-events:none;z-index:9999}
.hn{text-shadow:0 0 20px rgba(0,255,65,.5)}.hero{border-bottom-color:#1a2a1a}
.av{border-radius:2px;border:1px solid #00ff41}.proj-card,.skill-tag{border-radius:2px}` },
  7: { bg:'#ffffff',s:'#f5f5f5',b:'#e0e0e0',fg:'#0a0a0a',mu:'#666',ac:'#0a0a0a',
    font:"'Inter',sans-serif",mono:"'Inter',sans-serif",gf:'family=Inter:wght@400;500;600;700',
    tBg:'#ebebeb',tFg:'#333',tBd:'#d0d0d0',avBg:'#0a0a0a',avFg:'#fff',
    extra:`.proj-card{box-shadow:0 1px 4px rgba(0,0,0,.08)}.soc a,.skill-tag{border-radius:4px}` },
  8: { bg:'#fdf4ff',s:'#fff',b:'#e8d0f5',fg:'#2d1b4e',mu:'#8a6aab',ac:'#9333ea',
    font:"'Inter',sans-serif",mono:"'Inter',sans-serif",gf:'family=Inter:wght@400;500;600;700',
    tBg:'rgba(147,51,234,.08)',tFg:'#9333ea',tBd:'rgba(147,51,234,.2)',avBg:'#9333ea',avFg:'#fff',
    extra:`.av{background:linear-gradient(135deg,#9333ea,#ec4899)!important}
.proj-card{box-shadow:0 2px 12px rgba(147,51,234,.07)}.skill-tag,.soc a{border-radius:20px}` },
  9: { bg:'#fffbf2',s:'#fff9ec',b:'#e0d8c0',fg:'#1a1206',mu:'#7a6a50',ac:'#c2410c',
    font:"Georgia,'Times New Roman',serif",mono:"'Courier New',monospace",gf:'',
    tBg:'rgba(194,65,12,.06)',tFg:'#c2410c',tBd:'rgba(194,65,12,.18)',avBg:'#c2410c',avFg:'#fff',
    extra:`.hn{font-size:30px;letter-spacing:-.02em}.sl{letter-spacing:.18em}
.proj-card{border-left:3px solid #c2410c;border-top:none;border-right:none;border-bottom:none;background:transparent;border-radius:0;padding-left:18px}
.av{border-radius:4px;font-family:Georgia,serif}` },
  10: { bg:'#0f0f23',s:'rgba(255,255,255,0.05)',b:'rgba(255,255,255,0.1)',fg:'#ffffff',mu:'#9090c0',ac:'#818cf8',
    font:"'Inter',sans-serif",mono:"'Inter',sans-serif",gf:'family=Inter:wght@400;500;600;700',
    tBg:'rgba(129,140,248,.08)',tFg:'#818cf8',tBd:'rgba(129,140,248,.2)',avBg:'#818cf8',avFg:'#fff',
    extra:`body{background-image:radial-gradient(ellipse at top left,rgba(129,140,248,.15) 0%,transparent 50%),radial-gradient(ellipse at bottom right,rgba(192,132,252,.1) 0%,transparent 50%)}
.av{background:linear-gradient(135deg,#818cf8,#c084fc)!important}
.proj-card,.soc a,.skill-tag{backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.hero{border-bottom-color:rgba(255,255,255,.1)}.proj-card{border-radius:16px}.soc a,.skill-tag{border-radius:20px}` },
  11: { bg:'#050f08',s:'#0b1a0e',b:'#153020',fg:'#c8f5d8',mu:'#4a7a5a',ac:'#4ade80',
    font:"'Inter',sans-serif",mono:"'JetBrains Mono',monospace",
    gf:'family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    tBg:'rgba(74,222,128,.07)',tFg:'#4ade80',tBd:'rgba(74,222,128,.18)',avBg:'#153020',avFg:'#4ade80' },
  12: { bg:'#0f0505',s:'#1c0a0a',b:'#3a1515',fg:'#f5e8e8',mu:'#8a5050',ac:'#ef4444',
    font:"'Inter',sans-serif",mono:"'JetBrains Mono',monospace",
    gf:'family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    tBg:'rgba(239,68,68,.07)',tFg:'#ef4444',tBd:'rgba(239,68,68,.2)',avBg:'#ef4444',avFg:'#fff' },
  13: { bg:'#030014',s:'#08002a',b:'rgba(232,121,249,.12)',fg:'#e8e0ff',mu:'#7060aa',ac:'#e879f9',
    font:"'Inter',sans-serif",mono:"'JetBrains Mono',monospace",
    gf:'family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    tBg:'rgba(232,121,249,.08)',tFg:'#e879f9',tBd:'rgba(232,121,249,.2)',avBg:'#e879f9',avFg:'#000',
    extra:`.av{background:linear-gradient(135deg,#9333ea,#e879f9)!important}
.hn{text-shadow:0 0 24px rgba(232,121,249,.35)}.proj-card{box-shadow:0 0 20px rgba(232,121,249,.06)}` },
  14: { bg:'#faf8f2',s:'#fff',b:'#d0c8b0',fg:'#1a1408',mu:'#6a5a40',ac:'#1e40af',
    font:"Georgia,'Times New Roman',serif",mono:"'Courier New',monospace",gf:'',
    tBg:'rgba(30,64,175,.06)',tFg:'#1e40af',tBd:'rgba(30,64,175,.18)',avBg:'#1e40af',avFg:'#fff',
    extra:`.hn{font-size:28px}.proj-card{box-shadow:0 1px 3px rgba(0,0,0,.07);border-radius:4px}
.skill-tag,.soc a,.av{border-radius:4px}` },
  15: { bg:'#ffffff',s:'#f0f0f0',b:'#000000',fg:'#000000',mu:'#444',ac:'#dc2626',
    font:"'Arial Black','Impact',sans-serif",mono:"'Courier New',monospace",gf:'',
    tBg:'#000',tFg:'#fff',tBd:'#000',avBg:'#dc2626',avFg:'#fff',
    extra:`*{border-radius:0!important}.hn{font-size:32px;text-transform:uppercase;letter-spacing:-.02em}
.ht{color:var(--ac);font-family:'Courier New',monospace}.hero{border-bottom:4px solid #000;padding:40px 0 32px}
.sl{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:20px;font-family:'Courier New',monospace}
.proj-card{border:2px solid #000;background:#fff;box-shadow:4px 4px 0 #000}.soc a{border:2px solid #000;font-family:'Courier New',monospace}
.soc a:hover{background:#000;color:#fff}.skill-tag{border:2px solid #000;font-family:'Courier New',monospace}.av{border:3px solid #dc2626}` },
};

function factoryTemplate(d: any, cfg: ThemeCfg): string {
  const init = (d.name || "?")[0].toUpperCase();
  const soc = socialLinks(d, cfg.ac);
  const loc = d.location ? `<div style="font-family:${cfg.mono};font-size:12px;color:${cfg.mu};margin-top:4px">📍 ${d.location}</div>` : "";
  const gfLink = cfg.gf ? `<link href="https://fonts.googleapis.com/css2?${cfg.gf}&display=swap" rel="stylesheet">` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.name || "Portfolio"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
${gfLink}
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:${cfg.bg};--s:${cfg.s};--b:${cfg.b};--fg:${cfg.fg};--mu:${cfg.mu};--ac:${cfg.ac}}
body{background:var(--bg);color:var(--fg);font-family:${cfg.font};line-height:1.65}
a{color:var(--ac);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 24px}
.hero{padding:52px 0 44px;border-bottom:1px solid var(--b)}
.hero-inner{display:flex;gap:28px;align-items:flex-start}
.av{width:70px;height:70px;border-radius:50%;background:${cfg.avBg};color:${cfg.avFg};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;flex-shrink:0}
.hn{font-size:26px;font-weight:700;margin-bottom:4px}
.ht{font-family:${cfg.mono};font-size:13px;color:var(--ac);margin-bottom:6px}
.hb{font-size:14px;color:var(--mu);line-height:1.7;margin-top:10px}
.soc{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.soc a{font-size:12px;font-family:${cfg.mono};padding:4px 12px;border:1px solid var(--b);border-radius:6px;color:var(--fg);transition:.15s}
.soc a:hover{border-color:var(--ac);color:var(--ac);text-decoration:none}
.main{padding:44px 0}.section{margin-bottom:44px}
.sl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-family:${cfg.mono};color:var(--mu);margin-bottom:20px}
.exp-item{display:flex;gap:16px;margin-bottom:24px}
.exp-dot{width:8px;height:8px;border-radius:50%;background:var(--ac);margin-top:7px;flex-shrink:0}
.exp-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.exp-head strong{font-size:15px;font-weight:600}.period{font-size:12px;font-family:${cfg.mono};color:var(--mu)}
.company{font-size:12px;color:var(--ac);font-family:${cfg.mono};margin:2px 0 6px}.exp-body p{font-size:14px;color:var(--mu);line-height:1.65}
.proj-card{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:18px;margin-bottom:14px}
.proj-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.proj-head h3{font-size:15px;font-weight:600}.proj-links{display:flex;gap:10px}
.proj-links a{font-size:12px;font-family:${cfg.mono};color:var(--ac)}
.proj-card p{font-size:14px;color:var(--mu);line-height:1.65;margin-bottom:10px}
.tags,.skills-wrap{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.tag{font-size:11px;font-family:${cfg.mono};padding:2px 8px;background:${cfg.tBg};color:${cfg.tFg};border:1px solid ${cfg.tBd};border-radius:4px}
.skill-tag{font-size:12px;font-family:${cfg.mono};padding:5px 12px;background:var(--s);border:1px solid var(--b);border-radius:6px;color:var(--fg)}
.cert-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.cert-card{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:14px}
.cert-name{font-size:13px;font-weight:600;margin-bottom:4px}.cert-meta{font-size:11px;color:var(--mu);font-family:${cfg.mono};margin-bottom:6px}
.cert-link{font-size:11px;color:var(--ac);font-family:${cfg.mono}}
.lc-wrap{display:flex;flex-direction:column;gap:12px}.lc-username{font-size:12px;font-family:${cfg.mono};color:var(--ac)}
.lc-stats{display:flex;gap:10px;flex-wrap:wrap}
.lc-stat{display:flex;flex-direction:column;align-items:center;background:var(--s);border:1px solid var(--b);border-radius:8px;padding:10px 14px;min-width:65px}
.lc-val{font-size:20px;font-weight:700;font-family:${cfg.mono}}.lc-lbl{font-size:10px;color:var(--mu);margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
.lc-hard .lc-val{color:#ef4444}.lc-med .lc-val{color:#f59e0b}.lc-easy .lc-val{color:#22c55e}
.cf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
@media(max-width:500px){.cf-row{grid-template-columns:1fr}}
.cf-input{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:10px 12px;font-size:14px;color:var(--fg);font-family:inherit;width:100%;transition:border-color .15s}
.cf-input:focus{outline:none;border-color:var(--ac)}.cf-msg{resize:vertical;margin-bottom:10px;display:block}
.cf-btn{background:var(--ac);color:${cfg.avFg};border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer}.cf-btn:hover{opacity:.9}
.cf-status{font-size:13px;margin-top:10px}
${cfg.extra || ""}
</style>
</head>
<body>
<div class="wrap">
<div class="hero"><div class="hero-inner">
  <div class="av">${init}</div>
  <div>
    <div class="hn">${d.name || ""}</div>
    <div class="ht">${d.title || ""}</div>${loc}
    <p class="hb">${d.bio || ""}</p>
    <div class="soc">${soc}</div>
  </div>
</div></div>
<div class="main">
${d.experience?.length ? `<div class="section"><div class="sl">Work Experience.</div>${expHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><div class="sl">Projects.</div>${projHtml(d.projects, cfg.ac)}</div>` : ""}
${d.skills?.length ? `<div class="section"><div class="sl">Skills.</div><div class="skills-wrap">${skillsHtml(d.skills)}</div></div>` : ""}
${d.education?.length ? `<div class="section"><div class="sl">Education.</div>${educationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><div class="sl">Certifications.</div>${certificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><div class="sl">LeetCode.</div>${leetcodeHtml(d.leetcode)}</div>` : ""}
<div class="section"><div class="sl">Contact.</div>${contactFormSection(d.username)}</div>
${createBanner(d.username)}
</div></div>
</body></html>`;
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
function socialLinks(d: any, _accent: string): string {
  const items: string[] = [];
  if (Array.isArray(d.links)) {
    d.links.forEach((l: any) => {
      if (!l.url) return;
      const href = l.platform === 'Email' ? `mailto:${l.url.replace(/^mailto:/,'')}` : l.url;
      items.push(`<a href="${href}" target="_blank" rel="noopener">${l.platform}</a>`);
    });
    if (d.email && !d.links.find((l: any) => l.platform === 'Email')) items.push(`<a href="mailto:${d.email}">Email</a>`);
  } else if (d.links) {
    if (d.links.github) items.push(`<a href="${d.links.github}" target="_blank">GitHub</a>`);
    if (d.links.linkedin) items.push(`<a href="${d.links.linkedin}" target="_blank">LinkedIn</a>`);
    if (d.links.website) items.push(`<a href="${d.links.website}" target="_blank">Website</a>`);
    if (d.links.twitter) items.push(`<a href="${d.links.twitter}" target="_blank">Twitter</a>`);
    if (d.email) items.push(`<a href="mailto:${d.email}">Email</a>`);
  } else if (d.email) { items.push(`<a href="mailto:${d.email}">Email</a>`); }
  return items.join('');
}
function educationHtml(edu: any[]): string {
  if (!edu?.length) return '';
  return edu.map(e => `<div class="exp-item"><div class="exp-dot"></div><div class="exp-body">
    <div class="exp-head"><strong>${e.degree || ''}${e.field ? ` in ${e.field}` : ''}</strong><span class="period">${e.period || ''}</span></div>
    <div class="company">${e.institution || ''}${e.cgpa ? ` · ${e.cgpa}` : ''}</div>
    ${e.description ? `<p>${e.description}</p>` : ''}</div></div>`).join('');
}
function certificationsHtml(certs: any[]): string {
  if (!certs?.length) return '';
  return `<div class="cert-grid">${certs.map(c => `<div class="cert-card"><div class="cert-name">${c.name || ''}</div><div class="cert-meta">${c.issuer || ''}${c.date ? ` · ${c.date}` : ''}</div>${c.url ? `<a href="${c.url}" target="_blank" class="cert-link">View ↗</a>` : ''}</div>`).join('')}</div>`;
}
function leetcodeHtml(lc: any): string {
  if (!lc || (!lc.username && !lc.solved)) return '';
  return `<div class="lc-wrap">${lc.username ? `<div class="lc-username">@${lc.username}</div>` : ''}<div class="lc-stats">${lc.solved ? `<div class="lc-stat"><span class="lc-val">${lc.solved}</span><span class="lc-lbl">Total</span></div>` : ''}${lc.hard ? `<div class="lc-stat lc-hard"><span class="lc-val">${lc.hard}</span><span class="lc-lbl">Hard</span></div>` : ''}${lc.medium ? `<div class="lc-stat lc-med"><span class="lc-val">${lc.medium}</span><span class="lc-lbl">Medium</span></div>` : ''}${lc.easy ? `<div class="lc-stat lc-easy"><span class="lc-val">${lc.easy}</span><span class="lc-lbl">Easy</span></div>` : ''}${lc.rating ? `<div class="lc-stat"><span class="lc-val">${lc.rating}</span><span class="lc-lbl">Rating</span></div>` : ''}</div></div>`;
}
function contactFormSection(username: string): string {
  return `<div id="cf-wrap"><form id="cf" onsubmit="cfSubmit(event)"><div class="cf-row"><input type="text" name="cfn" placeholder="Your name" required class="cf-input" /><input type="email" name="cfe" placeholder="Your email" required class="cf-input" /></div><textarea name="cfm" rows="4" placeholder="Your message..." required class="cf-input cf-msg"></textarea><button type="submit" class="cf-btn">Send Message →</button></form><div id="cf-status" class="cf-status"></div></div>
<script>async function cfSubmit(e){e.preventDefault();const f=e.target;const btn=f.querySelector('.cf-btn');btn.disabled=true;btn.textContent='Sending…';const s=document.getElementById('cf-status');try{const r=await fetch('/p/${username}/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.cfn.value,email:f.cfe.value,message:f.cfm.value})});if(r.ok){s.textContent='✓ Message sent!';s.style.color='#4ade80';f.reset();}else{s.textContent='✗ Failed to send.';s.style.color='#ef4444';}}catch{s.textContent='✗ Network error.';}finally{btn.disabled=false;btn.textContent='Send Message →';}}</script>`;
}
function createBanner(username: string): string {
  return `<div style="text-align:center;padding:24px;border-top:1px solid rgba(128,128,128,0.12);margin-top:48px"><a href="/" style="font-size:12px;opacity:0.35;text-decoration:none;font-family:monospace">✦ built with parshant.portfolio — create yours</a></div>`;
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
${d.education?.length ? `<div class="section"><div class="section-label">Education.</div>${educationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><div class="section-label">Certifications.</div>${certificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><div class="section-label">LeetCode.</div>${leetcodeHtml(d.leetcode)}</div>` : ""}
<div class="section"><div class="section-label">Contact.</div>${contactFormSection(d.username)}</div>
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
${d.education?.length ? `<div class="section"><h2>Education</h2>${educationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><h2>Certifications</h2>${certificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><h2>LeetCode</h2>${leetcodeHtml(d.leetcode)}</div>` : ""}
<div class="section"><h2>Contact</h2>${contactFormSection(d.username)}</div>
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
${d.education?.length ? `<div class="section"><div class="section-label">Education</div>${educationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><div class="section-label">Certifications</div>${certificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><div class="section-label">LeetCode</div>${leetcodeHtml(d.leetcode)}</div>` : ""}
<div class="section"><div class="section-label">Contact</div>${contactFormSection(d.username)}</div>
${createBanner(d.username)}
</div>
</body></html>`;
}

export default router;
