"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { buildPrompt } from "@/lib/prompt";
import { SUPABASE_URL } from "@/lib/config";

type Result = { error?: string };

// Each action checks admin again (and the database functions check a third time).
async function run(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc(fn, args);
  revalidatePath("/media");
  revalidatePath("/");
  return error ? { error: error.message } : {};
}

export async function createCaption(postId: number, content: string) {
  return run("admin_create_caption", { p_post_id: postId, p_content: content });
}
export async function updateCaption(id: number, content: string) {
  return run("admin_update_caption", { p_id: id, p_content: content });
}
export async function chooseCaption(id: number) {
  return run("admin_choose_caption", { p_id: id });
}
export async function deleteCaption(id: number) {
  return run("admin_delete_caption", { p_id: id });
}
export async function deletePost(id: number) {
  return run("admin_delete_post", { p_id: id });
}

// Ask Gemini for 3 more captions for a meme. Same models as the main app; first one to answer wins.
const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"].filter(
  (m, i, all): m is string => !!m && all.indexOf(m) === i
);

export async function generateCaptions(postId: number, imageUrl: string, topic: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "AI generation isn't set up yet (GEMINI_API_KEY is missing in Vercel). You can still write captions by hand." };
  if (!imageUrl.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)) return { error: "Invalid image." };

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) return { error: "Couldn't read the image." };
  const mimeType = imageRes.headers.get("content-type") ?? "image/jpeg";
  const data = Buffer.from(await imageRes.arrayBuffer()).toString("base64");
  const prompt = buildPrompt(topic, "");
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 1.1 },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  async function ask(model: string) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey! },
      body,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${model}: ${res.status}`);
    const json = await res.json();
    const text: string = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    const list = JSON.parse(text);
    const captions = (Array.isArray(list) ? list : list?.captions ?? []).filter((c: unknown): c is string => typeof c === "string" && c.trim() !== "");
    if (captions.length === 0) throw new Error(`${model}: no captions`);
    return { model, captions: captions.slice(0, 3) as string[] };
  }

  let winner: { model: string; captions: string[] };
  try {
    winner = await Promise.any(MODELS.map(ask));
  } catch {
    clearTimeout(timer);
    return { error: "The AI is busy right now, try again in a moment." };
  }
  clearTimeout(timer);
  controller.abort();

  for (const content of winner.captions) {
    const { error } = await supabase.rpc("admin_create_caption", { p_post_id: postId, p_content: content, p_model: winner.model, p_prompt: prompt });
    if (error) return { error: error.message };
  }
  revalidatePath("/media");
  revalidatePath("/");
  return {};
}
