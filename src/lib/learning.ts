import { z } from "zod";

export const KINDS = ["market_observation", "emerging_trend", "product_gap", "operational_challenge", "successful_practice", "improvement_suggestion"] as const;
export const EVIDENCE = ["direct_experience", "customer_feedback", "internal_data", "market_report", "anecdotal"] as const;
export const CONFIDENCE = ["low", "medium", "high"] as const;
export const VISIBILITY = ["private", "organisation", "proposed_shared"] as const;

export const VISIBILITY_COPY: Record<(typeof VISIBILITY)[number], { title: string; who: string }> = {
  private: { title: "Private to me", who: "Only you. Never shared, never reviewed." },
  organisation: { title: "My organisation", who: "Active members of your organisation only. Not reviewed by Azentio, not in the shared feed." },
  proposed_shared: {
    title: "Propose for the learning community",
    who: "A moderator reviews it first. If approved, only a de-identified copy is shown to authorised participants from other organisations and Azentio.",
  },
};

export const STATE_TONE: Record<string, "neutral" | "brand" | "warn" | "danger" | "navy"> = {
  draft: "neutral", submitted: "warn", returned: "warn", published: "brand", rejected: "danger", withdrawn: "neutral",
};

// Mirrors the DB check constraints; the DB is the final authority.
export const contributionSchema = z.object({
  kind: z.enum(KINDS),
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(20).max(4000),
  offering_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  industry: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
  evidence_type: z.enum(EVIDENCE),
  confidence: z.enum(CONFIDENCE),
  visibility: z.enum(VISIBILITY),
  consent_process: z.literal("on").optional(),
  consent_publish: z.literal("on").optional(),
  consent_attribution: z.literal("on").optional(),
  consent_training: z.literal("on").optional(),
}).refine((d) => d.period_end >= d.period_start, { path: ["period_end"], message: "End must be after start" });

// Client-side hint only; the server re-scans on submit.
export const SENSITIVE_PATTERNS: [RegExp, string][] = [
  [/\b\d{9,18}\b/, "a long number that may be an account number"],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, "an email address"],
  [/\+?\d[\d -]{8,}\d/, "a phone number"],
  [/(password|api[_ -]?key|secret|token)\s*[:=]/i, "a credential"],
  [/\b(iban|swift|sort code|routing number)\b/i, "a banking identifier"],
  [/\b(pricing|discount|rate card|contract value)\b/i, "commercial terms"],
];
