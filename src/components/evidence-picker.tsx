import { createClient } from "@/lib/supabase/server";

// Lists only approved, published shared contributions, the only evidence product owners may link.
export async function EvidencePicker() {
  const supabase = await createClient();
  const { data } = await supabase.from("shared_contributions").select("id, title, region, period_label").eq("status", "published").order("published_at", { ascending: false });
  return (
    <fieldset className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-line p-3 text-sm">
      <legend className="label px-1">Supporting approved contributions</legend>
      {data?.map((s) => <label key={s.id} className="flex gap-2"><input type="checkbox" name="evidence" value={s.id} />{s.title} <span className="text-muted">({s.region}, {s.period_label})</span></label>)}
    </fieldset>
  );
}
