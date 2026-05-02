import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Award, ExternalLink } from "lucide-react";

const CERTS = [
  {
    title: "AI for Everyone",
    issuer: "Coursera",
    verified: true,
    href: "https://coursera.org/verify/4LCPNYZJLWYG",
    color: "hsl(188 86% 53%)",
    icon: "AI",
  },
  {
    title: "Web Development",
    issuer: "Coursera",
    verified: true,
    href: "https://coursera.org/verify/AKRB3YPHL2PZ",
    color: "hsl(271 91% 65%)",
    icon: "WEB",
  },
  {
    title: "Technical Fundamentals",
    issuer: "IBM",
    verified: true,
    href: "#",
    color: "hsl(316 73% 52%)",
    icon: "IBM",
  },
  {
    title: "Python 5 Star",
    issuer: "HackerRank",
    verified: true,
    href: "#",
    color: "hsl(280 65% 60%)",
    icon: "PY",
  },
];

export default function Certificates() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="certificates" ref={ref} className="py-24 px-6 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 80% 60%, hsl(316 73% 52% / 0.04) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">Credentials</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Certificates</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {CERTS.map((cert, i) => (
            <motion.a
              key={cert.title}
              href={cert.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative glass-panel rounded-2xl p-6 border border-border flex flex-col items-center text-center hover:border-opacity-50 transition-all overflow-hidden"
              style={{ borderColor: `${cert.color}20` }}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.04, y: -4 }}
              data-testid={`cert-${i}`}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(135deg, ${cert.color}08, transparent)` }}
              />
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${cert.color}, transparent)` }}
              />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 font-mono font-bold text-sm relative z-10"
                style={{
                  background: `${cert.color}15`,
                  border: `1px solid ${cert.color}30`,
                  color: cert.color,
                  boxShadow: `0 0 16px ${cert.color}20`,
                }}
              >
                {cert.icon}
              </div>

              <Award size={14} style={{ color: cert.color }} className="mb-2 relative z-10" />
              <h3 className="font-semibold text-sm text-foreground mb-1 relative z-10 leading-tight">{cert.title}</h3>
              <p className="text-xs text-muted-foreground relative z-10">{cert.issuer}</p>

              {cert.verified && (
                <div
                  className="mt-3 px-2 py-0.5 rounded-full text-xs font-mono relative z-10"
                  style={{ background: `${cert.color}12`, color: cert.color, border: `1px solid ${cert.color}25` }}
                >
                  Verified
                </div>
              )}

              <ExternalLink size={10} className="absolute top-3 right-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
