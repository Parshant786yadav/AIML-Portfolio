import { useScroll, useSpring, motion } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[9997] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, hsl(188 86% 53%), hsl(271 91% 65%), hsl(316 73% 52%))",
        boxShadow: "0 0 8px hsl(188 86% 53% / 0.7)",
      }}
    />
  );
}
