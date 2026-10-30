import "server-only";

// Lightweight semantic grouping of approved shared contributions (TF-IDF + cosine, single-link).
// Suggestions keep their evidence links and state their uncertainty; they never become themes automatically.
type Doc = { id: string; title: string; body: string };
export type Suggestion = { label: string; terms: string[]; members: Doc[]; cohesion: number };

const STOP = new Set("the and for with that this from have has are was were not but into than then them they their there what when which while about over more most less very also only such each other some many much can could would should will our your its it's is be been being of in on to a an as at by or if so no we you he she".split(" "));
const tokens = (t: string) => t.toLowerCase().match(/[a-z]{3,}/g)?.filter((w) => !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, "")) ?? [];

export function suggestThemes(docs: Doc[], threshold = 0.12): Suggestion[] {
  if (docs.length < 2) return [];
  const tf = docs.map((d) => { const m = new Map<string, number>(); tokens(`${d.title} ${d.title} ${d.body}`).forEach((w) => m.set(w, (m.get(w) ?? 0) + 1)); return m; });
  const df = new Map<string, number>();
  tf.forEach((m) => m.forEach((_, w) => df.set(w, (df.get(w) ?? 0) + 1)));
  const vec = tf.map((m) => {
    const v = new Map<string, number>();
    m.forEach((c, w) => v.set(w, c * Math.log((docs.length + 1) / (df.get(w)! + 0.5))));
    const n = Math.hypot(...v.values()) || 1;
    v.forEach((x, w) => v.set(w, x / n));
    return v;
  });
  const cos = (a: Map<string, number>, b: Map<string, number>) => { let s = 0; a.forEach((x, w) => { s += x * (b.get(w) ?? 0); }); return s; };

  // single-link clustering with union-find
  const parent = docs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const sims: number[] = [];
  for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) {
    const s = cos(vec[i], vec[j]);
    if (s >= threshold) { parent[find(i)] = find(j); sims.push(s); }
  }
  const groups = new Map<number, number[]>();
  docs.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));

  return [...groups.values()].filter((g) => g.length >= 2).map((g) => {
    const weight = new Map<string, number>();
    g.forEach((i) => vec[i].forEach((x, w) => weight.set(w, (weight.get(w) ?? 0) + x)));
    // terms shared by at least two members describe the group best
    const shared = [...weight.entries()].filter(([w]) => g.filter((i) => vec[i].has(w)).length >= 2).sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 4);
    let pair = 0, n = 0;
    for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) { pair += cos(vec[g[a]], vec[g[b]]); n++; }
    return { label: shared.slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1)).join(", "), terms: shared, members: g.map((i) => docs[i]), cohesion: Math.round((pair / n) * 100) / 100 };
  }).sort((a, b) => b.members.length - a.members.length);
}
