import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Github, Linkedin, Mail, MessageCircle, MapPin, ChevronDown } from "lucide-react";
import NeuralBackground from "@/components/NeuralBackground";

const TITLES = ["AI/ML Engineer", "Full Stack Developer", "Problem Solver", "DSA Enthusiast"];

function TypingText() {
  const [titleIdx, setTitleIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      const t = setTimeout(() => { setDeleting(true); setPaused(false); }, 1800);
      return () => clearTimeout(t);
    }
    const current = TITLES[titleIdx];
    if (!deleting) {
      if (displayed.length < current.length) {
        const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 80);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setTitleIdx((i) => (i + 1) % TITLES.length);
      }
    }
  }, [displayed, deleting, paused, titleIdx]);

  return (
    <span className="text-primary font-mono">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

const SOCIALS = [
  { icon: Github, href: "https://github.com/parshant786yadav", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/parshant786", label: "LinkedIn" },
  { icon: MessageCircle, href: "http://wa.me/+918826448907", label: "WhatsApp" },
  { icon: Mail, href: "mailto:Parshant786yadav@gmail.com", label: "Email" },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const rotateX = useTransform(springY, [-300, 300], [8, -8]);
  const rotateY = useTransform(springX, [-300, 300], [-8, 8]);
  const moveX = useTransform(springX, [-300, 300], [-15, 15]);
  const moveY = useTransform(springY, [-300, 300], [-15, 15]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left - rect.width / 2);
      mouseY.set(e.clientY - rect.top - rect.height / 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <NeuralBackground />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(188 86% 53% / 0.06) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 20%, hsl(271 91% 65% / 0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Open to opportunities
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Parshant{" "}
            <span
              className="glow-text"
              style={{
                background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(271 91% 65%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Yadav
            </span>
          </motion.h1>

          <motion.div
            className="text-xl md:text-2xl font-medium text-muted-foreground mb-4 h-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <TypingText />
          </motion.div>

          <motion.p
            className="text-muted-foreground max-w-md mx-auto lg:mx-0 mb-4 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Web development is my warm-up. I love solving DSA challenges and exploring AI & ML.
          </motion.p>

          <motion.div
            className="flex items-center gap-1.5 text-muted-foreground text-sm justify-center lg:justify-start mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <MapPin size={14} className="text-primary" />
            <span>Gurgaon, India</span>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={scrollToProjects}
              data-testid="button-view-projects"
              className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(271 91% 65%))",
                color: "hsl(222 47% 4%)",
                boxShadow: "0 0 20px hsl(188 86% 53% / 0.3)",
              }}
            >
              View Projects
            </button>
            <div className="relative group">
              <button
                data-testid="button-download-resume"
                className="px-6 py-2.5 rounded-xl font-medium text-sm border border-border text-muted-foreground cursor-not-allowed opacity-60"
              >
                Download Resume
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Login to download
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 justify-center lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {SOCIALS.map(({ icon: Icon, href, label }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-${label.toLowerCase()}`}
                aria-label={label}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-200"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={18} />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-shrink-0"
          style={{ rotateX, rotateY, x: moveX, y: moveY, transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="relative w-64 h-64 md:w-80 md:h-80"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          >
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: "linear-gradient(135deg, hsl(188 86% 53% / 0.3), hsl(271 91% 65% / 0.3))",
                filter: "blur(30px)",
                transform: "scale(1.1)",
              }}
            />
            <div
              className="absolute inset-0 rounded-3xl border border-primary/20"
              style={{ background: "hsl(222 47% 6%)" }}
            />
            <div className="absolute inset-0 rounded-3xl overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(188, 86%, 53%)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(271, 91%, 65%)" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(217, 33%, 20%)" />
                    <stop offset="100%" stopColor="hsl(222, 47%, 12%)" />
                  </linearGradient>
                  <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c8a882" />
                    <stop offset="100%" stopColor="#b8966a" />
                  </linearGradient>
                </defs>
                <rect width="200" height="200" fill="url(#avatarGrad)" />
                <circle cx="100" cy="72" r="34" fill="url(#skinGrad)" />
                <path d="M38 180 Q38 130 100 130 Q162 130 162 180" fill="url(#bodyGrad)" />
                <circle cx="100" cy="72" r="34" fill="none" stroke="hsl(188, 86%, 53%)" strokeWidth="0.5" strokeOpacity="0.3" />
                <text x="100" y="165" textAnchor="middle" fill="hsl(188, 86%, 53%)" fontSize="9" fontFamily="JetBrains Mono" opacity="0.6">AI/ML Engineer</text>
              </svg>
            </div>

            <motion.div
              className="absolute -top-3 -right-3 px-3 py-1.5 rounded-xl text-xs font-mono border border-primary/30 bg-card"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ boxShadow: "0 0 12px hsl(188 86% 53% / 0.2)" }}
            >
              <span className="text-primary">200+</span>{" "}
              <span className="text-muted-foreground">LeetCode</span>
            </motion.div>

            <motion.div
              className="absolute -bottom-3 -left-3 px-3 py-1.5 rounded-xl text-xs font-mono border border-accent/30 bg-card"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              style={{ boxShadow: "0 0 12px hsl(271 91% 65% / 0.2)" }}
            >
              <span className="text-accent">8+</span>{" "}
              <span className="text-muted-foreground">CGPA</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown size={24} className="text-muted-foreground/50" />
      </motion.div>
    </section>
  );
}
