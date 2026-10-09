import { normalizeCampaignStatus } from "../../shared/campaign-status";

export type FormAdStatus = "active" | "hold" | "moderate";

export default function AdStatusControl({ value, onChange, role, isNew = false, pendingReview }: {
  value: string; onChange: (status: FormAdStatus) => void; role: string | null; isNew?: boolean; pendingReview?: boolean;
}) {
  const pending = pendingReview ?? (normalizeCampaignStatus(value) === "Moderate");
  if (isNew || (pending && role !== "agency")) {
    return <p className="px-[13px] py-2 text-[14px] text-amber-700" role="status">
      Moderate — на модерации. Запуск доступен после одобрения агентством.
    </p>;
  }
  const choices: [FormAdStatus, string][] = [["active", "Active"]];
  if (!pending) choices.push(["hold", "On Hold"]);
  if (role === "agency") choices.push(["moderate", "Moderate"]);
  return <div className="flex flex-col gap-2 px-[13px]">
    {choices.map(([status, label]) => <label key={status} className="flex cursor-pointer items-center gap-2 text-[14px]">
      <input type="radio" checked={normalizeCampaignStatus(value) === normalizeCampaignStatus(status)}
        onChange={() => onChange(status)} className="h-4 w-4 accent-blue-600" />
      <span>{label}</span>
    </label>)}
  </div>;
}
