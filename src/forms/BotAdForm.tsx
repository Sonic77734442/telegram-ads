import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Container from "../components/Container";
import TelegramAdPreview from "../components/TelegramAdPreview";
import { supabase } from "../supabaseClient";
import TagInput from "../components/TagInput";

export default function BotAdForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [cpm, setCpm] = useState("0.00");
  const [budget, setBudget] = useState("0.00");
  const [dailyViews, setDailyViews] = useState(1);
  const [status, setStatus] = useState<"active" | "hold">("hold");
  const [schedule, setSchedule] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [targetBots, setTargetBots] = useState<string[]>([]);
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

      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", adId)
        .single();

      if (error || !data) return;

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

  return (
    <Container>
      <div className="flex gap-10 py-6">
        <form className="w-[320px] flex flex-col gap-5 text-[13px]">
          <Field label="Ad title" info>
            <Input
              placeholder="E.g. My first ad"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Ad text">
            <Textarea
              rows={3}
              placeholder="Enter your ad text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Hint>
              You can add custom emoji using <code>@AdsMarkdownBot</code>.
            </Hint>
          </Field>

          <Field label="URL you want to promote" info>
            <Input
              placeholder="t.me/yourbot"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>

          <Checkbox label="Show user picture" />

          <Field label="CPM in Euro" info>
            <Input
              type="number"
              step="0.01"
              placeholder="EUR 0.00"
              value={cpm}
              onChange={(e) => setCpm(e.target.value)}
            />
          </Field>

          <Field label="Initial budget in Euro" trailing={<LinkLbl>Set daily limit</LinkLbl>}>
            <Input
              type="number"
              step="0.01"
              placeholder="EUR 0.00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>

          <Field label="Daily views limit per user">
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyViews(n)}
                  className={`w-[74px] h-[32px] text-[13px] font-medium rounded-[6px] border transition-all duration-150 ${
                    n === dailyViews
                      ? "bg-[#22A3F5] text-white border-[#22A3F5]"
                      : "bg-white text-gray-700 border-[#d9d9d9] hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Initial status">
            <div className="flex flex-col gap-2 pl-6">
              <Radio label="Active" checked={status === "active"} onChange={() => setStatus("active")} />
              <Radio label="On Hold" checked={status === "hold"} onChange={() => setStatus("hold")} />
            </div>
            <LinkLbl>Set start date</LinkLbl>
          </Field>

          <Field label="Ad Schedule">
            <Checkbox
              label="Run this ad on schedule"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
            />
          </Field>

          <Checkbox
            label="I have read and agree with the Telegram Ad Platform Terms of Service"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
        </form>

        <div className="flex flex-col gap-5 text-[13px] flex-1">
          <div className="text-black-600 font-medium text-sm mb-1">Preview</div>
          <div className="p-0 bg-transparent">
            <TelegramAdPreview title={title} text={text} button="SEND MESSAGE" />
          </div>

          <Field label="Target specific bots" info>
            <TagInput value={targetBots} onChange={setTargetBots} placeholder="t.me bot URL" />
          </Field>

          <p className="text-xs text-red-600">Will not be shown anywhere.</p>
          <p className="text-xs text-amber-600">
            Target parameters can't be changed after the ad is created.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center border-t pt-4 mt-6">
        <LinkLbl>Clear Draft</LinkLbl>
        <Button onClick={onCreate}>{adId ? "Save Changes" : "Create Ad"}</Button>
      </div>
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
  <div className="space-y-1">
    {label && (
      <label className="flex items-center justify-between font-medium">
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
    className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="w-full border border-[#d9d9d9] rounded-[4px] px-3 py-[6px] resize-none bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
  />
);

const Checkbox = ({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
    <input {...rest} type="checkbox" className="accent-blue-600" />
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
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onChange} className="accent-blue-600" />
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

const LinkLbl = ({ children }: { children: React.ReactNode }) => (
  <span className="text-blue-600 text-[12px] cursor-pointer hover:underline">{children}</span>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] text-gray-500">{children}</p>
);
