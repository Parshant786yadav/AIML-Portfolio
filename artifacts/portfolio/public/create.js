(function () {
  'use strict';

  /* ── state ── */
  let wiz = {
    token: null,
    username: null,
    displayName: null,
    chatHistory: [],
    portfolioData: null,
    selectedTemplate: 1,
    shareUrl: null,
    authTab: 'login',
  };

  /* ── DOM refs (built lazily) ── */
  let overlay, chatMsgs, chatInput, chatSend, progressFill, progressLabel;
  let authError, authUsernameEl, authPasswordEl, authDisplayEl;
  let previewFrame;

  /* ── open / close ── */
  function openWizard() {
    overlay = document.getElementById('wizard-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // restore session if any
    const saved = sessionStorage.getItem('builder_token');
    if (saved) {
      wiz.token = saved;
      wiz.username = sessionStorage.getItem('builder_username');
      wiz.displayName = sessionStorage.getItem('builder_displayName');
      showStep('chat');
      startChat();
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
  const STEPS = ['auth', 'chat', 'generating', 'preview'];
  const STEP_LABELS = ['Sign in', 'Tell us about you', 'Building', 'Your portfolio'];
  function showStep(id) {
    STEPS.forEach(s => {
      const el = document.getElementById(`wiz-step-${s}`);
      if (el) el.classList.toggle('active', s === id);
    });
    const idx = STEPS.indexOf(id);
    const fill = document.getElementById('wiz-progress-fill');
    const label = document.getElementById('wiz-progress-label-step');
    if (fill) fill.style.width = `${Math.round(((idx + 1) / STEPS.length) * 100)}%`;
    if (label) label.textContent = STEP_LABELS[idx] || '';
  }

  /* ── auth tab ── */
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
    if (sub) sub.textContent = tab === 'login' ? 'Sign in to build or update your portfolio.' : 'Get your own portfolio in minutes — free.';
    clearAuthError();
  }

  function clearAuthError() {
    const el = document.getElementById('auth-error');
    if (el) el.textContent = '';
  }
  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) el.textContent = msg;
  }

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
      const body = wiz.authTab === 'register' ? { username, password, displayName: displayName || username } : { username, password };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { showAuthError(data.error || 'Something went wrong.'); return; }
      wiz.token = data.token; wiz.username = data.username; wiz.displayName = data.displayName;
      sessionStorage.setItem('builder_token', wiz.token);
      sessionStorage.setItem('builder_username', wiz.username);
      sessionStorage.setItem('builder_displayName', wiz.displayName);
      showStep('chat');
      startChat();
    } catch { showAuthError('Network error — please try again.'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = wiz.authTab === 'login' ? 'Sign in →' : 'Create account →'; } }
  }

  /* ── chat wizard ── */
  function startChat() {
    chatMsgs = document.getElementById('wiz-chat-messages');
    chatInput = document.getElementById('wiz-chat-input');
    chatSend = document.getElementById('wiz-chat-send');
    if (!chatMsgs) return;
    wiz.chatHistory = [];
    chatMsgs.innerHTML = '';
    // send empty first message to get AI greeting
    sendToAI(null);
  }

  function appendMsg(role, text) {
    chatMsgs = chatMsgs || document.getElementById('wiz-chat-messages');
    if (!chatMsgs) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role === 'user' ? 'user' : 'ai'}`;
    const initials = role === 'user' ? (wiz.displayName || wiz.username || 'U')[0].toUpperCase() : 'AI';
    div.innerHTML = `
      <div class="chat-avatar">${initials}</div>
      <div class="chat-bubble">${text.replace(/\n/g, '<br>')}</div>`;
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
      // strip JSON block from display text
      const displayText = aiText.replace(/```json[\s\S]*?```/g, '').trim();
      if (displayText) {
        appendMsg('ai', displayText || 'Got it! Let me generate your portfolio now…');
        wiz.chatHistory.push({ role: 'assistant', content: aiText });
      }
      if (data.complete && data.portfolioData?.data) {
        wiz.portfolioData = data.portfolioData.data;
        setTimeout(generatePortfolio, 800);
      }
    } catch {
      hideTyping();
      appendMsg('ai', "Sorry, something went wrong. Please try again.");
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
    const subs = ['Crafting your hero section…', 'Building experience timeline…', 'Polishing your projects…', 'Choosing the perfect layout…', 'Almost there…'];
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
      // build full URL
      const fullUrl = `${location.protocol}//${location.host}${result.url}`;
      document.getElementById('wiz-share-url').textContent = fullUrl;
      const openBtn = document.getElementById('wiz-open-btn');
      if (openBtn) openBtn.href = fullUrl;
      // load preview
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
    document.querySelectorAll('.tmpl-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.t) === t));
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

  /* ── init (called on DOMContentLoaded) ── */
  function init() {
    // FAB
    document.getElementById('create-portfolio-fab')?.addEventListener('click', openWizard);

    // Close btn
    document.getElementById('wizard-close')?.addEventListener('click', closeWizard);

    // Escape key
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWizard(); });

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(btn => btn.addEventListener('click', () => setAuthTab(btn.dataset.tab)));

    // Auth form
    document.getElementById('auth-form')?.addEventListener('submit', submitAuth);

    // Chat send
    document.getElementById('wiz-chat-send')?.addEventListener('click', handleChatSend);
    document.getElementById('wiz-chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
    });

    // Auto-resize textarea
    document.getElementById('wiz-chat-input')?.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Template switcher
    document.querySelectorAll('.tmpl-btn').forEach(btn => btn.addEventListener('click', () => switchTemplate(parseInt(btn.dataset.t))));

    // Copy link
    document.getElementById('wiz-copy-btn')?.addEventListener('click', copyLink);

    // "Create Your Portfolio" CTA link (in hero/footer)
    document.querySelectorAll('[data-open-wizard]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openWizard(); }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
