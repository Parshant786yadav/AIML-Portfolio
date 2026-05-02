import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Github, ExternalLink, Star } from "lucide-react";

const PROJECTS = [
  {
    title: "DocuMind — AI Document Chatbot",
    desc: "Advanced RAG-based AI Document Chatbot and PDF Assistant. Upload any PDF and have an intelligent conversation with it powered by large language models.",
    tags: ["FastAPI", "Python", "RAG", "LangChain", "AI"],
    github: "https://github.com/parshant786yadav",
    stars: 4,
    color: "hsl(188 86% 53%)",
    gradient: "linear-gradient(135deg, hsl(188 86% 53% / 0.15), hsl(271 91% 65% / 0.08))",
  },
  {
    title: "HireWise — Resume Screener",
    desc: "NLP-powered resume screening application that intelligently matches candidates to job descriptions, automating the initial screening process.",
    tags: ["NLP", "Python", "Machine Learning", "Text Analysis"],
    github: "https://github.com/parshant786yadav/Resume-Screening-App",
    stars: 2,
    color: "hsl(271 91% 65%)",
    gradient: "linear-gradient(135deg, hsl(271 91% 65% / 0.15), hsl(316 73% 52% / 0.08))",
  },
  {
    title: "AI-Powered Tech Portfolio",
    desc: "This portfolio itself — built with modern AI-assisted tooling featuring smooth animations, a neural network background, and a built-in AI chatbot for visitors.",
    tags: ["AI", "React", "Full Stack", "Framer Motion"],
    github: "https://github.com/parshant786yadav",
    stars: 4,
    color: "hsl(316 73% 52%)",
    gradient: "linear-gradient(135deg, hsl(316 73% 52% / 0.15), hsl(188 86% 53% / 0.08))",
  },
];

function TiltCard({ project, index, inView }: { project: typeof PROJECTS[0]; index: number; inView: boolean }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setTilt({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative group"
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        transition: "transform 0.15s ease",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden border border-border h-full flex flex-col"
        style={{ background: project.gradient }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{ boxShadow: `inset 0 0 30px ${project.color}10`, border: `1px solid ${project.color}40` }}
        />

        <div className="p-6 flex flex-col h-full relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: project.stars }).map((_, i) => (
                  <Star key={i} size={12} fill={project.color} style={{ color: project.color }} />
                ))}
                {Array.from({ length: 4 - project.stars }).map((_, i) => (
                  <Star key={i + project.stars} size={12} className="text-muted" />
                ))}
              </div>
            </div>
            <motion.a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors flex-shrink-0"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              data-testid={`link-project-github-${index}`}
            >
              <Github size={16} />
            </motion.a>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">{project.desc}</p>

          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-lg font-mono"
                style={{
                  background: `${project.color}12`,
                  border: `1px solid ${project.color}25`,
                  color: project.color,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="projects" ref={ref} className="py-24 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(188 86% 53% / 0.03) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">What I've Built</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Projects</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project, i) => (
            <TiltCard key={project.title} project={project} index={i} inView={inView} />
          ))}
        </div>

        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
        >
          <motion.a
            href="https://github.com/parshant786yadav"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            whileHover={{ x: 4 }}
            data-testid="link-view-all-projects"
          >
            <Github size={16} />
            View all projects on GitHub
            <ExternalLink size={12} />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
