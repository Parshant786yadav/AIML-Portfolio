import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'parshant-yadav-portfolio.pdf');

const doc = new PDFDocument({ margin: 45, size: 'A4' });
doc.pipe(fs.createWriteStream(outPath));

const W = 595 - 90; // usable width
const GREEN  = '#16a34a';
const DARK   = '#111111';
const GRAY   = '#555555';
const LIGHT  = '#888888';
const BLUE   = '#2563eb';
const BORDER = '#e5e7eb';

function hr(y, color = BORDER) {
  doc.moveTo(45, y).lineTo(550, y).strokeColor(color).lineWidth(0.5).stroke();
}

function sectionTitle(title, color = GREEN) {
  doc.moveDown(0.6);
  const y = doc.y;
  doc.rect(45, y, 3, 14).fill(color);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK)
     .text(title.toUpperCase(), 53, y + 2, { characterSpacing: 0.8 });
  doc.moveDown(0.5);
}

function tag(text, x, y, green = false) {
  const tw = doc.font('Helvetica-Bold').fontSize(7).widthOfString(text) + 8;
  doc.rect(x, y - 1, tw, 12).fill(green ? '#dcfce7' : '#f3f4f6');
  doc.fillColor(green ? GREEN : GRAY).font('Helvetica-Bold').fontSize(7).text(text, x + 4, y + 1);
  return tw + 4;
}

// ── HEADER ──────────────────────────────────────────────────
doc.font('Helvetica-Bold').fontSize(22).fillColor(DARK).text('Parshant Yadav', 45, 45);
doc.font('Helvetica').fontSize(11).fillColor(GREEN).text('AI/ML Engineer  ·  B.Tech CSE (AI & ML)', 45, 72);

doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
doc.text('📍 Gurgaon, India   ✉  parshant786yadav@gmail.com   📞 +91 8826448907', 45, 90);
doc.text('GitHub: github.com/parshant786yadav     LinkedIn: linkedin.com/in/parshant786     LeetCode: leetcode.com/parshant786yadav', 45, 103);

// Stats block top-right
doc.font('Helvetica-Bold').fontSize(20).fillColor(GREEN).text('200+', 455, 52, { width: 90, align: 'center' });
doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT).text('LeetCode solved', 455, 76, { width: 90, align: 'center' });
doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('CGPA 8+', 455, 92, { width: 90, align: 'center' });
doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT).text('MDU University', 455, 108, { width: 90, align: 'center' });

hr(120);

// Bio
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
   .text("I'm Parshant, an AI/ML engineer and B.Tech CSE (AI & ML) student at MDU University, graduating in 2026. I build intelligent systems — from RAG pipelines and NLP models to full-stack AI products that solve real problems. Currently interning as a Software QA Engineer at NxCar, previously an AI Intern at IBM where I worked on cloud-based AI solutions.", 45, doc.y, { width: W, lineGap: 2 });

// ── WORK EXPERIENCE ────────────────────────────────────────
sectionTitle('Work Experience');

const jobs = [
  {
    role: 'Software QA Engineer Intern', company: '@ NxCar', period: 'Aug 2025 – Present  ·  Gurgaon (On-site)',
    desc: 'Optimized backend logic and debugged performance bottlenecks in collaboration with developers. Worked across the full backend stack ensuring API reliability and data integrity.',
    tags: ['Python', 'Backend', 'APIs', 'MySQL', 'QA'],
  },
  {
    role: 'Artificial Intelligence Intern', company: '@ IBM', period: 'July 2025 – Aug 2025  ·  Remote',
    desc: 'Built AI-based solutions using Python and IBM Cloud tools. Worked on NLP pipelines to automate business workflows and improve decision-making systems.',
    tags: ['Python', 'NLP', 'IBM Cloud', 'AI/ML', 'Watson'],
  },
  {
    role: 'Freelance Web Developer', company: '@ Self-employed', period: 'Aug 2024 – July 2025  ·  Remote',
    desc: 'Delivered production-ready websites for multiple clients. Integrated AI-powered features including chatbots and smart form handling into client projects.',
    tags: ['React', 'Node.js', 'Firebase', 'APIs', 'Tailwind CSS'],
  },
];

jobs.forEach((j, i) => {
  const y0 = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(j.role, 45, y0, { continued: true });
  doc.font('Helvetica').fontSize(8.5).fillColor(GREEN).text('  ' + j.company);
  doc.font('Helvetica').fontSize(8).fillColor(LIGHT).text(j.period, 45, doc.y - 2, { align: 'right', width: W });
  doc.moveUp();
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(j.desc, 45, doc.y + 12, { width: W, lineGap: 1.5 });
  // tags
  doc.moveDown(0.3);
  let tx = 45;
  const ty = doc.y;
  j.tags.forEach(t => { tx += tag(t, tx, ty, true) + 2; });
  doc.moveDown(1.0);
  if (i < jobs.length - 1) hr(doc.y - 6);
});

