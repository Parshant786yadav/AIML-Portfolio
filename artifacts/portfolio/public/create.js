(function () {
  'use strict';

  let wiz = {
    token: null, username: null, displayName: null, adminPassword: null,
    chatHistory: [], portfolioData: null,
    selectedTemplate: 1, shareUrl: null,
    authTab: 'login', mode: null,
  };

  let overlay, chatMsgs, chatInput, chatSend, previewFrame;

  /* ── open / close ── */
  function openWizard() {
    overlay = document.getElementById('wizard-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const saved = sessionStorage.getItem('builder_token');
    if (saved) {
      wiz.token = saved;
      wiz.username = sessionStorage.getItem('builder_username');
      wiz.displayName = sessionStorage.getItem('builder_displayName');
      showStep('choosepath');
    } else {
      showStep('auth');
    }
  }

  function closeWizard() {
    if (!overlay) overlay = document.getElementById('wizard-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── step navigation ── */
  const ALL_STEPS = ['auth', 'choosepath', 'chat', 'manual', 'generating', 'preview'];
  const PROGRESS_IDX = { auth: 0, choosepath: 1, chat: 2, manual: 2, generating: 3, preview: 4 };
  const PROGRESS_LABELS = ['Sign in', 'Choose path', 'Tell us about you', 'Building…', 'Your portfolio'];

  function showStep(id) {
    ALL_STEPS.forEach(s => {
      const el = document.getElementById(`wiz-step-${s}`);
      if (el) el.classList.toggle('active', s === id);
    });
    const idx = PROGRESS_IDX[id] ?? 0;
    const pct = Math.round(((idx + 1) / 5) * 100);
    const fill = document.getElementById('wiz-progress-fill');
    const label = document.getElementById('wiz-progress-label-step');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = PROGRESS_LABELS[idx] || '';
  }

  /* ── auth ── */
  function setAuthTab(tab) {
    wiz.authTab = tab;
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    const dField = document.getElementById('auth-displayname-field');
    if (dField) dField.style.display = tab === 'register' ? 'block' : 'none';
    const btn = document.getElementById('auth-submit-btn');
    if (btn) btn.textContent = tab === 'login' ? 'Sign in →' : 'Create account →';
    const title = document.getElementById('auth-title');
    if (title) title.textContent = tab === 'login' ? 'Welcome back' : 'Create your account';
    const sub = document.getElementById('auth-subtitle');
    if (sub) sub.textContent = tab === 'login' ? 'Sign in to build or update your portfolio.' : 'Get your portfolio live in minutes — free.';
    clearAuthError();
  }

  function clearAuthError() { const el = document.getElementById('auth-error'); if (el) el.textContent = ''; }
  function showAuthError(msg) { const el = document.getElementById('auth-error'); if (el) el.textContent = msg; }

  async function submitAuth(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const displayName = document.getElementById('auth-displayname')?.value?.trim();
    if (!username || !password) return showAuthError('Please fill in all fields.');
    const btn = document.getElementById('auth-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }
    clearAuthError();
    try {
      const endpoint = wiz.authTab === 'login' ? '/api/builder/login' : '/api/builder/register';
      const body = wiz.authTab === 'register'
        ? { username, password, displayName: displayName || username }
        : { username, password };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { showAuthError(data.error || 'Something went wrong.'); return; }
      wiz.token = data.token;
      wiz.username = data.username;
      wiz.displayName = data.displayName;
      wiz.adminPassword = data.adminPassword || null;
      sessionStorage.setItem('builder_token', wiz.token);
      sessionStorage.setItem('builder_username', wiz.username);
      sessionStorage.setItem('builder_displayName', wiz.displayName);
      showStep('choosepath');
    } catch { showAuthError('Network error — please try again.'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = wiz.authTab === 'login' ? 'Sign in →' : 'Create account →'; } }
  }

  /* ── choose path ── */
  function chooseAI() { wiz.mode = 'ai'; showStep('chat'); startChat(); }
  function chooseManual() {
    wiz.mode = 'manual';
    showStep('manual');
    initManualEditor();
  }

  /* ── manual editor ── */
  let manualInited = false;
  let previewDebounceTimer = null;

  function schedulePreviewUpdate() {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(updateManualPreview, 400);
  }

  function updateManualPreview() {
    const iframe = document.getElementById('me-preview-iframe');
    if (!iframe) return;
    const d = collectManualData();
    iframe.srcdoc = buildPreviewHtml(d);
  }

  function buildPreviewHtml(d) {
    const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const initials = (d.name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
    const accent = '#4ade80';

    const linksHtml = (d.links || []).filter(l => l.url).map(l =>
      `<a href="${esc(l.url)}" style="display:inline-block;padding:4px 12px;border:1px solid #222;border-radius:20px;font-size:11px;color:#888;text-decoration:none;margin:2px 2px 2px 0;font-family:monospace">${esc(l.platform)}</a>`
    ).join('');

    const expHtml = (d.experience || []).filter(e => e.role || e.company).map(e => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px">
          <strong style="color:#e0e0e0;font-size:13px">${esc(e.role)}</strong>
          <span style="font-size:11px;color:#555;font-family:monospace">${esc(e.period)}</span>
        </div>
        <div style="font-size:12px;color:${accent};margin-bottom:4px">${esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ''}</div>
        ${e.description ? `<div style="font-size:12px;color:#777;line-height:1.5">${esc(e.description)}</div>` : ''}
        ${e.skills?.length ? `<div style="margin-top:6px">${e.skills.map(s=>`<span style="font-size:10px;padding:2px 8px;background:#111;border-radius:10px;color:#555;margin-right:4px">${esc(s)}</span>`).join('')}</div>` : ''}
      </div>`).join('');

    const projHtml = (d.projects || []).filter(p => p.name).map(p => `
      <div style="margin-bottom:10px;padding:12px;background:#0f0f0f;border-radius:8px;border:1px solid #1a1a1a">
        <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:4px">${esc(p.name)}</div>
        ${p.description ? `<div style="font-size:12px;color:#777;margin-bottom:6px">${esc(p.description)}</div>` : ''}
        ${p.tags?.length ? `<div>${p.tags.map(t=>`<span style="font-size:10px;padding:2px 8px;background:#161616;border-radius:10px;color:#555;margin-right:4px">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>`).join('');

    const skillsHtml = (d.skills || []).map(s =>
      `<span style="display:inline-block;padding:4px 12px;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:16px;font-size:11px;color:#aaa;margin:2px;font-family:monospace">${esc(s)}</span>`
    ).join('');

    const eduHtml = (d.education || []).filter(e => e.institution || e.degree).map(e => `
      <div style="margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:#e0e0e0">${esc(e.institution)}</div>
        <div style="font-size:12px;color:#777">${[e.degree, e.field].filter(Boolean).map(esc).join(' — ')}${e.period ? ` · ${esc(e.period)}` : ''}${e.cgpa ? ` · CGPA ${esc(e.cgpa)}` : ''}</div>
      </div>`).join('');

    const certHtml = (d.certifications || []).filter(c => c.name).map(c => `
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px">
        <div>
          <div style="font-size:12px;font-weight:600;color:#e0e0e0">${esc(c.name)}</div>
          ${c.issuer ? `<div style="font-size:11px;color:#777">${esc(c.issuer)}${c.date ? ` · ${esc(c.date)}` : ''}</div>` : ''}
        </div>
        ${c.url ? `<a href="${esc(c.url)}" style="font-size:11px;color:${accent};text-decoration:none">View ↗</a>` : ''}
      </div>`).join('');

    const lc = d.leetcode;
    const lcHtml = (lc && (lc.username || lc.solved)) ? `
      <div style="padding:12px;background:#0f0f0f;border-radius:8px;border:1px solid #1a1a1a;display:flex;gap:20px;flex-wrap:wrap;align-items:center">
        ${lc.username ? `<span style="font-size:12px;color:${accent};font-family:monospace">@${esc(lc.username)}</span>` : ''}
        ${lc.solved ? `<span style="font-size:12px;color:#e0e0e0"><strong>${lc.solved}</strong> <span style="color:#555">solved</span></span>` : ''}
        ${lc.hard ? `<span style="font-size:11px;color:#ef4444">${lc.hard} hard</span>` : ''}
        ${lc.medium ? `<span style="font-size:11px;color:#f59e0b">${lc.medium} med</span>` : ''}
        ${lc.easy ? `<span style="font-size:11px;color:${accent}">${lc.easy} easy</span>` : ''}
      </div>` : '';

    const section = (label, content) => content ? `
      <div style="margin-bottom:24px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#333;font-family:monospace;margin-bottom:10px;font-weight:600">${label}</div>
        ${content}
      </div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#c0c0c0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.6;padding:24px 20px;min-height:100vh}</style>
      </head><body>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:44px;height:44px;border-radius:50%;background:#0f2a1a;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:${accent};flex-shrink:0;border:2px solid #1a3a2a">${esc(initials)}</div>
        <div style="min-width:0">
          <div style="font-size:18px;font-weight:700;color:#f0f0f0">${d.name ? esc(d.name) : '<span style="color:#2a2a2a">Your Name</span>'}</div>
          ${d.title ? `<div style="font-size:12px;color:${accent};margin-top:1px">${esc(d.title)}</div>` : ''}
          ${d.location ? `<div style="font-size:11px;color:#444;margin-top:2px">📍 ${esc(d.location)}</div>` : ''}
        </div>
      </div>
      ${d.bio ? `<div style="font-size:12px;color:#777;line-height:1.6;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #111">${esc(d.bio)}</div>` : ''}
      ${linksHtml ? `<div style="margin-bottom:20px">${linksHtml}</div>` : ''}
      ${section('Work Experience', expHtml)}
      ${section('Projects', projHtml)}
      ${section('Skills', skillsHtml)}
      ${section('Education', eduHtml)}
      ${section('Certifications', certHtml)}
      ${section('LeetCode', lcHtml)}
    </body></html>`;
  }

  function initManualEditor() {
    if (manualInited) return;
    manualInited = true;
    initLinks();
    document.getElementById('me-add-link-btn')?.addEventListener('click', () => {
      const sel = document.getElementById('me-link-platform-sel');
      const platform = sel.value;
      if (!platform) return;
      addLinkItem(platform, '');
      sel.value = '';
      schedulePreviewUpdate();
    });
    document.getElementById('me-add-exp')?.addEventListener('click', () => { addExperience(); schedulePreviewUpdate(); });
    document.getElementById('me-add-proj')?.addEventListener('click', () => { addProject(); schedulePreviewUpdate(); });
    document.getElementById('me-add-edu')?.addEventListener('click', () => { addEducation(); schedulePreviewUpdate(); });
    document.getElementById('me-add-cert')?.addEventListener('click', () => { addCertification(); schedulePreviewUpdate(); });
    document.getElementById('me-generate-btn')?.addEventListener('click', handleManualGenerate);
    document.getElementById('me-generate-btn-bottom')?.addEventListener('click', handleManualGenerate);
    const skillInput = document.getElementById('me-skill-input');
    const addSkillBtn = document.getElementById('me-add-skill-btn');
    function tryAddSkill() {
      const val = skillInput?.value?.trim(); if (!val) return;
      addSkillChip(val); if (skillInput) skillInput.value = '';
      schedulePreviewUpdate();
    }
    skillInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tryAddSkill(); } });
    addSkillBtn?.addEventListener('click', tryAddSkill);
    addExperience();
    addProject();

    /* Live preview: update on any input/change in the form column */
    const formCol = document.querySelector('.me-form-col');
    if (formCol) {
      formCol.addEventListener('input', schedulePreviewUpdate);
      formCol.addEventListener('change', schedulePreviewUpdate);
    }
    /* Initial render */
    updateManualPreview();
  }

  /* Links */
  const LINK_PLACEHOLDERS = {
    'GitHub': 'https://github.com/username',
    'LinkedIn': 'https://linkedin.com/in/username',
    'WhatsApp': 'https://wa.me/+91XXXXXXXXXX',
    'Email': 'your@email.com',
    'LeetCode': 'https://leetcode.com/username',
    'Website': 'https://yourwebsite.com',
    'Twitter / X': 'https://twitter.com/username',
    'YouTube': 'https://youtube.com/@channel',
    'Instagram': 'https://instagram.com/username',
    'Medium': 'https://medium.com/@username',
    'Dev.to': 'https://dev.to/username',
    'Behance': 'https://behance.net/username',
    'Dribbble': 'https://dribbble.com/username',
  };

  function initLinks() {
    ['GitHub', 'LinkedIn', 'WhatsApp', 'Email', 'LeetCode'].forEach(p => addLinkItem(p, ''));
  }

  function addLinkItem(platform, url) {
    const list = document.getElementById('me-links-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'me-link-item';
    const ph = LINK_PLACEHOLDERS[platform] || 'https://...';
    const inputType = platform === 'Email' ? 'email' : 'url';
    div.innerHTML = `
      <span class="me-link-platform-badge">${platform}</span>
      <input type="${inputType}" class="me-link-url" placeholder="${ph}" value="${url || ''}" data-platform="${platform}" />
      <button class="me-link-remove" type="button" title="Remove">×</button>
    `;
    div.querySelector('.me-link-remove').addEventListener('click', () => div.remove());
    list.appendChild(div);
  }

  /* Experience */
  function addExperience() {
    const list = document.getElementById('me-exp-list');
    if (!list) return;
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'me-exp-item me-item';
    div.innerHTML = `
      <div class="me-item-hdr">
        <span class="me-item-label">Experience ${idx}</span>
        <button class="me-remove-btn" type="button">✕ Remove</button>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Role / Title</label><input type="text" name="role" placeholder="e.g. Software Engineer" /></div>
        <div class="me-field"><label>Company</label><input type="text" name="company" placeholder="e.g. Acme Corp" /></div>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Period</label><input type="text" name="period" placeholder="e.g. Jan 2022 — Present" /></div>
        <div class="me-field"><label>Location</label><input type="text" name="location" placeholder="e.g. Remote" /></div>
      </div>
      <div class="me-field"><label>Description</label><textarea name="description" rows="3" placeholder="Describe your role, key achievements..."></textarea></div>
      <div class="me-field"><label>Skills used (comma-separated)</label><input type="text" name="skills" placeholder="e.g. React, TypeScript, Node.js" /></div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Projects */
  function addProject() {
    const list = document.getElementById('me-proj-list');
    if (!list) return;
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'me-proj-item me-item';
    div.innerHTML = `
      <div class="me-item-hdr">
        <span class="me-item-label">Project ${idx}</span>
        <button class="me-remove-btn" type="button">✕ Remove</button>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Project Name</label><input type="text" name="name" placeholder="e.g. My Awesome App" /></div>
        <div class="me-field"><label>Tags (comma-separated)</label><input type="text" name="tags" placeholder="e.g. React, Firebase, AI" /></div>
      </div>
      <div class="me-field"><label>Description</label><textarea name="description" rows="3" placeholder="What does this project do?"></textarea></div>
      <div class="me-field-row">
        <div class="me-field"><label>GitHub URL</label><input type="url" name="githubUrl" placeholder="https://github.com/..." /></div>
        <div class="me-field"><label>Live URL</label><input type="url" name="liveUrl" placeholder="https://..." /></div>
      </div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Education */
  function addEducation() {
    const list = document.getElementById('me-edu-list');
    if (!list) return;
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'me-edu-item me-item';
    div.innerHTML = `
      <div class="me-item-hdr">
        <span class="me-item-label">Education ${idx}</span>
        <button class="me-remove-btn" type="button">✕ Remove</button>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Institution</label><input type="text" name="institution" placeholder="e.g. MIT" /></div>
        <div class="me-field"><label>Degree</label><input type="text" name="degree" placeholder="e.g. B.Tech" /></div>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Field of Study</label><input type="text" name="field" placeholder="e.g. Computer Science" /></div>
        <div class="me-field"><label>Period</label><input type="text" name="period" placeholder="e.g. 2020 — 2024" /></div>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>CGPA / Grade</label><input type="text" name="cgpa" placeholder="e.g. 8.5 / 10" /></div>
        <div class="me-field"><label>Activities / Notes</label><input type="text" name="description" placeholder="e.g. Dean's List, Robotics Club..." /></div>
      </div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Certifications */
  function addCertification() {
    const list = document.getElementById('me-cert-list');
    if (!list) return;
    const idx = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'me-cert-item me-item';
    div.innerHTML = `
      <div class="me-item-hdr">
        <span class="me-item-label">Certification ${idx}</span>
        <button class="me-remove-btn" type="button">✕ Remove</button>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Certificate Name</label><input type="text" name="name" placeholder="e.g. AWS Solutions Architect" /></div>
        <div class="me-field"><label>Issuing Organization</label><input type="text" name="issuer" placeholder="e.g. Amazon Web Services" /></div>
      </div>
      <div class="me-field-row">
        <div class="me-field"><label>Date Issued</label><input type="text" name="date" placeholder="e.g. Jan 2024" /></div>
        <div class="me-field"><label>Certificate URL</label><input type="url" name="url" placeholder="https://..." /></div>
      </div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Skills */
  function addSkillChip(skill) {
    if (!skill.trim()) return;
    const wrap = document.getElementById('me-skills-wrap');
    if (!wrap) return;
    const existing = [...wrap.querySelectorAll('.me-skill-chip')].map(c => c.dataset.skill);
    if (existing.includes(skill.trim())) return;
    const chip = document.createElement('div');
    chip.className = 'me-skill-chip';
    chip.dataset.skill = skill.trim();
    chip.innerHTML = `${skill.trim()}<button class="me-chip-remove" type="button" title="Remove">×</button>`;
    chip.querySelector('.me-chip-remove').addEventListener('click', () => chip.remove());
    wrap.appendChild(chip);
  }

  /* Collect all manual data */
  function collectManualData() {
    const g = id => document.getElementById(id)?.value?.trim() || '';

    const links = [...document.querySelectorAll('#me-links-list .me-link-item')].map(el => ({
      platform: el.querySelector('.me-link-platform-badge')?.textContent || '',
      url: el.querySelector('.me-link-url')?.value?.trim() || '',
    })).filter(l => l.url);

    const experience = [...document.querySelectorAll('.me-exp-item')].map(el => ({
      role: el.querySelector('[name=role]')?.value?.trim() || '',
      company: el.querySelector('[name=company]')?.value?.trim() || '',
      period: el.querySelector('[name=period]')?.value?.trim() || '',
      location: el.querySelector('[name=location]')?.value?.trim() || '',
      description: el.querySelector('[name=description]')?.value?.trim() || '',
      skills: (el.querySelector('[name=skills]')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    })).filter(e => e.role || e.company);

    const projects = [...document.querySelectorAll('.me-proj-item')].map(el => ({
      name: el.querySelector('[name=name]')?.value?.trim() || '',
      description: el.querySelector('[name=description]')?.value?.trim() || '',
      githubUrl: el.querySelector('[name=githubUrl]')?.value?.trim() || '',
      liveUrl: el.querySelector('[name=liveUrl]')?.value?.trim() || '',
      tags: (el.querySelector('[name=tags]')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    })).filter(p => p.name);

    const skills = [...document.querySelectorAll('.me-skill-chip')].map(c => c.dataset.skill).filter(Boolean);

    const education = [...document.querySelectorAll('.me-edu-item')].map(el => ({
      institution: el.querySelector('[name=institution]')?.value?.trim() || '',
      degree: el.querySelector('[name=degree]')?.value?.trim() || '',
      field: el.querySelector('[name=field]')?.value?.trim() || '',
      period: el.querySelector('[name=period]')?.value?.trim() || '',
      cgpa: el.querySelector('[name=cgpa]')?.value?.trim() || '',
      description: el.querySelector('[name=description]')?.value?.trim() || '',
    })).filter(e => e.institution || e.degree);

    const certifications = [...document.querySelectorAll('.me-cert-item')].map(el => ({
      name: el.querySelector('[name=name]')?.value?.trim() || '',
      issuer: el.querySelector('[name=issuer]')?.value?.trim() || '',
      date: el.querySelector('[name=date]')?.value?.trim() || '',
      url: el.querySelector('[name=url]')?.value?.trim() || '',
    })).filter(c => c.name);

    const lcUsername = g('me-lc-username');
    const lcTotal = parseInt(g('me-lc-total')) || 0;
    const lcHard = parseInt(g('me-lc-hard')) || 0;
    const lcMedium = parseInt(g('me-lc-medium')) || 0;
    const lcEasy = parseInt(g('me-lc-easy')) || 0;
    const lcRating = parseInt(g('me-lc-rating')) || 0;
    const leetcode = (lcUsername || lcTotal) ? { username: lcUsername, solved: lcTotal, hard: lcHard, medium: lcMedium, easy: lcEasy, rating: lcRating || undefined } : null;

    return {
      name: g('me-name'), title: g('me-title'), bio: g('me-bio'),
      location: g('me-location'), email: g('me-email'),
      links, experience, projects, skills, education, certifications, leetcode,
    };
  }

  function handleManualGenerate() {
    const data = collectManualData();
    if (!data.name) {
      const nameEl = document.getElementById('me-name');
      if (nameEl) { nameEl.focus(); nameEl.style.borderColor = '#ef4444'; setTimeout(() => nameEl.style.borderColor = '', 2000); }
      return;
    }
    wiz.portfolioData = data;
    generatePortfolio();
  }

  /* ── chat ── */
  function startChat() {
    chatMsgs = document.getElementById('wiz-chat-messages');
    chatInput = document.getElementById('wiz-chat-input');
    chatSend = document.getElementById('wiz-chat-send');
    if (!chatMsgs) return;
    wiz.chatHistory = [];
    chatMsgs.innerHTML = '';
    sendToAI(null);
  }

  function appendMsg(role, text) {
    chatMsgs = chatMsgs || document.getElementById('wiz-chat-messages');
    if (!chatMsgs) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role === 'user' ? 'user' : 'ai'}`;
    const initials = role === 'user' ? (wiz.displayName || wiz.username || 'U')[0].toUpperCase() : 'AI';
    div.innerHTML = `<div class="chat-avatar">${initials}</div><div class="chat-bubble">${text.replace(/\n/g, '<br>')}</div>`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function showTyping() {
    chatMsgs = chatMsgs || document.getElementById('wiz-chat-messages');
    if (!chatMsgs) return;
    const el = document.createElement('div');
    el.className = 'chat-msg ai'; el.id = 'typing-indicator';
    el.innerHTML = `<div class="chat-avatar">AI</div><div class="chat-bubble"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
    chatMsgs.appendChild(el);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }
  function hideTyping() { document.getElementById('typing-indicator')?.remove(); }

  async function sendToAI(userText) {
    if (userText !== null) {
      wiz.chatHistory.push({ role: 'user', content: userText });
      appendMsg('user', userText);
    }
    showTyping();
    setChatEnabled(false);
    try {
      const res = await fetch('/api/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wiz.token}` },
        body: JSON.stringify({ messages: wiz.chatHistory }),
      });
      if (!res.ok) throw new Error('AI error');
      const data = await res.json();
      hideTyping();
      const aiText = data.content || '';
      const displayText = aiText.replace(/```json[\s\S]*?```/g, '').trim();
      if (displayText) {
        appendMsg('ai', displayText);
        wiz.chatHistory.push({ role: 'assistant', content: aiText });
      }
      if (data.complete && data.portfolioData?.data) {
        wiz.portfolioData = data.portfolioData.data;
        setTimeout(generatePortfolio, 800);
      }
    } catch {
      hideTyping();
      appendMsg('ai', 'Sorry, something went wrong. Please try again.');
    } finally { setChatEnabled(true); }
  }

  function setChatEnabled(on) {
    chatInput = chatInput || document.getElementById('wiz-chat-input');
    chatSend = chatSend || document.getElementById('wiz-chat-send');
    if (chatInput) chatInput.disabled = !on;
    if (chatSend) chatSend.disabled = !on;
  }

  function handleChatSend() {
    chatInput = chatInput || document.getElementById('wiz-chat-input');
    const text = chatInput?.value?.trim();
    if (!text) return;
    chatInput.value = '';
    chatInput.style.height = '';
    sendToAI(text);
  }

  /* ── portfolio generation ── */
  async function generatePortfolio() {
    showStep('generating');
    const subs = ['Crafting your hero section…', 'Building experience timeline…', 'Polishing your projects…', 'Applying your chosen design…', 'Almost there…'];
    let i = 0;
    const subEl = document.getElementById('wiz-gen-sub');
    const ticker = setInterval(() => { if (subEl && i < subs.length) subEl.textContent = subs[i++]; }, 900);
    try {
      const res = await fetch('/api/builder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wiz.token}` },
        body: JSON.stringify({ data: { ...wiz.portfolioData, template: wiz.selectedTemplate } }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      clearInterval(ticker);
      wiz.shareUrl = result.url;
      const fullUrl = `${location.protocol}//${location.host}${result.url}`;
      const shareEl = document.getElementById('wiz-share-url');
      if (shareEl) shareEl.textContent = fullUrl;
      const openBtn = document.getElementById('wiz-open-btn');
      if (openBtn) openBtn.href = fullUrl;
      previewFrame = document.getElementById('wiz-preview-frame');
      if (previewFrame) previewFrame.src = `${result.url}?t=${wiz.selectedTemplate}`;
      showStep('preview');
      showAdminCreds(result.username);
    } catch {
      clearInterval(ticker);
      if (subEl) subEl.textContent = 'Something went wrong. Please go back and try again.';
    }
  }

  /* ── admin credentials display ── */
  function showAdminCreds(username) {
    const card = document.getElementById('wiz-admin-creds');
    if (!card) return;
    if (!wiz.adminPassword) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const adminUrl = `${location.protocol}//${location.host}/p/${username}/admin`;
    const urlEl = document.getElementById('wiz-admin-url');
    const userEl = document.getElementById('wiz-admin-user');
    const passEl = document.getElementById('wiz-admin-pass');
    if (urlEl) urlEl.textContent = adminUrl;
    if (userEl) userEl.textContent = username;
    if (passEl) passEl.textContent = wiz.adminPassword;
    const copyBtn = document.getElementById('wiz-copy-admin-url');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(adminUrl).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        });
      };
    }
  }

  /* ── template switcher ── */
  function switchTemplate(t) {
    wiz.selectedTemplate = t;
    document.querySelectorAll('.tmpl-card').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.t) === t));
    previewFrame = previewFrame || document.getElementById('wiz-preview-frame');
    if (previewFrame && wiz.shareUrl) previewFrame.src = `${wiz.shareUrl}?t=${t}`;
    if (wiz.token && wiz.shareUrl) {
      fetch('/api/builder/my-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wiz.token}` },
        body: JSON.stringify({ data: { ...wiz.portfolioData, template: t } }),
      }).catch(() => {});
    }
  }

  /* ── copy link ── */
  function copyLink() {
    const url = document.getElementById('wiz-share-url')?.textContent;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('wiz-copy-btn');
      if (btn) { const prev = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = prev, 2000); }
    });
  }

  /* ── init ── */
  function init() {
    document.getElementById('create-portfolio-fab')?.addEventListener('click', openWizard);
    document.getElementById('wizard-close')?.addEventListener('click', closeWizard);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWizard(); });

    document.querySelectorAll('.auth-tab').forEach(btn => btn.addEventListener('click', () => setAuthTab(btn.dataset.tab)));
    document.getElementById('auth-form')?.addEventListener('submit', submitAuth);

    document.getElementById('btn-ai-path')?.addEventListener('click', chooseAI);
    document.getElementById('btn-manual-path')?.addEventListener('click', chooseManual);

    document.getElementById('wiz-chat-send')?.addEventListener('click', handleChatSend);
    document.getElementById('wiz-chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
    });
    document.getElementById('wiz-chat-input')?.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    document.querySelectorAll('.tmpl-card').forEach(btn => btn.addEventListener('click', () => switchTemplate(parseInt(btn.dataset.t))));
    document.getElementById('wiz-copy-btn')?.addEventListener('click', copyLink);
    document.querySelectorAll('[data-open-wizard]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openWizard(); }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
