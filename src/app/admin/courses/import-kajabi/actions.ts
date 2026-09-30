"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import data from "../../../../../data/kajabi/bonded-courses.json";
import { planImport, type KajabiExport } from "@/lib/kajabi-import/plan";
import { importCourse, type ImportResult } from "@/lib/kajabi-import/run";

export interface ImportState {
  results: ImportResult[];
  hidden: string[];
  error: string | null;
}

const Hide = z.array(z.string().regex(/^[a-z0-9-]{1,100}$/)).max(50);

/** Imports the Bonded courses from the Kajabi export as drafts; optionally hides old demo courses. */
export async function runKajabiImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireStaff("content");
  const hide = Hide.safeParse(formData.getAll("hide").map(String));
  if (!hide.success) return { results: [], hidden: [], error: "Invalid selection." };

  const results: ImportResult[] = [];
  // Chapters in order, so each one can point at the chapter it opens after.
  for (const course of planImport(data as KajabiExport)) results.push(await importCourse(course));

  let hidden: string[] = [];
  if (hide.data.length > 0) {
    const { data: rows, error } = await createServiceClient().from("courses").update({ published: false }).in("id", hide.data).is("import_ref", null).select("id");
    if (error) console.error("[kajabi-import] hide demo courses failed", error.message);
    hidden = (rows ?? []).map((r) => r.id);
  }
  revalidatePath("/admin/courses");
  revalidatePath("/my-courses");
  return { results, hidden, error: null };
}
