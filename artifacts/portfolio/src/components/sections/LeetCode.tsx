import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ExternalLink, Code2, Trophy, Zap, Target } from "lucide-react";

const STATS = [
  { label: "Problems Solved", value: "200+", icon: Code2, color: "hsl(188 86% 53%)" },
  { label: "Badges Earned", value: "5+", icon: Trophy, color: "hsl(271 91% 65%)" },
  { label: "Consistency", value: "Active", icon: Zap, color: "hsl(316 73% 52%)" },
  { label: "Level", value: "Intermediate", icon: Target, color: "hsl(280 65% 60%)" },
];

const DIFFICULTIES = [
  { label: "Easy", count: 90, pct: 70, color: "hsl(142 70% 50%)" },
  { label: "Medium", count: 90, pct: 50, color: "hsl(38 90% 55%)" },
  { label: "Hard", count: 20, pct: 25, color: "hsl(0 80% 58%)" },
];

export default function LeetCode() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="leetcode" ref={ref} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary font-mono text-sm tracking-widest uppercase">DSA Journey</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">LeetCode Stats</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            className="glass-panel rounded-2xl p-6 border border-primary/20"
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-foreground">parshant786yadav</h3>
                <p className="text-muted-foreground text-sm font-mono">@LeetCode</p>
              </div>
              <motion.a
                href="https://leetcode.com/parshant786yadav"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5"
                whileHover={{ scale: 1.03 }}
                data-testid="link-leetcode-profile"
              >
                View Profile
                <ExternalLink size={10} />
              </motion.a>
            </div>

            <div className="space-y-4">
              {DIFFICULTIES.map((d, i) => (
                <div key={d.label} data-testid={`leetcode-${d.label.toLowerCase()}`}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground font-mono">{d.label}</span>
                    <span className="font-mono font-bold" style={{ color: d.color }}>{d.count}+</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: d.color, boxShadow: `0 0 8px ${d.color}60` }}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${d.pct}%` } : {}}
                      transition={{ duration: 1, delay: 0.4 + i * 0.15, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl" style={{ background: "hsl(222 47% 6%)", border: "1px solid hsl(217 33% 17%)" }}>
              <p className="text-muted-foreground text-sm leading-relaxed italic">
                "I've solved 200+ DSA problems on LeetCode and earned multiple badges. My journey reflects consistency, passion, and problem-solving growth."
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {STATS.map(({ label, value, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                className="glass-panel rounded-2xl p-5 border border-border hover:border-opacity-50 transition-all group"
                style={{ borderColor: `${color}20` }}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                whileHover={{ scale: 1.03, y: -2 }}
                data-testid={`leetcode-stat-${i}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${color}15` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
