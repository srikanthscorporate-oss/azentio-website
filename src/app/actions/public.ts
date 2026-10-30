"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> };

const demoSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  company: z.string().trim().min(2).max(200),
  interest: z.enum(["demo", "collaboration", "ai_challenge", "general"]).default("demo"),
  offering_slug: z.string().max(80).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function requestDemo(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = demoSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.from("demo_requests").insert(parsed.data);
  if (error) return { message: "Could not save your request. Please try again." };
  return { ok: true, message: "Thanks, your request is recorded. Our team will contact you." };
}

const regSchema = z.object({
  event_slug: z.string().min(1).max(80),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  team: z.string().trim().max(200).optional(),
  website: z.string().max(0, "Leave this field empty").optional(), // honeypot for bots
  consent: z.literal("on", { error: "Please agree to be contacted about the event" }),
});

export async function registerInterest(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = regSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createClient();
  const { event_slug, name, email, team } = parsed.data;
  const { error } = await supabase.from("event_registrations").insert({ event_slug, name, email, team, consent: true });
  if (error?.code === "23505") return { ok: true, message: "You're already registered." };
  if (error) return { message: "Could not register. Please try again." };
  return { ok: true, message: "Registered. See you at Azentio Build Labs." };
}
