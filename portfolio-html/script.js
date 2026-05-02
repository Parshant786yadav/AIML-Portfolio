'use strict';

/* ── Theme ── */
const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function getStoredTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    html.classList.add('dark');
    themeIcon.textContent = '☀';
    themeToggle.title = 'Switch to light mode';
  } else {
    html.classList.remove('dark');
    themeIcon.textContent = '☾';
    themeToggle.title = 'Switch to dark mode';
  }
  localStorage.setItem('theme', theme);
}

applyTheme(getStoredTheme());

themeToggle.addEventListener('click', () => {
  const next = html.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
});

/* ── Scroll Progress Bar ── */
const progressBar = document.getElementById('scroll-progress');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? scrollTop / docHeight : 0;
  progressBar.style.transform = `scaleX(${pct})`;
}, { passive: true });

/* ── Sticky Navbar ── */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* ── Smooth Scroll for Nav Links ── */
document.querySelectorAll('a[href^="#"], .nav-link').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    // Close mobile nav if open
    const mobileNav = document.getElementById('mobile-nav');
    mobileNav.classList.remove('open');
  });
});

/* ── Mobile Menu ── */
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');

mobileMenuBtn.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  mobileMenuBtn.textContent = isOpen ? '✕' : '☰';
});

/* ── Live IST Clock ── */
const liveTime = document.getElementById('live-time');

function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  liveTime.textContent = timeStr + ' IST';
}

updateTime();
setInterval(updateTime, 1000);

/* ── Fade-in on Scroll (Intersection Observer) ── */
const fadeEls = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

fadeEls.forEach(el => observer.observe(el));

/* ── LeetCode Bar Animations ── */
const barFills = document.querySelectorAll('.lc-bar-fill');

const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const pct = el.getAttribute('data-pct');
      // Small delay before animating
      setTimeout(() => { el.style.width = pct + '%'; }, 200);
      barObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

barFills.forEach(el => barObserver.observe(el));

/* ── Contact Form ── */
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  btnText.textContent = '⟳ sending...';
  await new Promise(r => setTimeout(r, 900));
  submitBtn.disabled = false;
  btnText.textContent = '↑ send message';
  form.reset();
  showToast('Message sent! Parshant will reply within 24 hours.');
});

/* ── Stagger fade-in delays ── */
document.querySelectorAll('.experience-item, .project-card, .skill-row, .edu-item, .cert-card').forEach((el, i) => {
  el.style.transitionDelay = (i * 0.07) + 's';
});
