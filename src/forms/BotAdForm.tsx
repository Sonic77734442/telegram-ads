import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../components/Container";
import BotAdPreview from "../components/BotAdPreview";
import AdScheduleControl from "../components/AdScheduleControl";
import { supabase } from "../supabaseClient";
import TagInput from "../components/TagInput";
import { useAdId } from "../hooks/useAdId";
import { fetchCampaignById } from "../lib/campaignApi";

export default function BotAdForm() {
  const navigate = useNavigate();
  const adId = useAdId();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [cpm, setCpm] = useState("1.00");
  const [budget, setBudget] = useState("8000.00");
  const [dailyViews, setDailyViews] = useState(4);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [targetBots, setTargetBots] = useState<string[]>([]);
  const [showChannelPicture, setShowChannelPicture] = useState(false);
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const clientId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const [markupPercent, setMarkupPercent] = useState(0);
  const [markupLoaded, setMarkupLoaded] = useState(role !== "client");
  const multiplier = role === "client" && markupPercent > 0 ? 1 + markupPercent / 100 : 1;

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

  const resolveValueForInput = (valueWithMarkup: any, baseValue: any) => {
    if (role === "client") {
      if (valueWithMarkup !== undefined && valueWithMarkup !== null) {
        return Number(valueWithMarkup || 0).toFixed(2);
      }
      return (Number(baseValue || 0) * multiplier).toFixed(2);
    }
    const effective = valueWithMarkup ?? baseValue ?? 0;
    return Number(effective || 0).toFixed(2);
  };

  const parseTargetBots = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string") as string[];
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  useEffect(() => {
    const fetchAd = async () => {
      if (!adId || !markupLoaded) return;
      const data = await fetchCampaignById(adId);

      setTitle(data.title || "");
      setText(data.text || "");
      setUrl(data.url || "");
      setCpm(resolveValueForInput(data.cpm_client ?? data.cpm_net, data.cpm));
      const budgetValue = data.budget_client ?? data.budget_net ?? data.budget ?? 0;
      setBudget(Number(budgetValue || 0).toFixed(2));
      setDailyViews(data.daily_views || 1);
      setStatus(data.status || "hold");
      setSchedule(data.schedule_enabled || false);
      setTargetBots(parseTargetBots(data.target));
      setAgreeTerms(true);
    };

    fetchAd();
  }, [adId, markupLoaded, multiplier]);

  const onClear = () => {
    setTitle("");
    setText("");
    setUrl("");
    setCpm("1.00");
    setBudget("8000.00");
    setDailyViews(4);
    setStatus("hold");
    setSchedule(false);
    setAgreeTerms(false);
    setTargetBots([]);
    setShowChannelPicture(false);
  };

  const onCreate = async () => {
    if (!agreeTerms) {
      alert("Please agree with the Terms of Service before creating an ad.");
      return;
    }

    if (!clientId) {
      alert("Error: user_id is missing in localStorage");
      return;
    }

    const cpmNet = role === "client" ? Number(cpm || 0) / multiplier : Number(cpm || 0);
    const budgetNumber = Number(budget || 0);
    const adData = {
      title,
      text,
      url,
      cpm: Number(cpmNet.toFixed(4)),
      budget: Number(budgetNumber.toFixed(4)),
      daily_views: dailyViews,
      status,
      schedule_enabled: schedule,
      target: targetBots.join(", "),
      type: "bot",
      updated_at: new Date().toISOString(),
    };

    if (adId) {
      const { error } = await supabase
        .from("ad_campaigns")
        .update(adData)
        .eq("id", adId);

      if (error) alert("Update failed: " + error.message);
      else {
        alert("Campaign updated.");
        navigate("/");
      }
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("agency_id")
      .eq("user_id", clientId)
      .maybeSingle();

    if (userError) {
      console.error("Failed to load agency_id:", userError.message);
    }

    const { error } = await supabase.from("ad_campaigns").insert([
      {
        ...adData,
        created_at: new Date().toISOString(),
        client_id: clientId,
        agency_id: userData?.agency_id || null,
      },
    ]);

    if (error) alert("Create failed: " + error.message);
    else {
      alert("Campaign created.");
      navigate("/");
    }
  };

  const showPreview = Boolean(title.trim() && text.trim() && url.trim());
  const showTextError = Boolean((title.trim() || url.trim()) && !text.trim());
  const canCreate =
    showPreview &&
    Number(cpm) > 0 &&
    Number(budget) > 0 &&
    targetBots.length > 0 &&
    agreeTerms;

  return (
    <Container>
      <div className="grid grid-cols-[330px_430px] gap-x-[82px] pt-[7px]">
        <form className="flex w-[330px] flex-col gap-[14px] text-[14px] leading-[18px]">
          <Field label="Ad title" info>
            <Input
              placeholder="E.g., My first ad"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Ad text" info>
            <Textarea
              placeholder="Enter your ad text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              invalid={showTextError}
            />
            {showTextError && (
              <p className="mx-[13px] mt-[5px] text-[13px] leading-[18px] text-[#c64c4c]">
                Text is required
              </p>
            )}
            <Hint>
              You can add custom emoji using{" "}
              <a href="https://t.me/AdsMarkdownBot" target="_blank" rel="noreferrer" className="text-[#5288b1] hover:underline">
                @AdsMarkdownBot
              </a>
              .
            </Hint>
          </Field>

          <Field label="URL you want to promote" info>
            <Input
              placeholder="URL of the channel, post or bot you promote"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>

          <div className="px-[13px]">
            <Checkbox
              label="Show channel picture"
              checked={showChannelPicture}
              onChange={(event) => setShowChannelPicture(event.target.checked)}
            />
          </div>

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
            <div className="mt-[5px] px-[13px]"><LinkLbl>Set start date</LinkLbl></div>
          </Field>

          <Field label="Ad Schedule">
            <div className="px-[13px]">
              <AdScheduleControl checked={schedule} onChange={setSchedule} />
            </div>
          </Field>
        </form>

        <div className="w-[430px] text-[14px] leading-[18px]">
          <div className="mx-[13px] mb-[5px] flex h-[18px] items-center text-[14px] font-semibold leading-[19px] antialiased">
            Preview
          </div>
          {showPreview ? (
            <BotAdPreview
              url={url}
              text={text}
              showChannelPicture={showChannelPicture}
            />
          ) : (
            <div
              className="flex h-[145px] items-center justify-center rounded-[5px] border border-[#88a47b] bg-[#9fc18c] bg-cover bg-center px-4"
              style={{ backgroundImage: "url(/assets/AdPreviewBackground.jpg)" }}
            >
              <span className="rounded-[12px] bg-black/25 px-[13px] py-[3px] text-[14px] font-semibold leading-[18px] text-white">
                Fill the required fields to preview your ad
              </span>
            </div>
          )}

          <div className="mt-[14px]">
            <Field label="Target specific bots" info>
              <TagInput value={targetBots} onChange={setTargetBots} placeholder="t.me bot URL" />
            </Field>
          </div>

          <div className="mt-[16px] flex flex-col gap-[7px] px-[4px]">
            <NoticeIcon
              tone={targetBots.length > 0 ? "success" : "danger"}
              text={
                targetBots.length > 0
                  ? "Will be shown in the selected bots."
                  : "Will not be shown anywhere."
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
            className="h-[46px] w-[190px] rounded-[6px] bg-[#119af5] text-[14px] font-semibold text-white hover:bg-[#078be3]"
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
              className="h-[46px] w-[190px] rounded-[6px] bg-[#119af5] text-[14px] font-semibold text-white hover:bg-[#078be3] disabled:cursor-default disabled:text-white/60 disabled:hover:bg-[#119af5]"
            >
              Create Ad
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}

const Field = ({
  label,
  info,
  trailing,
  children,
}: {
  label?: string;
  info?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) => (
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

const Textarea = ({
  invalid = false,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    {...props}
    className={`h-[57px] w-full resize-none rounded-[4px] border bg-white px-[13px] py-[10px] text-[14px] leading-[18px] outline-none focus:ring-1 ${
      invalid
        ? "border-[#c64c4c] focus:border-[#c64c4c] focus:ring-[#c64c4c]"
        : "border-[#d9d9d9] focus:border-[#5a9fec] focus:ring-[#5a9fec]"
    }`}
  />
);

const Checkbox = ({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="inline-flex cursor-pointer items-center gap-[12px] text-[14px] leading-[20px]">
    <input {...rest} type="checkbox" className="h-[17px] w-[17px] accent-[#5a9fec]" />
    {label}
  </label>
);

const Radio = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: () => void;
}) => (
  <label className="inline-flex cursor-pointer items-center gap-[10px] text-[14px] leading-[20px]">
    <input type="radio" checked={checked} onChange={onChange} className="h-[20px] w-[20px] accent-[#5a9fec]" />
    {label}
  </label>
);

const Button = ({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...rest}
    type="button"
    className="bg-[#22A3F5] hover:bg-[#1D8ED5] text-white text-sm font-semibold px-5 h-[38px] rounded-[6px] transition"
  >
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
    className={`cursor-pointer text-[14px] leading-[20px] text-[#0288db] hover:underline ${className}`}
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
