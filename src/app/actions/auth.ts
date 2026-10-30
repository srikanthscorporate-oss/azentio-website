"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer, homeFor } from "@/lib/session";
import type { FormState } from "./public";

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
};

export async function sendCode(_: FormState, fd: FormData): Promise<FormState & { email?: string }> {
  const email = z.email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { errors: { email: ["Enter a valid email"] } };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true } });
  if (error) return { message: error.message };
  return { ok: true, email: email.data, message: "We sent a one-time code to your email." };
}

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const token = String(fd.get("code") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { message: "That code is invalid or expired." };
  return afterLogin(fd);
}

// Password sign-in is enabled only for the seeded synthetic demo personas.
export async function demoLogin(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
  if (error) return { message: "Sign-in failed." };
  return afterLogin(fd);
}

async function afterLogin(fd: FormData): Promise<never> {
  const next = safeNext(fd.get("next"));
  const v = await getViewer();
  if (next?.startsWith("/invite/")) redirect(next);
  if (v && !v.termsAccepted && v.memberships.length) redirect("/onboarding");
  redirect(next ?? (v ? homeFor(v) : "/"));
}

export async function acceptTerms() {
  const v = await getViewer();
  if (!v) redirect("/login");
  const supabase = await createClient();
  await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", v.id);
  redirect(homeFor(v));
}

export async function acceptInvitation(fd: FormData) {
  const token = String(fd.get("token"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(error.message)}`);
  redirect("/onboarding");
}
