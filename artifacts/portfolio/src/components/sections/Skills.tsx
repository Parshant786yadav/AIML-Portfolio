import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const SKILL_GROUPS = [
  {
    label: "AI / ML",
    skills: ["Python", "Machine Learning", "NLP", "RAG", "LangChain", "FastAPI", "IBM Watson", "Prompt Engineering", "Vector DBs"],
  },
  {
    label: "Frontend",
    skills: ["React", "TypeScript", "JavaScript", "Tailwind CSS", "HTML", "CSS"],
  },
  {
    label: "Backend & Data",
    skills: ["Node.js", "Express", "MySQL", "Firebase", "REST APIs"],
  },
  {
    label: "Tools",
    skills: ["Git", "GitHub", "VS Code", "PyCharm", "Linux", "C++", "Java"],
  },
];

export default function Skills() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="skills" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        skills.
      </motion.h2>

      <div className="space-y-4">
        {SKILL_GROUPS.map((group, gi) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: gi * 0.08 }}
            className="flex gap-4 items-start"
          >
            <span className="text-xs font-mono text-muted-foreground/50 w-24 flex-shrink-0 pt-0.5 text-right hidden sm:block">
              {group.label}
            </span>
            <div className="flex-1">
              <span className="text-xs font-mono text-muted-foreground/50 sm:hidden block mb-1.5">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.skills.map((skill, si) => (
                  <motion.span
                    key={skill}
                    className={`tag ${group.label === "AI / ML" ? "tag-green" : ""}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: gi * 0.08 + si * 0.03 }}
                    data-testid={`skill-${skill.toLowerCase().replace(/[\s/]+/g, "-")}`}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
