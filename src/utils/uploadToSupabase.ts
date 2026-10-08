import { supabase } from "../supabaseClient";
import { createMediaPath } from "./mediaPath";

export async function uploadFile(file: File): Promise<string> {
  const path = createMediaPath(file);
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
