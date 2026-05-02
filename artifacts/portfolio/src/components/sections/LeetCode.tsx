import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ExternalLink } from "lucide-react";

const STATS = [
  { label: "Total Solved", value: "200+", color: "hsl(142 71% 45%)" },
  { label: "Easy", value: "90+", color: "hsl(142 71% 55%)" },
  { label: "Medium", value: "90+", color: "hsl(38 90% 55%)" },
  { label: "Hard", value: "20+", color: "hsl(0 75% 55%)" },
];

export default function LeetCode() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="leetcode" ref={ref} className="py-8 section-divider">
      <motion.h2
        className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        dsa / leetcode.
      </motion.h2>

      <motion.div
        className="rounded-lg border border-border p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-mono font-medium text-foreground">parshant786yadav</span>
            <p className="text-xs text-muted-foreground mt-0.5">Consistent problem solver — algorithms & data structures</p>
          </div>
          <a
            href="https://leetcode.com/parshant786yadav"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-leetcode"
            className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            Profile <ExternalLink size={10} />
          </a>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {STATS.map(({ label, value, color }, i) => (
            <motion.div
              key={label}
              className="text-center"
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.06 }}
              data-testid={`lc-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="text-lg font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { label: "Easy", pct: 68, color: "hsl(142 71% 55%)" },
            { label: "Medium", pct: 48, color: "hsl(38 90% 55%)" },
            { label: "Hard", pct: 22, color: "hsl(0 75% 55%)" },
          ].map(({ label, pct, color }, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">{label}</span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${pct}%` } : {}}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
