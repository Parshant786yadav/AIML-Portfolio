import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setForm({ name: "", email: "", message: "" });
    toast({
      title: "Message sent.",
      description: "Parshant will get back to you within 24 hours.",
    });
  };

  return (
    <section id="contact" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        contact.
      </motion.h2>

      <motion.p
        className="text-xs text-muted-foreground mb-6 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        Have a project, opportunity, or just want to talk AI? I'm open to conversations.{" "}
        <a href="mailto:Parshant786yadav@gmail.com" className="text-primary hover:underline font-mono">
          Parshant786yadav@gmail.com
        </a>
      </motion.p>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground/70 block mb-1">name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              data-testid="input-name"
              className="w-full px-3 py-2 rounded-md text-xs bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/40 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground/70 block mb-1">email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              data-testid="input-email"
              className="w-full px-3 py-2 rounded-md text-xs bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/40 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-mono text-muted-foreground/70 block mb-1">message</label>
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="What's on your mind..."
            data-testid="input-message"
            className="w-full px-3 py-2 rounded-md text-xs bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground/40 resize-none font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/40 font-mono flex items-center gap-1">
            <Mail size={10} />
            Parshant786yadav@gmail.com
          </span>
          <motion.button
            type="submit"
            disabled={loading}
            data-testid="button-submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-mono font-medium transition-all disabled:opacity-60"
            style={{
              background: "hsl(142 71% 45%)",
              color: "hsl(0 0% 4%)",
            }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Send size={11} />
            )}
            {loading ? "sending..." : "send message"}
          </motion.button>
        </div>
      </motion.form>
    </section>
  );
}
