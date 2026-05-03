(function () {
  'use strict';

  let wiz = {
    token: null, username: null, displayName: null,
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
      wiz.token = data.token; wiz.username = data.username; wiz.displayName = data.displayName;
      sessionStorage.setItem('builder_token', wiz.token);
      sessionStorage.setItem('builder_username', wiz.username);
      sessionStorage.setItem('builder_displayName', wiz.displayName);
      showStep('choosepath');
    } catch { showAuthError('Network error — please try again.'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = wiz.authTab === 'login' ? 'Sign in →' : 'Create account →'; } }
  }

  /* ── choose path ── */
  function chooseAI() {
    wiz.mode = 'ai';
    showStep('chat');
    startChat();
  }

  function chooseManual() {
    wiz.mode = 'manual';
    showStep('manual');
    if ((document.getElementById('me-exp-list')?.children.length ?? 0) === 0) addExperience();
    if ((document.getElementById('me-proj-list')?.children.length ?? 0) === 0) addProject();
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

  /* ── manual editor ── */
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
      <div class="me-field"><label>Description</label><textarea name="description" rows="3" placeholder="Describe your role, responsibilities, and key achievements..."></textarea></div>
      <div class="me-field"><label>Skills used (comma-separated)</label><input type="text" name="skills" placeholder="e.g. React, TypeScript, Node.js" /></div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

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
      <div class="me-field"><label>Description</label><textarea name="description" rows="3" placeholder="What does this project do? What problems does it solve?"></textarea></div>
      <div class="me-field-row">
        <div class="me-field"><label>GitHub URL</label><input type="url" name="githubUrl" placeholder="https://github.com/..." /></div>
        <div class="me-field"><label>Live URL</label><input type="url" name="liveUrl" placeholder="https://..." /></div>
      </div>
    `;
    div.querySelector('.me-remove-btn').addEventListener('click', () => div.remove());
    list.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

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

  function collectManualData() {
    const g = id => document.getElementById(id)?.value?.trim() || '';
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

    return {
      name: g('me-name'), title: g('me-title'), bio: g('me-bio'),
      location: g('me-location'), email: g('me-email'),
      links: { github: g('me-github'), linkedin: g('me-linkedin'), website: g('me-website'), twitter: g('me-twitter') },
      experience, projects, skills,
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
        body: JSON.stringify({ data: wiz.portfolioData }),
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
    } catch {
      clearInterval(ticker);
      if (subEl) subEl.textContent = 'Something went wrong. Please go back and try again.';
    }
  }

  /* ── template switcher ── */
  function switchTemplate(t) {
    wiz.selectedTemplate = t;
    document.querySelectorAll('.tmpl-card').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.t) === t));
    previewFrame = previewFrame || document.getElementById('wiz-preview-frame');
    if (previewFrame && wiz.shareUrl) previewFrame.src = `${wiz.shareUrl}?t=${t}`;
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

    document.getElementById('me-add-exp')?.addEventListener('click', addExperience);
    document.getElementById('me-add-proj')?.addEventListener('click', addProject);
    document.getElementById('me-generate-btn')?.addEventListener('click', handleManualGenerate);
    document.getElementById('me-generate-btn-bottom')?.addEventListener('click', handleManualGenerate);

    const skillInput = document.getElementById('me-skill-input');
    const addSkillBtn = document.getElementById('me-add-skill-btn');
    function tryAddSkill() {
      const val = skillInput?.value?.trim();
      if (!val) return;
      addSkillChip(val);
      if (skillInput) skillInput.value = '';
    }
    skillInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tryAddSkill(); } });
    addSkillBtn?.addEventListener('click', tryAddSkill);

    document.querySelectorAll('.tmpl-card').forEach(btn => btn.addEventListener('click', () => switchTemplate(parseInt(btn.dataset.t))));
    document.getElementById('wiz-copy-btn')?.addEventListener('click', copyLink);
    document.querySelectorAll('[data-open-wizard]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openWizard(); }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
