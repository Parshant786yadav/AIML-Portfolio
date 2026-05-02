import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const CERTS = [
  {
    title: "AI for Everyone",
    issuer: "Coursera",
    href: "https://coursera.org/verify/4LCPNYZJLWYG",
    verified: true,
  },
  {
    title: "Web Development",
    issuer: "Coursera",
    href: "https://coursera.org/verify/AKRB3YPHL2PZ",
    verified: true,
  },
  {
    title: "Technical Fundamentals",
    issuer: "IBM",
    href: "#",
    verified: true,
  },
  {
    title: "Python (5 Star)",
    issuer: "HackerRank",
    href: "#",
    verified: true,
  },
];

export default function Certificates() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="certificates" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        certificates.
      </motion.h2>

      <div className="grid grid-cols-2 gap-2">
        {CERTS.map((cert, i) => (
          <motion.a
            key={cert.title}
            href={cert.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="group rounded-lg border border-border p-3 hover:bg-card hover:border-border/80 transition-all"
            data-testid={`cert-${i}`}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-medium text-foreground leading-snug">{cert.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{cert.issuer}</p>
              </div>
              <ArrowUpRight
                size={12}
                className="text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5"
              />
            </div>
            {cert.verified && (
              <span className="tag tag-green mt-2 inline-flex">verified</span>
            )}
          </motion.a>
        ))}
      </div>
    </section>
  );
}
