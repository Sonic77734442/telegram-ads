export function normalizeLogin(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function loginFilter(login: string): string {
  const literal = JSON.stringify(login);
  return `username.eq.${literal},email.eq.${literal}`;
}
