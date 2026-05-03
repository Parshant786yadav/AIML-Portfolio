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

/* ── Shared helpers (Parshant design) ── */

function esc(s: any): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function letterColor(str: string): { bg: string; color: string; border: string } {
  let hash = 0;
  const s = str || 'A';
  for (let i = 0; i < s.length; i++) hash = (s.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  const hues = [142, 220, 40, 280, 0, 180, 60, 320];
  const hue = hues[Math.abs(hash) % hues.length];
  return { bg: `hsl(${hue} 71% 45% / 0.07)`, color: `hsl(${hue} 71% 45%)`, border: `hsl(${hue} 71% 45% / 0.15)` };
}

function socialLinks(d: any, _accent?: string): string {
  const svgGh = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`;
  const svgLi = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`;
  const svgEm = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const svgEx = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  const svgWa = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>`;
  const icons: Record<string,string> = { GitHub: svgGh, LinkedIn: svgLi, Email: svgEm, WhatsApp: svgWa };
  const items: string[] = [];
  if (Array.isArray(d.links)) {
    d.links.forEach((l: any) => {
      if (!l.url) return;
      const href = l.platform === 'Email' ? `mailto:${l.url.replace(/^mailto:/,'')}` : l.url;
      const ico = icons[l.platform] || svgEx;
      items.push(`<a href="${href}" target="_blank" rel="noopener" class="social-btn">${ico}${esc(l.platform)}</a>`);
    });
    if (d.email && !d.links.find((l: any) => l.platform === 'Email'))
      items.push(`<a href="mailto:${esc(d.email)}" class="social-btn">${svgEm}Email</a>`);
  } else if (d.links) {
    if (d.links.github) items.push(`<a href="${esc(d.links.github)}" target="_blank" class="social-btn">${svgGh}GitHub</a>`);
    if (d.links.linkedin) items.push(`<a href="${esc(d.links.linkedin)}" target="_blank" class="social-btn">${svgLi}LinkedIn</a>`);
    if (d.links.website) items.push(`<a href="${esc(d.links.website)}" target="_blank" class="social-btn">${svgEx}Website</a>`);
    if (d.links.twitter) items.push(`<a href="${esc(d.links.twitter)}" target="_blank" class="social-btn">${svgEx}Twitter</a>`);
    if (d.email) items.push(`<a href="mailto:${esc(d.email)}" class="social-btn">${svgEm}Email</a>`);
  } else if (d.email) {
    items.push(`<a href="mailto:${esc(d.email)}" class="social-btn">${svgEm}Email</a>`);
  }
  return items.join('');
}

function pexpHtml(exp: any[]): string {
  if (!exp?.length) return '';
  return `<div class="exp-list">${exp.map(e => {
    const lc = letterColor(e.company || e.role || 'X');
    const letter = (e.company || e.role || 'X')[0].toUpperCase();
    const tags = (e.skills || e.tags || []).map((s: string) => `<span class="tag">${esc(s)}</span>`).join('');
    return `<div class="exp-item">
      <div class="exp-letter" style="background:${lc.bg};color:${lc.color};border:1px solid ${lc.border}">${letter}</div>
      <div class="exp-body">
        <div class="exp-header">
          <div>
            <h3 class="exp-role">${esc(e.role || '')}</h3>
            <span class="exp-company">@ ${esc(e.company || '')}</span>
          </div>
          <div class="exp-right">
            <span class="exp-period mono">${esc(e.period || '')}</span>
            ${e.location ? `<span class="exp-loc">${esc(e.location)}</span>` : ''}
          </div>
        </div>
        <p class="exp-desc">${esc(e.description || '')}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function pprojHtml(projects: any[]): string {
  if (!projects?.length) return '';
  const svgGh = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`;
  const svgEx = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  return `<div class="projects-list">${projects.map(p => {
    const tags = (p.tags || []).map((s: string) => `<span class="tag">${esc(s)}</span>`).join('');
    return `<div class="project-card">
      <div class="project-header">
        <div>
          <div class="project-title-row">
            <h3 class="project-name">${esc(p.name || '')}</h3>
          </div>
        </div>
        <div class="project-links">
          ${p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener" class="icon-link">${svgGh}</a>` : ''}
          ${p.liveUrl ? `<a href="${esc(p.liveUrl)}" target="_blank" rel="noopener" class="icon-link">${svgEx}</a>` : ''}
        </div>
      </div>
      <p class="project-desc">${esc(p.description || '')}</p>
      ${tags ? `<div class="project-footer"><div class="tags">${tags}</div></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function pskillsHtml(skills: string[]): string {
  if (!skills?.length) return '';
  return `<div class="tags">${skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>`;
}

function peducationHtml(edu: any[]): string {
  if (!edu?.length) return '';
  return `<div class="edu-list">${edu.map(e => `<div class="edu-item">
    <div class="edu-left">
      <h3 class="edu-degree">${esc(e.degree || '')}${e.field ? ` in ${esc(e.field)}` : ''}</h3>
      <p class="edu-school">${esc(e.institution || '')}</p>
    </div>
    <div class="edu-right">
      ${e.cgpa ? `<span class="edu-score mono primary-text">${esc(e.cgpa)}</span>` : ''}
      <span class="edu-period mono">${esc(e.period || '')}</span>
    </div>
  </div>`).join('')}</div>`;
}

function pcertificationsHtml(certs: any[]): string {
  if (!certs?.length) return '';
  const svgArr = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  return `<div class="cert-grid">${certs.map(c => {
    const inner = `<div class="cert-top"><div><div class="cert-title">${esc(c.name || '')}</div><div class="cert-issuer">${esc(c.issuer || '')}${c.date ? ` · ${esc(c.date)}` : ''}</div></div><span class="cert-arrow">${svgArr}</span></div>`;
    return c.url
      ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="cert-card">${inner}</a>`
      : `<div class="cert-card">${inner}</div>`;
  }).join('')}</div>`;
}

function pleetcodeHtml(lc: any, username: string): string {
  if (!lc || (!lc.username && !lc.solved)) return '';
  const svgEx = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  const total = lc.solved || 0;
  const easy  = lc.easy   || 0;
  const med   = lc.medium || 0;
  const hard  = lc.hard   || 0;
  const maxVal = total || (easy + med + hard) || 1;
  const ePct = Math.round((easy / maxVal) * 100);
  const mPct = Math.round((med  / maxVal) * 100);
  const hPct = Math.round((hard / maxVal) * 100);
  const lcUrl = lc.username ? `https://leetcode.com/${encodeURIComponent(lc.username)}` : '#';
  return `<div class="lc-card">
    <div class="lc-header">
      <div>
        <div class="lc-username mono">${esc(lc.username || username)}</div>
        <p class="lc-sub">Consistent problem solver — algorithms &amp; data structures</p>
      </div>
      ${lc.username ? `<a href="${lcUrl}" target="_blank" rel="noopener" class="lc-profile mono">Profile ${svgEx}</a>` : ''}
    </div>
    <div class="lc-stats">
      ${total ? `<div class="lc-stat"><span class="lc-val mono" style="color:hsl(142 71% 45%)">${total}${total >= 100 ? '+' : ''}</span><span class="lc-label">Total Solved</span></div>` : ''}
      ${easy  ? `<div class="lc-stat"><span class="lc-val mono" style="color:hsl(142 71% 55%)">${easy}${easy >= 10 ? '+' : ''}</span><span class="lc-label">Easy</span></div>` : ''}
      ${med   ? `<div class="lc-stat"><span class="lc-val mono" style="color:hsl(38 90% 55%)">${med}${med >= 10 ? '+' : ''}</span><span class="lc-label">Medium</span></div>` : ''}
      ${hard  ? `<div class="lc-stat"><span class="lc-val mono" style="color:hsl(0 75% 55%)">${hard}${hard >= 10 ? '+' : ''}</span><span class="lc-label">Hard</span></div>` : ''}
    </div>
    ${(easy || med || hard) ? `<div class="lc-bars">
      ${easy ? `<div class="lc-bar-row"><span class="lc-bar-label mono">Easy</span><div class="lc-bar-track"><div class="lc-bar-fill" data-pct="${ePct}" style="background:hsl(142 71% 55%);width:${ePct}%"></div></div></div>` : ''}
      ${med  ? `<div class="lc-bar-row"><span class="lc-bar-label mono">Medium</span><div class="lc-bar-track"><div class="lc-bar-fill" data-pct="${mPct}" style="background:hsl(38 90% 55%);width:${mPct}%"></div></div></div>` : ''}
      ${hard ? `<div class="lc-bar-row"><span class="lc-bar-label mono">Hard</span><div class="lc-bar-track"><div class="lc-bar-fill" data-pct="${hPct}" style="background:hsl(0 75% 55%);width:${hPct}%"></div></div></div>` : ''}
    </div>` : ''}
  </div>`;
}

function pcontactForm(d: any): string {
  const svgSend = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  const svgMail = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const emailHint = d.email ? `<span class="form-email-hint mono">${svgMail} ${esc(d.email)}</span>` : '';
  return `<p class="contact-intro">Have a project, opportunity, or just want to connect?${d.email ? ` <a href="mailto:${esc(d.email)}" class="primary-link mono">${esc(d.email)}</a>` : ''}</p>
<form id="contact-form" class="contact-form" onsubmit="pfSubmit(event)">
  <div class="form-row">
    <div class="form-group"><label class="form-label mono">name</label><input type="text" name="pfn" required placeholder="Your name" class="form-input mono" /></div>
    <div class="form-group"><label class="form-label mono">email</label><input type="email" name="pfe" required placeholder="your@email.com" class="form-input mono" /></div>
  </div>
  <div class="form-group"><label class="form-label mono">message</label><textarea name="pfm" required rows="4" placeholder="What's on your mind..." class="form-input form-textarea mono"></textarea></div>
  <div class="form-actions">
    ${emailHint}
    <button type="submit" class="submit-btn mono" id="pf-submit-btn">${svgSend}<span id="pf-submit-text">send message</span></button>
  </div>
</form>
<div id="pf-toast" class="toast"></div>
<script>
async function pfSubmit(e){
  e.preventDefault();
  const f=e.target;const btn=document.getElementById('pf-submit-btn');const txt=document.getElementById('pf-submit-text');
  btn.disabled=true;txt.textContent='sending…';
  try{
    const r=await fetch(window.location.pathname.split('/').slice(0,3).join('/')+'/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.pfn.value,email:f.pfe.value,message:f.pfm.value})});
    const t=document.getElementById('pf-toast');
    if(r.ok){t.textContent='✓ Message sent!';f.reset();}else{t.textContent='✗ Failed to send.';}
    t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);
  }catch{const t=document.getElementById('pf-toast');t.textContent='✗ Network error.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}
  finally{btn.disabled=false;txt.textContent='send message';}
}
</script>`;
}

function createBanner(_username: string): string {
  return `<div style="text-align:center;padding:24px 20px;border-top:1px solid var(--border)"><a href="/" style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted-fg);opacity:0.4;text-decoration:none">✦ built with parshant.portfolio — create yours</a></div>`;
}

/* ── Parshant CSS (inlined for generated portfolios) ── */
function parshantCSS(accentOverride?: { primary: string; primaryRing: string; primaryBorder: string; submitBg: string; dotDark?: string }): string {
  const p = accentOverride;
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:hsl(0 0% 98%);--fg:hsl(0 0% 8%);--fg-80:hsl(0 0% 8% / 0.8);
  --muted-fg:hsl(0 0% 44%);--muted-fg-60:hsl(0 0% 44% / 0.6);--muted-fg-40:hsl(0 0% 44% / 0.4);
  --border:hsl(0 0% 88%);--border-40:hsl(0 0% 88% / 0.4);
  --card:hsl(0 0% 100%);--card-50:hsl(0 0% 100% / 0.5);
  --muted:hsl(0 0% 94%);--input:hsl(0 0% 92%);
  --primary:${p?.primary || 'hsl(142 60% 35%)'};
  --primary-ring:${p?.primaryRing || 'hsl(142 60% 35% / 0.2)'};
  --primary-border:${p?.primaryBorder || 'hsl(142 60% 35% / 0.5)'};
  --dot:hsl(0 0% 88%);--nav-blur:hsl(0 0% 98% / 0.9);
  --tag-bg:hsl(0 0% 94%);--tag-fg:hsl(0 0% 44%);--tag-border:hsl(0 0% 88%);
  --tag-green-bg:${p?.primary ? p.primary.replace(')','/0.1)').replace('hsl(','hsl(') : 'hsl(142 60% 35% / 0.1)'};
  --tag-green-fg:${p?.primary || 'hsl(142 60% 35%)'};
  --tag-green-border:${p?.primaryBorder || 'hsl(142 60% 35% / 0.25)'};
  --submit-bg:${p?.submitBg || 'hsl(142 71% 45%)'};--submit-fg:hsl(0 0% 4%);
}
html.dark{
  --bg:hsl(0 0% 4%);--fg:hsl(0 0% 92%);--fg-80:hsl(0 0% 92% / 0.8);
  --muted-fg:hsl(0 0% 45%);--muted-fg-60:hsl(0 0% 45% / 0.6);--muted-fg-40:hsl(0 0% 45% / 0.4);
  --border:hsl(0 0% 12%);--border-40:hsl(0 0% 12% / 0.4);
  --card:hsl(0 0% 6%);--card-50:hsl(0 0% 6% / 0.5);
  --muted:hsl(0 0% 10%);--input:hsl(0 0% 12%);
  --primary:${p?.primary || 'hsl(142 71% 45%)'};
  --primary-ring:${p?.primaryRing || 'hsl(142 71% 45% / 0.2)'};
  --primary-border:${p?.primaryBorder || 'hsl(142 71% 45% / 0.5)'};
  --dot:${p?.dotDark || 'hsl(0 0% 12%)'};--nav-blur:hsl(0 0% 4% / 0.9);
  --tag-bg:hsl(0 0% 10%);--tag-fg:hsl(0 0% 45%);--tag-border:hsl(0 0% 12%);
  --tag-green-bg:${p?.primary ? p.primary.replace(')','/0.1)').replace('hsl(','hsl(') : 'hsl(142 71% 45% / 0.1)'};
  --tag-green-fg:${p?.primary || 'hsl(142 71% 55%)'};
  --tag-green-border:${p?.primaryBorder || 'hsl(142 71% 45% / 0.25)'};
  --submit-bg:${p?.submitBg || 'hsl(142 71% 45%)'};--submit-fg:hsl(0 0% 4%);
}
body{font-family:'Inter',sans-serif;background-color:var(--bg);color:var(--fg);
  background-image:radial-gradient(circle,var(--dot) 1px,transparent 1px);background-size:24px 24px;
  line-height:1.6;font-size:15px;-webkit-font-smoothing:antialiased;transition:background-color .2s,color .2s}
.mono{font-family:'JetBrains Mono',monospace}
.primary-text{color:var(--primary)}
.muted-text{color:var(--muted-fg)}
#scroll-progress{position:fixed;top:0;left:0;right:0;height:1px;background:var(--primary);
  transform-origin:left center;transform:scaleX(0);z-index:9999;transition:transform .05s linear}
#navbar{position:sticky;top:0;z-index:50;transition:background .2s,border-color .2s}
#navbar.scrolled{background:var(--nav-blur);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:672px;margin:0 auto;padding:0 20px;height:48px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:var(--fg);background:none;border:none;cursor:pointer;transition:color .15s;text-decoration:none}
.nav-logo:hover{color:var(--primary)}
.nav-desktop{display:flex;align-items:center;gap:24px}
.nav-links{display:flex;align-items:center;gap:24px}
.nav-link{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted-fg);background:none;border:none;cursor:pointer;transition:color .15s;text-decoration:none}
.nav-link:hover{color:var(--fg)}
.theme-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;color:var(--muted-fg);transition:color .15s,background .15s;flex-shrink:0}
.theme-btn:hover{color:var(--fg);background:var(--muted)}
.nav-mobile-actions{display:none;align-items:center;gap:8px}
.mobile-menu-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--muted-fg);transition:color .15s}
.mobile-nav{display:none;border-bottom:1px solid var(--border);background:var(--bg)}
.mobile-nav.open{display:block}
.mobile-nav-inner{max-width:672px;margin:0 auto;padding:12px 20px;display:flex;flex-direction:column;gap:12px}
.main-wrap{max-width:672px;margin:0 auto;padding:0 20px 80px}
.section{padding:32px 0;border-top:1px solid var(--border)}
.section-title{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;font-weight:400}
.profile-section{padding-top:40px;padding-bottom:32px}
.profile-top{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px}
.avatar-wrap{position:relative;flex-shrink:0}
.avatar{width:64px;height:64px;border-radius:50%;overflow:hidden;border:1px solid var(--border);background:var(--primary);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:hsl(0 0% 4%)}
.online-dot{position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:hsl(142 71% 45%);border:2px solid var(--bg)}
.profile-info{flex:1;min-width:0}
.profile-name{font-size:18px;font-weight:600;color:var(--fg);line-height:1.3}
.profile-title{font-size:14px;color:var(--muted-fg);margin-top:2px}
.profile-meta{display:flex;align-items:center;gap:12px;margin-top:6px;flex-wrap:wrap}
.meta-pin{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--muted-fg)}
.bio{font-size:14px;color:var(--fg-80);line-height:1.7;margin-bottom:24px}
.social-links{display:flex;flex-wrap:wrap;gap:8px}
.social-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;border:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted-fg);text-decoration:none;transition:color .15s,border-color .15s}
.social-btn:hover{color:var(--fg)}
.exp-list{display:flex;flex-direction:column;gap:4px}
.exp-item{display:flex;gap:12px;padding:16px;border-radius:8px;border:1px solid transparent;transition:border-color .2s,background .2s}
.exp-item:hover{border-color:var(--border);background:var(--card)}
.exp-letter{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;flex-shrink:0;margin-top:2px}
.exp-body{flex:1;min-width:0}
.exp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.exp-role{font-size:14px;font-weight:500;color:var(--fg)}
.exp-company{font-size:12px;color:var(--muted-fg);display:inline-flex;align-items:center;gap:2px;margin-top:2px;transition:color .15s;text-decoration:none}
.exp-company:hover{color:var(--primary)}
.exp-right{text-align:right;flex-shrink:0}
.exp-period{display:block;font-size:12px;color:var(--muted-fg)}
.exp-loc{display:block;font-size:12px;color:var(--muted-fg-60);margin-top:2px}
.exp-desc{font-size:12px;color:var(--muted-fg);line-height:1.65;margin-bottom:12px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;font-weight:500;background:var(--tag-bg);color:var(--tag-fg);border:1px solid var(--tag-border)}
.projects-list{display:flex;flex-direction:column;gap:16px}
.project-card{border:1px solid var(--border);border-radius:8px;padding:20px;transition:background .2s}
.project-card:hover{background:var(--card)}
.project-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
.project-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.project-name{font-size:14px;font-weight:600;color:var(--fg)}
.project-links{display:flex;align-items:center;gap:8px;flex-shrink:0}
.icon-link{color:var(--muted-fg);text-decoration:none;display:inline-flex;align-items:center;transition:color .15s}
.icon-link:hover{color:var(--fg)}
.project-desc{font-size:12px;color:var(--muted-fg);line-height:1.65;margin-bottom:16px}
.project-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.edu-list{display:flex;flex-direction:column;gap:4px}
.edu-item{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 8px;border-radius:8px;border-bottom:1px solid var(--border-40);margin:0 -8px;transition:background .15s}
.edu-item:last-child{border-bottom:none}
.edu-item:hover{background:var(--card-50)}
.edu-degree{font-size:14px;font-weight:500;color:var(--fg);line-height:1.4}
.edu-school{font-size:12px;color:var(--muted-fg);margin-top:2px}
.edu-right{text-align:right;flex-shrink:0}
.edu-score{display:block;font-size:12px;font-weight:500}
.edu-period{display:block;font-size:12px;color:var(--muted-fg-60);margin-top:2px}
.cert-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cert-card{display:flex;flex-direction:column;padding:12px;border-radius:8px;border:1px solid var(--border);text-decoration:none;transition:background .15s,border-color .15s}
.cert-card:hover{background:var(--card)}
.cert-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.cert-title{font-size:12px;font-weight:500;color:var(--fg);line-height:1.4}
.cert-issuer{font-size:12px;color:var(--muted-fg);margin-top:2px}
.cert-arrow{color:var(--muted-fg-40);flex-shrink:0;margin-top:2px;transition:color .15s}
.cert-card:hover .cert-arrow{color:var(--primary)}
.lc-card{border:1px solid var(--border);border-radius:8px;padding:16px}
.lc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.lc-username{font-size:14px;font-weight:500;color:var(--fg)}
.lc-sub{font-size:12px;color:var(--muted-fg);margin-top:2px}
.lc-profile{font-size:12px;color:var(--muted-fg);text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:color .15s;flex-shrink:0}
.lc-profile:hover{color:var(--primary)}
.lc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;text-align:center}
.lc-val{display:block;font-size:18px;font-weight:700}
.lc-label{display:block;font-size:12px;color:var(--muted-fg);margin-top:2px}
.lc-bars{display:flex;flex-direction:column;gap:8px}
.lc-bar-row{display:flex;align-items:center;gap:12px}
.lc-bar-label{font-size:12px;color:var(--muted-fg);width:48px;text-align:right;flex-shrink:0}
.lc-bar-track{flex:1;height:4px;border-radius:999px;background:var(--muted);overflow:hidden}
.lc-bar-fill{height:100%;border-radius:999px;transition:width .8s ease}
.contact-intro{font-size:12px;color:var(--muted-fg);line-height:1.65;margin-bottom:24px}
.primary-link{color:var(--primary);text-decoration:none}
.primary-link:hover{text-decoration:underline}
.contact-form{display:flex;flex-direction:column;gap:12px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-group{display:flex;flex-direction:column;gap:4px}
.form-label{font-size:12px;color:var(--muted-fg);opacity:.7}
.form-input{width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--fg);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;transition:border-color .15s,box-shadow .15s}
.form-input:focus{border-color:var(--primary-border);box-shadow:0 0 0 3px var(--primary-ring)}
.form-input::placeholder{color:var(--muted-fg);opacity:.4}
.form-textarea{resize:none}
.form-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.form-email-hint{font-size:12px;color:var(--muted-fg-40);display:inline-flex;align-items:center;gap:4px}
.submit-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;border:none;background:var(--submit-bg);color:var(--submit-fg);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s,transform .1s}
.submit-btn:hover{opacity:.88}
.submit-btn:disabled{opacity:.6;cursor:not-allowed}
.toast{position:fixed;bottom:24px;right:24px;background:var(--fg);color:var(--bg);padding:12px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.15);transform:translateY(80px);opacity:0;transition:transform .3s ease,opacity .3s ease;z-index:9999;max-width:320px;pointer-events:none}
.toast.show{transform:translateY(0);opacity:1}
.footer{max-width:672px;margin:0 auto;padding:24px 20px;border-top:1px solid var(--border)}
.footer p{font-size:12px}
.fade-in{opacity:0;transform:translateY(12px);transition:opacity .4s ease,transform .4s ease}
.fade-in.visible{opacity:1;transform:translateY(0)}
@media(max-width:600px){
  .nav-desktop{display:none}.nav-mobile-actions{display:flex}
  .form-row{grid-template-columns:1fr}.cert-grid{grid-template-columns:1fr}
  .lc-stats{grid-template-columns:repeat(2,1fr)}
  .exp-header{flex-direction:column;gap:4px}.exp-right{text-align:left}
}`;
}

/* ── Parshant HTML builder ── */
function parshantHtml(d: any, opts?: { darkOnly?: boolean; accentPrimary?: string; accentSubmit?: string }): string {
  const name = d.name || 'Portfolio';
  const username = d.username || 'user';
  const firstLetter = (name[0] || '?').toUpperCase();
  const accentPrimary = opts?.accentPrimary || 'hsl(142 71% 45%)';
  const accentSubmit  = opts?.accentSubmit  || 'hsl(142 71% 45%)';
  const darkOnly = opts?.darkOnly || false;
  const hasSections = {
    exp:   !!(d.experience?.length),
    proj:  !!(d.projects?.length),
    skills:!!(d.skills?.length),
    edu:   !!(d.education?.length),
    certs: !!(d.certifications?.length),
    lc:    !!(d.leetcode?.solved || d.leetcode?.username),
  };

  const sunIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  const moonIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  const menuIcon = `<svg id="icon-menu" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
  const pinIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

  const navLinks = [
    hasSections.exp   ? `<a href="#experience" class="nav-link">experience</a>` : '',
    hasSections.proj  ? `<a href="#projects"   class="nav-link">projects</a>`   : '',
    hasSections.skills? `<a href="#skills"     class="nav-link">skills</a>`     : '',
                        `<a href="#contact"    class="nav-link">contact</a>`,
  ].filter(Boolean).join('');

  const themeScript = darkOnly ? `<script>document.documentElement.classList.add('dark');</script>` : `<script>
(function(){
  var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.classList.toggle('dark',t==='dark');
})();
</script>`;

  const themeToggleDesktop = darkOnly ? '' : `<button class="theme-btn" id="theme-toggle" aria-label="Toggle theme"><span id="theme-icon-d"></span></button>`;
  const themeToggleMobile  = darkOnly ? '' : `<button class="theme-btn" id="theme-toggle-m" aria-label="Toggle theme"><span id="theme-icon-m"></span></button>`;

  const accentOverride = opts?.accentPrimary ? {
    primary: accentPrimary,
    primaryRing: accentPrimary.replace('hsl(','hsl(').replace(')','/0.2)'),
    primaryBorder: accentPrimary.replace(')','/0.5)'),
    submitBg: accentSubmit,
    dotDark: 'hsl(0 0% 12%)',
  } : undefined;

  return `<!DOCTYPE html>
<html lang="en"${darkOnly ? ' class="dark"' : ''}>
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} — Portfolio</title>
<meta name="description" content="${esc(d.title || '')} — Portfolio" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
${themeScript}
<style>${parshantCSS(accentOverride)}</style>
</head>
<body>
<div id="scroll-progress" aria-hidden="true"></div>
<header id="navbar">
  <div class="nav-inner">
    <a href="#" class="nav-logo">${esc(username.toLowerCase())}<span class="primary-text">.</span></a>
    <div class="nav-desktop">
      <nav class="nav-links">${navLinks}</nav>
      ${themeToggleDesktop}
    </div>
    <div class="nav-mobile-actions">
      ${themeToggleMobile}
      <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">${menuIcon}</button>
    </div>
  </div>
  <div class="mobile-nav" id="mobile-nav">
    <div class="mobile-nav-inner">${navLinks}</div>
  </div>
</header>

<main class="main-wrap">

  <section class="profile-section">
    <div class="profile-top">
      <div class="avatar-wrap">
        <div class="avatar">${firstLetter}</div>
        <span class="online-dot" title="Open to opportunities"></span>
      </div>
      <div class="profile-info">
        <h1 class="profile-name">${esc(name)}</h1>
        <p class="profile-title">${esc(d.title || '')}</p>
        ${d.location ? `<div class="profile-meta"><span class="meta-pin">${pinIcon} ${esc(d.location)}</span></div>` : ''}
      </div>
    </div>
    ${d.bio ? `<div class="bio"><p>${esc(d.bio)}</p></div>` : ''}
    <div class="social-links">${socialLinks(d)}</div>
  </section>

  ${hasSections.exp ? `<section id="experience" class="section fade-in">
    <h2 class="section-title">work experience.</h2>
    ${pexpHtml(d.experience)}
  </section>` : ''}

  ${hasSections.proj ? `<section id="projects" class="section fade-in">
    <h2 class="section-title">projects.</h2>
    ${pprojHtml(d.projects)}
  </section>` : ''}

  ${hasSections.skills ? `<section id="skills" class="section fade-in">
    <h2 class="section-title">skills.</h2>
    ${pskillsHtml(d.skills)}
  </section>` : ''}

  ${hasSections.edu ? `<section id="education" class="section fade-in">
    <h2 class="section-title">education.</h2>
    ${peducationHtml(d.education)}
  </section>` : ''}

  ${hasSections.certs ? `<section id="certifications" class="section fade-in">
    <h2 class="section-title">certifications.</h2>
    ${pcertificationsHtml(d.certifications)}
  </section>` : ''}

  ${hasSections.lc ? `<section id="leetcode" class="section fade-in">
    <h2 class="section-title">dsa / leetcode.</h2>
    ${pleetcodeHtml(d.leetcode, username)}
  </section>` : ''}

  <section id="contact" class="section fade-in">
    <h2 class="section-title">contact.</h2>
    ${pcontactForm(d)}
  </section>

</main>

<footer class="footer">
  ${createBanner(username)}
</footer>

<script>
// Scroll progress
var prog=document.getElementById('scroll-progress');
window.addEventListener('scroll',function(){
  var s=document.documentElement.scrollTop,h=document.documentElement.scrollHeight-document.documentElement.clientHeight;
  prog.style.transform='scaleX('+(h>0?s/h:0)+')';
},{passive:true});

// Navbar scroll
var nb=document.getElementById('navbar');
window.addEventListener('scroll',function(){nb.classList.toggle('scrolled',window.scrollY>10);},{passive:true});

// Fade-in on scroll
(function(){
  var els=document.querySelectorAll('.fade-in');
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.1});
  els.forEach(function(el){io.observe(el);});
})();

// Mobile menu
var mbtn=document.getElementById('mobile-menu-btn');var mnav=document.getElementById('mobile-nav');
if(mbtn&&mnav){mbtn.addEventListener('click',function(){mnav.classList.toggle('open');});}

${darkOnly ? '' : `// Theme toggle
function setTheme(dark){
  document.documentElement.classList.toggle('dark',dark);
  localStorage.setItem('theme',dark?'dark':'light');
  var si=document.getElementById('theme-icon-d');var sm=document.getElementById('theme-icon-m');
  var sun='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var moon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  if(si)si.innerHTML=dark?sun:moon;if(sm)sm.innerHTML=dark?sun:moon;
}
setTheme(document.documentElement.classList.contains('dark'));
var tt=document.getElementById('theme-toggle');var ttm=document.getElementById('theme-toggle-m');
if(tt)tt.addEventListener('click',function(){setTheme(!document.documentElement.classList.contains('dark'));});
if(ttm)ttm.addEventListener('click',function(){setTheme(!document.documentElement.classList.contains('dark'));});
`}
</script>
</body></html>`;
}

