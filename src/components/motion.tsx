"use client";
import { useEffect } from "react";

const EASE = "cubic-bezier(.33,1,.68,1)";
const EASE_REVEAL = "cubic-bezier(.14,.83,.4,1)";

// lpas-style reveals using the Web Animations API, so no DOM attribute React manages is ever changed
// (changing attributes before hydration causes mismatches). CSS hides [data-reveal]/[data-image-reveal]
// only under html.motion; each animation fills forwards to its visible end state.
export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("motion");
    const done = new WeakSet<Element>();

    const reveal = (el: HTMLElement, delay: number) => {
      if (done.has(el)) return;
      done.add(el);
      if (el.hasAttribute("data-image-reveal")) {
        el.animate([{ clipPath: "inset(40% 0 0 0)", opacity: 0.2 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }], { duration: 1200, easing: EASE_REVEAL, delay, fill: "forwards" });
        el.querySelectorAll("img").forEach((img) => img.animate([{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 1200, easing: EASE_REVEAL, delay, fill: "forwards" }));
      } else {
        el.animate([{ opacity: 0, transform: "translateY(3rem)", filter: "blur(10px)" }, { opacity: 1, transform: "none", filter: "none" }], { duration: 1000, easing: EASE, delay, fill: "forwards" });
      }
    };

    const io = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        reveal(el, el.hasAttribute("data-image-reveal") ? (i++ % 4) * 150 : 0);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    const watch = (scope: ParentNode) => scope.querySelectorAll("[data-reveal], [data-image-reveal]").forEach((el) => !done.has(el) && io.observe(el));
    watch(document);
    // pick up content streamed in later so nothing can stay hidden
    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal],[data-image-reveal]") ? io.observe(n) : watch(n)))));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); root.classList.remove("motion"); };
  }, []);
  return null;
}