// ── PROJECTS ──────────────────────────────────────────────
sectionTitle('Projects');

const projects = [
  {
    name: 'DocuMind', badge: 'RAG Pipeline', badgeColor: GREEN,
    sub: 'RAG-based PDF Intelligence Engine',
    desc: 'Production-grade document intelligence system built on Retrieval-Augmented Generation. Upload any PDF, and DocuMind embeds it into a vector store, retrieves semantically relevant chunks, and feeds them into an LLM to generate precise, context-aware answers. No hallucinations — only grounded responses.',
    link: 'github.com/parshant786yadav',
    tags: ['FastAPI', 'Python', 'RAG', 'LangChain', 'Vector DB', 'LLM', 'NLP'],
  },
  {
    name: 'HireWise', badge: 'NLP Matching', badgeColor: BLUE,
    sub: 'NLP Resume Screening Engine',
    desc: 'Automated recruitment intelligence system that uses NLP and semantic similarity to match candidate resumes against job descriptions. Extracts entities, scores relevance, and ranks candidates — eliminating manual screening bias.',
    link: 'github.com/parshant786yadav/Resume-Screening-App',
    tags: ['Python', 'NLP', 'spaCy', 'Scikit-learn', 'TF-IDF', 'ML'],
  },
  {
    name: 'AI Portfolio Chatbot', badge: 'LLM-powered', badgeColor: '#d97706',
    sub: 'Conversational AI Assistant',
    desc: "Embedded LLM-powered chatbot trained on personal data — projects, skills, and experience. Visitors can ask natural language questions about Parshant's background and get instant, accurate answers. Built with a FastAPI backend and a streaming response interface.",
    link: 'parshantyadav.com',
    tags: ['FastAPI', 'Python', 'LLM', 'Prompt Engineering', 'REST API'],
  },
];

projects.forEach((p, i) => {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(p.name, 45, doc.y, { continued: true });
  doc.font('Helvetica').fontSize(8).fillColor(p.badgeColor).text('  [ ' + p.badge + ' ]');
  doc.font('Helvetica').fontSize(8).fillColor(LIGHT).text(p.sub, 45, doc.y);
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(p.desc, 45, doc.y + 2, { width: W, lineGap: 1.5 });
  doc.font('Helvetica').fontSize(8).fillColor(BLUE).text(p.link, 45, doc.y + 2);
  doc.moveDown(0.3);
  let tx = 45; const ty = doc.y;
  p.tags.forEach(t => { tx += tag(t, tx, ty) + 2; });
  doc.moveDown(1.0);
  if (i < projects.length - 1) hr(doc.y - 6);
});

// ── SKILLS ────────────────────────────────────────────────
sectionTitle('Skills');

const skillRows = [
  { label: 'AI / ML',        color: GREEN,    skills: 'Python · PyTorch · TensorFlow · FastAPI · LangChain · RAG · NLP · Vector DBs · IBM Watson · Prompt Engineering' },
  { label: 'Frontend',       color: BLUE,     skills: 'HTML · CSS · JavaScript · TypeScript · React · Tailwind CSS' },
  { label: 'Backend & Data', color: '#7c3aed', skills: 'Node.js · Express · MySQL · Firebase · REST APIs' },
  { label: 'Tools',          color: '#d97706', skills: 'Git · GitHub · VS Code · PyCharm · Linux · C++ · Java · npm' },
];

