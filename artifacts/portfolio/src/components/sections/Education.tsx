import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { GraduationCap } from "lucide-react";

const EDUCATION = [
  {
    degree: "B.Tech in CSE (AI & ML)",
    school: "MDU University",
    period: "2022 – 2026",
    score: "CGPA: 8+",
    color: "hsl(188 86% 53%)",
  },
  {
    degree: "Senior Secondary (XII)",
    school: "RPS School",
    period: "2020 – 2022",
    score: "Score: 83%",
    color: "hsl(271 91% 65%)",
  },
  {
    degree: "Secondary (X)",
    school: "Suraj School",
    period: "2018 – 2020",
    score: "Score: 76.6%",
    color: "hsl(316 73% 52%)",
  },
];

export default function Education() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="education" ref={ref} className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">My Background</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Education</h2>
        </motion.div>

        <div className="space-y-6">
          {EDUCATION.map((edu, i) => (
            <motion.div
              key={edu.degree}
              className="relative glass-panel rounded-2xl p-6 border border-border hover:border-opacity-50 transition-all group overflow-hidden"
              style={{ borderColor: `${edu.color}20` }}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ scale: 1.01, y: -2 }}
              data-testid={`education-${i}`}
            >
              <div
                className="absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl"
                style={{ background: edu.color }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${edu.color}06, transparent)` }}
              />
              <div className="pl-4 flex items-center justify-between flex-wrap gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${edu.color}15` }}
                  >
                    <GraduationCap size={18} style={{ color: edu.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{edu.degree}</h3>
                    <p className="text-muted-foreground text-sm">{edu.school}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold" style={{ color: edu.color }}>{edu.score}</div>
                  <div className="text-muted-foreground text-xs font-mono mt-0.5">{edu.period}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
