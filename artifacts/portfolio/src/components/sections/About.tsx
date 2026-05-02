import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Code2, Brain, Trophy } from "lucide-react";

const STATS = [
  { icon: Trophy, value: "200+", label: "LeetCode Problems" },
  { icon: Brain, value: "3+", label: "Internships" },
  { icon: Code2, value: "8+", label: "CGPA" },
];

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -40]);
  const imgRotate = useTransform(scrollYProgress, [0, 0.4, 0.7], [6, 0, -3]);
  const imgScale = useTransform(scrollYProgress, [0, 0.3], [0.85, 1]);

  return (
    <section id="about" ref={ref} className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <span className="text-primary font-mono text-sm tracking-widest uppercase">Who I Am</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-2">About Me</h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-16 items-center">
        <motion.div ref={imgRef} style={{ y: imgY, rotate: imgRotate, scale: imgScale }} className="relative mx-auto w-72 h-72 md:w-80 md:h-80 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(188 86% 53% / 0.2), hsl(271 91% 65% / 0.2))",
              filter: "blur(20px)",
              transform: "scale(1.08)",
            }}
          />
          <div className="absolute inset-0 rounded-2xl overflow-hidden border border-primary/20 bg-card">
            <svg viewBox="0 0 300 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aboutBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(222, 47%, 7%)" />
                  <stop offset="100%" stopColor="hsl(217, 33%, 10%)" />
                </linearGradient>
                <linearGradient id="aboutSkin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c8a882" />
                  <stop offset="100%" stopColor="#b8966a" />
                </linearGradient>
                <linearGradient id="aboutBody" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(188, 60%, 18%)" />
                  <stop offset="100%" stopColor="hsl(217, 50%, 15%)" />
                </linearGradient>
              </defs>
              <rect width="300" height="300" fill="url(#aboutBg)" />
              <circle cx="150" cy="110" r="52" fill="url(#aboutSkin)" />
              <path d="M50 300 Q50 200 150 200 Q250 200 250 300" fill="url(#aboutBody)" />
              <rect x="120" y="140" width="60" height="8" rx="4" fill="hsl(188 86% 53% / 0.5)" />
              <text x="150" y="270" textAnchor="middle" fill="hsl(188, 86%, 53%)" fontSize="12" fontFamily="JetBrains Mono" opacity="0.8">Parshant Yadav</text>
              <circle cx="150" cy="110" r="52" fill="none" stroke="hsl(188, 86%, 53%)" strokeWidth="1" strokeOpacity="0.2" />
            </svg>
          </div>
          <motion.div
            className="absolute -bottom-4 -right-4 glass-panel px-3 py-2 rounded-xl border border-primary/20 text-xs font-mono"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            <span className="text-primary">B.Tech CSE</span>{" "}
            <span className="text-muted-foreground">AI & ML</span>
          </motion.div>
        </motion.div>

        <div className="space-y-6">
          <motion.p
            className="text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Hi! I am Parshant Yadav, a B.Tech CSE student specializing in Artificial Intelligence and Machine Learning. Based in Gurgaon, India, I am passionate about engineering real-world software projects, solving algorithmic challenges, and exploring scalable cloud technologies.
          </motion.p>
          <motion.p
            className="text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            With robust hands-on experience in Python, Data Structures and Algorithms, Full Stack Web Development, and building intelligent AI/ML models, I thrive on turning complex ideas into working, high-performance solutions.
          </motion.p>

          <motion.div
            className="grid grid-cols-3 gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {STATS.map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={label}
                className="glass-panel rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors"
                whileHover={{ scale: 1.04, y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
                data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon size={18} className="text-primary mx-auto mb-2" />
                <div className="text-xl font-bold font-mono text-primary">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
