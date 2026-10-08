// Storage keys must not contain the original (possibly non-ASCII) filename.
export function createMediaPath(file: Pick<File, "name" | "type">): string {
  const extension = file.name.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1].toLowerCase();
  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "image/avif": "avif", "video/mp4": "mp4",
    "video/webm": "webm", "video/quicktime": "mov",
  };
  const suffix = mimeExtensions[file.type] || extension || "bin";
  return `ads/${crypto.randomUUID()}.${suffix}`;
}
