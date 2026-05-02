import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const SKILL_GROUPS = [
  {
    category: "AI / ML",
    color: "hsl(188 86% 53%)",
    bg: "hsl(188 86% 53% / 0.08)",
    border: "hsl(188 86% 53% / 0.25)",
    skills: ["Python", "Machine Learning", "NLP", "FastAPI", "IBM Cloud Tools", "LangChain", "RAG"],
  },
  {
    category: "Frontend",
    color: "hsl(271 91% 65%)",
    bg: "hsl(271 91% 65% / 0.08)",
    border: "hsl(271 91% 65% / 0.25)",
    skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Tailwind CSS"],
  },
  {
    category: "Backend",
    color: "hsl(316 73% 52%)",
    bg: "hsl(316 73% 52% / 0.08)",
    border: "hsl(316 73% 52% / 0.25)",
    skills: ["Node.js", "APIs", "Firebase", "MySQL", "Express"],
  },
  {
    category: "Tools",
    color: "hsl(280 65% 60%)",
    bg: "hsl(280 65% 60% / 0.08)",
    border: "hsl(280 65% 60% / 0.25)",
    skills: ["Git", "GitHub", "VS Code", "PyCharm", "C", "C++", "Java"],
  },
];

export default function Skills() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="skills" ref={ref} className="py-24 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 50%, hsl(271 91% 65% / 0.04) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">What I Know</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Skills</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {SKILL_GROUPS.map((group, gi) => (
            <motion.div
              key={group.category}
              className="glass-panel rounded-2xl p-6 border border-border hover:border-opacity-50 transition-all"
              style={{ borderColor: group.border }}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: gi * 0.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: group.color, boxShadow: `0 0 8px ${group.color}` }}
                />
                <h3 className="font-semibold text-sm tracking-widest uppercase font-mono" style={{ color: group.color }}>
                  {group.category}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill, si) => (
                  <motion.span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-default"
                    style={{ background: group.bg, border: `1px solid ${group.border}`, color: group.color }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: gi * 0.1 + si * 0.05 }}
                    whileHover={{
                      scale: 1.08,
                      boxShadow: `0 0 12px ${group.color}40`,
                    }}
                    data-testid={`skill-${skill.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