/* ── Template 1: Parshant's exact design (light/dark, green accent) ── */
function template1(d: any): string {
  return parshantHtml(d, { darkOnly: false });
}

interface ThemeCfg {
  accentPrimary: string; accentSubmit: string;
}
const THEME_CFGS: Record<number, ThemeCfg> = {
  4:  { accentPrimary: 'hsl(199 89% 48%)', accentSubmit: 'hsl(199 89% 48%)' },
  5:  { accentPrimary: 'hsl(38 90% 55%)',  accentSubmit: 'hsl(38 90% 55%)' },
  6:  { accentPrimary: 'hsl(142 71% 45%)', accentSubmit: 'hsl(142 71% 45%)' },
  7:  { accentPrimary: 'hsl(0 0% 20%)',    accentSubmit: 'hsl(0 0% 20%)' },
  8:  { accentPrimary: 'hsl(271 81% 56%)', accentSubmit: 'hsl(271 81% 56%)' },
  9:  { accentPrimary: 'hsl(17 80% 45%)',  accentSubmit: 'hsl(17 80% 45%)' },
  10: { accentPrimary: 'hsl(234 89% 74%)', accentSubmit: 'hsl(234 89% 74%)' },
  11: { accentPrimary: 'hsl(142 71% 45%)', accentSubmit: 'hsl(142 71% 45%)' },
  12: { accentPrimary: 'hsl(0 72% 51%)',   accentSubmit: 'hsl(0 72% 51%)' },
  13: { accentPrimary: 'hsl(293 79% 71%)', accentSubmit: 'hsl(293 79% 71%)' },
  14: { accentPrimary: 'hsl(221 83% 53%)', accentSubmit: 'hsl(221 83% 53%)' },
  15: { accentPrimary: 'hsl(0 72% 51%)',   accentSubmit: 'hsl(0 72% 51%)' },
};

