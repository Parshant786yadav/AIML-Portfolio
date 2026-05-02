import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Github, ExternalLink, ArrowUpRight } from "lucide-react";

const PROJECTS = [
  {
    title: "DocuMind",
    subtitle: "RAG-based PDF Intelligence Engine",
    desc: "Production-grade document intelligence system built on Retrieval-Augmented Generation. Upload any PDF, and DocuMind embeds it into a vector store, retrieves semantically relevant chunks, and feeds them into an LLM to generate precise, context-aware answers. Designed for accuracy — no hallucinations, only grounded responses.",
    tags: ["FastAPI", "Python", "RAG", "LangChain", "Vector DB", "LLM", "NLP"],
    github: "https://github.com/parshant786yadav",
    live: null,
    highlight: "RAG Pipeline",
    highlightColor: "hsl(142 71% 45%)",
    metric: "Context-aware Q&A on any PDF",
  },
  {
    title: "HireWise",
    subtitle: "NLP Resume Screening Engine",
    desc: "Automated recruitment intelligence system that uses NLP and semantic similarity to match candidate resumes against job descriptions. Extracts entities (skills, experience, education), scores relevance, and ranks candidates — eliminating manual screening bias and reducing hiring time.",
    tags: ["Python", "NLP", "spaCy", "Scikit-learn", "TF-IDF", "ML"],
    github: "https://github.com/parshant786yadav/Resume-Screening-App",
    live: null,
    highlight: "NLP Matching",
    highlightColor: "hsl(220 80% 60%)",
    metric: "Semantic resume-to-JD matching",
  },
  {
    title: "AI Portfolio Chatbot",
    subtitle: "Conversational AI Assistant",
    desc: "Embedded LLM-powered chatbot trained on personal data — projects, skills, and experience. Visitors can ask natural language questions about Parshant's background and get instant, accurate answers. Built with a FastAPI backend and a streaming response interface.",
    tags: ["FastAPI", "Python", "LLM", "Prompt Engineering", "REST API"],
    github: "https://github.com/parshant786yadav",
    live: "https://parshantyadav.com",
    highlight: "LLM-powered",
    highlightColor: "hsl(40 80% 55%)",
    metric: "Personalized Q&A chatbot",
  },
];

export default function Projects() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="projects" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        projects.
      </motion.h2>

      <div className="space-y-4">
        {PROJECTS.map((project, i) => (
          <motion.div
            key={project.title}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-lg border border-border p-5 hover:bg-card transition-all duration-200 group"
            data-testid={`project-${i}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">{project.title}</h3>
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: `${project.highlightColor}12`,
                      color: project.highlightColor,
                      border: `1px solid ${project.highlightColor}25`,
                    }}
                  >
                    {project.highlight}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{project.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`project-live-${i}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`project-github-${i}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github size={14} />
                </a>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{project.desc}</p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono flex-shrink-0 flex items-center gap-1">
                <ArrowUpRight size={10} style={{ color: project.highlightColor }} />
                {project.metric}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
