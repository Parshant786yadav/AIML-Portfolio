import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    let raf: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      setTrail((prev) => ({
        x: lerp(prev.x, pos.x, 0.12),
        y: lerp(prev.y, pos.y, 0.12),
      }));
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [pos]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none hidden md:block"
        animate={{ x: pos.x - 4, y: pos.y - 4, scale: clicking ? 0.5 : 1 }}
        transition={{ type: "spring", stiffness: 900, damping: 30, mass: 0.1 }}
      >
        <div
          className="w-2 h-2 rounded-full bg-primary"
          style={{ boxShadow: "0 0 8px 2px hsl(188 86% 53% / 0.9)" }}
        />
      </motion.div>
      <div
        className="fixed top-0 left-0 z-[9998] pointer-events-none hidden md:block"
        style={{
          transform: `translate(${trail.x - 16}px, ${trail.y - 16}px)`,
          width: clicking ? "24px" : "32px",
          height: clicking ? "24px" : "32px",
          borderRadius: "50%",
          border: "1px solid hsl(188 86% 53% / 0.4)",
          boxShadow: "0 0 12px hsl(188 86% 53% / 0.15)",
          transition: "width 0.15s, height 0.15s",
        }}
      />
    </>
  );
}
