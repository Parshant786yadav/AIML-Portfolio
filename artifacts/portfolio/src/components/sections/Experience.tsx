import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Briefcase, Calendar } from "lucide-react";

const EXPERIENCES = [
  {
    role: "Software QA Engineer Intern",
    company: "NxCar",
    type: "On-site",
    period: "Aug 2025 – Present",
    desc: "Optimized backend logic and debugged performance issues in collaboration with developers.",
    tags: ["Python", "Frontend", "Backend", "APIs", "MySQL"],
    color: "hsl(188 86% 53%)",
  },
  {
    role: "Artificial Intelligence Intern",
    company: "IBM",
    type: "Remote",
    period: "July 2025 – Aug 2025",
    desc: "Worked on AI-based solutions using Python and IBM Cloud tools to solve real-world business problems.",
    tags: ["Python", "NLP", "Cloud Tools"],
    color: "hsl(271 91% 65%)",
  },
  {
    role: "Freelance Web Developer",
    company: "Self-employed",
    type: "Remote",
    period: "Aug 2024 – July 2025",
    desc: "Created responsive websites for clients with modern UI/UX principles. Focused on speed and mobile-friendliness.",
    tags: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Firebase", "SQL"],
    color: "hsl(316 73% 52%)",
  },
];

export default function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="experience" ref={ref} className="py-24 px-6 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 70% 50%, hsl(188 86% 53% / 0.04) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">Where I've Worked</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Experience</h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

          <div className="space-y-12">
            {EXPERIENCES.map((exp, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={exp.role}
                  className={`relative flex flex-col md:flex-row gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
                  initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                >
                  <div className={`flex-1 ${isLeft ? "md:text-right" : "md:text-left"} pl-14 md:pl-0`}>
                    <motion.div
                      className="glass-panel rounded-2xl p-6 border border-border hover:border-opacity-50 transition-all group"
                      style={{ borderColor: `${exp.color}30` }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${isLeft ? "md:justify-end" : "md:justify-start"}`}>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${exp.color}15`, color: exp.color, border: `1px solid ${exp.color}30` }}>
                          {exp.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{exp.role}</h3>
                      <div className={`flex items-center gap-2 text-sm text-muted-foreground mt-1 mb-3 ${isLeft ? "md:justify-end" : "md:justify-start"}`}>
                        <Briefcase size={12} style={{ color: exp.color }} />
                        <span style={{ color: exp.color }} className="font-medium">{exp.company}</span>
                        <span>·</span>
                        <Calendar size={12} />
                        <span>{exp.period}</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{exp.desc}</p>
                      <div className={`flex flex-wrap gap-2 ${isLeft ? "md:justify-end" : "md:justify-start"}`}>
                        {exp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-md font-mono"
                            style={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 33% 20%)", color: "hsl(215 20% 65%)" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  <div className="absolute left-3.5 md:static md:flex-shrink-0 md:w-12 flex items-start md:items-center justify-center pt-6 md:pt-0">
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-background flex-shrink-0"
                      style={{ background: exp.color, boxShadow: `0 0 12px ${exp.color}` }}
                      animate={{ boxShadow: [`0 0 8px ${exp.color}80`, `0 0 20px ${exp.color}`, `0 0 8px ${exp.color}80`] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    />
                  </div>

                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
