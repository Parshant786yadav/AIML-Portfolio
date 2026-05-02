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
const chatContactLink = document.getElementById('chat-contact-link');

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

chatContactLink.addEventListener('click', () => {
  toggleChat();
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
});

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

const DIFY_API_KEY = 'dm_0cfb3ba8c1663aa8_33492fce67bf6134d89fbc273b9c2184';
const DIFY_API_URL = 'https://api.dify.ai/v1/chat-messages';
let conversationId = '';

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatSend.disabled = true;
  chatInput.disabled = true;
  appendMsg(text, 'user');
  showTyping();

  try {
    const res = await fetch(DIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: text,
        response_mode: 'blocking',
        conversation_id: conversationId,
        user: 'portfolio-visitor',
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    if (data.conversation_id) conversationId = data.conversation_id;
    removeTyping();
    appendMsg(data.answer || 'Sorry, I could not get a response.', 'bot');
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
