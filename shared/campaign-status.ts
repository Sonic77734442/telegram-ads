export function normalizeCampaignStatus(value: unknown): "Active" | "On Hold" | "Moderate" | null {
  const status = String(value || "").trim().toLowerCase();
  if (status === "active") return "Active";
  if (["hold", "on hold", "paused"].includes(status)) return "On Hold";
  if (status === "moderate") return "Moderate";
  return null;
}

export function moderationError(role: string, previous: unknown, next: unknown): string | null {
  const current = normalizeCampaignStatus(previous);
  const target = normalizeCampaignStatus(next);
  if (current === "Moderate" && target !== "Moderate" && (role !== "agency" || target !== "Active")) {
    return "Объявление на модерации. Только ваше агентство может перевести его в Active.";
  }
  if (current !== "Moderate" && target === "Moderate" && role !== "agency") {
    return "Отправить объявление на модерацию может только агентство.";
  }
  return null;
}