skillRows.forEach(r => {
  const y0 = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(r.color).text(r.label, 45, y0, { width: 90 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(r.skills, 140, y0, { width: W - 95 });
  doc.moveDown(0.45);
});

// ── EDUCATION ──────────────────────────────────────────────
sectionTitle('Education');

const edu = [
  { deg: 'B.Tech — Computer Science & Engineering (AI & ML)', school: 'MDU University', score: 'CGPA 8+', period: '2022 – 2026' },
  { deg: 'Senior Secondary (XII)', school: 'RPS School', score: '83%', period: '2020 – 2022' },
  { deg: 'Secondary (X)', school: 'Suraj School', score: '76.6%', period: '2018 – 2020' },
];

edu.forEach((e, i) => {
  const y0 = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(e.deg, 45, y0, { width: 350 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN).text(e.score, 400, y0, { width: 75, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor(LIGHT).text(e.period, 480, y0, { width: 70, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor(LIGHT).text(e.school, 45, doc.y);
  doc.moveDown(0.6);
  if (i < edu.length - 1) hr(doc.y - 4);
});

// ── CERTIFICATES ───────────────────────────────────────────
sectionTitle('Certificates');

const certs = [
  { title: 'AI for Everyone', issuer: 'Coursera', url: 'coursera.org/verify/4LCPNYZJLWYG' },
  { title: 'Web Development', issuer: 'Coursera', url: 'coursera.org/verify/AKRB3YPHL2PZ' },
  { title: 'Technical Fundamentals', issuer: 'IBM', url: '' },
  { title: 'Python (5 Star)', issuer: 'HackerRank', url: '' },
];

const colW = (W) / 4;
const cy = doc.y;
certs.forEach((c, i) => {
  const cx = 45 + i * (colW + 4);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text(c.title, cx, cy, { width: colW });
  doc.font('Helvetica').fontSize(8).fillColor(GREEN).text(c.issuer + '  · verified', cx, cy + 13, { width: colW });
  if (c.url) doc.font('Helvetica').fontSize(7).fillColor(BLUE).text(c.url, cx, cy + 24, { width: colW });
});
doc.moveDown(3.2);

// ── LEETCODE ───────────────────────────────────────────────
sectionTitle('DSA / LeetCode');

const lcy = doc.y;
const lcStats = [
  { val: '200+', label: 'Total Solved', color: GREEN },
  { val: '90+',  label: 'Easy',         color: GREEN },
  { val: '90+',  label: 'Medium',       color: '#d97706' },
  { val: '20+',  label: 'Hard',         color: '#ef4444' },
];
lcStats.forEach((s, i) => {
  const sx = 45 + i * 65;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(s.color).text(s.val, sx, lcy, { width: 60, align: 'center' });
  doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT).text(s.label, sx, lcy + 20, { width: 60, align: 'center' });
});
doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
   .text('Profile: leetcode.com/parshant786yadav  ·  Username: parshant786yadav\nConsistent problem solver focused on algorithms & data structures.', 310, lcy + 2, { width: 240, lineGap: 2 });
doc.moveDown(3.5);

// ── PORTFOLIO GUIDE ────────────────────────────────────────
hr(doc.y, '#d1d5db');
doc.moveDown(0.6);

// Section heading with blue bar
doc.rect(45, doc.y, 3, 14).fill(BLUE);
doc.font('Helvetica-Bold').fontSize(10).fillColor(BLUE)
   .text('PORTFOLIO GUIDE — FOR AI CHATBOT TRAINING', 53, doc.y + 2, { characterSpacing: 0.5 });
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).italics = true;
doc.text('Feed this document to ChatGPT / Claude / Gemini as context, then get your API key and connect it to the chatbot on your portfolio.', 45, doc.y, { width: W, lineGap: 1.5 });
doc.moveDown(0.6);

// Table header
const cols = [110, 80, W - 190];
const hx = [45, 155, 235];
const hy = doc.y;
doc.rect(45, hy - 3, W, 16).fill('#f8fafc');
['Portfolio Section', 'URL / Anchor', 'What Visitors Find Here'].forEach((h, i) => {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text(h, hx[i], hy + 1, { width: cols[i] });
});
doc.moveDown(0.9);
hr(doc.y - 2, '#e5e7eb');

const guideRows = [
  { sec: 'Hero / Profile',   url: '/ (homepage)',   info: 'Name, title, bio, location (Gurgaon), live IST clock, open-to-work badge, social links: GitHub, LinkedIn, WhatsApp, Email, LeetCode.' },
  { sec: 'Work Experience',  url: '#experience',    info: 'NxCar (QA Intern, Aug 2025–Present), IBM (AI Intern, July–Aug 2025), Freelance Web Dev (Aug 2024–July 2025). Each has role, dates, location, description, tech stack.' },
  { sec: 'Projects',         url: '#projects',      info: 'DocuMind (RAG PDF Q&A), HireWise (NLP resume screening – GitHub link available), AI Portfolio Chatbot (LLM-powered). Each card has description, tech stack, GitHub/live link.' },
  { sec: 'Skills',           url: '#skills',        info: 'AI/ML: Python, PyTorch, TensorFlow, FastAPI, LangChain, RAG, NLP, Vector DBs, IBM Watson, Prompt Eng. | Frontend: HTML, CSS, JS, TS, React, Tailwind | Backend: Node.js, Express, MySQL, Firebase, REST APIs | Tools: Git, GitHub, VS Code, PyCharm, Linux, C++, Java, npm.' },
  { sec: 'Education',        url: '#education',     info: 'B.Tech CSE AI & ML – MDU University (CGPA 8+, 2022–2026). Senior Secondary XII – RPS School (83%, 2020–2022). Secondary X – Suraj School (76.6%, 2018–2020).' },
  { sec: 'Certificates',     url: '#certificates',  info: 'AI for Everyone (Coursera, verified), Web Development (Coursera, verified), Technical Fundamentals (IBM, verified), Python 5 Star (HackerRank, verified).' },
  { sec: 'DSA / LeetCode',   url: '#leetcode',      info: '200+ total solved (90+ Easy, 90+ Medium, 20+ Hard). Username: parshant786yadav. Focus: algorithms & data structures.' },
  { sec: 'Contact Form',     url: '#contact',       info: 'EmailJS-powered (no backend needed). Sends directly to parshant786yadav@gmail.com. Fields: name, email, message. Chatbot also links here when API not available.' },
];

guideRows.forEach((r, i) => {
  const ry = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text(r.sec, hx[0], ry, { width: cols[0] });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BLUE).text(r.url, hx[1], ry, { width: cols[1] });
  doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(r.info, hx[2], ry, { width: cols[2], lineGap: 1.2 });
  const rowH = Math.max(doc.heightOfString(r.info, { width: cols[2], lineGap: 1.2 }), 12);
  doc.moveDown(0.2);
  if (i < guideRows.length - 1) hr(ry + rowH + 5);
  doc.moveDown(0.3);
});

// ── AI SYSTEM PROMPT BLOCK ─────────────────────────────────
doc.moveDown(0.6);
const bx = 45, bw = W, by = doc.y;
const promptText =
`You are Parshant Yadav's AI assistant on his portfolio website. Answer visitor questions about Parshant accurately and helpfully.

ABOUT: Parshant Yadav | AI/ML Engineer | Gurgaon, India | parshant786yadav@gmail.com | +91 8826448907
GitHub: github.com/parshant786yadav | LinkedIn: linkedin.com/in/parshant786 | LeetCode: parshant786yadav

EXPERIENCE:
• Software QA Engineer Intern @ NxCar (Aug 2025–Present, Gurgaon): Backend optimization, API reliability, MySQL, QA testing
• AI Intern @ IBM (July–Aug 2025, Remote): NLP pipelines, IBM Cloud, Watson AI, Python, business automation
• Freelance Web Developer (Aug 2024–July 2025): React, Node.js, Firebase, AI chatbot integrations for clients

PROJECTS:
• DocuMind: RAG-based PDF Q&A engine — FastAPI, LangChain, Vector DB, LLM, Python. No hallucinations, grounded answers.
• HireWise: NLP resume screening — Python, spaCy, Scikit-learn, TF-IDF. GitHub: github.com/parshant786yadav/Resume-Screening-App
• AI Portfolio Chatbot: LLM-powered personal assistant — FastAPI, Prompt Engineering, REST API

SKILLS: Python, PyTorch, TensorFlow, FastAPI, LangChain, RAG, NLP, Vector DBs, IBM Watson, HTML, CSS, JS, TypeScript, React, Tailwind, Node.js, Express, MySQL, Firebase, Git, GitHub, C++, Java

EDUCATION: B.Tech CSE AI&ML MDU University (CGPA 8+, 2022-2026) | XII RPS School 83% | X Suraj School 76.6%
CERTIFICATES: AI for Everyone (Coursera) | Web Development (Coursera) | Technical Fundamentals (IBM) | Python 5★ (HackerRank)
LEETCODE: 200+ solved — 90+ Easy, 90+ Medium, 20+ Hard

Rules: Be friendly and concise. For contact questions, share parshant786yadav@gmail.com or suggest the contact form on the website.`;

const ph = doc.heightOfString(promptText, { width: bw - 24, lineGap: 1.8 }) + 30;
doc.rect(bx, by, bw, ph).fill('#f0fdf4');
doc.rect(bx, by, 3, ph).fill(GREEN);
doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534')
   .text('💡  SYSTEM PROMPT — Paste this into ChatGPT / Claude / Gemini to power the portfolio chatbot:', bx + 10, by + 8, { width: bw - 20 });
doc.font('Helvetica').fontSize(7.8).fillColor('#166534')
   .text(promptText, bx + 10, by + 22, { width: bw - 20, lineGap: 1.8 });

doc.moveDown(0.5);
doc.y = by + ph + 8;

// ── FOOTER ─────────────────────────────────────────────────
hr(doc.y, BORDER);
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(8).fillColor(LIGHT)
   .text('Parshant Yadav — AI/ML Portfolio  ·  Generated May 2026', 45, doc.y, { continued: true, width: 300 });
doc.fillColor(GREEN).text('parshant786yadav@gmail.com', { align: 'right', width: W - 300 });

doc.end();
console.log('✅  PDF saved to:', outPath);