/* ── factoryTemplate: same Parshant design, dark-only, themed accent ── */
function factoryTemplate(d: any, cfg: ThemeCfg): string {
  return parshantHtml(d, { darkOnly: true, accentPrimary: cfg.accentPrimary, accentSubmit: cfg.accentSubmit });
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
${d.experience?.length ? `<div class="section"><h2>Experience</h2>${pexpHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><h2>Projects</h2>${pprojHtml(d.projects)}</div>` : ""}
${d.skills?.length ? `<div class="section"><h2>Skills</h2><div class="skills-wrap">${pskillsHtml(d.skills)}</div></div>` : ""}
${d.education?.length ? `<div class="section"><h2>Education</h2>${peducationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><h2>Certifications</h2>${pcertificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><h2>LeetCode</h2>${pleetcodeHtml(d.leetcode, d.username)}</div>` : ""}
<div class="section"><h2>Contact</h2>${pcontactForm(d)}</div>
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
${d.experience?.length ? `<div class="section"><div class="section-label">Experience</div>${pexpHtml(d.experience)}</div>` : ""}
${d.projects?.length ? `<div class="section"><div class="section-label">Projects</div><div class="proj-grid">${pprojHtml(d.projects)}</div></div>` : ""}
${d.skills?.length ? `<div class="section"><div class="section-label">Skills</div><div class="skills-wrap">${pskillsHtml(d.skills)}</div></div>` : ""}
${d.education?.length ? `<div class="section"><div class="section-label">Education</div>${peducationHtml(d.education)}</div>` : ""}
${d.certifications?.length ? `<div class="section"><div class="section-label">Certifications</div>${pcertificationsHtml(d.certifications)}</div>` : ""}
${(d.leetcode?.solved || d.leetcode?.username) ? `<div class="section"><div class="section-label">LeetCode</div>${pleetcodeHtml(d.leetcode, d.username)}</div>` : ""}
<div class="section"><div class="section-label">Contact</div>${pcontactForm(d)}</div>
${createBanner(d.username)}
</div>
</body></html>`;
}

export default router;
