import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ExternalLink } from "lucide-react";

const EXPERIENCES = [
  {
    role: "Software QA Engineer Intern",
    company: "NxCar",
    companyUrl: "#",
    location: "Gurgaon (On-site)",
    period: "Aug 2025 – Present",
    desc: "Optimized backend logic and debugged performance bottlenecks in collaboration with developers. Worked across the full backend stack ensuring API reliability and data integrity.",
    tags: ["Python", "Backend", "APIs", "MySQL", "QA"],
    letter: "N",
    color: "hsl(142 71% 45%)",
  },
  {
    role: "Artificial Intelligence Intern",
    company: "IBM",
    companyUrl: "https://www.ibm.com",
    location: "Remote",
    period: "July 2025 – Aug 2025",
    desc: "Built AI-based solutions using Python and IBM Cloud tools. Worked on NLP pipelines to automate business workflows and improve decision-making systems.",
    tags: ["Python", "NLP", "IBM Cloud", "AI/ML", "Watson"],
    letter: "I",
    color: "hsl(220 80% 60%)",
  },
  {
    role: "Freelance Web Developer",
    company: "Self-employed",
    companyUrl: "#",
    location: "Remote",
    period: "Aug 2024 – July 2025",
    desc: "Delivered production-ready websites for multiple clients. Integrated AI-powered features including chatbots and smart form handling into client projects.",
    tags: ["React", "Node.js", "Firebase", "APIs", "Tailwind CSS"],
    letter: "F",
    color: "hsl(40 80% 55%)",
  },
];

export default function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="experience" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        work experience.
      </motion.h2>

      <div className="space-y-1">
        {EXPERIENCES.map((exp, i) => (
          <motion.div
            key={exp.role}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="group rounded-lg p-4 border border-transparent hover:border-border hover:bg-card transition-all duration-200"
            data-testid={`experience-${i}`}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5"
                style={{ background: `${exp.color}12`, color: exp.color, border: `1px solid ${exp.color}25` }}
              >
                {exp.letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{exp.role}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <a
                        href={exp.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        @ {exp.company}
                        {exp.companyUrl !== "#" && <ExternalLink size={9} />}
                      </a>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-muted-foreground">{exp.period}</div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">{exp.location}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{exp.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {exp.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
