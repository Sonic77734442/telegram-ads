// utils/uploadToSupabase.ts
import { supabase } from "../supabaseClient";

export async function uploadFile(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `media-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase
    .storage
    .from("media") // имя bucket'а
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload failed:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filePath);
  return data.publicUrl;
}
