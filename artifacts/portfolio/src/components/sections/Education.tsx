import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const EDUCATION = [
  {
    degree: "B.Tech — Computer Science & Engineering (AI & ML)",
    school: "MDU University",
    period: "2022 – 2026",
    score: "CGPA 8+",
  },
  {
    degree: "Senior Secondary (XII)",
    school: "RPS School",
    period: "2020 – 2022",
    score: "83%",
  },
  {
    degree: "Secondary (X)",
    school: "Suraj School",
    period: "2018 – 2020",
    score: "76.6%",
  },
];

export default function Education() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="education" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        education.
      </motion.h2>

      <div className="space-y-1">
        {EDUCATION.map((edu, i) => (
          <motion.div
            key={edu.degree}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0 group hover:bg-card/50 rounded-lg px-2 -mx-2 transition-colors"
            data-testid={`education-${i}`}
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-foreground font-medium leading-snug">{edu.degree}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{edu.school}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-mono text-primary font-medium">{edu.score}</div>
              <div className="text-xs font-mono text-muted-foreground/60 mt-0.5">{edu.period}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
