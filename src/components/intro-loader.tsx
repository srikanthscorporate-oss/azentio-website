"use client";
import { useEffect, useRef, useState } from "react";

// Load intro on a light brand wash: a full-screen 3D node web flies in and turns while "azentio.ai" assembles as
// extruded 3D letters; then the camera dives through the web, the word flies past and the landing page shows.
// The fade-out is pure CSS, so the page is revealed even before (or without) hydration; JS only draws the web,
// unmounts the intro and starts the hero video.
const WORD = "azentio";
const TOTAL_MS = 3800;
const DIVE_AT = 2.6; // seconds: camera starts flying through the web

type Node = { x: number; y: number; z: number; sx: number; sy: number; sz: number; d: number };

function drawWeb(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  window.addEventListener("resize", resize);

  // Nodes on a loose shell around the wordmark, each starting far out in space.
  const count = w < 640 ? 130 : 240;
  const nodes: Node[] = Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 1 + (Math.random() - 0.5) * 0.55;
    const x = Math.sin(phi) * Math.cos(theta) * r * (w / Math.max(w, h)) * 1.15, y = Math.cos(phi) * r * (h / Math.max(w, h)) * 1.15, z = Math.sin(phi) * Math.sin(theta) * r;
    const k = 3 + Math.random() * 3;
    return { x, y, z, sx: x * k, sy: y * k, sz: z * k - 4, d: Math.random() * 0.5 };
  });

  const start = performance.now();
  let raf = 0;
  const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const frame = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    const rot = t * 0.35, tilt = 0.32 + Math.sin(t * 0.6) * 0.06;
    const dive = Math.max(0, t - DIVE_AT);
    const cam = 3.1 - dive * dive * 3.2; // camera distance; shrinks fast during the dive
    const scale = Math.max(w, h) * 1.45;
    const fade = 1 - Math.min(dive / 0.9, 1);
    const pts = nodes.map((n) => {
      const e = ease((t - n.d) / 1.3);
      let x = n.sx + (n.x - n.sx) * e, y = n.sy + (n.y - n.sy) * e, z = n.sz + (n.z - n.sz) * e;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      [x, z] = [x * cr - z * sr, x * sr + z * cr];
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      [y, z] = [y * ct - z * st, y * st + z * ct];
      const depth = cam + z;
      const p = depth > 0.05 ? 1 / depth : 0;
      return { X: w / 2 + x * p * scale, Y: h / 2 + y * p * scale, p, a: e };
    });
    // links between nearby nodes, stronger when closer to the camera
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]; if (!a.p) continue;
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j]; if (!b.p) continue;
        const dist = Math.hypot(a.X - b.X, a.Y - b.Y);
        const max = 0.3 * scale * Math.min(a.p, b.p);
        if (dist > max) continue;
        const alpha = (1 - dist / max) * Math.min(a.a, b.a) * fade * Math.min(1, (a.p + b.p) * 0.55);
        ctx.strokeStyle = `rgba(36,116,71,${alpha * 0.5})`;
        ctx.lineWidth = Math.min(1.6, 0.4 + (a.p + b.p) * 0.35);
        ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.stroke();
      }
    }
    for (const q of pts) {
      if (!q.p) continue;
      const r = Math.min(7, 1 + q.p * 3.2);
      ctx.fillStyle = `rgba(105,211,147,${0.85 * q.a * fade})`;
      ctx.beginPath(); ctx.arc(q.X, q.Y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(16,32,49,${0.35 * q.a * fade})`;
      ctx.beginPath(); ctx.arc(q.X, q.Y, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
}

export function IntroLoader() {
  const [done, setDone] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = !still && canvas.current ? drawWeb(canvas.current) : () => {};
    const t = window.setTimeout(() => { setDone(true); window.dispatchEvent(new Event("azentio:intro-done")); }, still ? 0 : TOTAL_MS);
    return () => { window.clearTimeout(t); stop(); };
  }, []);
  if (done) return null;
  return (
    <div className="intro-loader fixed inset-0 z-[100] grid place-items-center overflow-hidden" aria-hidden>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="intro-stage relative">
        <p className="intro-word flex text-[clamp(3.25rem,13vw,9.5rem)] leading-none tracking-[-0.035em]">
          {[...WORD].map((c, i) => <span key={i} className="intro-letter" style={{ animationDelay: `${0.35 + i * 0.08}s` }}>{c}</span>)}
          {[..."." + "ai"].map((c, i) => <span key={`a${i}`} className="intro-letter intro-ai" style={{ animationDelay: `${1 + i * 0.1}s` }}>{c}</span>)}
        </p>
      </div>
    </div>
  );
}
