"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getResource, type Field } from "@/lib/resources";

type Result = { error?: string };

// Only columns marked editable in lib/resources.ts can be written, whatever the form sends.
function cleanValues(fields: Field[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.editable || f.key.includes(".") || !(f.key in values)) continue;
    let v = values[f.key];
    if (f.type === "boolean") v = Boolean(v);
    else if (f.type === "number") v = v === "" || v === null || v === undefined ? null : Number(v);
    else if (typeof v === "string") v = v.trim() === "" ? null : v.trim();
    if (f.required && (v === null || v === undefined)) throw new Error(`${f.label} is required.`);
    if (f.type === "number" && v !== null && Number.isNaN(v)) throw new Error(`${f.label} must be a number.`);
    out[f.key] = v;
  }
  return out;
}

export async function createRow(slug: string, values: Record<string, unknown>): Promise<Result> {
  const r = getResource(slug);
  if (!r?.canCreate) return { error: "Not allowed." };
  const { supabase } = await requireAdmin();
  try {
    const { error } = await supabase.from(r.table).insert(cleanValues(r.fields, values));
    if (error) return { error: error.message };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/${slug}`);
  return {};
}

export async function updateRow(slug: string, id: string | number, values: Record<string, unknown>): Promise<Result> {
  const r = getResource(slug);
  if (!r?.canUpdate) return { error: "Not allowed." };
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase.from(r.table).update(cleanValues(r.fields, values)).eq(r.idKey ?? "id", id).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "Nothing was updated. You may not have permission to change this row." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/${slug}`);
  return {};
}

export async function deleteRow(slug: string, id: string | number): Promise<Result> {
  const r = getResource(slug);
  if (!r?.canDelete) return { error: "Not allowed." };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from(r.table).delete().eq(r.idKey ?? "id", id).select("id");
  if (error) return { error: error.message.includes("foreign key") ? "Other records still use this one, so it can't be deleted." : error.message };
  if (!data?.length) return { error: "Nothing was deleted. You may not have permission to delete this row." };
  revalidatePath(`/${slug}`);
  return {};
}
