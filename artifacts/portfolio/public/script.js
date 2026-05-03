'use strict';

/* ─── Theme ─── */
const html = document.documentElement;

function getTheme() {
  const stored = localStorage.getItem('portfolio-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function sunIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
}
function moonIcon() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
}

function applyTheme(theme) {
  if (theme === 'dark') {
    html.classList.add('dark');
    document.getElementById('theme-icon-desktop').innerHTML = sunIcon();
    document.getElementById('theme-icon-mobile').innerHTML = sunIcon();
  } else {
    html.classList.remove('dark');
    document.getElementById('theme-icon-desktop').innerHTML = moonIcon();
    document.getElementById('theme-icon-mobile').innerHTML = moonIcon();
  }
  localStorage.setItem('portfolio-theme', theme);
}

applyTheme(getTheme());

function toggleTheme() {
  applyTheme(html.classList.contains('dark') ? 'light' : 'dark');
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

/* ─── Scroll progress bar ─── */
const progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docH > 0 ? scrollTop / docH : 0;
  progressBar.style.transform = `scaleX(${pct})`;
}, { passive: true });

/* ─── Navbar scroll state ─── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ─── Navbar logo → scroll to top ─── */
document.getElementById('nav-logo').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── Nav link smooth scroll ─── */
function scrollToSection(href) {
  const id = href.replace('#', '');
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

document.querySelectorAll('.nav-link[data-href]').forEach(btn => {
  btn.addEventListener('click', () => {
    scrollToSection(btn.dataset.href);
    const mobileNav = document.getElementById('mobile-nav');
    mobileNav.classList.remove('open');
    document.getElementById('icon-menu').style.display = '';
    document.getElementById('icon-close').style.display = 'none';
  });
});

/* ─── Mobile menu toggle ─── */
const mobileNav = document.getElementById('mobile-nav');
const iconMenu = document.getElementById('icon-menu');
const iconClose = document.getElementById('icon-close');

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  iconMenu.style.display = isOpen ? 'none' : '';
  iconClose.style.display = isOpen ? '' : 'none';
});

/* ─── Live IST clock ─── */
function updateClock() {
  const t = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  document.getElementById('live-time').textContent = t + ' IST';
}
updateClock();
setInterval(updateClock, 1000);

/* ─── Intersection Observer for fade-in ─── */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

/* ─── LeetCode bar animations ─── */
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      setTimeout(() => { el.style.width = el.dataset.pct + '%'; }, 300);
      barObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.lc-bar-fill').forEach(el => barObserver.observe(el));

/* ─── Apply fade-in to sections and cards ─── */
document.querySelectorAll('.section').forEach(el => el.classList.add('fade-in'));
document.querySelectorAll('.exp-item, .project-card, .skill-row, .edu-item, .cert-card').forEach((el, i) => {
  el.classList.add('fade-in');
  el.style.transitionDelay = (i % 4) * 0.07 + 's';
});

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

/* ─── EmailJS config ─── */
const EMAILJS_SERVICE_ID  = 'service_nqfe3w8';
const EMAILJS_TEMPLATE_ID = 'template_m601guu';
const EMAILJS_PUBLIC_KEY  = 'HJe7pBSD9FnK2ielA';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

/* ─── Contact form ─── */
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const submitIcon = document.getElementById('submit-icon');
const submitText = document.getElementById('submit-text');
const toast = document.getElementById('toast');

const sendIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

function showToast(success) {
  toast.innerHTML = success
    ? '<strong>Message sent!</strong> Parshant will get back to you soon.'
    : '<strong>Something went wrong.</strong> Please email directly at Parshant786yadav@gmail.com';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

function resetBtn() {
  submitBtn.disabled = false;
  submitIcon.innerHTML = sendIcon;
  submitText.textContent = 'send message';
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitIcon.innerHTML = '<span class="spinner"></span>';
  submitText.textContent = 'sending...';

  emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
    .then(() => {
      form.reset();
      resetBtn();
      showToast(true);
    })
    .catch(() => {
      resetBtn();
      showToast(false);
    });
});

