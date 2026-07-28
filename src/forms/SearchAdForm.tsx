import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../components/Container";
import TagInput from "../components/TagInput";
import SearchAdPreview from "../components/SearchAdPreview";
import AdScheduleControl from "../components/AdScheduleControl";
import { supabase } from "../supabaseClient";
import { useAdId } from "../hooks/useAdId";
import { fetchCampaignById } from "../lib/campaignApi";

/* ──────────────── component ──────────────── */
export default function SearchAdForm() {
  const navigate = useNavigate();
  const adId = useAdId();

  /* form state */
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cpm, setCpm] = useState("1.00");
  const [budget, setBudget] = useState("8000.00");
  const [dailyViews, setDailyViews] = useState(4);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [targetQueries, setTargetQueries] = useState<string[]>([]);
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const clientId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const [markupPercent, setMarkupPercent] = useState(0);
  const [markupLoaded, setMarkupLoaded] = useState(role !== "client");
  const multiplier = role === "client" && markupPercent > 0 ? 1 + markupPercent / 100 : 1;

  /* ──────────────── date schedule states ──────────────── */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Load client markup to show CPM/budget with markup for client role.
  useEffect(() => {
    const loadMarkup = async () => {
      if (role !== "client" || !clientId) {
        setMarkupLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!error && data && typeof data.markup_percent === "number") {
        setMarkupPercent(Number(data.markup_percent) || 0);
      }
      setMarkupLoaded(true);
    };

    loadMarkup();
  }, [role, clientId]);

  const applyMarkupForInput = (baseValue: any) => {
    const num = Number(baseValue || 0);
    return role === "client" ? (num * multiplier).toFixed(2) : num.toFixed(2);
  };

  const resolveValueForInput = (valueWithMarkup: any, baseValue: any) => {
    if (role === "client") {
      if (valueWithMarkup !== undefined && valueWithMarkup !== null) {
        return Number(valueWithMarkup || 0).toFixed(2);
      }
      return applyMarkupForInput(baseValue);
    }
    const effective = valueWithMarkup ?? baseValue ?? 0;
    return Number(effective || 0).toFixed(2);
  };

  const parseTargetQueries = (value: unknown) => {
    if (Array.isArray(value)) return value.filter((item) => typeof item === "string") as string[];
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  /* load existing */
  useEffect(() => {
    const fetchAd = async () => {
      if (!adId || !markupLoaded) return;
      const data = await fetchCampaignById(adId);

      setTitle(data.title || "");
      setUrl(data.url || "");
      setCpm(resolveValueForInput(data.cpm_client ?? data.cpm_net, data.cpm));
      const budgetValue = data.budget_client ?? data.budget_net ?? data.budget ?? 0;
      setBudget(Number(budgetValue || 0).toFixed(2));
      setDailyViews(data.daily_views || 1);
      setStatus(data.status || "hold");
      setSchedule(data.schedule_enabled || false);
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setShowDatePicker(Boolean(data.start_date || data.end_date));
      setTargetQueries(parseTargetQueries(data.target));
    };
    fetchAd();
  }, [adId, markupLoaded]);

  /* clear */
  const onClear = () => {
    setTitle("");
    setUrl("");
    setCpm("1.00");
    setBudget("8000.00");
    setDailyViews(4);
    setStatus("hold");
    setSchedule(false);
    setAgreeTerms(false);
    setTargetQueries([]);
    setShowDatePicker(false);
    setStartDate("");
    setEndDate("");
    alert("🧹 Черновик очищен");
  };

  /* create/update */
  const onCreate = async () => {
    if (!adId && !agreeTerms) {
      alert("Please agree with the Terms of Service before creating an ad.");
      return;
    }

    if (!clientId) {
      alert("❌ Ошибка: user_id отсутствует в localStorage");
      return;
    }

    const cpmNet = role === "client" ? Number(cpm || 0) / multiplier : Number(cpm || 0);
    const budgetNumber = Number(budget || 0);
    const scheduleEnabled = schedule || Boolean(startDate || endDate);

    const { data: userData } = await supabase
      .from("users")
      .select("agency_id")
      .eq("user_id", clientId)
      .maybeSingle();

    const agency_id = userData?.agency_id || null;

    const adData = {
      title,
      url,
      cpm: Number(cpmNet.toFixed(4)),
      budget: Number(budgetNumber.toFixed(4)),
      daily_views: dailyViews,
      status,
      schedule_enabled: scheduleEnabled,
      start_date: startDate || null,
      end_date: endDate || null,
      target: targetQueries.join(", "),
      type: "search",
      updated_at: new Date().toISOString(),
      client_id: clientId,
      agency_id,
    };

    if (adId) {
      const { error } = await supabase.from("ad_campaigns").update(adData).eq("id", adId);
      if (error) alert("Ошибка при обновлении: " + error.message);
      else {
        alert("✅ Кампания обновлена!");
        navigate("/");
      }
      return;
    }

    const { error } = await supabase
      .from("ad_campaigns")
      .insert([{ ...adData, created_at: new Date().toISOString() }]);
    if (error) alert("Ошибка при создании рекламы: " + error.message);
    else {
      alert("✅ Реклама успешно создана!");
      navigate("/");
    }
  };

  /* UI */
  const showPreview = Boolean(title && url);
  const canCreate =
    Boolean(title.trim()) &&
    Boolean(url.trim()) &&
    Number(cpm) > 0 &&
    Number(budget) > 0 &&
    targetQueries.length > 0 &&
    agreeTerms;

  return (
    <Container>
      <div className="grid grid-cols-[330px_430px] gap-x-[82px] pt-[7px]">
        {/* LEFT */}
        <form className="flex w-[330px] flex-col gap-[14px] text-[14px] leading-[18px]">
          <Field label="Ad title" info>
            <Input placeholder="E.g., My first ad" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="URL you want to promote" info>
            <Input
              placeholder="URL of the channel, post or bot you promote"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>

          <Field label="CPM in Euro" info>
            <MoneyInput value={cpm} onChange={(e) => setCpm(e.target.value)} />
          </Field>

          <Field label="Initial budget in Euro" trailing={<LinkLbl>Set daily limit</LinkLbl>}>
            <MoneyInput value={budget} onChange={(e) => setBudget(e.target.value)} />
            <Hint>This amount will be added to the ad budget.</Hint>
          </Field>

          <Field label="Daily views limit per user">
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyViews(n)}
                  className={`h-[32px] w-[73.5px] rounded-[6px] border text-[14px] font-semibold leading-[20px] ${
                    n === dailyViews
                      ? "border-[#119af5] bg-[#119af5] text-white"
                      : "border-[#d9d9d9] bg-white text-[#222] hover:bg-[#f5f5f5]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Initial status">
            <div className="flex flex-col gap-[8px] px-[13px]">
              <Radio label="Active" checked={status === "active"} onChange={() => setStatus("active")} />
              <Radio label="On Hold" checked={status === "hold"} onChange={() => setStatus("hold")} />
            </div>
          </Field>

          {showDatePicker ? (
            <Field label="Start date" info>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={startDate ? startDate.split("T")[0] : ""}
                    onChange={(e) => setStartDate(e.target.value + "T00:00")}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                  <input
                    type="time"
                    value={startDate ? startDate.split("T")[1]?.slice(0, 5) : ""}
                    onChange={(e) =>
                      setStartDate(
                        startDate.split("T")[0] + "T" + e.target.value
                      )
                    }
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                  <span className="text-[12px] text-gray-600">UTC+5:00</span>
                  <LinkLbl onClick={() => { setShowDatePicker(false); setStartDate(""); setEndDate(""); }}>
                    Remove
                  </LinkLbl>
                </div>

                {endDate && (
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="date"
                      value={endDate ? endDate.split("T")[0] : ""}
                      onChange={(e) => setEndDate(e.target.value + "T00:00")}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <input
                      type="time"
                      value={endDate ? endDate.split("T")[1]?.slice(0, 5) : ""}
                      onChange={(e) =>
                        setEndDate(
                          endDate.split("T")[0] + "T" + e.target.value
                        )
                      }
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <span className="text-[12px] text-gray-600">UTC+5:00</span>
                  </div>
                )}

                {!endDate && (
                  <LinkLbl onClick={() => setEndDate(new Date().toISOString())}>
                    Set end date
                  </LinkLbl>
                )}
              </div>
            </Field>
          ) : (
            <div className="px-[13px]">
              <LinkLbl onClick={() => setShowDatePicker(true)}>Set start date</LinkLbl>
            </div>
          )}

          <Field label="Ad Schedule">
            <div className="px-[13px]">
              <AdScheduleControl checked={schedule} onChange={setSchedule} />
            </div>
          </Field>
        </form>

        {/* RIGHT */}
        <div className="w-[430px] text-[14px] leading-[18px]">
          <div className="mx-[13px] mb-[5px] flex h-[18px] items-center text-[14px] font-semibold leading-[19px] antialiased">
            Preview
          </div>
          {showPreview ? (
            <SearchAdPreview url={url} query={targetQueries[0] || ""} />
          ) : (
            <div className="flex h-[145px] items-center justify-center rounded-[5px] border border-[#d9d9d9] bg-[#f7f7f7] px-4 text-[14px] text-[#888]">
              Fill the required fields to preview your ad
            </div>
          )}

          <div className="mt-[14px]">
            <Field label="Target search queries" info>
              <TagInput
                value={targetQueries}
                onChange={setTargetQueries}
                placeholder="Add search queries"
              />
            </Field>
          </div>

          <div className="mt-[16px] flex flex-col gap-[7px] px-[4px]">
            <NoticeIcon
              tone={targetQueries.length > 0 ? "success" : "danger"}
              text={
                targetQueries.length > 0 ? (
                  <>
                    Will be shown in search results for{" "}
                    <strong>{targetQueries[0]}</strong>
                  </>
                ) : (
                  "Will not be shown anywhere."
                )
              }
            />
            <NoticeIcon
              tone="warning"
              text="Target parameters can't be changed after the ad is created."
            />
          </div>
        </div>
      </div>

      {adId ? (
        <div className="mt-[32px] flex items-center justify-between border-t border-[#e6e6e6] pb-[34px] pt-[18px]">
          <p className="text-[15px] leading-[22px] text-[#222]">
            Changes will become visible to users once they are approved by the moderators.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="h-[46px] w-[190px] rounded-[6px] bg-[#119af5] text-[14px] font-semibold text-white transition hover:bg-[#078be3]"
          >
            Save Changes
          </button>
        </div>
      ) : (
        <div className="mt-[32px] flex items-center justify-between border-t border-[#e6e6e6] pb-[34px] pt-[18px]">
          <label className="inline-flex items-center gap-[12px] text-[14px] leading-[20px] text-[#222]">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-[17px] w-[17px] accent-[#5a9fec]"
            />
            <span>
              I have read and agree with the{" "}
              <a
                href="https://ads.telegram.org/tos"
                target="_blank"
                rel="noreferrer"
                className="text-[#5288b1] hover:underline"
              >
                Telegram Ad Platform Terms of Service
              </a>
            </span>
          </label>
          <div className="flex items-center gap-[29px]">
            <LinkLbl onClick={onClear} className="font-semibold">Clear Draft</LinkLbl>
            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate}
              className="h-[46px] w-[190px] rounded-[6px] bg-[#119af5] text-[14px] font-semibold text-white transition hover:bg-[#078be3] disabled:cursor-default disabled:text-white/60 disabled:hover:bg-[#119af5]"
            >
              Create Ad
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}

/* ──────────────── helpers ──────────────── */
const Field = ({ label, info, trailing, children }: any) => (
  <div>
    {label && (
      <label className="mx-[13px] mb-[5px] flex h-[18px] items-center justify-between text-[14px] font-semibold leading-[19px] antialiased">
        <span className="flex items-center gap-1">
          {label}
          {info && <InfoIcon />}
        </span>
        {trailing}
      </label>
    )}
    {children}
  </div>
);

const InfoIcon = () => (
  <svg className="w-[12px] h-[12px] text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="10" cy="6" r="1" fill="currentColor" />
    <rect x="9" y="9" width="2" height="7" rx="1" fill="currentColor" />
  </svg>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="h-[40px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[13px] text-[14px] leading-[18px] outline-none focus:border-[#5a9fec] focus:ring-1 focus:ring-[#5a9fec]"
  />
);

const MoneyInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[14px] text-[#222]">
      €
    </span>
    <input
      type="text"
      inputMode="decimal"
      placeholder="0.00"
      value={value}
      onChange={onChange}
      className="h-[40px] w-full rounded-[4px] border border-[#d9d9d9] bg-white pb-[10px] pl-[31px] pr-[13px] pt-[10px] text-[14px] leading-[18px] outline-none focus:border-[#5a9fec] focus:ring-1 focus:ring-[#5a9fec]"
    />
  </div>
);

const Checkbox = ({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
    <input {...rest} type="checkbox" className="accent-blue-600" />
    {label}
  </label>
);

const Radio = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="inline-flex cursor-pointer items-center gap-[10px] text-[14px] leading-[20px]">
    <input type="radio" checked={checked} onChange={onChange} className="h-[20px] w-[20px] accent-[#5a9fec]" />
    {label}
  </label>
);

const Button = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...rest} type="button" className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white text-sm font-semibold px-5 h-[38px] rounded-[6px] transition">
    {children}
  </button>
);

const LinkLbl = ({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <span
    onClick={onClick}
    className={`cursor-pointer select-none text-[14px] leading-[20px] text-[#0288db] hover:underline ${className}`}
  >
    {children}
  </span>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="mx-[13px] mt-[5px] text-[12px] leading-[18px] text-[#888]">{children}</p>
);

const NoticeIcon = ({
  tone,
  text,
}: {
  tone: "danger" | "warning" | "success";
  text: React.ReactNode;
}) => {
  const danger = tone === "danger";
  const success = tone === "success";
  return (
    <div className="flex h-[20px] items-center gap-[10px] text-[13px] leading-[20px] text-[#333]">
      <span
        className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded-full text-[12px] font-bold leading-none text-white ${
          danger ? "bg-[#db4646]" : success ? "bg-[#4fb84f]" : "bg-[#e1a539]"
        }`}
      >
        {danger ? "−" : success ? "+" : "!"}
      </span>
      <span>{text}</span>
    </div>
  );
};
