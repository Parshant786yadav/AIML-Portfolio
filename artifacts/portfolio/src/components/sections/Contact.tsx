import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Mail, Phone, MapPin, Send, Github, Linkedin, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CONTACT_INFO = [
  { icon: Mail, label: "Email", value: "Parshant786yadav@gmail.com", href: "mailto:Parshant786yadav@gmail.com" },
  { icon: Phone, label: "Phone", value: "+91 8826448907", href: "tel:+918826448907" },
  { icon: MapPin, label: "Location", value: "Gurgaon, India", href: null },
];

const SOCIALS = [
  { icon: Github, href: "https://github.com/parshant786yadav", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/parshant786", label: "LinkedIn" },
  { icon: MessageCircle, href: "http://wa.me/+918826448907", label: "WhatsApp" },
  { icon: Mail, href: "mailto:Parshant786yadav@gmail.com", label: "Email" },
];

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setForm({ name: "", email: "", message: "" });
    toast({
      title: "Message sent!",
      description: "Thanks for reaching out. Parshant will get back to you within 24 hours.",
    });
  };

  return (
    <section id="contact" ref={ref} className="py-24 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 80%, hsl(188 86% 53% / 0.05) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">Say Hello</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Get In Touch</h2>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto text-sm leading-relaxed">
            Have a question, idea, or opportunity? Drop a message — I usually respond within 24 hours.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-4 glass-panel rounded-xl p-4 border border-border hover:border-primary/30 transition-colors group"
                  whileHover={{ x: 4 }}
                  data-testid={`contact-${label.toLowerCase()}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/15 transition-colors flex-shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-mono">{label}</div>
                    {href ? (
                      <a href={href} className="text-foreground text-sm hover:text-primary transition-colors">{value}</a>
                    ) : (
                      <span className="text-foreground text-sm">{value}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-3">Socials</p>
              <div className="flex gap-3">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <motion.a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`contact-social-${label.toLowerCase()}`}
                  >
                    <Icon size={16} />
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel rounded-2xl p-6 border border-border space-y-4"
          >
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-1.5">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                data-testid="input-name"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                data-testid="input-email"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Your message..."
                data-testid="input-message"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-foreground placeholder:text-muted-foreground/50 resize-none"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, hsl(188 86% 53%), hsl(271 91% 65%))",
                color: "hsl(222 47% 4%)",
                boxShadow: "0 0 20px hsl(188 86% 53% / 0.3)",
              }}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              data-testid="button-submit"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