/* ─── Chatbot ─── */
const chatFab       = document.getElementById('chat-fab');
const chatPanel     = document.getElementById('chat-panel');
const chatClose     = document.getElementById('chat-close');
const chatInput     = document.getElementById('chat-input');
const chatSend      = document.getElementById('chat-send');
const chatMessages  = document.getElementById('chat-messages');
const chatFabOpen   = document.getElementById('chat-fab-open');
const chatFabClose  = document.getElementById('chat-fab-close');
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  chatPanel.classList.toggle('open', chatOpen);
  chatPanel.setAttribute('aria-hidden', String(!chatOpen));
  chatFabOpen.style.display  = chatOpen ? 'none' : '';
  chatFabClose.style.display = chatOpen ? '' : 'none';
  if (chatOpen) setTimeout(() => chatInput.focus(), 280);
}

chatFab.addEventListener('click', toggleChat);
chatClose.addEventListener('click', toggleChat);

function appendMsg(html, role) {
  const msg    = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = html;
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

function showTyping() {
  const msg = document.createElement('div');
  msg.className = 'chat-msg bot';
  msg.id = 'chat-typing-row';
  msg.innerHTML = '<div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('chat-typing-row');
  if (t) t.remove();
}

const chatHistory = [];

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatSend.disabled = true;
  chatInput.disabled = true;
  appendMsg(text, 'user');
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(),
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const reply = data.reply || data.answer || 'Sorry, I could not get a response.';
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: reply });
    removeTyping();
    appendMsg(reply, 'bot');
  } catch (err) {
    removeTyping();
    appendMsg("Sorry, I'm having trouble connecting right now. Please try the contact form below!", 'bot');
  } finally {
    chatSend.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

chatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

/* ─── Admin CMS ─── */
(async function initAdmin() {
  const TOKEN_KEY = 'admin-token';
  const AC = 'admin-injected'; // class for all injected admin elements
  const LIST_CONTAINERS = {
    'exp-list':      '.exp-list',
    'projects-list': '.projects-list',
    'edu-list':      '.edu-list',
    'cert-grid':     '.cert-grid',
    'skills-list':   '.skills-list',
  };
  const LIST_SELS = Object.values(LIST_CONTAINERS);
  let loadedPhotoUrl = null, newPhotoUrl = null;

  function isInList(el) { return LIST_SELS.some(s => el.closest(s)); }

  /* ── Load & apply saved overrides ── */
  async function loadOverrides() {
    try {
      const res = await fetch('/api/admin/content');
      if (!res.ok) return;
      const data = await res.json();
      Object.entries(LIST_CONTAINERS).forEach(([key, sel]) => {
        if (data[key]) { const el = document.querySelector(sel); if (el) el.innerHTML = data[key]; }
      });
      if (data['profile-photo']) {
        loadedPhotoUrl = data['profile-photo'];
        const img = document.querySelector('.avatar img');
        if (img) img.src = loadedPhotoUrl;
      }
      Object.entries(data).forEach(([key, val]) => {
        if (LIST_CONTAINERS[key] || key === 'profile-photo') return;
        const el = document.querySelector(`[data-editable="${key}"]`);
        if (el) el.innerHTML = val;
      });
    } catch {}
  }
  await loadOverrides();

  /* ── DOM refs ── */
  const adminLoginBtn   = document.getElementById('admin-login-btn');
  const adminModal      = document.getElementById('admin-modal');
  const adminModalClose = document.getElementById('admin-modal-close');
  const adminLoginForm  = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');
  const adminToolbar    = document.getElementById('admin-toolbar');
  const adminSaveBtn    = document.getElementById('admin-save-btn');
  const adminLogoutBtn  = document.getElementById('admin-logout-btn');

  /* ── Helpers ── */
  function editable(el) { if (!el) return; el.contentEditable = 'true'; el.spellcheck = false; }

  function mkDelete(item, label) {
    const btn = document.createElement('button');
    btn.className = `admin-delete-btn ${AC}`;
    btn.title = label || 'Remove'; btn.innerHTML = '&times;';
    btn.addEventListener('click', () => {
      item.style.transition = 'opacity 0.2s'; item.style.opacity = '0';
      setTimeout(() => item.remove(), 230);
    });
    return btn;
  }

  function mkAdd(label, onClick) {
    const btn = document.createElement('button');
    btn.className = `admin-add-btn ${AC}`;
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${label}`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /* ── Tag × / + controls (for experience/project tags) ── */
  function injectTagControls(container) {
    if (!container) return;
    container.querySelectorAll('.tag').forEach(tag => {
      if (tag.querySelector('.admin-tag-delete')) return;
      const del = document.createElement('button');
      del.className = `admin-tag-delete ${AC}`; del.innerHTML = '&times;';
      del.addEventListener('click', e => { e.stopPropagation(); tag.remove(); });
      tag.appendChild(del);
    });
    if (container.querySelector('.admin-tag-add')) return;
    const plus = document.createElement('button');
    plus.className = `admin-tag-add ${AC}`; plus.textContent = '+ add';
    plus.addEventListener('click', () => {
      const name = prompt('Tag / skill name:'); if (!name?.trim()) return;
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = name.trim();
      const del = document.createElement('button');
      del.className = `admin-tag-delete ${AC}`; del.innerHTML = '&times;';
      del.addEventListener('click', e => { e.stopPropagation(); tag.remove(); });
      tag.appendChild(del); container.insertBefore(tag, plus);
    });
    container.appendChild(plus);
  }

  /* ── Skill icon × / + controls ── */
  function mkSkillIcon(name) {
    const div = document.createElement('div'); div.className = 'skill-icon';
    const key = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9+#]/g, '');
    const img = document.createElement('img'); img.alt = name; img.loading = 'lazy';
    img.src = `https://skillicons.dev/icons?i=${key}`;
    img.onerror = () => {
      const box = document.createElement('div'); box.className = 'skill-box-text'; box.textContent = name;
      img.replaceWith(box);
    };
    const lbl = document.createElement('span'); lbl.textContent = name;
    div.appendChild(img); div.appendChild(lbl);
    return div;
  }

  function injectSkillIconControls(iconsEl) {
    if (!iconsEl) return;
    iconsEl.querySelectorAll(':scope > .skill-icon').forEach(icon => {
      if (icon.querySelector('.admin-skill-delete')) return;
      icon.style.position = 'relative';
      const del = document.createElement('button');
      del.className = `admin-skill-delete ${AC}`; del.innerHTML = '&times;'; del.title = 'Remove skill';
      del.addEventListener('click', e => { e.stopPropagation(); icon.remove(); });
      icon.appendChild(del);
    });
    if (iconsEl.querySelector('.admin-skill-add')) return;
    const plus = document.createElement('button');
    plus.className = `admin-skill-add ${AC}`;
    plus.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> add skill`;
    plus.addEventListener('click', () => {
      const name = prompt('Skill name (e.g. Python, React, Docker):'); if (!name?.trim()) return;
      const icon = mkSkillIcon(name.trim()); icon.style.position = 'relative';
      const del = document.createElement('button');
      del.className = `admin-skill-delete ${AC}`; del.innerHTML = '&times;'; del.title = 'Remove skill';
      del.addEventListener('click', e => { e.stopPropagation(); icon.remove(); });
      icon.appendChild(del); iconsEl.insertBefore(icon, plus);
    });
    iconsEl.appendChild(plus);
  }

  /* ── New item templates ── */
  function makeExpItem() {
    const el = document.createElement('div'); el.className = 'exp-item';
    el.innerHTML = `<div class="exp-letter" style="background:hsl(142 71% 45%/0.07);color:hsl(142 71% 45%);border:1px solid hsl(142 71% 45%/0.15)">N</div>
      <div class="exp-body"><div class="exp-header"><div>
        <h3 class="exp-role" contenteditable="true" spellcheck="false">New Role</h3>
        <a href="#" class="exp-company" contenteditable="true" spellcheck="false">@ Company Name</a>
      </div><div class="exp-right">
        <span class="exp-period mono" contenteditable="true" spellcheck="false">Month YYYY – Month YYYY</span>
        <span class="exp-loc" contenteditable="true" spellcheck="false">Location</span>
      </div></div>
      <p class="exp-desc" contenteditable="true" spellcheck="false">Describe your role and key accomplishments here...</p>
      <div class="tags"><span class="tag">Skill</span></div></div>`;
    return el;
  }

  function makeProjCard() {
    const el = document.createElement('div'); el.className = 'project-card';
    el.innerHTML = `<div class="project-header"><div><div class="project-title-row">
        <h3 class="project-name" contenteditable="true" spellcheck="false">Project Name</h3>
        <span class="project-badge" style="background:hsl(142 71% 45%/0.07);color:hsl(142 71% 45%);border:1px solid hsl(142 71% 45%/0.15)" contenteditable="true" spellcheck="false">Type</span>
      </div>
      <p class="project-subtitle mono" contenteditable="true" spellcheck="false">Brief one-line subtitle</p>
      </div></div>
      <p class="project-desc" contenteditable="true" spellcheck="false">Describe the project — what it does, how you built it, and its impact...</p>
      <div class="project-footer">
        <div class="tags"><span class="tag">Tech</span></div>
        <span class="project-metric mono" contenteditable="true" spellcheck="false">Key metric or outcome</span>
      </div>`;
    return el;
  }

  function makeEduItem() {
    const el = document.createElement('div'); el.className = 'edu-item';
    el.innerHTML = `<div class="edu-left">
        <h3 class="edu-degree" contenteditable="true" spellcheck="false">Degree / Course Name</h3>
        <p class="edu-school" contenteditable="true" spellcheck="false">Institution Name</p>
      </div><div class="edu-right">
        <span class="edu-score mono primary-text" contenteditable="true" spellcheck="false">Score</span>
        <span class="edu-period mono" contenteditable="true" spellcheck="false">YYYY – YYYY</span>
      </div>`;
    return el;
  }

  function makeCertCard() {
    const el = document.createElement('a'); el.href = '#'; el.className = 'cert-card';
    el.innerHTML = `<div class="cert-top"><div>
        <h3 class="cert-title" contenteditable="true" spellcheck="false">Certificate Name</h3>
        <p class="cert-issuer mono" contenteditable="true" spellcheck="false">Issuer</p>
      </div><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cert-arrow"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></div>
      <span class="tag tag-green" style="margin-top:8px">verified</span>`;
    return el;
  }

  function makeSkillRow() {
    const el = document.createElement('div'); el.className = 'skill-row';
    el.innerHTML = `<span class="skill-label mono" contenteditable="true" spellcheck="false">Category</span>
      <div class="skill-icons"><div class="skill-icon"><div class="skill-box-text">Skill</div><span>Skill</span></div></div>`;
    return el;
  }

  /* ── Circular photo crop modal ── */
  function showCropModal(src, onConfirm) {
    const VIEWPORT = 300;
    const CIRCLE_R = 145;

    const modal = document.createElement('div');
    modal.className = 'admin-crop-modal';
    modal.innerHTML = `
      <div class="admin-crop-box">
        <p class="admin-crop-hint">Drag to reposition &nbsp;·&nbsp; scroll or slide to zoom</p>
        <div class="admin-crop-viewport">
          <img class="admin-crop-img" src="${src}" draggable="false">
          <svg class="admin-crop-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="acmask">
                <rect width="300" height="300" fill="white"/>
                <circle cx="150" cy="150" r="${CIRCLE_R}" fill="black"/>
              </mask>
            </defs>
            <rect width="300" height="300" fill="black" opacity="0.6" mask="url(#acmask)"/>
            <circle cx="150" cy="150" r="${CIRCLE_R}" fill="none" stroke="hsl(142,71%,45%)" stroke-width="2.5" opacity="0.9"/>
          </svg>
        </div>
        <div class="admin-crop-zoom-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="range" class="admin-crop-slider" min="50" max="300" value="100" step="1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </div>
        <div class="admin-crop-btns">
          <button class="admin-crop-cancel">Cancel</button>
          <button class="admin-crop-apply">✓ Use Photo</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const img   = modal.querySelector('.admin-crop-img');
    const vp    = modal.querySelector('.admin-crop-viewport');
    const slider = modal.querySelector('.admin-crop-slider');
    let offsetX = 0, offsetY = 0, zoom = 1, fitScale = 1;
    let dragging = false, dStartX, dStartY, dOffX, dOffY;

    function applyTransform() {
      img.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${fitScale * zoom})`;
    }

    function onImgReady() {
      fitScale = Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight);
      applyTransform();
    }
    if (img.complete && img.naturalWidth) onImgReady();
    else img.addEventListener('load', onImgReady);

    // Mouse drag
    vp.addEventListener('mousedown', e => {
      dragging = true; dStartX = e.clientX; dStartY = e.clientY; dOffX = offsetX; dOffY = offsetY; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return; offsetX = dOffX + (e.clientX - dStartX); offsetY = dOffY + (e.clientY - dStartY); applyTransform();
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    // Touch drag
    vp.addEventListener('touchstart', e => {
      const t = e.touches[0]; dragging = true; dStartX = t.clientX; dStartY = t.clientY; dOffX = offsetX; dOffY = offsetY;
    }, { passive: true });
    vp.addEventListener('touchmove', e => {
      if (!dragging || !e.touches[0]) return;
      const t = e.touches[0]; offsetX = dOffX + (t.clientX - dStartX); offsetY = dOffY + (t.clientY - dStartY);
      applyTransform(); e.preventDefault();
    }, { passive: false });
    vp.addEventListener('touchend', () => { dragging = false; });

    // Zoom
    slider.addEventListener('input', () => { zoom = slider.value / 100; applyTransform(); });
    vp.addEventListener('wheel', e => {
      zoom = Math.max(0.5, Math.min(3, zoom - e.deltaY * 0.005));
      slider.value = zoom * 100; applyTransform(); e.preventDefault();
    }, { passive: false });

    modal.querySelector('.admin-crop-cancel').addEventListener('click', () => modal.remove());

    modal.querySelector('.admin-crop-apply').addEventListener('click', () => {
      const OUT = 400;
      const canvas = document.createElement('canvas');
      canvas.width = OUT; canvas.height = OUT;
      const ctx = canvas.getContext('2d');
      ctx.beginPath(); ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2); ctx.clip();

      const s = fitScale * zoom;
      // Map viewport top-left (0,0) → image coordinate
      const srcX = -(VIEWPORT / 2 + offsetX) / s + img.naturalWidth  / 2;
      const srcY = -(VIEWPORT / 2 + offsetY) / s + img.naturalHeight / 2;
      const srcW = VIEWPORT / s;
      const srcH = VIEWPORT / s;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT, OUT);

      onConfirm(canvas.toDataURL('image/jpeg', 0.92));
      modal.remove();
    });
  }

  /* ── Inject all admin controls into DOM ── */
  function injectControls() {
    /* Profile photo */
    const avatarDiv = document.querySelector('.avatar');
    if (avatarDiv && !avatarDiv.querySelector('.admin-photo-overlay')) {
      const lbl = document.createElement('label');
      lbl.className = `admin-photo-overlay ${AC}`;
      lbl.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Change Photo</span>`;
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
      fi.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          showCropModal(ev.target.result, (cropped) => {
            const img = avatarDiv.querySelector('img');
            if (img) img.src = cropped;
            newPhotoUrl = cropped;
          });
        };
        reader.readAsDataURL(file);
        fi.value = ''; // reset so same file can be re-picked
      });
      lbl.appendChild(fi); avatarDiv.appendChild(lbl);
    }

    /* Experience */
    const expList = document.querySelector('.exp-list');
    if (expList) {
      expList.querySelectorAll(':scope > .exp-item').forEach(item => {
        item.style.position = 'relative';
        if (!item.querySelector('.admin-delete-btn')) item.appendChild(mkDelete(item, 'Remove experience'));
        item.querySelectorAll('.exp-role,.exp-period,.exp-loc,.exp-desc').forEach(editable);
        injectTagControls(item.querySelector('.tags'));
      });
      if (!expList.querySelector('.admin-add-btn')) expList.appendChild(mkAdd('Add Experience', () => {
        const item = makeExpItem(); item.style.position = 'relative';
        item.appendChild(mkDelete(item, 'Remove experience'));
        injectTagControls(item.querySelector('.tags'));
        expList.insertBefore(item, expList.querySelector('.admin-add-btn'));
        item.querySelector('[contenteditable]')?.focus();
      }));
    }

    /* Projects */
    const projList = document.querySelector('.projects-list');
    if (projList) {
      projList.querySelectorAll(':scope > .project-card').forEach(card => {
        card.style.position = 'relative';
        if (!card.querySelector('.admin-delete-btn')) card.appendChild(mkDelete(card, 'Remove project'));
        card.querySelectorAll('.project-name,.project-badge,.project-subtitle,.project-desc,.project-metric').forEach(editable);
        injectTagControls(card.querySelector('.tags'));
      });
      if (!projList.querySelector('.admin-add-btn')) projList.appendChild(mkAdd('Add Project', () => {
        const card = makeProjCard(); card.style.position = 'relative';
        card.appendChild(mkDelete(card, 'Remove project'));
        injectTagControls(card.querySelector('.tags'));
        projList.insertBefore(card, projList.querySelector('.admin-add-btn'));
        card.querySelector('[contenteditable]')?.focus();
      }));
    }

    /* Education */
    const eduList = document.querySelector('.edu-list');
    if (eduList) {
      eduList.querySelectorAll(':scope > .edu-item').forEach(item => {
        item.style.position = 'relative';
        if (!item.querySelector('.admin-delete-btn')) item.appendChild(mkDelete(item, 'Remove education'));
        item.querySelectorAll('.edu-degree,.edu-school,.edu-score,.edu-period').forEach(editable);
      });
      if (!eduList.querySelector('.admin-add-btn')) eduList.appendChild(mkAdd('Add Education', () => {
        const item = makeEduItem(); item.style.position = 'relative';
        item.appendChild(mkDelete(item, 'Remove education'));
        eduList.insertBefore(item, eduList.querySelector('.admin-add-btn'));
        item.querySelector('[contenteditable]')?.focus();
      }));
    }

    /* Certificates */
    const certGrid = document.querySelector('.cert-grid');
    if (certGrid) {
      certGrid.querySelectorAll(':scope > .cert-card').forEach(card => {
        card.style.position = 'relative';
        if (!card.querySelector('.admin-delete-btn')) card.appendChild(mkDelete(card, 'Remove certificate'));
        card.querySelectorAll('.cert-title,.cert-issuer').forEach(editable);
      });
      if (!certGrid.querySelector('.admin-add-btn')) certGrid.appendChild(mkAdd('Add Certificate', () => {
        const card = makeCertCard(); card.style.position = 'relative';
        card.appendChild(mkDelete(card, 'Remove certificate'));
        certGrid.insertBefore(card, certGrid.querySelector('.admin-add-btn'));
        card.querySelector('[contenteditable]')?.focus();
      }));
    }

    /* Skills */
    const skillsList = document.querySelector('.skills-list');
    if (skillsList) {
      skillsList.querySelectorAll(':scope > .skill-row').forEach(row => {
        row.style.position = 'relative';
        if (!row.querySelector('.admin-delete-btn')) row.appendChild(mkDelete(row, 'Remove category'));
        editable(row.querySelector('.skill-label'));
        injectSkillIconControls(row.querySelector('.skill-icons'));
      });
      if (!skillsList.querySelector('.admin-add-btn')) skillsList.appendChild(mkAdd('Add Skill Category', () => {
        const row = makeSkillRow(); row.style.position = 'relative';
        row.appendChild(mkDelete(row, 'Remove category'));
        editable(row.querySelector('.skill-label'));
        injectSkillIconControls(row.querySelector('.skill-icons'));
        skillsList.insertBefore(row, skillsList.querySelector('.admin-add-btn'));
        row.querySelector('[contenteditable]')?.focus();
      }));
    }
  }

  function removeControls() {
    document.querySelectorAll('.' + AC).forEach(el => el.remove());
    document.querySelectorAll('[contenteditable="true"]').forEach(el => el.contentEditable = 'false');
    document.querySelectorAll('.exp-item,.project-card,.edu-item,.cert-card,.skill-row,.skill-icon').forEach(el => {
      el.style.removeProperty('position');
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    });
  }

  /* ── Enter / exit admin mode ── */
  function enterAdminMode() {
    document.body.classList.add('admin-mode');
    document.querySelectorAll('[data-editable]').forEach(el => { if (!isInList(el)) editable(el); });
    injectControls();
    adminToolbar.classList.add('visible');
    adminLoginBtn.style.display = 'none';
  }

  function exitAdminMode() {
    document.body.classList.remove('admin-mode');
    removeControls();
    adminToolbar.classList.remove('visible');
    adminLoginBtn.style.display = '';
    sessionStorage.removeItem(TOKEN_KEY);
    newPhotoUrl = null;
  }

  if (sessionStorage.getItem(TOKEN_KEY)) enterAdminMode();

  /* ── Login modal events ── */
  adminLoginBtn.addEventListener('click', () => adminModal.classList.add('open'));
  adminModalClose.addEventListener('click', () => adminModal.classList.remove('open'));
  adminModal.addEventListener('click', e => { if (e.target === adminModal) adminModal.classList.remove('open'); });

  adminLoginForm.addEventListener('submit', async e => {
    e.preventDefault(); adminLoginError.textContent = '';
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { adminLoginError.textContent = data.error || 'Invalid credentials.'; return; }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      adminModal.classList.remove('open'); adminLoginForm.reset(); enterAdminMode();
    } catch { adminLoginError.textContent = 'Connection error. Try again.'; }
  });

  /* ── Save ── */
  adminSaveBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem(TOKEN_KEY); if (!token) return;
    const content = {};

    // Non-list text fields
    document.querySelectorAll('[data-editable]').forEach(el => {
      if (!isInList(el)) content[el.dataset.editable] = el.innerHTML;
    });

    // Profile photo
    const photo = newPhotoUrl || loadedPhotoUrl;
    if (photo) content['profile-photo'] = photo;

    // List containers — clone DOM, strip admin UI, save innerHTML
    Object.entries(LIST_CONTAINERS).forEach(([key, sel]) => {
      const el = document.querySelector(sel); if (!el) return;
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.' + AC).forEach(x => x.remove());
      clone.querySelectorAll('[contenteditable]').forEach(x => { x.removeAttribute('contenteditable'); x.removeAttribute('spellcheck'); });
      clone.querySelectorAll('[style]').forEach(x => {
        x.style.removeProperty('position');
        if (!x.getAttribute('style')?.trim()) x.removeAttribute('style');
      });
      content[key] = clone.innerHTML;
    });

    const orig = adminSaveBtn.textContent;
    adminSaveBtn.textContent = 'Saving…'; adminSaveBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(content),
      });
      if (res.ok) {
        adminSaveBtn.textContent = '✓ Saved & Live!';
        if (newPhotoUrl) { loadedPhotoUrl = newPhotoUrl; newPhotoUrl = null; }
      } else { adminSaveBtn.textContent = 'Save Failed'; }
    } catch { adminSaveBtn.textContent = 'Save Failed'; }
    setTimeout(() => { adminSaveBtn.textContent = orig; adminSaveBtn.disabled = false; }, 2200);
  });

  /* ── Logout ── */
  adminLogoutBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) await fetch('/api/admin/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => {});
    exitAdminMode();
  });
})();
