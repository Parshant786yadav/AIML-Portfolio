import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Github, Linkedin, Mail, MessageCircle, ExternalLink } from "lucide-react";

function LiveTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const t = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTime(t + " IST");
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-muted-foreground">{time}</span>;
}

const SOCIALS = [
  { icon: Github, href: "https://github.com/parshant786yadav", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/parshant786", label: "LinkedIn" },
  { icon: MessageCircle, href: "http://wa.me/+918826448907", label: "WhatsApp" },
  { icon: Mail, href: "mailto:Parshant786yadav@gmail.com", label: "Email" },
];

export default function Profile() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pt-10 pb-8"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="relative flex-shrink-0">
          <div
            className="w-16 h-16 rounded-full overflow-hidden border border-border"
            data-testid="profile-avatar"
          >
            <svg viewBox="0 0 64 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" fill="hsl(0 0% 8%)" />
              <circle cx="32" cy="24" r="12" fill="hsl(0 0% 20%)" />
              <path d="M8 64 Q8 44 32 44 Q56 44 56 64" fill="hsl(0 0% 16%)" />
              <circle cx="32" cy="24" r="12" fill="none" stroke="hsl(142 71% 45% / 0.3)" strokeWidth="1" />
            </svg>
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background"
            style={{ background: "hsl(142 71% 45%)" }}
            title="Open to opportunities"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-foreground">Parshant Yadav</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">AI/ML Engineer</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} />
              Gurgaon, IN
            </span>
            <LiveTime />
          </div>
        </div>
      </div>

      <div className="text-sm text-foreground/80 leading-relaxed mb-6 space-y-3">
        <p>
          I'm <span className="text-foreground font-medium">Parshant</span>, an{" "}
          <span className="text-primary font-medium">AI/ML engineer</span> and B.Tech CSE (AI & ML) student at MDU University, graduating in 2026. I build intelligent systems — from{" "}
          <span className="text-foreground font-medium">RAG pipelines</span> and{" "}
          <span className="text-foreground font-medium">NLP models</span> to full-stack AI products that solve real problems.
        </p>
        <p>
          Currently interning as a <span className="text-foreground font-medium">Software QA Engineer at NxCar</span>, previously an{" "}
          <span className="text-foreground font-medium">AI Intern at IBM</span> where I worked on cloud-based AI solutions. I've solved{" "}
          <span className="text-primary font-mono font-medium">200+</span> DSA problems on LeetCode and maintain an{" "}
          <span className="text-primary font-mono font-medium">8+ CGPA</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="social-links">
        {SOCIALS.map(({ icon: Icon, href, label }) => (
          <motion.a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`social-${label.toLowerCase()}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-all font-mono"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={12} />
            {label}
          </motion.a>
        ))}
        <motion.a
          href="https://leetcode.com/parshant786yadav"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="social-leetcode"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-all font-mono"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ExternalLink size={12} />
          LeetCode
        </motion.a>
      </div>
    </motion.section>
  );
}
