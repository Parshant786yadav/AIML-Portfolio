import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "experience", href: "#experience" },
  { label: "projects", href: "#projects" },
  { label: "skills", href: "#skills" },
  { label: "contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setOpen(false);
    const id = href.slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-sm border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors"
          data-testid="nav-logo"
        >
          parshant<span className="text-primary">.</span>
        </button>

        <nav className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              data-testid={`nav-${link.label}`}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <button
          className="sm:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-b border-border bg-background overflow-hidden"
          >
            <div className="max-w-2xl mx-auto px-5 py-3 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground text-left transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
