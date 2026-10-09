import { supabase } from "../supabaseClient";
import { accountRequest } from "../lib/campaignApi";

export async function uploadFile(file: File): Promise<string> {
  const { path, token } = await accountRequest("/api/campaign?action=media-upload", {
    method: "POST", body: JSON.stringify({ contentType: file.type }),
  });
  const { error } = await supabase.storage.from("media").uploadToSignedUrl(path, token, file, {
    contentType: file.type || undefined,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
